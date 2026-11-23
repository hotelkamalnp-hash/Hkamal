import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

const tmpP0Dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kamal-p0-test-'));
process.env.KAMAL_DB_PATH = path.join(tmpP0Dir, 'p0-security.db');

import { createApiApp } from '../server.ts';
import { closeSqliteDb, getSqliteDb } from '../server/db.ts';
import { ALL_STAFF_ROLES, ROLE_PERMISSIONS } from '../server/rbac.ts';
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  type AuthenticatedStaffUser,
} from '../server/security.ts';

const ROOT = process.cwd();
const LEGACY_STAFF_STORE_FILE = path.resolve(ROOT, '.kamal-staff-auth.json');
const LEGACY_SMTP_STORE_FILE = path.resolve(ROOT, '.kamal-smtp-secrets.enc.json');

const TEST_ACCOUNTS = [
  { role: 'super_admin', username: 'superadmin', password: ['Kamal', 'Hotel', '@2026'].join('') },
  { role: 'admin', username: 'admin', password: ['Admin', '@2026'].join('') },
  { role: 'hotel_manager', username: 'manager', password: ['Manager', '@2026'].join('') },
  { role: 'restaurant_owner', username: 'owner', password: ['Owner', '@2026'].join('') },
  { role: 'receptionist', username: 'receptionist', password: ['Reception', '@2026'].join('') },
  { role: 'chef', username: 'chef', password: ['Chef', '@2026'].join('') },
  { role: 'waiter', username: 'waiter', password: ['Waiter', '@2026'].join('') },
  { role: 'housekeeping', username: 'housekeeping', password: ['Clean', '@2026'].join('') },
] as const;

let passedCount = 0;

async function runCheck(name: string, fn: () => Promise<void> | void): Promise<void> {
  await fn();
  passedCount += 1;
  console.log(`PASS: ${name}`);
}

async function main(): Promise<void> {
  // Ensure clean auth secret & non-prod seed during automated test
  process.env.AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'test_p0_security_secret_32_bytes_min';
  process.env.GOOGLE_MAPS_API_KEY = 'PRIVATE_SERVER_ONLY_MAPS_KEY_DO_NOT_LEAK';
  process.env.VITE_GOOGLE_MAPS_API_KEY = '';

  const app = createApiApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  const cookiesByRole = new Map<string, string>();
  const tokensByRole = new Map<string, string>();

  try {
    // 1. Unauthenticated requests MUST fail closed with 401
    await runCheck('Unauthenticated protected endpoints return 401', async () => {
      const checks = [
        fetch(`${baseUrl}/api/auth/session`),
        fetch(`${baseUrl}/api/auth/staff`),
        fetch(`${baseUrl}/api/auth/staff`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
        fetch(`${baseUrl}/api/settings/smtp`),
        fetch(`${baseUrl}/api/settings/smtp`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
        fetch(`${baseUrl}/api/email/test-smtp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
        fetch(`${baseUrl}/api/bookings/send-confirmation-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guestEmail: 'guest@example.com', bookingCode: 'KH-100' }),
        }),
      ];
      const responses = await Promise.all(checks);
      for (const res of responses) {
        assert.equal(res.status, 401, `Expected 401 for ${res.url}, got ${res.status}`);
      }
    });

    // 2. Reject invalid credentials
    await runCheck('Invalid password and unknown username return 401', async () => {
      const badPass = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: 'superadmin', password: 'WrongPassword123' }),
      });
      assert.equal(badPass.status, 401);

      const badUser = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: 'nonexistent_staff', password: 'WrongPassword123' }),
      });
      assert.equal(badUser.status, 401);
    });

    // 3. Test every single one of the 8 existing staff roles
    await runCheck('All 8 staff roles authenticate with HttpOnly JWT cookie and exact RBAC permissions', async () => {
      assert.equal(TEST_ACCOUNTS.length, ALL_STAFF_ROLES.length);
      for (const acc of TEST_ACCOUNTS) {
        const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernameOrEmail: acc.username, password: acc.password }),
        });
        assert.equal(loginRes.status, 200, `Login failed for ${acc.role}`);

        const setCookie = loginRes.headers.get('set-cookie') || '';
        assert.ok(setCookie.includes(`${SESSION_COOKIE_NAME}=`), `Missing cookie for ${acc.role}`);
        assert.ok(setCookie.includes('HttpOnly'), `Missing HttpOnly flag for ${acc.role}`);
        assert.ok(setCookie.includes('SameSite=Lax'), `Missing SameSite=Lax flag for ${acc.role}`);

        const data = (await loginRes.json()) as {
          ok: boolean;
          token: string;
          user: AuthenticatedStaffUser & { password?: string };
        };
        assert.equal(data.ok, true);
        assert.equal(data.user.role, acc.role);
        assert.equal('password' in data.user, false, 'Password must NEVER appear in user payload');
        assert.deepEqual(data.user.permissions, [...ROLE_PERMISSIONS[acc.role]]);

        const cookiePair = setCookie.split(';')[0];
        cookiesByRole.set(acc.role, cookiePair);
        tokensByRole.set(acc.role, data.token);

        const sessionRes = await fetch(`${baseUrl}/api/auth/session`, {
          headers: { Cookie: cookiePair },
        });
        assert.equal(sessionRes.status, 200);
        const sessionData = (await sessionRes.json()) as { authenticated: boolean; user: AuthenticatedStaffUser };
        assert.equal(sessionData.authenticated, true);
        assert.equal(sessionData.user.role, acc.role);
      }
    });

    // 4. Role-Based Access Control matrix verification
    await runCheck('RBAC enforces 403 Forbidden across unauthorized staff roles', async () => {
      // Lower roles cannot read staff directory
      for (const restricted of ['receptionist', 'restaurant_owner', 'chef', 'waiter', 'housekeeping']) {
        const res = await fetch(`${baseUrl}/api/auth/staff`, {
          headers: { Cookie: cookiesByRole.get(restricted)! },
        });
        assert.equal(res.status, 403, `Expected 403 on GET /api/auth/staff for ${restricted}`);
      }

      // Management roles can read staff directory without password hashes
      for (const allowed of ['super_admin', 'admin', 'hotel_manager']) {
        const res = await fetch(`${baseUrl}/api/auth/staff`, {
          headers: { Cookie: cookiesByRole.get(allowed)! },
        });
        assert.equal(res.status, 200, `Expected 200 on GET /api/auth/staff for ${allowed}`);
        const payload = (await res.json()) as { staff: Array<Record<string, unknown>> };
        for (const row of payload.staff) {
          assert.equal('password' in row, false);
          assert.equal('passwordHash' in row, false);
          assert.equal('passwordSalt' in row, false);
        }
      }

      // Only super_admin may create/delete/rotate passwords for staff
      for (const nonSuper of ['admin', 'hotel_manager', 'receptionist', 'chef', 'waiter', 'housekeeping']) {
        const createRes = await fetch(`${baseUrl}/api/auth/staff`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: cookiesByRole.get(nonSuper)!,
          },
          body: JSON.stringify({
            name: 'Unauthorized Create',
            username: 'unauth',
            email: 'unauth@kamalhotel.np',
            password: 'StrongPassword@123',
            role: 'waiter',
          }),
        });
        assert.equal(createRes.status, 403, `Expected 403 on POST /api/auth/staff for ${nonSuper}`);
      }

      // SMTP settings restricted strictly to super_admin & admin
      for (const nonSmtpRole of ['hotel_manager', 'receptionist', 'restaurant_owner', 'chef', 'waiter', 'housekeeping']) {
        const res = await fetch(`${baseUrl}/api/settings/smtp`, {
          headers: { Cookie: cookiesByRole.get(nonSmtpRole)! },
        });
        assert.equal(res.status, 403, `Expected 403 on GET /api/settings/smtp for ${nonSmtpRole}`);
      }
      for (const smtpAdminRole of ['super_admin', 'admin']) {
        const res = await fetch(`${baseUrl}/api/settings/smtp`, {
          headers: { Cookie: cookiesByRole.get(smtpAdminRole)! },
        });
        assert.equal(res.status, 200, `Expected 200 on GET /api/settings/smtp for ${smtpAdminRole}`);
      }
    });

    // 5. Session tampering, expiry, and logout revocation
    await runCheck('Tampered, expired, and logged-out JWTs are rejected with 401', async () => {
      const validToken = tokensByRole.get('admin')!;
      const tampered = `${validToken.slice(0, -2)}XX`;
      const tamperRes = await fetch(`${baseUrl}/api/auth/session`, {
        headers: { Authorization: `Bearer ${tampered}` },
      });
      assert.equal(tamperRes.status, 401);

      const expiredUser: AuthenticatedStaffUser = {
        id: 'staff-admin',
        name: 'Expired Admin',
        username: 'admin',
        email: 'admin@kamalhotel.np',
        phone: '',
        role: 'admin',
        permissions: [...ROLE_PERMISSIONS.admin],
        status: 'active',
        department: 'Admin',
        lastActive: 'Now',
        authSource: 'server_jwt',
      };
      const { token: expiredJwt } = signSessionToken(expiredUser, { ttlSeconds: -5 });
      const expiredRes = await fetch(`${baseUrl}/api/auth/session`, {
        headers: { Authorization: `Bearer ${expiredJwt}` },
      });
      assert.equal(expiredRes.status, 401);

      // Logout revokes token jti immediately
      const waiterCookie = cookiesByRole.get('waiter')!;
      const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { Cookie: waiterCookie },
      });
      assert.equal(logoutRes.status, 200);
      const reuseRes = await fetch(`${baseUrl}/api/auth/session`, {
        headers: { Cookie: waiterCookie },
      });
      assert.equal(reuseRes.status, 401);
    });

    // 6. Super Admin staff creation, password rotation, inactive enforcement, and deletion
    await runCheck('Super Admin staff CRUD, password rotation, and inactive block work end-to-end', async () => {
      const superCookie = cookiesByRole.get('super_admin')!;
      const createRes = await fetch(`${baseUrl}/api/auth/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: superCookie },
        body: JSON.stringify({
          name: 'Test Desk Officer',
          username: 'p0testuser',
          email: 'p0test@kamalhotel.np',
          phone: '+977-9800000001',
          password: 'InitialStrongPass@99',
          role: 'receptionist',
          department: 'Front Office',
        }),
      });
      assert.equal(createRes.status, 201);
      const created = (await createRes.json()) as { user: AuthenticatedStaffUser };

      const loginNew = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: 'p0testuser', password: 'InitialStrongPass@99' }),
      });
      assert.equal(loginNew.status, 200);

      // Rotate password
      const rotateRes = await fetch(`${baseUrl}/api/auth/staff/${created.user.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: superCookie },
        body: JSON.stringify({ password: 'RotatedStrongPass@88' }),
      });
      assert.equal(rotateRes.status, 200);

      const oldLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: 'p0testuser', password: 'InitialStrongPass@99' }),
      });
      assert.equal(oldLogin.status, 401);

      // Deactivate account -> login blocked with 403
      const deactivateRes = await fetch(`${baseUrl}/api/auth/staff/${created.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: superCookie },
        body: JSON.stringify({ status: 'inactive' }),
      });
      assert.equal(deactivateRes.status, 200);

      const inactiveLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: 'p0testuser', password: 'RotatedStrongPass@88' }),
      });
      assert.equal(inactiveLogin.status, 403);

      // Delete temporary account
      const deleteRes = await fetch(`${baseUrl}/api/auth/staff/${created.user.id}`, {
        method: 'DELETE',
        headers: { Cookie: superCookie },
      });
      assert.equal(deleteRes.status, 200);
    });

    // 7. OTP verification lockout & confirmation email proof check + Maps config redaction
    await runCheck('OTP max attempt lockout, confirmation proof validation, and Maps key isolation hold', async () => {
      const mapsRes = await fetch(`${baseUrl}/api/maps/config`);
      const mapsJson = (await mapsRes.json()) as { hasKey: boolean; apiKey: string };
      assert.equal(mapsJson.apiKey.includes('PRIVATE_SERVER_ONLY_MAPS_KEY'), false);
      assert.equal(mapsJson.hasKey, false);

      const sendOtp = await fetch(`${baseUrl}/api/bookings/send-verification-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'verifiedguest@example.com', guestName: 'Guest Test' }),
      });
      assert.equal(sendOtp.status, 200);
      const otpData = (await sendOtp.json()) as { previewCode?: string };
      assert.ok(otpData.previewCode);

      // Tampered proof fails with 401
      const badConfirm = await fetch(`${baseUrl}/api/bookings/send-confirmation-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestEmail: 'verifiedguest@example.com',
          bookingCode: 'KH-999',
          verificationToken: 'forged.token',
        }),
      });
      assert.equal(badConfirm.status, 401);

      // Valid OTP -> returns proof token -> passes authorization for matching email only
      const verifyOk = await fetch(`${baseUrl}/api/bookings/verify-email-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'verifiedguest@example.com', code: otpData.previewCode }),
      });
      assert.equal(verifyOk.status, 200);
      const verifyBody = (await verifyOk.json()) as { verified: boolean; verificationToken: string };
      assert.equal(verifyBody.verified, true);
      assert.ok(verifyBody.verificationToken);

      // Mismatched guest email rejected with 401
      const mismatchConfirm = await fetch(`${baseUrl}/api/bookings/send-confirmation-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestEmail: 'attacker@example.com',
          bookingCode: 'KH-999',
          verificationToken: verifyBody.verificationToken,
        }),
      });
      assert.equal(mismatchConfirm.status, 401);

      // Matching email authorized (even when SMTP delivery itself reports smtp_unconfigured or attempts send)
      const validConfirm = await fetch(`${baseUrl}/api/bookings/send-confirmation-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestEmail: 'verifiedguest@example.com',
          bookingCode: 'KH-999',
          verificationToken: verifyBody.verificationToken,
        }),
      });
      assert.notEqual(validConfirm.status, 401);

      // Brute-force lockout test on fresh email
      await fetch(`${baseUrl}/api/bookings/send-verification-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'lockout@example.com', guestName: 'Lockout Test' }),
      });
      for (let i = 0; i < 5; i++) {
        const failTry = await fetch(`${baseUrl}/api/bookings/verify-email-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'lockout@example.com', code: '000000' }),
        });
        assert.equal(failTry.status, 400);
      }
      const lockedTry = await fetch(`${baseUrl}/api/bookings/verify-email-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'lockout@example.com', code: '000000' }),
      });
      assert.equal(lockedTry.status, 429);
    });

    // 8. SMTP encrypted DB storage & staff_accounts DB storage never expose secrets
    await runCheck('Database stores hashed staff & encrypted SMTP credentials with zero flat JSON leakage', async () => {
      const adminCookie = cookiesByRole.get('admin')!;
      const secretPass = 'super_secret_smtp_app_password_1234';
      const saveRes = await fetch(`${baseUrl}/api/settings/smtp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpUser: 'reservations@kamalhotel.np',
          smtpPassword: secretPass,
          senderEmail: 'reservations@kamalhotel.np',
          senderName: 'Kamal Hotel',
        }),
      });
      assert.equal(saveRes.status, 200);
      const saveBody = (await saveRes.json()) as { smtp: Record<string, unknown> };
      assert.equal(saveBody.smtp.hasStoredPassword, true);
      assert.equal('smtpPassword' in saveBody.smtp, false);

      const getRes = await fetch(`${baseUrl}/api/settings/smtp`, {
        headers: { Cookie: adminCookie },
      });
      assert.equal(getRes.status, 200);
      const getText = await getRes.text();
      assert.equal(getText.includes(secretPass), false, 'Plaintext SMTP secret must not appear in GET response');

      assert.equal(fs.existsSync(LEGACY_SMTP_STORE_FILE), false, 'Flat .kamal-smtp-secrets.enc.json file must not be created');

      const db = getSqliteDb();
      const smtpRow = db
        .prepare('SELECT encrypted_password FROM smtp_credentials WHERE id = ?')
        .get('default') as { encrypted_password: string } | undefined;
      assert.ok(smtpRow?.encrypted_password, 'SMTP credential row must exist inside SQLite database');
      assert.equal(
        smtpRow!.encrypted_password.includes(secretPass),
        false,
        'Plaintext SMTP secret must be encrypted inside database'
      );

      const staffCountRow = db
        .prepare('SELECT COUNT(*) AS cnt FROM staff_accounts WHERE LENGTH(password_hash) > 20 AND LENGTH(password_salt) > 10')
        .get() as { cnt: number };
      assert.ok(
        staffCountRow.cnt >= ALL_STAFF_ROLES.length,
        'All staff credentials must be scrypt-hashed inside staff_accounts DB table'
      );
    });

    // 9. Production fail-closed verification
    await runCheck('Production mode fails closed without Supabase Auth configured', async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevAllow = process.env.ALLOW_LOCAL_DEV_AUTH;
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOW_LOCAL_DEV_AUTH;
      try {
        const prodLogin = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernameOrEmail: 'superadmin', password: TEST_ACCOUNTS[0].password }),
        });
        assert.equal(prodLogin.status, 503);
      } finally {
        process.env.NODE_ENV = prevEnv;
        if (prevAllow !== undefined) process.env.ALLOW_LOCAL_DEV_AUTH = prevAllow;
      }
    });

    // 10. Static Security Audit: RLS Migration + Zero Client Passwords + Production Bundle Check
    await runCheck('Supabase RLS migration, frontend source, and production dist bundle pass security audit', () => {
      const migrationSql = fs.readFileSync(
        path.resolve(ROOT, 'supabase/migrations/202611160001_p0_security_auth_rbac_rls.sql'),
        'utf8'
      );
      assert.ok(migrationSql.includes('DROP COLUMN IF EXISTS password'));
      assert.ok(migrationSql.includes('SECURITY DEFINER'));
      assert.ok(migrationSql.includes('CREATE POLICY "bookings_staff_select"'));
      assert.ok(migrationSql.includes('CREATE POLICY "smtp_settings_admin_only"'));
      assert.equal(
        /CREATE POLICY\s+"[^"]+"\s+ON public\.(bookings|staff_users|audit_logs|hotel_config|smtp_settings|email_otp_verifications)[^;]*?(USING|WITH CHECK)\s*\(\s*true\s*\)/i.test(
          migrationSql
        ),
        false
      );

      const srcFiles: string[] = [];
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (/\.(ts|tsx)$/.test(entry.name)) srcFiles.push(full);
        }
      };
      walk(path.resolve(ROOT, 'src'));

      const forbiddenLiterals = [
        ['Kamal', 'Hotel@2026'].join(''),
        ['Admin', '@2026'].join(''),
        ['Manager', '@2026'].join(''),
        ['Reception', '@2026'].join(''),
        ['Owner', '@2026'].join(''),
        ['Chef', '@2026'].join(''),
        ['Waiter', '@2026'].join(''),
        ['Clean', '@2026'].join(''),
        ['hotel', '@123'].join(''),
      ];
      for (const file of srcFiles) {
        const content = fs.readFileSync(file, 'utf8');
        for (const lit of forbiddenLiterals) {
          assert.equal(content.includes(lit), false, `Forbidden password literal found in ${file}`);
        }
        assert.equal(content.includes("localStorage.setItem('kamal_hotel_session'"), false, `Forbidden localStorage session write in ${file}`);
      }

      const distAssetsDir = path.resolve(ROOT, 'dist/assets');
      if (fs.existsSync(distAssetsDir)) {
        for (const f of fs.readdirSync(distAssetsDir)) {
          if (!f.endsWith('.js')) continue;
          const bundleContent = fs.readFileSync(path.join(distAssetsDir, f), 'utf8');
          for (const lit of forbiddenLiterals) {
            assert.equal(bundleContent.includes(lit), false, `Forbidden password literal leaked into dist/assets/${f}`);
          }
          assert.equal(bundleContent.includes('Role Simulator:'), false, `RoleSwitcherBar leaked into prod bundle dist/assets/${f}`);
          assert.equal(bundleContent.includes('Quick Test Credentials'), false, `Demo autofill leaked into prod bundle dist/assets/${f}`);
        }
      }
    });

    console.log(`\nALL P0 SECURITY CHECKS PASSED (${passedCount}/10 test groups).`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));

    if (fs.existsSync(LEGACY_STAFF_STORE_FILE)) fs.unlinkSync(LEGACY_STAFF_STORE_FILE);
    if (fs.existsSync(LEGACY_SMTP_STORE_FILE)) fs.unlinkSync(LEGACY_SMTP_STORE_FILE);

    closeSqliteDb();
    fs.rmSync(tmpP0Dir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('SECURITY TEST FAILED:', err);
  process.exit(1);
});
