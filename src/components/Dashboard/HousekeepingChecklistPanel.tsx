import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Package,
  Plus,
  RefreshCw,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import {
  DeepCleanFrequency,
  FloorSupplyCategory,
} from '../../types/hotel';
import { getThemeClasses } from '../../utils/theme';

const DEEP_CLEAN_TEMPLATES: Record<string, string[]> = {
  'Standard Room Deep Clean': [
    'HEPA carpet vacuum & upholstery steam sanitize',
    'Window glass, frames & curtain track dust removal',
    'Rain shower head descale & bathroom tile grout scrub',
    'Split AC filter wash & exhaust fan wipe',
    'Mattress flip/rotate & under-bed deep sweep',
  ],
  'VIP Suite & Terrace Protocol': [
    'Private sun terrace pressure rinse & railing polish',
    'Deep soaking tub sanitize & brass fixture buffing',
    'Hand-woven rug extraction & parlor sofa steam clean',
    'Split AC filter wash & aroma diffuser refill',
    'Mini-bar interior sanitize & glass shelf polish',
  ],
  'Post-Long-Stay Sanitization': [
    'Full linen strip, duvet & pillow protector thermal swap',
    'All high-touch switches, handles & remote UVC/sanitizer wipe',
    'Wardrobe interior, luggage rack & safe keypad disinfect',
    'Bathroom drain trap flush & anti-scale mirror seal',
  ],
};

export const HousekeepingChecklistPanel: React.FC = () => {
  const {
    roomUnits,
    floors,
    staff,
    deepCleaningSchedules,
    floorSupplies,
    createDeepCleaningSchedule,
    toggleDeepCleanTask,
    updateDeepCleanStatus,
    adjustFloorSupplyStock,
    addFloorSupplyItem,
    themeConfig,
    showToast,
  } = useHotel();

  const themeClasses = getThemeClasses(themeConfig.palette);
  const todayIso = new Date().toISOString().split('T')[0];

  // Deep-Clean Form State
  const [selectedUnitId, setSelectedUnitId] = useState<string>(roomUnits[0]?.id || '');
  const [scheduledDate, setScheduledDate] = useState<string>(todayIso);
  const [frequency, setFrequency] = useState<DeepCleanFrequency>('weekly');
  const [assignedHousekeeper, setAssignedHousekeeper] = useState<string>(
    staff.find((s) => s.role === 'housekeeping')?.name || 'Sunita Thapa'
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>('Standard Room Deep Clean');
  const [customTaskInput, setCustomTaskInput] = useState<string>('');
  const [scheduleNotes, setScheduleNotes] = useState<string>('');
  const [scheduleFilterFloor, setScheduleFilterFloor] = useState<string>('All');

  // Floor Supply Filter & Add Form State
  const availableFloors = useMemo(() => {
    const floorSet = new Set<string>();
    floors.forEach((f) => floorSet.add(f));
    roomUnits.forEach((u) => floorSet.add(u.floor));
    floorSupplies.forEach((s) => floorSet.add(s.floor));
    return Array.from(floorSet);
  }, [floors, roomUnits, floorSupplies]);

  const [selectedSupplyFloor, setSelectedSupplyFloor] = useState<string>('All');
  const [newSupplyFloor, setNewSupplyFloor] = useState<string>(availableFloors[0] || 'Ground Floor');
  const [newSupplyName, setNewSupplyName] = useState<string>('');
  const [newSupplyCategory, setNewSupplyCategory] = useState<FloorSupplyCategory>('linens');
  const [newSupplyStock, setNewSupplyStock] = useState<string>('12');
  const [newSupplyPar, setNewSupplyPar] = useState<string>('20');
  const [newSupplyUnit, setNewSupplyUnit] = useState<string>('pcs');

  const filteredSchedules = useMemo(() => {
    return deepCleaningSchedules.filter((s) => {
      if (scheduleFilterFloor === 'All') return true;
      return s.floor === scheduleFilterFloor;
    });
  }, [deepCleaningSchedules, scheduleFilterFloor]);

  const filteredSupplies = useMemo(() => {
    return floorSupplies.filter((item) => {
      if (selectedSupplyFloor === 'All') return true;
      return item.floor === selectedSupplyFloor;
    });
  }, [floorSupplies, selectedSupplyFloor]);

  const lowStockSuppliesCount = useMemo(
    () => floorSupplies.filter((item) => item.currentStock < Math.ceil(item.parLevel * 0.5)).length,
    [floorSupplies]
  );

  const pendingDeepCleanCount = useMemo(
    () => deepCleaningSchedules.filter((s) => s.status !== 'completed').length,
    [deepCleaningSchedules]
  );

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) {
      showToast('Select Room', 'Choose a room unit to schedule deep cleaning.', 'warning');
      return;
    }
    const baseTasks = [...(DEEP_CLEAN_TEMPLATES[selectedTemplate] || [])];
    if (customTaskInput.trim()) {
      baseTasks.push(customTaskInput.trim());
    }

    createDeepCleaningSchedule({
      unitId: selectedUnitId,
      scheduledDate,
      frequency,
      assignedHousekeeper,
      tasks: baseTasks,
      notes: scheduleNotes,
    });

    setCustomTaskInput('');
    setScheduleNotes('');
  };

  const handleAddFloorSupply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplyName.trim()) {
      showToast('Missing Item Name', 'Enter the supply item name to add to this floor.', 'warning');
      return;
    }

    addFloorSupplyItem({
      floor: newSupplyFloor,
      itemName: newSupplyName,
      category: newSupplyCategory,
      currentStock: Number(newSupplyStock) || 0,
      parLevel: Math.max(1, Number(newSupplyPar) || 10),
      unit: newSupplyUnit,
    });

    setNewSupplyName('');
  };

  return (
    <div className="space-y-6 text-xs">
      {/* SECTION 1: ROOM-SPECIFIC DEEP-CLEANING SCHEDULES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Create Deep-Cleaning Schedule Form */}
        <section className="lg:col-span-5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
            <h3 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Set Room Deep-Cleaning Schedule</span>
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              Assign room-specific checklists, sanitization protocols, and cadence per unit.
            </p>
          </div>

          <form onSubmit={handleCreateSchedule} className="space-y-3">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Recurrence Cadence
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as DeepCleanFrequency)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  <option value="weekly">Weekly Deep Clean</option>
                  <option value="biweekly">Bi-Weekly Rotation</option>
                  <option value="monthly">Monthly Full Overhaul</option>
                  <option value="post_long_stay">Post-Long-Stay Sanitize</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Assigned Housekeeper
                </label>
                <input
                  type="text"
                  required
                  value={assignedHousekeeper}
                  onChange={(e) => setAssignedHousekeeper(e.target.value)}
                  placeholder="e.g. Sunita Thapa"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Checklist Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  {Object.keys(DEEP_CLEAN_TEMPLATES).map((tpl) => (
                    <option key={tpl} value={tpl}>
                      {tpl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Additional Room-Specific Task (Optional)
              </label>
              <input
                type="text"
                value={customTaskInput}
                onChange={(e) => setCustomTaskInput(e.target.value)}
                placeholder="e.g. Steam sanitize nursery crib or balcony decking"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Supervisor Notes
              </label>
              <input
                type="text"
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="Timing window or inspection priority..."
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 px-4 rounded-lg font-semibold inline-flex items-center justify-center gap-2 shadow-sm whitespace-nowrap shrink-0 cursor-pointer ${themeClasses.primary}`}
            >
              <Plus className="w-4 h-4" />
              <span>Assign Room Deep-Clean Checklist</span>
            </button>
          </form>
        </section>

        {/* Active Room Deep-Cleaning Checklists */}
        <section className="lg:col-span-7 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <h3 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
                Room Deep-Cleaning Checklists ({pendingDeepCleanCount} Pending)
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Check off individual protocol tasks to update live room deep-clean progress.
              </p>
            </div>

            <select
              value={scheduleFilterFloor}
              onChange={(e) => setScheduleFilterFloor(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs"
            >
              <option value="All">All Floors</option>
              {availableFloors.map((fl) => (
                <option key={fl} value={fl}>
                  {fl}
                </option>
              ))}
            </select>
          </div>

          {filteredSchedules.length === 0 ? (
            <div className="p-8 text-center rounded-lg border border-dashed border-stone-300 dark:border-stone-700 text-stone-500">
              No deep-cleaning checklists scheduled for this floor filter.
            </div>
          ) : (
            <div className="divide-y divide-stone-200 dark:divide-stone-800">
              {filteredSchedules.map((sched) => {
                const doneCount = sched.tasks.filter((t) => t.completed).length;
                const pct = sched.tasks.length > 0 ? Math.round((doneCount / sched.tasks.length) * 100) : 0;

                return (
                  <div key={sched.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                          <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                            {sched.scheduleCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-stone-900 dark:text-stone-100">
                            Room {sched.roomNumber} ({sched.floor})
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{sched.frequency.replace('_', ' ')}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                            <Calendar className="w-3 h-3" />
                            {sched.scheduledDate}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                          Lead: <span className="font-semibold text-stone-700 dark:text-stone-300">{sched.assignedHousekeeper}</span>
                          {sched.notes ? ` · ${sched.notes}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 tabular-nums">
                        <span
                          className={`font-semibold text-[11px] ${
                            sched.status === 'completed'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : sched.status === 'in_progress'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          {doneCount}/{sched.tasks.length} Done ({pct}%)
                        </span>

                        {sched.status !== 'completed' ? (
                          <button
                            type="button"
                            onClick={() => updateDeepCleanStatus(sched.id, 'completed')}
                            className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Complete All</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateDeepCleanStatus(sched.id, 'in_progress')}
                            className="px-2.5 py-1 rounded-md border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Reopen</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Interactive Checklist Tasks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {sched.tasks.map((task) => (
                        <label
                          key={task.id}
                          className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                            task.completed
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-stone-600 dark:text-stone-400'
                              : 'bg-stone-50 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 hover:border-amber-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleDeepCleanTask(sched.id, task.id)}
                            className="mt-0.5 rounded border-stone-300 dark:border-stone-600 text-emerald-600"
                          />
                          <span className={task.completed ? 'line-through opacity-80' : ''}>{task.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* SECTION 2: FLOOR-BY-FLOOR HOUSEKEEPING SUPPLY INVENTORY */}
      <section className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-50">
                Housekeeping Supply Pantry Levels by Floor
              </h3>
              {lowStockSuppliesCount > 0 && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {lowStockSuppliesCount} Low-Stock Alert{lowStockSuppliesCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-stone-500 dark:text-stone-400">
              Track linens, Ayurvedic toiletries, guest refreshments, and cleaning chemicals stocked on each hotel floor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
            <button
              type="button"
              onClick={() => setSelectedSupplyFloor('All')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedSupplyFloor === 'All'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              All Floors
            </button>
            {availableFloors.map((fl) => (
              <button
                key={fl}
                type="button"
                onClick={() => setSelectedSupplyFloor(fl)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedSupplyFloor === fl
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                {fl}
              </button>
            ))}
          </div>
        </div>

        {/* Supply Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600 dark:text-stone-300">
            <thead className="bg-stone-50 dark:bg-stone-800/80 text-[11px] uppercase tracking-wider text-stone-500 font-mono border-y border-stone-200 dark:border-stone-700">
              <tr>
                <th className="py-2.5 px-3">Floor</th>
                <th className="py-2.5 px-3">Supply Item</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Stock vs Par Level</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Last Restocked</th>
                <th className="py-2.5 px-3 text-right">Adjust / Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredSupplies.map((item) => {
                const ratio = Math.min(100, Math.round((item.currentStock / Math.max(1, item.parLevel)) * 100));
                const isCritical = item.currentStock <= Math.floor(item.parLevel * 0.25);
                const isLow = item.currentStock < Math.ceil(item.parLevel * 0.5);

                return (
                  <tr key={item.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40">
                    <td className="py-2.5 px-3 font-semibold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                      {item.floor}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-stone-900 dark:text-stone-100">
                      {item.itemName}
                    </td>
                    <td className="py-2.5 px-3 capitalize text-stone-500 dark:text-stone-400">
                      {item.category.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 min-w-[160px] tabular-nums">
                      <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {item.currentStock} {item.unit}
                        </span>
                        <span className="text-stone-400">Par: {item.parLevel}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isCritical ? 'bg-rose-600' : isLow ? 'bg-amber-500' : 'bg-emerald-600'
                          }`}
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          isCritical
                            ? 'text-rose-700 dark:text-rose-400'
                            : isLow
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {isCritical ? 'Critical Refill' : isLow ? 'Low Stock' : 'Nominal'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500 whitespace-nowrap tabular-nums">
                      {item.lastRestockedAt} · {item.updatedBy}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => adjustFloorSupplyStock(item.id, -1, 'delta')}
                          className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 font-mono font-bold cursor-pointer"
                          title="Issue 1 unit from floor pantry"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustFloorSupplyStock(item.id, 1, 'delta')}
                          className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 font-mono font-bold cursor-pointer"
                          title="Add 1 unit to floor pantry"
                        >
                          +1
                        </button>
                        {item.currentStock < item.parLevel && (
                          <button
                            type="button"
                            onClick={() => adjustFloorSupplyStock(item.id, item.parLevel, 'set')}
                            className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Fill Par
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

        {/* Inline Add Floor Supply Item Bar */}
        <form
          onSubmit={handleAddFloorSupply}
          className="pt-4 border-t border-stone-200 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end"
        >
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
              Floor
            </label>
            <select
              value={newSupplyFloor}
              onChange={(e) => setNewSupplyFloor(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              {availableFloors.map((fl) => (
                <option key={fl} value={fl}>
                  {fl}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
              New Pantry Supply Item
            </label>
            <input
              type="text"
              value={newSupplyName}
              onChange={(e) => setNewSupplyName(e.target.value)}
              placeholder="e.g. Microfiber Dusting Cloths"
              className="w-full px-2.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
              Category
            </label>
            <select
              value={newSupplyCategory}
              onChange={(e) => setNewSupplyCategory(e.target.value as FloorSupplyCategory)}
              className="w-full px-2.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              <option value="linens">Linens</option>
              <option value="toiletries">Toiletries</option>
              <option value="minibar_amenities">Minibar &amp; Tea</option>
              <option value="cleaning_agents">Cleaning Agents</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                Qty
              </label>
              <input
                type="number"
                min={0}
                value={newSupplyStock}
                onChange={(e) => setNewSupplyStock(e.target.value)}
                className="w-full px-2 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                Par
              </label>
              <input
                type="number"
                min={1}
                value={newSupplyPar}
                onChange={(e) => setNewSupplyPar(e.target.value)}
                className="w-full px-2 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                Unit
              </label>
              <input
                type="text"
                value={newSupplyUnit}
                onChange={(e) => setNewSupplyUnit(e.target.value)}
                className="w-full px-2 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          <button
            type="submit"
            className={`py-2 px-3 rounded-lg font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${themeClasses.primary}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Supply</span>
          </button>
        </form>
      </section>
    </div>
  );
};
