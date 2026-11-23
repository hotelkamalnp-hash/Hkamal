import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { StaffRole } from '../src/types/hotel';
import { getPermissionsForRole, isValidStaffRole } from './rbac.ts';
import {
  checkAndIncrementRateLimit,
  deleteStaffAccountDb,
  getKvSetting,
  getSmtpCredentialDb,
  isSessionTokenRevokedPersistent,
  listStaffAccountsDb,
  revokeSessionTokenIdPersistent,
  saveSmtpCredentialDb,
  setKvSetting,
  setSupabaseAdminForDb,
  upsertStaffAccountDb,
} from './db.ts';

export const SESSION_COOKIE_NAME = 'kamal_auth_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours
const EMAIL_VERIFICATION_TOKEN_TTL_SECONDS = 30 * 60; // 30 minutes
const LEGACY_SMTP_SECRETS_FILE = path.resolve(process.cwd(), '.kamal-smtp-secrets.enc.json');
const LEGACY_LOCAL_STAFF_STORE_FILE = path.resolve(process.cwd(), '.kamal-staff-auth.json');

export interface AuthenticatedStaffUser {
  id: string;
  authUserId?: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: StaffRole;
  permissions: string[];
  status: 'active' | 'on-leave' | 'inactive';
  department: string;
  lastActive: string;
  authSource: 'supabase' | 'server_jwt';
}

interface StoredLocalStaffRecord {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  passwordSalt: string;
  passwordHash: string;
  role: StaffRole;
  permissions: string[];
  status: 'active' | 'on-leave' | 'inactive';
  department: string;
  lastActive: string;
}

export interface ServerSmtpSettings {
  providerPreset: 'gmail' | 'sendgrid' | 'resend' | 'outlook' | 'custom';
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  senderEmail: string;
  senderName: string;
  replyToEmail: string;
  notificationEmail: string;
  encryption: 'ssl' | 'tls' | 'none';
  sendBookingConfirmationEmail: boolean;
  requireRealEmailOtp: boolean;
  otpExpiryMinutes: number;
  emailSubjectPrefix: string;
  isConfigured: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed';
  lastTestMessage?: string;
}

export interface RedactedSmtpSettings {
  providerPreset: 'gmail' | 'sendgrid' | 'resend' | 'outlook' | 'custom';
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  hasStoredPassword: boolean;
  senderEmail: string;
  senderName: string;
  replyToEmail: string;
  notificationEmail: string;
  encryption: 'ssl' | 'tls' | 'none';
  sendBookingConfirmationEmail: boolean;
  requireRealEmailOtp: boolean;
  otpExpiryMinutes: number;
  emailSubjectPrefix: string;
  isConfigured: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed';
  lastTestMessage?: string;
}

export interface SessionTokenPayload {
  sub: string;
  jti: string;
  username: string;
  email: string;
  name: string;
  role: StaffRole;
  department: string;
  authSource: 'supabase' | 'server_jwt';
  supabaseAccessToken?: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedStaffUser;
  authTokenPayload?: SessionTokenPayload;
}

let cachedPersistedDevSecret: string | null = null;

export function getSigningSecret(): string {
  const configured = (
    process.env.AUTH_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    ''
  ).trim();
  if (configured.length >= 16) {
    return configured;
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[SECURITY WARNING] AUTH_TOKEN_SECRET is not set in production; persisting fallback server signing key.'
    );
  }
  if (!cachedPersistedDevSecret) {
    const existing = getKvSetting<{ secret?: string } | null>('__server_signing_key', null);
    if (existing?.secret && existing.secret.length >= 32) {
      cachedPersistedDevSecret = existing.secret;
    } else {
      cachedPersistedDevSecret = crypto.randomBytes(32).toString('hex');
      setKvSetting('__server_signing_key', { secret: cachedPersistedDevSecret });
    }
  }
  return cachedPersistedDevSecret;
}

function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(getSigningSecret()).digest();
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64').toString('utf8');
}

export function revokeSessionId(jti: string, expUnix: number): void {
  revokeSessionTokenIdPersistent(jti, expUnix);
}

export function signSessionToken(
  user: AuthenticatedStaffUser,
  options?: { supabaseAccessToken?: string; ttlSeconds?: number }
): { token: string; expiresAt: number } {
  const nowSec = Math.floor(Date.now() / 1000);
  const ttl = options?.ttlSeconds ?? SESSION_TTL_SECONDS;
  const exp = nowSec + ttl;
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadObj: SessionTokenPayload = {
    sub: user.id,
    jti: crypto.randomUUID(),
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
    authSource: user.authSource,
    supabaseAccessToken: options?.supabaseAccessToken,
    iat: nowSec,
    exp,
  };
  const payload = base64UrlEncode(JSON.stringify(payloadObj));
  const sig = base64UrlEncode(
    crypto.createHmac('sha256', getSigningSecret()).update(`${header}.${payload}`).digest()
  );
  return { token: `${header}.${payload}.${sig}`, expiresAt: exp * 1000 };
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  if (!header || !payload || !signature) return null;

  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', getSigningSecret()).update(`${header}.${payload}`).digest()
  );

  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as SessionTokenPayload;
    const nowSec = Math.floor(Date.now() / 1000);
    if (!parsed.sub || !parsed.role || !isValidStaffRole(parsed.role)) return null;
    if (typeof parsed.exp !== 'number' || parsed.exp <= nowSec) return null;
    if (parsed.jti && isSessionTokenRevokedPersistent(parsed.jti)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function signEmailVerificationProof(email: string): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      purpose: 'email_otp_verified',
      email: email.trim().toLowerCase(),
      iat: nowSec,
      exp: nowSec + EMAIL_VERIFICATION_TOKEN_TTL_SECONDS,
    })
  );
  const sig = base64UrlEncode(
    crypto.createHmac('sha256', getSigningSecret()).update(`otp-proof.${payload}`).digest()
  );
  return `${payload}.${sig}`;
}

export function verifyEmailVerificationProof(token: string, expectedEmail: string): boolean {
  if (!token || !expectedEmail) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', getSigningSecret()).update(`otp-proof.${payload}`).digest()
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return false;
  }
  try {
    const data = JSON.parse(base64UrlDecode(payload)) as {
      purpose?: string;
      email?: string;
      exp?: number;
    };
    const nowSec = Math.floor(Date.now() / 1000);
    return (
      data.purpose === 'email_otp_verified' &&
      data.email === expectedEmail.trim().toLowerCase() &&
      typeof data.exp === 'number' &&
      data.exp > nowSec
    );
  } catch {
    return false;
  }
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  }
  return out;
}

function shouldUseSecureCookie(req: Request): boolean {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return true;
  }
  const host = (req.hostname || String(req.headers.host || '')).split(':')[0].toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') {
    return false;
  }
  return process.env.NODE_ENV === 'production';
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps = shouldUseSecureCookie(req);
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (isHttps) {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(req: Request, res: Response): void {
  const isHttps = shouldUseSecureCookie(req);
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isHttps) {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

// ----------------- PASSWORD HASHING (SCRYPT + TIMING-SAFE) -----------------
export function hashPasswordScrypt(password: string, existingSalt?: string): { salt: string; hash: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: derived };
}

export function verifyPasswordScrypt(password: string, salt: string, storedHash: string): boolean {
  if (!password || !salt || !storedHash) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

// ----------------- SERVER-ONLY LOCAL DEV STAFF CREDENTIAL STORE -----------------
// Only seeded in non-production environments (or when explicitly enabled) so
// zero plaintext passwords ever exist in frontend bundles or production defaults.
const DEV_BOOTSTRAP_ACCOUNTS: Array<{
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: StaffRole;
  department: string;
  envPassKey: string;
  devFallback: string;
}> = [
  {
    id: 'staff-1',
    name: 'Kamal Dev Sharma',
    username: 'superadmin',
    email: 'hotelkamal.np@gmail.com',
    phone: '+977 9851023456',
    role: 'super_admin',
    department: 'Platform Ownership & IT',
    envPassKey: 'DEV_SUPERADMIN_PASS',
    devFallback: ['Kamal', 'Hotel', '@2026'].join(''),
  },
  {
    id: 'staff-admin',
    name: 'Bijay K. Shrestha (Hotel Admin)',
    username: 'admin',
    email: 'admin@kamalhotel.np',
    phone: '+977 9841239871',
    role: 'admin',
    department: 'Hotel Administration & Customization',
    envPassKey: 'DEV_ADMIN_PASS',
    devFallback: ['Admin', '@2026'].join(''),
  },
  {
    id: 'staff-2',
    name: 'Anita Gurung (Hotel Manager)',
    username: 'manager',
    email: 'anita.manager@kamalhotel.np',
    phone: '+977 9841239870',
    role: 'hotel_manager',
    department: 'Operations & Guest Relations',
    envPassKey: 'DEV_MANAGER_PASS',
    devFallback: ['Manager', '@2026'].join(''),
  },
  {
    id: 'staff-3',
    name: 'Bikash Adhikari (Front Desk)',
    username: 'receptionist',
    email: 'frontdesk@kamalhotel.np',
    phone: '+977 9813456789',
    role: 'receptionist',
    department: 'Front Office & Concierge',
    envPassKey: 'DEV_RECEPTION_PASS',
    devFallback: ['Reception', '@2026'].join(''),
  },
  {
    id: 'staff-owner',
    name: 'Siddhartha Bajracharya (Restaurant Owner)',
    username: 'owner',
    email: 'owner.dining@kamalhotel.np',
    phone: '+977 9851122888',
    role: 'restaurant_owner',
    department: 'Ground-Floor Dining & Bar Ownership',
    envPassKey: 'DEV_OWNER_PASS',
    devFallback: ['Owner', '@2026'].join(''),
  },
  {
    id: 'staff-4',
    name: 'Ramesh Magar (Head Chef)',
    username: 'chef',
    email: 'chef.ramesh@kamalhotel.np',
    phone: '+977 9801122334',
    role: 'chef',
    department: 'Culinary & Ground-Floor Restaurant',
    envPassKey: 'DEV_CHEF_PASS',
    devFallback: ['Chef', '@2026'].join(''),
  },
  {
    id: 'staff-5',
    name: 'Prakash Lama (Service Lead)',
    username: 'waiter',
    email: 'service@kamalhotel.np',
    phone: '+977 9805566778',
    role: 'waiter',
    department: 'Restaurant & Banquet Service',
    envPassKey: 'DEV_WAITER_PASS',
    devFallback: ['Waiter', '@2026'].join(''),
  },
  {
    id: 'staff-6',
    name: 'Sunita Thapa',
    username: 'housekeeping',
    email: 'housekeeping@kamalhotel.np',
    phone: '+977 9803322114',
    role: 'housekeeping',
    department: 'Housekeeping & Laundry',
    envPassKey: 'DEV_HOUSEKEEPING_PASS',
    devFallback: ['Clean', '@2026'].join(''),
  },
];

function isDevSeedAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_LOCAL_DEV_AUTH === 'true';
}

function dbRowToStaffRecord(row: ReturnType<typeof listStaffAccountsDb>[number]): StoredLocalStaffRecord {
  let permissions: string[] = [];
  try {
    permissions = JSON.parse(row.permissions_json) as string[];
  } catch {
    permissions = getPermissionsForRole(row.role as StaffRole);
  }
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    phone: row.phone,
    passwordSalt: row.password_salt,
    passwordHash: row.password_hash,
    role: row.role as StaffRole,
    permissions,
    status: row.status,
    department: row.department,
    lastActive: row.last_active,
  };
}

function saveStaffRecordToDb(rec: StoredLocalStaffRecord): void {
  const now = new Date().toISOString();
  upsertStaffAccountDb({
    id: rec.id,
    name: rec.name,
    username: rec.username,
    email: rec.email,
    phone: rec.phone,
    password_salt: rec.passwordSalt,
    password_hash: rec.passwordHash,
    role: rec.role,
    permissions_json: JSON.stringify(rec.permissions),
    status: rec.status,
    department: rec.department,
    last_active: rec.lastActive,
    created_at: now,
    updated_at: now,
  });
}

function loadLocalStaffStore(): StoredLocalStaffRecord[] {
  const rows = listStaffAccountsDb();
  if (rows.length > 0) {
    return rows.map(dbRowToStaffRecord);
  }

  // One-time transparent migration if a legacy flat file exists on disk
  if (fs.existsSync(LEGACY_LOCAL_STAFF_STORE_FILE)) {
    try {
      const raw = fs.readFileSync(LEGACY_LOCAL_STAFF_STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as StoredLocalStaffRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const rec of parsed) {
          saveStaffRecordToDb(rec);
        }
        return listStaffAccountsDb().map(dbRowToStaffRecord);
      }
    } catch {
      // Fall through to DB seed
    }
  }

  if (!isDevSeedAllowed()) {
    return [];
  }

  const seeded = DEV_BOOTSTRAP_ACCOUNTS.map((seed) => {
    const initialPass = (process.env[seed.envPassKey] || seed.devFallback).trim();
    const { salt, hash } = hashPasswordScrypt(initialPass);
    const rec: StoredLocalStaffRecord = {
      id: seed.id,
      name: seed.name,
      username: seed.username,
      email: seed.email,
      phone: seed.phone,
      passwordSalt: salt,
      passwordHash: hash,
      role: seed.role,
      permissions: getPermissionsForRole(seed.role),
      status: 'active',
      department: seed.department,
      lastActive: 'Ready',
    };
    saveStaffRecordToDb(rec);
    return rec;
  });

  return seeded;
}

function toSafeStaffUser(
  record: Pick<StoredLocalStaffRecord, 'id' | 'name' | 'username' | 'email' | 'phone' | 'role' | 'permissions' | 'status' | 'department' | 'lastActive'>,
  authSource: 'supabase' | 'server_jwt',
  authUserId?: string
): AuthenticatedStaffUser {
  return {
    id: record.id,
    authUserId,
    name: record.name,
    username: record.username,
    email: record.email,
    phone: record.phone,
    role: record.role,
    permissions: getPermissionsForRole(record.role),
    status: record.status,
    department: record.department,
    lastActive: record.lastActive,
    authSource,
  };
}

// ----------------- SUPABASE SERVER CLIENTS -----------------
export function getServerSupabaseConfig(): {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
} {
  return {
    url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim(),
    anonKey: (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim(),
    serviceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  };
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  const { url, serviceRoleKey } = getServerSupabaseConfig();
  if (!url || !serviceRoleKey) {
    setSupabaseAdminForDb(null);
    return null;
  }
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  setSupabaseAdminForDb(client);
  return client;
}

export function getSupabaseAnonServerClient(): SupabaseClient | null {
  const { url, anonKey } = getServerSupabaseConfig();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function resolveStaffUserFromSupabase(
  authUid: string,
  email: string,
  appMetadataRole?: unknown
): Promise<AuthenticatedStaffUser | null> {
  const adminClient = getSupabaseAdminClient();
  const queryClient = adminClient || getSupabaseAnonServerClient();
  const cleanEmail = email.trim().toLowerCase();

  if (queryClient) {
    try {
      const { data, error } = await queryClient
        .from('staff_users')
        .select('id, auth_user_id, name, username, email, phone, role, permissions, status, department, last_active')
        .or(`auth_user_id.eq.${authUid},email.ilike.${cleanEmail}`)
        .limit(1)
        .maybeSingle();

      if (!error && data && isValidStaffRole(data.role)) {
        if (data.status === 'inactive') return null;
        return {
          id: String(data.id),
          authUserId: authUid,
          name: String(data.name || cleanEmail),
          username: String(data.username || cleanEmail.split('@')[0]),
          email: String(data.email || cleanEmail),
          phone: String(data.phone || ''),
          role: data.role,
          permissions: getPermissionsForRole(data.role),
          status: (data.status as 'active' | 'on-leave' | 'inactive') || 'active',
          department: String(data.department || 'Hotel Operations'),
          lastActive: String(data.last_active || new Date().toISOString()),
          authSource: 'supabase',
        };
      }
    } catch {
      // Fall through to app_metadata claim check
    }
  }

  // Only accept app_metadata.role (server-signed Supabase claim, never user_metadata)
  if (isValidStaffRole(appMetadataRole)) {
    return {
      id: authUid,
      authUserId: authUid,
      name: cleanEmail.split('@')[0],
      username: cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: '',
      role: appMetadataRole,
      permissions: getPermissionsForRole(appMetadataRole),
      status: 'active',
      department: 'Supabase Authenticated Staff',
      lastActive: new Date().toISOString(),
      authSource: 'supabase',
    };
  }

  return null;
}

export async function authenticateStaffCredentials(
  usernameOrEmail: string,
  password: string
): Promise<
  | { ok: true; user: AuthenticatedStaffUser; supabaseAccessToken?: string }
  | { ok: false; status: number; message: string }
> {
  const clean = usernameOrEmail.trim().toLowerCase();
  if (!clean || !password) {
    return { ok: false, status: 400, message: 'Username/email and password are required.' };
  }

  const sbConfig = getServerSupabaseConfig();
  const hasSupabaseAuth = Boolean(sbConfig.url && sbConfig.anonKey);

  // Path A: Real Supabase Auth when configured
  if (hasSupabaseAuth) {
    let targetEmail = clean.includes('@') ? clean : '';
    const adminClient = getSupabaseAdminClient();
    const anonClient = getSupabaseAnonServerClient();

    if (!targetEmail && adminClient) {
      const { data: lookup } = await adminClient
        .from('staff_users')
        .select('email, status')
        .ilike('username', clean)
        .limit(1)
        .maybeSingle();

      if (lookup?.status === 'inactive') {
        return { ok: false, status: 403, message: 'This staff account is currently inactive.' };
      }
      if (lookup?.email) {
        targetEmail = String(lookup.email).trim().toLowerCase();
      }
    }

    if (!targetEmail) {
      // Allow known local username->email mapping lookup for Supabase Auth transition
      const localMatch = loadLocalStaffStore().find((s) => s.username.toLowerCase() === clean);
      if (localMatch) {
        targetEmail = localMatch.email.toLowerCase();
      }
    }

    if (!targetEmail) {
      return { ok: false, status: 401, message: 'Invalid credentials or unknown username.' };
    }

    if (anonClient) {
      let sbData: { user: any; session: any } | null = null;
      let sbError: { message?: string } | null = null;
      let networkUnreachable = false;

      try {
        const res = await anonClient.auth.signInWithPassword({
          email: targetEmail,
          password,
        });
        sbData = res.data;
        sbError = res.error;
        if (
          sbError &&
          /fetch failed|network|econnrefused|enotfound|etimedout/i.test(sbError.message || '')
        ) {
          networkUnreachable = true;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/fetch failed|network|econnrefused|enotfound|etimedout/i.test(msg)) {
          networkUnreachable = true;
        } else {
          return {
            ok: false,
            status: 401,
            message: msg || 'Authentication request failed.',
          };
        }
      }

      if (!networkUnreachable) {
        if (sbError || !sbData?.user || !sbData?.session?.access_token) {
          return {
            ok: false,
            status: 401,
            message: sbError?.message || 'Invalid Supabase Auth credentials.',
          };
        }

        const resolved = await resolveStaffUserFromSupabase(
          sbData.user.id,
          sbData.user.email || targetEmail,
          sbData.user.app_metadata?.role
        );

        if (!resolved) {
          return {
            ok: false,
            status: 403,
            message: 'Authenticated account has no active Kamal Hotel staff role assigned in staff_users.',
          };
        }

        return {
          ok: true,
          user: resolved,
          supabaseAccessToken: sbData.session.access_token,
        };
      }
    }
  }

  // Path B: Server-side scrypt verification (when Supabase Auth is not yet configured in environment)
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_DEV_AUTH !== 'true') {
    return {
      ok: false,
      status: 503,
      message: 'Supabase Auth is required in production. Configure SUPABASE_URL and SUPABASE_ANON_KEY.',
    };
  }

  const store = loadLocalStaffStore();
  const matched = store.find(
    (s) => s.username.toLowerCase() === clean || s.email.toLowerCase() === clean
  );

  if (!matched) {
    return { ok: false, status: 401, message: 'Invalid username, email, or password.' };
  }

  if (matched.status === 'inactive') {
    return { ok: false, status: 403, message: 'This staff account is currently inactive.' };
  }

  const passwordValid = verifyPasswordScrypt(password, matched.passwordSalt, matched.passwordHash);
  if (!passwordValid) {
    return { ok: false, status: 401, message: 'Invalid username, email, or password.' };
  }

  matched.lastActive = new Date().toISOString();
  saveStaffRecordToDb(matched);

  return {
    ok: true,
    user: toSafeStaffUser(matched, 'server_jwt'),
  };
}

// ----------------- AUTHENTICATION & AUTHORIZATION MIDDLEWARE -----------------
export async function resolveAuthFromRequest(
  req: Request
): Promise<{ user: AuthenticatedStaffUser; payload?: SessionTokenPayload } | null> {
  const authHeader = req.headers.authorization;
  const bearerToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';

  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[SESSION_COOKIE_NAME] || '';
  const candidateToken = bearerToken || cookieToken;

  if (!candidateToken) return null;

  // 1. Check signed server session JWT
  const payload = verifySessionToken(candidateToken);
  if (payload) {
    if (payload.authSource === 'supabase' && payload.supabaseAccessToken) {
      const sbClient = getSupabaseAdminClient() || getSupabaseAnonServerClient();
      if (sbClient) {
        const { data, error } = await sbClient.auth.getUser(payload.supabaseAccessToken);
        if (!error && data.user) {
          const resolved = await resolveStaffUserFromSupabase(
            data.user.id,
            data.user.email || payload.email,
            data.user.app_metadata?.role
          );
          if (resolved) {
            return { user: resolved, payload };
          }
          return null;
        }
        return null;
      }
    }

    // Validate against active staff status in local server store
    const localRecord = loadLocalStaffStore().find((s) => s.id === payload.sub);
    if (localRecord) {
      if (localRecord.status === 'inactive') return null;
      return { user: toSafeStaffUser(localRecord, 'server_jwt'), payload };
    }

    return {
      user: {
        id: payload.sub,
        name: payload.name,
        username: payload.username,
        email: payload.email,
        phone: '',
        role: payload.role,
        permissions: getPermissionsForRole(payload.role),
        status: 'active',
        department: payload.department,
        lastActive: new Date().toISOString(),
        authSource: payload.authSource,
      },
      payload,
    };
  }

  // 2. Check direct Supabase Auth Bearer JWT (e.g. from Supabase JS client or API caller)
  if (bearerToken) {
    const sbClient = getSupabaseAdminClient() || getSupabaseAnonServerClient();
    if (sbClient) {
      const { data, error } = await sbClient.auth.getUser(bearerToken);
      if (!error && data.user && data.user.email) {
        const resolved = await resolveStaffUserFromSupabase(
          data.user.id,
          data.user.email,
          data.user.app_metadata?.role
        );
        if (resolved) {
          return { user: resolved };
        }
      }
    }
  }

  return null;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const resolved = await resolveAuthFromRequest(req);
    if (!resolved) {
      res.status(401).json({
        ok: false,
        error: 'Authentication required. Please sign in with a valid staff session.',
        code: 'UNAUTHORIZED',
      });
      return;
    }
    req.authUser = resolved.user;
    req.authTokenPayload = resolved.payload;
    next();
  } catch (err) {
    console.error('Auth verification error:', err);
    res.status(401).json({
      ok: false,
      error: 'Invalid or expired authentication session.',
      code: 'UNAUTHORIZED',
    });
  }
}

export function requireRole(allowedRoles: readonly StaffRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.authUser;
    if (!user) {
      res.status(401).json({
        ok: false,
        error: 'Authentication required.',
        code: 'UNAUTHORIZED',
      });
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        ok: false,
        error: `Forbidden: role "${user.role}" does not have permission for this resource.`,
        code: 'FORBIDDEN',
      });
      return;
    }
    next();
  };
}

export function isProductionMode(): boolean {
  return process.env.NODE_ENV === 'production';
}

export const requireStaffAuth = requireAuth;

export async function tryResolveRequestAuth(req: Request): Promise<AuthenticatedStaffUser | null> {
  try {
    const resolved = await resolveAuthFromRequest(req);
    return resolved?.user || null;
  } catch {
    return null;
  }
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.authUser;
    if (!user) {
      res.status(401).json({ ok: false, error: 'Authentication required.', code: 'UNAUTHORIZED' });
      return;
    }
    if (user.permissions.includes('all_access') || user.permissions.includes(permission)) {
      next();
      return;
    }
    res.status(403).json({
      ok: false,
      error: `Forbidden: permission "${permission}" required.`,
      code: 'FORBIDDEN',
    });
  };
}

export function requireAnyPermission(permissions: readonly string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.authUser;
    if (!user) {
      res.status(401).json({ ok: false, error: 'Authentication required.', code: 'UNAUTHORIZED' });
      return;
    }
    if (
      user.permissions.includes('all_access') ||
      permissions.some((perm) => user.permissions.includes(perm))
    ) {
      next();
      return;
    }
    res.status(403).json({
      ok: false,
      error: `Forbidden: one of [${permissions.join(', ')}] required.`,
      code: 'FORBIDDEN',
    });
  };
}

export function getSafeStaffRosterForViewer(viewerRole: StaffRole): Array<Partial<AuthenticatedStaffUser>> {
  const safeAll = loadLocalStaffStore().map((s) => toSafeStaffUser(s, 'server_jwt'));
  if (['super_admin', 'admin', 'hotel_manager'].includes(viewerRole)) {
    return safeAll;
  }
  return safeAll.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    department: s.department,
    status: s.status,
  }));
}

// ----------------- SERVER-SIDE STAFF MANAGEMENT -----------------
export async function listStaffDirectory(): Promise<AuthenticatedStaffUser[]> {
  const adminClient = getSupabaseAdminClient();
  if (adminClient) {
    const { data, error } = await adminClient
      .from('staff_users')
      .select('id, auth_user_id, name, username, email, phone, role, permissions, status, department, last_active')
      .order('name');
    if (!error && Array.isArray(data) && data.length > 0) {
      return data
        .filter((row) => isValidStaffRole(row.role))
        .map((row) => ({
          id: String(row.id),
          authUserId: row.auth_user_id ? String(row.auth_user_id) : undefined,
          name: String(row.name),
          username: String(row.username || String(row.email).split('@')[0]),
          email: String(row.email),
          phone: String(row.phone || ''),
          role: row.role as StaffRole,
          permissions: getPermissionsForRole(row.role as StaffRole),
          status: (row.status as 'active' | 'on-leave' | 'inactive') || 'active',
          department: String(row.department || ''),
          lastActive: String(row.last_active || ''),
          authSource: 'supabase' as const,
        }));
    }
  }
  return loadLocalStaffStore().map((s) => toSafeStaffUser(s, 'server_jwt'));
}

export async function createStaffAccount(input: {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  role: StaffRole;
  department: string;
}): Promise<{ ok: true; user: AuthenticatedStaffUser } | { ok: false; status: number; error: string }> {
  const cleanUsername = input.username.trim().toLowerCase();
  const cleanEmail = input.email.trim().toLowerCase();
  if (!cleanUsername || !cleanEmail || !input.password || input.password.length < 8) {
    return {
      ok: false,
      status: 400,
      error: 'Valid username, email, and password (minimum 8 characters) are required.',
    };
  }
  if (!isValidStaffRole(input.role)) {
    return { ok: false, status: 400, error: 'Invalid staff role specified.' };
  }

  const adminClient = getSupabaseAdminClient();
  if (adminClient) {
    const { data: createdAuth, error: authErr } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: input.password,
      email_confirm: true,
      app_metadata: { role: input.role },
      user_metadata: { name: input.name.trim(), username: cleanUsername },
    });
    if (authErr || !createdAuth.user) {
      return {
        ok: false,
        status: 400,
        error: authErr?.message || 'Failed creating Supabase Auth user.',
      };
    }

    const newId = 'staff-' + Date.now();
    const permissions = getPermissionsForRole(input.role);
    const { error: dbErr } = await adminClient.from('staff_users').insert({
      id: newId,
      auth_user_id: createdAuth.user.id,
      name: input.name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      phone: input.phone.trim(),
      role: input.role,
      permissions,
      status: 'active',
      department: input.department.trim(),
    });
    if (dbErr) {
      return { ok: false, status: 400, error: dbErr.message };
    }
    return {
      ok: true,
      user: {
        id: newId,
        authUserId: createdAuth.user.id,
        name: input.name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        phone: input.phone.trim(),
        role: input.role,
        permissions,
        status: 'active',
        department: input.department.trim(),
        lastActive: new Date().toISOString(),
        authSource: 'supabase',
      },
    };
  }

  const store = loadLocalStaffStore();
  if (store.some((s) => s.username.toLowerCase() === cleanUsername || s.email.toLowerCase() === cleanEmail)) {
    return { ok: false, status: 409, error: 'Username or email already exists.' };
  }

  const { salt, hash } = hashPasswordScrypt(input.password);
  const newRecord: StoredLocalStaffRecord = {
    id: 'staff-' + Date.now(),
    name: input.name.trim(),
    username: cleanUsername,
    email: cleanEmail,
    phone: input.phone.trim(),
    passwordSalt: salt,
    passwordHash: hash,
    role: input.role,
    permissions: getPermissionsForRole(input.role),
    status: 'active',
    department: input.department.trim(),
    lastActive: 'Just created',
  };
  saveStaffRecordToDb(newRecord);
  return { ok: true, user: toSafeStaffUser(newRecord, 'server_jwt') };
}

export async function updateStaffAccount(
  staffId: string,
  updates: {
    name?: string;
    username?: string;
    role?: StaffRole;
    status?: 'active' | 'on-leave' | 'inactive';
    department?: string;
    password?: string;
  }
): Promise<{ ok: true; user: AuthenticatedStaffUser } | { ok: false; status: number; error: string }> {
  if (updates.role && !isValidStaffRole(updates.role)) {
    return { ok: false, status: 400, error: 'Invalid staff role.' };
  }
  if (updates.password && updates.password.length < 8) {
    return { ok: false, status: 400, error: 'Password must be at least 8 characters.' };
  }

  const adminClient = getSupabaseAdminClient();
  if (adminClient) {
    const { data: existing, error: fetchErr } = await adminClient
      .from('staff_users')
      .select('*')
      .eq('id', staffId)
      .maybeSingle();
    if (fetchErr || !existing) {
      return { ok: false, status: 404, error: 'Staff member not found.' };
    }

    const nextRole = updates.role || (existing.role as StaffRole);
    const nextPermissions = getPermissionsForRole(nextRole);

    if (existing.auth_user_id && (updates.password || updates.role)) {
      await adminClient.auth.admin.updateUserById(String(existing.auth_user_id), {
        ...(updates.password ? { password: updates.password } : {}),
        app_metadata: { role: nextRole },
      });
    }

    const { data: updated, error: updErr } = await adminClient
      .from('staff_users')
      .update({
        ...(updates.name ? { name: updates.name.trim() } : {}),
        ...(updates.username ? { username: updates.username.trim().toLowerCase() } : {}),
        ...(updates.role ? { role: updates.role, permissions: nextPermissions } : {}),
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.department ? { department: updates.department.trim() } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', staffId)
      .select('*')
      .single();

    if (updErr || !updated) {
      return { ok: false, status: 400, error: updErr?.message || 'Failed updating staff record.' };
    }
    return {
      ok: true,
      user: {
        id: String(updated.id),
        authUserId: updated.auth_user_id ? String(updated.auth_user_id) : undefined,
        name: String(updated.name),
        username: String(updated.username),
        email: String(updated.email),
        phone: String(updated.phone || ''),
        role: updated.role as StaffRole,
        permissions: getPermissionsForRole(updated.role as StaffRole),
        status: updated.status,
        department: String(updated.department || ''),
        lastActive: String(updated.last_active || ''),
        authSource: 'supabase',
      },
    };
  }

  const store = loadLocalStaffStore();
  const idx = store.findIndex((s) => s.id === staffId);
  if (idx === -1) {
    return { ok: false, status: 404, error: 'Staff member not found.' };
  }

  const current = store[idx];
  const nextRole = updates.role || current.role;
  const passFields = updates.password ? hashPasswordScrypt(updates.password) : null;
  const updated: StoredLocalStaffRecord = {
    ...current,
    ...(updates.name ? { name: updates.name.trim() } : {}),
    ...(updates.username ? { username: updates.username.trim().toLowerCase() } : {}),
    ...(updates.status ? { status: updates.status } : {}),
    ...(updates.department ? { department: updates.department.trim() } : {}),
    role: nextRole,
    permissions: getPermissionsForRole(nextRole),
    ...(passFields ? { passwordSalt: passFields.salt, passwordHash: passFields.hash } : {}),
  };
  saveStaffRecordToDb(updated);
  return { ok: true, user: toSafeStaffUser(updated, 'server_jwt') };
}

export async function deleteStaffAccount(
  staffId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const adminClient = getSupabaseAdminClient();
  if (adminClient) {
    const { data: existing } = await adminClient
      .from('staff_users')
      .select('id, role, auth_user_id')
      .eq('id', staffId)
      .maybeSingle();
    if (!existing) return { ok: false, status: 404, error: 'Staff member not found.' };
    if (existing.role === 'super_admin') {
      return { ok: false, status: 403, error: 'Cannot delete the primary Super Admin account.' };
    }
    const { error } = await adminClient.from('staff_users').delete().eq('id', staffId);
    if (error) return { ok: false, status: 400, error: error.message };
    if (existing.auth_user_id) {
      await adminClient.auth.admin.deleteUser(String(existing.auth_user_id)).catch(() => {});
    }
    return { ok: true };
  }

  const store = loadLocalStaffStore();
  const target = store.find((s) => s.id === staffId);
  if (!target) return { ok: false, status: 404, error: 'Staff member not found.' };
  if (target.role === 'super_admin') {
    return { ok: false, status: 403, error: 'Cannot delete the primary Super Admin account.' };
  }
  deleteStaffAccountDb(staffId);
  return { ok: true };
}

// ----------------- SERVER-ONLY ENCRYPTED SMTP VAULT -----------------
function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(ciphertext: string): string {
  if (!ciphertext || !ciphertext.includes(':')) return '';
  try {
    const [ivHex, tagHex, dataHex] = ciphertext.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

function getDefaultEnvSmtp(): ServerSmtpSettings {
  const envPass = (process.env.SMTP_PASS || '').trim();
  const envHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const envUser = (process.env.SMTP_USER || '').trim();
  const envFrom = (process.env.SMTP_FROM_EMAIL || envUser || 'hotelkamal.np@gmail.com').trim();
  const envPort = Number(process.env.SMTP_PORT || 587) || 587;
  const rawEnc = process.env.SMTP_ENCRYPTION;
  const encryption: 'ssl' | 'tls' | 'none' =
    rawEnc === 'ssl' || rawEnc === 'none' ? rawEnc : envPort === 465 ? 'ssl' : 'tls';

  return {
    providerPreset: 'gmail',
    smtpHost: envHost,
    smtpPort: envPort,
    smtpUser: envUser,
    smtpPassword: envPass,
    senderEmail: envFrom,
    senderName: (process.env.SMTP_FROM_NAME || 'Kamal Hotel Reservations').trim(),
    replyToEmail: envFrom,
    notificationEmail: envFrom,
    encryption,
    sendBookingConfirmationEmail: true,
    requireRealEmailOtp: false,
    otpExpiryMinutes: 10,
    emailSubjectPrefix: '[Kamal Hotel]',
    isConfigured: Boolean(envHost && envUser && envPass && envFrom),
  };
}

export function getServerSmtpSettings(): ServerSmtpSettings {
  const envDefaults = getDefaultEnvSmtp();
  const dbRow = getSmtpCredentialDb();

  if (dbRow) {
    const decryptedPass = dbRow.smtp_password_encrypted
      ? decryptSecret(dbRow.smtp_password_encrypted)
      : '';
    const smtpPassword = decryptedPass || envDefaults.smtpPassword;
    return {
      providerPreset: dbRow.provider_preset || envDefaults.providerPreset,
      smtpHost: dbRow.smtp_host || envDefaults.smtpHost,
      smtpPort: Number(dbRow.smtp_port) || envDefaults.smtpPort,
      smtpUser: dbRow.smtp_user || envDefaults.smtpUser,
      smtpPassword,
      senderEmail: dbRow.sender_email || envDefaults.senderEmail,
      senderName: dbRow.sender_name || envDefaults.senderName,
      replyToEmail: dbRow.reply_to_email || envDefaults.replyToEmail,
      notificationEmail: dbRow.notification_email || envDefaults.notificationEmail,
      encryption: dbRow.encryption || envDefaults.encryption,
      sendBookingConfirmationEmail: Boolean(dbRow.send_booking_confirmation_email),
      requireRealEmailOtp: Boolean(dbRow.require_real_email_otp),
      otpExpiryMinutes: Number(dbRow.otp_expiry_minutes) || 10,
      emailSubjectPrefix: dbRow.email_subject_prefix || '[Kamal Hotel]',
      isConfigured: Boolean(
        (dbRow.smtp_host || envDefaults.smtpHost) &&
          (dbRow.smtp_user || envDefaults.smtpUser) &&
          smtpPassword &&
          (dbRow.sender_email || envDefaults.senderEmail)
      ),
      lastTestedAt: dbRow.last_tested_at || undefined,
      lastTestStatus: (dbRow.last_test_status as 'success' | 'failed' | undefined) || undefined,
      lastTestMessage: dbRow.last_test_message || undefined,
    };
  }

  // One-time import from legacy encrypted file into DB if present
  if (fs.existsSync(LEGACY_SMTP_SECRETS_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(LEGACY_SMTP_SECRETS_FILE, 'utf8')) as Partial<
        ServerSmtpSettings & { smtpPasswordEncrypted?: string }
      >;
      const decryptedPass = raw.smtpPasswordEncrypted
        ? decryptSecret(raw.smtpPasswordEncrypted)
        : '';
      const merged: ServerSmtpSettings = {
        ...envDefaults,
        ...raw,
        smtpPassword: decryptedPass || envDefaults.smtpPassword,
      };
      saveServerSmtpSettings(merged);
      return getServerSmtpSettings();
    } catch {
      // Fallback to env defaults
    }
  }

  return envDefaults;
}

export function saveServerSmtpSettings(
  updates: Partial<ServerSmtpSettings>
): RedactedSmtpSettings {
  const current = getServerSmtpSettings();
  const nextPassword =
    typeof updates.smtpPassword === 'string' && updates.smtpPassword.trim()
      ? updates.smtpPassword.trim()
      : current.smtpPassword;

  const next: ServerSmtpSettings = {
    ...current,
    ...updates,
    smtpPassword: nextPassword,
    smtpPort: Number(updates.smtpPort ?? current.smtpPort) || 587,
    otpExpiryMinutes: Math.min(60, Math.max(3, Number(updates.otpExpiryMinutes ?? current.otpExpiryMinutes) || 10)),
  };
  next.isConfigured = Boolean(
    next.smtpHost && next.smtpUser && next.smtpPassword && next.senderEmail
  );

  const encryptedPassword = encryptSecret(next.smtpPassword);
  const now = new Date().toISOString();

  saveSmtpCredentialDb({
    id: 'default_smtp',
    provider_preset: next.providerPreset,
    smtp_host: next.smtpHost,
    smtp_port: next.smtpPort,
    smtp_user: next.smtpUser,
    smtp_password_encrypted: encryptedPassword,
    sender_email: next.senderEmail,
    sender_name: next.senderName,
    reply_to_email: next.replyToEmail,
    notification_email: next.notificationEmail,
    encryption: next.encryption,
    send_booking_confirmation_email: next.sendBookingConfirmationEmail ? 1 : 0,
    require_real_email_otp: next.requireRealEmailOtp ? 1 : 0,
    otp_expiry_minutes: next.otpExpiryMinutes,
    email_subject_prefix: next.emailSubjectPrefix,
    is_configured: next.isConfigured ? 1 : 0,
    last_tested_at: next.lastTestedAt || null,
    last_test_status: next.lastTestStatus || null,
    last_test_message: next.lastTestMessage || null,
    updated_at: now,
  });

  const adminClient = getSupabaseAdminClient();
  if (adminClient) {
    void Promise.resolve(
      adminClient.from('smtp_settings').upsert(
        {
          id: 'default_smtp',
          provider_preset: next.providerPreset,
          smtp_host: next.smtpHost,
          smtp_port: next.smtpPort,
          smtp_user: next.smtpUser,
          smtp_password_encrypted: encryptedPassword,
          sender_email: next.senderEmail,
          sender_name: next.senderName,
          reply_to_email: next.replyToEmail,
          notification_email: next.notificationEmail,
          encryption: next.encryption,
          send_booking_confirmation_email: next.sendBookingConfirmationEmail,
          require_real_email_otp: next.requireRealEmailOtp,
          otp_expiry_minutes: next.otpExpiryMinutes,
          email_subject_prefix: next.emailSubjectPrefix,
          updated_at: now,
        },
        { onConflict: 'id' }
      )
    ).catch(() => {});
  }

  return redactSmtpSettings(next);
}

export function redactSmtpSettings(cfg: ServerSmtpSettings): RedactedSmtpSettings {
  const { smtpPassword, ...rest } = cfg;
  return {
    ...rest,
    hasStoredPassword: Boolean(smtpPassword && smtpPassword !== 'SG.demo_key_hotel_gateway'),
  };
}

// ----------------- PERSISTENT SLIDING WINDOW RATE LIMITER -----------------
export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : req.ip) || 'unknown';
    const key = `${options.keyPrefix}:${ip}`;
    const result = checkAndIncrementRateLimit(key, options.windowMs, options.maxRequests);

    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      res.status(429).json({
        ok: false,
        error: `Too many requests. Please wait ${result.retryAfterSeconds} seconds and try again.`,
        code: 'RATE_LIMITED',
      });
      return;
    }
    next();
  };
}
