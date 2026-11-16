import React, { useMemo, useState } from 'react';
import {
  Wrench,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Search,
  UserCheck,
  Clock,
  ClipboardCheck,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceTicket,
  RoomCleanlinessStatus,
} from '../../types/hotel';
import { getThemeClasses } from '../../utils/theme';
import { RoomHeatmapWidget } from './RoomHeatmapWidget';
import { HousekeepingChecklistPanel } from './HousekeepingChecklistPanel';

const COMMON_ISSUE_PRESETS: {
  label: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
}[] = [
  { label: 'Leaking bathroom sink faucet', category: 'plumbing', priority: 'high' },
  { label: 'Shower hot water / pressure fault', category: 'plumbing', priority: 'high' },
  { label: 'AC cooling / thermostat malfunction', category: 'hvac', priority: 'medium' },
  { label: 'Smart door lock / keycard fault', category: 'lock_access', priority: 'urgent' },
  { label: 'Flickering lighting or outlet trip', category: 'electrical', priority: 'medium' },
  { label: 'Broken hinge / bed frame / curtain rail', category: 'furniture', priority: 'low' },
];

export const MaintenanceTrackerPanel: React.FC = () => {
  const {
    roomUnits,
    maintenanceTickets,
    deepCleaningSchedules,
    floorSupplies,
    reportMaintenanceIssue,
    updateMaintenanceTicketStatus,
    confirmMaintenanceRepair,
    activeRole,
    themeConfig,
    showToast,
  } = useHotel();

  const themeClasses = getThemeClasses(themeConfig.palette);
  const isMaintenanceManager =
    activeRole === 'super_admin' ||
    activeRole === 'admin' ||
    activeRole === 'hotel_manager';

  const [panelView, setPanelView] = useState<'tickets' | 'checklist'>('tickets');

  // Report Form State
  const [selectedUnitId, setSelectedUnitId] = useState<string>(roomUnits[0]?.id || '');
  const [category, setCategory] = useState<MaintenanceCategory>('plumbing');
  const [priority, setPriority] = useState<MaintenancePriority>('high');
  const [issueTitle, setIssueTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [assignedTechnician, setAssignedTechnician] = useState<string>('');

  // Queue & Manager Sign-Off State
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [repairNotesDraft, setRepairNotesDraft] = useState<Record<string, string>>({});
  const [releaseStatusDraft, setReleaseStatusDraft] = useState<
    Record<string, Extract<RoomCleanlinessStatus, 'dirty' | 'clean' | 'inspected'>>
  >({});
  const [techDraft, setTechDraft] = useState<Record<string, string>>({});
  const [showLiveHeatmap, setShowLiveHeatmap] = useState<boolean>(true);

  const metrics = useMemo(() => {
    const open = maintenanceTickets.filter((t) => t.status !== 'resolved');
    const urgentOrHigh = open.filter(
      (t) => t.priority === 'urgent' || t.priority === 'high'
    ).length;
    const awaitingSignoff = open.filter((t) => t.status === 'awaiting_signoff').length;
    const oooRooms = roomUnits.filter((u) => u.cleanStatus === 'out_of_order').length;
    const resolved = maintenanceTickets.filter((t) => t.status === 'resolved').length;
    const pendingDeepClean = deepCleaningSchedules.filter((s) => s.status !== 'completed').length;
    const lowSupplies = floorSupplies.filter((s) => s.currentStock < Math.ceil(s.parLevel * 0.5)).length;
    return {
      openCount: open.length,
      urgentOrHigh,
      awaitingSignoff,
      oooRooms,
      resolved,
      pendingDeepClean,
      lowSupplies,
    };
  }, [maintenanceTickets, roomUnits, deepCleaningSchedules, floorSupplies]);

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return maintenanceTickets.filter((t) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'open' ? t.status !== 'resolved' : t.status === 'resolved');
      const matchesQuery =
        !q ||
        t.roomNumber.toLowerCase().includes(q) ||
        t.ticketCode.toLowerCase().includes(q) ||
        t.issueTitle.toLowerCase().includes(q) ||
        t.reportedBy.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [maintenanceTickets, statusFilter, searchQuery]);

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId || !issueTitle.trim()) {
      showToast('Missing Details', 'Select a room unit and describe the issue.', 'warning');
      return;
    }

    reportMaintenanceIssue({
      unitId: selectedUnitId,
      category,
      priority,
      issueTitle,
      description,
      assignedTechnician,
    });

    setIssueTitle('');
    setDescription('');
    setAssignedTechnician('');
  };

  const getPriorityTextClass = (p: MaintenancePriority) => {
    if (p === 'urgent' || p === 'high') return 'text-rose-700 dark:text-rose-400';
    if (p === 'medium') return 'text-amber-700 dark:text-amber-400';
    return 'text-stone-600 dark:text-stone-400';
  };

  const getTicketStatusText = (t: MaintenanceTicket) => {
    if (t.status === 'resolved') return 'Repairs Confirmed';
    if (t.status === 'awaiting_signoff') return 'Awaiting Manager Sign-Off';
    if (t.status === 'in_repair') return 'Repair In Progress';
    return 'Reported · Room Out of Order';
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header + Single-Elevation Summary KPI Strip */}
      <section className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50">
                Housekeeping &amp; Facility Maintenance Tracker
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Reporting a room issue automatically places the unit into Out of Order on the Room Heatmap until a hotel manager confirms repairs are complete.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setPanelView('tickets')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  panelView === 'tickets'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span className="tabular-nums">Maintenance Tickets ({metrics.openCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setPanelView('checklist')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  panelView === 'checklist'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="tabular-nums">
                  Housekeeping Checklist ({metrics.pendingDeepClean} · {metrics.lowSupplies} Low Stock)
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowLiveHeatmap((prev) => !prev)}
              className="px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              {showLiveHeatmap ? 'Hide Live Heatmap' : 'Show Live Room Heatmap'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
          <div>
            <div className="text-stone-500 dark:text-stone-400">Open Repair Tickets</div>
            <div className="mt-1 text-2xl font-serif font-bold text-rose-700 dark:text-rose-400">
              {metrics.openCount}
            </div>
            <div className="text-[11px] text-stone-500">
              {metrics.urgentOrHigh} high or urgent priority
            </div>
          </div>

          <div>
            <div className="text-stone-500 dark:text-stone-400">Rooms Out of Order</div>
            <div className="mt-1 text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
              {metrics.oooRooms}
            </div>
            <div className="text-[11px] text-stone-500">Held from front-desk check-in</div>
          </div>

          <div>
            <div className="text-stone-500 dark:text-stone-400">Deep-Clean Schedules Due</div>
            <div className="mt-1 text-2xl font-serif font-bold text-amber-700 dark:text-amber-400">
              {metrics.pendingDeepClean}
            </div>
            <div className="text-[11px] text-stone-500">
              {metrics.awaitingSignoff} repairs awaiting sign-off
            </div>
          </div>

          <div>
            <div className="text-stone-500 dark:text-stone-400">Floor Low-Stock Supplies</div>
            <div className="mt-1 text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400">
              {metrics.lowSupplies}
            </div>
            <div className="text-[11px] text-stone-500">
              {metrics.resolved} confirmed maintenance repairs
            </div>
          </div>
        </div>
      </section>

      {panelView === 'checklist' ? (
        <HousekeepingChecklistPanel />
      ) : (
      /* Main Split: Report Issue (Left 5 Cols) & Repair Queue / Sign-Off (Right 7 Cols) */
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Report Room Issue Form */}
        <section className="lg:col-span-5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
            <h3 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Report Room Issue (Auto-Sets Out of Order)</span>
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              Immediately updates the Room Status Heatmap to hold the unit until repaired.
            </p>
          </div>

          {/* Quick Housekeeping Presets */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
              Common Housekeeping Issue Presets
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_ISSUE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setIssueTitle(preset.label);
                    setCategory(preset.category);
                    setPriority(preset.priority);
                  }}
                  className="px-2.5 py-1 rounded-md border border-stone-200 dark:border-stone-700 hover:border-amber-600 text-[11px] text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/70 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleReportSubmit} className="space-y-3">
            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Room Unit
              </label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                {roomUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    Room {u.roomNumber} · {u.floor} ({u.cleanStatus.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Issue Summary *
              </label>
              <input
                type="text"
                required
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                placeholder="e.g. Leaking faucet in bathroom sink"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 capitalize"
                >
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="hvac">HVAC / AC &amp; Heating</option>
                  <option value="lock_access">Door Lock &amp; Access</option>
                  <option value="furniture">Furniture &amp; Fixtures</option>
                  <option value="housekeeping_damage">Housekeeping Damage</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 capitalize"
                >
                  <option value="urgent">Urgent (Block Immediately)</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Assign Technician (Optional)
              </label>
              <input
                type="text"
                value={assignedTechnician}
                onChange={(e) => setAssignedTechnician(e.target.value)}
                placeholder="e.g. Nabin Shrestha (Plumbing)"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Inspection Notes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe exact fixture location, severity, or parts required..."
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 px-4 rounded-lg font-semibold inline-flex items-center justify-center gap-2 shadow-sm whitespace-nowrap shrink-0 cursor-pointer ${themeClasses.primary}`}
            >
              <Plus className="w-4 h-4" />
              <span>Report Issue &amp; Mark Out of Order</span>
            </button>
          </form>
        </section>

        {/* Active & Resolved Maintenance Tickets Queue */}
        <section className="lg:col-span-7 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
            <h3 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
              Maintenance Work Orders ({filteredTickets.length})
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search room, ticket #, issue..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs w-48"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
              </div>

              <div className="inline-flex items-center p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                {(
                  [
                    { id: 'open', label: `Open (${metrics.openCount})` },
                    { id: 'resolved', label: `Confirmed (${metrics.resolved})` },
                    { id: 'all', label: 'All' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      statusFilter === tab.id
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center rounded-lg border border-dashed border-stone-300 dark:border-stone-700 text-stone-500">
              No maintenance tickets match the current view.
            </div>
          ) : (
            <div className="divide-y divide-stone-200 dark:divide-stone-800">
              {filteredTickets.map((ticket) => {
                const roomUnit = roomUnits.find((u) => u.id === ticket.unitId);
                const currentTech = techDraft[ticket.id] ?? ticket.assignedTechnician ?? '';
                const currentNotes = repairNotesDraft[ticket.id] ?? ticket.repairNotes ?? '';
                const nextStatus = releaseStatusDraft[ticket.id] ?? 'dirty';

                return (
                  <div key={ticket.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                          <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                            {ticket.ticketCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-stone-800 dark:text-stone-200">
                            Room {ticket.roomNumber} ({ticket.floor})
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{ticket.category.replace('_', ' ')}</span>
                          <span aria-hidden="true">·</span>
                          <span className={`font-semibold uppercase ${getPriorityTextClass(ticket.priority)}`}>
                            {ticket.priority} priority
                          </span>
                        </div>

                        <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
                          {ticket.issueTitle}
                        </h4>

                        <p className="text-xs text-stone-600 dark:text-stone-400">
                          {ticket.description}
                        </p>

                        <div className="text-[11px] text-stone-500 flex flex-wrap items-center gap-2 tabular-nums">
                          <span>Reported by {ticket.reportedBy}</span>
                          <span aria-hidden="true">·</span>
                          <span>{ticket.reportedAt}</span>
                          {roomUnit && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span
                                className={`font-semibold ${
                                  roomUnit.cleanStatus === 'out_of_order'
                                    ? 'text-rose-700 dark:text-rose-400'
                                    : 'text-emerald-700 dark:text-emerald-400'
                                }`}
                              >
                                Heatmap State: {roomUnit.cleanStatus.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-xs ${
                            ticket.status === 'resolved'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : ticket.status === 'awaiting_signoff'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {ticket.status === 'resolved' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span>{getTicketStatusText(ticket)}</span>
                        </span>
                      </div>
                    </div>

                    {ticket.status === 'resolved' ? (
                      <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-[11px] text-emerald-900 dark:text-emerald-200 space-y-0.5">
                        <div className="font-semibold">
                          Confirmed by {ticket.confirmedByManager || 'Hotel Manager'} · {ticket.resolvedAt}
                        </div>
                        {ticket.repairNotes && <div>Repair Work Log: {ticket.repairNotes}</div>}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={currentTech}
                            onChange={(e) =>
                              setTechDraft((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                            }
                            placeholder="Assigned technician name..."
                            className="px-2.5 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs"
                          />
                          <input
                            type="text"
                            value={currentNotes}
                            onChange={(e) =>
                              setRepairNotesDraft((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                            }
                            placeholder="Technician repair note / parts replaced..."
                            className="px-2.5 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateMaintenanceTicketStatus(
                                  ticket.id,
                                  'in_repair',
                                  currentTech,
                                  currentNotes
                                )
                              }
                              className={`px-2.5 py-1.5 rounded-md border font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                                ticket.status === 'in_repair'
                                  ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900'
                                  : 'border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                              }`}
                            >
                              Mark In Repair
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateMaintenanceTicketStatus(
                                  ticket.id,
                                  'awaiting_signoff',
                                  currentTech,
                                  currentNotes
                                )
                              }
                              className={`px-2.5 py-1.5 rounded-md border font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                                ticket.status === 'awaiting_signoff'
                                  ? 'bg-amber-700 text-white border-amber-700'
                                  : 'border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                              }`}
                            >
                              Request Manager Sign-Off
                            </button>
                          </div>

                          {isMaintenanceManager ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <select
                                value={nextStatus}
                                onChange={(e) =>
                                  setReleaseStatusDraft((prev) => ({
                                    ...prev,
                                    [ticket.id]: e.target.value as 'dirty' | 'clean' | 'inspected',
                                  }))
                                }
                                className="px-2 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs"
                                aria-label="Post-repair room status"
                              >
                                <option value="dirty">Release as Dirty (For Cleaning)</option>
                                <option value="clean">Release as Clean &amp; Ready</option>
                                <option value="inspected">Release as Inspected</option>
                              </select>

                              <button
                                type="button"
                                onClick={() =>
                                  confirmMaintenanceRepair(ticket.id, nextStatus, currentNotes)
                                }
                                className="px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Confirm Repairs &amp; Release Room</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-stone-500 flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                              <span>Manager sign-off required to clear Out of Order</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      )}

      {/* Synchronized Live Room Occupancy & Maintenance Heatmap */}
      {showLiveHeatmap && <RoomHeatmapWidget />}
    </div>
  );
};
