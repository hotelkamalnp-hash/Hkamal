import React, { useMemo, useState } from 'react';
import {
  ArchiveRestore,
  Printer,
  Download,
  Search,
  CheckCircle2,
  Package,
  Trash2,
  UserCheck,
  MapPin,
  ShieldCheck,
  Plus,
  FileText,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { LostAndFoundItem } from '../../types/hotel';
import { ModalDismissButton, useModalDismiss } from '../Common/ModalDismissHandler';
import { printElement, downloadLostFoundSlipPdf } from '../../utils/printUtility';

const CATEGORIES = [
  'Valuables & Jewelry',
  'Electronics & Chargers',
  'Travel Documents & IDs',
  'Clothing & Accessories',
  'Luggage & Keys',
  'Other',
];

const DEFAULT_LOCATIONS = [
  'Lobby Lounge',
  'Rooftop Dining Terrace',
  'Reception Desk',
  'Fitness & Spa Wing',
  'Courtyard Garden',
];

export const LostAndFoundTrackerPanel: React.FC = () => {
  const {
    lostAndFound,
    addLostFoundItem,
    updateLostFoundStatus,
    roomUnits,
    staff,
    activeUser,
    themeConfig,
    showToast,
  } = useHotel();

  // Intake form state
  const [roomOrArea, setRoomOrArea] = useState<string>(roomUnits[0]?.roomNumber || '101');
  const [customArea, setCustomArea] = useState<string>('');
  const [itemDescription, setItemDescription] = useState<string>('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [foundBy, setFoundBy] = useState<string>(activeUser?.name || '');
  const [foundDate, setFoundDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [storageLocation, setStorageLocation] = useState<string>('Front Desk Safe Box B-2');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | LostAndFoundItem['status']>('all');

  // Claim / Return modal state (avoids window.prompt)
  const [claimingItem, setClaimingItem] = useState<LostAndFoundItem | null>(null);
  const [claimantName, setClaimantName] = useState<string>('');
  const [claimantIdNumber, setClaimantIdNumber] = useState<string>('');
  const [claimantPhone, setClaimantPhone] = useState<string>('');

  // Printable Guest Recovery Slip modal state
  const [slipItem, setSlipItem] = useState<LostAndFoundItem | null>(null);

  useModalDismiss({
    isOpen: Boolean(claimingItem),
    onClose: () => setClaimingItem(null),
  });

  useModalDismiss({
    isOpen: Boolean(slipItem),
    onClose: () => setSlipItem(null),
  });

  const kpis = useMemo(() => {
    const stored = lostAndFound.filter((i) => i.status === 'stored').length;
    const claimed = lostAndFound.filter((i) => i.status === 'claimed').length;
    const valuables = lostAndFound.filter(
      (i) =>
        i.status === 'stored' &&
        (i.category.toLowerCase().includes('valuab') ||
          i.category.toLowerCase().includes('electr') ||
          i.category.toLowerCase().includes('doc'))
    ).length;
    return {
      total: lostAndFound.length,
      stored,
      claimed,
      valuables,
    };
  }, [lostAndFound]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return lostAndFound.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (item.referenceId || item.id).toLowerCase().includes(q) ||
        item.itemDescription.toLowerCase().includes(q) ||
        item.roomNumber.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.foundBy.toLowerCase().includes(q) ||
        (item.claimedByGuestName || '').toLowerCase().includes(q)
      );
    });
  }, [lostAndFound, searchQuery, statusFilter]);

  const handleLogItem = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedLocation = roomOrArea === '__custom__' ? customArea.trim() : roomOrArea;
    if (!itemDescription.trim()) {
      showToast('Missing Description', 'Describe the found item before logging.', 'warning');
      return;
    }
    if (!resolvedLocation) {
      showToast('Missing Location', 'Select the room or common area where the item was found.', 'warning');
      return;
    }

    const created = addLostFoundItem({
      itemDescription: itemDescription.trim(),
      category,
      roomNumber: resolvedLocation,
      foundBy: foundBy.trim() || activeUser?.name || 'Housekeeping Staff',
      foundDate: foundDate || new Date().toISOString().split('T')[0],
      status: 'stored',
      storageLocation: storageLocation.trim() || 'Front Desk Lost & Found Vault',
      contactPhone: contactPhone.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setItemDescription('');
    setNotes('');
    setContactPhone('');
    setCustomArea('');
    setSlipItem(created);
  };

  const openClaimModal = (item: LostAndFoundItem) => {
    setClaimingItem(item);
    setClaimantName(item.claimedByGuestName || '');
    setClaimantIdNumber(item.claimedByIdNumber || '');
    setClaimantPhone(item.contactPhone || '');
  };

  const handleConfirmClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingItem) return;
    if (!claimantName.trim()) {
      showToast('Guest Name Required', 'Enter the claimant name verifying custody.', 'warning');
      return;
    }

    const updatedPreview: LostAndFoundItem = {
      ...claimingItem,
      status: 'claimed',
      claimedByGuestName: claimantName.trim(),
      claimedByIdNumber: claimantIdNumber.trim() || undefined,
      contactPhone: claimantPhone.trim() || claimingItem.contactPhone,
      claimedAt: new Date().toISOString(),
    };

    updateLostFoundStatus(claimingItem.id, 'claimed', {
      claimedByName: claimantName.trim(),
      claimedByIdNumber: claimantIdNumber.trim() || undefined,
      contactPhone: claimantPhone.trim() || undefined,
    });

    setClaimingItem(null);
    setSlipItem(updatedPreview);
  };

  const formatRefId = (item: LostAndFoundItem) =>
    item.referenceId || `LF-${item.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}`;

  return (
    <div className="space-y-6">
      {/* Header & KPI Strip */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2.5">
            <ArchiveRestore className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            Lost &amp; Found Custody Register
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Log items found in guest rooms or common spaces, issue unique reference IDs, verify guest handovers, and print recovery slips.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold">
            Logged Items
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {kpis.total}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            All custody records
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4">
          <div className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold">
            In Vault Custody
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {kpis.stored}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Awaiting guest claim
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4">
          <div className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
            Returned to Guest
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {kpis.claimed}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Signed recovery slips
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold">
            High-Value / Docs Held
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {kpis.valuables}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Safe-locked items
          </div>
        </div>
      </div>

      {/* Main Split Workspace: Log Intake (Left) + Custody Register (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Log New Item Form */}
        <form
          onSubmit={handleLogItem}
          className="xl:col-span-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-50">
                Log Found Item
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Generates a unique LF-YYYY-XXXX reference slip immediately.
              </p>
            </div>
            <Package className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Room / Location Found *
              </label>
              <select
                value={roomOrArea}
                onChange={(e) => setRoomOrArea(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                <optgroup label="Guest Room Units">
                  {roomUnits.map((unit) => (
                    <option key={unit.id} value={unit.roomNumber}>
                      Room {unit.roomNumber} · {unit.floor} ({unit.roomType})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Common & Public Spaces">
                  {DEFAULT_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                  <option value="__custom__">Other Custom Location...</option>
                </optgroup>
              </select>
              {roomOrArea === '__custom__' && (
                <input
                  type="text"
                  value={customArea}
                  onChange={(e) => setCustomArea(e.target.value)}
                  placeholder="e.g. Conference Room A, Underground Parking"
                  className="mt-2 w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Item Description *
              </label>
              <input
                type="text"
                required
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="e.g. Silver Seiko Chronograph Watch with brown strap"
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Date Found
                </label>
                <input
                  type="date"
                  value={foundDate}
                  onChange={(e) => setFoundDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Found By Staff
                </label>
                <input
                  type="text"
                  list="kamal-staff-names"
                  value={foundBy}
                  onChange={(e) => setFoundBy(e.target.value)}
                  placeholder="Staff member name"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
                <datalist id="kamal-staff-names">
                  {staff.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Guest Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+977 98..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Vault / Storage Shelf
              </label>
              <input
                type="text"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                placeholder="e.g. Front Desk Safe Box B-2"
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Custody Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Condition on discovery, serial number, or guest follow-up details..."
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Log Item &amp; Generate Recovery Slip
          </button>
        </form>

        {/* Right: Custody Register */}
        <div className="xl:col-span-8 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Ref ID (LF-2026-...), item, room, claimant..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
              {(['all', 'stored', 'claimed', 'disposed'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    statusFilter === status
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  {status === 'all' ? `All (${lostAndFound.length})` : status}
                </button>
              ))}
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-500 dark:text-stone-400">
              No lost &amp; found records match your current filter.
            </div>
          ) : (
            <div className="divide-y divide-stone-200 dark:divide-stone-800">
              {filteredItems.map((item) => {
                const refId = formatRefId(item);
                const statusColor =
                  item.status === 'claimed'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : item.status === 'disposed'
                    ? 'text-stone-500 dark:text-stone-400'
                    : 'text-amber-700 dark:text-amber-400';

                return (
                  <div
                    key={item.id}
                    className="py-4 first:pt-1 last:pb-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className="font-mono font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                          {refId}
                        </span>
                        <span className="text-stone-300 dark:text-stone-700">·</span>
                        <span className={`font-semibold uppercase tracking-wide text-[11px] ${statusColor}`}>
                          {item.status === 'stored'
                            ? 'In Vault Custody'
                            : item.status === 'claimed'
                            ? 'Returned to Guest'
                            : 'Disposed'}
                        </span>
                        <span className="text-stone-300 dark:text-stone-700">·</span>
                        <span className="text-stone-600 dark:text-stone-300 font-medium">
                          {item.category}
                        </span>
                      </div>

                      <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                        {item.itemDescription}
                      </div>

                      <div className="text-xs text-stone-500 dark:text-stone-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-stone-400" />
                          {/^\d+$/.test(item.roomNumber) ? `Room ${item.roomNumber}` : item.roomNumber}
                        </span>
                        <span>·</span>
                        <span className="tabular-nums">Found {item.foundDate}</span>
                        <span>·</span>
                        <span>By {item.foundBy}</span>
                        <span>·</span>
                        <span>Vault: {item.storageLocation}</span>
                      </div>

                      {item.claimedByGuestName && (
                        <div className="text-xs text-emerald-700 dark:text-emerald-400 flex flex-wrap items-center gap-x-2 pt-0.5">
                          <UserCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Claimed by {item.claimedByGuestName}</span>
                          {item.claimedByIdNumber && (
                            <>
                              <span>·</span>
                              <span className="font-mono tabular-nums">ID: {item.claimedByIdNumber}</span>
                            </>
                          )}
                          {item.contactPhone && (
                            <>
                              <span>·</span>
                              <span className="tabular-nums">{item.contactPhone}</span>
                            </>
                          )}
                        </div>
                      )}

                      {item.notes && (
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 italic">
                          Note: {item.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSlipItem(item)}
                        className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Print Recovery Slip
                      </button>

                      {item.status === 'stored' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openClaimModal(item)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Claim &amp; Handover
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLostFoundStatus(item.id, 'disposed')}
                            title="Mark Disposed after holding period"
                            className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Dispose
                          </button>
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

      {/* CLAIM / HANDOVER MODAL */}
      {claimingItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setClaimingItem(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
              <div>
                <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-50">
                  Verify Guest Handover
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                  {formatRefId(claimingItem)} · {claimingItem.itemDescription}
                </p>
              </div>
              <ModalDismissButton onClose={() => setClaimingItem(null)} />
            </div>

            <form onSubmit={handleConfirmClaim} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Claimant Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={claimantName}
                  onChange={(e) => setClaimantName(e.target.value)}
                  placeholder="e.g. Aarav Shrestha"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Passport / National ID Number
                </label>
                <input
                  type="text"
                  value={claimantIdNumber}
                  onChange={(e) => setClaimantIdNumber(e.target.value)}
                  placeholder="e.g. PA-9940213 or Citizenship #"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={claimantPhone}
                  onChange={(e) => setClaimantPhone(e.target.value)}
                  placeholder="+977 98..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClaimingItem(null)}
                  className="px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Confirm Release &amp; Open Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE RECOVERY SLIP MODAL */}
      {slipItem && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSlipItem(null)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/70 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Guest Recovery Slip · {formatRefId(slipItem)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    printElement(
                      'printable-lost-found-slip',
                      `Recovery Slip ${formatRefId(slipItem)}`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Slip
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadLostFoundSlipPdf(
                      slipItem,
                      themeConfig.hotelName || 'Kamal Hotel',
                      `${themeConfig.address}, ${themeConfig.city}`,
                      themeConfig.contactPhone,
                      themeConfig.contactEmail
                    )
                  }
                  className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
                <ModalDismissButton onClose={() => setSlipItem(null)} />
              </div>
            </div>

            {/* Print-ready Document Surface (always crisp light paper styling) */}
            <div className="p-6 max-h-[80vh] overflow-y-auto bg-stone-100 dark:bg-stone-950">
              <div
                id="printable-lost-found-slip"
                className="bg-white text-stone-900 border border-stone-300 rounded-lg p-8 space-y-6"
              >
                {/* Slip Header */}
                <div className="flex items-start justify-between border-b-2 border-stone-900 pb-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-amber-800 font-semibold">
                      Official Custody Voucher
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
                      {themeConfig.hotelName}
                    </h2>
                    <p className="text-xs text-stone-600">
                      {themeConfig.address}, {themeConfig.city} · {themeConfig.contactPhone} · {themeConfig.contactEmail}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                      Reference ID
                    </div>
                    <div className="text-lg font-mono font-bold text-stone-900 border border-stone-900 px-3 py-1 rounded mt-0.5 tabular-nums">
                      {formatRefId(slipItem)}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="flex items-center justify-between text-xs bg-stone-100 px-4 py-2.5 rounded border border-stone-200">
                  <span className="font-semibold uppercase tracking-wider text-stone-700">
                    Lost &amp; Found Guest Recovery Slip
                  </span>
                  <span className="font-mono font-bold uppercase text-stone-900">
                    Status: {slipItem.status === 'claimed' ? 'RELEASED TO GUEST' : slipItem.status.toUpperCase()}
                  </span>
                </div>

                {/* Item & Discovery Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="col-span-2 border border-stone-200 rounded p-3.5">
                    <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                      Item Description
                    </div>
                    <div className="text-sm font-bold text-stone-900 mt-0.5">
                      {slipItem.itemDescription}
                    </div>
                    {slipItem.notes && (
                      <div className="text-xs text-stone-600 mt-1">
                        Remarks: {slipItem.notes}
                      </div>
                    )}
                  </div>

                  <div className="border border-stone-200 rounded p-3">
                    <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                      Location Found
                    </div>
                    <div className="font-semibold text-stone-900 mt-0.5">
                      {/^\d+$/.test(slipItem.roomNumber)
                        ? `Room ${slipItem.roomNumber}`
                        : slipItem.roomNumber}
                    </div>
                  </div>

                  <div className="border border-stone-200 rounded p-3">
                    <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                      Category &amp; Date Logged
                    </div>
                    <div className="font-semibold text-stone-900 mt-0.5 tabular-nums">
                      {slipItem.category} · {slipItem.foundDate}
                    </div>
                  </div>

                  <div className="border border-stone-200 rounded p-3">
                    <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                      Logged By Staff
                    </div>
                    <div className="font-semibold text-stone-900 mt-0.5">
                      {slipItem.foundBy}
                    </div>
                  </div>

                  <div className="border border-stone-200 rounded p-3">
                    <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                      Vault Custody Shelf
                    </div>
                    <div className="font-semibold text-stone-900 mt-0.5">
                      {slipItem.storageLocation}
                    </div>
                  </div>
                </div>

                {/* Guest Verification / Claimant Section */}
                <div className="border border-stone-300 rounded p-4 space-y-2 text-xs">
                  <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                    Guest Claimant Verification
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div>
                      <span className="text-stone-500 block text-[10px]">Claimant Name</span>
                      <span className="font-semibold text-stone-900">
                        {slipItem.claimedByGuestName || '_______________________'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[10px]">Passport / ID #</span>
                      <span className="font-mono font-semibold text-stone-900">
                        {slipItem.claimedByIdNumber || '__________________'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[10px]">Phone</span>
                      <span className="font-mono font-semibold text-stone-900 tabular-nums">
                        {slipItem.contactPhone || '__________________'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Declaration & Signatures */}
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  I hereby acknowledge receipt of the above-described property in satisfactory condition from {themeConfig.hotelName} Concierge &amp; Front Desk Custody.
                </p>

                <div className="grid grid-cols-2 gap-8 pt-6 text-xs">
                  <div>
                    <div className="border-t border-stone-400 pt-1.5 font-semibold text-stone-800">
                      Guest / Recipient Signature
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      Date &amp; Time of Collection
                    </div>
                  </div>
                  <div>
                    <div className="border-t border-stone-400 pt-1.5 font-semibold text-stone-800">
                      Front Desk / Concierge Officer
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      Authorized Custody Stamp
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
