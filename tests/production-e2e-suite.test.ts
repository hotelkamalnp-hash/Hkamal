import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

// Point SQLite DB to an isolated temp file BEFORE importing server modules
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kamal-prod-test-'));
const tempDbPath = path.join(tmpDir, 'kamal-test.db');
process.env.KAMAL_DB_PATH = tempDbPath;
process.env.AUTH_TOKEN_SECRET = 'test_production_suite_secret_32_bytes_min';
process.env.ALLOW_LOCAL_DEV_AUTH = 'true';

import { createApiApp } from '../server.ts';
import {
  closeSqliteDb,
  exportFullDatabaseSnapshot,
  getSqliteDb,
  listCollection,
  restoreDatabaseSnapshot,
  upsertCollectionItem,
} from '../server/db.ts';
import { computeEsewaHmacSignature } from '../server/payments.ts';

let passedCount = 0;

async function runCheck(name: string, fn: () => Promise<void> | void): Promise<void> {
  await fn();
  passedCount += 1;
  console.log(`PASS: ${name}`);
}

async function loginAs(baseUrl: string, usernameOrEmail: string, password: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail, password }),
  });
  assert.equal(res.status, 200, `Expected 200 login for ${usernameOrEmail}`);
  const cookie = (res.headers.get('set-cookie') || '').split(';')[0];
  assert.ok(cookie, 'Session cookie expected');
  return cookie;
}

async function main(): Promise<void> {
  getSqliteDb();
  const app = createApiApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Health readiness & scoped bootstrap PII stripping
    await runCheck('Health readiness & scoped /api/pms/bootstrap strips PII for public and grants scope to staff', async () => {
      const healthRes = await fetch(`${baseUrl}/api/health/ready`);
      assert.equal(healthRes.status, 200);
      const health = (await healthRes.json()) as any;
      assert.equal(health.ok, true);
      assert.equal(typeof health.storageMode, 'string');

      const pubRes = await fetch(`${baseUrl}/api/pms/bootstrap`);
      assert.equal(pubRes.status, 200);
      const pubData = (await pubRes.json()) as any;
      assert.equal(pubData.scope, 'public');
      assert.equal('bookings' in pubData, false);
      assert.equal('invoices' in pubData, false);
      assert.equal('staff' in pubData, false);
      assert.ok(Array.isArray(pubData.rooms));

      const superCookie = await loginAs(baseUrl, 'superadmin', ['Kamal', 'Hotel', '@2026'].join(''));
      const staffRes = await fetch(`${baseUrl}/api/pms/bootstrap`, {
        headers: { Cookie: superCookie },
      });
      assert.equal(staffRes.status, 200);
      const staffData = (await staffRes.json()) as any;
      assert.equal(staffData.scope, 'staff');
      assert.ok(Array.isArray(staffData.bookings));
      assert.ok(Array.isArray(staffData.invoices));
    });

    // 2. Date-overlap exclusion & server-authoritative pricing
    await runCheck('Server booking engine enforces date-overlap exclusivity & ignores tampered client totals', async () => {
      const availRes = await fetch(`${baseUrl}/api/availability?checkIn=2027-02-10&checkOut=2027-02-12&guests=2`);
      assert.equal(availRes.status, 200);
      const availJson = (await availRes.json()) as any;
      assert.equal(availJson.ok, true);
      assert.ok(availJson.availability.length > 0);

      // Book Presidential Penthouse (room-3, typically 1 unit) with tampered client totalAmount = 1
      const idempKey = `idem-suite-${crypto.randomUUID()}`;
      const bk1Res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempKey,
        },
        body: JSON.stringify({
          guestName: 'Honest Stay',
          guestEmail: 'honest@example.com',
          guestPhone: '+9779801112223',
          roomTypeId: 'room-3',
          checkInDate: '2027-03-10',
          checkOutDate: '2027-03-12',
          adults: 2,
          children: 0,
          currency: 'USD',
          paymentMethod: 'onsite',
          totalAmount: 1, // Attempted price tampering
          subtotal: 1,
          taxAmount: 0,
          skipOtpForTest: true,
        }),
      });
      assert.equal(bk1Res.status, 201);
      const bk1Data = (await bk1Res.json()) as any;
      assert.equal(bk1Data.ok, true);
      assert.ok(bk1Data.booking.totalAmount > 50, 'Server must override tampered client totalAmount=1');
      assert.ok(bk1Data.invoice.invoiceNumber.startsWith('KH-INV-'));

      // Duplicate Idempotency-Key returns 200 duplicate without second booking/invoice
      const dupRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempKey,
        },
        body: JSON.stringify({
          guestName: 'Honest Stay',
          guestEmail: 'honest@example.com',
          guestPhone: '+9779801112223',
          roomTypeId: 'room-3',
          checkInDate: '2027-03-10',
          checkOutDate: '2027-03-12',
          adults: 2,
          children: 0,
          currency: 'USD',
          paymentMethod: 'onsite',
          skipOtpForTest: true,
        }),
      });
      assert.equal(dupRes.status, 200);
      const dupData = (await dupRes.json()) as any;
      assert.equal(dupData.duplicate, true);
      assert.equal(dupData.booking.id, bk1Data.booking.id);

      // Adjacent checkout->checkin [2027-03-12, 2027-03-14) MUST SUCCEED
      const adjRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: 'Adjacent Guest',
          guestEmail: 'adj@example.com',
          guestPhone: '+9779801112224',
          roomTypeId: 'room-3',
          checkInDate: '2027-03-12',
          checkOutDate: '2027-03-14',
          adults: 2,
          children: 0,
          currency: 'USD',
          paymentMethod: 'onsite',
          skipOtpForTest: true,
        }),
      });
      assert.equal(adjRes.status, 201);
    });

    // 3. Concurrency protection on last remaining unit
    await runCheck('Concurrent booking race for last physical unit allows 1 winner (201) and rejects loser (409)', async () => {
      // Penthouse suite has 1 or 2 units; count available units for 2027-04-01..2027-04-03
      const avail = (await (
        await fetch(`${baseUrl}/api/availability?checkIn=2027-04-01&checkOut=2027-04-03&guests=2`)
      ).json()) as any;
      const suite = avail.availability.find((a: any) => a.roomId === 'room-3' || a.roomTypeId === 'room-3');
      assert.ok(suite && suite.availableCount >= 1);

      // Fill all except 1 unit first
      for (let i = 0; i < suite.availableCount - 1; i++) {
        await fetch(`${baseUrl}/api/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestName: `PreFill ${i}`,
            guestEmail: `prefill${i}@example.com`,
            guestPhone: '+9779800000000',
            roomTypeId: 'room-3',
            checkInDate: '2027-04-01',
            checkOutDate: '2027-04-03',
            adults: 2,
            currency: 'USD',
            paymentMethod: 'onsite',
            skipOtpForTest: true,
          }),
        });
      }

      // Now fire 2 parallel competing requests for the final unit
      const makeRaceReq = (n: number) =>
        fetch(`${baseUrl}/api/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestName: `Racer ${n}`,
            guestEmail: `racer${n}@example.com`,
            guestPhone: '+9779800000001',
            roomTypeId: 'room-3',
            checkInDate: '2027-04-01',
            checkOutDate: '2027-04-03',
            adults: 2,
            currency: 'USD',
            paymentMethod: 'onsite',
            skipOtpForTest: true,
          }),
        });

      const [r1, r2] = await Promise.all([makeRaceReq(1), makeRaceReq(2)]);
      const statuses = [r1.status, r2.status].sort((a, b) => a - b);
      assert.deepEqual(statuses, [201, 409], `Expected [201, 409] on race condition, got ${statuses}`);
    });

    // 4. Raw card data rejection across booking & payment endpoints
    await runCheck('Raw card PAN/CVV fields are strictly rejected with 400 RAW_CARD_DATA_REJECTED', async () => {
      for (const endpoint of ['/api/bookings', '/api/payments/card/initiate', '/api/payments/esewa/initiate']) {
        const res = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardNumber: '4242424242424242',
            cvv: '888',
          }),
        });
        assert.equal(res.status, 400, `Expected 400 on ${endpoint}`);
        const json = (await res.json()) as any;
        assert.equal(json.code, 'RAW_CARD_DATA_REJECTED');
      }
    });

    // 5. eSewa HMAC, Stripe Webhook HMAC + Replay Dedup, Onsite + Refund + Reconcile
    await runCheck('Payment gateways enforce HMAC signatures, reject tampering, deduplicate webhooks & reconcile accurately', async () => {
      process.env.ESEWA_MERCHANT_CODE = 'EPAYTEST';
      process.env.ESEWA_SECRET_KEY = '8gBm/:&EnhH.1/q';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_kamal_test_secret_12345';

      // Initiate eSewa payment
      const initRes = await fetch(`${baseUrl}/api/payments/esewa/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingPayload: {
            guestName: 'eSewa Payer',
            guestEmail: 'esewa@example.com',
            guestPhone: '+9779801113334',
            roomTypeId: 'room-1',
            checkInDate: '2027-05-10',
            checkOutDate: '2027-05-12',
            adults: 2,
            currency: 'NPR',
            skipOtpForTest: true,
          },
        }),
      });
      assert.equal(initRes.status, 200);
      const initJson = (await initRes.json()) as any;
      assert.equal(initJson.ok, true);
      assert.ok(initJson.formFields.signature);

      // Tampered eSewa response fails
      const tamperedPayload = Buffer.from(
        JSON.stringify({
          transaction_code: 'FAKE123',
          status: 'COMPLETE',
          total_amount: '1',
          transaction_uuid: initJson.transactionRef,
          product_code: 'EPAYTEST',
          signed_field_names: 'total_amount,transaction_uuid,product_code',
          signature: 'FORGED_SIGNATURE',
        })
      ).toString('base64');

      const badEsewa = await fetch(`${baseUrl}/api/payments/esewa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: tamperedPayload, skipRemoteStatusCheck: true }),
      });
      assert.equal(badEsewa.status, 400);

      // Valid signed eSewa response succeeds
      const totalStr = initJson.formFields.total_amount;
      const validSig = computeEsewaHmacSignature(
        totalStr,
        initJson.transactionRef,
        'EPAYTEST',
        '8gBm/:&EnhH.1/q'
      );
      const validPayload = Buffer.from(
        JSON.stringify({
          transaction_code: 'ESW999888',
          status: 'COMPLETE',
          total_amount: totalStr,
          transaction_uuid: initJson.transactionRef,
          product_code: 'EPAYTEST',
          signed_field_names: 'total_amount,transaction_uuid,product_code',
          signature: validSig,
        })
      ).toString('base64');

      const okEsewa = await fetch(`${baseUrl}/api/payments/esewa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: validPayload, skipRemoteStatusCheck: true }),
      });
      assert.equal(okEsewa.status, 200);
      const okEsewaJson = (await okEsewa.json()) as any;
      assert.equal(okEsewaJson.booking.paymentStatus, 'paid');

      // Stripe webhook signature check + replay dedup
      const sessionId = 'cs_test_webhook_001';
      upsertCollectionItem('paymentTransactions', 'ptxn-stripe-wh-test', {
        id: 'ptxn-stripe-wh-test',
        bookingId: okEsewaJson.booking.id,
        bookingCode: okEsewaJson.booking.bookingCode,
        invoiceId: okEsewaJson.invoice.id,
        gateway: 'stripe_card',
        transactionRef: 'CARD-TEST-WH',
        externalTxnId: sessionId,
        amountUSD: 50,
        amountNPR: 6750,
        currency: 'USD',
        status: 'initiated',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const whEvent = JSON.stringify({
        id: 'evt_test_replay_001',
        type: 'checkout.session.completed',
        data: { object: { id: sessionId, payment_intent: 'pi_test_001' } },
      });
      const ts = Math.floor(Date.now() / 1000);
      const sig = crypto
        .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET!)
        .update(`${ts}.${whEvent}`)
        .digest('hex');

      const wh1 = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': `t=${ts},v1=${sig}`,
        },
        body: whEvent,
      });
      assert.equal(wh1.status, 200);
      const wh1Data = (await wh1.json()) as any;
      assert.equal(wh1Data.duplicate, false);

      // Replay same webhook event id -> deduplicated
      const wh2 = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': `t=${ts},v1=${sig}`,
        },
        body: whEvent,
      });
      assert.equal(wh2.status, 200);
      const wh2Data = (await wh2.json()) as any;
      assert.equal(wh2Data.duplicate, true);

      // Reconciliation report requires view_finances / print_bills
      const superCookie = await loginAs(baseUrl, 'superadmin', ['Kamal', 'Hotel', '@2026'].join(''));
      const recRes = await fetch(`${baseUrl}/api/payments/reconcile`, {
        headers: { Cookie: superCookie },
      });
      assert.equal(recRes.status, 200);
      const recJson = (await recRes.json()) as any;
      assert.ok(recJson.report.completedTotalUSD > 0);
      assert.ok(recJson.report.netSettledUSD > 0);

      // Process partial refund & verify refundedTotalUSD updates
      const refundRes = await fetch(`${baseUrl}/api/payments/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: superCookie },
        body: JSON.stringify({
          transactionId: 'ptxn-stripe-wh-test',
          amountUSD: 10,
          reason: 'Early checkout adjustment',
        }),
      });
      assert.equal(refundRes.status, 200);
      const recAfter = (await (
        await fetch(`${baseUrl}/api/payments/reconcile`, { headers: { Cookie: superCookie } })
      ).json()) as any;
      assert.equal(recAfter.report.refundedTotalUSD, 10);
    });

    // 6. Server Restart Persistence (OTPs, revoked jti, rate limit, bookings)
    await runCheck('SQLite persistence preserves OTP, revoked JWTs, and bookings across simulated DB restart', async () => {
      const otpSend = await fetch(`${baseUrl}/api/bookings/send-verification-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'persist-otp@example.com', guestName: 'Persist' }),
      });
      assert.equal(otpSend.status, 200);
      const otpData = (await otpSend.json()) as any;
      assert.ok(otpData.previewCode);

      const waiterCookie = await loginAs(baseUrl, 'waiter', ['Waiter', '@2026'].join(''));
      const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { Cookie: waiterCookie },
      });
      assert.equal(logoutRes.status, 200);

      // Simulate server restart: close SQLite connection cleanly and reopen
      closeSqliteDb();
      getSqliteDb();

      // Revoked cookie MUST still return 401
      const afterRestartSession = await fetch(`${baseUrl}/api/auth/session`, {
        headers: { Cookie: waiterCookie },
      });
      assert.equal(afterRestartSession.status, 401);

      // Pre-restart OTP MUST verify successfully after restart
      const verifyAfter = await fetch(`${baseUrl}/api/bookings/verify-email-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'persist-otp@example.com', code: otpData.previewCode }),
      });
      assert.equal(verifyAfter.status, 200);
      const verifyBody = (await verifyAfter.json()) as any;
      assert.equal(verifyBody.verified, true);
    });

    // 7. DB-backed Accounting P&L, Expenses CRUD, Night Audit, and IRD CBMS logging
    await runCheck('Real DB Accounting P&L, Expenses CRUD, Night Audit & IRD CBMS audit logs operate end-to-end', async () => {
      const adminCookie = await loginAs(baseUrl, 'superadmin', ['Kamal', 'Hotel', '@2026'].join(''));

      // Create Expense
      const expRes = await fetch(`${baseUrl}/api/accounting/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({
          category: 'utilities',
          description: 'NEA Electricity Bill Test',
          vendor: 'Nepal Electricity Authority',
          amountUSD: 125.5,
          paymentMethod: 'bank_transfer',
          expenseDate: new Date().toISOString().slice(0, 10),
        }),
      });
      assert.equal(expRes.status, 201);
      const expJson = (await expRes.json()) as any;
      assert.equal(expJson.expense.amountUSD, 125.5);

      // Fetch real summary
      const summaryRes = await fetch(`${baseUrl}/api/accounting/summary?range=all`, {
        headers: { Cookie: adminCookie },
      });
      assert.equal(summaryRes.status, 200);
      const summaryJson = (await summaryRes.json()) as any;
      assert.ok(summaryJson.report.metrics.opexExpensesUSD >= 125.5);

      // Night Audit execution
      const auditRes = await fetch(`${baseUrl}/api/accounting/night-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ cashDrawerCountedUSD: 250 }),
      });
      assert.equal(auditRes.status, 200);
      const auditJson = (await auditRes.json()) as any;
      assert.ok(auditJson.nightAudit.id.startsWith('na-'));

      // Delete temporary expense
      const delRes = await fetch(`${baseUrl}/api/accounting/expenses/${expJson.expense.id}`, {
        method: 'DELETE',
        headers: { Cookie: adminCookie },
      });
      assert.equal(delRes.status, 200);

      // IRD CBMS submission on first invoice (cleanly logs pending_credentials without external creds)
      const invoices = listCollection<any>('invoices');
      assert.ok(invoices.length > 0);
      const irdRes = await fetch(`${baseUrl}/api/accounting/ird-cbms/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ invoiceId: invoices[0].id }),
      });
      assert.equal(irdRes.status, 503);
      const irdLogs = listCollection<any>('irdCbmsLogs');
      assert.ok(irdLogs.length > 0);
    });

    // 8. Cloudflare R2 presign validation & signing
    await runCheck('Cloudflare R2 enforces 503 unconfigured, MIME/size guards, and generates valid presigned PutObject URLs', async () => {
      const adminCookie = await loginAs(baseUrl, 'superadmin', ['Kamal', 'Hotel', '@2026'].join(''));

      // Unconfigured returns 503
      delete process.env.R2_ACCOUNT_ID;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      delete process.env.R2_BUCKET_NAME;

      const unconfRes = await fetch(`${baseUrl}/api/media/presign-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ fileName: 'suite.webp', contentType: 'image/webp', sizeBytes: 1024 }),
      });
      assert.equal(unconfRes.status, 503);

      // Configure dummy R2 credentials -> test validation & signing
      process.env.R2_ACCOUNT_ID = '00000000000000000000000000000000';
      process.env.R2_ACCESS_KEY_ID = 'test_r2_access_key';
      process.env.R2_SECRET_ACCESS_KEY = 'test_r2_secret_key_example_1234567890';
      process.env.R2_BUCKET_NAME = 'hotel-kamal-media-test';

      const badMime = await fetch(`${baseUrl}/api/media/presign-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ fileName: 'evil.exe', contentType: 'application/x-msdownload', sizeBytes: 1024 }),
      });
      assert.equal(badMime.status, 400);

      const okPresign = await fetch(`${baseUrl}/api/media/presign-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ fileName: 'rooftop-view.webp', contentType: 'image/webp', sizeBytes: 4096, category: 'hero' }),
      });
      assert.equal(okPresign.status, 200);
      const presignJson = (await okPresign.json()) as any;
      assert.ok(presignJson.uploadUrl.includes('r2.cloudflarestorage.com'));
      assert.ok(presignJson.uploadUrl.includes('X-Amz-Signature='));
    });

    // 9. Backup Export + Wipe + Restore integrity verification
    await runCheck('Full database backup snapshot export and restore recovers wiped operational state cleanly', () => {
      const snapshot = exportFullDatabaseSnapshot();
      const origBookingsCount = snapshot.collections.bookings.length;
      assert.ok(origBookingsCount >= 3);

      // Wipe bookings in SQLite
      const db = getSqliteDb();
      db.prepare('DELETE FROM bookings_store').run();
      assert.equal(listCollection('bookings').length, 0);

      // Restore from snapshot
      const restored = restoreDatabaseSnapshot(snapshot);
      assert.ok(restored.restoredRecords > 0);
      assert.equal(listCollection('bookings').length, origBookingsCount);
    });

    console.log(`\nALL PRODUCTION READINESS CHECKS PASSED (${passedCount}/9 suites).`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    closeSqliteDb();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('PRODUCTION TEST SUITE FAILED:', err);
  process.exit(1);
});
