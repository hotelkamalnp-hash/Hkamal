-- ==============================================================================
-- KAMAL HOTEL (KAMALPOKHARI, KATHMANDU)
-- Migration: 202611160001_p0_security_auth_rbac_rls.sql
-- Purpose: P0 Security & Authentication — Supabase Auth mapping, RBAC helpers,
--          secure role-based RLS policies, and private credential isolation.
-- Safe & Idempotent: Preserves existing tables/data while dropping permissive
--                    USING (true) policies and enforcing role-scoped RLS.
-- ==============================================================================

-- 1. Ensure core staff_users table supports Supabase Auth linkage & strict roles
CREATE TABLE IF NOT EXISTS public.staff_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  department TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.staff_users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure username uniqueness if column was added to pre-existing table
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_users_username_lower
  ON public.staff_users (LOWER(username))
  WHERE username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_users_email_lower
  ON public.staff_users (LOWER(email));

-- Enforce valid staff roles and statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_users_role_check'
  ) THEN
    ALTER TABLE public.staff_users
      ADD CONSTRAINT staff_users_role_check
      CHECK (role IN (
        'super_admin',
        'admin',
        'hotel_manager',
        'restaurant_owner',
        'receptionist',
        'chef',
        'waiter',
        'housekeeping'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_users_status_check'
  ) THEN
    ALTER TABLE public.staff_users
      ADD CONSTRAINT staff_users_status_check
      CHECK (status IN ('active', 'on-leave', 'inactive'));
  END IF;
END $$;

-- Never store plaintext passwords in public.staff_users if an older schema had it
ALTER TABLE public.staff_users DROP COLUMN IF EXISTS password;

-- 2. Private Admin-Only SMTP & Integration Secrets Table (Never public)
CREATE TABLE IF NOT EXISTS public.smtp_settings (
  id TEXT PRIMARY KEY DEFAULT 'default_smtp',
  provider_preset TEXT DEFAULT 'gmail',
  smtp_host TEXT NOT NULL DEFAULT '',
  smtp_port INT NOT NULL DEFAULT 587,
  smtp_user TEXT NOT NULL DEFAULT '',
  smtp_password_encrypted TEXT NOT NULL DEFAULT '',
  sender_email TEXT NOT NULL DEFAULT '',
  sender_name TEXT NOT NULL DEFAULT 'Kamal Hotel Reservations',
  reply_to_email TEXT,
  notification_email TEXT,
  encryption TEXT NOT NULL DEFAULT 'tls',
  send_booking_confirmation_email BOOLEAN NOT NULL DEFAULT true,
  require_real_email_otp BOOLEAN NOT NULL DEFAULT false,
  otp_expiry_minutes INT NOT NULL DEFAULT 10,
  email_subject_prefix TEXT DEFAULT '[Kamal Hotel]',
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Persistent OTP Store Table (Ready for DB-backed OTPs without exposing rows publicly)
CREATE TABLE IF NOT EXISTS public.email_otp_verifications (
  email TEXT PRIMARY KEY,
  otp_hash TEXT NOT NULL,
  guest_name TEXT,
  attempts INT NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Security Helper Functions (SECURITY DEFINER with locked search_path)
CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_role TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT s.role
    INTO v_role
    FROM public.staff_users s
   WHERE (s.auth_user_id = v_uid OR LOWER(s.email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
     AND s.status = 'active'
   LIMIT 1;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Fallback only to server-controlled app_metadata (never user_metadata)
  RETURN NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', '');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_staff_role() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.has_staff_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_staff_role() = ANY(allowed_roles), false);
$$;

REVOKE ALL ON FUNCTION public.current_staff_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_active_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_staff() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_staff_role(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_staff_role(TEXT[]) TO authenticated, service_role;

-- 5. Enable Row Level Security across all tables
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_otp_verifications ENABLE ROW LEVEL SECURITY;

-- 6. Drop ALL legacy permissive policies (USING (true) / WITH CHECK (true))
DROP POLICY IF EXISTS "Public can view rooms" ON public.rooms;
DROP POLICY IF EXISTS "Staff can manage all rooms" ON public.rooms;
DROP POLICY IF EXISTS "Public can view amenities" ON public.amenities;
DROP POLICY IF EXISTS "Staff can manage amenities" ON public.amenities;
DROP POLICY IF EXISTS "Public can view hotel config" ON public.hotel_config;
DROP POLICY IF EXISTS "Staff can update config" ON public.hotel_config;
DROP POLICY IF EXISTS "Public can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Staff can manage reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public can view own bookings by code" ON public.bookings;
DROP POLICY IF EXISTS "Staff can manage all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff can manage audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff can view staff directory" ON public.staff_users;
DROP POLICY IF EXISTS "Super admin manages staff" ON public.staff_users;
DROP POLICY IF EXISTS "Super admin manages smtp" ON public.smtp_settings;

-- 7. Strict Role-Based RLS Policies

-- A. ROOMS: Public catalog read; only management/admin can modify
CREATE POLICY "rooms_public_select"
  ON public.rooms FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "rooms_staff_insert"
  ON public.rooms FOR INSERT
  TO authenticated
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager']));

CREATE POLICY "rooms_staff_update"
  ON public.rooms FOR UPDATE
  TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping']));

CREATE POLICY "rooms_admin_delete"
  ON public.rooms FOR DELETE
  TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin']));

-- B. AMENITIES: Public read; CMS admins manage
CREATE POLICY "amenities_public_select"
  ON public.amenities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "amenities_admin_manage"
  ON public.amenities FOR ALL
  TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager']));

-- C. HOTEL_CONFIG: Public read of non-secret CMS config; only super_admin/admin update
CREATE POLICY "hotel_config_public_select"
  ON public.hotel_config FOR SELECT
  TO anon, authenticated
  USING (id = 'main_config');

CREATE POLICY "hotel_config_admin_write"
  ON public.hotel_config FOR ALL
  TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin']));

-- D. REVIEWS: Public sees only approved reviews; staff can view/moderate all
CREATE POLICY "reviews_public_approved_select"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (is_approved = true OR public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

CREATE POLICY "reviews_admin_manage"
  ON public.reviews FOR ALL
  TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager']));

-- E. BOOKINGS: Public NEVER reads other guests' bookings!
-- Public can only submit pending/unpaid booking requests; staff roles manage lifecycle.
CREATE POLICY "bookings_staff_select"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist', 'restaurant_owner', 'chef']));

CREATE POLICY "bookings_public_controlled_insert"
  ON public.bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist'])
    OR (
      payment_status IN ('pending')
      AND booking_status IN ('confirmed')
    )
  );

CREATE POLICY "bookings_staff_update"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

CREATE POLICY "bookings_admin_delete"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin']));

-- F. STAFF_USERS: Staff can read own profile; management reads roster; ONLY super_admin writes
CREATE POLICY "staff_users_select_scoped"
  ON public.staff_users FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
    OR public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager'])
  );

CREATE POLICY "staff_users_super_admin_insert"
  ON public.staff_users FOR INSERT
  TO authenticated
  WITH CHECK (public.has_staff_role(ARRAY['super_admin']));

CREATE POLICY "staff_users_super_admin_update"
  ON public.staff_users FOR UPDATE
  TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin']));

CREATE POLICY "staff_users_super_admin_delete"
  ON public.staff_users FOR DELETE
  TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin']) AND role <> 'super_admin');

-- G. AUDIT_LOGS: Append-only! Active staff can insert; only admin/manager/super_admin can read; NO update/delete
CREATE POLICY "audit_logs_admin_select"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager']));

CREATE POLICY "audit_logs_staff_insert"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_staff());

-- H. SMTP_SETTINGS: Strictly super_admin & admin only (zero anon/other staff access)
CREATE POLICY "smtp_settings_admin_only"
  ON public.smtp_settings FOR ALL
  TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin']));

-- I. EMAIL_OTP_VERIFICATIONS: Service-role only (no direct client access)
-- (RLS enabled with zero anon/authenticated policies => denied by default to browsers)
