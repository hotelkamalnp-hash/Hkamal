import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { 
  RoomCleanlinessStatus, 
  LostAndFoundItem 
} from '../../types/hotel';
import { 
  Sparkles, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  Plus, 
  Coffee, 
  Bed, 
  Archive, 
  Search,
  Check,
  Wrench,
  ConciergeBell,
  UserCheck
} from 'lucide-react';
import { useModalDismiss, ModalDismissButton } from '../Common/ModalDismissHandler';

export const HousekeepingManager: React.FC = () => {
  const { 
    roomUnits, 
    updateRoomCleanStatus, 
    lostAndFound, 
    addLostFoundItem, 
    updateLostFoundStatus,
    invoices,
    updateInvoice,
    activeUser,
    staff,
    showToast,
    addAuditLog,
    reportMaintenanceIssue,
    roomServiceRequests,
    updateRoomServiceRequestStatus
  } = useHotel();

  const [activeTab, setActiveTab] = useState<'rooms_grid' | 'room_service_queue' | 'minibar_audit' | 'lost_found'>('rooms_grid');
  const [rsFilter, setRsFilter] = useState<'active' | 'delivered' | 'all'>('active');
  const [rsAssignees, setRsAssignees] = useState<Record<string, string>>({});
  const [selectedFloor, setSelectedFloor] = useState<string>('All');
  const [reportingUnitId, setReportingUnitId] = useState<string | null>(null);
  const [issueSummaryInput, setIssueSummaryInput] = useState<string>('');
  const [issueCategoryInput, setIssueCategoryInput] = useState<'plumbing' | 'electrical' | 'hvac' | 'lock_access' | 'furniture' | 'housekeeping_damage' | 'other'>('plumbing');

  // Lost & Found Modal & Inline Claimant Input
  const [isAddLostFoundOpen, setIsAddLostFoundOpen] = useState(false);
  const [lostItemDesc, setLostItemDesc] = useState('');
  const [lostCategory, setLostCategory] = useState('Valuables');
  const [lostRoom, setLostRoom] = useState('Room 201');
  const [lostLocation, setLostLocation] = useState('Front Office Safe');
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);
  const [claimantNameInput, setClaimantNameInput] = useState('');

  // Minibar Audit State
  const [minibarRoom, setMinibarRoom] = useState('104');
  const [minibarItems, setMinibarItems] = useState([
    { name: 'Himalayan Mineral Water (2 bottles)', priceUSD: 3, consumed: false },
    { name: 'Gorkha Craft Beer (330ml)', priceUSD: 5, consumed: false },
    { name: 'Artisan Cashew & Almond Tin', priceUSD: 6, consumed: false },
    { name: 'Organic Darjeeling Tea Pack', priceUSD: 4, consumed: false },
  ]);

  useModalDismiss(isAddLostFoundOpen, () => setIsAddLostFoundOpen(false));

  const filteredRooms = roomUnits.filter((u) => {
    if (selectedFloor === 'All') return true;
    return u.floor.toLowerCase().includes(selectedFloor.toLowerCase());
  });

  const dirtyCount = roomUnits.filter((u) => u.cleanStatus === 'dirty').length;
  const inProgressCount = roomUnits.filter((u) => u.cleanStatus === 'in_progress').length;
  const cleanCount = roomUnits.filter((u) => u.cleanStatus === 'clean').length;
  const inspectedCount = roomUnits.filter((u) => u.cleanStatus === 'inspected').length;
  const activeRoomServiceRequests = roomServiceRequests.filter(
    (r) => r.status === 'pending' || r.status === 'acknowledged' || r.status === 'in_progress'
  );
  const housekeepingAssignees = staff.filter((s) => s.role === 'housekeeping');
  const assigneeOptions = housekeepingAssignees.length > 0 ? housekeepingAssignees : staff;

  const handleSaveLostFound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostItemDesc.trim()) return;

    addLostFoundItem({
      itemDescription: lostItemDesc,
      category: lostCategory,
      roomNumber: lostRoom,
      foundBy: activeUser?.name || 'Sunita Thapa (Housekeeping Lead)',
      foundDate: new Date().toISOString().split('T')[0],
      status: 'stored',
      storageLocation: lostLocation,
    });

    setLostItemDesc('');
    setIsAddLostFoundOpen(false);
  };

  const handlePostMinibarBill = () => {
    const consumed = minibarItems.filter((i) => i.consumed);
    if (consumed.length === 0) {
      showToast('No Items Checked', 'Please select consumed minibar snacks or beverages.', 'info');
      return;
    }

    const totalUSD = consumed.reduce((acc, i) => acc + i.priceUSD, 0);

    // Find invoice matching room
    const matchingInv = invoices.find((inv) => inv.roomNumber.includes(minibarRoom));
    if (matchingInv) {
      const newLine = {
        id: 'li-minibar-' + Date.now(),
        description: `Minibar Consumption (${consumed.map((c) => c.name).join(', ')})`,
        category: 'minibar' as const,
        date: new Date().toISOString().split('T')[0],
        quantity: 1,
        rateUSD: totalUSD,
        amountUSD: totalUSD,
      };

      const updatedItems = [...matchingInv.items, newLine];
      const newSub = updatedItems.reduce((acc, i) => acc + i.amountUSD, 0);
      const disc = (newSub * matchingInv.discountPercent) / 100;
      const discountedSub = newSub - disc;
      const sc = Math.round(((discountedSub * matchingInv.serviceChargePercent) / 100) * 100) / 100;
      const vatBase = discountedSub + sc;
      const tax = Math.round(((vatBase * matchingInv.taxPercent) / 100) * 100) / 100;
      const grandTotalUSD = Math.round((vatBase + tax) * 100) / 100;
      const balanceDueUSD = Math.max(0, Math.round((grandTotalUSD - matchingInv.amountPaidUSD) * 100) / 100);

      updateInvoice(matchingInv.id, {
        items: updatedItems,
        subtotalUSD: newSub,
        serviceChargeAmountUSD: sc,
        taxAmountUSD: tax,
        grandTotalUSD,
        balanceDueUSD,
        paymentStatus: balanceDueUSD > 0 ? 'pending' : 'paid',
      });

      showToast('Minibar Billed', `$${totalUSD.toFixed(2)} charged to Room ${minibarRoom} folio.`, 'success');
      addAuditLog('Minibar Billed', 'payment', `Minibar $${totalUSD.toFixed(2)} charged to Room ${minibarRoom}`);
      // Reset consumed
      setMinibarItems((prev) => prev.map((i) => ({ ...i, consumed: false })));
    } else {
      showToast('No Active Folio', `Could not find an active bill for Room ${minibarRoom}.`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Housekeeping Header */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h2 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">
              Housekeeping, Turnaround & Facility Care
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Department Lead: <span className="font-semibold text-stone-700 dark:text-stone-300">{activeUser?.name || 'Sunita Thapa'}</span> · Floor-by-floor cleaning turnaround, minibar restock billing, and Lost & Found custody.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddLostFoundOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Deposit Lost Item</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
          <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Dirty / Needs Cleaning</div>
          <div className="text-xl font-bold font-mono text-amber-800 dark:text-amber-300 mt-1">{dirtyCount}</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-900">
          <div className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">In Progress</div>
          <div className="text-xl font-bold font-mono text-blue-800 dark:text-blue-300 mt-1">{inProgressCount}</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-900">
          <div className="text-[11px] text-purple-700 dark:text-purple-400 font-medium">Supervisor Inspected</div>
          <div className="text-xl font-bold font-mono text-purple-800 dark:text-purple-300 mt-1">{inspectedCount}</div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900">
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Clean & Released</div>
          <div className="text-xl font-bold font-mono text-emerald-800 dark:text-emerald-300 mt-1">{cleanCount}</div>
        </div>
      </div>

      {/* Pending Guest Room Service Banner */}
      {activeRoomServiceRequests.length > 0 && activeTab !== 'room_service_queue' && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ConciergeBell className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-amber-950 dark:text-amber-100 tabular-nums">
                Incoming Guest Room Service Queue: {activeRoomServiceRequests.length} active request{activeRoomServiceRequests.length > 1 ? 's' : ''}
              </span>
              <span className="text-amber-800 dark:text-amber-300 ml-2">
                Latest: {activeRoomServiceRequests[0].roomNumber} — {activeRoomServiceRequests[0].items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('room_service_queue')}
            className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Open Room Service Queue
          </button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-lg border border-stone-200 dark:border-stone-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('rooms_grid')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'rooms_grid'
              ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
              : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          Room Turnaround Grid
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('room_service_queue')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 tabular-nums ${
            activeTab === 'room_service_queue'
              ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
              : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          <ConciergeBell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Room Service Requests ({activeRoomServiceRequests.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('minibar_audit')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'minibar_audit'
              ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
              : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          Minibar Audit & Auto-Billing
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('lost_found')}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'lost_found'
              ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
              : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          Lost & Found Vault ({lostAndFound.length})
        </button>
      </div>

      {/* Tab 1: Room Turnaround Grid */}
      {activeTab === 'rooms_grid' && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm">
              Floor-by-Floor Cleaning Dispatch
            </h3>
            <div className="flex items-center gap-1.5 text-xs">
              {['All', 'Ground', '1st', '2nd', '3rd', '4th'].map((fl) => (
                <button
                  key={fl}
                  type="button"
                  onClick={() => setSelectedFloor(fl)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                    selectedFloor === fl
                      ? 'bg-amber-700 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {fl}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {filteredRooms.map((u) => (
              <div
                key={u.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
                      Room {u.roomNumber}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        u.cleanStatus === 'clean'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : u.cleanStatus === 'out_of_order'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : u.cleanStatus === 'dirty'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : u.cleanStatus === 'in_progress'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                      }`}
                    >
                      {u.cleanStatus.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="text-xs text-stone-500 font-mono mt-1">
                    {u.floor} · {u.occupancyStatus.toUpperCase()}
                  </div>

                  {u.currentGuestName && (
                    <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 mt-2">
                      Guest: {u.currentGuestName}
                    </div>
                  )}

                  {u.maintenanceNote && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 italic">
                      Note: {u.maintenanceNote}
                    </div>
                  )}
                </div>

                {/* Status Switcher Buttons */}
                <div className="pt-3 border-t border-stone-200 dark:border-stone-800 grid grid-cols-2 gap-1.5 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => updateRoomCleanStatus(u.id, 'dirty')}
                    className={`py-1 rounded border text-center cursor-pointer ${
                      u.cleanStatus === 'dirty'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'border-stone-300 dark:border-stone-700 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Mark Dirty
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRoomCleanStatus(u.id, 'in_progress', activeUser?.name || 'Sunita')}
                    className={`py-1 rounded border text-center cursor-pointer ${
                      u.cleanStatus === 'in_progress'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-stone-300 dark:border-stone-700 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRoomCleanStatus(u.id, 'inspected', undefined, activeUser?.name || 'Supervisor')}
                    className={`py-1 rounded border text-center cursor-pointer ${
                      u.cleanStatus === 'inspected'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'border-stone-300 dark:border-stone-700 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Inspected
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRoomCleanStatus(u.id, 'clean')}
                    className={`py-1 rounded border text-center cursor-pointer ${
                      u.cleanStatus === 'clean'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-stone-300 dark:border-stone-700 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Clean & Ready
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportingUnitId(u.id);
                      setIssueSummaryInput('');
                    }}
                    className="col-span-2 mt-1 py-1.5 px-2 rounded border border-rose-200 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>Report Issue (Auto-OOO)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {reportingUnitId && (
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-sm text-rose-900 dark:text-rose-200">
                  Report Maintenance Issue for Room {roomUnits.find((r) => r.id === reportingUnitId)?.roomNumber}
                </span>
                <button
                  type="button"
                  onClick={() => setReportingUnitId(null)}
                  className="text-xs font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={issueCategoryInput}
                  onChange={(e) => setIssueCategoryInput(e.target.value as any)}
                  className="px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                >
                  <option value="plumbing">Plumbing (Faucet / Pipe)</option>
                  <option value="electrical">Electrical</option>
                  <option value="hvac">AC / Heater</option>
                  <option value="lock_access">Door Lock</option>
                  <option value="furniture">Furniture</option>
                  <option value="other">Other Issue</option>
                </select>
                <input
                  type="text"
                  value={issueSummaryInput}
                  onChange={(e) => setIssueSummaryInput(e.target.value)}
                  placeholder="Describe issue (e.g. Leaking sink faucet)"
                  className="sm:col-span-2 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!issueSummaryInput.trim()) return;
                    reportMaintenanceIssue({
                      unitId: reportingUnitId,
                      category: issueCategoryInput,
                      priority: 'high',
                      issueTitle: issueSummaryInput.trim(),
                      description: issueSummaryInput.trim(),
                    });
                    setReportingUnitId(null);
                    setIssueSummaryInput('');
                  }}
                  className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold cursor-pointer"
                >
                  Submit Ticket &amp; Set Heatmap Out of Order
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 1B: Guest Room Service Requests Queue */}
      {activeTab === 'room_service_queue' && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <ConciergeBell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                In-Room Guest Amenity &amp; Service Queue
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Live requests submitted from the InRoomGuestPortal for extra pillows, bath towels, toiletries, and turndown refreshes.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
              {(['active', 'delivered', 'all'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRsFilter(tab)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    rsFilter === tab
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  {tab === 'active'
                    ? `Active (${activeRoomServiceRequests.length})`
                    : tab === 'delivered'
                    ? `Delivered (${roomServiceRequests.filter((r) => r.status === 'delivered').length})`
                    : `All (${roomServiceRequests.length})`}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const visibleReqs = roomServiceRequests.filter((req) => {
              if (rsFilter === 'active') {
                return req.status === 'pending' || req.status === 'acknowledged' || req.status === 'in_progress';
              }
              if (rsFilter === 'delivered') {
                return req.status === 'delivered';
              }
              return true;
            });

            if (visibleReqs.length === 0) {
              return (
                <div className="py-10 text-center text-xs text-stone-500 dark:text-stone-400">
                  No room service amenity requests in this queue view.
                </div>
              );
            }

            return (
              <div className="divide-y divide-stone-200 dark:divide-stone-800">
                {visibleReqs.map((req) => {
                  const selectedAttendant =
                    rsAssignees[req.id] ||
                    req.assignedHousekeeper ||
                    assigneeOptions[0]?.name ||
                    activeUser?.name ||
                    'Sunita Thapa';

                  const statusLabel =
                    req.status === 'delivered'
                      ? 'Delivered'
                      : req.status === 'in_progress'
                      ? 'Out for Delivery'
                      : req.status === 'acknowledged'
                      ? 'Assigned'
                      : req.status === 'cancelled'
                      ? 'Cancelled'
                      : 'Pending Dispatch';

                  const statusColor =
                    req.status === 'delivered'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : req.status === 'cancelled'
                      ? 'text-stone-400'
                      : req.status === 'pending'
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-amber-700 dark:text-amber-400';

                  return (
                    <div
                      key={req.id}
                      className="py-4 first:pt-1 last:pb-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className="font-mono font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                            {req.requestCode}
                          </span>
                          <span className="text-stone-300 dark:text-stone-700">·</span>
                          <span className="font-semibold text-stone-900 dark:text-stone-50">
                            {req.roomNumber}
                          </span>
                          <span className="text-stone-300 dark:text-stone-700">·</span>
                          <span className="text-stone-600 dark:text-stone-300">{req.guestName}</span>
                          <span className="text-stone-300 dark:text-stone-700">·</span>
                          <span className={`font-semibold uppercase tracking-wide text-[11px] ${statusColor}`}>
                            {statusLabel}
                          </span>
                          {req.priority === 'urgent' && (
                            <>
                              <span className="text-stone-300 dark:text-stone-700">·</span>
                              <span className="font-semibold text-rose-600 dark:text-rose-400 uppercase text-[11px]">
                                Urgent
                              </span>
                            </>
                          )}
                        </div>

                        <div className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                          {req.items.map((item) => `${item.quantity}× ${item.name}`).join(' · ')}
                        </div>

                        <div className="text-xs text-stone-500 dark:text-stone-400 flex flex-wrap items-center gap-x-2">
                          <span className="tabular-nums">Requested {req.requestedAt}</span>
                          {req.preferredTime && (
                            <>
                              <span>·</span>
                              <span>Window: {req.preferredTime}</span>
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

                        {req.notes && (
                          <div className="text-xs text-stone-600 dark:text-stone-300 italic">
                            Guest note: &ldquo;{req.notes}&rdquo;
                          </div>
                        )}
                      </div>

                      {req.status !== 'delivered' && req.status !== 'cancelled' && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                          <select
                            value={selectedAttendant}
                            onChange={(e) =>
                              setRsAssignees((prev) => ({ ...prev, [req.id]: e.target.value }))
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                          >
                            {assigneeOptions.map((s) => (
                              <option key={s.id} value={s.name}>
                                {s.name}
                              </option>
                            ))}
                          </select>

                          {req.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() =>
                                updateRoomServiceRequestStatus(req.id, 'acknowledged', selectedAttendant)
                              }
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Acknowledge &amp; Assign
                            </button>
                          )}

                          {(req.status === 'pending' || req.status === 'acknowledged') && (
                            <button
                              type="button"
                              onClick={() =>
                                updateRoomServiceRequestStatus(req.id, 'in_progress', selectedAttendant)
                              }
                              className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Out for Delivery
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              updateRoomServiceRequestStatus(req.id, 'delivered', selectedAttendant)
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Mark Delivered
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab 2: Minibar Audit & Auto-Billing */}
      {activeTab === 'minibar_audit' && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm max-w-2xl mx-auto space-y-5">
          <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
            <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
              In-Room Minibar Restock & Guest Auto-Billing
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Check consumed refreshments during daily turnaround. Automatically posts the itemized charge with 10% SC + 13% VAT to the guest's active room invoice.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Select Occupied Room
            </label>
            <select
              value={minibarRoom}
              onChange={(e) => setMinibarRoom(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
            >
              {roomUnits.filter((u) => u.occupancyStatus === 'occupied').map((u) => (
                <option key={u.id} value={u.roomNumber}>
                  Room {u.roomNumber} ({u.currentGuestName})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Select Consumed Items
            </label>
            {minibarItems.map((item, idx) => (
              <label
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50 text-xs cursor-pointer hover:bg-stone-100"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.consumed}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setMinibarItems((prev) =>
                        prev.map((i, iIdx) => (iIdx === idx ? { ...i, consumed: checked } : i))
                      );
                    }}
                    className="rounded text-amber-600"
                  />
                  <span className="font-medium text-stone-800 dark:text-stone-200">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                  ${item.priceUSD.toFixed(2)}
                </span>
              </label>
            ))}
          </div>

          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end">
            <button
              type="button"
              onClick={handlePostMinibarBill}
              className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white transition shadow-sm cursor-pointer"
            >
              Charge to Room Folio
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Lost & Found Vault */}
      {activeTab === 'lost_found' && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100">
                Lost & Found Registered Custody
              </h3>
              <p className="text-xs text-stone-500">
                Safe storage records for traveler belongings found in rooms or public dining spaces.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddLostFoundOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-700 text-white hover:bg-amber-800 cursor-pointer"
            >
              Add Found Item
            </button>
          </div>

          <div className="space-y-3">
            {lostAndFound.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 dark:text-stone-100">{item.itemDescription}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                      {item.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono mt-1">
                    Location Found: {item.roomNumber} · Deposited by: {item.foundBy} ({item.foundDate})
                  </div>
                  <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                    Storage Vault: <span className="font-semibold">{item.storageLocation}</span>
                    {item.claimedByGuestName && (
                      <span className="text-emerald-600 ml-2">· Claimed by: {item.claimedByGuestName} ({item.claimedAt})</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-mono px-2 py-1 rounded font-bold uppercase ${
                      item.status === 'stored'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {item.status}
                  </span>
                  {item.status === 'stored' && (
                    claimingItemId === item.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={claimantNameInput}
                          onChange={(e) => setClaimantNameInput(e.target.value)}
                          placeholder="Claimant guest name..."
                          className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-[11px] w-36"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!claimantNameInput.trim()) return;
                            updateLostFoundStatus(item.id, 'claimed', claimantNameInput.trim());
                            setClaimingItemId(null);
                            setClaimantNameInput('');
                          }}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setClaimingItemId(null);
                            setClaimantNameInput('');
                          }}
                          className="px-2 py-1 rounded bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-[11px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setClaimingItemId(item.id);
                          setClaimantNameInput('');
                        }}
                        className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 text-[11px] font-semibold cursor-pointer"
                      >
                        Return to Guest
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add Lost & Found Item */}
      {isAddLostFoundOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAddLostFoundOpen(false)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0">
              <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                Register Found Guest Property
              </h3>
              <ModalDismissButton onClose={() => setIsAddLostFoundOpen(false)} ariaLabel="Close Lost & Found Modal" />
            </div>
            <form onSubmit={handleSaveLostFound} className="p-5 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Item Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Black RayBan Sunglasses"
                  value={lostItemDesc}
                  onChange={(e) => setLostItemDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Category
                </label>
                <select
                  value={lostCategory}
                  onChange={(e) => setLostCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                >
                  <option value="Valuables">Valuables & Jewellery</option>
                  <option value="Electronics">Electronics & Chargers</option>
                  <option value="Clothing">Clothing & Shawls</option>
                  <option value="Documents">Passport & Documents</option>
                  <option value="Other">Other Personal Effects</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Location Found
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Room 204 or Ground-Floor Terrace"
                  value={lostRoom}
                  onChange={(e) => setLostRoom(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Safe Storage Custody Location
                </label>
                <input
                  type="text"
                  required
                  value={lostLocation}
                  onChange={(e) => setLostLocation(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddLostFoundOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white transition cursor-pointer"
                >
                  Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
