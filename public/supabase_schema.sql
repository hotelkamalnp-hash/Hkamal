-- ==============================================================================
-- HOTEL MANAGEMENT SYSTEM — CONSOLIDATED SUPABASE PRODUCTION SCHEMA
-- Property: Hotel Kamal, Kamalpokhari, Kathmandu, Nepal (or any White-Label Hotel)
-- Safe & Non-Destructive: Run in Supabase SQL Editor. Safe to run multiple times.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. HELPER FUNCTIONS: RBAC & CLAIMS
CREATE OR REPLACE FUNCTION public.get_current_staff_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'staff_role',
    current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'staff_role',
    'guest'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_staff_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_current_staff_role() = ANY(allowed_roles);
$$;

-- 3. CORE PMS JSONB STORES (Full Flexibility & Rapid Sync)
CREATE TABLE IF NOT EXISTS public.pms_records (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection, id)
);
CREATE INDEX IF NOT EXISTS idx_pms_records_collection ON public.pms_records (collection);
CREATE INDEX IF NOT EXISTS idx_pms_records_updated_at ON public.pms_records (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.pms_kv_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. DEDICATED TRANSACTIONAL BOOKINGS STORE
CREATE TABLE IF NOT EXISTS public.bookings_store (
  id TEXT PRIMARY KEY,
  booking_code TEXT NOT NULL UNIQUE,
  idempotency_key TEXT UNIQUE,
  room_type TEXT NOT NULL,
  assigned_room_number TEXT,
  check_in_date TEXT NOT NULL,
  check_out_date TEXT NOT NULL,
  booking_status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_overlap 
  ON public.bookings_store (assigned_room_number, check_in_date, check_out_date)
  WHERE booking_status NOT IN ('cancelled', 'no_show');

-- 5. RELATIONAL BACKUP TABLES FOR ANALYTICS & IRD AUDITS
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  fiscal_year TEXT PRIMARY KEY,
  last_seq INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
  gateway TEXT NOT NULL,
  event_id TEXT NOT NULL,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  payload_json JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (gateway, event_id)
);

CREATE TABLE IF NOT EXISTS public.email_otp_verifications (
  email TEXT PRIMARY KEY,
  otp_hash TEXT NOT NULL,
  salt TEXT NOT NULL DEFAULT '',
  guest_name TEXT,
  expires_at BIGINT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.revoked_sessions (
  jti TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket_key TEXT PRIMARY KEY,
  hit_count INT NOT NULL DEFAULT 1,
  reset_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  html_body TEXT,
  template_name TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  next_run_at BIGINT NOT NULL,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_due ON public.notification_jobs (status, next_run_at);

CREATE TABLE IF NOT EXISTS public.staff_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  permissions_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  department TEXT NOT NULL DEFAULT '',
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_accounts_username ON public.staff_accounts (LOWER(username));

CREATE TABLE IF NOT EXISTS public.smtp_credentials (
  id TEXT PRIMARY KEY,
  provider_preset TEXT NOT NULL DEFAULT 'gmail',
  smtp_host TEXT NOT NULL DEFAULT '',
  smtp_port INT NOT NULL DEFAULT 587,
  smtp_user TEXT NOT NULL DEFAULT '',
  smtp_password_encrypted TEXT NOT NULL DEFAULT '',
  sender_email TEXT NOT NULL DEFAULT '',
  sender_name TEXT NOT NULL DEFAULT 'Kamal Hotel Reservations',
  reply_to_email TEXT NOT NULL DEFAULT '',
  notification_email TEXT NOT NULL DEFAULT '',
  encryption TEXT NOT NULL DEFAULT 'tls',
  send_booking_confirmation_email INT NOT NULL DEFAULT 1,
  require_real_email_otp INT NOT NULL DEFAULT 0,
  otp_expiry_minutes INT NOT NULL DEFAULT 10,
  email_subject_prefix TEXT NOT NULL DEFAULT '[Kamal Hotel]',
  is_configured INT NOT NULL DEFAULT 0,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT,
  last_test_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.media_assets (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. SUPABASE STORAGE BUCKET CONFIGURATION (hotel-media)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hotel-media',
  'hotel-media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- Storage public read policy
DROP POLICY IF EXISTS "Public can view hotel media" ON storage.objects;
CREATE POLICY "Public can view hotel media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hotel-media');

-- Storage service role / authenticated upload policy
DROP POLICY IF EXISTS "Staff can upload hotel media" ON storage.objects;
CREATE POLICY "Staff can upload hotel media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hotel-media');

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.pms_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pms_kv_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revoked_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Public can read public catalog items from pms_records
DROP POLICY IF EXISTS "public_read_catalog_pms_records" ON public.pms_records;
CREATE POLICY "public_read_catalog_pms_records"
  ON public.pms_records FOR SELECT
  USING (collection IN ('rooms', 'amenities', 'reviews', 'faqs', 'menuItems', 'tables'));

-- Staff full access to pms_records
DROP POLICY IF EXISTS "staff_manage_pms_records" ON public.pms_records;
CREATE POLICY "staff_manage_pms_records"
  ON public.pms_records FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Public can read theme and public settings from pms_kv_settings
DROP POLICY IF EXISTS "public_read_pms_kv_settings" ON public.pms_kv_settings;
CREATE POLICY "public_read_pms_kv_settings"
  ON public.pms_kv_settings FOR SELECT
  USING (key IN ('themeConfig', 'billSettings', 'floors', 'seasonalSettings'));

-- Staff full access to pms_kv_settings
DROP POLICY IF EXISTS "staff_manage_pms_kv_settings" ON public.pms_kv_settings;
CREATE POLICY "staff_manage_pms_kv_settings"
  ON public.pms_kv_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Bookings store: Staff can view and manage
DROP POLICY IF EXISTS "staff_manage_bookings_store" ON public.bookings_store;
CREATE POLICY "staff_manage_bookings_store"
  ON public.bookings_store FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Staff accounts: Only authenticated staff can view
DROP POLICY IF EXISTS "staff_view_staff_accounts" ON public.staff_accounts;
CREATE POLICY "staff_view_staff_accounts"
  ON public.staff_accounts FOR SELECT
  TO authenticated
  USING (true);
