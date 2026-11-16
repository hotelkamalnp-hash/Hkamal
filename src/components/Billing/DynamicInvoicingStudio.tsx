import React, { useEffect, useMemo, useState } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Printer,
  Percent,
  RotateCcw,
  Tag,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import {
  BillItemLine,
  Booking,
  CurrencyCode,
  MasterInvoice,
  PaymentMethod,
} from '../../types/hotel';
import { convertPrice, formatCurrency } from '../../utils/theme';
import { InvoicePrintModal } from './InvoicePrintModal';

function bookingAmountToUSD(
  amount: number,
  currency: CurrencyCode,
  rates: { USD: number; NPR: number; INR: number }
): number {
  if (currency === 'USD') return amount;
  if (currency === 'NPR') return amount / (rates.NPR || 135);
  if (currency === 'INR') return amount / (rates.INR || 84.5);
  return amount;
}

const QUICK_INCIDENTALS: {
  label: string;
  description: string;
  category: BillItemLine['category'];
  rateUSD: number;
}[] = [
  { label: '+ Airport Transfer ($18)', description: 'Private TIA Airport Sedan Transfer', category: 'airport_transfer', rateUSD: 18 },
  { label: '+ Laundry ($12)', description: 'Express Pressing & Laundry Service', category: 'laundry', rateUSD: 12 },
  { label: '+ Minibar ($14)', description: 'In-Room Minibar Consumption', category: 'minibar', rateUSD: 14 },
  { label: '+ Late Checkout ($20)', description: 'Extended Late Check-Out (Until 4:00 PM)', category: 'other', rateUSD: 20 },
];

export const DynamicInvoicingStudio: React.FC = () => {
  const {
    bookings,
    rooms,
    restaurantOrders,
    coupons,
    billSettings,
    themeConfig,
    currentCurrency,
    createCustomInvoice,
    updateInvoice,
    addPaymentToInvoice,
    showToast,
  } = useHotel();

  const [selectedBookingId, setSelectedBookingId] = useState<string>(bookings[0]?.id || '');
  const [draftItems, setDraftItems] = useState<BillItemLine[]>([]);
  const [discountMode, setDiscountMode] = useState<'percent' | 'flat_usd'>('percent');
  const [discountPercent, setDiscountPercent] = useState<number>(billSettings.defaultDiscountPercent || 0);
  const [flatDiscountUSD, setFlatDiscountUSD] = useState<number>(0);
  const [selectedCouponId, setSelectedCouponId] = useState<string>('');
  const [serviceChargePercent, setServiceChargePercent] = useState<number>(billSettings.serviceChargePercent ?? 10);
  const [taxPercent, setTaxPercent] = useState<number>(billSettings.taxPercent ?? 13);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [invoiceNotes, setInvoiceNotes] = useState<string>('');

  // Custom line item composer
  const [newDesc, setNewDesc] = useState<string>('');
  const [newCategory, setNewCategory] = useState<BillItemLine['category']>('other');
  const [newQty, setNewQty] = useState<number>(1);
  const [newRateUSD, setNewRateUSD] = useState<number>(15);

  // Ready print folio modal
  const [generatedInvoiceForPrint, setGeneratedInvoiceForPrint] = useState<MasterInvoice | null>(null);

  const selectedBooking: Booking | undefined = useMemo(
    () => bookings.find((b) => b.id === selectedBookingId) || bookings[0],
    [bookings, selectedBookingId]
  );

  // Sync default selection if bookings list changes and nothing is chosen
  useEffect(() => {
    if (!selectedBookingId && bookings.length > 0) {
      setSelectedBookingId(bookings[0].id);
    }
  }, [bookings, selectedBookingId]);

  const hydrateFromBooking = (booking?: Booking) => {
    if (!booking) {
      setDraftItems([]);
      return;
    }

    const nights = Math.max(1, booking.nights || 1);
    const catalogRoom = rooms.find(
      (r) => r.id === booking.roomTypeId || r.type === booking.roomType
    );

    const addonsTotalUSD = (booking.addons || []).reduce((acc, a) => acc + (a.priceUSD || 0), 0);
    const bookingSubUSD = bookingAmountToUSD(
      booking.subtotal || 0,
      booking.currency || 'USD',
      themeConfig.exchangeRates
    );

    const inferredRoomTotalUSD = Math.max(0, bookingSubUSD - addonsTotalUSD);
    const nightlyRateUSD =
      inferredRoomTotalUSD > 0
        ? Math.round((inferredRoomTotalUSD / nights) * 100) / 100
        : catalogRoom?.pricePerNightUSD || 55;

    const lines: BillItemLine[] = [
      {
        id: `dyn-room-${booking.id}`,
        description: `${booking.roomName}${booking.assignedRoomNumber ? ` · Room ${booking.assignedRoomNumber}` : ''}`,
        category: 'room_stay',
        date: booking.checkInDate,
        quantity: nights,
        rateUSD: nightlyRateUSD,
        amountUSD: Math.round(nights * nightlyRateUSD * 100) / 100,
      },
    ];

    // Booking add-ons
    for (const addon of booking.addons || []) {
      lines.push({
        id: `dyn-addon-${addon.id}-${booking.id}`,
        description: addon.name,
        category: addon.name.toLowerCase().includes('airport') ? 'airport_transfer' : 'other',
        date: booking.checkInDate,
        quantity: 1,
        rateUSD: addon.priceUSD,
        amountUSD: addon.priceUSD,
      });
    }

    // Linked room-service / dining orders for this guest or room
    const linkedOrders = restaurantOrders.filter((ord) => {
      if (ord.status === 'cancelled') return false;
      const roomMatch =
        booking.assignedRoomNumber &&
        ord.roomNumber.toLowerCase().includes(booking.assignedRoomNumber.toLowerCase());
      const codeMatch = ord.tableOrRoomNo === booking.bookingCode;
      const guestMatch = ord.guestName.toLowerCase() === booking.guestName.toLowerCase();
      return Boolean(roomMatch || codeMatch || guestMatch);
    });

    for (const ord of linkedOrders) {
      lines.push({
        id: `dyn-ord-${ord.id}`,
        description: `Dining Order #${ord.orderNumber} (${ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')})`,
        category: 'restaurant_dining',
        date: ord.createdAt.split('T')[0],
        quantity: 1,
        rateUSD: ord.subtotalUSD,
        amountUSD: ord.subtotalUSD,
      });
    }

    setDraftItems(lines);
    setDiscountMode('percent');
    setDiscountPercent(billSettings.defaultDiscountPercent || 0);
    setFlatDiscountUSD(0);
    setSelectedCouponId('');
    setServiceChargePercent(billSettings.serviceChargePercent ?? 10);
    setTaxPercent(billSettings.taxPercent ?? 13);
    setPaymentMethod(booking.paymentMethod || 'card');
    setInvoiceNotes(booking.specialRequests ? `Booking note: ${booking.specialRequests}` : '');
  };

  useEffect(() => {
    hydrateFromBooking(selectedBooking);
  }, [selectedBooking?.id]);

  // Real-time financial math (all normalized cleanly to USD then converted to display currency)
  const calculations = useMemo(() => {
    const subtotalUSD = draftItems.reduce((acc, item) => acc + item.amountUSD, 0);

    let effectiveDiscountUSD = 0;
    let effectiveDiscountPercent = 0;

    if (discountMode === 'percent') {
      const clampedPct = Math.max(0, Math.min(100, discountPercent));
      effectiveDiscountPercent = clampedPct;
      effectiveDiscountUSD = (subtotalUSD * clampedPct) / 100;
    } else {
      effectiveDiscountUSD = Math.max(0, Math.min(subtotalUSD, flatDiscountUSD));
      effectiveDiscountPercent =
        subtotalUSD > 0 ? Math.round((effectiveDiscountUSD / subtotalUSD) * 1000) / 10 : 0;
    }

    const netAfterDiscountUSD = Math.max(0, subtotalUSD - effectiveDiscountUSD);
    const serviceChargeUSD = (netAfterDiscountUSD * Math.max(0, serviceChargePercent)) / 100;
    const taxableBaseUSD = netAfterDiscountUSD + serviceChargeUSD;
    const taxUSD = (taxableBaseUSD * Math.max(0, taxPercent)) / 100;
    const grandTotalUSD = Math.round((taxableBaseUSD + taxUSD) * 100) / 100;

    const depositPaidUSD =
      selectedBooking && selectedBooking.paymentStatus === 'paid'
        ? Math.round(
            bookingAmountToUSD(
              selectedBooking.totalAmount || 0,
              selectedBooking.currency || 'USD',
              themeConfig.exchangeRates
            ) * 100
          ) / 100
        : 0;

    const balanceDueUSD = Math.max(0, Math.round((grandTotalUSD - depositPaidUSD) * 100) / 100);

    return {
      subtotalUSD: Math.round(subtotalUSD * 100) / 100,
      discountUSD: Math.round(effectiveDiscountUSD * 100) / 100,
      discountPercent: effectiveDiscountPercent,
      netAfterDiscountUSD: Math.round(netAfterDiscountUSD * 100) / 100,
      serviceChargeUSD: Math.round(serviceChargeUSD * 100) / 100,
      taxableBaseUSD: Math.round(taxableBaseUSD * 100) / 100,
      taxUSD: Math.round(taxUSD * 100) / 100,
      grandTotalUSD,
      depositPaidUSD,
      balanceDueUSD,
    };
  }, [
    draftItems,
    discountMode,
    discountPercent,
    flatDiscountUSD,
    serviceChargePercent,
    taxPercent,
    selectedBooking,
    themeConfig.exchangeRates,
  ]);

  const handleApplyCoupon = (couponId: string) => {
    setSelectedCouponId(couponId);
    const coupon = coupons.find((c) => c.id === couponId);
    if (!coupon) {
      setDiscountMode('percent');
      setDiscountPercent(0);
      setFlatDiscountUSD(0);
      return;
    }
    if (coupon.discountType === 'percentage') {
      setDiscountMode('percent');
      setDiscountPercent(coupon.discountValue);
    } else {
      setDiscountMode('flat_usd');
      setFlatDiscountUSD(coupon.discountValue);
    }
    showToast('Coupon Applied to Draft', `${coupon.code} (${coupon.description}) applied.`, 'info');
  };

  const handleUpdateLineItem = (
    itemId: string,
    updates: Partial<Pick<BillItemLine, 'description' | 'category' | 'quantity' | 'rateUSD'>>
  ) => {
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const nextQty = updates.quantity !== undefined ? Math.max(1, updates.quantity) : item.quantity;
        const nextRate = updates.rateUSD !== undefined ? updates.rateUSD : item.rateUSD;
        return {
          ...item,
          ...updates,
          quantity: nextQty,
          rateUSD: nextRate,
          amountUSD: Math.round(nextQty * nextRate * 100) / 100,
        };
      })
    );
  };

  const handleAddCustomLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;
    const qty = Math.max(1, newQty || 1);
    const rate = Number(newRateUSD) || 0;
    const line: BillItemLine = {
      id: `dyn-custom-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      description: newDesc.trim(),
      category: newCategory,
      date: new Date().toISOString().split('T')[0],
      quantity: qty,
      rateUSD: rate,
      amountUSD: Math.round(qty * rate * 100) / 100,
    };
    setDraftItems((prev) => [...prev, line]);
    setNewDesc('');
    setNewQty(1);
    setNewRateUSD(15);
  };

  const handleQuickAdd = (preset: (typeof QUICK_INCIDENTALS)[number]) => {
    const line: BillItemLine = {
      id: `dyn-quick-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      description: preset.description,
      category: preset.category,
      date: new Date().toISOString().split('T')[0],
      quantity: 1,
      rateUSD: preset.rateUSD,
      amountUSD: preset.rateUSD,
    };
    setDraftItems((prev) => [...prev, line]);
  };

  const handleGenerateFolio = () => {
    if (!selectedBooking || draftItems.length === 0) {
      showToast('Cannot Generate Folio', 'Select a booking with at least one line item.', 'warning');
      return;
    }

    const roomLabel = selectedBooking.assignedRoomNumber
      ? `Room ${selectedBooking.assignedRoomNumber}`
      : selectedBooking.roomName;

    const created = createCustomInvoice({
      bookingCode: selectedBooking.bookingCode,
      roomNumber: roomLabel,
      guestName: selectedBooking.guestName,
      guestEmail: selectedBooking.guestEmail,
      guestPhone: selectedBooking.guestPhone,
      guestAddress: selectedBooking.guestCountry,
      checkInDate: selectedBooking.checkInDate,
      checkOutDate: selectedBooking.checkOutDate,
      items: draftItems,
      subtotalUSD: calculations.subtotalUSD,
      discountPercent: calculations.discountPercent,
      discountAmountUSD: calculations.discountUSD,
      serviceChargePercent,
      serviceChargeAmountUSD: calculations.serviceChargeUSD,
      taxPercent,
      taxAmountUSD: calculations.taxUSD,
      grandTotalUSD: calculations.grandTotalUSD,
      amountPaidUSD: calculations.depositPaidUSD,
      balanceDueUSD: calculations.balanceDueUSD,
      paymentStatus: calculations.balanceDueUSD <= 0.01 ? 'paid' : 'pending',
      paymentMethod,
      notes: invoiceNotes.trim() || undefined,
    });

    setGeneratedInvoiceForPrint(created);
  };

  const displayMoney = (usd: number) =>
    formatCurrency(convertPrice(usd, currentCurrency, themeConfig.exchangeRates), currentCurrency);

  return (
    <section
      aria-label="Dynamic Invoicing Workbench"
      className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-stone-200 dark:border-stone-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50">
              Dynamic Invoicing &amp; Pre-Print Folio Composer
            </h3>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Select any booking to auto-calculate room charges, add-ons, dining orders, taxes, service charges, and discounts—then customize line items before printing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => hydrateFromBooking(selectedBooking)}
            disabled={!selectedBooking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200 cursor-pointer disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Booking</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateFolio}
            disabled={!selectedBooking || draftItems.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-40"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Generate Print-Ready Folio</span>
          </button>
        </div>
      </div>

      {/* Booking Selector + Tax/Service/Discount Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
        {/* Left 8 cols: Booking Selector + Editable Line Items */}
        <div className="lg:col-span-8 space-y-5">
          {/* Booking Selection Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="dyn-inv-booking-select"
                className="block font-semibold text-stone-700 dark:text-stone-300 mb-1"
              >
                Source Reservation Booking
              </label>
              <select
                id="dyn-inv-booking-select"
                value={selectedBooking?.id || ''}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
              >
                {bookings.length === 0 ? (
                  <option value="">No bookings available</option>
                ) : (
                  bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bookingCode} · {b.guestName} ({b.assignedRoomNumber ? `Room ${b.assignedRoomNumber}` : b.roomName})
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedBooking && (
              <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {selectedBooking.guestName}
                  </span>
                  <span className="font-mono text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                    {selectedBooking.bookingStatus.toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  {selectedBooking.checkInDate} &rarr; {selectedBooking.checkOutDate} ({selectedBooking.nights} nights) · Paid status: {selectedBooking.paymentStatus.toUpperCase()}
                </div>
              </div>
            )}
          </div>

          {/* Quick Add Common Incidentals */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 mr-1">
              Quick Add:
            </span>
            {QUICK_INCIDENTALS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleQuickAdd(preset)}
                className="px-2.5 py-1 rounded-md border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-[11px] font-medium text-stone-700 dark:text-stone-300 cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Editable Line Items Table */}
          <div className="border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Description</th>
                    <th className="py-2.5 px-2 font-semibold w-36">Category</th>
                    <th className="py-2.5 px-2 font-semibold w-16 text-center">Qty</th>
                    <th className="py-2.5 px-2 font-semibold w-24 text-right">Rate (USD)</th>
                    <th className="py-2.5 px-3 font-semibold w-28 text-right">Amount ({currentCurrency})</th>
                    <th className="py-2.5 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {draftItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-stone-400">
                        No bill line items yet. Select a booking or add a charge below.
                      </td>
                    </tr>
                  ) : (
                    draftItems.map((item) => (
                      <tr key={item.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/30">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleUpdateLineItem(item.id, { description: e.target.value })
                            }
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-stone-300 dark:hover:border-stone-700 focus:border-amber-500 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={item.category}
                            onChange={(e) =>
                              handleUpdateLineItem(item.id, {
                                category: e.target.value as BillItemLine['category'],
                              })
                            }
                            className="w-full px-1.5 py-1 rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-[11px] text-stone-700 dark:text-stone-200"
                          >
                            <option value="room_stay">Room Stay</option>
                            <option value="restaurant_dining">Dining / Bar</option>
                            <option value="airport_transfer">Airport Transfer</option>
                            <option value="laundry">Laundry</option>
                            <option value="minibar">Minibar</option>
                            <option value="spa_wellness">Spa &amp; Wellness</option>
                            <option value="other">Other / Adjustment</option>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateLineItem(item.id, { quantity: Number(e.target.value) || 1 })
                            }
                            className="w-full px-1.5 py-1 rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-center font-mono tabular-nums text-stone-900 dark:text-stone-100"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.5"
                            value={item.rateUSD}
                            onChange={(e) =>
                              handleUpdateLineItem(item.id, { rateUSD: Number(e.target.value) || 0 })
                            }
                            className="w-full px-2 py-1 rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-right font-mono tabular-nums text-stone-900 dark:text-stone-100"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                          {displayMoney(item.amountUSD)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setDraftItems((prev) => prev.filter((x) => x.id !== item.id))
                            }
                            className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                            aria-label={`Remove ${item.description}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Custom Line Item Row */}
            <form
              onSubmit={handleAddCustomLine}
              className="p-3 bg-stone-50 dark:bg-stone-800/50 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center gap-2"
            >
              <input
                type="text"
                placeholder="Add custom charge or credit (e.g. Early Check-In Fee or Goodwill Credit)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as BillItemLine['category'])}
                className="px-2 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200"
              >
                <option value="other">Other</option>
                <option value="restaurant_dining">Dining</option>
                <option value="laundry">Laundry</option>
                <option value="minibar">Minibar</option>
                <option value="airport_transfer">Transfer</option>
                <option value="spa_wellness">Wellness</option>
              </select>
              <input
                type="number"
                min={1}
                value={newQty}
                onChange={(e) => setNewQty(Number(e.target.value) || 1)}
                className="w-14 px-2 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-center font-mono tabular-nums"
                title="Quantity"
              />
              <input
                type="number"
                step="0.5"
                value={newRateUSD}
                onChange={(e) => setNewRateUSD(Number(e.target.value))}
                className="w-22 px-2 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-right font-mono tabular-nums"
                placeholder="USD"
                title="Rate in USD (negative for credit)"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Line</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right 4 cols: Tax / Service Charge / Discount Config & Live Totals */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 space-y-4">
            <div className="font-semibold text-sm text-stone-900 dark:text-stone-100 flex items-center justify-between">
              <span>Charges, Tax &amp; Discount Rules</span>
              <span className="text-[11px] font-mono text-stone-500">{billSettings.template}</span>
            </div>

            {/* Apply Promo Voucher */}
            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>Apply Hotel Promo / Corporate Rate</span>
              </label>
              <select
                value={selectedCouponId}
                onChange={(e) => handleApplyCoupon(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              >
                <option value="">Manual Discount Control</option>
                {coupons
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} ({c.discountType === 'percentage' ? `${c.discountValue}% Off` : `$${c.discountValue} Off`})
                    </option>
                  ))}
              </select>
            </div>

            {/* Discount Percent vs Flat USD */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Discount Mode
                </label>
                <select
                  value={discountMode}
                  onChange={(e) => setDiscountMode(e.target.value as 'percent' | 'flat_usd')}
                  className="w-full px-2 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                >
                  <option value="percent">% Percentage</option>
                  <option value="flat_usd">$ Flat Deduction</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  <span>{discountMode === 'percent' ? 'Discount %' : 'Discount USD'}</span>
                </label>
                {discountMode === 'percent' ? (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={discountPercent}
                    onChange={(e) => {
                      setSelectedCouponId('');
                      setDiscountPercent(Number(e.target.value) || 0);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono tabular-nums text-stone-900 dark:text-stone-100"
                  />
                ) : (
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={flatDiscountUSD}
                    onChange={(e) => {
                      setSelectedCouponId('');
                      setFlatDiscountUSD(Number(e.target.value) || 0);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono tabular-nums text-stone-900 dark:text-stone-100"
                  />
                )}
              </div>
            </div>

            {/* Service Charge & VAT % */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Service Charge (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step="0.5"
                  value={serviceChargePercent}
                  onChange={(e) => setServiceChargePercent(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono tabular-nums text-stone-900 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Tax / VAT (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step="0.5"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono tabular-nums text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>

            {/* Payment Method & Tax Exempt Quick Toggle */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (taxPercent === 0) {
                    setTaxPercent(billSettings.taxPercent ?? 13);
                    setServiceChargePercent(billSettings.serviceChargePercent ?? 10);
                  } else {
                    setTaxPercent(0);
                    setServiceChargePercent(0);
                  }
                }}
                className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
              >
                {taxPercent === 0 ? 'Restore IRD VAT & Service Charge' : 'Apply Diplomat / Tax-Exempt (0%)'}
              </button>

              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-[11px]"
              >
                <option value="card">Card Settlement</option>
                <option value="esewa">eSewa Digital</option>
                <option value="khalti">Khalti Wallet</option>
                <option value="onsite">Cash / Front Desk</option>
              </select>
            </div>

            {/* Folio Notes */}
            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Folio Remarks (Printed on Bill)
              </label>
              <input
                type="text"
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="Optional guest PAN or checkout note"
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              />
            </div>

            {/* Real-Time Totals Breakdown */}
            <div className="pt-3 border-t border-stone-200 dark:border-stone-700 space-y-1.5 tabular-nums">
              <div className="flex justify-between text-stone-600 dark:text-stone-300">
                <span>Line Items Subtotal</span>
                <span className="font-mono">{displayMoney(calculations.subtotalUSD)}</span>
              </div>
              {calculations.discountUSD > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Discount ({calculations.discountPercent}%)</span>
                  <span className="font-mono">-{displayMoney(calculations.discountUSD)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600 dark:text-stone-300">
                <span>{billSettings.serviceChargeLabel || 'Service Charge'} ({serviceChargePercent}%)</span>
                <span className="font-mono">+{displayMoney(calculations.serviceChargeUSD)}</span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-stone-300">
                <span>{billSettings.taxLabel || 'VAT / Tax'} ({taxPercent}%)</span>
                <span className="font-mono">+{displayMoney(calculations.taxUSD)}</span>
              </div>

              <div className="flex justify-between pt-2 border-t border-stone-200 dark:border-stone-700 text-sm font-bold text-stone-900 dark:text-stone-50">
                <span>Grand Total</span>
                <span className="font-mono">{displayMoney(calculations.grandTotalUSD)}</span>
              </div>

              {calculations.depositPaidUSD > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 text-[11px]">
                  <span>Advance Paid with Booking</span>
                  <span className="font-mono">-{displayMoney(calculations.depositPaidUSD)}</span>
                </div>
              )}

              <div className="flex justify-between pt-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                <span>Net Balance Due</span>
                <span className="font-mono">{displayMoney(calculations.balanceDueUSD)}</span>
              </div>
              <div className="text-[10px] text-stone-400 text-right font-mono">
                Ledger USD Equiv: ${calculations.grandTotalUSD.toFixed(2)} (Due: ${calculations.balanceDueUSD.toFixed(2)})
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateFolio}
              disabled={!selectedBooking || draftItems.length === 0}
              className="w-full py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finalize &amp; Open Print-Ready Folio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Generated Print-Ready Folio Modal */}
      {generatedInvoiceForPrint && (
        <InvoicePrintModal
          invoice={generatedInvoiceForPrint}
          billSettings={billSettings}
          currency={currentCurrency}
          onClose={() => setGeneratedInvoiceForPrint(null)}
          onUpdateInvoice={(updated) => {
            updateInvoice(updated.id, updated);
            setGeneratedInvoiceForPrint(updated);
          }}
          onMarkPaid={() => {
            addPaymentToInvoice(
              generatedInvoiceForPrint.id,
              generatedInvoiceForPrint.balanceDueUSD,
              paymentMethod
            );
            setGeneratedInvoiceForPrint(null);
          }}
        />
      )}
    </section>
  );
};
