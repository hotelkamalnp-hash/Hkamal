import crypto from 'crypto';
import type {
  BillItemLine,
  BillSettings,
  Booking,
  BookingAddon,
  BookingStatus,
  CurrencyCode,
  DigitalKeycard,
  GuestRoomSession,
  HotelCoupon,
  HotelThemeConfig,
  MasterInvoice,
  OperationalAlert,
  PaymentMethod,
  PaymentStatus,
  Room,
  RoomOperationalUnit,
  RoomType,
} from '../src/types/hotel';
import {
  allocateNextInvoiceNumber,
  enqueueNotificationJob,
  getCollectionItem,
  getKvSetting,
  listCollection,
  runInSqliteTransaction,
  upsertCollectionItem,
} from './db.ts';
import { broadcastRealtimeEvent } from './realtime.ts';

export const ADDON_CATALOG: Record<string, BookingAddon> = {
  breakfast: {
    id: 'breakfast',
    name: 'Ground-Floor Himalayan Breakfast Buffet',
    priceUSD: 8,
    description: 'Fresh highland coffee, farm eggs, Tibetan bread & seasonal fruit per night.',
  },
  airport: {
    id: 'airport',
    name: 'Private Airport Pickup (TIA -> Kamal Hotel)',
    priceUSD: 18,
    description: '24/7 private AC sedan from Tribhuvan International Airport with namecard welcome.',
  },
  late_checkout: {
    id: 'late_checkout',
    name: 'Guaranteed Late Check-Out (3:00 PM)',
    priceUSD: 15,
    description: 'Relax past noon before your evening departure flight.',
  },
  ad_breakfast: {
    id: 'ad_breakfast',
    name: 'Ground-Floor Himalayan Breakfast Buffet',
    priceUSD: 8,
    description: 'Daily breakfast per guest.',
  },
};

export interface BookingQuoteInput {
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  adults?: number;
  children?: number;
  currency?: CurrencyCode;
  addonIds?: string[];
  couponCode?: string;
}

export interface ServerBookingQuote {
  room: Room;
  nights: number;
  currency: CurrencyCode;
  roomNightlyUSD: number;
  roomTotalUSD: number;
  addons: BookingAddon[];
  addonsTotalUSD: number;
  subtotalUSD: number;
  discountUSD: number;
  serviceChargePercent: number;
  serviceChargeUSD: number;
  taxPercent: number;
  taxUSD: number;
  grandTotalUSD: number;
  // Currency-converted amounts
  subtotal: number;
  discountAmount: number;
  serviceChargeAmount: number;
  taxAmount: number;
  totalAmount: number;
  appliedCouponCode?: string;
}

export function isValidIsoDate(val: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(val) && !Number.isNaN(Date.parse(`${val}T00:00:00Z`));
}

export function computeNightsBetween(checkInDate: string, checkOutDate: string): number {
  const start = Date.parse(`${checkInDate}T00:00:00Z`);
  const end = Date.parse(`${checkOutDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

export function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}

export function roundMoney(n: number, currency: CurrencyCode): number {
  if (currency === 'NPR' || currency === 'INR') return Math.round(n);
  return Math.round(n * 100) / 100;
}

export function convertUsdToCurrency(
  usdAmount: number,
  currency: CurrencyCode,
  exchangeRates: { USD: number; NPR: number; INR: number }
): number {
  const rate = currency === 'NPR' ? exchangeRates.NPR || 135 : currency === 'INR' ? exchangeRates.INR || 84.5 : 1;
  return roundMoney(usdAmount * rate, currency);
}

export function syncRoomCatalogCountsOnServer(): void {
  const units = listCollection<RoomOperationalUnit>('roomUnits');
  const rooms = listCollection<Room>('rooms');
  if (rooms.length === 0) return;

  for (const room of rooms) {
    const matchingUnits = units.filter((u) => u.roomType === room.type);
    if (matchingUnits.length > 0) {
      const totalUnits = matchingUnits.length;
      const availableUnits = matchingUnits.filter(
        (u) => u.occupancyStatus === 'vacant' && u.cleanStatus !== 'out_of_order'
      ).length;
      if (room.totalUnits !== totalUnits || room.availableUnits !== availableUnits) {
        upsertCollectionItem('rooms', room.id, { ...room, totalUnits, availableUnits });
      }
    }
  }
}

export function getAvailableUnitsForDateRange(
  roomType: RoomType,
  checkInDate: string,
  checkOutDate: string,
  excludeBookingId?: string
): RoomOperationalUnit[] {
  const units = listCollection<RoomOperationalUnit>('roomUnits').filter(
    (u) => u.roomType === roomType && u.cleanStatus !== 'out_of_order'
  );
  const bookings = listCollection<Booking>('bookings').filter(
    (b) =>
      b.id !== excludeBookingId &&
      b.bookingStatus !== 'cancelled' &&
      b.bookingStatus !== 'no_show' &&
      b.bookingStatus !== 'checked-out' &&
      Boolean(b.assignedRoomNumber)
  );

  return units.filter((unit) => {
    const hasOverlap = bookings.some(
      (bk) =>
        bk.assignedRoomNumber === unit.roomNumber &&
        datesOverlap(bk.checkInDate, bk.checkOutDate, checkInDate, checkOutDate)
    );
    return !hasOverlap;
  });
}

export function buildAvailabilityReport(checkInDate: string, checkOutDate: string, guests = 1) {
  const rooms = listCollection<Room>('rooms');
  return rooms.map((room) => {
    const freeUnits = getAvailableUnitsForDateRange(room.type, checkInDate, checkOutDate);
    return {
      roomId: room.id,
      roomTypeId: room.id,
      roomName: room.name,
      roomType: room.type,
      pricePerNightUSD: room.pricePerNightUSD,
      maxGuests: room.maxGuests,
      fitsPartySize: room.maxGuests >= guests,
      availableCount: freeUnits.length,
      availableRoomNumbers: freeUnits.map((u) => u.roomNumber),
    };
  });
}

export function calculateAuthoritativeQuote(input: BookingQuoteInput):
  | { ok: true; quote: ServerBookingQuote }
  | { ok: false; status: number; message: string; code: string } {
  if (!isValidIsoDate(input.checkInDate) || !isValidIsoDate(input.checkOutDate)) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_DATES',
      message: 'Check-in and check-out dates must be valid YYYY-MM-DD dates.',
    };
  }

  const nights = computeNightsBetween(input.checkInDate, input.checkOutDate);
  if (nights < 1 || nights > 90) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_NIGHTS',
      message: 'Stay duration must be between 1 and 90 nights.',
    };
  }

  const rooms = listCollection<Room>('rooms');
  const room = rooms.find((r) => r.id === input.roomTypeId || r.type === input.roomTypeId);
  if (!room) {
    return {
      ok: false,
      status: 404,
      code: 'ROOM_TYPE_NOT_FOUND',
      message: 'Requested room category does not exist.',
    };
  }

  const adults = Number(input.adults || 1);
  const children = Number(input.children || 0);
  if (adults < 1 || adults + children > room.maxGuests + 2) {
    return {
      ok: false,
      status: 400,
      code: 'CAPACITY_EXCEEDED',
      message: `Maximum guest capacity exceeded for ${room.name}.`,
    };
  }

  const theme = getKvSetting<HotelThemeConfig>('themeConfig', {} as HotelThemeConfig);
  const billSettings = getKvSetting<BillSettings>('billSettings', {
    serviceChargePercent: 10,
    taxPercent: 13,
  } as BillSettings);

  const surge = Number(theme.seasonalSurgeMultiplier) > 0 ? Number(theme.seasonalSurgeMultiplier) : 1.0;
  const currency: CurrencyCode =
    input.currency === 'NPR' || input.currency === 'INR' || input.currency === 'USD'
      ? input.currency
      : 'USD';

  const roomNightlyUSD = Math.round(room.pricePerNightUSD * surge * 100) / 100;
  const roomTotalUSD = Math.round(roomNightlyUSD * nights * 100) / 100;

  const uniqueAddonIds = Array.from(new Set(input.addonIds || []));
  const addons: BookingAddon[] = [];
  for (const addonId of uniqueAddonIds) {
    const found = ADDON_CATALOG[addonId];
    if (found) {
      addons.push({ ...found });
    }
  }
  const addonsTotalUSD = Math.round(
    addons.reduce((acc, a) => {
      if (a.id === 'breakfast' || a.id === 'ad_breakfast') {
        return acc + a.priceUSD * nights * Math.max(1, adults);
      }
      return acc + a.priceUSD;
    }, 0) * 100
  ) / 100;

  const subtotalUSD = Math.round((roomTotalUSD + addonsTotalUSD) * 100) / 100;

  // Validate coupon if supplied
  let discountUSD = 0;
  let appliedCouponCode: string | undefined;
  if (input.couponCode && input.couponCode.trim()) {
    const cleanCode = input.couponCode.trim().toUpperCase();
    const coupons = listCollection<HotelCoupon>('coupons');
    const coupon = coupons.find((c) => c.code.toUpperCase() === cleanCode);
    const today = new Date().toISOString().slice(0, 10);
    if (
      coupon &&
      coupon.isActive &&
      coupon.validFrom <= today &&
      coupon.validUntil >= today &&
      (!coupon.usageLimit || coupon.timesUsed < coupon.usageLimit) &&
      (coupon.applicableTo === 'all' || coupon.applicableTo === 'rooms') &&
      (!coupon.minSpendUSD || subtotalUSD >= coupon.minSpendUSD)
    ) {
      if (coupon.discountType === 'percentage') {
        discountUSD = (subtotalUSD * coupon.discountValue) / 100;
        if (coupon.maxDiscountUSD) {
          discountUSD = Math.min(discountUSD, coupon.maxDiscountUSD);
        }
      } else {
        discountUSD = Math.min(subtotalUSD, coupon.discountValue);
      }
      discountUSD = Math.round(discountUSD * 100) / 100;
      appliedCouponCode = coupon.code;
    }
  }

  const netSubtotalUSD = Math.max(0, subtotalUSD - discountUSD);
  const serviceChargePercent = Number(billSettings.serviceChargePercent ?? 10);
  const taxPercent = Number(billSettings.taxPercent ?? theme.taxRatePercent ?? 13);
  const serviceChargeUSD = Math.round(((netSubtotalUSD * serviceChargePercent) / 100) * 100) / 100;
  const taxableBaseUSD = netSubtotalUSD + serviceChargeUSD;
  const taxUSD = Math.round(((taxableBaseUSD * taxPercent) / 100) * 100) / 100;
  const grandTotalUSD = Math.round((taxableBaseUSD + taxUSD) * 100) / 100;

  const rates = theme.exchangeRates || { USD: 1, NPR: 135, INR: 84.5 };

  return {
    ok: true,
    quote: {
      room,
      nights,
      currency,
      roomNightlyUSD,
      roomTotalUSD,
      addons,
      addonsTotalUSD,
      subtotalUSD,
      discountUSD,
      serviceChargePercent,
      serviceChargeUSD,
      taxPercent,
      taxUSD,
      grandTotalUSD,
      subtotal: convertUsdToCurrency(subtotalUSD, currency, rates),
      discountAmount: convertUsdToCurrency(discountUSD, currency, rates),
      serviceChargeAmount: convertUsdToCurrency(serviceChargeUSD, currency, rates),
      taxAmount: convertUsdToCurrency(taxUSD, currency, rates),
      totalAmount: convertUsdToCurrency(grandTotalUSD, currency, rates),
      appliedCouponCode,
    },
  };
}

export interface CreateBookingPayload {
  idempotencyKey?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCountry: string;
  roomTypeId: string;
  preferredRoomNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  currency: CurrencyCode;
  addonIds?: string[];
  couponCode?: string;
  specialRequests?: string;
  paymentMethod: PaymentMethod;
  emailVerificationToken?: string;
  bookingSource?: string;
}

export function createBookingTransactional(
  payload: CreateBookingPayload,
  options?: { initialPaymentStatus?: PaymentStatus }
):
  | {
      ok: true;
      duplicate: boolean;
      booking: Booking;
      invoice: MasterInvoice;
      guestSession: GuestRoomSession;
      quote: ServerBookingQuote;
    }
  | { ok: false; status: number; message: string; code: string } {
  const quoteRes = calculateAuthoritativeQuote({
    roomTypeId: payload.roomTypeId,
    checkInDate: payload.checkInDate,
    checkOutDate: payload.checkOutDate,
    adults: payload.adults,
    children: payload.children,
    currency: payload.currency,
    addonIds: payload.addonIds,
    couponCode: payload.couponCode,
  });

  if (!quoteRes.ok) return quoteRes;
  const quote = quoteRes.quote;

  if (!payload.guestName?.trim() || !payload.guestEmail?.trim()) {
    return {
      ok: false,
      status: 400,
      code: 'GUEST_INFO_REQUIRED',
      message: 'Guest full name and valid email address are required.',
    };
  }

  return runInSqliteTransaction((db) => {
    const idempotencyKey = payload.idempotencyKey?.trim();
    if (idempotencyKey) {
      const existingRow = db
        .prepare('SELECT data_json FROM bookings_store WHERE idempotency_key = ?')
        .get(idempotencyKey) as { data_json: string } | undefined;
      if (existingRow) {
        const existingBooking = JSON.parse(existingRow.data_json) as Booking;
        const existingInvoice = listCollection<MasterInvoice>('invoices').find(
          (i) => i.bookingCode === existingBooking.bookingCode
        )!;
        const existingSession =
          getCollectionItem<GuestRoomSession>(
            'guestSessions',
            `Room ${existingBooking.assignedRoomNumber}`
          ) ||
          ({
            roomNumber: `Room ${existingBooking.assignedRoomNumber}`,
            bookingCode: existingBooking.bookingCode,
            guestName: existingBooking.guestName,
            passcode: '0000',
            checkInDate: existingBooking.checkInDate,
            checkOutDate: existingBooking.checkOutDate,
            isActive: true,
            createdAt: existingBooking.createdAt,
            expiresAt: `${existingBooking.checkOutDate} 12:00`,
          } satisfies GuestRoomSession);
        return {
          ok: true,
          duplicate: true,
          booking: existingBooking,
          invoice: existingInvoice,
          guestSession: existingSession,
          quote,
        };
      }
    }

    // Check real date-range availability under EXCLUSIVE transaction lock
    const availableUnits = getAvailableUnitsForDateRange(
      quote.room.type,
      payload.checkInDate,
      payload.checkOutDate
    );

    let chosenUnit = payload.preferredRoomNumber
      ? availableUnits.find((u) => u.roomNumber === payload.preferredRoomNumber)
      : availableUnits[0];

    if (!chosenUnit && !payload.preferredRoomNumber) {
      chosenUnit = availableUnits[0];
    }

    if (!chosenUnit) {
      return {
        ok: false,
        status: 409,
        code: 'NO_ROOM_AVAILABLE',
        message: `All ${quote.room.name} units are booked or under maintenance for ${payload.checkInDate} → ${payload.checkOutDate}.`,
      };
    }

    const nowIso = new Date().toISOString();
    const bookingId = `bk-${crypto.randomUUID()}`;
    const bookingCode = `KH-${new Date().getFullYear()}-${crypto.randomInt(1000, 9999)}${crypto.randomInt(10, 99)}`;
    const paymentStatus: PaymentStatus = options?.initialPaymentStatus ?? 'pending';

    const booking: Booking = {
      id: bookingId,
      bookingCode,
      guestName: payload.guestName.trim(),
      guestEmail: payload.guestEmail.trim().toLowerCase(),
      guestPhone: (payload.guestPhone || '').trim(),
      guestCountry: (payload.guestCountry || 'Nepal').trim(),
      roomTypeId: quote.room.id,
      roomName: quote.room.name,
      roomType: quote.room.type,
      assignedRoomNumber: chosenUnit.roomNumber,
      assignedFloor: chosenUnit.floor,
      checkInDate: payload.checkInDate,
      checkOutDate: payload.checkOutDate,
      nights: quote.nights,
      adults: Number(payload.adults || 1),
      children: Number(payload.children || 0),
      addons: quote.addons,
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      totalAmount: quote.totalAmount,
      currency: quote.currency,
      paymentStatus,
      paymentMethod: payload.paymentMethod,
      bookingStatus: 'confirmed',
      createdAt: nowIso,
      specialRequests: payload.specialRequests?.trim(),
      smsSent: false,
      emailSent: false,
      whatsappSent: false,
    };

    db.prepare(`
      INSERT INTO bookings_store
        (id, booking_code, idempotency_key, room_type, assigned_room_number, check_in_date, check_out_date, booking_status, payment_status, total_amount, currency, created_at, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      booking.id,
      booking.bookingCode,
      idempotencyKey || null,
      booking.roomType,
      chosenUnit.roomNumber,
      booking.checkInDate,
      booking.checkOutDate,
      booking.bookingStatus,
      booking.paymentStatus,
      booking.totalAmount,
      booking.currency,
      booking.createdAt,
      JSON.stringify(booking)
    );

    // Reserve room unit status if currently vacant
    const updatedUnit: RoomOperationalUnit = {
      ...chosenUnit,
      occupancyStatus: chosenUnit.occupancyStatus === 'occupied' ? 'occupied' : 'reserved',
      currentBookingCode: chosenUnit.currentBookingCode || booking.bookingCode,
      currentGuestName: chosenUnit.currentGuestName || booking.guestName,
      checkInDate: chosenUnit.checkInDate || booking.checkInDate,
      checkOutDate: chosenUnit.checkOutDate || booking.checkOutDate,
    };
    upsertCollectionItem('roomUnits', chosenUnit.id, updatedUnit);
    syncRoomCatalogCountsOnServer();

    // Increment coupon usage atomically if applied
    if (quote.appliedCouponCode) {
      const coupons = listCollection<HotelCoupon>('coupons');
      const cp = coupons.find((c) => c.code === quote.appliedCouponCode);
      if (cp) {
        upsertCollectionItem('coupons', cp.id, { ...cp, timesUsed: cp.timesUsed + 1 });
      }
    }

    // Create Master Folio Invoice with sequential gapless invoice number
    const invoiceNumber = allocateNextInvoiceNumber('2082/83');
    const items: BillItemLine[] = [
      {
        id: `li-${crypto.randomUUID().slice(0, 8)}`,
        description: `${quote.room.name} (${quote.nights} nights @ $${quote.roomNightlyUSD}/nt · Room ${chosenUnit.roomNumber})`,
        category: 'room_stay',
        date: payload.checkInDate,
        quantity: quote.nights,
        rateUSD: quote.roomNightlyUSD,
        amountUSD: quote.roomTotalUSD,
      },
      ...quote.addons.map((addon) => {
        const isPerNight = addon.id === 'breakfast' || addon.id === 'ad_breakfast';
        const qty = isPerNight ? quote.nights * Math.max(1, Number(payload.adults || 1)) : 1;
        return {
          id: `li-${crypto.randomUUID().slice(0, 8)}`,
          description: addon.name,
          category: addon.id === 'airport' ? ('airport_transfer' as const) : ('other' as const),
          date: payload.checkInDate,
          quantity: qty,
          rateUSD: addon.priceUSD,
          amountUSD: Math.round(qty * addon.priceUSD * 100) / 100,
        };
      }),
    ];

    const paidUSD = paymentStatus === 'paid' ? quote.grandTotalUSD : 0;
    const balanceDueUSD = Math.max(0, Math.round((quote.grandTotalUSD - paidUSD) * 100) / 100);

    const invoice: MasterInvoice = {
      id: `inv-${crypto.randomUUID().slice(0, 8)}`,
      invoiceNumber,
      bookingCode: booking.bookingCode,
      roomNumber: `Room ${chosenUnit.roomNumber}`,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      guestAddress: booking.guestCountry,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      issuedAt: nowIso.slice(0, 16).replace('T', ' '),
      items,
      subtotalUSD: quote.subtotalUSD,
      discountPercent:
        quote.subtotalUSD > 0
          ? Math.round((quote.discountUSD / quote.subtotalUSD) * 1000) / 10
          : 0,
      discountAmountUSD: quote.discountUSD,
      serviceChargePercent: quote.serviceChargePercent,
      serviceChargeAmountUSD: quote.serviceChargeUSD,
      taxPercent: quote.taxPercent,
      taxAmountUSD: quote.taxUSD,
      grandTotalUSD: quote.grandTotalUSD,
      amountPaidUSD: paidUSD,
      balanceDueUSD,
      paymentStatus,
      paymentMethod: booking.paymentMethod,
      notes: booking.specialRequests,
    };
    upsertCollectionItem('invoices', invoice.id, invoice);

    // Create Guest Room Session with dynamic PIN
    const passcode = String(crypto.randomInt(1000, 9999));
    const roomLabel = `Room ${chosenUnit.roomNumber}`;
    const guestSession: GuestRoomSession = {
      roomNumber: roomLabel,
      bookingCode: booking.bookingCode,
      guestName: booking.guestName,
      passcode,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      isActive: true,
      createdAt: nowIso.slice(0, 16).replace('T', ' '),
      expiresAt: `${booking.checkOutDate} 12:00`,
    };
    upsertCollectionItem('guestSessions', roomLabel, guestSession);

    // Operational Alert
    const alert: OperationalAlert = {
      id: `alt-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: nowIso.slice(0, 16).replace('T', ' '),
      title: 'New Reservation Confirmed (Auto-Allocated)',
      message: `${booking.guestName} reserved ${booking.roomName} · Room ${chosenUnit.roomNumber} (${booking.bookingCode}).`,
      type: 'booking',
      targetRoles: ['super_admin', 'admin', 'hotel_manager', 'receptionist'],
      isRead: false,
      bookingCode: booking.bookingCode,
      roomNumber: chosenUnit.roomNumber,
    };
    upsertCollectionItem('operationalAlerts', alert.id, alert);

    // Enqueue SMS notification job if phone present
    if (booking.guestPhone) {
      enqueueNotificationJob({
        id: `job-sms-${crypto.randomUUID().slice(0, 8)}`,
        channel: 'sms',
        recipient: booking.guestPhone,
        body: `Namaste ${booking.guestName}! Your booking ${booking.bookingCode} at Kamal Hotel Kathmandu (Room ${chosenUnit.roomNumber}, ${booking.checkInDate} to ${booking.checkOutDate}) is confirmed. Portal PIN: ${passcode}.`,
        templateName: 'booking_confirmed_sms',
        payload: { bookingCode: booking.bookingCode, roomNumber: chosenUnit.roomNumber },
        maxAttempts: 3,
      });
    }

    // Write immutable audit log
    upsertCollectionItem('auditLogs', `log-${crypto.randomUUID().slice(0, 8)}`, {
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: nowIso.slice(0, 19).replace('T', ' '),
      actorName: booking.guestName,
      actorRole: payload.bookingSource === 'reception' ? 'Front Desk' : 'Guest Direct Booking',
      action: 'Booking Created (Transactional)',
      category: 'booking',
      details: `Confirmed ${booking.bookingCode} for Room ${chosenUnit.roomNumber} (${booking.checkInDate} → ${booking.checkOutDate}) · Total ${quote.currency} ${quote.totalAmount} · Invoice ${invoiceNumber}.`,
      ipAddress: 'server',
    });

    broadcastRealtimeEvent('booking:created', { booking, invoice, updatedUnit }, 'staff');
    broadcastRealtimeEvent(
      'availability:changed',
      { roomType: booking.roomType, checkInDate: booking.checkInDate, checkOutDate: booking.checkOutDate },
      'public'
    );

    return {
      ok: true,
      duplicate: false,
      booking,
      invoice,
      guestSession,
      quote,
    };
  });
}

export function transitionBookingStatus(
  bookingId: string,
  nextStatus: BookingStatus,
  actorName: string
):
  | { ok: true; booking: Booking; updatedUnit?: RoomOperationalUnit }
  | { ok: false; status: number; message: string } {
  return runInSqliteTransaction(() => {
    const existing = getCollectionItem<Booking>('bookings', bookingId);
    if (!existing) {
      return { ok: false, status: 404, message: 'Booking not found.' };
    }

    const updated: Booking = { ...existing, bookingStatus: nextStatus };
    upsertCollectionItem('bookings', existing.id, updated);

    const units = listCollection<RoomOperationalUnit>('roomUnits');
    const unit = units.find((u) => u.roomNumber === existing.assignedRoomNumber);
    let updatedUnit: RoomOperationalUnit | undefined;

    if (unit) {
      if (nextStatus === 'checked-in') {
        updatedUnit = {
          ...unit,
          occupancyStatus: 'occupied',
          currentBookingCode: existing.bookingCode,
          currentGuestName: existing.guestName,
          checkInDate: existing.checkInDate,
          checkOutDate: existing.checkOutDate,
        };
        upsertCollectionItem('roomUnits', unit.id, updatedUnit);

        const dk: DigitalKeycard = {
          id: `dkey-${crypto.randomUUID().slice(0, 8)}`,
          keyToken: `DK-${unit.roomNumber}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          roomNumber: `Room ${unit.roomNumber}`,
          guestName: existing.guestName,
          bookingCode: existing.bookingCode,
          accessScope: 'room_and_amenities',
          validFrom: new Date().toISOString(),
          expiresAt: `${existing.checkOutDate}T12:00:00Z`,
          issuedBy: actorName,
          issuedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          status: 'active',
          unlockCount: 0,
        };
        upsertCollectionItem('digitalKeycards', dk.id, dk);
      } else if (nextStatus === 'checked-out') {
        updatedUnit = {
          ...unit,
          occupancyStatus: 'vacant',
          cleanStatus: 'dirty',
          currentBookingCode: undefined,
          currentGuestName: undefined,
          checkInDate: undefined,
          checkOutDate: undefined,
        };
        upsertCollectionItem('roomUnits', unit.id, updatedUnit);
      } else if (nextStatus === 'cancelled' || nextStatus === 'no_show') {
        updatedUnit = {
          ...unit,
          occupancyStatus: 'vacant',
          currentBookingCode: undefined,
          currentGuestName: undefined,
        };
        upsertCollectionItem('roomUnits', unit.id, updatedUnit);
      }
    }

    syncRoomCatalogCountsOnServer();

    upsertCollectionItem('auditLogs', `log-${crypto.randomUUID().slice(0, 8)}`, {
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      actorName,
      actorRole: 'Staff',
      action: `Booking Status -> ${nextStatus}`,
      category: 'booking',
      details: `Updated ${existing.bookingCode} (${existing.guestName}) to ${nextStatus}.`,
      ipAddress: 'server',
    });

    broadcastRealtimeEvent('booking:updated', { booking: updated, updatedUnit }, 'staff');
    broadcastRealtimeEvent('availability:changed', { roomType: updated.roomType }, 'public');

    return { ok: true, booking: updated, updatedUnit };
  });
}

export function assignBookingRoomNumber(
  bookingId: string,
  newRoomNumber: string,
  actorName: string
):
  | { ok: true; booking: Booking; updatedUnit: RoomOperationalUnit }
  | { ok: false; status: number; message: string } {
  return runInSqliteTransaction(() => {
    const existing = getCollectionItem<Booking>('bookings', bookingId);
    if (!existing) return { ok: false, status: 404, message: 'Booking not found.' };

    const units = listCollection<RoomOperationalUnit>('roomUnits');
    const targetUnit = units.find((u) => u.roomNumber === newRoomNumber);
    if (!targetUnit) return { ok: false, status: 404, message: 'Target room unit not found.' };

    if (targetUnit.cleanStatus === 'out_of_order') {
      return { ok: false, status: 409, message: `Room ${newRoomNumber} is Out of Order.` };
    }

    const conflicting = listCollection<Booking>('bookings').find(
      (b) =>
        b.id !== existing.id &&
        b.assignedRoomNumber === newRoomNumber &&
        b.bookingStatus !== 'cancelled' &&
        b.bookingStatus !== 'no_show' &&
        b.bookingStatus !== 'checked-out' &&
        datesOverlap(b.checkInDate, b.checkOutDate, existing.checkInDate, existing.checkOutDate)
    );
    if (conflicting) {
      return {
        ok: false,
        status: 409,
        message: `Room ${newRoomNumber} overlaps with reservation ${conflicting.bookingCode} (${conflicting.checkInDate} → ${conflicting.checkOutDate}).`,
      };
    }

    const oldUnit = units.find((u) => u.roomNumber === existing.assignedRoomNumber);
    if (oldUnit && oldUnit.roomNumber !== targetUnit.roomNumber) {
      upsertCollectionItem('roomUnits', oldUnit.id, {
        ...oldUnit,
        occupancyStatus: 'vacant',
        currentBookingCode: undefined,
        currentGuestName: undefined,
      });
    }

    const updatedUnit: RoomOperationalUnit = {
      ...targetUnit,
      occupancyStatus: existing.bookingStatus === 'checked-in' ? 'occupied' : 'reserved',
      currentBookingCode: existing.bookingCode,
      currentGuestName: existing.guestName,
      checkInDate: existing.checkInDate,
      checkOutDate: existing.checkOutDate,
    };
    upsertCollectionItem('roomUnits', targetUnit.id, updatedUnit);

    const updatedBooking: Booking = {
      ...existing,
      assignedRoomNumber: targetUnit.roomNumber,
      assignedFloor: targetUnit.floor,
    };
    upsertCollectionItem('bookings', existing.id, updatedBooking);
    syncRoomCatalogCountsOnServer();

    upsertCollectionItem('auditLogs', `log-${crypto.randomUUID().slice(0, 8)}`, {
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      actorName,
      actorRole: 'Front Desk',
      action: 'Room Unit Assigned',
      category: 'booking',
      details: `Assigned ${existing.bookingCode} to Room ${targetUnit.roomNumber}.`,
      ipAddress: 'server',
    });

    broadcastRealtimeEvent('booking:updated', { booking: updatedBooking, updatedUnit }, 'staff');
    return { ok: true, booking: updatedBooking, updatedUnit };
  });
}
