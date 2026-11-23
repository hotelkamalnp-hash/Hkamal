import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { performanceTracker } from './performanceTracker';

// Cache client instance
let cachedClient: SupabaseClient | null = null;
let currentUrl: string = '';
let currentKey: string = '';

export const getSupabaseClient = (supabaseUrl?: string, supabaseAnonKey?: string): SupabaseClient | null => {
  const url = supabaseUrl || (import.meta.env.VITE_SUPABASE_URL as string);
  const key = supabaseAnonKey || (import.meta.env.VITE_SUPABASE_ANON_KEY as string);

  if (!url || !key) {
    return null;
  }

  // Reuse if url and key match
  if (cachedClient && currentUrl === url && currentKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    currentUrl = url;
    currentKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Error creating Supabase client:', err);
    return null;
  }
};

/**
 * Tests connection to Supabase by fetching a heartbeat or table metadata
 */
export const testSupabaseConnection = async (
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ success: boolean; message: string }> => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, message: 'Please provide both Supabase Project URL and Publishable Key (sb_publishable_... or anon key).' };
  }

  const startTime = performance.now();
  try {
    const client = getSupabaseClient(supabaseUrl, supabaseAnonKey) || createClient(supabaseUrl, supabaseAnonKey);
    // Ping with a lightweight HEAD query
    const { error } = await client.from('rooms').select('count', { count: 'exact', head: true });
    const duration = performance.now() - startTime;
    
    // If table doesn't exist yet, it means authentication succeeded but the schema hasn't been run yet!
    if (error && (error.code === '42P01' || error.code === 'PGRST204' || error.code === 'PGRST200' || error.message?.includes('does not exist') || error.message?.includes('relation'))) {
      performanceTracker.recordApiCall({
        endpoint: 'supabase: rooms.head(ping)',
        method: 'PING',
        status: 'success',
        durationMs: duration,
        source: 'supabase',
        isCacheHit: false,
        statusCode: 200,
        details: 'Supabase authenticated; schema tables pending creation',
      });
      return { 
        success: true, 
        message: 'Connected to Supabase! (Database tables not yet created — paste and run the SQL migration schema in your Supabase SQL Editor).' 
      };
    } else if (error && error.message?.includes('FetchError')) {
      performanceTracker.recordApiCall({
        endpoint: 'supabase: rooms.head(ping)',
        method: 'PING',
        status: 'error',
        durationMs: duration,
        source: 'supabase',
        isCacheHit: false,
        statusCode: 503,
        details: error.message,
      });
      return { success: false, message: `Network connection failed: ${error.message}. Please check your Project URL.` };
    } else if (error && (error.code === 'PGRST301' || error.message?.includes('apikey') || error.message?.includes('JWT'))) {
      performanceTracker.recordApiCall({
        endpoint: 'supabase: rooms.head(ping)',
        method: 'PING',
        status: 'error',
        durationMs: duration,
        source: 'supabase',
        isCacheHit: false,
        statusCode: 401,
        details: 'Invalid Supabase API key',
      });
      return { success: false, message: 'Invalid API Key. Please copy the "Publishable key" from your Supabase dashboard.' };
    }

    performanceTracker.recordApiCall({
      endpoint: 'supabase: rooms.head(ping)',
      method: 'PING',
      status: 'success',
      durationMs: duration,
      source: 'supabase',
      isCacheHit: false,
      statusCode: 200,
      details: `Supabase heartbeat verified in ${Math.round(duration)}ms`,
    });
    return { success: true, message: 'Successfully connected and verified Supabase database!' };
  } catch (err: any) {
    const duration = performance.now() - startTime;
    performanceTracker.recordApiCall({
      endpoint: 'supabase: rooms.head(ping)',
      method: 'PING',
      status: 'error',
      durationMs: duration,
      source: 'supabase',
      isCacheHit: false,
      statusCode: 500,
      details: err.message || 'Connection failure',
    });
    return { success: false, message: err.message || 'Failed to connect to Supabase.' };
  }
};

/**
 * Complete PostgreSQL SQL Schema for Supabase
 */
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- KAMAL HOTEL (KAMALPOKHARI, KATHMANDU) - SUPABASE POSTGRESQL SCHEMA
-- NOTE: For complete production PMS/POS deployment, also execute:
--   supabase/migrations/202611160001_p0_security_rls.sql
--   supabase/migrations/202611160002_full_production_schema.sql
-- Paste into your Supabase Dashboard -> SQL Editor and click 'Run'.
-- ==============================================================================

-- 1. Create Room Categories & Inventory Table
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  price_per_night NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  max_guests INT DEFAULT 2,
  bed_type TEXT NOT NULL,
  size_sq_ft INT,
  view TEXT,
  floor TEXT,
  total_units INT DEFAULT 5,
  available_units INT DEFAULT 5,
  rating NUMERIC(3,1) DEFAULT 4.9,
  reviews_count INT DEFAULT 10,
  description TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  amenities JSONB DEFAULT '[]'::jsonb,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Reservations & Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY,
  booking_code TEXT NOT NULL UNIQUE,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_country TEXT,
  room_type_id TEXT REFERENCES public.rooms(id) ON DELETE SET NULL,
  room_name TEXT NOT NULL,
  room_type TEXT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  nights INT NOT NULL,
  adults INT DEFAULT 1,
  children INT DEFAULT 0,
  addons JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'NPR',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'card',
  card_last4 TEXT,
  booking_status TEXT DEFAULT 'confirmed',
  special_requests TEXT,
  sms_sent BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  whatsapp_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Hotel CMS & Dynamic Configuration Table
CREATE TABLE IF NOT EXISTS public.hotel_config (
  id TEXT PRIMARY KEY DEFAULT 'main_config',
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Hotel Amenities Table
CREATE TABLE IF NOT EXISTS public.amenities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,
  image_url TEXT,
  is_highlight BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Guest Reviews & Testimonials Table
CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  author TEXT NOT NULL,
  role TEXT,
  location TEXT,
  quote TEXT NOT NULL,
  rating INT DEFAULT 5,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Security & Operations Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  details TEXT,
  ip_address TEXT
);

-- 7. Create Staff Users & RBAC Permissions Table (Linked to Supabase Auth, NO plaintext passwords)
CREATE TABLE IF NOT EXISTS public.staff_users (
  id TEXT PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin','admin','hotel_manager','restaurant_owner','receptionist','chef','waiter','housekeeping')),
  permissions JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','on-leave','inactive')),
  department TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Private Admin-Only SMTP Settings & OTP Verifications
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_otp_verifications (
  email TEXT PRIMARY KEY,
  otp_hash TEXT NOT NULL,
  guest_name TEXT,
  attempts INT NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Helper Functions (SECURITY DEFINER with locked search_path)
CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT s.role INTO v_role FROM public.staff_users s
   WHERE (s.auth_user_id = auth.uid() OR LOWER(s.email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
     AND s.status = 'active' LIMIT 1;
  RETURN COALESCE(v_role, NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''));
END;
$$;

CREATE OR REPLACE FUNCTION public.has_staff_role(allowed_roles TEXT[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.current_staff_role() = ANY(allowed_roles), false);
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_otp_verifications ENABLE ROW LEVEL SECURITY;

-- Strict Role-Based Policies
CREATE POLICY "rooms_public_select" ON public.rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rooms_staff_insert" ON public.rooms FOR INSERT TO authenticated WITH CHECK (public.has_staff_role(ARRAY['super_admin','admin','hotel_manager']));
CREATE POLICY "rooms_staff_update" ON public.rooms FOR UPDATE TO authenticated USING (public.has_staff_role(ARRAY['super_admin','admin','hotel_manager','receptionist','housekeeping'])) WITH CHECK (public.has_staff_role(ARRAY['super_admin','admin','hotel_manager','receptionist','housekeeping']));
CREATE POLICY "rooms_admin_delete" ON public.rooms FOR DELETE TO authenticated USING (public.has_staff_role(ARRAY['super_admin','admin']));

CREATE POLICY "amenities_public_select" ON public.amenities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "amenities_admin_manage" ON public.amenities FOR ALL TO authenticated USING (public.has_staff_role(ARRAY['super_admin','admin','hotel_manager'])) WITH CHECK (public.has_staff_role(ARRAY['super_admin','admin','hotel_manager']));

CREATE POLICY "hotel_config_public_select" ON public.hotel_config FOR SELECT TO anon, authenticated USING (id = 'main_config');
CREATE POLICY "hotel_config_admin_write" ON public.hotel_config FOR ALL TO authenticated USING (public.has_staff_role(ARRAY['super_admin','admin'])) WITH CHECK (public.has_staff_role(ARRAY['super_admin','admin']));

CREATE POLICY "reviews_public_approved_select" ON public.reviews FOR SELECT TO anon, authenticated USING (is_approved = true OR public.has_staff_role(ARRAY['super_admin','admin','hotel_manager','receptionist']));
CREATE POLICY "reviews_admin_manage" ON public.reviews FOR ALL TO authenticated USING (public.has_staff_role(ARRAY['super_admin','admin','hotel_manager'])) WITH CHECK (public.has_staff_role(ARRAY['super_admin','admin','hotel_manager']));

CREATE POLICY "bookings_staff_select" ON public.bookings FOR SELECT TO authenticated USING (public.has_staff_role(ARRAY['super_admin','admin','hotel_manager','receptionist','restaurant_owner','chef']));
CREATE POLICY "bookings_public_controlled_insert" ON public.bookings FOR INSERT TO anon, authenticated WITH CHECK (public.has_staff_role(ARRAY['super_admin','admin','hotel_manager','receptionist']) OR (payment_status IN ('pending') AND booking_status IN ('confirmed')));
CREATE POLICY "bookings_staff_update" ON public.bookings FOR UPDATE TO authenticated USING (public.has_staff_role(ARRAY['super_admin','admin','hotel_manager','receptionist'])) WITH CHECK (public.has_staff_role(ARRAY['super_admin','admin','hotel_manager','receptionist']));
CREATE POLICY "bookings_admin_delete" ON public.bookings FOR DELETE TO authenticated USING (public.has_staff_role(ARRAY['super_admin','admin']));

CREATE POLICY "staff_users_select_scoped" ON public.staff_users FOR SELECT TO authenticated USING (auth_user_id = auth.uid() OR LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')) OR public.has_staff_role(ARRAY['super_admin','admin','hotel_manager']));
CREATE POLICY "staff_users_super_admin_insert" ON public.staff_users FOR INSERT TO authenticated WITH CHECK (public.has_staff_role(ARRAY['super_admin']));
CREATE POLICY "staff_users_super_admin_update" ON public.staff_users FOR UPDATE TO authenticated USING (public.has_staff_role(ARRAY['super_admin'])) WITH CHECK (public.has_staff_role(ARRAY['super_admin']));
CREATE POLICY "staff_users_super_admin_delete" ON public.staff_users FOR DELETE TO authenticated USING (public.has_staff_role(ARRAY['super_admin']) AND role <> 'super_admin');

CREATE POLICY "audit_logs_admin_select" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_staff_role(ARRAY['super_admin','admin','hotel_manager']));
CREATE POLICY "audit_logs_staff_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.current_staff_role() IS NOT NULL);

CREATE POLICY "smtp_settings_admin_only" ON public.smtp_settings FOR ALL TO authenticated USING (public.has_staff_role(ARRAY['super_admin','admin'])) WITH CHECK (public.has_staff_role(ARRAY['super_admin','admin']));
`;
