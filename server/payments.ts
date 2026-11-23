import crypto from 'crypto';
import type {
  Booking,
  HotelThemeConfig,
  MasterInvoice,
  PaymentMethod,
} from '../src/types/hotel';
import {
  getCollectionItem,
  getKvSetting,
  listCollection,
  recordWebhookEventIfNew,
  runInSqliteTransaction,
  upsertCollectionItem,
  type PaymentTransactionRecord,
} from './db.ts';
import { calculateAuthoritativeQuote, createBookingTransactional } from './bookingEngine.ts';
import { broadcastRealtimeEvent } from './realtime.ts';

export function containsRawCardData(body: Record<string, unknown> | undefined | null): boolean {
  if (!body || typeof body !== 'object') return false;
  const forbiddenKeys = [
    'cardNumber',
    'card_number',
    'pan',
    'cvv',
    'cvc',
    'cvv2',
    'securityCode',
    'cardExpiry',
    'card_expiry',
    'trackData',
  ];
  return forbiddenKeys.some((k) => {
    const val = body[k];
    return val !== undefined && val !== null && String(val).trim() !== '';
  });
}

export function getPaymentGatewayStatus() {
  const esewaCode = (process.env.ESEWA_MERCHANT_CODE || '').trim();
  const esewaSecret = (process.env.ESEWA_SECRET_KEY || '').trim();
  const khaltiKey = (process.env.KHALTI_SECRET_KEY || '').trim();
  const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  const stripeWebhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();

  return {
    esewa: {
      configured: Boolean(esewaCode && esewaSecret),
      env: (process.env.ESEWA_ENV || 'sandbox').trim(),
      merchantCodeConfigured: Boolean(esewaCode),
    },
    khalti: {
      configured: Boolean(khaltiKey),
      env: (process.env.KHALTI_ENV || 'sandbox').trim(),
    },
    stripeCard: {
      configured: Boolean(stripeKey),
      webhookConfigured: Boolean(stripeWebhookSecret),
    },
  };
}

export function computeEsewaHmacSignature(
  totalAmountStr: string,
  transactionUuid: string,
  productCode: string,
  secretKey: string
): string {
  const message = `total_amount=${totalAmountStr},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

export function verifyEsewaSignedResponsePayload(
  base64Data: string,
  secretKey: string
): { valid: boolean; parsed?: Record<string, any> } {
  try {
    const jsonStr = Buffer.from(base64Data, 'base64').toString('utf8');
    const parsed = JSON.parse(jsonStr) as Record<string, any>;
    const signedFieldNames = String(parsed.signed_field_names || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!signedFieldNames.length || !parsed.signature) {
      return { valid: false };
    }
    const message = signedFieldNames.map((f) => `${f}=${parsed[f] ?? ''}`).join(',');
    const expectedSig = crypto.createHmac('sha256', secretKey).update(message).digest('base64');
    const a = Buffer.from(String(parsed.signature));
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false };
    }
    return { valid: true, parsed };
  } catch {
    return { valid: false };
  }
}

export function verifyStripeWebhookSignature(
  rawBody: Buffer | string,
  sigHeader: string,
  webhookSecret: string,
  toleranceSeconds = 300
): boolean {
  if (!sigHeader || !webhookSecret) return false;
  const parts = sigHeader.split(',').reduce<Record<string, string[]>>((acc, part) => {
    const [k, v] = part.split('=');
    if (k && v) {
      if (!acc[k]) acc[k] = [];
      acc[k].push(v);
    }
    return acc;
  }, {});

  const timestamp = Number(parts.t?.[0] || 0);
  const signatures = parts.v1 || [];
  if (!timestamp || !signatures.length) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestamp) > toleranceSeconds) return false;

  const signedPayload = `${timestamp}.${Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody}`;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  return signatures.some((sig) => {
    try {
      const actualBuf = Buffer.from(sig, 'hex');
      return actualBuf.length === expectedBuf.length && crypto.timingSafeEqual(actualBuf, expectedBuf);
    } catch {
      return false;
    }
  });
}

function getAppBaseUrl(reqOrigin?: string): string {
  const configured = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (configured && !configured.includes('MY_APP_URL')) return configured;
  if (reqOrigin) return reqOrigin.replace(/\/+$/, '');
  return 'http://localhost:3000';
}

export async function initiateEsewaPayment(params: {
  bookingId?: string;
  bookingPayload?: any;
  reqOrigin?: string;
  idempotencyKey?: string;
}): Promise<
  | {
      ok: true;
      gateway: 'esewa';
      actionUrl: string;
      formFields: Record<string, string>;
      transactionRef: string;
      booking: Booking;
      invoice: MasterInvoice;
    }
  | { ok: false; status: number; code: string; message: string }
> {
  const merchantCode = (process.env.ESEWA_MERCHANT_CODE || '').trim();
  const secretKey = (process.env.ESEWA_SECRET_KEY || '').trim();
  if (!merchantCode || !secretKey) {
    return {
      ok: false,
      status: 503,
      code: 'ESEWA_NOT_CONFIGURED',
      message:
        'eSewa ePay v2 merchant credentials (ESEWA_MERCHANT_CODE, ESEWA_SECRET_KEY) are not configured on the server.',
    };
  }

  let booking: Booking;
  let invoice: MasterInvoice;
  if (params.bookingId) {
    const b = getCollectionItem<Booking>('bookings', params.bookingId);
    if (!b) return { ok: false, status: 404, code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' };
    booking = b;
    const inv = listCollection<MasterInvoice>('invoices').find((i) => i.bookingCode === b.bookingCode);
    if (!inv) return { ok: false, status: 404, code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' };
    invoice = inv;
  } else {
    const created = createBookingTransactional(
      { ...params.bookingPayload, paymentMethod: 'esewa', idempotencyKey: params.idempotencyKey },
      { initialPaymentStatus: 'pending' }
    );
    if (!created.ok) return created;
    booking = created.booking;
    invoice = created.invoice;
  }

  const theme = getKvSetting<HotelThemeConfig>('themeConfig', {} as HotelThemeConfig);
  const nprRate = theme.exchangeRates?.NPR || 135;
  const amountNPR = Math.round((invoice.balanceDueUSD > 0 ? invoice.balanceDueUSD : invoice.grandTotalUSD) * nprRate);
  const transactionRef = `ESEWA-${booking.bookingCode}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const totalAmountStr = String(amountNPR);
  const signature = computeEsewaHmacSignature(totalAmountStr, transactionRef, merchantCode, secretKey);

  const nowIso = new Date().toISOString();
  const txn: PaymentTransactionRecord = {
    id: `ptxn-${crypto.randomUUID().slice(0, 10)}`,
    idempotencyKey: params.idempotencyKey,
    bookingId: booking.id,
    bookingCode: booking.bookingCode,
    invoiceId: invoice.id,
    gateway: 'esewa',
    transactionRef,
    amountUSD: invoice.balanceDueUSD > 0 ? invoice.balanceDueUSD : invoice.grandTotalUSD,
    amountNPR,
    currency: 'NPR',
    status: 'initiated',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  upsertCollectionItem('paymentTransactions', txn.id, txn);

  const baseUrl = getAppBaseUrl(params.reqOrigin);
  const isProd = (process.env.ESEWA_ENV || 'sandbox') === 'production';
  const actionUrl = isProd
    ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
    : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

  return {
    ok: true,
    gateway: 'esewa',
    actionUrl,
    transactionRef,
    booking,
    invoice,
    formFields: {
      amount: totalAmountStr,
      tax_amount: '0',
      total_amount: totalAmountStr,
      transaction_uuid: transactionRef,
      product_code: merchantCode,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: `${baseUrl}/?payment=esewa_success&ref=${encodeURIComponent(transactionRef)}`,
      failure_url: `${baseUrl}/?payment=esewa_failed&ref=${encodeURIComponent(transactionRef)}`,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature,
    },
  };
}

export async function verifyEsewaCallback(params: {
  encodedData: string;
  skipRemoteStatusCheck?: boolean;
}): Promise<
  | { ok: true; duplicate: boolean; transaction: PaymentTransactionRecord; booking?: Booking; invoice?: MasterInvoice }
  | { ok: false; status: number; code: string; message: string }
> {
  const secretKey = (process.env.ESEWA_SECRET_KEY || '').trim();
  const merchantCode = (process.env.ESEWA_MERCHANT_CODE || '').trim();
  if (!secretKey || !merchantCode) {
    return {
      ok: false,
      status: 503,
      code: 'ESEWA_NOT_CONFIGURED',
      message: 'eSewa server credentials missing.',
    };
  }

  const check = verifyEsewaSignedResponsePayload(params.encodedData, secretKey);
  if (!check.valid || !check.parsed) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_ESEWA_SIGNATURE',
      message: 'eSewa callback HMAC signature verification failed.',
    };
  }

  const { transaction_uuid, total_amount, status, transaction_code } = check.parsed;
  const txns = listCollection<PaymentTransactionRecord>('paymentTransactions');
  const txn = txns.find((t) => t.transactionRef === transaction_uuid);
  if (!txn) {
    return { ok: false, status: 404, code: 'TXN_NOT_FOUND', message: 'Payment transaction reference not found.' };
  }

  if (txn.status === 'completed') {
    const bk = txn.bookingId ? getCollectionItem<Booking>('bookings', txn.bookingId) || undefined : undefined;
    const inv = txn.invoiceId ? getCollectionItem<MasterInvoice>('invoices', txn.invoiceId) || undefined : undefined;
    return { ok: true, duplicate: true, transaction: txn, booking: bk, invoice: inv };
  }

  const paidAmountNPR = Math.round(Number(String(total_amount || 0).replace(/,/g, '')));
  if (Math.abs(paidAmountNPR - txn.amountNPR) > 2) {
    return {
      ok: false,
      status: 400,
      code: 'AMOUNT_MISMATCH',
      message: `eSewa paid amount NPR ${paidAmountNPR} does not match expected NPR ${txn.amountNPR}.`,
    };
  }

  if (!params.skipRemoteStatusCheck) {
    const isProd = (process.env.ESEWA_ENV || 'sandbox') === 'production';
    const statusBase = isProd
      ? 'https://epay.esewa.com.np/api/epay/transaction/status/'
      : 'https://rc-epay.esewa.com.np/api/epay/transaction/status/';
    const url = `${statusBase}?product_code=${encodeURIComponent(merchantCode)}&total_amount=${txn.amountNPR}&transaction_uuid=${encodeURIComponent(txn.transactionRef)}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return { ok: false, status: 502, code: 'ESEWA_LOOKUP_FAILED', message: `eSewa status lookup HTTP ${resp.status}.` };
    }
    const statusJson = (await resp.json()) as { status?: string };
    if (statusJson.status !== 'COMPLETE') {
      return {
        ok: false,
        status: 400,
        code: 'ESEWA_INCOMPLETE',
        message: `eSewa transaction status is ${statusJson.status || 'unknown'}.`,
      };
    }
  } else if (String(status).toUpperCase() !== 'COMPLETE') {
    return {
      ok: false,
      status: 400,
      code: 'ESEWA_INCOMPLETE',
      message: `eSewa payload status is ${status}.`,
    };
  }

  const result = finalizeSuccessfulPaymentTransaction(
    txn,
    String(transaction_code || transaction_uuid),
    'esewa',
    check.parsed
  );
  return { ok: true, duplicate: false, ...result };
}

export async function initiateKhaltiPayment(params: {
  bookingId?: string;
  bookingPayload?: any;
  reqOrigin?: string;
  idempotencyKey?: string;
}): Promise<
  | {
      ok: true;
      gateway: 'khalti';
      pidx: string;
      paymentUrl: string;
      transactionRef: string;
      booking: Booking;
      invoice: MasterInvoice;
    }
  | { ok: false; status: number; code: string; message: string }
> {
  const secretKey = (process.env.KHALTI_SECRET_KEY || '').trim();
  if (!secretKey) {
    return {
      ok: false,
      status: 503,
      code: 'KHALTI_NOT_CONFIGURED',
      message: 'Khalti ePayment v2 server secret (KHALTI_SECRET_KEY) is not configured on the server.',
    };
  }

  let booking: Booking;
  let invoice: MasterInvoice;
  if (params.bookingId) {
    const b = getCollectionItem<Booking>('bookings', params.bookingId);
    if (!b) return { ok: false, status: 404, code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' };
    booking = b;
    const inv = listCollection<MasterInvoice>('invoices').find((i) => i.bookingCode === b.bookingCode);
    if (!inv) return { ok: false, status: 404, code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' };
    invoice = inv;
  } else {
    const created = createBookingTransactional(
      { ...params.bookingPayload, paymentMethod: 'khalti', idempotencyKey: params.idempotencyKey },
      { initialPaymentStatus: 'pending' }
    );
    if (!created.ok) return created;
    booking = created.booking;
    invoice = created.invoice;
  }

  const theme = getKvSetting<HotelThemeConfig>('themeConfig', {} as HotelThemeConfig);
  const nprRate = theme.exchangeRates?.NPR || 135;
  const amountNPR = Math.round((invoice.balanceDueUSD > 0 ? invoice.balanceDueUSD : invoice.grandTotalUSD) * nprRate);
  const amountPaisa = amountNPR * 100;
  const transactionRef = `KHALTI-${booking.bookingCode}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

  const isProd = (process.env.KHALTI_ENV || 'sandbox') === 'production';
  const endpoint = isProd
    ? 'https://khalti.com/api/v2/epay/initiate/'
    : 'https://a.khalti.com/api/v2/epay/initiate/';
  const baseUrl = getAppBaseUrl(params.reqOrigin);

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Key ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      return_url: `${baseUrl}/?payment=khalti_callback&ref=${encodeURIComponent(transactionRef)}`,
      website_url: baseUrl,
      amount: amountPaisa,
      purchase_order_id: transactionRef,
      purchase_order_name: `Kamal Hotel Stay ${booking.bookingCode}`,
      customer_info: {
        name: booking.guestName,
        email: booking.guestEmail,
        phone: booking.guestPhone,
      },
    }),
  });

  const data = (await resp.json().catch(() => ({}))) as { pidx?: string; payment_url?: string; detail?: string };
  if (!resp.ok || !data.pidx || !data.payment_url) {
    return {
      ok: false,
      status: 502,
      code: 'KHALTI_INITIATE_FAILED',
      message: data.detail || `Khalti initiate returned HTTP ${resp.status}.`,
    };
  }

  const nowIso = new Date().toISOString();
  const txn: PaymentTransactionRecord = {
    id: `ptxn-${crypto.randomUUID().slice(0, 10)}`,
    idempotencyKey: params.idempotencyKey,
    bookingId: booking.id,
    bookingCode: booking.bookingCode,
    invoiceId: invoice.id,
    gateway: 'khalti',
    transactionRef,
    externalTxnId: data.pidx,
    amountUSD: invoice.balanceDueUSD > 0 ? invoice.balanceDueUSD : invoice.grandTotalUSD,
    amountNPR,
    currency: 'NPR',
    status: 'initiated',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  upsertCollectionItem('paymentTransactions', txn.id, txn);

  return {
    ok: true,
    gateway: 'khalti',
    pidx: data.pidx,
    paymentUrl: data.payment_url,
    transactionRef,
    booking,
    invoice,
  };
}

export async function verifyKhaltiPidx(pidx: string): Promise<
  | { ok: true; duplicate: boolean; transaction: PaymentTransactionRecord; booking?: Booking; invoice?: MasterInvoice }
  | { ok: false; status: number; code: string; message: string }
> {
  const secretKey = (process.env.KHALTI_SECRET_KEY || '').trim();
  if (!secretKey) {
    return { ok: false, status: 503, code: 'KHALTI_NOT_CONFIGURED', message: 'KHALTI_SECRET_KEY missing.' };
  }
  const txn = listCollection<PaymentTransactionRecord>('paymentTransactions').find(
    (t) => t.externalTxnId === pidx
  );
  if (!txn) {
    return { ok: false, status: 404, code: 'TXN_NOT_FOUND', message: 'Khalti transaction not found.' };
  }
  if (txn.status === 'completed') {
    const bk = txn.bookingId ? getCollectionItem<Booking>('bookings', txn.bookingId) || undefined : undefined;
    const inv = txn.invoiceId ? getCollectionItem<MasterInvoice>('invoices', txn.invoiceId) || undefined : undefined;
    return { ok: true, duplicate: true, transaction: txn, booking: bk, invoice: inv };
  }

  const isProd = (process.env.KHALTI_ENV || 'sandbox') === 'production';
  const lookupUrl = isProd
    ? 'https://khalti.com/api/v2/epay/lookup/'
    : 'https://a.khalti.com/api/v2/epay/lookup/';
  const resp = await fetch(lookupUrl, {
    method: 'POST',
    headers: {
      Authorization: `Key ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pidx }),
  });

  const payload = (await resp.json().catch(() => ({}))) as Record<string, any>;
  if (!resp.ok || payload.status !== 'Completed') {
    return {
      ok: false,
      status: 400,
      code: 'KHALTI_INCOMPLETE',
      message: `Khalti lookup returned status "${payload.status || resp.status}".`,
    };
  }

  const expectedPaisa = txn.amountNPR * 100;
  if (Math.abs(Number(payload.total_amount || 0) - expectedPaisa) > 200) {
    return { ok: false, status: 400, code: 'AMOUNT_MISMATCH', message: 'Khalti total_amount mismatch.' };
  }

  const result = finalizeSuccessfulPaymentTransaction(
    txn,
    String(payload.transaction_id || pidx),
    'khalti',
    payload
  );
  return { ok: true, duplicate: false, ...result };
}

export async function initiateStripeCardCheckout(params: {
  bookingId?: string;
  bookingPayload?: any;
  reqOrigin?: string;
  idempotencyKey?: string;
}): Promise<
  | {
      ok: true;
      gateway: 'stripe_card';
      sessionId: string;
      checkoutUrl: string;
      transactionRef: string;
      booking: Booking;
      invoice: MasterInvoice;
    }
  | { ok: false; status: number; code: string; message: string }
> {
  const stripeKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!stripeKey) {
    return {
      ok: false,
      status: 503,
      code: 'STRIPE_NOT_CONFIGURED',
      message:
        'Hosted Card gateway (STRIPE_SECRET_KEY) is not configured. Configure Stripe Checkout or select Pay at Check-In / eSewa / Khalti.',
    };
  }

  let booking: Booking;
  let invoice: MasterInvoice;
  if (params.bookingId) {
    const b = getCollectionItem<Booking>('bookings', params.bookingId);
    if (!b) return { ok: false, status: 404, code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' };
    booking = b;
    const inv = listCollection<MasterInvoice>('invoices').find((i) => i.bookingCode === b.bookingCode);
    if (!inv) return { ok: false, status: 404, code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' };
    invoice = inv;
  } else {
    const created = createBookingTransactional(
      { ...params.bookingPayload, paymentMethod: 'card', idempotencyKey: params.idempotencyKey },
      { initialPaymentStatus: 'pending' }
    );
    if (!created.ok) return created;
    booking = created.booking;
    invoice = created.invoice;
  }

  const theme = getKvSetting<HotelThemeConfig>('themeConfig', {} as HotelThemeConfig);
  const nprRate = theme.exchangeRates?.NPR || 135;
  const amountUSD = invoice.balanceDueUSD > 0 ? invoice.balanceDueUSD : invoice.grandTotalUSD;
  const amountCents = Math.max(50, Math.round(amountUSD * 100));
  const transactionRef = `CARD-${booking.bookingCode}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const baseUrl = getAppBaseUrl(params.reqOrigin);

  const formBody = new URLSearchParams({
    mode: 'payment',
    success_url: `${baseUrl}/?payment=card_success&ref=${encodeURIComponent(transactionRef)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/?payment=card_cancelled&ref=${encodeURIComponent(transactionRef)}`,
    customer_email: booking.guestEmail,
    client_reference_id: transactionRef,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(amountCents),
    'line_items[0][price_data][product_data][name]': `Kamal Hotel Stay · ${booking.roomName} (${booking.bookingCode})`,
    'metadata[booking_id]': booking.id,
    'metadata[booking_code]': booking.bookingCode,
    'metadata[transaction_ref]': transactionRef,
  });

  const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(params.idempotencyKey ? { 'Idempotency-Key': params.idempotencyKey } : {}),
    },
    body: formBody.toString(),
  });

  const session = (await resp.json().catch(() => ({}))) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!resp.ok || !session.id || !session.url) {
    return {
      ok: false,
      status: 502,
      code: 'STRIPE_SESSION_FAILED',
      message: session.error?.message || `Stripe session error HTTP ${resp.status}.`,
    };
  }

  const nowIso = new Date().toISOString();
  const txn: PaymentTransactionRecord = {
    id: `ptxn-${crypto.randomUUID().slice(0, 10)}`,
    idempotencyKey: params.idempotencyKey,
    bookingId: booking.id,
    bookingCode: booking.bookingCode,
    invoiceId: invoice.id,
    gateway: 'stripe_card',
    transactionRef,
    externalTxnId: session.id,
    amountUSD,
    amountNPR: Math.round(amountUSD * nprRate),
    currency: 'USD',
    status: 'initiated',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  upsertCollectionItem('paymentTransactions', txn.id, txn);

  return {
    ok: true,
    gateway: 'stripe_card',
    sessionId: session.id,
    checkoutUrl: session.url,
    transactionRef,
    booking,
    invoice,
  };
}

export function processStripeWebhookPayload(
  rawBody: Buffer | string,
  sigHeader: string
):
  | { ok: true; duplicate: boolean; eventType: string; transaction?: PaymentTransactionRecord }
  | { ok: false; status: number; code: string; message: string } {
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (!webhookSecret) {
    return { ok: false, status: 503, code: 'STRIPE_WEBHOOK_UNCONFIGURED', message: 'STRIPE_WEBHOOK_SECRET not set.' };
  }
  const valid = verifyStripeWebhookSignature(rawBody, sigHeader, webhookSecret);
  if (!valid) {
    return { ok: false, status: 400, code: 'INVALID_STRIPE_SIGNATURE', message: 'Invalid Stripe webhook signature.' };
  }

  const event = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody) as Record<string, any>;
  const eventId = String(event.id || '');
  const isNew = recordWebhookEventIfNew('stripe', eventId, true, event);
  if (!isNew) {
    return { ok: true, duplicate: true, eventType: String(event.type || 'unknown') };
  }

  if (event.type === 'checkout.session.completed') {
    const obj = event.data?.object || {};
    const txRef = obj.client_reference_id || obj.metadata?.transaction_ref;
    const txn = listCollection<PaymentTransactionRecord>('paymentTransactions').find(
      (t) => t.transactionRef === txRef || t.externalTxnId === obj.id
    );
    if (txn && txn.status !== 'completed') {
      const result = finalizeSuccessfulPaymentTransaction(
        txn,
        String(obj.payment_intent || obj.id),
        'stripe_card',
        { eventId, paymentStatus: obj.payment_status, amountTotal: obj.amount_total }
      );
      return { ok: true, duplicate: false, eventType: event.type, transaction: result.transaction };
    }
  }

  return { ok: true, duplicate: false, eventType: String(event.type || 'ignored') };
}

export function finalizeSuccessfulPaymentTransaction(
  txn: PaymentTransactionRecord,
  externalTxnId: string,
  eventGateway: string,
  rawVerification: Record<string, unknown>
): { transaction: PaymentTransactionRecord; booking?: Booking; invoice?: MasterInvoice } {
  return runInSqliteTransaction(() => {
    const nowIso = new Date().toISOString();
    recordWebhookEventIfNew(eventGateway, `${txn.transactionRef}:${externalTxnId}`, true, rawVerification);

    const updatedTxn: PaymentTransactionRecord = {
      ...txn,
      externalTxnId,
      status: 'completed',
      verifiedAt: nowIso,
      updatedAt: nowIso,
      rawVerification,
    };
    upsertCollectionItem('paymentTransactions', updatedTxn.id, updatedTxn);

    let updatedBooking: Booking | undefined;
    if (txn.bookingId) {
      const bk = getCollectionItem<Booking>('bookings', txn.bookingId);
      if (bk) {
        updatedBooking = { ...bk, paymentStatus: 'paid' };
        upsertCollectionItem('bookings', bk.id, updatedBooking);
      }
    }

    let updatedInvoice: MasterInvoice | undefined;
    if (txn.invoiceId) {
      const inv = getCollectionItem<MasterInvoice>('invoices', txn.invoiceId);
      if (inv) {
        const nextPaid = Math.round((inv.amountPaidUSD + txn.amountUSD) * 100) / 100;
        const nextDue = Math.max(0, Math.round((inv.grandTotalUSD - nextPaid) * 100) / 100);
        updatedInvoice = {
          ...inv,
          amountPaidUSD: nextPaid,
          balanceDueUSD: nextDue,
          paymentStatus: nextDue <= 0.01 ? 'paid' : inv.paymentStatus,
        };
        upsertCollectionItem('invoices', inv.id, updatedInvoice);
      }
    }

    upsertCollectionItem('auditLogs', `log-${crypto.randomUUID().slice(0, 8)}`, {
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: nowIso.slice(0, 19).replace('T', ' '),
      actorName: 'Payment Gateway Verification',
      actorRole: txn.gateway.toUpperCase(),
      action: 'Verified Payment Settlement',
      category: 'payment',
      details: `Verified ${txn.gateway} Ref ${txn.transactionRef} (${externalTxnId}) for $${txn.amountUSD.toFixed(2)} USD.`,
      ipAddress: 'server',
    });

    broadcastRealtimeEvent(
      'payment:completed',
      { transaction: updatedTxn, booking: updatedBooking, invoice: updatedInvoice },
      'staff'
    );

    return { transaction: updatedTxn, booking: updatedBooking, invoice: updatedInvoice };
  });
}

export function recordOnsiteOrManualPayment(params: {
  invoiceId: string;
  amountUSD: number;
  method: PaymentMethod;
  actorName: string;
  idempotencyKey?: string;
}):
  | { ok: true; duplicate: boolean; transaction: PaymentTransactionRecord; invoice: MasterInvoice }
  | { ok: false; status: number; message: string } {
  return runInSqliteTransaction(() => {
    if (params.idempotencyKey) {
      const existing = listCollection<PaymentTransactionRecord>('paymentTransactions').find(
        (t) => t.idempotencyKey === params.idempotencyKey
      );
      if (existing) {
        const inv = getCollectionItem<MasterInvoice>('invoices', params.invoiceId)!;
        return { ok: true, duplicate: true, transaction: existing, invoice: inv };
      }
    }

    const inv = getCollectionItem<MasterInvoice>('invoices', params.invoiceId);
    if (!inv) return { ok: false, status: 404, message: 'Invoice not found.' };

    const amountUSD = Math.round(Number(params.amountUSD || 0) * 100) / 100;
    if (amountUSD <= 0) {
      return { ok: false, status: 400, message: 'Payment amount must be greater than zero.' };
    }

    const theme = getKvSetting<HotelThemeConfig>('themeConfig', {} as HotelThemeConfig);
    const nprRate = theme.exchangeRates?.NPR || 135;
    const nowIso = new Date().toISOString();

    const txn: PaymentTransactionRecord = {
      id: `ptxn-${crypto.randomUUID().slice(0, 10)}`,
      idempotencyKey: params.idempotencyKey,
      bookingCode: inv.bookingCode,
      invoiceId: inv.id,
      gateway:
        params.method === 'esewa'
          ? 'esewa'
          : params.method === 'khalti'
          ? 'khalti'
          : params.method === 'card'
          ? 'stripe_card'
          : 'onsite',
      transactionRef: `DESK-${inv.invoiceNumber}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`,
      amountUSD,
      amountNPR: Math.round(amountUSD * nprRate),
      currency: 'USD',
      status: 'completed',
      verifiedAt: nowIso,
      rawVerification: { settledBy: params.actorName, channel: params.method },
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    upsertCollectionItem('paymentTransactions', txn.id, txn);

    const nextPaid = Math.round((inv.amountPaidUSD + amountUSD) * 100) / 100;
    const nextDue = Math.max(0, Math.round((inv.grandTotalUSD - nextPaid) * 100) / 100);
    const updatedInvoice: MasterInvoice = {
      ...inv,
      amountPaidUSD: nextPaid,
      balanceDueUSD: nextDue,
      paymentStatus: nextDue <= 0.01 ? 'paid' : 'pending',
      paymentMethod: params.method,
    };
    upsertCollectionItem('invoices', inv.id, updatedInvoice);

    if (inv.bookingCode && nextDue <= 0.01) {
      const bk = listCollection<Booking>('bookings').find((b) => b.bookingCode === inv.bookingCode);
      if (bk) {
        upsertCollectionItem('bookings', bk.id, { ...bk, paymentStatus: 'paid', paymentMethod: params.method });
      }
    }

    upsertCollectionItem('auditLogs', `log-${crypto.randomUUID().slice(0, 8)}`, {
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: nowIso.slice(0, 19).replace('T', ' '),
      actorName: params.actorName,
      actorRole: 'Front Desk / Finance',
      action: 'Folio Payment Recorded',
      category: 'payment',
      details: `Recorded $${amountUSD.toFixed(2)} USD (${params.method}) on ${inv.invoiceNumber}. Balance due: $${nextDue.toFixed(2)}.`,
      ipAddress: 'server',
    });

    broadcastRealtimeEvent('invoice:updated', { invoice: updatedInvoice, transaction: txn }, 'staff');
    return { ok: true, duplicate: false, transaction: txn, invoice: updatedInvoice };
  });
}

export function processPaymentRefund(params: {
  transactionId: string;
  amountUSD?: number;
  reason: string;
  actorName: string;
}):
  | { ok: true; refundTransaction: PaymentTransactionRecord; invoice?: MasterInvoice }
  | { ok: false; status: number; message: string } {
  return runInSqliteTransaction(() => {
    const orig = getCollectionItem<PaymentTransactionRecord>('paymentTransactions', params.transactionId);
    if (!orig) return { ok: false, status: 404, message: 'Original payment transaction not found.' };
    if (orig.status !== 'completed') {
      return { ok: false, status: 400, message: 'Only completed payments can be refunded.' };
    }

    const refundAmount = Math.min(orig.amountUSD, Math.round(Number(params.amountUSD || orig.amountUSD) * 100) / 100);
    if (refundAmount <= 0) {
      return { ok: false, status: 400, message: 'Refund amount must be positive.' };
    }

    const nowIso = new Date().toISOString();
    const updatedOrig: PaymentTransactionRecord = {
      ...orig,
      status: 'refunded',
      updatedAt: nowIso,
    };
    upsertCollectionItem('paymentTransactions', orig.id, updatedOrig);

    const theme = getKvSetting<HotelThemeConfig>('themeConfig', {} as HotelThemeConfig);
    const nprRate = theme.exchangeRates?.NPR || 135;

    const refundTxn: PaymentTransactionRecord = {
      id: `ptxn-ref-${crypto.randomUUID().slice(0, 8)}`,
      bookingId: orig.bookingId,
      bookingCode: orig.bookingCode,
      invoiceId: orig.invoiceId,
      gateway: 'refund',
      transactionRef: `REFUND-${orig.transactionRef}`,
      externalTxnId: orig.externalTxnId,
      amountUSD: -refundAmount,
      amountNPR: -Math.round(refundAmount * nprRate),
      currency: orig.currency,
      status: 'refunded',
      verifiedAt: nowIso,
      rawVerification: { reason: params.reason, refundedBy: params.actorName, originalTxnId: orig.id },
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    upsertCollectionItem('paymentTransactions', refundTxn.id, refundTxn);

    let updatedInv: MasterInvoice | undefined;
    if (orig.invoiceId) {
      const inv = getCollectionItem<MasterInvoice>('invoices', orig.invoiceId);
      if (inv) {
        const nextPaid = Math.max(0, Math.round((inv.amountPaidUSD - refundAmount) * 100) / 100);
        const nextDue = Math.max(0, Math.round((inv.grandTotalUSD - nextPaid) * 100) / 100);
        updatedInv = {
          ...inv,
          amountPaidUSD: nextPaid,
          balanceDueUSD: nextDue,
          paymentStatus: nextPaid <= 0.01 ? 'refunded' : 'pending',
        };
        upsertCollectionItem('invoices', inv.id, updatedInv);
      }
    }

    if (orig.bookingId) {
      const bk = getCollectionItem<Booking>('bookings', orig.bookingId);
      if (bk) {
        upsertCollectionItem('bookings', bk.id, { ...bk, paymentStatus: 'refunded' });
      }
    }

    upsertCollectionItem('auditLogs', `log-${crypto.randomUUID().slice(0, 8)}`, {
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: nowIso.slice(0, 19).replace('T', ' '),
      actorName: params.actorName,
      actorRole: 'Finance / Management',
      action: 'Payment Refund Processed',
      category: 'payment',
      details: `Refunded $${refundAmount.toFixed(2)} USD on ${orig.transactionRef}. Reason: ${params.reason}`,
      ipAddress: 'server',
    });

    broadcastRealtimeEvent('payment:refunded', { refundTransaction: refundTxn, invoice: updatedInv }, 'staff');
    return { ok: true, refundTransaction: refundTxn, invoice: updatedInv };
  });
}

export function buildPaymentReconciliationReport() {
  const invoices = listCollection<MasterInvoice>('invoices');
  const transactions = listCollection<PaymentTransactionRecord>('paymentTransactions');

  const completedTotalUSD = transactions
    .filter((t) => t.status === 'completed')
    .reduce((acc, t) => acc + t.amountUSD, 0);
  const refundedTotalUSD = Math.abs(
    transactions.filter((t) => t.status === 'refunded' && t.amountUSD < 0).reduce((acc, t) => acc + t.amountUSD, 0)
  );
  const pendingInitiated = transactions.filter((t) => t.status === 'initiated' || t.status === 'pending');

  const invoiceDiscrepancies = invoices
    .map((inv) => {
      const invTxns = transactions.filter((t) => t.invoiceId === inv.id && t.status === 'completed');
      const ledgerSum = Math.round(invTxns.reduce((acc, t) => acc + t.amountUSD, 0) * 100) / 100;
      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        bookingCode: inv.bookingCode,
        grandTotalUSD: inv.grandTotalUSD,
        recordedPaidUSD: inv.amountPaidUSD,
        verifiedTxnPaidUSD: ledgerSum,
        balanceDueUSD: inv.balanceDueUSD,
        varianceUSD: Math.round((inv.amountPaidUSD - ledgerSum) * 100) / 100,
      };
    })
    .filter((row) => Math.abs(row.varianceUSD) > 0.05 || row.balanceDueUSD > 0.01);

  return {
    generatedAt: new Date().toISOString(),
    totalTransactions: transactions.length,
    completedTotalUSD: Math.round(completedTotalUSD * 100) / 100,
    refundedTotalUSD: Math.round(refundedTotalUSD * 100) / 100,
    netSettledUSD: Math.round((completedTotalUSD - refundedTotalUSD) * 100) / 100,
    pendingGatewayCount: pendingInitiated.length,
    byGateway: transactions.reduce<Record<string, { count: number; totalUSD: number }>>((acc, t) => {
      if (!acc[t.gateway]) acc[t.gateway] = { count: 0, totalUSD: 0 };
      acc[t.gateway].count += 1;
      if (t.status === 'completed' || (t.status === 'refunded' && t.amountUSD < 0)) {
        acc[t.gateway].totalUSD = Math.round((acc[t.gateway].totalUSD + t.amountUSD) * 100) / 100;
      }
      return acc;
    }, {}),
    openOrVarianceFolios: invoiceDiscrepancies,
    transactions,
  };
}
