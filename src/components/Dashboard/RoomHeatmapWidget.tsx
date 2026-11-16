import React, { useMemo, useState } from 'react';
import {
  BedDouble,
  CheckCircle2,
  Clock,
  Wrench,
  Sparkles,
  UserCheck,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  X,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { RoomOperationalUnit } from '../../types/hotel';

interface RoomHeatmapWidgetProps {
  onSelectAvailableRoom?: (roomNumber: string) => void;
}

type HeatmapFilter = 'all' | 'available' | 'occupied_reserved' | 'attention';

interface UnitVisualState {
  category: 'available' | 'occupied' | 'reserved' | 'turnaround' | 'maintenance';
  statusLabel: string;
  secondaryLabel: string;
  tileClasses: string;
  badgeTextClasses: string;
  icon: React.ReactNode;
}

function classifyUnit(unit: RoomOperationalUnit): UnitVisualState {
  const hasMaintNote = Boolean(unit.maintenanceNote && unit.maintenanceNote.trim().length > 0);
  const isOutOfOrder = unit.cleanStatus === 'out_of_order';

  if (isOutOfOrder || hasMaintNote) {
    return {
      category: 'maintenance',
      statusLabel: isOutOfOrder ? 'Out of Order' : 'Maintenance',
      secondaryLabel: unit.occupancyStatus === 'occupied' ? 'Occupied · Repair' : 'Hold Unit',
      tileClasses:
        'bg-rose-50 dark:bg-rose-950/45 border-rose-300 dark:border-rose-800 hover:border-rose-500 text-rose-950 dark:text-rose-100',
      badgeTextClasses: 'text-rose-700 dark:text-rose-300',
      icon: <Wrench className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />,
    };
  }

  if (unit.occupancyStatus === 'occupied') {
    return {
      category: 'occupied',
      statusLabel: unit.dndActive ? 'Occupied · DND' : 'Occupied',
      secondaryLabel: unit.currentGuestName || 'In-House Guest',
      tileClasses:
        'bg-amber-50/90 dark:bg-amber-950/35 border-amber-300 dark:border-amber-800/80 hover:border-amber-500 text-stone-900 dark:text-stone-100',
      badgeTextClasses: 'text-amber-800 dark:text-amber-300',
      icon: <UserCheck className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />,
    };
  }

  if (unit.occupancyStatus === 'reserved') {
    return {
      category: 'reserved',
      statusLabel: 'Reserved',
      secondaryLabel: unit.cleanStatus === 'inspected' ? 'Inspected · Ready' : 'Arrival Pending',
      tileClasses:
        'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 hover:border-sky-500 text-sky-950 dark:text-sky-100',
      badgeTextClasses: 'text-sky-700 dark:text-sky-300',
      icon: <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />,
    };
  }

  if (unit.cleanStatus === 'dirty' || unit.cleanStatus === 'in_progress') {
    return {
      category: 'turnaround',
      statusLabel: unit.cleanStatus === 'in_progress' ? 'Cleaning' : 'Dirty',
      secondaryLabel: unit.assignedHousekeeper ? unit.assignedHousekeeper.split(' ')[0] : 'Turnaround',
      tileClasses:
        'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 hover:border-orange-500 text-orange-950 dark:text-orange-100',
      badgeTextClasses: 'text-orange-700 dark:text-orange-300',
      icon: <Sparkles className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />,
    };
  }

  return {
    category: 'available',
    statusLabel: unit.cleanStatus === 'inspected' ? 'Ready for Guest' : 'Available Ready',
    secondaryLabel: unit.cleanStatus === 'inspected' ? (unit.inspectedBy || 'Express Inspected') : 'Clean & Vacant',
    tileClasses:
      'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 text-emerald-950 dark:text-emerald-100',
    badgeTextClasses: 'text-emerald-700 dark:text-emerald-300',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
  };
}

export const RoomHeatmapWidget: React.FC<RoomHeatmapWidgetProps> = ({ onSelectAvailableRoom }) => {
  const {
    roomUnits,
    floors,
    rooms,
    updateRoomCleanStatus,
    updateRoomUnit,
    addAuditLog,
    showToast,
  } = useHotel();

  const [statusFilter, setStatusFilter] = useState<HeatmapFilter>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [maintenanceDraft, setMaintenanceDraft] = useState<string>('');

  const metrics = useMemo(() => {
    let available = 0;
    let occupied = 0;
    let reserved = 0;
    let cleaning = 0;
    let maintenance = 0;

    for (const u of roomUnits) {
      const state = classifyUnit(u);
      if (state.category === 'available') available++;
      else if (state.category === 'occupied') occupied++;
      else if (state.category === 'reserved') reserved++;
      else if (state.category === 'turnaround') cleaning++;
      else if (state.category === 'maintenance') maintenance++;
    }

    return {
      total: roomUnits.length,
      available,
      occupied,
      reserved,
      cleaning,
      maintenance,
    };
  }, [roomUnits]);

  const orderedFloors = useMemo(() => {
    const floorSet = new Set<string>(floors);
    for (const u of roomUnits) {
      if (u.floor) floorSet.add(u.floor);
    }
    return Array.from(floorSet);
  }, [floors, roomUnits]);

  const groupedByFloor = useMemo(() => {
    const groups: { floor: string; units: RoomOperationalUnit[] }[] = [];

    for (const floorName of orderedFloors) {
      if (floorFilter !== 'all' && floorName !== floorFilter) continue;

      const unitsOnFloor = roomUnits
        .filter((u) => u.floor === floorName)
        .filter((u) => {
          const state = classifyUnit(u);
          if (statusFilter === 'available') return state.category === 'available';
          if (statusFilter === 'occupied_reserved') {
            return state.category === 'occupied' || state.category === 'reserved';
          }
          if (statusFilter === 'attention') {
            return state.category === 'maintenance' || state.category === 'turnaround';
          }
          return true;
        })
        .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));

      if (unitsOnFloor.length > 0) {
        groups.push({ floor: floorName, units: unitsOnFloor });
      }
    }

    return groups;
  }, [orderedFloors, roomUnits, floorFilter, statusFilter]);

  const selectedUnit = useMemo(
    () => roomUnits.find((u) => u.id === selectedUnitId) || null,
    [roomUnits, selectedUnitId]
  );

  const handleSelectTile = (unit: RoomOperationalUnit) => {
    if (selectedUnitId === unit.id) {
      setSelectedUnitId(null);
      return;
    }
    setSelectedUnitId(unit.id);
    setMaintenanceDraft(unit.maintenanceNote || '');
  };

  const handleSaveMaintenance = (markOutOfOrder: boolean) => {
    if (!selectedUnit) return;
    const trimmedNote = maintenanceDraft.trim();
    const nextStatus = markOutOfOrder
      ? 'out_of_order'
      : selectedUnit.cleanStatus === 'out_of_order'
      ? 'dirty'
      : selectedUnit.cleanStatus;

    updateRoomCleanStatus(
      selectedUnit.id,
      nextStatus,
      selectedUnit.assignedHousekeeper,
      selectedUnit.inspectedBy,
      trimmedNote
    );

    if (trimmedNote) {
      addAuditLog(
        'Maintenance Ticket Updated',
        'booking',
        `Room ${selectedUnit.roomNumber} maintenance logged: "${trimmedNote}" (${nextStatus.toUpperCase()})`
      );
    }
  };

  const handleResolveMaintenanceAndClean = () => {
    if (!selectedUnit) return;
    setMaintenanceDraft('');
    updateRoomCleanStatus(
      selectedUnit.id,
      'clean',
      selectedUnit.assignedHousekeeper,
      'Front Desk Verified',
      ''
    );
    showToast(
      `Room ${selectedUnit.roomNumber} Released`,
      'Maintenance cleared and unit marked Clean & Available for assignment.',
      'success'
    );
  };

  return (
    <section
      aria-label="Real-Time Room Occupancy and Maintenance Heatmap"
      className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6"
    >
      {/* Header & Interactive Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50">
              Real-Time Room Occupancy &amp; Maintenance Heatmap
            </h3>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Floor-by-floor unit readiness map. Click any room tile to inspect maintenance tickets, update housekeeping status, or assign arrivals.
          </p>
        </div>

        <div
          role="group"
          aria-label="Filter room tiles by status"
          className="inline-flex flex-wrap items-center rounded-lg bg-stone-100 dark:bg-stone-800 p-1 border border-stone-200 dark:border-stone-700 gap-1"
        >
          {(
            [
              { id: 'all', label: `All (${metrics.total})` },
              { id: 'available', label: `Ready (${metrics.available})` },
              { id: 'occupied_reserved', label: `Occupied (${metrics.occupied + metrics.reserved})` },
              { id: 'attention', label: `Maint. / Dirty (${metrics.maintenance + metrics.cleaning})` },
            ] as { id: HeatmapFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Strip (Flat tabular numerals, color paired with text labels) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pb-5 border-b border-stone-200 dark:border-stone-800 tabular-nums text-xs">
        <div>
          <div className="text-stone-500 dark:text-stone-400 font-medium">Ready to Assign</div>
          <div className="mt-1 text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400">
            {metrics.available}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400">Clean &amp; vacant units</div>
        </div>

        <div>
          <div className="text-stone-500 dark:text-stone-400 font-medium">Occupied In-House</div>
          <div className="mt-1 text-2xl font-serif font-bold text-amber-700 dark:text-amber-400">
            {metrics.occupied}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400">Checked-in guests</div>
        </div>

        <div>
          <div className="text-stone-500 dark:text-stone-400 font-medium">Reserved Arrivals</div>
          <div className="mt-1 text-2xl font-serif font-bold text-sky-700 dark:text-sky-400">
            {metrics.reserved}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400">Pre-assigned units</div>
        </div>

        <div>
          <div className="text-stone-500 dark:text-stone-400 font-medium">Housekeeping Queue</div>
          <div className="mt-1 text-2xl font-serif font-bold text-orange-700 dark:text-orange-400">
            {metrics.cleaning}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400">Dirty or in progress</div>
        </div>

        <div>
          <div className="text-stone-500 dark:text-stone-400 font-medium">Maintenance Alerts</div>
          <div className="mt-1 text-2xl font-serif font-bold text-rose-700 dark:text-rose-400">
            {metrics.maintenance}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400">Active repair or OOO</div>
        </div>
      </div>

      {/* Floor Filter Bar */}
      {orderedFloors.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFloorFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              floorFilter === 'all'
                ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            All Floors
          </button>
          {orderedFloors.map((floorName) => (
            <button
              key={floorName}
              type="button"
              onClick={() => setFloorFilter(floorName)}
              className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                floorFilter === floorName
                  ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              {floorName}
            </button>
          ))}
        </div>
      )}

      {/* Heatmap Matrix by Floor */}
      {groupedByFloor.length === 0 ? (
        <div className="p-8 text-center rounded-lg border border-dashed border-stone-300 dark:border-stone-700 space-y-2">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
            No room units match the selected filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setFloorFilter('all');
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 cursor-pointer"
          >
            Reset Heatmap Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByFloor.map((group) => (
            <div key={group.floor} className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {group.floor}
                </span>
                <span className="tabular-nums">
                  {group.units.filter((u) => classifyUnit(u).category === 'available').length} ready / {group.units.length} units
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {group.units.map((unit) => {
                  const visual = classifyUnit(unit);
                  const isSelected = selectedUnitId === unit.id;
                  const roomCatalog = rooms.find((r) => r.type === unit.roomType);

                  return (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => handleSelectTile(unit)}
                      className={`text-left p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-2 min-h-[96px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                        visual.tileClasses
                      } ${isSelected ? 'ring-2 ring-stone-900 dark:ring-amber-400 shadow-sm' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="font-mono font-bold text-base tabular-nums">
                          {unit.roomNumber}
                        </span>
                        {visual.icon}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className={`text-[11px] font-semibold truncate ${visual.badgeTextClasses}`}>
                          {visual.statusLabel}
                        </div>
                        <div className="text-[11px] opacity-80 truncate">
                          {unit.maintenanceNote ? unit.maintenanceNote : visual.secondaryLabel}
                        </div>
                        <div className="text-[10px] opacity-60 truncate">
                          {roomCatalog ? roomCatalog.type.replace('-', ' ') : unit.roomType.replace('-', ' ')}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Room Inspector & Maintenance Actions */}
      {selectedUnit && (
        <div className="pt-5 border-t border-stone-200 dark:border-stone-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                  Room {selectedUnit.roomNumber}
                </span>
                <span aria-hidden="true">·</span>
                <span>{selectedUnit.floor}</span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{selectedUnit.roomType.replace('-', ' ')}</span>
              </div>
              <div className="text-xs text-stone-600 dark:text-stone-300 mt-1">
                {selectedUnit.currentGuestName
                  ? `Occupied by ${selectedUnit.currentGuestName} (${selectedUnit.currentBookingCode || 'Active Stay'}) · Check-out ${selectedUnit.checkOutDate || 'scheduled'}`
                  : `Vacant unit · Cleanliness: ${selectedUnit.cleanStatus.replace('_', ' ')}${selectedUnit.lastCleanedAt ? ` · Last cleaned ${selectedUnit.lastCleanedAt}` : ''}`}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {classifyUnit(selectedUnit).category === 'available' && onSelectAvailableRoom && (
                <button
                  type="button"
                  onClick={() => onSelectAvailableRoom(selectedUnit.roomNumber)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Check In to Room {selectedUnit.roomNumber}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedUnitId(null)}
                className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
                aria-label="Close room inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            {/* Maintenance Note Controls */}
            <div className="space-y-2">
              <label
                htmlFor="heatmap-maint-note"
                className="block font-semibold text-stone-700 dark:text-stone-300"
              >
                Maintenance / Repair Ticket Note
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="heatmap-maint-note"
                  type="text"
                  value={maintenanceDraft}
                  onChange={(e) => setMaintenanceDraft(e.target.value)}
                  placeholder="e.g. AC filter cleaning or bathroom tap pressure check"
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleSaveMaintenance(false)}
                  className="px-3 py-2 rounded-lg font-semibold bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 whitespace-nowrap cursor-pointer"
                >
                  Save Note
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveMaintenance(true)}
                  className="px-3 py-2 rounded-lg font-semibold bg-rose-700 hover:bg-rose-800 text-white whitespace-nowrap cursor-pointer"
                >
                  Flag Out of Order
                </button>
              </div>
            </div>

            {/* Quick Housekeeping & Status Controls */}
            <div className="space-y-2">
              <div className="font-semibold text-stone-700 dark:text-stone-300">
                Housekeeping &amp; Readiness Controls
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleResolveMaintenanceAndClean}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg font-semibold bg-emerald-700 hover:bg-emerald-800 text-white whitespace-nowrap cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Clear Issue &amp; Mark Clean</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateRoomCleanStatus(selectedUnit.id, 'inspected')}
                  className="px-3 py-2 rounded-lg font-semibold border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 whitespace-nowrap cursor-pointer"
                >
                  Mark Inspected
                </button>
                <button
                  type="button"
                  onClick={() => updateRoomCleanStatus(selectedUnit.id, 'dirty')}
                  className="px-3 py-2 rounded-lg font-semibold border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 whitespace-nowrap cursor-pointer"
                >
                  Mark Dirty
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateRoomUnit(selectedUnit.id, { dndActive: !selectedUnit.dndActive })
                  }
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg font-semibold border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 whitespace-nowrap cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{selectedUnit.dndActive ? 'Clear DND' : 'Set DND'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Explicit Status Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 border-t border-stone-100 dark:border-stone-800/80 text-[11px] text-stone-600 dark:text-stone-400">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Available Ready</span>
        </span>
        <span className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
          <span>Occupied In-House</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Reserved Arrival</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
          <span>Cleaning Turnaround</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>Maintenance / Out of Order</span>
        </span>
      </div>
    </section>
  );
};
