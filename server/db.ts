import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  INITIAL_AMENITIES,
  INITIAL_AUDIT_LOGS,
  INITIAL_BOOKINGS,
  INITIAL_COUPONS,
  INITIAL_EXPENSES,
  INITIAL_FAQS,
  INITIAL_OPERATIONAL_ALERTS,
  INITIAL_REVIEWS,
  INITIAL_ROOMS,
  INITIAL_THEME,
} from '../src/data/seedCatalog.ts';
import {
  INITIAL_BILL_SETTINGS,
  INITIAL_DEEP_CLEANING_SCHEDULES,
  INITIAL_DIGITAL_KEYCARDS,
  INITIAL_DOOR_UNLOCK_LOGS,
  INITIAL_EXPRESS_TURNOVERS,
  INITIAL_FLOORS,
  INITIAL_FLOOR_SUPPLIES,
  INITIAL_GUEST_SESSIONS,
  INITIAL_INVOICES,
  INITIAL_KAMAL_REWARDS,
  INITIAL_LOST_FOUND,
  INITIAL_MAINTENANCE_TICKETS,
  INITIAL_MENU_ITEMS,
  INITIAL_NIGHT_AUDITS,
  INITIAL_POST_CHECKOUT_SURVEYS,
  INITIAL_ROOM_SERVICE_REQUESTS,
  INITIAL_ROOM_UNITS,
  INITIAL_SHIFTS,
  INITIAL_STAFF_AVAILABILITY,
  INITIAL_STAFF_SHIFTS,
  INITIAL_STOCK_ITEMS,
  INITIAL_TABLES,
  INITIAL_VIP_GUEST_PROFILES,
  INITIAL_WAKE_UP_CALLS,
} from '../src/services/restaurantBillingData.ts';

export type PmsCollectionName =
  | 'rooms'
  | 'amenities'
  | 'reviews'
  | 'faqs'
  | 'coupons'
  | 'bookings'
  | 'roomUnits'
  | 'guests'
  | 'invoices'
  | 'paymentTransactions'
  | 'expenses'
  | 'irdCbmsLogs'
  | 'menuItems'
  | 'tables'
  | 'restaurantOrders'
  | 'stockItems'
  | 'floorSupplies'
  | 'lostAndFound'
  | 'shiftHandovers'
  | 'nightAudits'
  | 'staffShifts'
  | 'staffAvailability'
  | 'surveys'
  | 'digitalKeycards'
  | 'doorUnlockLogs'
  | 'maintenanceTickets'
  | 'rewardsMembers'
  | 'wakeUpCalls'
  | 'deepCleaningSchedules'
  | 'expressTurnovers'
  | 'roomServiceRequests'
  | 'vipProfiles'
  | 'guestSessions'
  | 'guestChatMessages'
  | 'operationalAlerts'
  | 'notifications'
  | 'auditLogs'
  | 'mediaAssets';

export interface PersistentOtpRecord {
  email: string;
  otpHash: string;
  salt: string;
  guestName?: string;
  expiresAt: number;
  attempts: number;
}

export interface PersistentNotificationJob {
  id: string;
  channel: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  subject?: string;
  body: string;
  htmlBody?: string;
  templateName?: string;
  payload: Record<string, unknown>;
  status: 'queued' | 'processing' | 'sent' | 'failed';
  attempts: number;
  maxAttempts: number;
  nextRunAt: number;
  lastError?: string;
  sentAt?: string;
  createdAt: string;
}

export interface PaymentTransactionRecord {
  id: string;
  idempotencyKey?: string;
  bookingId?: string;
  bookingCode?: string;
  invoiceId?: string;
  gateway: 'esewa' | 'khalti' | 'stripe_card' | 'onsite' | 'refund';
  transactionRef: string;
  externalTxnId?: string;
  amountUSD: number;
  amountNPR: number;
  currency: string;
  status: 'initiated' | 'pending' | 'completed' | 'failed' | 'refunded';
  verifiedAt?: string;
  rawVerification?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRecord {
  id: string;
  category: string;
  description: string;
  vendor?: string;
  amountUSD: number;
  paymentMethod: string;
  expenseDate: string;
  referenceNo?: string;
  recordedBy: string;
  createdAt?: string;
}

export interface IrdCbmsLogRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  fiscalYear: string;
  payload: Record<string, unknown>;
  status: 'queued' | 'pending_credentials' | 'submitted' | 'failed';
  responseCode?: number;
  responseBody?: string;
  attempts: number;
  submittedAt?: string;
  createdAt: string;
}

export interface MediaAssetRecord {
  id: string;
  objectKey: string;
  publicUrl: string;
  contentType: string;
  sizeBytes: number;
  category: string;
  uploadedBy: string;
  createdAt: string;
}

let dbInstance: DatabaseSync | null = null;
let supabaseAdminClient: SupabaseClient | null = null;
let initializedDbPath = '';

export function setSupabaseAdminForDb(client: SupabaseClient | null): void {
  supabaseAdminClient = client;
}

export function getDbPath(): string {
  return path.resolve(process.cwd(), process.env.KAMAL_DB_PATH || '.kamal-pms.db');
}

export function isLocalSqliteAllowed(): boolean {
  const isProd = process.env.NODE_ENV === 'production' && process.env.STRICT_CLOUD_DB === 'true';
  if (!isProd) return true;
  return process.env.ALLOW_LOCAL_SQLITE_FALLBACK === 'true';
}

export function getDbStorageMode(): 'supabase_plus_sqlite_cache' | 'sqlite_local' | 'unconfigured' {
  if (supabaseAdminClient) return 'supabase_plus_sqlite_cache';
  if (isLocalSqliteAllowed()) return 'sqlite_local';
  return 'unconfigured';
}

export function getSqliteDb(): DatabaseSync {
  const targetPath = getDbPath();
  if (dbInstance && initializedDbPath === targetPath) {
    return dbInstance;
  }
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
  }
  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA foreign_keys = ON;');
  createTables(db);
  seedInitialData(db);
  upgradeLegacyStockHeroDefaults(db);
  dbInstance = db;
  initializedDbPath = targetPath;
  return db;
}

export function closeSqliteDb(): void {
  inSqliteTransaction = false;
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
    dbInstance = null;
    initializedDbPath = '';
  }
}

function createTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pms_records (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (collection, id)
    );
    CREATE INDEX IF NOT EXISTS idx_pms_records_collection ON pms_records (collection);

    CREATE TABLE IF NOT EXISTS bookings_store (
      id TEXT PRIMARY KEY,
      booking_code TEXT NOT NULL UNIQUE,
      idempotency_key TEXT UNIQUE,
      room_type TEXT NOT NULL,
      assigned_room_number TEXT,
      check_in_date TEXT NOT NULL,
      check_out_date TEXT NOT NULL,
      booking_status TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      created_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_overlap ON bookings_store (assigned_room_number, check_in_date, check_out_date);

    CREATE TABLE IF NOT EXISTS invoice_sequences (
      fiscal_year TEXT PRIMARY KEY,
      last_seq INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      gateway TEXT NOT NULL,
      event_id TEXT NOT NULL,
      signature_valid INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL,
      processed_at TEXT NOT NULL,
      PRIMARY KEY (gateway, event_id)
    );

    CREATE TABLE IF NOT EXISTS email_otp_verifications (
      email TEXT PRIMARY KEY,
      otp_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      guest_name TEXT,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS revoked_sessions (
      jti TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL,
      revoked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      bucket_key TEXT PRIMARY KEY,
      hit_count INTEGER NOT NULL,
      reset_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_jobs (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT,
      body TEXT NOT NULL,
      html_body TEXT,
      template_name TEXT,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      next_run_at INTEGER NOT NULL,
      last_error TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notification_jobs_due ON notification_jobs (status, next_run_at);

    CREATE TABLE IF NOT EXISTS staff_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      permissions_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      department TEXT NOT NULL DEFAULT '',
      last_active TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_staff_accounts_username ON staff_accounts (LOWER(username));
    CREATE INDEX IF NOT EXISTS idx_staff_accounts_email ON staff_accounts (LOWER(email));

    CREATE TABLE IF NOT EXISTS smtp_credentials (
      id TEXT PRIMARY KEY,
      provider_preset TEXT NOT NULL DEFAULT 'gmail',
      smtp_host TEXT NOT NULL DEFAULT '',
      smtp_port INTEGER NOT NULL DEFAULT 587,
      smtp_user TEXT NOT NULL DEFAULT '',
      smtp_password_encrypted TEXT NOT NULL DEFAULT '',
      encrypted_password TEXT NOT NULL DEFAULT '',
      sender_email TEXT NOT NULL DEFAULT '',
      sender_name TEXT NOT NULL DEFAULT 'Kamal Hotel Reservations',
      reply_to_email TEXT NOT NULL DEFAULT '',
      notification_email TEXT NOT NULL DEFAULT '',
      encryption TEXT NOT NULL DEFAULT 'tls',
      send_booking_confirmation_email INTEGER NOT NULL DEFAULT 1,
      require_real_email_otp INTEGER NOT NULL DEFAULT 0,
      otp_expiry_minutes INTEGER NOT NULL DEFAULT 10,
      email_subject_prefix TEXT NOT NULL DEFAULT '[Kamal Hotel]',
      is_configured INTEGER NOT NULL DEFAULT 0,
      last_tested_at TEXT,
      last_test_status TEXT,
      last_test_message TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  try {
    db.exec("ALTER TABLE smtp_credentials ADD COLUMN encrypted_password TEXT NOT NULL DEFAULT ''");
  } catch {
    // Column already exists
  }
}

function seedInitialData(db: DatabaseSync): void {
  const alreadySeeded = db
    .prepare('SELECT value_json FROM kv_settings WHERE key = ?')
    .get('__seeded_v1') as { value_json: string } | undefined;

  if (alreadySeeded) return;

  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const upsertKv = db.prepare(
      'INSERT OR IGNORE INTO kv_settings (key, value_json, updated_at) VALUES (?, ?, ?)'
    );
    upsertKv.run('themeConfig', JSON.stringify(INITIAL_THEME), now);
    upsertKv.run('billSettings', JSON.stringify(INITIAL_BILL_SETTINGS), now);
    upsertKv.run('floors', JSON.stringify(INITIAL_FLOORS), now);
    upsertKv.run(
      'seasonalSettings',
      JSON.stringify({ surgeMultiplier: INITIAL_THEME.seasonalSurgeMultiplier, holidayMode: false }),
      now
    );

    const insertRec = db.prepare(
      'INSERT OR IGNORE INTO pms_records (collection, id, data_json, updated_at) VALUES (?, ?, ?, ?)'
    );

    const seedBatch = <T extends { id?: string; roomNumber?: string }>(
      collection: PmsCollectionName,
      items: T[],
      idFn?: (item: T, idx: number) => string
    ) => {
      items.forEach((item, idx) => {
        const id = idFn ? idFn(item, idx) : String(item.id || `${collection}-${idx + 1}`);
        insertRec.run(collection, id, JSON.stringify(item), now);
      });
    };

    seedBatch('rooms', INITIAL_ROOMS);
    seedBatch('amenities', INITIAL_AMENITIES);
    seedBatch('reviews', INITIAL_REVIEWS);
    seedBatch('faqs', INITIAL_FAQS);
    seedBatch('coupons', INITIAL_COUPONS);
    seedBatch('roomUnits', INITIAL_ROOM_UNITS);
    seedBatch('invoices', INITIAL_INVOICES);
    seedBatch('expenses', INITIAL_EXPENSES);
    seedBatch('menuItems', INITIAL_MENU_ITEMS);
    seedBatch('tables', INITIAL_TABLES);
    seedBatch('stockItems', INITIAL_STOCK_ITEMS);
    seedBatch('floorSupplies', INITIAL_FLOOR_SUPPLIES);
    seedBatch('lostAndFound', INITIAL_LOST_FOUND);
    seedBatch('shiftHandovers', INITIAL_SHIFTS);
    seedBatch('nightAudits', INITIAL_NIGHT_AUDITS);
    seedBatch('staffShifts', INITIAL_STAFF_SHIFTS);
    seedBatch('staffAvailability', INITIAL_STAFF_AVAILABILITY);
    seedBatch('surveys', INITIAL_POST_CHECKOUT_SURVEYS);
    seedBatch('digitalKeycards', INITIAL_DIGITAL_KEYCARDS);
    seedBatch('doorUnlockLogs', INITIAL_DOOR_UNLOCK_LOGS);
    seedBatch('maintenanceTickets', INITIAL_MAINTENANCE_TICKETS);
    seedBatch('rewardsMembers', INITIAL_KAMAL_REWARDS);
    seedBatch('wakeUpCalls', INITIAL_WAKE_UP_CALLS);
    seedBatch('deepCleaningSchedules', INITIAL_DEEP_CLEANING_SCHEDULES);
    seedBatch('expressTurnovers', INITIAL_EXPRESS_TURNOVERS);
    seedBatch('roomServiceRequests', INITIAL_ROOM_SERVICE_REQUESTS);
    seedBatch('vipProfiles', INITIAL_VIP_GUEST_PROFILES);
    const isFreshProduction =
      process.env.FRESH_PRODUCTION_START === 'true' || process.env.NODE_ENV === 'production';

    if (!isFreshProduction) {
      seedBatch('invoices', INITIAL_INVOICES);
      seedBatch('guestSessions', INITIAL_GUEST_SESSIONS, (s) => s.roomNumber);

      // Seed initial demo bookings in dedicated transactional bookings_store
      const insertBooking = db.prepare(`
        INSERT OR IGNORE INTO bookings_store
          (id, booking_code, idempotency_key, room_type, assigned_room_number, check_in_date, check_out_date, booking_status, payment_status, total_amount, currency, created_at, data_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const bk of INITIAL_BOOKINGS) {
        insertBooking.run(
          bk.id,
          bk.bookingCode,
          null,
          bk.roomType,
          bk.assignedRoomNumber || null,
          bk.checkInDate,
          bk.checkOutDate,
          bk.bookingStatus,
          bk.paymentStatus,
          bk.totalAmount,
          bk.currency,
          bk.createdAt,
          JSON.stringify(bk)
        );
      }

      // Seed completed payment transactions matching paid INITIAL_INVOICES
      for (const inv of INITIAL_INVOICES) {
        if (inv.amountPaidUSD > 0) {
          const txn: PaymentTransactionRecord = {
            id: `ptxn-seed-${inv.id}`,
            bookingCode: inv.bookingCode,
            invoiceId: inv.id,
            gateway: inv.paymentMethod === 'esewa' ? 'esewa' : inv.paymentMethod === 'khalti' ? 'khalti' : 'stripe_card',
            transactionRef: `SEED-${inv.invoiceNumber}`,
            amountUSD: inv.amountPaidUSD,
            amountNPR: Math.round(inv.amountPaidUSD * 135),
            currency: 'USD',
            status: 'completed',
            verifiedAt: inv.issuedAt,
            createdAt: inv.issuedAt,
            updatedAt: inv.issuedAt,
          };
          insertRec.run('paymentTransactions', txn.id, JSON.stringify(txn), now);
        }
      }
      db.prepare('INSERT OR IGNORE INTO invoice_sequences (fiscal_year, last_seq) VALUES (?, ?)').run('2082/83', 1002);
    } else {
      // In fresh production mode, start invoice sequence at 0 so first real invoice starts at 00001
      db.prepare('INSERT OR IGNORE INTO invoice_sequences (fiscal_year, last_seq) VALUES (?, ?)').run('2082/83', 0);
    }

    upsertKv.run('__seeded_v1', JSON.stringify({ seededAt: now, mode: isFreshProduction ? 'production_fresh' : 'demo' }), now);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function upgradeLegacyStockHeroDefaults(db: DatabaseSync): void {
  const now = new Date().toISOString();

  const migratedCopy = db
    .prepare('SELECT value_json FROM kv_settings WHERE key = ?')
    .get('__hero_copy_v2') as { value_json: string } | undefined;

  if (!migratedCopy) {
    const row = db
      .prepare('SELECT value_json FROM kv_settings WHERE key = ?')
      .get('themeConfig') as { value_json: string } | undefined;

    if (row) {
      try {
        const current = JSON.parse(row.value_json) as Record<string, unknown>;
        const isVerbatimLegacyStock =
          current.heroHeadline === 'Experience Authentic Himalayan Boutique Hospitality in Kathmandu';
        if (isVerbatimLegacyStock) {
          const updated = {
            ...current,
            heroKickerBadge: INITIAL_THEME.heroKickerBadge,
            heroHeadline: INITIAL_THEME.heroHeadline,
            heroSubheadline: INITIAL_THEME.heroSubheadline,
            heroCtaPrimaryText: INITIAL_THEME.heroCtaPrimaryText,
            heroCtaSecondaryText: INITIAL_THEME.heroCtaSecondaryText,
            heroCtaButtons: INITIAL_THEME.heroCtaButtons,
            promoBannerText: INITIAL_THEME.promoBannerText,
            promoBannerCtaLabel: INITIAL_THEME.promoBannerCtaLabel,
            roomsSectionSubtitle: INITIAL_THEME.roomsSectionSubtitle,
            roomsSectionTitle: INITIAL_THEME.roomsSectionTitle,
            roomsSectionDescription: INITIAL_THEME.roomsSectionDescription,
            amenitiesSectionSubtitle: INITIAL_THEME.amenitiesSectionSubtitle,
            amenitiesSectionTitle: INITIAL_THEME.amenitiesSectionTitle,
            amenitiesSectionDescription: INITIAL_THEME.amenitiesSectionDescription,
            footerDescription: INITIAL_THEME.footerDescription,
          };
          db.prepare('UPDATE kv_settings SET value_json = ?, updated_at = ? WHERE key = ?').run(
            JSON.stringify(updated),
            now,
            'themeConfig'
          );
        }
      } catch {
        // Ignore parse failures
      }
    }

    db.prepare('INSERT OR IGNORE INTO kv_settings (key, value_json, updated_at) VALUES (?, ?, ?)').run(
      '__hero_copy_v2',
      JSON.stringify({ upgradedAt: now }),
      now
    );
  }

  const migratedVisual = db
    .prepare('SELECT value_json FROM kv_settings WHERE key = ?')
    .get('__visual_refresh_v3') as { value_json: string } | undefined;

  if (!migratedVisual) {
    const row = db
      .prepare('SELECT value_json FROM kv_settings WHERE key = ?')
      .get('themeConfig') as { value_json: string } | undefined;

    if (row) {
      try {
        const current = JSON.parse(row.value_json) as Record<string, unknown>;
        const isLegacyHeroImage =
          !current.heroImage ||
          current.heroImage === './assets/aistudio/hotel_kamal_new_look_6cc0fe47.jpg';
        if (isLegacyHeroImage) {
          const updated = {
            ...current,
            heroImage: INITIAL_THEME.heroImage,
            heroBackgroundFit: 'cover',
            heroOverlayOpacity: 0.38,
          };
          db.prepare('UPDATE kv_settings SET value_json = ?, updated_at = ? WHERE key = ?').run(
            JSON.stringify(updated),
            now,
            'themeConfig'
          );
        }
      } catch {
        // Ignore
      }
    }

    // Ensure room-3 and room-4 get unique interior photography if still on legacy duplicated assets
    const updateRoomImage = (roomId: string, newImages: string[]) => {
      const rRow = db
        .prepare('SELECT data_json FROM pms_records WHERE collection = ? AND id = ?')
        .get('rooms', roomId) as { data_json: string } | undefined;
      if (!rRow) return;
      try {
        const room = JSON.parse(rRow.data_json) as Record<string, unknown>;
        const imgs = Array.isArray(room.images) ? (room.images as string[]) : [];
        if (
          imgs.length === 0 ||
          imgs[0] === './assets/images/hero_himalayan_boutique_1793983309553.jpg' ||
          imgs[0] === './assets/images/suite_himalayan_deluxe_1793983311349.jpg'
        ) {
          room.images = newImages;
          db.prepare('UPDATE pms_records SET data_json = ?, updated_at = ? WHERE collection = ? AND id = ?').run(
            JSON.stringify(room),
            now,
            'rooms',
            roomId
          );
        }
      } catch {
        // Ignore
      }
    };

    updateRoomImage('room-3', INITIAL_ROOMS[2].images);
    updateRoomImage('room-4', INITIAL_ROOMS[3].images);

    db.prepare('INSERT OR IGNORE INTO kv_settings (key, value_json, updated_at) VALUES (?, ?, ?)').run(
      '__visual_refresh_v3',
      JSON.stringify({ upgradedAt: now }),
      now
    );
  }

  const migratedCopyV4 = db
    .prepare('SELECT value_json FROM kv_settings WHERE key = ?')
    .get('__copy_nepali_groundfloor_v4') as { value_json: string } | undefined;

  if (!migratedCopyV4) {
    const replaceTerms = (val: string): string =>
      val
        .replace(/Nepali Heritage & Newari/g, 'Nepali Heritage & Cuisine')
        .replace(/Rooftop Bar & Beverages/g, 'Ground-Floor Bar & Beverages')
        .replace(/Newari comfort/gi, 'Nepali comfort')
        .replace(/Newari woodwork/gi, 'Nepali woodwork')
        .replace(/Newari fusion classics/gi, 'Nepali heritage classics')
        .replace(/Newari Khaja/gi, 'Nepali Khaja')
        .replace(/Newari Samay Baji/gi, 'Nepali Samay Baji')
        .replace(/Nepali Newari Khaja/gi, 'Nepali Khaja')
        .replace(/Himalayan Skyline Rooftop Dining/g, 'Ground-Floor Garden Dining')
        .replace(/Rooftop Dining & Essentials/g, 'Ground-Floor Dining & Essentials')
        .replace(/Rooftop Mountain & City Restaurant/g, 'Ground-Floor Garden Restaurant')
        .replace(/Complimentary Rooftop Breakfast/g, 'Complimentary Ground-Floor Breakfast')
        .replace(/Rooftop Garden Dining/g, 'Ground-Floor Garden Dining')
        .replace(/Rooftop Garden Restaurant/g, 'Ground-Floor Garden Restaurant')
        .replace(/Rooftop Dining & Bar Ownership/g, 'Ground-Floor Dining & Bar Ownership')
        .replace(/Culinary & Rooftop Restaurant/g, 'Culinary & Ground-Floor Restaurant')
        .replace(/rooftop dining/gi, 'ground-floor dining')
        .replace(/rooftop cuisine/gi, 'ground-floor cuisine')
        .replace(/rooftop garden/gi, 'ground-floor garden')
        .replace(/rooftop mountain views/gi, 'ground-floor garden dining');

    const themeRow = db
      .prepare('SELECT value_json FROM kv_settings WHERE key = ?')
      .get('themeConfig') as { value_json: string } | undefined;
    if (themeRow) {
      try {
        const parsed = JSON.parse(themeRow.value_json) as Record<string, unknown>;
        for (const k of [
          'heroSubheadline',
          'heritageStoryP1',
          'heritageStoryP2',
          'rooftopOpeningDateText',
          'rooftopTeaserHeadline',
          'rooftopTeaserDescription',
          'roomsSectionDescription',
          'amenitiesSectionTitle',
          'amenitiesSectionDescription',
          'footerDescription',
        ]) {
          if (typeof parsed[k] === 'string') {
            parsed[k] = replaceTerms(parsed[k] as string);
          }
        }
        db.prepare('UPDATE kv_settings SET value_json = ?, updated_at = ? WHERE key = ?').run(
          JSON.stringify(parsed),
          now,
          'themeConfig'
        );
      } catch {
        // Ignore
      }
    }

    const colsToRefresh: PmsCollectionName[] = [
      'rooms',
      'amenities',
      'reviews',
      'faqs',
      'coupons',
      'menuItems',
      'operationalAlerts',
      'auditLogs',
    ];
    for (const col of colsToRefresh) {
      const rows = db
        .prepare('SELECT id, data_json FROM pms_records WHERE collection = ?')
        .all(col) as { id: string; data_json: string }[];
      for (const r of rows) {
        const nextJson = replaceTerms(r.data_json);
        if (nextJson !== r.data_json) {
          db.prepare('UPDATE pms_records SET data_json = ?, updated_at = ? WHERE collection = ? AND id = ?').run(
            nextJson,
            now,
            col,
            r.id
          );
        }
      }
    }

    db.prepare(
      "UPDATE staff_accounts SET department = REPLACE(department, 'Rooftop', 'Ground-Floor'), updated_at = ? WHERE department LIKE '%Rooftop%'"
    ).run(now);

    db.prepare('INSERT OR IGNORE INTO kv_settings (key, value_json, updated_at) VALUES (?, ?, ?)').run(
      '__copy_nepali_groundfloor_v4',
      JSON.stringify({ upgradedAt: now }),
      now
    );
  }
}

export interface StaffAccountDbRow {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  password_salt: string;
  password_hash: string;
  role: string;
  permissions_json: string;
  status: 'active' | 'on-leave' | 'inactive';
  department: string;
  last_active: string;
  created_at: string;
  updated_at: string;
}

export interface SmtpCredentialDbRow {
  id: string;
  provider_preset: 'gmail' | 'sendgrid' | 'resend' | 'outlook' | 'custom';
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password_encrypted: string;
  sender_email: string;
  sender_name: string;
  reply_to_email: string;
  notification_email: string;
  encryption: 'ssl' | 'tls' | 'none';
  send_booking_confirmation_email: number;
  require_real_email_otp: number;
  otp_expiry_minutes: number;
  email_subject_prefix: string;
  is_configured: number;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_message: string | null;
  updated_at: string;
}

export function listStaffAccountsDb(): StaffAccountDbRow[] {
  const db = getSqliteDb();
  return db
    .prepare('SELECT * FROM staff_accounts ORDER BY created_at ASC, name ASC')
    .all() as unknown as StaffAccountDbRow[];
}

export function upsertStaffAccountDb(row: StaffAccountDbRow): void {
  const db = getSqliteDb();
  db.prepare(`
    INSERT INTO staff_accounts (
      id, name, username, email, phone, password_salt, password_hash,
      role, permissions_json, status, department, last_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      username = excluded.username,
      email = excluded.email,
      phone = excluded.phone,
      password_salt = excluded.password_salt,
      password_hash = excluded.password_hash,
      role = excluded.role,
      permissions_json = excluded.permissions_json,
      status = excluded.status,
      department = excluded.department,
      last_active = excluded.last_active,
      updated_at = excluded.updated_at
  `).run(
    row.id,
    row.name,
    row.username,
    row.email,
    row.phone,
    row.password_salt,
    row.password_hash,
    row.role,
    row.permissions_json,
    row.status,
    row.department,
    row.last_active,
    row.created_at,
    row.updated_at
  );
}

export function deleteStaffAccountDb(id: string): boolean {
  const db = getSqliteDb();
  const info = db.prepare('DELETE FROM staff_accounts WHERE id = ?').run(id);
  return Number(info.changes) > 0;
}

export function getSmtpCredentialDb(): SmtpCredentialDbRow | null {
  const db = getSqliteDb();
  const row = db
    .prepare("SELECT * FROM smtp_credentials WHERE id = 'default' OR id = 'default_smtp' ORDER BY id ASC LIMIT 1")
    .get() as unknown as SmtpCredentialDbRow | undefined;
  return row || null;
}

export function saveSmtpCredentialDb(row: SmtpCredentialDbRow): void {
  const db = getSqliteDb();
  const encPassword = row.smtp_password_encrypted || (row as any).encrypted_password || '';

  const stmt = db.prepare(`
    INSERT INTO smtp_credentials (
      id, provider_preset, smtp_host, smtp_port, smtp_user, smtp_password_encrypted, encrypted_password,
      sender_email, sender_name, reply_to_email, notification_email, encryption,
      send_booking_confirmation_email, require_real_email_otp, otp_expiry_minutes,
      email_subject_prefix, is_configured, last_tested_at, last_test_status, last_test_message, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      provider_preset = excluded.provider_preset,
      smtp_host = excluded.smtp_host,
      smtp_port = excluded.smtp_port,
      smtp_user = excluded.smtp_user,
      smtp_password_encrypted = excluded.smtp_password_encrypted,
      encrypted_password = excluded.encrypted_password,
      sender_email = excluded.sender_email,
      sender_name = excluded.sender_name,
      reply_to_email = excluded.reply_to_email,
      notification_email = excluded.notification_email,
      encryption = excluded.encryption,
      send_booking_confirmation_email = excluded.send_booking_confirmation_email,
      require_real_email_otp = excluded.require_real_email_otp,
      otp_expiry_minutes = excluded.otp_expiry_minutes,
      email_subject_prefix = excluded.email_subject_prefix,
      is_configured = excluded.is_configured,
      last_tested_at = excluded.last_tested_at,
      last_test_status = excluded.last_test_status,
      last_test_message = excluded.last_test_message,
      updated_at = excluded.updated_at
  `);

  const runWithId = (id: string) => {
    stmt.run(
      id,
      row.provider_preset ?? 'gmail',
      row.smtp_host ?? '',
      row.smtp_port ?? 587,
      row.smtp_user ?? '',
      encPassword,
      encPassword,
      row.sender_email ?? '',
      row.sender_name ?? 'Kamal Hotel Reservations',
      row.reply_to_email || '',
      row.notification_email || '',
      row.encryption ?? 'tls',
      row.send_booking_confirmation_email ?? 1,
      row.require_real_email_otp ?? 0,
      row.otp_expiry_minutes ?? 10,
      row.email_subject_prefix ?? '[Kamal Hotel]',
      row.is_configured ?? 0,
      row.last_tested_at ?? null,
      row.last_test_status ?? null,
      row.last_test_message ?? null,
      row.updated_at || new Date().toISOString()
    );
  };

  runWithId(row.id || 'default');
  runWithId('default');
  runWithId('default_smtp');
}

let inSqliteTransaction = false;

export function runInSqliteTransaction<T>(fn: (db: DatabaseSync) => T): T {
  const db = getSqliteDb();
  if (inSqliteTransaction) {
    return fn(db);
  }
  inSqliteTransaction = true;
  db.exec('BEGIN IMMEDIATE');
  try {
    const res = fn(db);
    db.exec('COMMIT');
    return res;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback error
    }
    throw err;
  } finally {
    inSqliteTransaction = false;
  }
}

// ---------- KV Settings ----------

export function getKvSetting<T>(key: string, fallback: T): T {
  const db = getSqliteDb();
  const row = db.prepare('SELECT value_json FROM kv_settings WHERE key = ?').get(key) as
    | { value_json: string }
    | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value_json) as T;
  } catch {
    return fallback;
  }
}

export function setKvSetting<T>(key: string, value: T): T {
  const db = getSqliteDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO kv_settings (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `).run(key, JSON.stringify(value), now);

  if (supabaseAdminClient) {
    void Promise.resolve(
      supabaseAdminClient
        .from('pms_kv_settings')
        .upsert({ key, value, updated_at: now }, { onConflict: 'key' })
    ).catch(() => {});
  }
  return value;
}

// ---------- Collection CRUD ----------

export function listCollection<T>(collection: PmsCollectionName): T[] {
  const db = getSqliteDb();
  if (collection === 'bookings') {
    const rows = db
      .prepare('SELECT data_json FROM bookings_store ORDER BY created_at DESC')
      .all() as { data_json: string }[];
    return rows.map((r) => JSON.parse(r.data_json) as T);
  }
  const rows = db
    .prepare('SELECT data_json FROM pms_records WHERE collection = ? ORDER BY rowid DESC')
    .all(collection) as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json) as T);
}

export function getCollectionItem<T>(collection: PmsCollectionName, id: string): T | null {
  const db = getSqliteDb();
  if (collection === 'bookings') {
    const row = db
      .prepare('SELECT data_json FROM bookings_store WHERE id = ? OR booking_code = ?')
      .get(id, id) as { data_json: string } | undefined;
    return row ? (JSON.parse(row.data_json) as T) : null;
  }
  const row = db
    .prepare('SELECT data_json FROM pms_records WHERE collection = ? AND id = ?')
    .get(collection, id) as { data_json: string } | undefined;
  return row ? (JSON.parse(row.data_json) as T) : null;
}

export function upsertCollectionItem<T extends Record<string, any>>(
  collection: PmsCollectionName,
  id: string,
  item: T
): T {
  const db = getSqliteDb();
  const now = new Date().toISOString();
  if (collection === 'bookings') {
    db.prepare(`
      INSERT INTO bookings_store
        (id, booking_code, idempotency_key, room_type, assigned_room_number, check_in_date, check_out_date, booking_status, payment_status, total_amount, currency, created_at, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        assigned_room_number = excluded.assigned_room_number,
        check_in_date = excluded.check_in_date,
        check_out_date = excluded.check_out_date,
        booking_status = excluded.booking_status,
        payment_status = excluded.payment_status,
        total_amount = excluded.total_amount,
        currency = excluded.currency,
        data_json = excluded.data_json
    `).run(
      item.id || id,
      item.bookingCode,
      item.idempotencyKey || null,
      item.roomType,
      item.assignedRoomNumber || null,
      item.checkInDate,
      item.checkOutDate,
      item.bookingStatus,
      item.paymentStatus,
      Number(item.totalAmount || 0),
      item.currency || 'USD',
      item.createdAt || now,
      JSON.stringify(item)
    );
  } else {
    db.prepare(`
      INSERT INTO pms_records (collection, id, data_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(collection, id) DO UPDATE SET
        data_json = excluded.data_json,
        updated_at = excluded.updated_at
    `).run(collection, id, JSON.stringify(item), now);
  }

  // Non-blocking mirror to Supabase PostgreSQL
  if (supabaseAdminClient) {
    if (collection === 'bookings') {
      void Promise.resolve(
        supabaseAdminClient
          .from('bookings_store')
          .upsert(
            {
              id: item.id || id,
              booking_code: item.bookingCode,
              idempotency_key: item.idempotencyKey || null,
              room_type: item.roomType,
              assigned_room_number: item.assignedRoomNumber || null,
              check_in_date: item.checkInDate,
              check_out_date: item.checkOutDate,
              booking_status: item.bookingStatus,
              payment_status: item.paymentStatus,
              total_amount: Number(item.totalAmount || 0),
              currency: item.currency || 'USD',
              created_at: item.createdAt || now,
              data_json: item,
            },
            { onConflict: 'id' }
          )
      ).catch(() => {});
    } else {
      void Promise.resolve(
        supabaseAdminClient
          .from('pms_records')
          .upsert(
            {
              collection,
              id,
              data_json: item,
              updated_at: now,
            },
            { onConflict: 'collection,id' }
          )
      ).catch(() => {});
    }
  }

  return item;
}

export function deleteCollectionItem(collection: PmsCollectionName, id: string): boolean {
  const db = getSqliteDb();
  let deleted = false;
  if (collection === 'bookings') {
    const info = db.prepare('DELETE FROM bookings_store WHERE id = ?').run(id);
    deleted = Number(info.changes) > 0;
  } else {
    const info = db
      .prepare('DELETE FROM pms_records WHERE collection = ? AND id = ?')
      .run(collection, id);
    deleted = Number(info.changes) > 0;
  }

  if (supabaseAdminClient) {
    if (collection === 'bookings') {
      void Promise.resolve(supabaseAdminClient.from('bookings_store').delete().eq('id', id)).catch(() => {});
    } else {
      void Promise.resolve(supabaseAdminClient.from('pms_records').delete().match({ collection, id })).catch(() => {});
    }
  }

  return deleted;
}

export function allocateNextInvoiceNumber(fiscalYear = '2082/83'): string {
  return runInSqliteTransaction((db) => {
    db.prepare(`
      INSERT INTO invoice_sequences (fiscal_year, last_seq)
      VALUES (?, 1)
      ON CONFLICT(fiscal_year) DO UPDATE SET last_seq = invoice_sequences.last_seq + 1
    `).run(fiscalYear);
    const row = db
      .prepare('SELECT last_seq FROM invoice_sequences WHERE fiscal_year = ?')
      .get(fiscalYear) as { last_seq: number };
    const cleanFy = fiscalYear.replace('/', '');
    return `KH-INV-${cleanFy}-${String(row.last_seq).padStart(5, '0')}`;
  });
}

// ---------- Webhook Deduplication ----------

export function recordWebhookEventIfNew(
  gateway: string,
  eventId: string,
  signatureValid: boolean,
  payload: Record<string, unknown>
): boolean {
  const db = getSqliteDb();
  const info = db
    .prepare(`
      INSERT OR IGNORE INTO webhook_events (gateway, event_id, signature_valid, payload_json, processed_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(gateway, eventId, signatureValid ? 1 : 0, JSON.stringify(payload), new Date().toISOString());
  return Number(info.changes) > 0;
}

// ---------- Persistent Security Tables ----------

export function saveOtpChallenge(record: PersistentOtpRecord): void {
  const db = getSqliteDb();
  const email = record.email.trim().toLowerCase();
  db.prepare(`
    INSERT INTO email_otp_verifications (email, otp_hash, salt, guest_name, expires_at, attempts, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      otp_hash = excluded.otp_hash,
      salt = excluded.salt,
      guest_name = excluded.guest_name,
      expires_at = excluded.expires_at,
      attempts = excluded.attempts,
      created_at = excluded.created_at
  `).run(email, record.otpHash, record.salt, record.guestName || null, record.expiresAt, record.attempts, new Date().toISOString());
}

export function getOtpChallenge(email: string): PersistentOtpRecord | null {
  const db = getSqliteDb();
  const row = db
    .prepare('SELECT * FROM email_otp_verifications WHERE email = ?')
    .get(email.trim().toLowerCase()) as
    | {
        email: string;
        otp_hash: string;
        salt: string;
        guest_name: string | null;
        expires_at: number;
        attempts: number;
      }
    | undefined;
  if (!row) return null;
  return {
    email: row.email,
    otpHash: row.otp_hash,
    salt: row.salt,
    guestName: row.guest_name || undefined,
    expiresAt: row.expires_at,
    attempts: row.attempts,
  };
}

export function incrementOtpAttempts(email: string): number {
  const db = getSqliteDb();
  db.prepare('UPDATE email_otp_verifications SET attempts = attempts + 1 WHERE email = ?').run(
    email.trim().toLowerCase()
  );
  const rec = getOtpChallenge(email);
  return rec?.attempts || 0;
}

export function deleteOtpChallenge(email: string): void {
  const db = getSqliteDb();
  db.prepare('DELETE FROM email_otp_verifications WHERE email = ?').run(email.trim().toLowerCase());
}

export function revokeSessionTokenIdPersistent(jti: string, expSeconds?: number): void {
  if (!jti) return;
  const db = getSqliteDb();
  const expiresAtMs = expSeconds ? expSeconds * 1000 : Date.now() + 24 * 60 * 60 * 1000;
  db.prepare(`
    INSERT INTO revoked_sessions (jti, expires_at, revoked_at)
    VALUES (?, ?, ?)
    ON CONFLICT(jti) DO UPDATE SET expires_at = excluded.expires_at, revoked_at = excluded.revoked_at
  `).run(jti, expiresAtMs, new Date().toISOString());
}

export function isSessionTokenRevokedPersistent(jti: string): boolean {
  if (!jti) return false;
  const db = getSqliteDb();
  db.prepare('DELETE FROM revoked_sessions WHERE expires_at < ?').run(Date.now());
  const row = db.prepare('SELECT jti FROM revoked_sessions WHERE jti = ?').get(jti) as
    | { jti: string }
    | undefined;
  return Boolean(row);
}

export function checkAndIncrementRateLimit(
  bucketKey: string,
  windowMs: number,
  maxRequests: number
): { allowed: boolean; count: number; retryAfterSeconds: number } {
  const db = getSqliteDb();
  const now = Date.now();
  return runInSqliteTransaction(() => {
    const existing = db
      .prepare('SELECT hit_count, reset_at FROM rate_limits WHERE bucket_key = ?')
      .get(bucketKey) as { hit_count: number; reset_at: number } | undefined;

    if (!existing || existing.reset_at <= now) {
      const resetAt = now + windowMs;
      db.prepare(`
        INSERT INTO rate_limits (bucket_key, hit_count, reset_at)
        VALUES (?, 1, ?)
        ON CONFLICT(bucket_key) DO UPDATE SET hit_count = 1, reset_at = excluded.reset_at
      `).run(bucketKey, resetAt);
      return { allowed: true, count: 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
    }

    const nextCount = existing.hit_count + 1;
    db.prepare('UPDATE rate_limits SET hit_count = ? WHERE bucket_key = ?').run(nextCount, bucketKey);
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.reset_at - now) / 1000));
    return {
      allowed: nextCount <= maxRequests,
      count: nextCount,
      retryAfterSeconds,
    };
  });
}

// ---------- Persistent Notification Job Queue ----------

export function enqueueNotificationJob(job: Omit<PersistentNotificationJob, 'status' | 'attempts' | 'createdAt' | 'nextRunAt'> & { nextRunAt?: number }): PersistentNotificationJob {
  const db = getSqliteDb();
  const createdAt = new Date().toISOString();
  const full: PersistentNotificationJob = {
    ...job,
    status: 'queued',
    attempts: 0,
    nextRunAt: job.nextRunAt ?? Date.now(),
    createdAt,
  };
  db.prepare(`
    INSERT INTO notification_jobs (id, channel, recipient, subject, body, html_body, template_name, payload_json, status, attempts, max_attempts, next_run_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
  `).run(
    full.id,
    full.channel,
    full.recipient,
    full.subject || null,
    full.body,
    full.htmlBody || null,
    full.templateName || null,
    JSON.stringify(full.payload || {}),
    full.status,
    full.maxAttempts,
    full.nextRunAt,
    createdAt
  );
  return full;
}

export function listDueNotificationJobs(limit = 10): PersistentNotificationJob[] {
  const db = getSqliteDb();
  const rows = db
    .prepare(`
      SELECT * FROM notification_jobs
       WHERE status = 'queued' AND next_run_at <= ?
       ORDER BY next_run_at ASC
       LIMIT ?
    `)
    .all(Date.now(), limit) as any[];
  return rows.map((r) => ({
    id: r.id,
    channel: r.channel,
    recipient: r.recipient,
    subject: r.subject || undefined,
    body: r.body,
    htmlBody: r.html_body || undefined,
    templateName: r.template_name || undefined,
    payload: JSON.parse(r.payload_json || '{}'),
    status: r.status,
    attempts: r.attempts,
    maxAttempts: r.max_attempts,
    nextRunAt: r.next_run_at,
    lastError: r.last_error || undefined,
    sentAt: r.sent_at || undefined,
    createdAt: r.created_at,
  }));
}

export function updateNotificationJobStatus(
  id: string,
  updates: { status: PersistentNotificationJob['status']; attempts: number; nextRunAt?: number; lastError?: string; sentAt?: string }
): void {
  const db = getSqliteDb();
  db.prepare(`
    UPDATE notification_jobs
       SET status = ?, attempts = ?, next_run_at = COALESCE(?, next_run_at), last_error = ?, sent_at = COALESCE(?, sent_at)
     WHERE id = ?
  `).run(updates.status, updates.attempts, updates.nextRunAt ?? null, updates.lastError || null, updates.sentAt ?? null, id);
}

export function listNotificationJobs(limit = 50): PersistentNotificationJob[] {
  const db = getSqliteDb();
  const rows = db
    .prepare('SELECT * FROM notification_jobs ORDER BY created_at DESC LIMIT ?')
    .all(limit) as any[];
  return rows.map((r) => ({
    id: r.id,
    channel: r.channel,
    recipient: r.recipient,
    subject: r.subject || undefined,
    body: r.body,
    htmlBody: r.html_body || undefined,
    templateName: r.template_name || undefined,
    payload: JSON.parse(r.payload_json || '{}'),
    status: r.status,
    attempts: r.attempts,
    maxAttempts: r.max_attempts,
    nextRunAt: r.next_run_at,
    lastError: r.last_error || undefined,
    sentAt: r.sent_at || undefined,
    createdAt: r.created_at,
  }));
}

// ---------- Full Snapshot Export / Restore (Backups) ----------

export function exportFullDatabaseSnapshot(): {
  exportedAt: string;
  version: number;
  kvSettings: Record<string, unknown>;
  collections: Record<string, unknown[]>;
  invoiceSequences: Record<string, number>;
} {
  const db = getSqliteDb();
  const kvRows = db.prepare('SELECT key, value_json FROM kv_settings').all() as {
    key: string;
    value_json: string;
  }[];
  const kvSettings: Record<string, unknown> = {};
  for (const r of kvRows) {
    kvSettings[r.key] = JSON.parse(r.value_json);
  }

  const seqRows = db.prepare('SELECT fiscal_year, last_seq FROM invoice_sequences').all() as {
    fiscal_year: string;
    last_seq: number;
  }[];
  const invoiceSequences: Record<string, number> = {};
  for (const s of seqRows) {
    invoiceSequences[s.fiscal_year] = s.last_seq;
  }

  const recRows = db.prepare('SELECT collection, id, data_json FROM pms_records').all() as {
    collection: string;
    id: string;
    data_json: string;
  }[];
  const collections: Record<string, unknown[]> = {};
  for (const r of recRows) {
    if (!collections[r.collection]) collections[r.collection] = [];
    collections[r.collection].push(JSON.parse(r.data_json));
  }
  collections.bookings = listCollection('bookings');

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    kvSettings,
    collections,
    invoiceSequences,
  };
}

export function restoreDatabaseSnapshot(snapshot: {
  kvSettings: Record<string, unknown>;
  collections: Record<string, any[]>;
  invoiceSequences?: Record<string, number>;
}): { restoredRecords: number } {
  let count = 0;
  const now = new Date().toISOString();
  runInSqliteTransaction((db) => {
    db.prepare('DELETE FROM pms_records').run();
    db.prepare('DELETE FROM bookings_store').run();
    db.prepare('DELETE FROM kv_settings').run();
    db.prepare('DELETE FROM invoice_sequences').run();

    const insertKv = db.prepare(
      'INSERT INTO kv_settings (key, value_json, updated_at) VALUES (?, ?, ?)'
    );
    for (const [k, v] of Object.entries(snapshot.kvSettings || {})) {
      insertKv.run(k, JSON.stringify(v), now);
      count++;
    }

    const insertSeq = db.prepare(
      'INSERT INTO invoice_sequences (fiscal_year, last_seq) VALUES (?, ?)'
    );
    for (const [fy, seq] of Object.entries(snapshot.invoiceSequences || {})) {
      insertSeq.run(fy, seq);
    }

    const insertRec = db.prepare(
      'INSERT INTO pms_records (collection, id, data_json, updated_at) VALUES (?, ?, ?, ?)'
    );
    const insertBooking = db.prepare(`
      INSERT INTO bookings_store
        (id, booking_code, idempotency_key, room_type, assigned_room_number, check_in_date, check_out_date, booking_status, payment_status, total_amount, currency, created_at, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const [collection, items] of Object.entries(snapshot.collections || {})) {
      if (!Array.isArray(items)) continue;
      items.forEach((item, idx) => {
        if (collection === 'bookings') {
          insertBooking.run(
            item.id || `bk-${idx + 1}`,
            item.bookingCode,
            item.idempotencyKey || null,
            item.roomType,
            item.assignedRoomNumber || null,
            item.checkInDate,
            item.checkOutDate,
            item.bookingStatus,
            item.paymentStatus,
            Number(item.totalAmount || 0),
            item.currency || 'USD',
            item.createdAt || now,
            JSON.stringify(item)
          );
        } else {
          const id = String(item.id || item.roomNumber || `${collection}-${idx + 1}`);
          insertRec.run(collection, id, JSON.stringify(item), now);
        }
        count++;
      });
    }
  });
  return { restoredRecords: count };
}
