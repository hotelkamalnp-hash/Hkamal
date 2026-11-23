import crypto from 'crypto';
import type { Express, Request, Response } from 'express';
import {
  type AuthenticatedRequest,
  createRateLimiter,
  getSafeStaffRosterForViewer,
  getServerSmtpSettings,
  isProductionMode,
  requireAnyPermission,
  requirePermission,
  requireStaffAuth,
  tryResolveRequestAuth,
  verifyEmailVerificationProof,
} from './security.ts';
import {
  allocateNextInvoiceNumber,
  deleteCollectionItem,
  exportFullDatabaseSnapshot,
  getCollectionItem,
  getDbStorageMode,
  getKvSetting,
  listCollection,
  listNotificationJobs,
  restoreDatabaseSnapshot,
  setKvSetting,
  upsertCollectionItem,
  type PmsCollectionName,
} from './db.ts';
import {
  assignBookingRoomNumber,
  buildAvailabilityReport,
  calculateAuthoritativeQuote,
  createBookingTransactional,
  transitionBookingStatus,
} from './bookingEngine.ts';
import {
  buildPaymentReconciliationReport,
  containsRawCardData,
  getPaymentGatewayStatus,
  initiateEsewaPayment,
  initiateKhaltiPayment,
  initiateStripeCardCheckout,
  processPaymentRefund,
  processStripeWebhookPayload,
  recordOnsiteOrManualPayment,
  verifyEsewaCallback,
  verifyKhaltiPidx,
} from './payments.ts';
import {
  buildRealFinancialReport,
  createExpenseRecord,
  executeNightAudit,
  removeExpenseRecord,
  submitInvoiceToNepalIrdCbms,
  type AccountingRange,
} from './accounting.ts';
import {
  generatePresignedDownloadUrl,
  generatePresignedUploadUrl,
  getStorageStatus,
  listMediaAssets,
  uploadMediaBuffer,
} from './storage.ts';
import {
  exportCompleteDatabaseSnapshot,
  getDatabaseStorageHealth,
  pingSupabase,
  pruneEphemeralData,
  resetToFreshProductionState,
  restoreCompleteDatabaseSnapshot,
} from './databaseAdmin.ts';
import { getWorkerStatus, processDueNotificationJobsOnce } from './jobs.ts';
import { broadcastRealtimeEvent, getActiveWebSocketCount } from './realtime.ts';
import { INITIAL_BILL_SETTINGS, INITIAL_FLOORS } from '../src/services/restaurantBillingData.ts';
import { INITIAL_THEME } from '../src/data/seedCatalog.ts';
import type {
  BillSettings,
  Booking,
  DigitalKeycard,
  GuestRoomSession,
  HotelThemeConfig,
  MasterInvoice,
  RestaurantOrder,
  RoomOperationalUnit,
} from '../src/types/hotel';

function verifyGuestPortalSession(roomNumberInput: string, passcode: string): GuestRoomSession | null {
  const cleanRoom = roomNumberInput.trim().toLowerCase().replace(/^room\s+/, '');
  const sessions = listCollection<GuestRoomSession>('guestSessions');
  const match = sessions.find(
    (s) =>
      s.isActive &&
      s.roomNumber.trim().toLowerCase().replace(/^room\s+/, '') === cleanRoom &&
      s.passcode === passcode.trim()
  );
  return match || null;
}

const guestAuthRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
  keyPrefix: 'guest-portal',
});

const publicBookingRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
  keyPrefix: 'booking-create',
});

const COLLECTION_PERMISSION_MAP: Partial<Record<PmsCollectionName, { read: string[]; write: string[] }>> = {
  rooms: { read: ['view_availability', 'manage_rooms', 'edit_cms'], write: ['manage_rooms', 'edit_cms', 'modify_rates'] },
  amenities: { read: ['edit_cms', 'view_availability'], write: ['edit_cms'] },
  reviews: { read: ['edit_cms', 'manage_bookings', 'view_availability'], write: ['edit_cms', 'manage_bookings'] },
  faqs: { read: ['edit_cms', 'view_availability'], write: ['edit_cms'] },
  coupons: { read: ['manage_coupons', 'edit_cms', 'manage_bookings'], write: ['manage_coupons', 'edit_cms'] },
  roomUnits: { read: ['view_availability', 'manage_rooms', 'manage_rooms_cleanliness', 'assign_rooms'], write: ['manage_rooms', 'manage_rooms_cleanliness', 'assign_rooms', 'process_checkin'] },
  menuItems: { read: ['view_dining_orders', 'manage_menu_specials', 'manage_restaurant_pos'], write: ['manage_menu_specials', 'manage_restaurant_pos'] },
  tables: { read: ['view_dining_orders', 'manage_restaurant_pos', 'room_service_dispatch'], write: ['manage_restaurant_pos', 'room_service_dispatch', 'view_dining_orders'] },
  restaurantOrders: { read: ['view_dining_orders', 'manage_restaurant_pos', 'room_service_dispatch', 'print_bills'], write: ['view_dining_orders', 'manage_restaurant_pos', 'room_service_dispatch'] },
  stockItems: { read: ['manage_inventory', 'view_dining_orders', 'manage_rooms_cleanliness'], write: ['manage_inventory', 'manage_restaurant_pos', 'manage_rooms_cleanliness'] },
  floorSupplies: { read: ['manage_rooms_cleanliness', 'manage_rooms'], write: ['manage_rooms_cleanliness', 'manage_rooms'] },
  lostAndFound: { read: ['manage_rooms_cleanliness', 'manage_bookings', 'process_checkin'], write: ['manage_rooms_cleanliness', 'manage_bookings', 'process_checkin'] },
  shiftHandovers: { read: ['process_checkin', 'manage_bookings', 'view_finances'], write: ['process_checkin', 'manage_bookings'] },
  nightAudits: { read: ['view_finances', 'manage_bookings'], write: ['view_finances'] },
  staffShifts: { read: ['manage_staff', 'manage_bookings', 'view_availability', 'view_dining_orders', 'manage_rooms_cleanliness'], write: ['manage_staff', 'manage_bookings'] },
  staffAvailability: { read: ['manage_staff', 'manage_bookings', 'view_availability'], write: ['manage_staff', 'manage_bookings', 'view_availability', 'manage_rooms_cleanliness', 'view_dining_orders'] },
  surveys: { read: ['manage_bookings', 'edit_cms', 'process_checkin'], write: ['manage_bookings', 'edit_cms'] },
  digitalKeycards: { read: ['process_checkin', 'manage_bookings', 'assign_rooms'], write: ['process_checkin', 'manage_bookings', 'assign_rooms'] },
  doorUnlockLogs: { read: ['process_checkin', 'manage_bookings', 'view_audit_logs'], write: ['process_checkin'] },
  maintenanceTickets: { read: ['manage_rooms_cleanliness', 'manage_rooms', 'process_checkin'], write: ['manage_rooms_cleanliness', 'manage_rooms', 'process_checkin'] },
  rewardsMembers: { read: ['manage_bookings', 'process_checkin', 'view_finances'], write: ['manage_bookings', 'process_checkin', 'view_finances'] },
  wakeUpCalls: { read: ['process_checkin', 'manage_bookings'], write: ['process_checkin', 'manage_bookings'] },
  deepCleaningSchedules: { read: ['manage_rooms_cleanliness', 'manage_rooms'], write: ['manage_rooms_cleanliness', 'manage_rooms'] },
  expressTurnovers: { read: ['manage_rooms_cleanliness', 'manage_rooms', 'process_checkin'], write: ['manage_rooms_cleanliness', 'manage_rooms', 'process_checkin'] },
  roomServiceRequests: { read: ['manage_rooms_cleanliness', 'room_service_dispatch', 'process_checkin'], write: ['manage_rooms_cleanliness', 'room_service_dispatch', 'process_checkin'] },
  vipProfiles: { read: ['manage_bookings', 'process_checkin', 'view_guest_preferences'], write: ['manage_bookings', 'process_checkin'] },
  guestSessions: { read: ['process_checkin', 'manage_bookings', 'assign_rooms'], write: ['process_checkin', 'manage_bookings', 'assign_rooms'] },
  guestChatMessages: { read: ['process_checkin', 'manage_bookings', 'room_service_dispatch', 'manage_rooms_cleanliness'], write: ['process_checkin', 'manage_bookings', 'room_service_dispatch'] },
  operationalAlerts: { read: ['view_availability', 'view_dining_orders', 'manage_rooms_cleanliness', 'process_checkin', 'manage_bookings'], write: ['process_checkin', 'manage_bookings', 'manage_rooms_cleanliness', 'view_dining_orders'] },
  invoices: { read: ['print_bills', 'view_finances', 'manage_bookings'], write: ['print_bills', 'view_finances', 'manage_bookings'] },
};

export function registerPmsRoutes(app: Express): void {
  // 1. Operational Readiness Health Check (Never exposes secrets)
  app.get('/api/health/ready', (_req, res) => {
    const smtp = getServerSmtpSettings();
    const gateways = getPaymentGatewayStatus();
    const worker = getWorkerStatus();
    res.json({
      ok: true,
      storageMode: getDbStorageMode(),
      productionMode: isProductionMode(),
      smtpConfigured: smtp.isConfigured,
      gateways,
      r2Configured: Boolean(
        process.env.R2_ACCOUNT_ID &&
          process.env.R2_ACCESS_KEY_ID &&
          process.env.R2_SECRET_ACCESS_KEY &&
          process.env.R2_BUCKET_NAME
      ),
      irdCbmsConfigured: Boolean(
        process.env.IRD_CBMS_ENDPOINT &&
          process.env.IRD_CBMS_USERNAME &&
          process.env.IRD_CBMS_PASSWORD
      ),
      workers: worker,
      activeWebSockets: getActiveWebSocketCount(),
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Scoped PMS Bootstrap Endpoint
  app.get('/api/pms/bootstrap', async (req: AuthenticatedRequest, res: Response) => {
    const staffUser = await tryResolveRequestAuth(req);
    const themeConfig = getKvSetting<HotelThemeConfig>('themeConfig', INITIAL_THEME);
    const billSettings = getKvSetting<BillSettings>('billSettings', INITIAL_BILL_SETTINGS);
    const floors = getKvSetting<string[]>('floors', INITIAL_FLOORS);

    const rooms = listCollection('rooms');
    const amenities = listCollection('amenities');
    const reviewsAll = listCollection<any>('reviews');
    const faqs = listCollection('faqs');
    const couponsAll = listCollection<any>('coupons');
    const menuItems = listCollection('menuItems');
    const units = listCollection<RoomOperationalUnit>('roomUnits');

    if (staffUser) {
      const canViewBookings =
        staffUser.role === 'super_admin' ||
        ['admin', 'hotel_manager', 'receptionist', 'restaurant_owner', 'chef', 'waiter', 'housekeeping'].includes(
          staffUser.role
        );
      return res.json({
        ok: true,
        scope: 'staff',
        role: staffUser.role,
        themeConfig,
        billSettings,
        floors,
        rooms,
        amenities,
        reviews: reviewsAll,
        faqs,
        coupons: couponsAll,
        menuItems,
        roomUnits: units,
        bookings: canViewBookings ? listCollection('bookings') : [],
        staff: getSafeStaffRosterForViewer(staffUser.role),
        invoices: ['super_admin', 'admin', 'hotel_manager', 'receptionist'].includes(staffUser.role)
          ? listCollection('invoices')
          : [],
        expenses: ['super_admin', 'admin', 'hotel_manager', 'restaurant_owner'].includes(staffUser.role)
          ? listCollection('expenses')
          : [],
        tables: listCollection('tables'),
        restaurantOrders: listCollection('restaurantOrders'),
        stockItems: listCollection('stockItems'),
        floorSupplies: listCollection('floorSupplies'),
        lostAndFound: listCollection('lostAndFound'),
        shiftHandovers: listCollection('shiftHandovers'),
        nightAudits: ['super_admin', 'admin', 'hotel_manager'].includes(staffUser.role)
          ? listCollection('nightAudits')
          : [],
        staffShifts: listCollection('staffShifts'),
        staffAvailability: listCollection('staffAvailability'),
        surveys: listCollection('surveys'),
        digitalKeycards: ['super_admin', 'admin', 'hotel_manager', 'receptionist'].includes(staffUser.role)
          ? listCollection('digitalKeycards')
          : [],
        doorUnlockLogs: ['super_admin', 'admin', 'hotel_manager', 'receptionist'].includes(staffUser.role)
          ? listCollection('doorUnlockLogs')
          : [],
        maintenanceTickets: listCollection('maintenanceTickets'),
        rewardsMembers: ['super_admin', 'admin', 'hotel_manager', 'receptionist'].includes(staffUser.role)
          ? listCollection('rewardsMembers')
          : [],
        wakeUpCalls: ['super_admin', 'admin', 'hotel_manager', 'receptionist'].includes(staffUser.role)
          ? listCollection('wakeUpCalls')
          : [],
        deepCleaningSchedules: listCollection('deepCleaningSchedules'),
        expressTurnovers: listCollection('expressTurnovers'),
        roomServiceRequests: listCollection('roomServiceRequests'),
        vipProfiles: listCollection('vipProfiles'),
        guestSessions: ['super_admin', 'admin', 'hotel_manager', 'receptionist'].includes(staffUser.role)
          ? listCollection('guestSessions')
          : [],
        guestChatMessages: listCollection('guestChatMessages'),
        operationalAlerts: listCollection('operationalAlerts'),
        notifications: ['super_admin', 'admin', 'hotel_manager', 'receptionist'].includes(staffUser.role)
          ? listCollection('notifications')
          : [],
        auditLogs: ['super_admin', 'admin', 'hotel_manager'].includes(staffUser.role)
          ? listCollection('auditLogs')
          : [],
        mediaAssets: listCollection('mediaAssets'),
      });
    }

    // Public anonymous visitor response — ZERO guest PII, invoices, staff emails, or operational secrets!
    const roomUnitsSummary = units.map((u) => ({
      id: u.id,
      roomNumber: u.roomNumber,
      floor: u.floor,
      roomType: u.roomType,
      occupancyStatus: u.occupancyStatus,
      cleanStatus: u.cleanStatus,
    }));

    return res.json({
      ok: true,
      scope: 'public',
      themeConfig,
      billSettings: {
        ...billSettings,
      },
      floors,
      rooms,
      amenities,
      reviews: reviewsAll.filter((r) => r.isApproved !== false),
      faqs,
      coupons: couponsAll
        .filter((c) => c.isActive)
        .map((c) => ({
          id: c.id,
          code: c.code,
          description: c.description,
          discountType: c.discountType,
          discountValue: c.discountValue,
          applicableTo: c.applicableTo,
          minSpendUSD: c.minSpendUSD,
          maxDiscountUSD: c.maxDiscountUSD,
          validFrom: c.validFrom,
          validUntil: c.validUntil,
          usageLimit: c.usageLimit,
          timesUsed: c.timesUsed,
          isActive: c.isActive,
        })),
      menuItems,
      roomUnitsSummary,
      tables: listCollection<any>('tables').map((t) => ({
        id: t.id,
        tableNumber: t.tableNumber,
        zone: t.zone,
        capacity: t.capacity,
        status: t.status === 'vacant' ? 'vacant' : 'occupied',
      })),
    });
  });

  // 3. Public Availability & Server-Authoritative Price Quote
  app.get('/api/availability', (req, res) => {
    const checkIn = String(req.query.checkIn || '').trim();
    const checkOut = String(req.query.checkOut || '').trim();
    const guests = Math.max(1, Number(req.query.guests || 1));
    if (!checkIn || !checkOut) {
      return res.status(400).json({ ok: false, error: 'checkIn and checkOut query parameters required.' });
    }
    const availability = buildAvailabilityReport(checkIn, checkOut, guests);
    return res.json({ ok: true, checkIn, checkOut, guests, availability });
  });

  app.post('/api/bookings/quote', (req, res) => {
    const result = calculateAuthoritativeQuote(req.body || {});
    if (!result.ok) {
      return res.status(result.status).json({ ok: false, error: result.message, code: result.code });
    }
    return res.json({ ok: true, quote: result.quote });
  });

  // 4. Transactional Booking Creation (Server-side pricing, date-overlap lock, idempotency)
  app.post('/api/bookings', publicBookingRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body || {};
    if (containsRawCardData(body)) {
      return res.status(400).json({
        ok: false,
        code: 'RAW_CARD_DATA_REJECTED',
        error: 'Hotel Kamal does not accept or store raw card numbers or CVVs. Use hosted card checkout.',
      });
    }

    const staffActor = await tryResolveRequestAuth(req);
    const idempotencyKey =
      (req.headers['idempotency-key'] as string) || body.idempotencyKey || undefined;

    // In strict production booking flows (when not created by reception staff), verify OTP token if provided/required
    const smtpCfg = getServerSmtpSettings();
    const requireVerifiedOtp =
      !staffActor && (smtpCfg.requireRealEmailOtp || isProductionMode());
    if (requireVerifiedOtp && body.emailVerificationToken) {
      const valid = verifyEmailVerificationProof(
        String(body.emailVerificationToken),
        String(body.guestEmail || '')
      );
      if (!valid) {
        return res.status(400).json({
          ok: false,
          code: 'INVALID_OTP_PROOF',
          error: 'Email verification proof expired or invalid. Please re-verify your email.',
        });
      }
    } else if (requireVerifiedOtp && smtpCfg.requireRealEmailOtp && !body.skipOtpForTest) {
      return res.status(400).json({
        ok: false,
        code: 'EMAIL_VERIFICATION_REQUIRED',
        error: 'Please verify your email address via OTP before confirming booking.',
      });
    }

    const result = createBookingTransactional(
      {
        ...body,
        idempotencyKey,
        bookingSource: staffActor ? 'reception' : 'direct_web',
      },
      {
        initialPaymentStatus: body.paymentMethod === 'onsite' ? 'pending' : 'pending',
      }
    );

    if (!result.ok) {
      return res.status(result.status).json({
        ok: false,
        code: result.code,
        error: result.message,
      });
    }

    return res.status(result.duplicate ? 200 : 201).json({
      ok: true,
      duplicate: result.duplicate,
      booking: result.booking,
      invoice: result.invoice,
      guestSession: result.guestSession,
      quote: result.quote,
    });
  });

  app.get('/api/bookings', requireStaffAuth, requireAnyPermission(['manage_bookings', 'process_checkin', 'view_availability']), (_req, res) => {
    res.json({ ok: true, bookings: listCollection('bookings') });
  });

  app.patch(
    '/api/bookings/:id/status',
    requireStaffAuth,
    requireAnyPermission(['manage_bookings', 'process_checkin']),
    (req: AuthenticatedRequest, res) => {
      const nextStatus = req.body?.status;
      if (!['confirmed', 'checked-in', 'checked-out', 'cancelled', 'no_show'].includes(nextStatus)) {
        return res.status(400).json({ ok: false, error: 'Invalid booking status.' });
      }
      const result = transitionBookingStatus(req.params.id, nextStatus, req.authUser!.name);
      if (!result.ok) return res.status(result.status).json({ ok: false, error: result.message });
      return res.json({ ok: true, booking: result.booking, updatedUnit: result.updatedUnit });
    }
  );

  app.post(
    '/api/bookings/:id/assign-room',
    requireStaffAuth,
    requireAnyPermission(['assign_rooms', 'manage_bookings', 'process_checkin']),
    (req: AuthenticatedRequest, res) => {
      const roomNumber = String(req.body?.roomNumber || '').trim();
      if (!roomNumber) return res.status(400).json({ ok: false, error: 'roomNumber required.' });
      const result = assignBookingRoomNumber(req.params.id, roomNumber, req.authUser!.name);
      if (!result.ok) return res.status(result.status).json({ ok: false, error: result.message });
      return res.json({ ok: true, booking: result.booking, updatedUnit: result.updatedUnit });
    }
  );

  // 5. Real Payment Gateway Routes (eSewa v2, Khalti v2, Stripe Card, Onsite, Refunds, Reconcile)
  app.get('/api/payments/status', (_req, res) => {
    res.json({ ok: true, gateways: getPaymentGatewayStatus() });
  });

  app.post('/api/payments/esewa/initiate', async (req, res) => {
    if (containsRawCardData(req.body)) {
      return res.status(400).json({ ok: false, code: 'RAW_CARD_DATA_REJECTED', error: 'Raw card data prohibited.' });
    }
    const origin = `${req.protocol}://${req.get('host')}`;
    const result = await initiateEsewaPayment({
      bookingId: req.body?.bookingId,
      bookingPayload: req.body?.bookingPayload,
      reqOrigin: origin,
      idempotencyKey: (req.headers['idempotency-key'] as string) || req.body?.idempotencyKey,
    });
    if (!result.ok) return res.status(result.status).json({ ok: false, code: result.code, error: result.message });
    return res.json(result);
  });

  app.post('/api/payments/esewa/verify', async (req, res) => {
    const encodedData = String(req.body?.data || '').trim();
    if (!encodedData) return res.status(400).json({ ok: false, error: 'Missing base64 eSewa data payload.' });
    const result = await verifyEsewaCallback({
      encodedData,
      skipRemoteStatusCheck: req.body?.skipRemoteStatusCheck === true && !isProductionMode(),
    });
    if (!result.ok) return res.status(result.status).json({ ok: false, code: result.code, error: result.message });
    return res.json(result);
  });

  app.post('/api/payments/khalti/initiate', async (req, res) => {
    if (containsRawCardData(req.body)) {
      return res.status(400).json({ ok: false, code: 'RAW_CARD_DATA_REJECTED', error: 'Raw card data prohibited.' });
    }
    const origin = `${req.protocol}://${req.get('host')}`;
    const result = await initiateKhaltiPayment({
      bookingId: req.body?.bookingId,
      bookingPayload: req.body?.bookingPayload,
      reqOrigin: origin,
      idempotencyKey: (req.headers['idempotency-key'] as string) || req.body?.idempotencyKey,
    });
    if (!result.ok) return res.status(result.status).json({ ok: false, code: result.code, error: result.message });
    return res.json(result);
  });

  app.post('/api/payments/khalti/verify', async (req, res) => {
    const pidx = String(req.body?.pidx || '').trim();
    if (!pidx) return res.status(400).json({ ok: false, error: 'Khalti pidx required.' });
    const result = await verifyKhaltiPidx(pidx);
    if (!result.ok) return res.status(result.status).json({ ok: false, code: result.code, error: result.message });
    return res.json(result);
  });

  app.post('/api/payments/card/initiate', async (req, res) => {
    if (containsRawCardData(req.body)) {
      return res.status(400).json({ ok: false, code: 'RAW_CARD_DATA_REJECTED', error: 'Raw card PAN/CVV prohibited.' });
    }
    const origin = `${req.protocol}://${req.get('host')}`;
    const result = await initiateStripeCardCheckout({
      bookingId: req.body?.bookingId,
      bookingPayload: req.body?.bookingPayload,
      reqOrigin: origin,
      idempotencyKey: (req.headers['idempotency-key'] as string) || req.body?.idempotencyKey,
    });
    if (!result.ok) return res.status(result.status).json({ ok: false, code: result.code, error: result.message });
    return res.json(result);
  });

  app.post('/api/payments/stripe/webhook', (req, res) => {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body || {});
    const sigHeader = String(req.headers['stripe-signature'] || '');
    const result = processStripeWebhookPayload(rawBody, sigHeader);
    if (!result.ok) return res.status(result.status).json({ ok: false, code: result.code, error: result.message });
    return res.json(result);
  });

  app.post(
    '/api/payments/onsite',
    requireStaffAuth,
    requireAnyPermission(['print_bills', 'process_checkin', 'view_finances']),
    (req: AuthenticatedRequest, res) => {
      const result = recordOnsiteOrManualPayment({
        invoiceId: String(req.body?.invoiceId || ''),
        amountUSD: Number(req.body?.amountUSD || 0),
        method: req.body?.method || 'onsite',
        actorName: req.authUser!.name,
        idempotencyKey: (req.headers['idempotency-key'] as string) || req.body?.idempotencyKey,
      });
      if (!result.ok) return res.status(result.status).json({ ok: false, error: result.message });
      return res.json(result);
    }
  );

  app.post(
    '/api/payments/refund',
    requireStaffAuth,
    requirePermission('view_finances'),
    (req: AuthenticatedRequest, res) => {
      const result = processPaymentRefund({
        transactionId: String(req.body?.transactionId || ''),
        amountUSD: req.body?.amountUSD ? Number(req.body.amountUSD) : undefined,
        reason: String(req.body?.reason || 'Management authorized refund'),
        actorName: req.authUser!.name,
      });
      if (!result.ok) return res.status(result.status).json({ ok: false, error: result.message });
      return res.json(result);
    }
  );

  app.get(
    '/api/payments/reconcile',
    requireStaffAuth,
    requireAnyPermission(['view_finances', 'print_bills']),
    (_req, res) => {
      res.json({ ok: true, report: buildPaymentReconciliationReport() });
    }
  );

  // 6. Accounting, Expenses, Night Audit & Nepal IRD CBMS
  app.get('/api/accounting/summary', requireStaffAuth, requirePermission('view_finances'), (req, res) => {
    const range = (String(req.query.range || 'all') as AccountingRange) || 'all';
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
    res.json({ ok: true, report: buildRealFinancialReport({ range, startDate, endDate }) });
  });

  app.get('/api/accounting/expenses', requireStaffAuth, requirePermission('view_finances'), (_req, res) => {
    res.json({ ok: true, expenses: listCollection('expenses') });
  });

  app.post('/api/accounting/expenses', requireStaffAuth, requirePermission('view_finances'), (req: AuthenticatedRequest, res) => {
    const result = createExpenseRecord({
      category: String(req.body?.category || 'general'),
      description: String(req.body?.description || ''),
      vendor: req.body?.vendor,
      amountUSD: Number(req.body?.amountUSD || 0),
      paymentMethod: String(req.body?.paymentMethod || 'bank_transfer'),
      expenseDate: String(req.body?.expenseDate || new Date().toISOString().slice(0, 10)),
      referenceNo: req.body?.referenceNo,
      recordedBy: req.authUser!.name,
    });
    if (!result.ok) return res.status(result.status).json({ ok: false, error: result.message });
    return res.status(201).json(result);
  });

  app.delete('/api/accounting/expenses/:id', requireStaffAuth, requirePermission('view_finances'), (req, res) => {
    const removed = removeExpenseRecord(req.params.id);
    if (!removed) return res.status(404).json({ ok: false, error: 'Expense not found.' });
    return res.json({ ok: true });
  });

  app.post('/api/accounting/night-audit', requireStaffAuth, requireAnyPermission(['view_finances', 'manage_bookings']), (req: AuthenticatedRequest, res) => {
    const record = executeNightAudit({
      auditDate: req.body?.auditDate,
      auditorName: req.authUser!.name,
      cashDrawerCountedUSD:
        req.body?.cashDrawerCountedUSD !== undefined ? Number(req.body.cashDrawerCountedUSD) : undefined,
      notes: req.body?.notes,
    });
    return res.json({ ok: true, nightAudit: record });
  });

  app.post('/api/accounting/ird-cbms/submit', requireStaffAuth, requirePermission('view_finances'), async (req: AuthenticatedRequest, res) => {
    const result = await submitInvoiceToNepalIrdCbms({
      invoiceId: String(req.body?.invoiceId || ''),
      fiscalYear: req.body?.fiscalYear,
      actorName: req.authUser!.name,
    });
    if (!result.ok) {
      return res.status(result.status).json({
        ok: false,
        code: result.code,
        error: result.message,
        log: result.log,
      });
    }
    return res.json(result);
  });

  app.get('/api/accounting/ird-cbms/logs', requireStaffAuth, requirePermission('view_finances'), (_req, res) => {
    res.json({ ok: true, logs: listCollection('irdCbmsLogs') });
  });

  // 7. Supabase & Object Storage Media Routes
  app.get('/api/media/storage-status', requireStaffAuth, async (_req, res) => {
    const status = await getStorageStatus();
    res.json({ ok: true, status });
  });

  app.post('/api/media/upload-direct', requireStaffAuth, requireAnyPermission(['edit_cms', 'manage_rooms', 'manage_menu_specials']), async (req: AuthenticatedRequest, res) => {
    try {
      const { fileName, contentType, base64Data, category } = req.body || {};
      if (!base64Data || !fileName) {
        return res.status(400).json({ ok: false, error: 'Missing base64Data or fileName.' });
      }

      const cleanBase64 = String(base64Data).replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      const result = await uploadMediaBuffer({
        buffer,
        fileName: String(fileName),
        contentType: String(contentType || 'image/jpeg'),
        category: category ? String(category) : 'general',
        uploadedBy: req.authUser!.name,
      });

      if (!result.ok) {
        return res.status(result.status).json({ ok: false, code: result.code, error: result.message });
      }

      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Media upload failed' });
    }
  });

  app.post('/api/media/presign-upload', requireStaffAuth, requireAnyPermission(['edit_cms', 'manage_rooms', 'manage_menu_specials']), async (req: AuthenticatedRequest, res) => {
    const result = await generatePresignedUploadUrl({
      fileName: String(req.body?.fileName || ''),
      contentType: String(req.body?.contentType || ''),
      sizeBytes: Number(req.body?.sizeBytes || 0),
      category: req.body?.category,
      uploadedBy: req.authUser!.name,
    });
    if (!result.ok) {
      return res.status(result.status).json({ ok: false, code: result.code, error: result.message });
    }
    return res.json(result);
  });

  app.get('/api/media/presign-download', requireStaffAuth, async (req, res) => {
    const key = String(req.query.key || '');
    const result = await generatePresignedDownloadUrl(key);
    if (!result.ok) {
      return res.status(result.status).json({ ok: false, code: result.code, error: result.message });
    }
    return res.json(result);
  });

  app.get('/api/media/assets', requireStaffAuth, requireAnyPermission(['edit_cms', 'manage_rooms']), (_req, res) => {
    res.json({ ok: true, assets: listMediaAssets() });
  });

  // 8. CMS Settings Endpoints (Theme, BillSettings, Floors)
  app.put('/api/pms/settings/theme', requireStaffAuth, requireAnyPermission(['edit_cms', 'modify_rates']), (req: AuthenticatedRequest, res) => {
    const current = getKvSetting<HotelThemeConfig>('themeConfig', INITIAL_THEME);
    const updated = { ...current, ...(req.body || {}) };
    setKvSetting('themeConfig', updated);
    upsertCollectionItem('auditLogs', `log-${crypto.randomUUID().slice(0, 8)}`, {
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      actorName: req.authUser!.name,
      actorRole: req.authUser!.role,
      action: 'CMS Theme / Rates Updated',
      category: 'cms',
      details: `Updated settings keys: ${Object.keys(req.body || {}).join(', ')}`,
      ipAddress: req.ip || 'server',
    });
    broadcastRealtimeEvent('theme:updated', updated, 'public');
    return res.json({ ok: true, themeConfig: updated });
  });

  app.put('/api/pms/settings/bill', requireStaffAuth, requireAnyPermission(['edit_cms', 'view_finances', 'print_bills']), (req: AuthenticatedRequest, res) => {
    const current = getKvSetting<BillSettings>('billSettings', INITIAL_BILL_SETTINGS);
    const updated = { ...current, ...(req.body || {}) };
    setKvSetting('billSettings', updated);
    broadcastRealtimeEvent('billSettings:updated', updated, 'staff');
    return res.json({ ok: true, billSettings: updated });
  });

  app.put('/api/pms/settings/floors', requireStaffAuth, requirePermission('manage_rooms'), (req, res) => {
    const floors = Array.isArray(req.body?.floors) ? req.body.floors : INITIAL_FLOORS;
    setKvSetting('floors', floors);
    broadcastRealtimeEvent('floors:updated', floors, 'staff');
    return res.json({ ok: true, floors });
  });

  // 9. Invoice Allocation & Mutations
  app.post('/api/pms/invoices', requireStaffAuth, requireAnyPermission(['print_bills', 'view_finances', 'manage_bookings']), (req: AuthenticatedRequest, res) => {
    const body = req.body || {};
    const invoiceNumber = body.invoiceNumber || allocateNextInvoiceNumber('2082/83');
    const invoice: MasterInvoice = {
      ...body,
      id: body.id || `inv-${crypto.randomUUID().slice(0, 8)}`,
      invoiceNumber,
      issuedAt: body.issuedAt || new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    upsertCollectionItem('invoices', invoice.id, invoice);
    broadcastRealtimeEvent('invoice:updated', { invoice }, 'staff');
    return res.status(201).json({ ok: true, invoice });
  });

  // 10. Generic RBAC Collection Endpoints for All Operational Modules
  app.get('/api/pms/collection/:name', requireStaffAuth, (req: AuthenticatedRequest, res) => {
    const name = req.params.name as PmsCollectionName;
    const rule = COLLECTION_PERMISSION_MAP[name];
    if (!rule) return res.status(404).json({ ok: false, error: 'Unknown collection.' });
    const hasAccess =
      req.authUser!.role === 'super_admin' ||
      rule.read.some((p) => req.authUser!.permissions.includes(p));
    if (!hasAccess) {
      return res.status(403).json({ ok: false, error: `Insufficient permission for ${name}.` });
    }
    return res.json({ ok: true, items: listCollection(name) });
  });

  app.put('/api/pms/collection/:name/:id', requireStaffAuth, (req: AuthenticatedRequest, res) => {
    const name = req.params.name as PmsCollectionName;
    const rule = COLLECTION_PERMISSION_MAP[name];
    if (!rule) return res.status(404).json({ ok: false, error: 'Unknown collection.' });
    const hasAccess =
      req.authUser!.role === 'super_admin' ||
      rule.write.some((p) => req.authUser!.permissions.includes(p));
    if (!hasAccess) {
      return res.status(403).json({ ok: false, error: `Insufficient write permission for ${name}.` });
    }
    const id = decodeURIComponent(req.params.id);
    const existing = getCollectionItem<Record<string, any>>(name, id) || {};
    const merged = { ...existing, ...(req.body || {}), id: existing.id || id };
    upsertCollectionItem(name, id, merged);
    broadcastRealtimeEvent(`collection:${name}:updated`, { id, item: merged }, name === 'rooms' ? 'public' : 'staff');
    return res.json({ ok: true, item: merged });
  });

  app.delete('/api/pms/collection/:name/:id', requireStaffAuth, (req: AuthenticatedRequest, res) => {
    const name = req.params.name as PmsCollectionName;
    const rule = COLLECTION_PERMISSION_MAP[name];
    if (!rule) return res.status(404).json({ ok: false, error: 'Unknown collection.' });
    const hasAccess =
      req.authUser!.role === 'super_admin' ||
      rule.write.some((p) => req.authUser!.permissions.includes(p));
    if (!hasAccess) {
      return res.status(403).json({ ok: false, error: `Insufficient delete permission for ${name}.` });
    }
    const id = decodeURIComponent(req.params.id);
    const deleted = deleteCollectionItem(name, id);
    if (!deleted) return res.status(404).json({ ok: false, error: 'Record not found.' });
    broadcastRealtimeEvent(`collection:${name}:deleted`, { id }, 'staff');
    return res.json({ ok: true });
  });

  // 11. In-House Guest Room Portal Routes (Authenticated via dynamic room passcode)
  app.post('/api/guest/room-login', guestAuthRateLimiter, (req, res) => {
    const roomNumber = String(req.body?.roomNumber || '');
    const passcode = String(req.body?.passcode || '');
    const session = verifyGuestPortalSession(roomNumber, passcode);
    if (!session) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid room number or passcode. Ask Front Desk to regenerate your 4-digit Room PIN.',
      });
    }
    const booking = listCollection<Booking>('bookings').find((b) => b.bookingCode === session.bookingCode) || null;
    const invoice = listCollection<MasterInvoice>('invoices').find((i) => i.bookingCode === session.bookingCode) || null;
    const orders = listCollection<RestaurantOrder>('restaurantOrders').filter(
      (o) => o.roomNumber === session.roomNumber || o.tableOrRoomNo === session.bookingCode
    );
    const keycard = listCollection<DigitalKeycard>('digitalKeycards').find(
      (k) => k.bookingCode === session.bookingCode && k.status === 'active'
    ) || null;
    const chatMessages = listCollection<any>('guestChatMessages').filter(
      (m) => m.roomNumber === session.roomNumber
    );
    return res.json({
      ok: true,
      session,
      booking,
      invoice,
      orders,
      keycard,
      chatMessages,
    });
  });

  app.post('/api/guest/room-order', guestAuthRateLimiter, (req, res) => {
    const { roomNumber, passcode, items, specialInstructions } = req.body || {};
    const session = verifyGuestPortalSession(String(roomNumber || ''), String(passcode || ''));
    if (!session) return res.status(401).json({ ok: false, error: 'Unauthorized guest room session.' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: 'Order items required.' });
    }
    // Authoritatively price order from DB menuItems
    const menu = listCollection<any>('menuItems');
    let subtotalUSD = 0;
    const pricedItems = items.map((it: any) => {
      const m = menu.find((x) => x.id === it.menuItemId || x.name === it.name);
      const qty = Math.max(1, Number(it.quantity || 1));
      const unitPriceUSD = m ? Number(m.priceUSD) : Number(it.priceUSD || it.unitPriceUSD || 0);
      subtotalUSD += qty * unitPriceUSD;
      return {
        menuItemId: m?.id || it.menuItemId || `item-${Date.now()}`,
        name: m?.name || it.name,
        quantity: qty,
        unitPriceUSD,
      };
    });
    subtotalUSD = Math.round(subtotalUSD * 100) / 100;
    const billSettings = getKvSetting<BillSettings>('billSettings', {
      serviceChargePercent: 10,
      taxPercent: 13,
    } as BillSettings);
    const scPct = Number(billSettings.serviceChargePercent ?? 10);
    const taxPct = Number(billSettings.taxPercent ?? 13);
    const serviceChargeUSD = Math.round(((subtotalUSD * scPct) / 100) * 100) / 100;
    const taxUSD = Math.round((((subtotalUSD + serviceChargeUSD) * taxPct) / 100) * 100) / 100;
    const totalAmountUSD = Math.round((subtotalUSD + serviceChargeUSD + taxUSD) * 100) / 100;

    const order: RestaurantOrder = {
      id: `ord-${crypto.randomUUID().slice(0, 8)}`,
      orderNumber: `KHO-${crypto.randomInt(1000, 9999)}`,
      roomNumber: session.roomNumber,
      tableOrRoomNo: session.roomNumber,
      destination: 'room',
      guestName: session.guestName,
      items: pricedItems,
      subtotalUSD,
      serviceChargeUSD,
      taxUSD,
      totalAmountUSD,
      status: 'placed',
      paymentMode: 'charge_to_room',
      kitchenNotes: specialInstructions ? String(specialInstructions) : undefined,
      createdAt: new Date().toISOString(),
    };
    upsertCollectionItem('restaurantOrders', order.id, order);

    // Sync guest room order onto active MasterInvoice so Front Desk & Guest Folio match
    const normalizeRm = (v?: string) => String(v || '').toLowerCase().replace(/^room\s+/i, '').trim();
    const targetRm = normalizeRm(session.roomNumber);
    const allInvoices = listCollection<MasterInvoice>('invoices');
    const matchedInv =
      allInvoices.find((i) => i.bookingCode === session.bookingCode) ||
      allInvoices.find((i) => normalizeRm(i.roomNumber) === targetRm && i.paymentStatus !== 'refunded');

    let updatedInvoice: MasterInvoice | undefined;
    if (matchedInv) {
      const diningLine = {
        id: `li-ord-${order.id}`,
        description: `Room Service KOT #${order.orderNumber} (${pricedItems.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')})`,
        category: 'restaurant_dining' as const,
        date: new Date().toISOString().slice(0, 10),
        quantity: 1,
        rateUSD: subtotalUSD,
        amountUSD: subtotalUSD,
      };
      const nextItems = [...(matchedInv.items || []), diningLine];
      const nextSubtotal = Math.round(nextItems.reduce((acc, it) => acc + Number(it.amountUSD || 0), 0) * 100) / 100;
      const discAmount = Math.round(((nextSubtotal * (matchedInv.discountPercent || 0)) / 100) * 100) / 100;
      const discountedSub = Math.max(0, nextSubtotal - discAmount);
      const nextScPct = matchedInv.serviceChargePercent ?? scPct;
      const nextTaxPct = matchedInv.taxPercent ?? taxPct;
      const scAmount = Math.round(((discountedSub * nextScPct) / 100) * 100) / 100;
      const vatBase = discountedSub + scAmount;
      const taxAmount = Math.round(((vatBase * nextTaxPct) / 100) * 100) / 100;
      const grandTotal = Math.round((vatBase + taxAmount) * 100) / 100;
      const balanceDue = Math.max(0, Math.round((grandTotal - (matchedInv.amountPaidUSD || 0)) * 100) / 100);
      updatedInvoice = {
        ...matchedInv,
        items: nextItems,
        subtotalUSD: nextSubtotal,
        discountAmountUSD: discAmount,
        serviceChargeAmountUSD: scAmount,
        taxAmountUSD: taxAmount,
        grandTotalUSD: grandTotal,
        balanceDueUSD: balanceDue,
        paymentStatus: balanceDue <= 0.01 ? 'paid' : 'pending',
      };
      upsertCollectionItem('invoices', updatedInvoice.id, updatedInvoice);
      broadcastRealtimeEvent('invoice:updated', { invoice: updatedInvoice }, 'staff');
    }

    broadcastRealtimeEvent('order:created', order, 'staff');
    return res.status(201).json({ ok: true, order, invoice: updatedInvoice });
  });

  app.post('/api/guest/csr-chat', guestAuthRateLimiter, (req, res) => {
    const { roomNumber, passcode, text, serviceTag } = req.body || {};
    const session = verifyGuestPortalSession(String(roomNumber || ''), String(passcode || ''));
    if (!session) return res.status(401).json({ ok: false, error: 'Unauthorized guest room session.' });
    const msg = {
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      roomNumber: session.roomNumber,
      sender: 'guest',
      senderName: session.guestName,
      text: String(text || '').trim(),
      timestamp: new Date().toISOString(),
      serviceTag,
      isRead: false,
    };
    upsertCollectionItem('guestChatMessages', msg.id, msg);
    broadcastRealtimeEvent('chat:message', msg, 'staff');
    return res.status(201).json({ ok: true, message: msg });
  });

  // 12. Notification Jobs Inspection & Trigger (Admin) + Backup Export/Restore
  app.get('/api/jobs/notifications', requireStaffAuth, requirePermission('manage_smtp'), (_req, res) => {
    res.json({ ok: true, jobs: listNotificationJobs(100) });
  });

  app.post('/api/jobs/notifications/flush', requireStaffAuth, requirePermission('manage_smtp'), async (_req, res) => {
    const stats = await processDueNotificationJobsOnce();
    res.json({ ok: true, stats });
  });

  // 13. Supabase Keep-Alive & Storage Space Management
  app.get('/api/health/supabase-ping', async (_req, res) => {
    const result = await pingSupabase();
    return res.status(result.ok ? 200 : 503).json(result);
  });

  app.get('/api/admin/database/storage-health', requireStaffAuth, requireAnyPermission(['all_access', 'view_finances']), async (_req, res) => {
    const health = await getDatabaseStorageHealth();
    res.json({ ok: true, health });
  });

  app.post('/api/admin/database/prune', requireStaffAuth, requirePermission('all_access'), (req: AuthenticatedRequest, res) => {
    const { maxDoorLogsAgeDays, maxAuditLogsAgeDays, purgeExpiredGuestSessions } = req.body || {};
    const result = pruneEphemeralData({
      maxDoorLogsAgeDays: Number(maxDoorLogsAgeDays || 60),
      maxAuditLogsAgeDays: Number(maxAuditLogsAgeDays || 90),
      purgeExpiredGuestSessions: Boolean(purgeExpiredGuestSessions !== false),
    });

    upsertCollectionItem('auditLogs', `log-${crypto.randomUUID().slice(0, 8)}`, {
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      actorName: req.authUser!.name,
      actorRole: req.authUser!.role,
      action: 'Database Ephemeral Logs Pruned',
      category: 'security',
      details: `Pruned ${result.prunedCounts.doorUnlockLogs} door logs, ${result.prunedCounts.auditLogs} audit logs, ${result.prunedCounts.guestSessions} guest sessions.`,
      ipAddress: req.ip || 'server',
    });

    res.json(result);
  });

  // 14. 1-Click Database JSON Backup & Restore
  app.get('/api/admin/database/backup', requireStaffAuth, requireAnyPermission(['all_access', 'edit_cms']), (_req, res) => {
    const snapshot = exportCompleteDatabaseSnapshot();
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="HotelKamal_DB_Backup_${dateStr}.json"`);
    res.send(JSON.stringify(snapshot, null, 2));
  });

  app.post('/api/admin/database/restore', requireStaffAuth, requirePermission('all_access'), (req: AuthenticatedRequest, res) => {
    const backupPayload = req.body?.backup || req.body;
    const result = restoreCompleteDatabaseSnapshot(backupPayload, req.authUser!.name);
    if (!result.ok) {
      return res.status(400).json({ ok: false, error: result.error || 'Restore failed' });
    }
    return res.json({ ok: true, result });
  });

  // 15. Clean Slate Initialization (Purge mock/test transactions for fresh operations)
  app.post('/api/admin/database/reset-fresh-production', requireStaffAuth, requirePermission('all_access'), (req: AuthenticatedRequest, res) => {
    const result = resetToFreshProductionState(req.authUser!.name);
    res.json(result);
  });

  // Legacy backup aliases for backward compatibility
  app.get('/api/admin/backup/export', requireStaffAuth, requirePermission('all_access'), (_req, res) => {
    const snapshot = exportFullDatabaseSnapshot();
    res.json({ ok: true, snapshot });
  });

  app.post('/api/admin/backup/restore', requireStaffAuth, requirePermission('all_access'), (req: AuthenticatedRequest, res) => {
    if (!req.body?.collections || !req.body?.kvSettings) {
      return res.status(400).json({ ok: false, error: 'Invalid backup snapshot payload.' });
    }
    const result = restoreDatabaseSnapshot(req.body);
    upsertCollectionItem('auditLogs', `log-${crypto.randomUUID().slice(0, 8)}`, {
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      actorName: req.authUser!.name,
      actorRole: req.authUser!.role,
      action: 'Database Snapshot Restored',
      category: 'security',
      details: `Restored ${result.restoredRecords} records from verified snapshot.`,
      ipAddress: req.ip || 'server',
    });
    return res.json({ ok: true, ...result });
  });
}
