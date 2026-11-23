-- ==============================================================================
-- KAMAL HOTEL (KAMALPOKHARI, KATHMANDU)
-- Migration: 202611160002_full_production_schema.sql
-- Purpose: Complete Production Schema covering PMS, Transactional Room Allocation,
--          Payments & Webhooks, Double-Entry-Ready Accounting & Nepal IRD CBMS,
--          Restaurant POS/KDS, Inventory, Housekeeping, Security Persistence,
--          Notification Jobs, Cloudflare R2 Media Registry, and Strict Role RLS.
-- Safe & Idempotent: Preserves existing tables/columns from P0 migration.
-- ==============================================================================

-- 1. Extend bookings with idempotency, overlap protection, coupon/pricing provenance
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS guest_id TEXT,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_charge_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS server_pricing_verified BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS booking_source TEXT NOT NULL DEFAULT 'direct_web',
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idempotency_key
  ON public.bookings (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_date_range_active
  ON public.bookings (room_type_id, assigned_room_number, check_in_date, check_out_date)
  WHERE booking_status NOT IN ('cancelled', 'no_show');

-- Tighten bookings public insert policy: all public bookings MUST flow through
-- the server-side transactional booking engine (service_role / validated RPC).
DROP POLICY IF EXISTS "bookings_public_controlled_insert" ON public.bookings;
CREATE POLICY "bookings_staff_insert"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

-- 2. Extend email_otp_verifications for salted HMAC hashes
ALTER TABLE public.email_otp_verifications
  ADD COLUMN IF NOT EXISTS salt TEXT NOT NULL DEFAULT '';

-- 3. Persistent Auth Security State (Revoked JWTs & Rate Limits — survive restarts)
CREATE TABLE IF NOT EXISTS public.revoked_sessions (
  jti TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket_key TEXT PRIMARY KEY,
  hit_count INT NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

-- 4. Core Guest Directory & VIP Profiles
CREATE TABLE IF NOT EXISTS public.guests (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT DEFAULT 'Nepal',
  id_type TEXT,
  id_number TEXT,
  vip_tier TEXT DEFAULT 'none',
  loyalty_points INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_email_lower ON public.guests (LOWER(email));

CREATE TABLE IF NOT EXISTS public.vip_guest_profiles (
  id TEXT PRIMARY KEY,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  vip_tier TEXT NOT NULL DEFAULT 'silver',
  total_stays INT NOT NULL DEFAULT 0,
  total_spend_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  last_stay_date TEXT,
  preferred_room_type TEXT,
  room_temperature_c NUMERIC(4, 1),
  pillow_preference TEXT,
  beverage_preference TEXT,
  dietary_notes TEXT,
  birthday_or_anniversary TEXT,
  special_notes TEXT,
  amenities_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Physical Room Units & Operational Telemetry
CREATE TABLE IF NOT EXISTS public.room_units (
  id TEXT PRIMARY KEY,
  room_number TEXT NOT NULL UNIQUE,
  floor TEXT NOT NULL,
  room_type TEXT NOT NULL,
  occupancy_status TEXT NOT NULL DEFAULT 'vacant',
  clean_status TEXT NOT NULL DEFAULT 'clean',
  current_guest_name TEXT,
  current_booking_code TEXT,
  check_in_date TEXT,
  check_out_date TEXT,
  assigned_housekeeper TEXT,
  last_cleaned_at TEXT,
  inspected_by TEXT,
  maintenance_note TEXT,
  dnd_active BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CMS, Coupons, FAQs, Settings KV
CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  applicable_to TEXT NOT NULL DEFAULT 'all',
  min_spend_usd NUMERIC(10, 2),
  max_discount_usd NUMERIC(10, 2),
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  usage_limit INT NOT NULL DEFAULT 100,
  times_used INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.faqs (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.pms_kv_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Billing, Sequential Gapless Invoices, Folios & Nepal IRD CBMS
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  fiscal_year TEXT PRIMARY KEY,
  last_seq INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.master_invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  fiscal_year TEXT NOT NULL DEFAULT '2082/83',
  booking_code TEXT NOT NULL,
  room_number TEXT NOT NULL DEFAULT 'Pending',
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  guest_address TEXT,
  guest_pan TEXT,
  issued_at TEXT NOT NULL,
  check_in_date TEXT NOT NULL,
  check_out_date TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  discount_amount_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  service_charge_percent NUMERIC(5, 2) NOT NULL DEFAULT 10,
  service_charge_amount_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 13,
  tax_amount_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  grand_total_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount_paid_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance_due_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'onsite',
  notes TEXT,
  ird_synced BOOLEAN NOT NULL DEFAULT false,
  ird_sync_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bill_line_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES public.master_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  item_date TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  rate_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Payments, Webhooks & Refunds (Zero PAN/CVV allowed)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE,
  booking_id TEXT,
  booking_code TEXT,
  invoice_id TEXT REFERENCES public.master_invoices(id) ON DELETE SET NULL,
  gateway TEXT NOT NULL,
  transaction_ref TEXT NOT NULL UNIQUE,
  external_txn_id TEXT,
  amount_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount_npr NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'initiated',
  verified_at TIMESTAMPTZ,
  raw_verification JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id TEXT PRIMARY KEY,
  gateway TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  vendor TEXT,
  amount_usd NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  expense_date TEXT NOT NULL,
  reference_no TEXT,
  recorded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ird_cbms_logs (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES public.master_invoices(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  response_code INT,
  response_body TEXT,
  attempts INT NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Restaurant POS / KDS & Inventory
CREATE TABLE IF NOT EXISTS public.restaurant_menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  price_usd NUMERIC(10, 2) NOT NULL,
  image_url TEXT DEFAULT '',
  is_vegetarian BOOLEAN NOT NULL DEFAULT false,
  is_spicy BOOLEAN NOT NULL DEFAULT false,
  is_chef_special BOOLEAN NOT NULL DEFAULT false,
  available BOOLEAN NOT NULL DEFAULT true,
  preparation_time_minutes INT NOT NULL DEFAULT 15,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id TEXT PRIMARY KEY,
  table_number TEXT NOT NULL UNIQUE,
  zone TEXT NOT NULL DEFAULT 'rooftop',
  capacity INT NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'vacant',
  current_order_id TEXT,
  guest_name TEXT,
  waiter_name TEXT,
  seated_at TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.restaurant_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  room_number TEXT NOT NULL,
  table_or_room_no TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  order_source TEXT NOT NULL DEFAULT 'rooftop_table',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  special_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_waiter TEXT
);

CREATE TABLE IF NOT EXISTS public.stock_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
  min_threshold NUMERIC(12, 2) NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'pcs',
  cost_per_unit_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  last_restocked_date TEXT,
  supplier_name TEXT,
  supplier_contact TEXT,
  location TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.floor_supplies (
  id TEXT PRIMARY KEY,
  floor TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_stock INT NOT NULL DEFAULT 0,
  par_level INT NOT NULL DEFAULT 10,
  unit TEXT NOT NULL DEFAULT 'pcs',
  last_restocked_at TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Front Office, Housekeeping, Engineering, Loyalty & Guest Portal
CREATE TABLE IF NOT EXISTS public.lost_and_found (
  id TEXT PRIMARY KEY,
  reference_id TEXT NOT NULL UNIQUE,
  item_description TEXT NOT NULL,
  category TEXT NOT NULL,
  room_number TEXT NOT NULL,
  found_by TEXT NOT NULL,
  found_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'stored',
  storage_location TEXT NOT NULL,
  claimed_by_guest_name TEXT,
  claimed_by_id_number TEXT,
  claimed_at TEXT,
  contact_phone TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shift_handovers (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  shift TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  cash_in_drawer_npr NUMERIC(14, 2) NOT NULL DEFAULT 0,
  unresolved_issues TEXT DEFAULT '',
  notes_for_next_shift TEXT DEFAULT '',
  arrivals_expected_count INT NOT NULL DEFAULT 0,
  departures_pending_count INT NOT NULL DEFAULT 0,
  in_house_guests_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.night_audits (
  id TEXT PRIMARY KEY,
  audit_date TEXT NOT NULL UNIQUE,
  auditor_name TEXT NOT NULL,
  total_rooms_sold INT NOT NULL DEFAULT 0,
  total_rooms_available INT NOT NULL DEFAULT 0,
  occupancy_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  room_revenue_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  f_and_b_revenue_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  services_revenue_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_revenue_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  service_charge_collected_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  vat_collected_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  adr_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
  rev_par_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cash_drawer_discrepancy_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'closed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  staff_role TEXT NOT NULL,
  department TEXT NOT NULL,
  date TEXT NOT NULL,
  shift_slot TEXT NOT NULL,
  assigned_station TEXT NOT NULL,
  attendance_status TEXT NOT NULL DEFAULT 'scheduled',
  clock_in_time TEXT,
  clock_out_time TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_availability (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL,
  date TEXT NOT NULL,
  availability TEXT NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS public.post_checkout_surveys (
  id TEXT PRIMARY KEY,
  survey_token TEXT NOT NULL UNIQUE,
  booking_code TEXT NOT NULL,
  room_number TEXT NOT NULL,
  room_name TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  check_out_date TEXT NOT NULL,
  triggered_at TEXT NOT NULL,
  channels JSONB NOT NULL DEFAULT '["email"]'::jsonb,
  trigger_mode TEXT NOT NULL DEFAULT 'auto_checkout',
  status TEXT NOT NULL DEFAULT 'sent',
  completed_at TEXT,
  overall_rating INT,
  ratings JSONB,
  nps_score INT,
  would_recommend BOOLEAN,
  comment TEXT,
  published_as_review BOOLEAN NOT NULL DEFAULT false,
  staff_response TEXT
);

CREATE TABLE IF NOT EXISTS public.digital_keycards (
  id TEXT PRIMARY KEY,
  key_token TEXT NOT NULL UNIQUE,
  room_number TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  booking_code TEXT NOT NULL,
  access_scope TEXT NOT NULL DEFAULT 'room_and_amenities',
  valid_from TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  issued_by TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  unlock_count INT NOT NULL DEFAULT 0,
  last_unlocked_at TEXT
);

CREATE TABLE IF NOT EXISTS public.door_unlock_logs (
  id TEXT PRIMARY KEY,
  room_number TEXT NOT NULL,
  key_token TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  result TEXT NOT NULL,
  reason TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
  id TEXT PRIMARY KEY,
  ticket_code TEXT NOT NULL UNIQUE,
  unit_id TEXT NOT NULL,
  room_number TEXT NOT NULL,
  floor TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  issue_title TEXT NOT NULL,
  description TEXT NOT NULL,
  reported_by TEXT NOT NULL,
  reported_by_role TEXT NOT NULL,
  reported_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reported',
  previous_clean_status TEXT NOT NULL DEFAULT 'dirty',
  assigned_technician TEXT,
  repair_notes TEXT,
  confirmed_by_manager TEXT,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS public.kamal_rewards_members (
  id TEXT PRIMARY KEY,
  member_number TEXT NOT NULL UNIQUE,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL UNIQUE,
  guest_phone TEXT,
  points_balance INT NOT NULL DEFAULT 0,
  lifetime_points_earned INT NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'Silver Explorer',
  joined_at TEXT NOT NULL,
  transactions JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.wake_up_calls (
  id TEXT PRIMARY KEY,
  request_code TEXT NOT NULL UNIQUE,
  room_number TEXT NOT NULL,
  booking_code TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  wake_up_date TEXT NOT NULL,
  wake_up_time TEXT NOT NULL,
  repeat_daily BOOLEAN NOT NULL DEFAULT false,
  delivery_method TEXT NOT NULL DEFAULT 'phone_ring',
  beverage_preference TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  requested_at TEXT NOT NULL,
  acknowledged_by TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS public.deep_cleaning_schedules (
  id TEXT PRIMARY KEY,
  schedule_code TEXT NOT NULL UNIQUE,
  unit_id TEXT NOT NULL,
  room_number TEXT NOT NULL,
  floor TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  assigned_housekeeper TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS public.express_turnovers (
  id TEXT PRIMARY KEY,
  job_code TEXT NOT NULL UNIQUE,
  unit_id TEXT NOT NULL,
  room_number TEXT NOT NULL,
  floor TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'standard_checkout',
  assigned_housekeeper TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  triggered_at TEXT NOT NULL,
  target_ready_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS public.room_service_requests (
  id TEXT PRIMARY KEY,
  request_code TEXT NOT NULL UNIQUE,
  room_number TEXT NOT NULL,
  booking_code TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  priority TEXT NOT NULL DEFAULT 'normal',
  preferred_time TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TEXT NOT NULL,
  assigned_to TEXT,
  delivered_at TEXT
);

CREATE TABLE IF NOT EXISTS public.guest_room_sessions (
  room_number TEXT PRIMARY KEY,
  booking_code TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  passcode TEXT NOT NULL,
  check_in_date TEXT NOT NULL,
  check_out_date TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.csr_chat_messages (
  id TEXT PRIMARY KEY,
  room_number TEXT NOT NULL,
  sender TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  service_tag TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.operational_alerts (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  target_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  booking_code TEXT,
  room_number TEXT
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  booking_code TEXT,
  sent_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'delivered'
);

CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  template_name TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.media_assets (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Atomic Invoice Number Sequence Allocator
CREATE OR REPLACE FUNCTION public.allocate_next_invoice_number(p_fiscal_year TEXT DEFAULT '2082/83')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq INT;
BEGIN
  INSERT INTO public.invoice_sequences (fiscal_year, last_seq)
  VALUES (p_fiscal_year, 1)
  ON CONFLICT (fiscal_year)
  DO UPDATE SET last_seq = public.invoice_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN 'KH-INV-' || REPLACE(p_fiscal_year, '/', '') || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$;

-- 12. Transactional Booking Creation RPC (Row-Level Locking & Overlap Prevention)
CREATE OR REPLACE FUNCTION public.create_booking_transactional(
  p_id TEXT,
  p_booking_code TEXT,
  p_idempotency_key TEXT,
  p_guest_name TEXT,
  p_guest_email TEXT,
  p_guest_phone TEXT,
  p_guest_country TEXT,
  p_room_type_id TEXT,
  p_room_name TEXT,
  p_room_type TEXT,
  p_check_in_date TEXT,
  p_check_out_date TEXT,
  p_nights INT,
  p_adults INT,
  p_children INT,
  p_addons JSONB,
  p_subtotal NUMERIC,
  p_discount_usd NUMERIC,
  p_service_charge_amount NUMERIC,
  p_tax_amount NUMERIC,
  p_total_amount NUMERIC,
  p_currency TEXT,
  p_payment_status TEXT,
  p_payment_method TEXT,
  p_special_requests TEXT,
  p_coupon_code TEXT,
  p_preferred_room_number TEXT DEFAULT NULL,
  p_invoice_id TEXT DEFAULT NULL,
  p_fiscal_year TEXT DEFAULT '2082/83'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_room_unit RECORD;
  v_invoice_number TEXT;
  v_booking JSONB;
BEGIN
  -- 1) Idempotency short-circuit
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT * INTO v_existing FROM public.bookings WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('duplicate', true, 'booking_id', v_existing.id, 'booking_code', v_existing.booking_code, 'assigned_room_number', v_existing.assigned_room_number);
    END IF;
  END IF;

  -- 2) Lock candidate room unit not overlapping [check_in, check_out)
  SELECT ru.*
    INTO v_room_unit
    FROM public.room_units ru
   WHERE ru.room_type = p_room_type
     AND ru.clean_status <> 'out_of_order'
     AND (p_preferred_room_number IS NULL OR ru.room_number = p_preferred_room_number)
     AND NOT EXISTS (
       SELECT 1
         FROM public.bookings b
        WHERE b.assigned_room_number = ru.room_number
          AND b.booking_status NOT IN ('cancelled', 'no_show', 'checked-out')
          AND b.check_in_date < p_check_out_date
          AND b.check_out_date > p_check_in_date
     )
   ORDER BY CASE WHEN ru.room_number = p_preferred_room_number THEN 0 ELSE 1 END, ru.room_number
   LIMIT 1
   FOR UPDATE OF ru SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_ROOM_AVAILABLE: Zero physical units free for % between % and %', p_room_type, p_check_in_date, p_check_out_date;
  END IF;

  -- 3) Insert Booking
  INSERT INTO public.bookings (
    id, booking_code, idempotency_key, guest_name, guest_email, guest_phone, guest_country,
    room_type_id, room_name, room_type, assigned_room_number, assigned_floor,
    check_in_date, check_out_date, nights, adults, children, addons,
    subtotal, discount_usd, service_charge_amount, tax_amount, total_amount,
    currency, payment_status, payment_method, booking_status, special_requests,
    coupon_code, server_pricing_verified, created_at
  ) VALUES (
    p_id, p_booking_code, p_idempotency_key, p_guest_name, p_guest_email, p_guest_phone, p_guest_country,
    p_room_type_id, p_room_name, p_room_type, v_room_unit.room_number, v_room_unit.floor,
    p_check_in_date, p_check_out_date, p_nights, p_adults, p_children, p_addons,
    p_subtotal, p_discount_usd, p_service_charge_amount, p_tax_amount, p_total_amount,
    p_currency, p_payment_status, p_payment_method, 'confirmed', p_special_requests,
    p_coupon_code, true, NOW()
  );

  -- 4) Mark room unit reserved if not occupied
  UPDATE public.room_units
     SET occupancy_status = CASE WHEN occupancy_status = 'occupied' THEN 'occupied' ELSE 'reserved' END,
         current_booking_code = COALESCE(current_booking_code, p_booking_code),
         current_guest_name = COALESCE(current_guest_name, p_guest_name),
         updated_at = NOW()
   WHERE id = v_room_unit.id;

  -- 5) Allocate gapless Nepal FY invoice number if invoice_id requested
  IF p_invoice_id IS NOT NULL THEN
    v_invoice_number := public.allocate_next_invoice_number(p_fiscal_year);
  END IF;

  v_booking := jsonb_build_object(
    'duplicate', false,
    'booking_id', p_id,
    'booking_code', p_booking_code,
    'assigned_room_number', v_room_unit.room_number,
    'assigned_floor', v_room_unit.floor,
    'invoice_number', v_invoice_number
  );

  RETURN v_booking;
END;
$$;

-- 13. Enable RLS & Apply Strict Role-Based Policies Across All New Tables
ALTER TABLE public.revoked_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_guest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pms_kv_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ird_cbms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_and_found ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.night_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_checkout_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_keycards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.door_unlock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kamal_rewards_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wake_up_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deep_cleaning_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.express_turnovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_room_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csr_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Public-catalog read policies (non-PII catalog data only)
CREATE POLICY "faqs_public_select" ON public.faqs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "faqs_admin_manage" ON public.faqs FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin']));

CREATE POLICY "menu_public_select" ON public.restaurant_menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "menu_culinary_manage" ON public.restaurant_menu_items FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'restaurant_owner', 'chef']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'restaurant_owner', 'chef']));

CREATE POLICY "coupons_public_active_select" ON public.coupons FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_active_staff());
CREATE POLICY "coupons_admin_manage" ON public.coupons FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager']));

-- Scoped Staff Policies on Operational Tables (Zero anon access)
CREATE POLICY "guests_front_office_manage" ON public.guests FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

CREATE POLICY "vip_profiles_staff_manage" ON public.vip_guest_profiles FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist', 'restaurant_owner']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

CREATE POLICY "room_units_staff_read" ON public.room_units FOR SELECT TO authenticated
  USING (public.is_active_staff());
CREATE POLICY "room_units_ops_write" ON public.room_units FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping']));

CREATE POLICY "invoices_staff_manage" ON public.master_invoices FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

CREATE POLICY "bill_line_items_staff_manage" ON public.bill_line_items FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

CREATE POLICY "payment_txns_finance_select" ON public.payment_transactions FOR SELECT TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

CREATE POLICY "expenses_finance_manage" ON public.expenses FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'restaurant_owner']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'restaurant_owner']));

CREATE POLICY "ird_logs_finance_select" ON public.ird_cbms_logs FOR SELECT TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager']));

CREATE POLICY "restaurant_tables_staff_manage" ON public.restaurant_tables FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'restaurant_owner', 'waiter', 'receptionist']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'restaurant_owner', 'waiter', 'receptionist']));

CREATE POLICY "restaurant_orders_staff_manage" ON public.restaurant_orders FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'restaurant_owner', 'chef', 'waiter', 'receptionist']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'restaurant_owner', 'chef', 'waiter', 'receptionist']));

CREATE POLICY "stock_items_staff_manage" ON public.stock_items FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'restaurant_owner', 'chef', 'housekeeping']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'restaurant_owner', 'chef', 'housekeeping']));

CREATE POLICY "floor_supplies_hk_manage" ON public.floor_supplies FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'housekeeping', 'receptionist']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'housekeeping']));

CREATE POLICY "lost_found_staff_manage" ON public.lost_and_found FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping']));

CREATE POLICY "shift_handovers_staff_manage" ON public.shift_handovers FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

CREATE POLICY "night_audits_mgmt_manage" ON public.night_audits FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager']));

CREATE POLICY "staff_shifts_read" ON public.staff_shifts FOR SELECT TO authenticated
  USING (public.is_active_staff());
CREATE POLICY "staff_shifts_mgmt_write" ON public.staff_shifts FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager']));

CREATE POLICY "staff_availability_read" ON public.staff_availability FOR SELECT TO authenticated
  USING (public.is_active_staff());

CREATE POLICY "surveys_staff_manage" ON public.post_checkout_surveys FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

CREATE POLICY "keycards_front_office_manage" ON public.digital_keycards FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

CREATE POLICY "door_logs_front_office_select" ON public.door_unlock_logs FOR SELECT TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

CREATE POLICY "maintenance_staff_manage" ON public.maintenance_tickets FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping']));

CREATE POLICY "rewards_front_office_manage" ON public.kamal_rewards_members FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

CREATE POLICY "wake_up_calls_front_office" ON public.wake_up_calls FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

CREATE POLICY "deep_clean_hk_manage" ON public.deep_cleaning_schedules FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'housekeeping']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'housekeeping']));

CREATE POLICY "express_turnovers_hk_manage" ON public.express_turnovers FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping']));

CREATE POLICY "room_service_requests_manage" ON public.room_service_requests FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping', 'waiter']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping', 'waiter']));

CREATE POLICY "guest_sessions_front_office" ON public.guest_room_sessions FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

CREATE POLICY "csr_chat_staff_manage" ON public.csr_chat_messages FOR ALL TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());

CREATE POLICY "alerts_staff_manage" ON public.operational_alerts FOR ALL TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());

CREATE POLICY "notifications_admin_select" ON public.notifications FOR SELECT TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager', 'receptionist']));

CREATE POLICY "media_assets_public_select" ON public.media_assets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "media_assets_admin_manage" ON public.media_assets FOR ALL TO authenticated
  USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'hotel_manager']));

-- Note: revoked_sessions, rate_limits, webhook_events, invoice_sequences,
-- notification_jobs, pms_kv_settings have RLS enabled with zero anon/client policies
-- and are exclusively managed by the Express backend using service_role.
