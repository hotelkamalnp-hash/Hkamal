import React, { useState, useMemo } from 'react';
import { useHotel } from '../../context/HotelContext';
import { useRenderTracker } from '../../hooks/useRenderTracker';
import { 
  RoomOperationalUnit, 
  ShiftType, 
  PaymentMethod,
  Booking,
  MasterInvoice
} from '../../types/hotel';
import { formatCurrency, convertPrice } from '../../utils/theme';
import { downloadBookingVoucherPdf } from '../../utils/printUtility';
import { 
  ConciergeBell, 
  BedDouble, 
  UserCheck, 
  Key, 
  Receipt, 
  Plus, 
  Clock, 
  ShieldCheck, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Printer,
  Sparkles,
  Phone,
  Calendar,
  AlarmClock,
  Crown,
  Mail,
  Download,
  Search
} from 'lucide-react';
import { InvoicePrintModal } from '../Billing/InvoicePrintModal';
import { GuestKeycardQrModal } from '../GuestPortal/GuestKeycardQrModal';
import { useModalDismiss, ModalDismissButton } from '../Common/ModalDismissHandler';
import { HorizontalTabSlider } from '../Common/HorizontalTabSlider';
import { RoomHeatmapWidget } from './RoomHeatmapWidget';
import { WakeUpCallFrontDeskPanel } from './WakeUpCallFrontDeskPanel';

const normalizeRoomNumberToken = (val?: string): string =>
  (val || '').trim().toLowerCase().replace(/^room\s+/i, '').trim();

const isSameRoomNumber = (a?: string, b?: string): boolean => {
  const na = normalizeRoomNumberToken(a);
  const nb = normalizeRoomNumberToken(b);
  return Boolean(na && nb && na === nb);
};

export const ReceptionDesk: React.FC = () => {
  useRenderTracker('ReceptionDesk');
  const { 
    roomUnits, 
    rooms, 
    bookings, 
    invoices, 
    billSettings,
    currentCurrency, 
    themeConfig,
    activeUser,
    checkInRoomUnit, 
    checkOutRoomUnit,
    generateNewRoomPasscode,
    guestSessions,
    shiftHandovers,
    addShiftHandover,
    createBooking,
    assignRoomToBooking,
    updateBookingStatus,
    resendBookingConfirmationEmail,
    getAvailableRoomsForType,
    createCustomInvoice,
    generateInvoiceForBooking,
    addPaymentToInvoice,
    updateInvoice,
    wakeUpCalls,
    findVipProfile,
    flagVipGuest,
    operationalAlerts,
    markAlertAsRead,
    showToast,
    addAuditLog
  } = useHotel();

  type ReceptionSubTab = 'rooms_grid' | 'arrivals' | 'heatmap' | 'wake_up_calls' | 'walkin_checkin' | 'in_house_folios' | 'shift_handover';
  const [activeSubTab, setActiveSubTab] = useState<ReceptionSubTab>('rooms_grid');

  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ subTab?: ReceptionSubTab }>).detail;
      if (detail?.subTab) {
        setActiveSubTab(detail.subTab);
      }
    };
    window.addEventListener('kamal-open-reception-subtab', handler as EventListener);
    return () => window.removeEventListener('kamal-open-reception-subtab', handler as EventListener);
  }, []);

  const [arrivalsSearch, setArrivalsSearch] = useState('');
  const [arrivalsFilter, setArrivalsFilter] = useState<'all' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled'>('all');
  const [resendingBookingId, setResendingBookingId] = useState<string | null>(null);
  const [pendingCheckoutModal, setPendingCheckoutModal] = useState<{ roomNumber: string; invoice: MasterInvoice } | null>(null);

  const pendingArrivals = useMemo(
    () =>
      bookings
        .filter((b) => b.bookingStatus === 'confirmed')
        .slice()
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [bookings]
  );

  const filteredArrivalBookings = useMemo(() => {
    const q = arrivalsSearch.trim().toLowerCase();
    return bookings
      .filter((b) => {
        const matchesStatus = arrivalsFilter === 'all' || b.bookingStatus === arrivalsFilter;
        const matchesQuery =
          !q ||
          b.guestName.toLowerCase().includes(q) ||
          b.guestEmail.toLowerCase().includes(q) ||
          b.bookingCode.toLowerCase().includes(q) ||
          b.roomName.toLowerCase().includes(q) ||
          (b.assignedRoomNumber && b.assignedRoomNumber.toLowerCase().includes(q));
        return matchesStatus && matchesQuery;
      })
      .slice()
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [bookings, arrivalsSearch, arrivalsFilter]);

  const pendingWakeUpCalls = useMemo(
    () => wakeUpCalls.filter((w) => w.status === 'scheduled' || w.status === 'alerted' || w.status === 'acknowledged'),
    [wakeUpCalls]
  );
  const unacknowledgedWakeUpCalls = useMemo(
    () => wakeUpCalls.filter((w) => w.status === 'scheduled' || w.status === 'alerted'),
    [wakeUpCalls]
  );
  const unreadVipAlerts = useMemo(
    () => operationalAlerts.filter((a) => !a.isRead && a.type === 'vip_checkin'),
    [operationalAlerts]
  );
  const [flagWalkInAsVip, setFlagWalkInAsVip] = useState<boolean>(false);

  // Walk-in Form State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestCountry, setGuestCountry] = useState('Nepal');
  const [idDocumentNumber, setIdDocumentNumber] = useState('');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('101');
  const [nights, setNights] = useState(1);
  const [adults, setAdults] = useState(2);
  const [advanceDepositUSD, setAdvanceDepositUSD] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  // Incidental Charge Modal
  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [targetRoomForCharge, setTargetRoomForCharge] = useState('');
  const [chargeDescription, setChargeDescription] = useState('Express Laundry & Pressing');
  const [chargeCategory, setChargeCategory] = useState<'laundry' | 'airport_transfer' | 'minibar' | 'spa_wellness' | 'other'>('laundry');
  const [chargeAmountUSD, setChargeAmountUSD] = useState(15);

  // Bill Print & Keycard modals
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<any | null>(null);
  const [selectedSessionForQr, setSelectedSessionForQr] = useState<any | null>(null);

  // Shift Handover State
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [shiftType, setShiftType] = useState<ShiftType>('morning');
  const [cashInDrawerNPR, setCashInDrawerNPR] = useState(45000);
  const [notesForNextShift, setNotesForNextShift] = useState('');
  const [unresolvedIssues, setUnresolvedIssues] = useState('');

  useModalDismiss(isAddChargeOpen, () => setIsAddChargeOpen(false));
  useModalDismiss(isAddShiftOpen, () => setIsAddShiftOpen(false));
  useModalDismiss(Boolean(pendingCheckoutModal), () => setPendingCheckoutModal(null));

  const { occupiedCount, vacantCleanCount, dirtyCount } = useMemo(() => {
    let occ = 0;
    let vacClean = 0;
    let dirty = 0;
    for (const u of roomUnits) {
      if (u.occupancyStatus === 'occupied') occ++;
      if (u.occupancyStatus === 'vacant' && u.cleanStatus === 'clean') vacClean++;
      if (u.cleanStatus === 'dirty') dirty++;
    }
    return { occupiedCount: occ, vacantCleanCount: vacClean, dirtyCount: dirty };
  }, [roomUnits]);

  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      showToast('Validation Error', 'Guest full name is required.', 'error');
      return;
    }

    const unit = roomUnits.find((u) => u.roomNumber === selectedRoomNumber);
    const roomCatalog = rooms.find((r) => r.type === unit?.roomType) || rooms[0];
    const rateUSD = roomCatalog.pricePerNightUSD;
    const subtotalUSD = rateUSD * nights;
    const scUSD = subtotalUSD * 0.10;
    const vatUSD = (subtotalUSD + scUSD) * 0.13;
    const totalUSD = Math.round((subtotalUSD + scUSD + vatUSD) * 100) / 100;

    const checkInDate = new Date().toISOString().split('T')[0];
    const checkOutDate = new Date(Date.now() + nights * 86400000).toISOString().split('T')[0];

    // Create booking
    const newBooking = createBooking({
      guestName,
      guestEmail: guestEmail || `${guestName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      guestPhone: guestPhone || '+977 98',
      guestCountry,
      roomTypeId: roomCatalog.id,
      roomName: `${roomCatalog.name} (Room ${selectedRoomNumber})`,
      roomType: roomCatalog.type,
      checkInDate,
      checkOutDate,
      nights,
      adults,
      children: 0,
      addons: [],
      subtotal: subtotalUSD,
      taxAmount: vatUSD,
      totalAmount: totalUSD,
      currency: 'USD',
      paymentStatus: advanceDepositUSD >= totalUSD ? 'paid' : 'pending',
      paymentMethod,
      bookingStatus: 'checked-in',
      specialRequests: `Walk-in Front Desk check-in. ID: ${idDocumentNumber || 'Verified'}. Deposit: $${advanceDepositUSD}`,
    });

    if (flagWalkInAsVip) {
      flagVipGuest({
        guestName,
        guestEmail: guestEmail || `${guestName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        guestPhone: guestPhone || undefined,
        tier: 'high_value',
        staysCount: 1,
        lifetimeSpendUSD: totalUSD,
        preferences: `Checked into Room ${selectedRoomNumber} (${nights} nights).`,
        alertMessage: `VIP Walk-In Guest in Room ${selectedRoomNumber} — Ensure priority housekeeping & concierge check-in follow-up.`,
      });
      setFlagWalkInAsVip(false);
    }

    // Mark room unit occupied
    checkInRoomUnit(selectedRoomNumber, guestName, newBooking.bookingCode);

    // Generate Keycard passcode
    const session = generateNewRoomPasscode(
      `Room ${selectedRoomNumber}`,
      newBooking.bookingCode,
      guestName
    );

    // Create master invoice
    generateInvoiceForBooking(newBooking.id);

    showToast('Guest Checked In', `Room ${selectedRoomNumber} allocated to ${guestName}. Passcode: ${session.passcode}`, 'success');
    setSelectedSessionForQr(session);
    setActiveSubTab('rooms_grid');
  };

  const handlePostIncidental = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRoomForCharge || chargeAmountUSD <= 0) return;

    // Find invoice for this room
    const matchingInv = invoices.find((inv) => isSameRoomNumber(inv.roomNumber, targetRoomForCharge));

    if (matchingInv) {
      const newLine = {
        id: 'li-' + Date.now(),
        description: chargeDescription,
        category: chargeCategory,
        date: new Date().toISOString().split('T')[0],
        quantity: 1,
        rateUSD: chargeAmountUSD,
        amountUSD: chargeAmountUSD,
      };

      const updatedItems = [...matchingInv.items, newLine];
      const newSubtotal = updatedItems.reduce((acc, i) => acc + i.amountUSD, 0);
      const disc = (newSubtotal * matchingInv.discountPercent) / 100;
      const discountedSub = newSubtotal - disc;
      const sc = Math.round(((discountedSub * matchingInv.serviceChargePercent) / 100) * 100) / 100;
      const vatBase = discountedSub + sc;
      const tax = Math.round(((vatBase * matchingInv.taxPercent) / 100) * 100) / 100;
      const grandTotal = Math.round((vatBase + tax) * 100) / 100;
      const balance = Math.max(0, Math.round((grandTotal - matchingInv.amountPaidUSD) * 100) / 100);

      updateInvoice(matchingInv.id, {
        items: updatedItems,
        subtotalUSD: newSubtotal,
        serviceChargeAmountUSD: sc,
        taxAmountUSD: tax,
        grandTotalUSD: grandTotal,
        balanceDueUSD: balance,
        paymentStatus: balance > 0 ? 'pending' : 'paid',
      });

      const formattedCharge = formatCurrency(
        convertPrice(chargeAmountUSD, currentCurrency, themeConfig.exchangeRates),
        currentCurrency
      );
      addAuditLog('Incidental Charged', 'payment', `Posted $${chargeAmountUSD} (${chargeDescription}) to Room ${targetRoomForCharge}`);
      showToast('Charge Posted', `${formattedCharge} billed to Room ${targetRoomForCharge}.`);
    } else {
      showToast('Error', `No active invoice found for Room ${targetRoomForCharge}.`, 'error');
    }

    setIsAddChargeOpen(false);
  };

  const handleCheckoutGuest = (roomNumber: string) => {
    const inv = invoices.find((i) => isSameRoomNumber(i.roomNumber, roomNumber));
    if (inv && inv.balanceDueUSD > 0) {
      setPendingCheckoutModal({ roomNumber, invoice: inv });
      return;
    }

    checkOutRoomUnit(roomNumber);
    if (inv) {
      setSelectedInvoiceForPrint(inv);
    }
  };

  const handleOpenVoucherPdf = (b: Booking) => {
    const roomSubFormatted = formatCurrency(b.subtotal, b.currency);
    const scAmount = Math.round(b.subtotal * 0.1 * 100) / 100;
    const scFormatted = formatCurrency(scAmount, b.currency);
    const taxFormatted = formatCurrency(b.taxAmount, b.currency);
    const totalFormatted = formatCurrency(b.totalAmount, b.currency);
    downloadBookingVoucherPdf({
      bookingCode: b.bookingCode,
      guestName: b.guestName,
      guestEmail: b.guestEmail,
      guestPhone: b.guestPhone,
      guestCountry: b.guestCountry,
      roomName: b.roomName,
      assignedRoomNumber: b.assignedRoomNumber,
      checkInDate: b.checkInDate,
      checkOutDate: b.checkOutDate,
      checkInTime: themeConfig.checkInTime,
      checkOutTime: themeConfig.checkOutTime,
      nights: b.nights,
      adults: b.adults,
      children: b.children,
      paymentMethod: b.paymentMethod,
      paymentStatus: b.paymentStatus,
      currency: b.currency,
      roomSubtotalFormatted: roomSubFormatted,
      addons: (b.addons || []).map((a) => ({
        name: a.name,
        priceFormatted: formatCurrency(
          convertPrice(a.priceUSD, b.currency, themeConfig.exchangeRates),
          b.currency
        ),
      })),
      serviceChargeFormatted: scFormatted,
      taxFormatted,
      totalAmountFormatted: totalFormatted,
      specialRequests: b.specialRequests,
      hotelName: themeConfig.hotelName,
      hotelAddress: themeConfig.address,
      hotelPhone: themeConfig.contactPhone,
      hotelEmail: themeConfig.contactEmail,
      panVatNumber: billSettings.panVatNumber,
    });
    showToast('Voucher Downloaded', `${b.bookingCode}.pdf saved.`, 'success');
  };

  const handleCheckInReservation = (b: Booking) => {
    let targetRoomNum = b.assignedRoomNumber;
    if (!targetRoomNum) {
      const avail = getAvailableRoomsForType(b.roomType);
      const fallback = avail[0] || roomUnits.find((u) => u.occupancyStatus === 'vacant');
      if (!fallback) {
        showToast('No Vacant Room', `Assign a vacant physical room for ${b.guestName} before check-in.`, 'warning');
        return;
      }
      targetRoomNum = fallback.roomNumber;
      assignRoomToBooking(b.id, targetRoomNum);
    }
    updateBookingStatus(b.id, 'checked-in');
    const existingSession = guestSessions.find(
      (s) => s.bookingCode === b.bookingCode || (targetRoomNum && isSameRoomNumber(s.roomNumber, targetRoomNum))
    );
    if (existingSession) {
      setSelectedSessionForQr(existingSession);
    } else if (targetRoomNum) {
      const session = generateNewRoomPasscode(`Room ${targetRoomNum}`, b.bookingCode, b.guestName);
      setSelectedSessionForQr(session);
    }
    generateInvoiceForBooking(b.id);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    addShiftHandover({
      shift: shiftType,
      staffName: activeUser?.name || 'Bikash Adhikari',
      cashInDrawerNPR: Number(cashInDrawerNPR),
      unresolvedIssues: unresolvedIssues || 'None',
      notesForNextShift: notesForNextShift || 'Standard operations, maintain vigilant check-in flow.',
      arrivalsExpectedCount: bookings.filter((b) => b.bookingStatus === 'confirmed').length,
      departuresPendingCount: occupiedCount,
      inHouseGuestsCount: occupiedCount,
    });
    setIsAddShiftOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Front Desk Header & Metrics */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <ConciergeBell className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <h2 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">
                Front Desk & Reception Operations
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              End-to-end guest reservations, walk-in GRC check-in, keycard passcodes, incidentals, and IRD Nepal tax billing.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSubTab('walkin_checkin')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white transition shadow-sm cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Walk-in Check-In (GRC)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTargetRoomForCharge(roomUnits.find((u) => u.occupancyStatus === 'occupied')?.roomNumber || '104');
                setIsAddChargeOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              <span>Post Incidentals</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddShiftOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 transition cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              <span>Shift Handover</span>
            </button>
          </div>
        </div>

        {/* Live Operational KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="bg-stone-50 dark:bg-stone-950 p-3 rounded-lg border border-stone-200/80 dark:border-stone-800/80">
            <div className="text-[11px] text-stone-500 font-medium">Occupied Rooms</div>
            <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100 mt-1">
              {occupiedCount} <span className="text-xs text-stone-400 font-normal">/ {roomUnits.length}</span>
            </div>
          </div>

          <div className="bg-stone-50 dark:bg-stone-950 p-3 rounded-lg border border-stone-200/80 dark:border-stone-800/80">
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Vacant Clean (Ready)</div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {vacantCleanCount}
            </div>
          </div>

          <div className="bg-stone-50 dark:bg-stone-950 p-3 rounded-lg border border-stone-200/80 dark:border-stone-800/80">
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Dirty / Cleaning</div>
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
              {dirtyCount}
            </div>
          </div>

          <div className="bg-stone-50 dark:bg-stone-950 p-3 rounded-lg border border-stone-200/80 dark:border-stone-800/80">
            <div className="text-[11px] text-stone-500 font-medium">Active Folios</div>
            <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100 mt-1">
              {invoices.length}
            </div>
          </div>
        </div>
      </div>

      {/* Unread VIP Check-In Alert Strip */}
      {unreadVipAlerts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-400 dark:border-amber-700 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Crown className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-950 dark:text-amber-100">
                {unreadVipAlerts[0].title}
              </div>
              <div className="text-amber-900 dark:text-amber-300 mt-0.5">
                {unreadVipAlerts[0].message}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => markAlertAsRead(unreadVipAlerts[0].id)}
            className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-700 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Acknowledge VIP Arrival
          </button>
        </div>
      )}

      {/* Front Desk Wake-Up Call Alert Strip */}
      {unacknowledgedWakeUpCalls.length > 0 && activeSubTab !== 'wake_up_calls' && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlarmClock className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-amber-950 dark:text-amber-100">
                Front Desk Wake-Up Alert: {unacknowledgedWakeUpCalls.length} pending guest request{unacknowledgedWakeUpCalls.length > 1 ? 's' : ''}
              </span>
              <span className="text-amber-800 dark:text-amber-300 ml-2 font-mono tabular-nums">
                Next: {unacknowledgedWakeUpCalls[0].roomNumber} at {unacknowledgedWakeUpCalls[0].wakeUpTime} ({unacknowledgedWakeUpCalls[0].wakeUpDate})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('wake_up_calls')}
            className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Review Wake-Up Queue
          </button>
        </div>
      )}

      {/* Pending Online Arrivals Alert Strip */}
      {pendingArrivals.length > 0 && activeSubTab !== 'arrivals' && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-emerald-950 dark:text-emerald-100 tabular-nums">
                Confirmed Online Reservations Ready for Arrival: {pendingArrivals.length}
              </span>
              <span className="text-emerald-800 dark:text-emerald-300 ml-2">
                Latest: {pendingArrivals[0].guestName} ({pendingArrivals[0].bookingCode}
                {pendingArrivals[0].assignedRoomNumber ? ` · Room ${pendingArrivals[0].assignedRoomNumber}` : ''})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('arrivals')}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            View Reservations &amp; Check-In
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="bg-stone-100 dark:bg-stone-900 p-1.5 rounded-lg border border-stone-200 dark:border-stone-800">
        <HorizontalTabSlider scrollStep={240} ariaLabel="Front Desk Sections">
          <div className="flex items-center gap-1 w-max">
            <button
              type="button"
              onClick={() => setActiveSubTab('rooms_grid')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubTab === 'rooms_grid'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <BedDouble className="w-3.5 h-3.5" />
              <span>Room Grid ({roomUnits.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('arrivals')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubTab === 'arrivals'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span className="tabular-nums">
                Reservations &amp; Arrivals ({pendingArrivals.length} pending / {bookings.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('heatmap')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubTab === 'heatmap'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Occupancy &amp; Maintenance Heatmap</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('walkin_checkin')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubTab === 'walkin_checkin'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Walk-In Registration (GRC)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('in_house_folios')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubTab === 'in_house_folios'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Guest Folios & Tax Invoices ({invoices.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('wake_up_calls')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubTab === 'wake_up_calls'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <AlarmClock className="w-3.5 h-3.5 text-amber-600" />
              <span className="tabular-nums">Wake-Up Calls ({pendingWakeUpCalls.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('shift_handover')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubTab === 'shift_handover'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Shift Logs & Drawer ({shiftHandovers.length})</span>
            </button>
          </div>
        </HorizontalTabSlider>
      </div>

      {/* Subtab: Expected Arrivals & Online Guest Reservations */}
      {activeSubTab === 'arrivals' && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
            <div>
              <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100">
                Online Reservations &amp; Expected Guest Arrivals
              </h3>
              <p className="text-xs text-stone-500">
                Assign room units, verify OTP-confirmed emails, issue keycard QRs on check-in, resend vouchers, or print guest tax invoices.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={arrivalsSearch}
                  onChange={(e) => setArrivalsSearch(e.target.value)}
                  placeholder="Search guest, booking ref, room..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
              <select
                value={arrivalsFilter}
                onChange={(e) => setArrivalsFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                <option value="all">All ({bookings.length})</option>
                <option value="confirmed">Confirmed / Arrivals ({pendingArrivals.length})</option>
                <option value="checked-in">Checked-In</option>
                <option value="checked-out">Checked-Out</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-semibold border-b border-stone-200 dark:border-stone-700">
                <tr>
                  <th className="py-2.5 px-3">Ref &amp; Dates</th>
                  <th className="py-2.5 px-3">Guest Details</th>
                  <th className="py-2.5 px-3">Room Category &amp; Unit</th>
                  <th className="py-2.5 px-3">Total / Payment</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Front Desk Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {filteredArrivalBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">
                      No reservations match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredArrivalBookings.map((b) => {
                    const matchedVip = findVipProfile(b.guestEmail, b.guestName, b.guestPhone);
                    const matchingInvoice = invoices.find((inv) => inv.bookingCode === b.bookingCode);
                    const candidateUnits = roomUnits.filter(
                      (u) =>
                        u.roomNumber === b.assignedRoomNumber ||
                        u.occupancyStatus !== 'occupied'
                    );

                    return (
                      <tr key={b.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                        <td className="py-3 px-3 align-top">
                          <div className="font-mono font-bold text-amber-700 dark:text-amber-400">
                            {b.bookingCode}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono mt-0.5 tabular-nums">
                            {b.checkInDate} → {b.checkOutDate} ({b.nights}n)
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            {b.adults} Adults{b.children > 0 ? `, ${b.children} Children` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-stone-900 dark:text-stone-100">
                              {b.guestName}
                            </span>
                            {matchedVip && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                                <Crown className="w-3 h-3" /> VIP
                              </span>
                            )}
                            {b.emailVerified && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-semibold">
                                <ShieldCheck className="w-3 h-3" /> Verified
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-500 mt-0.5">{b.guestEmail}</div>
                          <div className="text-[11px] text-stone-400 font-mono">{b.guestPhone}</div>
                        </td>
                        <td className="py-3 px-3 align-top">
                          <div className="font-medium text-stone-800 dark:text-stone-200">{b.roomName}</div>
                          <div className="mt-1.5">
                            <select
                              value={b.assignedRoomNumber || ''}
                              onChange={(e) => {
                                if (e.target.value) assignRoomToBooking(b.id, e.target.value);
                              }}
                              disabled={b.bookingStatus === 'checked-out' || b.bookingStatus === 'cancelled'}
                              className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-[11px] font-mono text-stone-900 dark:text-stone-100"
                            >
                              <option value="">Assign physical room...</option>
                              {candidateUnits.map((u) => (
                                <option key={u.id} value={u.roomNumber}>
                                  Room {u.roomNumber} ({u.floor} · {u.cleanStatus})
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top">
                          {(() => {
                            const amountInUSD =
                              b.currency === 'NPR'
                                ? b.totalAmount / (themeConfig.exchangeRates?.NPR || 135)
                                : b.currency === 'INR'
                                ? b.totalAmount / (themeConfig.exchangeRates?.INR || 84)
                                : b.totalAmount;
                            return (
                              <>
                                <div className="font-serif font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                                  {formatCurrency(
                                    convertPrice(amountInUSD, currentCurrency, themeConfig.exchangeRates),
                                    currentCurrency
                                  )}
                                </div>
                                {b.currency !== currentCurrency && (
                                  <div className="text-[10px] text-stone-400 font-mono">
                                    Booked: {formatCurrency(b.totalAmount, b.currency)}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                            {b.paymentStatus} · {b.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-top">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              b.bookingStatus === 'checked-in'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : b.bookingStatus === 'confirmed'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            {b.bookingStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-top text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {b.bookingStatus === 'confirmed' && (
                              <button
                                type="button"
                                onClick={() => handleCheckInReservation(b)}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                              >
                                Check In &amp; Issue Keycard
                              </button>
                            )}
                            {b.bookingStatus === 'checked-in' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (b.assignedRoomNumber) {
                                    handleCheckoutGuest(b.assignedRoomNumber);
                                  } else {
                                    updateBookingStatus(b.id, 'checked-out');
                                  }
                                }}
                                className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 text-white text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                              >
                                Check Out
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={resendingBookingId === b.id}
                              onClick={async () => {
                                setResendingBookingId(b.id);
                                await resendBookingConfirmationEmail(b);
                                setResendingBookingId(null);
                              }}
                              className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                              title="Send / Resend confirmation email"
                            >
                              <Mail className="w-3 h-3 text-amber-600" />
                              <span>{resendingBookingId === b.id ? 'Sending...' : b.emailSent ? 'Resend Email' : 'Send Email'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenVoucherPdf(b)}
                              className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-[11px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              title="Download official PDF booking voucher"
                            >
                              <Download className="w-3 h-3" />
                              <span>PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const inv = matchingInvoice || generateInvoiceForBooking(b.id);
                                if (inv) setSelectedInvoiceForPrint(inv);
                              }}
                              className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-[11px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              title="View / Print tax invoice"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Folio</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab Wake-Up Calls */}
      {activeSubTab === 'wake_up_calls' && <WakeUpCallFrontDeskPanel />}

      {/* Subtab 1: Room Grid & Floor Plan */}
      {activeSubTab === 'rooms_grid' && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100">
              Live Room Units & Operational Status
            </h3>
            <div className="flex items-center gap-3 text-xs text-stone-500 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Clean
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Dirty
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> In Progress
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Inspected
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {roomUnits.map((u) => {
              const session = guestSessions.find((s) => isSameRoomNumber(s.roomNumber, u.roomNumber));
              const matchingInvoice = invoices.find((inv) => isSameRoomNumber(inv.roomNumber, u.roomNumber));

              const cleanColor =
                u.cleanStatus === 'clean'
                  ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/20'
                  : u.cleanStatus === 'dirty'
                  ? 'border-amber-300 dark:border-amber-800/60 bg-amber-50/20'
                  : u.cleanStatus === 'in_progress'
                  ? 'border-blue-300 dark:border-blue-800/60 bg-blue-50/20'
                  : 'border-purple-300 dark:border-purple-800/60 bg-purple-50/20';

              return (
                <div
                  key={u.id}
                  className={`rounded-xl border p-4 transition shadow-xs flex flex-col justify-between ${cleanColor}`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
                          Room {u.roomNumber}
                        </span>
                        <span className="text-[11px] text-stone-500 uppercase font-mono">
                          {u.floor}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          u.occupancyStatus === 'occupied'
                            ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                            : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {u.occupancyStatus}
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 dark:text-stone-400 mt-2 capitalize font-medium">
                      Type: {u.roomType.replace('-', ' ')}
                    </div>

                    {u.currentGuestName ? (
                      <div className="mt-3 p-2 rounded-lg bg-stone-100 dark:bg-stone-800/80 text-xs space-y-1">
                        <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center justify-between">
                          <span>{u.currentGuestName}</span>
                          <span className="text-[10px] text-stone-500 font-mono">{u.currentBookingCode}</span>
                        </div>
                        {session && (
                          <div className="text-[11px] text-amber-700 dark:text-amber-400 font-mono flex items-center justify-between pt-1 border-t border-stone-200 dark:border-stone-700">
                            <span>PIN: {session.passcode}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedSessionForQr(session)}
                              className="text-[10px] underline hover:text-amber-800 cursor-pointer"
                            >
                              Show Keycard QR
                            </button>
                          </div>
                        )}
                        {matchingInvoice && (
                          <div className="text-[11px] text-stone-500 font-mono flex items-center justify-between">
                            <span>Balance Due:</span>
                            <span className="font-bold text-stone-800 dark:text-stone-200">
                              {formatCurrency(convertPrice(matchingInvoice.balanceDueUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 py-2 text-xs text-stone-400 italic">
                        Vacant · Cleanliness: <span className="font-semibold uppercase">{u.cleanStatus}</span>
                      </div>
                    )}
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-stone-200/80 dark:border-stone-800/80 flex items-center gap-1.5 flex-wrap">
                    {u.occupancyStatus === 'occupied' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCheckoutGuest(u.roomNumber)}
                          className="flex-1 px-2.5 py-1.5 rounded text-[11px] font-semibold bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 transition text-center cursor-pointer"
                        >
                          Check Out & Settle
                        </button>
                        {matchingInvoice && (
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForPrint(matchingInvoice)}
                            className="p-1.5 rounded bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 text-stone-700 dark:text-stone-300 transition cursor-pointer"
                            title="Print Tax Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    ) : u.occupancyStatus === 'reserved' && u.currentBookingCode ? (
                      (() => {
                        const resBooking = bookings.find((b) => b.bookingCode === u.currentBookingCode);
                        return resBooking ? (
                          <button
                            type="button"
                            onClick={() => handleCheckInReservation(resBooking)}
                            className="w-full px-2.5 py-1.5 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition text-center cursor-pointer"
                          >
                            Check In ({resBooking.bookingCode})
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveSubTab('arrivals')}
                            className="w-full px-2.5 py-1.5 rounded text-[11px] font-semibold bg-amber-700 hover:bg-amber-800 text-white transition text-center cursor-pointer"
                          >
                            Review Reservation
                          </button>
                        );
                      })()
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoomNumber(u.roomNumber);
                          setActiveSubTab('walkin_checkin');
                        }}
                        className="w-full px-2.5 py-1.5 rounded text-[11px] font-semibold bg-amber-700 hover:bg-amber-800 text-white transition text-center cursor-pointer"
                      >
                        Check In Guest
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subtab 1B: Real-Time Occupancy & Maintenance Heatmap */}
      {activeSubTab === 'heatmap' && (
        <RoomHeatmapWidget
          onSelectAvailableRoom={(roomNumber) => {
            setSelectedRoomNumber(roomNumber);
            setActiveSubTab('walkin_checkin');
          }}
        />
      )}

      {/* Subtab 2: Walk-In Registration Card (GRC) */}
      {activeSubTab === 'walkin_checkin' && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
            <h3 className="font-serif font-bold text-xl text-stone-900 dark:text-stone-100">
              Guest Registration Card (GRC) & Instant Check-In
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Government-compliant arrival form. Generates booking reference, assigns room keycard passcode, and opens active guest stay folio.
            </p>
          </div>

          <form onSubmit={handleWalkInSubmit} className="space-y-4">
            {(() => {
              const matchedVip = findVipProfile(guestEmail, guestName, guestPhone);
              if (matchedVip) {
                return (
                  <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs flex items-start gap-2.5">
                    <Crown className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-950 dark:text-amber-100">
                        VIP Match Detected: {matchedVip.guestName} ({matchedVip.staysCount} stays · {formatCurrency(convertPrice(matchedVip.lifetimeSpendUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)} LTV)
                      </div>
                      <div className="text-amber-900 dark:text-amber-300 mt-0.5">
                        {matchedVip.alertMessage || matchedVip.preferences}
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <label className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={flagWalkInAsVip}
                    onChange={(e) => setFlagWalkInAsVip(e.target.checked)}
                    className="rounded text-amber-600"
                  />
                  <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Flag this guest as VIP / High-Value for special staff alerts on future arrivals</span>
                </label>
              );
            })()}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Full Guest Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Karki"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Contact Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+977 9841234567"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Email Address (for Digital Voucher)
                </label>
                <input
                  type="email"
                  placeholder="ramesh.guest@gmail.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nationality & Country
                </label>
                <input
                  type="text"
                  value={guestCountry}
                  onChange={(e) => setGuestCountry(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Passport / Citizenship Document #
                </label>
                <input
                  type="text"
                  placeholder="Citizenship / Passport number"
                  value={idDocumentNumber}
                  onChange={(e) => setIdDocumentNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Assign Room Unit *
                </label>
                <select
                  value={selectedRoomNumber}
                  onChange={(e) => setSelectedRoomNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                >
                  {roomUnits.map((u) => (
                    <option key={u.id} value={u.roomNumber} disabled={u.occupancyStatus === 'occupied'}>
                      Room {u.roomNumber} ({u.floor} - {u.roomType}) {u.occupancyStatus === 'occupied' ? '· [Occupied]' : '· [Available]'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Length of Stay (Nights)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={nights}
                  onChange={(e) => setNights(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Adults
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Advance Deposit Paid ($ USD)
                </label>
                <input
                  type="number"
                  min="0"
                  value={advanceDepositUSD}
                  onChange={(e) => setAdvanceDepositUSD(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                >
                  <option value="card">Credit / Debit Card Terminal</option>
                  <option value="esewa">eSewa Mobile QR</option>
                  <option value="khalti">Khalti Digital Wallet</option>
                  <option value="onsite">Cash at Reception</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveSubTab('rooms_grid')}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white transition shadow-sm cursor-pointer"
              >
                Complete GRC & Check-In
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subtab 3: Guest Folios & Tax Invoices */}
      {activeSubTab === 'in_house_folios' && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100">
                Active Stay Folios & Tax Billing Ledger
              </h3>
              <p className="text-xs text-stone-500">
                Statutory Nepal 10% Service Charge + 13% VAT calculated item-by-item across room stay, dining, and incidentals.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-semibold border-b border-stone-200 dark:border-stone-700">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Room / Guest</th>
                  <th className="py-2.5 px-3">Item Count</th>
                  <th className="py-2.5 px-3 text-right">Subtotal ({currentCurrency})</th>
                  <th className="py-2.5 px-3 text-right">10% SC</th>
                  <th className="py-2.5 px-3 text-right">13% VAT</th>
                  <th className="py-2.5 px-3 text-right">Grand Total</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {invoices.map((inv) => {
                  const fmtInv = (usd: number) =>
                    formatCurrency(convertPrice(usd, currentCurrency, themeConfig.exchangeRates), currentCurrency);
                  return (
                  <tr key={inv.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                    <td className="py-3 px-3 font-mono text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-stone-900 dark:text-stone-100">{inv.guestName}</div>
                      <div className="text-[11px] text-stone-500 font-mono">{inv.roomNumber} · Ref: {inv.bookingCode}</div>
                    </td>
                    <td className="py-3 px-3 text-stone-600 dark:text-stone-400 font-mono">
                      {inv.items.length} items
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {fmtInv(inv.subtotalUSD)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-500">
                      {fmtInv(inv.serviceChargeAmountUSD)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-500">
                      {fmtInv(inv.taxAmountUSD)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-stone-900 dark:text-stone-100">
                      {fmtInv(inv.grandTotalUSD)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      <span className={`font-bold ${inv.balanceDueUSD > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-600'}`}>
                        {fmtInv(inv.balanceDueUSD)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForPrint(inv)}
                          className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print Bill</span>
                        </button>

                        {inv.balanceDueUSD > 0 && (
                          <button
                            type="button"
                            onClick={() => addPaymentToInvoice(inv.id, inv.balanceDueUSD, 'onsite')}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                            title="Settle full balance"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 4: Front Desk Shift Handover Logs */}
      {activeSubTab === 'shift_handover' && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100">
                Front Office Shift Handover Logbook
              </h3>
              <p className="text-xs text-stone-500">
                Cash drawer balancing, pending guest departure logistics, and maintenance escalations between shifts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddShiftOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 cursor-pointer"
            >
              Log New Shift
            </button>
          </div>

          <div className="space-y-3">
            {shiftHandovers.map((sh) => (
              <div
                key={sh.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                      {sh.staffName}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 font-bold">
                      {sh.shift} Shift
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400 font-mono">{sh.timestamp}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-stone-500">Cash in Drawer: </span>
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                      {currentCurrency === 'NPR'
                        ? `NPR ${sh.cashInDrawerNPR.toLocaleString()}`
                        : formatCurrency(
                            convertPrice(
                              sh.cashInDrawerNPR / (themeConfig.exchangeRates?.NPR || 135),
                              currentCurrency,
                              themeConfig.exchangeRates
                            ),
                            currentCurrency
                          )}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500">In-House Guests: </span>
                    <span className="font-mono font-bold">{sh.inHouseGuestsCount}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">Pending Arrivals: </span>
                    <span className="font-mono font-bold">{sh.arrivalsExpectedCount}</span>
                  </div>
                </div>

                <div className="text-xs text-stone-600 dark:text-stone-400 pt-2 border-t border-stone-200 dark:border-stone-800">
                  <span className="font-semibold text-stone-800 dark:text-stone-200">Notes for Next Shift: </span>
                  {sh.notesForNextShift}
                </div>

                {sh.unresolvedIssues && sh.unresolvedIssues !== 'None' && (
                  <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded">
                    <span className="font-bold">Pending Issue: </span>
                    {sh.unresolvedIssues}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Post Incidental Charge */}
      {isAddChargeOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAddChargeOpen(false)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0">
              <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                Post Incidental Charge to Room Folio
              </h3>
              <ModalDismissButton onClose={() => setIsAddChargeOpen(false)} ariaLabel="Close Post Incidental Modal" />
            </div>
            <form onSubmit={handlePostIncidental} className="p-5 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Target Room Number
                </label>
                <select
                  value={targetRoomForCharge}
                  onChange={(e) => setTargetRoomForCharge(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                >
                  {roomUnits.filter((u) => u.occupancyStatus === 'occupied').map((u) => (
                    <option key={u.id} value={u.roomNumber}>
                      Room {u.roomNumber} ({u.currentGuestName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Service Category
                </label>
                <select
                  value={chargeCategory}
                  onChange={(e) => setChargeCategory(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                >
                  <option value="laundry">Laundry & Dry Cleaning</option>
                  <option value="airport_transfer">Airport Sedan Transfer</option>
                  <option value="minibar">Minibar Consumption</option>
                  <option value="spa_wellness">Ayurvedic Spa & Massage</option>
                  <option value="other">Other Front Desk Incidentals</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={chargeDescription}
                  onChange={(e) => setChargeDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Amount in USD ($)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={chargeAmountUSD}
                  onChange={(e) => setChargeAmountUSD(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddChargeOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white transition cursor-pointer"
                >
                  Post to Room Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Shift Handover */}
      {isAddShiftOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAddShiftOpen(false)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0">
              <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                Submit Shift Handover Log
              </h3>
              <ModalDismissButton onClose={() => setIsAddShiftOpen(false)} ariaLabel="Close Shift Handover Modal" />
            </div>
            <form onSubmit={handleSaveShift} className="p-5 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Shift Timing
                </label>
                <select
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value as ShiftType)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                >
                  <option value="morning">Morning Shift (07:00 - 15:00)</option>
                  <option value="evening">Evening Shift (15:00 - 23:00)</option>
                  <option value="night">Night Shift (23:00 - 07:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Cash In Drawer (NPR Rs.)
                </label>
                <input
                  type="number"
                  required
                  value={cashInDrawerNPR}
                  onChange={(e) => setCashInDrawerNPR(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Notes for Next Duty Officer
                </label>
                <textarea
                  rows={2}
                  value={notesForNextShift}
                  onChange={(e) => setNotesForNextShift(e.target.value)}
                  placeholder="e.g. Flight QR-650 arriving late at 22:30. Driver dispatched."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Unresolved Escalations / Maintenance Issues
                </label>
                <input
                  type="text"
                  value={unresolvedIssues}
                  onChange={(e) => setUnresolvedIssues(e.target.value)}
                  placeholder="e.g. Room 102 hot water pressure inspected."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddShiftOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white transition cursor-pointer"
                >
                  Submit Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Print Modal */}
      {selectedInvoiceForPrint && (
        <InvoicePrintModal
          invoice={selectedInvoiceForPrint}
          billSettings={billSettings}
          currency={currentCurrency}
          onClose={() => setSelectedInvoiceForPrint(null)}
          onUpdateInvoice={(updated) => {
            updateInvoice(updated.id, updated);
            setSelectedInvoiceForPrint(updated);
          }}
        />
      )}

      {/* Keycard Passcode QR Modal */}
      {selectedSessionForQr && (
        <GuestKeycardQrModal
          session={selectedSessionForQr}
          onClose={() => setSelectedSessionForQr(null)}
        />
      )}

      {/* Balance Settlement Checkout Confirmation Modal */}
      {pendingCheckoutModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPendingCheckoutModal(null)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-w-md w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                  Outstanding Folio Balance — Room {pendingCheckoutModal.roomNumber}
                </h3>
              </div>
              <ModalDismissButton
                onClose={() => setPendingCheckoutModal(null)}
                ariaLabel="Close settlement prompt"
              />
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                Invoice <span className="font-mono font-bold text-stone-900 dark:text-stone-100">{pendingCheckoutModal.invoice.invoiceNumber}</span> for{' '}
                <span className="font-semibold text-stone-900 dark:text-stone-100">{pendingCheckoutModal.invoice.guestName}</span> has a pending balance of{' '}
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                  {formatCurrency(
                    convertPrice(pendingCheckoutModal.invoice.balanceDueUSD, currentCurrency, themeConfig.exchangeRates),
                    currentCurrency
                  )}
                </span>.
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setPendingCheckoutModal(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const { roomNumber, invoice } = pendingCheckoutModal;
                    setPendingCheckoutModal(null);
                    checkOutRoomUnit(roomNumber);
                    setSelectedInvoiceForPrint(invoice);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Check Out (Leave Unpaid)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const { roomNumber, invoice } = pendingCheckoutModal;
                    addPaymentToInvoice(invoice.id, invoice.balanceDueUSD, 'onsite');
                    setPendingCheckoutModal(null);
                    checkOutRoomUnit(roomNumber);
                    setSelectedInvoiceForPrint({
                      ...invoice,
                      amountPaidUSD: invoice.grandTotalUSD,
                      balanceDueUSD: 0,
                      paymentStatus: 'paid',
                    });
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  Settle Full Balance &amp; Check Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
