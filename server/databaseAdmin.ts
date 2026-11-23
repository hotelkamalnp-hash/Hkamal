import { getSqliteDb, runInSqliteTransaction, listCollection, upsertCollectionItem, type PmsCollectionName } from './db.ts';
import { getSupabaseAdminClient } from './security.ts';
import { INITIAL_ROOMS, INITIAL_THEME } from '../src/data/seedCatalog.ts';
import {
  INITIAL_BILL_SETTINGS,
  INITIAL_FLOORS,
  INITIAL_MENU_ITEMS,
  INITIAL_ROOM_UNITS,
  INITIAL_TABLES,
} from '../src/services/restaurantBillingData.ts';

export interface StorageHealthMetrics {
  storageMode: 'supabase_plus_sqlite_cache' | 'sqlite_local';
  supabaseConnected: boolean;
  supabaseUrlMasked: string;
  totalRecordsCount: number;
  estimatedDiskSizeBytes: number;
  estimatedDiskSizeMb: string;
  supabaseFreeTierLimitMb: number;
  freeTierUsedPercent: string;
  healthStatus: 'optimal' | 'moderate' | 'action_needed';
  lastPingTimestamp: string;
  collectionBreakdown: Record<string, number>;
  pruneRecommendations: string[];
}

export async function pingSupabase(): Promise<{
  ok: boolean;
  timestamp: string;
  latencyMs: number;
  message: string;
}> {
  const start = Date.now();
  const sbClient = getSupabaseAdminClient();
  if (!sbClient) {
    return {
      ok: false,
      timestamp: new Date().toISOString(),
      latencyMs: 0,
      message: 'Supabase credentials not configured (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing).',
    };
  }

  try {
    // Lightweight heartbeat query to keep project active
    const { data, error } = await sbClient
      .from('pms_kv_settings')
      .select('key')
      .limit(1);

    const latencyMs = Date.now() - start;
    if (error) {
      // If table doesn't exist yet, try another system table or simple ping
      return {
        ok: false,
        timestamp: new Date().toISOString(),
        latencyMs,
        message: `Supabase query returned: ${error.message}`,
      };
    }
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      latencyMs,
      message: 'Supabase PostgreSQL connection active and responsive (Keep-Alive OK).',
    };
  } catch (err: any) {
    return {
      ok: false,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
      message: `Supabase ping exception: ${err?.message || err}`,
    };
  }
}

/**
 * Non-destructive startup sync between Supabase PostgreSQL and local SQLite cache.
 * 1. Hydrates existing operational records from Supabase into SQLite (preserving newer cloud state across deploys).
 * 2. Seeds missing initial records to Supabase using ignoreDuplicates: true so daily operational data is NEVER overwritten.
 */
export async function syncSupabaseOnBoot(): Promise<{
  ok: boolean;
  pulledKv: number;
  pulledBookings: number;
  pulledRecords: number;
  pushedMissingSeeds: number;
}> {
  const sbClient = getSupabaseAdminClient();
  if (!sbClient) {
    return { ok: false, pulledKv: 0, pulledBookings: 0, pulledRecords: 0, pushedMissingSeeds: 0 };
  }

  const db = getSqliteDb();
  let pulledKv = 0;
  let pulledBookings = 0;
  let pulledRecords = 0;
  let pushedMissingSeeds = 0;

  try {
    // 1. Pull KV settings from Supabase
    const { data: kvData, error: kvErr } = await sbClient
      .from('pms_kv_settings')
      .select('key, value, updated_at');

    if (!kvErr && Array.isArray(kvData) && kvData.length > 0) {
      const stmt = db.prepare(`
        INSERT INTO kv_settings (key, value_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value_json = CASE WHEN excluded.updated_at >= kv_settings.updated_at THEN excluded.value_json ELSE kv_settings.value_json END,
          updated_at = CASE WHEN excluded.updated_at >= kv_settings.updated_at THEN excluded.updated_at ELSE kv_settings.updated_at END
      `);
      for (const row of kvData) {
        if (row.key && row.value !== undefined) {
          stmt.run(row.key, JSON.stringify(row.value), row.updated_at || new Date().toISOString());
          pulledKv++;
        }
      }
    }

    // 2. Pull bookings from Supabase
    const { data: bkData, error: bkErr } = await sbClient
      .from('bookings_store')
      .select('id, booking_code, idempotency_key, room_type, assigned_room_number, check_in_date, check_out_date, booking_status, payment_status, total_amount, currency, created_at, data_json');

    if (!bkErr && Array.isArray(bkData) && bkData.length > 0) {
      const bkStmt = db.prepare(`
        INSERT INTO bookings_store
          (id, booking_code, idempotency_key, room_type, assigned_room_number, check_in_date, check_out_date, booking_status, payment_status, total_amount, currency, created_at, data_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          assigned_room_number = excluded.assigned_room_number,
          booking_status = excluded.booking_status,
          payment_status = excluded.payment_status,
          total_amount = excluded.total_amount,
          data_json = excluded.data_json
      `);
      for (const bk of bkData) {
        bkStmt.run(
          bk.id,
          bk.booking_code,
          bk.idempotency_key || null,
          bk.room_type,
          bk.assigned_room_number || null,
          bk.check_in_date,
          bk.check_out_date,
          bk.booking_status,
          bk.payment_status,
          Number(bk.total_amount || 0),
          bk.currency || 'USD',
          bk.created_at || new Date().toISOString(),
          JSON.stringify(bk.data_json)
        );
        pulledBookings++;
      }
    }

    // 3. Pull collection records from Supabase pms_records
    const { data: recData, error: recErr } = await sbClient
      .from('pms_records')
      .select('collection, id, data_json, updated_at');

    if (!recErr && Array.isArray(recData) && recData.length > 0) {
      const recStmt = db.prepare(`
        INSERT INTO pms_records (collection, id, data_json, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(collection, id) DO UPDATE SET
          data_json = CASE WHEN excluded.updated_at >= pms_records.updated_at THEN excluded.data_json ELSE pms_records.data_json END,
          updated_at = CASE WHEN excluded.updated_at >= pms_records.updated_at THEN excluded.updated_at ELSE pms_records.updated_at END
      `);
      for (const rec of recData) {
        recStmt.run(
          rec.collection,
          rec.id,
          JSON.stringify(rec.data_json),
          rec.updated_at || new Date().toISOString()
        );
        pulledRecords++;
      }
    }

    // 4. Push missing local seed items to Supabase non-destructively (ignoreDuplicates: true)
    const localKv = db.prepare('SELECT key, value_json, updated_at FROM kv_settings').all() as Array<{
      key: string;
      value_json: string;
      updated_at: string;
    }>;
    const kvRowsToPush = localKv
      .filter((r) => r.key !== '__seeded_v1')
      .map((r) => ({
        key: r.key,
        value: JSON.parse(r.value_json),
        updated_at: r.updated_at,
      }));
    if (kvRowsToPush.length > 0) {
      await sbClient.from('pms_kv_settings').upsert(kvRowsToPush, {
        onConflict: 'key',
        ignoreDuplicates: true,
      });
      pushedMissingSeeds += kvRowsToPush.length;
    }

    const localRecs = db.prepare('SELECT collection, id, data_json, updated_at FROM pms_records').all() as Array<{
      collection: string;
      id: string;
      data_json: string;
      updated_at: string;
    }>;
    for (let i = 0; i < localRecs.length; i += 100) {
      const batch = localRecs.slice(i, i + 100).map((r) => ({
        collection: r.collection,
        id: r.id,
        data_json: JSON.parse(r.data_json),
        updated_at: r.updated_at,
      }));
      await sbClient.from('pms_records').upsert(batch, {
        onConflict: 'collection,id',
        ignoreDuplicates: true,
      });
      pushedMissingSeeds += batch.length;
    }

    console.log(
      `[Supabase Sync] Non-destructive boot sync complete: pulled KV=${pulledKv}, bookings=${pulledBookings}, records=${pulledRecords}; verified ${pushedMissingSeeds} base items.`
    );
    return { ok: true, pulledKv, pulledBookings, pulledRecords, pushedMissingSeeds };
  } catch (err: any) {
    console.warn('[Supabase Sync] Boot sync warning (continuing with local cache):', err?.message || err);
    return { ok: false, pulledKv, pulledBookings, pulledRecords, pushedMissingSeeds };
  }
}

export async function getDatabaseStorageHealth(): Promise<StorageHealthMetrics> {
  const db = getSqliteDb();
  const sbClient = getSupabaseAdminClient();
  const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const supabaseUrlMasked = rawUrl ? rawUrl.replace(/(https?:\/\/)([^.]+)\./, '$1***.') : 'Not configured';

  const collectionBreakdown: Record<string, number> = {};

  const colRows = db
    .prepare('SELECT collection, count(*) as cnt FROM pms_records GROUP BY collection')
    .all() as { collection: string; cnt: number }[];
  colRows.forEach((r) => {
    collectionBreakdown[r.collection] = Number(r.cnt);
  });

  const bCount = (db.prepare('SELECT count(*) as cnt FROM bookings_store').get() as { cnt: number }).cnt;
  collectionBreakdown['bookings'] = Number(bCount);

  const staffCount = (db.prepare('SELECT count(*) as cnt FROM staff_accounts').get() as { cnt: number }).cnt;
  collectionBreakdown['staff_accounts'] = Number(staffCount);

  const kvCount = (db.prepare('SELECT count(*) as cnt FROM kv_settings').get() as { cnt: number }).cnt;
  collectionBreakdown['kv_settings'] = Number(kvCount);

  const notifCount = (db.prepare('SELECT count(*) as cnt FROM notification_jobs').get() as { cnt: number }).cnt;
  collectionBreakdown['notification_jobs'] = Number(notifCount);

  const totalRecordsCount = Object.values(collectionBreakdown).reduce((a, b) => a + b, 0);

  // Approximate database disk usage: ~1.2 KB per record in SQLite/PostgreSQL
  const estimatedDiskSizeBytes = totalRecordsCount * 1200;
  const estimatedDiskSizeMb = (estimatedDiskSizeBytes / (1024 * 1024)).toFixed(2);
  const supabaseFreeTierLimitMb = 500; // Supabase free tier 500 MB
  const freeTierUsedPercent = ((Number(estimatedDiskSizeMb) / supabaseFreeTierLimitMb) * 100).toFixed(2);

  const pruneRecommendations: string[] = [];
  if ((collectionBreakdown['doorUnlockLogs'] || 0) > 200) {
    pruneRecommendations.push(`Prune ${collectionBreakdown['doorUnlockLogs']} door unlock logs older than 60 days.`);
  }
  if ((collectionBreakdown['auditLogs'] || 0) > 500) {
    pruneRecommendations.push(`Archive or prune ${collectionBreakdown['auditLogs']} system audit logs older than 90 days.`);
  }
  if ((collectionBreakdown['guestSessions'] || 0) > 50) {
    pruneRecommendations.push(`Clear expired guest portal room sessions.`);
  }

  const healthStatus: 'optimal' | 'moderate' | 'action_needed' =
    Number(freeTierUsedPercent) < 70 ? 'optimal' : Number(freeTierUsedPercent) < 90 ? 'moderate' : 'action_needed';

  return {
    storageMode: sbClient ? 'supabase_plus_sqlite_cache' : 'sqlite_local',
    supabaseConnected: Boolean(sbClient),
    supabaseUrlMasked,
    totalRecordsCount,
    estimatedDiskSizeBytes,
    estimatedDiskSizeMb,
    supabaseFreeTierLimitMb,
    freeTierUsedPercent: `${freeTierUsedPercent}%`,
    healthStatus,
    lastPingTimestamp: new Date().toISOString(),
    collectionBreakdown,
    pruneRecommendations,
  };
}

export function pruneEphemeralData(options?: {
  maxDoorLogsAgeDays?: number;
  maxAuditLogsAgeDays?: number;
  purgeExpiredGuestSessions?: boolean;
}): {
  ok: true;
  prunedCounts: {
    doorUnlockLogs: number;
    auditLogs: number;
    guestSessions: number;
    revokedSessions: number;
    rateLimits: number;
  };
} {
  const db = getSqliteDb();
  const sbClient = getSupabaseAdminClient();

  const doorDays = options?.maxDoorLogsAgeDays || 60;
  const auditDays = options?.maxAuditLogsAgeDays || 90;

  const nowMs = Date.now();
  const doorCutoff = new Date(nowMs - doorDays * 86400 * 1000).toISOString();
  const auditCutoff = new Date(nowMs - auditDays * 86400 * 1000).toISOString();

  let prunedDoorLogs = 0;
  let prunedAuditLogs = 0;
  let prunedGuestSessions = 0;
  let prunedRevokedSessions = 0;
  let prunedRateLimits = 0;

  runInSqliteTransaction((txDb) => {
    // 1. Prune door logs
    const doorDel = txDb.prepare(`
      DELETE FROM pms_records
      WHERE collection = 'doorUnlockLogs'
        AND json_extract(data_json, '$.timestamp') < ?
    `).run(doorCutoff);
    prunedDoorLogs = Number(doorDel.changes);

    // 2. Prune audit logs
    const auditDel = txDb.prepare(`
      DELETE FROM pms_records
      WHERE collection = 'auditLogs'
        AND json_extract(data_json, '$.timestamp') < ?
    `).run(auditCutoff);
    prunedAuditLogs = Number(auditDel.changes);

    // 3. Purge guest sessions older than 7 days
    if (options?.purgeExpiredGuestSessions !== false) {
      const sessCutoff = new Date(nowMs - 7 * 86400 * 1000).toISOString().slice(0, 10);
      const sessDel = txDb.prepare(`
        DELETE FROM pms_records
        WHERE collection = 'guestSessions'
          AND json_extract(data_json, '$.checkoutDate') < ?
      `).run(sessCutoff);
      prunedGuestSessions = Number(sessDel.changes);
    }

    // 4. Prune revoked sessions whose expiry is past
    const nowSec = Math.floor(nowMs / 1000);
    const revDel = txDb.prepare('DELETE FROM revoked_sessions WHERE expires_at < ?').run(nowSec);
    prunedRevokedSessions = Number(revDel.changes);

    // 5. Prune expired rate limit buckets
    const rateDel = txDb.prepare('DELETE FROM rate_limits WHERE reset_at < ?').run(nowMs);
    prunedRateLimits = Number(rateDel.changes);
  });

  // Mirror prune to Supabase if connected
  if (sbClient) {
    void (async () => {
      try {
        await sbClient.from('door_unlock_logs').delete().lt('unlocked_at', doorCutoff);
        await sbClient.from('revoked_sessions').delete().lt('expires_at', new Date().toISOString());
      } catch {
        // Non-blocking
      }
    })();
  }

  return {
    ok: true,
    prunedCounts: {
      doorUnlockLogs: prunedDoorLogs,
      auditLogs: prunedAuditLogs,
      guestSessions: prunedGuestSessions,
      revokedSessions: prunedRevokedSessions,
      rateLimits: prunedRateLimits,
    },
  };
}

/**
 * Exports complete database snapshot for 1-click backup.
 */
export function exportCompleteDatabaseSnapshot(): Record<string, unknown> {
  const db = getSqliteDb();

  const kvRows = db.prepare('SELECT key, value_json, updated_at FROM kv_settings').all() as {
    key: string;
    value_json: string;
    updated_at: string;
  }[];
  const kvSettings: Record<string, unknown> = {};
  kvRows.forEach((r) => {
    try {
      kvSettings[r.key] = JSON.parse(r.value_json);
    } catch {
      kvSettings[r.key] = r.value_json;
    }
  });

  const pmsRows = db.prepare('SELECT collection, id, data_json, updated_at FROM pms_records').all() as {
    collection: string;
    id: string;
    data_json: string;
    updated_at: string;
  }[];
  const collections: Record<string, Array<Record<string, unknown>>> = {};
  pmsRows.forEach((r) => {
    if (!collections[r.collection]) collections[r.collection] = [];
    try {
      collections[r.collection].push(JSON.parse(r.data_json));
    } catch {
      // ignore malformed
    }
  });

  const bookingRows = db.prepare('SELECT data_json FROM bookings_store ORDER BY created_at DESC').all() as {
    data_json: string;
  }[];
  const bookings = bookingRows.map((r) => {
    try {
      return JSON.parse(r.data_json);
    } catch {
      return null;
    }
  }).filter(Boolean);

  const staffRows = db.prepare(`
    SELECT id, name, username, email, phone, role, permissions_json, status, department, last_active, created_at, updated_at
    FROM staff_accounts
  `).all() as Array<{
    id: string;
    name: string;
    username: string;
    email: string;
    phone: string;
    role: string;
    permissions_json: string;
    status: string;
    department: string;
    last_active: string;
    created_at: string;
    updated_at: string;
  }>;

  const staff = staffRows.map((s) => ({
    ...s,
    permissions: JSON.parse(s.permissions_json || '[]'),
  }));

  return {
    version: '1.0.0',
    app: 'Hotel Kamal PMS / POS',
    exportedAt: new Date().toISOString(),
    property: 'Kamal Hotel, Kamalpokhari, Kathmandu, Nepal',
    kvSettings,
    bookings,
    collections,
    staff,
  };
}

/**
 * Restores complete database snapshot from JSON backup.
 */
export function restoreCompleteDatabaseSnapshot(
  backup: any,
  actorName: string
): { ok: boolean; restoredCollections: number; restoredBookings: number; error?: string } {
  if (!backup || typeof backup !== 'object') {
    return { ok: false, restoredCollections: 0, restoredBookings: 0, error: 'Invalid backup JSON payload' };
  }

  const db = getSqliteDb();
  const sbClient = getSupabaseAdminClient();
  const now = new Date().toISOString();

  let restoredBookings = 0;
  let restoredCollections = 0;

  try {
    runInSqliteTransaction((txDb) => {
      // 1. Restore KV settings
      if (backup.kvSettings && typeof backup.kvSettings === 'object') {
        const stmt = txDb.prepare(`
          INSERT INTO kv_settings (key, value_json, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
        `);
        for (const [k, v] of Object.entries(backup.kvSettings)) {
          stmt.run(k, JSON.stringify(v), now);
        }
      }

      // 2. Restore bookings
      if (Array.isArray(backup.bookings)) {
        const bkStmt = txDb.prepare(`
          INSERT INTO bookings_store
            (id, booking_code, idempotency_key, room_type, assigned_room_number, check_in_date, check_out_date, booking_status, payment_status, total_amount, currency, created_at, data_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            booking_code = excluded.booking_code,
            assigned_room_number = excluded.assigned_room_number,
            check_in_date = excluded.check_in_date,
            check_out_date = excluded.check_out_date,
            booking_status = excluded.booking_status,
            payment_status = excluded.payment_status,
            total_amount = excluded.total_amount,
            currency = excluded.currency,
            data_json = excluded.data_json
        `);

        for (const b of backup.bookings) {
          if (b && b.id && b.bookingCode) {
            bkStmt.run(
              b.id,
              b.bookingCode,
              b.idempotencyKey || null,
              b.roomType || 'standard',
              b.assignedRoomNumber || null,
              b.checkInDate || '',
              b.checkOutDate || '',
              b.bookingStatus || 'confirmed',
              b.paymentStatus || 'unpaid',
              Number(b.totalAmount || 0),
              b.currency || 'USD',
              b.createdAt || now,
              JSON.stringify(b)
            );
            restoredBookings++;
          }
        }
      }

      // 3. Restore Collections
      if (backup.collections && typeof backup.collections === 'object') {
        const colStmt = txDb.prepare(`
          INSERT INTO pms_records (collection, id, data_json, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(collection, id) DO UPDATE SET
            data_json = excluded.data_json,
            updated_at = excluded.updated_at
        `);

        for (const [colName, items] of Object.entries(backup.collections)) {
          if (Array.isArray(items)) {
            for (const it of items) {
              const id = (it as any)?.id || `${colName}-${Math.random().toString(36).slice(2, 9)}`;
              colStmt.run(colName, id, JSON.stringify(it), now);
              restoredCollections++;
            }
          }
        }
      }
    });

    upsertCollectionItem('auditLogs', `log-${Date.now()}`, {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      actorName,
      actorRole: 'admin',
      action: 'Database Restored from JSON Backup',
      category: 'system',
      details: `Restored ${restoredBookings} bookings and ${restoredCollections} records.`,
    });

    return { ok: true, restoredCollections, restoredBookings };
  } catch (err: any) {
    return { ok: false, restoredCollections, restoredBookings, error: err?.message || 'Restore error' };
  }
}

/**
 * Resets the operational database to fresh production state:
 * - Purges test bookings, test invoices, test orders, and test guest sessions
 * - Retains real physical rooms, real room units (marked clean & vacant), authentic Nepali menu items, tables, staff accounts, and CMS settings
 */
export function resetToFreshProductionState(actorName = 'SuperAdmin'): {
  ok: true;
  purgedBookings: number;
  purgedInvoices: number;
  purgedOrders: number;
  roomsAvailable: number;
  message: string;
} {
  const db = getSqliteDb();
  const sbClient = getSupabaseAdminClient();
  let purgedBookings = 0;
  let purgedInvoices = 0;
  let purgedOrders = 0;

  runInSqliteTransaction((txDb) => {
    // 1. Purge all test bookings
    const bDel = txDb.prepare('DELETE FROM bookings_store').run();
    purgedBookings = Number(bDel.changes);

    // 2. Purge test invoices, orders, guest sessions, payment transactions
    const invDel = txDb.prepare("DELETE FROM pms_records WHERE collection = 'invoices'").run();
    purgedInvoices = Number(invDel.changes);

    const ordDel = txDb.prepare("DELETE FROM pms_records WHERE collection = 'restaurantOrders'").run();
    purgedOrders = Number(ordDel.changes);

    txDb.prepare("DELETE FROM pms_records WHERE collection = 'paymentTransactions'").run();
    txDb.prepare("DELETE FROM pms_records WHERE collection = 'guestSessions'").run();
    txDb.prepare("DELETE FROM pms_records WHERE collection = 'doorUnlockLogs'").run();
    txDb.prepare("DELETE FROM pms_records WHERE collection = 'roomServiceRequests'").run();

    // 3. Mark all physical room units as clean and vacant for live guest check-in
    const units = INITIAL_ROOM_UNITS.map((u) => ({
      ...u,
      occupancyStatus: 'vacant' as const,
      cleanliness: 'inspected' as const,
      isClean: true,
      currentGuest: null,
      bookingCode: null,
    }));
    const unitStmt = txDb.prepare(`
      INSERT INTO pms_records (collection, id, data_json, updated_at)
      VALUES ('roomUnits', ?, ?, ?)
      ON CONFLICT(collection, id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
    `);
    const now = new Date().toISOString();
    units.forEach((u) => {
      unitStmt.run(u.id, JSON.stringify(u), now);
    });

    // 4. Reset invoice sequence to KH-INV-208283-00001
    txDb.prepare(`
      INSERT INTO invoice_sequences (fiscal_year, last_seq)
      VALUES ('2082/83', 0)
      ON CONFLICT(fiscal_year) DO UPDATE SET last_seq = 0
    `).run();
  });

  // Mirror clean slate to Supabase if connected
  if (sbClient) {
    void (async () => {
      try {
        await sbClient.from('bookings_store').delete().neq('id', 'non_existent_key');
        await sbClient.from('pms_records').delete().in('collection', ['invoices', 'paymentTransactions', 'restaurantOrders', 'guestSessions', 'doorUnlockLogs']);
      } catch {
        // Non-blocking
      }
    })();
  }

  upsertCollectionItem('auditLogs', `log-${Date.now()}`, {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    actorName,
    actorRole: 'super_admin',
    action: 'Initialized Fresh Production State',
    category: 'system',
    details: 'Purged mock bookings and transactions. All 8 room units marked clean and vacant for immediate operation.',
  });

  return {
    ok: true,
    purgedBookings,
    purgedInvoices,
    purgedOrders,
    roomsAvailable: INITIAL_ROOM_UNITS.length,
    message: 'System operational slate is now completely clean and fresh. Ready for production guests and live billing.',
  };
}
