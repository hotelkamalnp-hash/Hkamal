import React, { useMemo, useState } from 'react';
import {
  ConciergeBell,
  Sparkles,
  Plus,
  Minus,
  Send,
  Clock,
  CheckCircle2,
  Package,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import {
  RoomServiceAmenityCategory,
  RoomServiceAmenityItemRequest,
} from '../../types/hotel';

interface AmenityCatalogOption {
  name: string;
  category: RoomServiceAmenityCategory;
  note: string;
}

const AMENITY_CATALOG: AmenityCatalogOption[] = [
  { name: 'Fresh 700 GSM Bath Towels', category: 'towels_linens', note: 'Set of fluffy Turkish cotton towels' },
  { name: 'Extra Feather Pillows', category: 'pillows_bedding', note: 'Soft or medium loft down-alternative' },
  { name: 'Orthopedic Neck Support Pillow', category: 'pillows_bedding', note: 'Memory foam contour support' },
  { name: 'Plush Bathrobe & Slippers', category: 'towels_linens', note: 'Combed cotton robe with disposable slippers' },
  { name: 'Extra Warm Himalayan Wool Blanket', category: 'pillows_bedding', note: 'Heavy winter weave throw' },
  { name: 'Ayurvedic Bath & Dental Kit', category: 'toiletries', note: 'Herbal soap, toothbrush, paste & razor' },
  { name: 'Fresh Ice Bucket & Glassware', category: 'beverages_ice', note: 'Chilled ice with 2 crystal tumblers' },
  { name: 'Filtered Mountain Water Carafe', category: 'beverages_ice', note: 'Complimentary purified glass bottles' },
  { name: 'Evening Turndown & Room Refresh', category: 'housekeeping_service', note: 'Bed turn-down, trash clear & fresh scent' },
  { name: 'Steam Iron & Pressing Board', category: 'other', note: 'Delivered for in-room garment care' },
];

const CATEGORY_LABELS: Record<'all' | RoomServiceAmenityCategory, string> = {
  all: 'All Amenities',
  towels_linens: 'Towels & Linens',
  pillows_bedding: 'Pillows & Bedding',
  toiletries: 'Toiletries',
  beverages_ice: 'Water & Ice',
  housekeeping_service: 'Room Refresh',
  other: 'Extras',
};

export const RoomServiceAmenityView: React.FC = () => {
  const {
    activeGuestSession,
    roomServiceRequests,
    submitRoomServiceRequest,
    showToast,
  } = useHotel();

  const [categoryFilter, setCategoryFilter] = useState<'all' | RoomServiceAmenityCategory>('all');
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [customItemName, setCustomItemName] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<RoomServiceAmenityCategory>('other');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [preferredTime, setPreferredTime] = useState<string>('Within 20 mins');
  const [notes, setNotes] = useState<string>('');

  const visibleCatalog = useMemo(() => {
    if (categoryFilter === 'all') return AMENITY_CATALOG;
    return AMENITY_CATALOG.filter((a) => a.category === categoryFilter);
  }, [categoryFilter]);

  const myRequests = useMemo(() => {
    if (!activeGuestSession) return [];
    const rm = activeGuestSession.roomNumber.toLowerCase();
    return roomServiceRequests.filter(
      (r) =>
        r.roomNumber.toLowerCase() === rm ||
        r.bookingCode.toLowerCase() === activeGuestSession.bookingCode.toLowerCase()
    );
  }, [roomServiceRequests, activeGuestSession]);

  const basketItems: RoomServiceAmenityItemRequest[] = useMemo(() => {
    return Object.entries(selectedQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([name, quantity]) => {
        const found = AMENITY_CATALOG.find((a) => a.name === name);
        return {
          name,
          quantity,
          category: found?.category || customCategory,
        };
      });
  }, [selectedQuantities, customCategory]);

  const adjustItemQty = (name: string, delta: number) => {
    setSelectedQuantities((prev) => {
      const nextQty = Math.max(0, Math.min(6, (prev[name] || 0) + delta));
      const updated = { ...prev };
      if (nextQty === 0) {
        delete updated[name];
      } else {
        updated[name] = nextQty;
      }
      return updated;
    });
  };

  const handleAddCustomItem = () => {
    const trimmed = customItemName.trim();
    if (!trimmed) return;
    setSelectedQuantities((prev) => ({
      ...prev,
      [trimmed]: Math.min(6, (prev[trimmed] || 0) + 1),
    }));
    setCustomItemName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGuestSession) return;

    const finalItems = [...basketItems];
    if (customItemName.trim()) {
      finalItems.push({
        name: customItemName.trim(),
        quantity: 1,
        category: customCategory,
      });
    }

    if (finalItems.length === 0) {
      showToast('Select Amenities', 'Add at least one towel, pillow, or amenity item first.', 'warning');
      return;
    }

    submitRoomServiceRequest({
      roomNumber: activeGuestSession.roomNumber,
      bookingCode: activeGuestSession.bookingCode,
      guestName: activeGuestSession.guestName,
      items: finalItems,
      priority,
      preferredTime,
      notes,
    });

    setSelectedQuantities({});
    setCustomItemName('');
    setNotes('');
    setPriority('normal');
  };

  if (!activeGuestSession) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Amenity Catalog & Custom Request */}
        <div className="lg:col-span-7 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                <ConciergeBell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                In-Room Amenities &amp; Housekeeping Service
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Complimentary room requests forwarded directly to our Housekeeping Desk for {activeGuestSession.roomNumber}.
              </p>
            </div>
          </div>

          {/* Category Filter Bar */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CATEGORY_LABELS) as ('all' | RoomServiceAmenityCategory)[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-stone-900 dark:bg-amber-600 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Amenity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleCatalog.map((item) => {
              const qty = selectedQuantities[item.name] || 0;
              return (
                <div
                  key={item.name}
                  className={`p-3.5 rounded-xl border transition-colors flex flex-col justify-between gap-3 ${
                    qty > 0
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/25 dark:border-amber-700'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 leading-snug">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 shrink-0">
                        Complimentary
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                      {item.note}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => adjustItemQty(item.name, 1)}
                        className="w-full py-1.5 px-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-amber-600 text-stone-800 dark:text-stone-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-600" />
                        Add Request
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-between bg-white dark:bg-stone-900 border border-amber-400 dark:border-amber-700 rounded-lg px-2 py-1">
                        <button
                          type="button"
                          onClick={() => adjustItemQty(item.name, -1)}
                          className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 cursor-pointer"
                          aria-label={`Decrease ${item.name}`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-mono font-bold text-stone-900 dark:text-stone-50 tabular-nums">
                          {qty} requested
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustItemQty(item.name, 1)}
                          className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 cursor-pointer"
                          aria-label={`Increase ${item.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Amenity Input */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2 text-xs">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Need Another Item? (e.g., Baby Crib, Prayer Mat, Universal Adapter)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                placeholder="Type custom amenity or housekeeping item..."
                className="flex-1 px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as RoomServiceAmenityCategory)}
                className="px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                <option value="other">Other Item</option>
                <option value="towels_linens">Towels &amp; Linens</option>
                <option value="pillows_bedding">Pillows &amp; Bedding</option>
                <option value="toiletries">Toiletries</option>
                <option value="housekeeping_service">Housekeeping Service</option>
              </select>
              <button
                type="button"
                onClick={handleAddCustomItem}
                className="px-4 py-2 rounded-lg bg-stone-800 dark:bg-stone-700 hover:bg-stone-900 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Right: Request Summary Form & Live Queue Status */}
        <div className="lg:col-span-5 space-y-5">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-50">
                  Housekeeping Request Slip
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  {activeGuestSession.roomNumber} · {activeGuestSession.guestName}
                </p>
              </div>
              <Package className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            </div>

            {basketItems.length === 0 ? (
              <div className="py-6 text-center text-stone-500 dark:text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-lg">
                Select towels, extra pillows, or room items from the left to build your request.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {basketItems.map((item) => (
                  <div key={item.name} className="py-2 flex items-center justify-between gap-2">
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      <span className="font-mono text-amber-700 dark:text-amber-400 mr-1.5 tabular-nums">
                        {item.quantity}×
                      </span>
                      {item.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustItemQty(item.name, -item.quantity)}
                      className="text-[11px] text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Delivery Speed
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'normal' | 'urgent')}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  <option value="normal">Standard (15–20 mins)</option>
                  <option value="urgent">Urgent / Priority</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Preferred Window
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  <option value="ASAP">ASAP</option>
                  <option value="Within 20 mins">Within 20 mins</option>
                  <option value="This Evening (6:00–8:00 PM)">This Evening (6–8 PM)</option>
                  <option value="While I am Out of Room">While I am Out of Room</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Instructions for Housekeeper (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Ring lightly once, or hang fresh towels outside door handle..."
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Send Request to Housekeeping
            </button>
          </form>

          {/* Live Room Request Status Tracker */}
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2.5">
              <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-50 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Live Request Status ({myRequests.length})
              </h4>
            </div>

            {myRequests.length === 0 ? (
              <p className="text-stone-500 dark:text-stone-400 py-3 text-center">
                No room service requests placed during this stay yet.
              </p>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-72 overflow-y-auto">
                {myRequests.map((req) => {
                  const statusText =
                    req.status === 'delivered'
                      ? 'Delivered'
                      : req.status === 'in_progress'
                      ? 'On the Way'
                      : req.status === 'acknowledged'
                      ? 'Assigned to Attendant'
                      : req.status === 'cancelled'
                      ? 'Cancelled'
                      : 'Queued at Housekeeping';

                  const statusClass =
                    req.status === 'delivered'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : req.status === 'cancelled'
                      ? 'text-stone-400'
                      : 'text-amber-700 dark:text-amber-400';

                  return (
                    <div key={req.id} className="py-3 first:pt-1 last:pb-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                          {req.requestCode}
                        </span>
                        <span className={`font-semibold inline-flex items-center gap-1 ${statusClass}`}>
                          {req.status === 'delivered' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : req.priority === 'urgent' ? (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          {statusText}
                        </span>
                      </div>

                      <div className="text-stone-800 dark:text-stone-200 font-medium">
                        {req.items.map((i) => `${i.quantity}× ${i.name}`).join(' · ')}
                      </div>

                      <div className="text-[11px] text-stone-500 dark:text-stone-400 flex flex-wrap items-center gap-x-2">
                        <span className="tabular-nums">{req.requestedAt}</span>
                        {req.preferredTime && (
                          <>
                            <span>·</span>
                            <span>{req.preferredTime}</span>
                          </>
                        )}
                        {req.assignedHousekeeper && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1 text-stone-700 dark:text-stone-300">
                              <UserCheck className="w-3 h-3" />
                              {req.assignedHousekeeper}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
