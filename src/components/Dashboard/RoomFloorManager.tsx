import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { RoomOperationalUnit, RoomType, RoomCleanlinessStatus } from '../../types/hotel';
import { 
  Building2, 
  Layers, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  DoorClosed, 
  X,
  Search,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { ModalDismissButton, useModalDismiss } from '../Common/ModalDismissHandler';

export const RoomFloorManager: React.FC = () => {
  const { 
    floors, 
    addFloor, 
    deleteFloor, 
    roomUnits, 
    addRoomUnit, 
    updateRoomUnit, 
    deleteRoomUnit,
    rooms,
    themeConfig,
    showToast
  } = useHotel();

  // Filter & Search states
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'vacant' | 'occupied' | 'reserved'>('all');

  // Modal States
  const [isAddFloorOpen, setIsAddFloorOpen] = useState<boolean>(false);
  const [newFloorName, setNewFloorName] = useState<string>('');

  const [isAddRoomOpen, setIsAddRoomOpen] = useState<boolean>(false);
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [roomFloor, setRoomFloor] = useState<string>(floors[0] || '1st Floor');
  const [roomType, setRoomType] = useState<RoomType>('deluxe');
  const [cleanStatus, setCleanStatus] = useState<RoomCleanlinessStatus>('clean');
  const [maintenanceNote, setMaintenanceNote] = useState<string>('');

  const [editingUnit, setEditingUnit] = useState<RoomOperationalUnit | null>(null);
  const [confirmDeleteFloor, setConfirmDeleteFloor] = useState<string | null>(null);
  const [confirmDeleteUnitId, setConfirmDeleteUnitId] = useState<string | null>(null);

  // Modal dismiss bindings
  useModalDismiss(isAddFloorOpen, () => setIsAddFloorOpen(false));
  useModalDismiss(isAddRoomOpen, () => setIsAddRoomOpen(false));
  useModalDismiss(Boolean(editingUnit), () => setEditingUnit(null));

  // Handle Add Floor
  const handleAddFloorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFloorName.trim()) {
      showToast('Validation Error', 'Please enter a floor name.', 'error');
      return;
    }
    const result = addFloor(newFloorName);
    if (result.success) {
      setNewFloorName('');
      setIsAddFloorOpen(false);
    }
  };

  // Handle Delete Floor
  const handleDeleteFloor = (floorName: string) => {
    if (confirmDeleteFloor !== floorName) {
      setConfirmDeleteFloor(floorName);
      setTimeout(() => setConfirmDeleteFloor((cur) => (cur === floorName ? null : cur)), 5000);
      return;
    }
    setConfirmDeleteFloor(null);
    deleteFloor(floorName);
  };

  // Handle Add Room Unit
  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      showToast('Validation Error', 'Room number is required.', 'error');
      return;
    }
    const result = addRoomUnit({
      roomNumber: roomNumber.trim(),
      floor: roomFloor,
      roomType,
      occupancyStatus: 'vacant',
      cleanStatus,
      maintenanceNote: maintenanceNote.trim() || undefined,
    });
    if (result.success) {
      setRoomNumber('');
      setMaintenanceNote('');
      setIsAddRoomOpen(false);
    }
  };

  // Handle Edit Room Unit
  const handleEditRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    updateRoomUnit(editingUnit.id, {
      floor: editingUnit.floor,
      roomType: editingUnit.roomType,
      cleanStatus: editingUnit.cleanStatus,
      maintenanceNote: editingUnit.maintenanceNote,
    });
    setEditingUnit(null);
  };

  // Handle Delete Room Unit
  const handleDeleteRoom = (unit: RoomOperationalUnit) => {
    if (unit.occupancyStatus === 'occupied') {
      showToast('Cannot Delete', `Room ${unit.roomNumber} is currently occupied by ${unit.currentGuestName || 'a guest'}.`, 'error');
      return;
    }
    if (confirmDeleteUnitId !== unit.id) {
      setConfirmDeleteUnitId(unit.id);
      setTimeout(() => setConfirmDeleteUnitId((cur) => (cur === unit.id ? null : cur)), 5000);
      return;
    }
    setConfirmDeleteUnitId(null);
    deleteRoomUnit(unit.id);
  };

  // Filtered rooms
  const filteredRooms = roomUnits.filter((u) => {
    const matchFloor = selectedFloorFilter === 'all' || u.floor.toLowerCase() === selectedFloorFilter.toLowerCase();
    const matchStatus = statusFilter === 'all' || u.occupancyStatus === statusFilter;
    const matchSearch = 
      searchQuery === '' ||
      u.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.floor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.roomType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.currentGuestName && u.currentGuestName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchFloor && matchStatus && matchSearch;
  });

  // Calculate statistics
  const totalRooms = roomUnits.length;
  const occupiedCount = roomUnits.filter(u => u.occupancyStatus === 'occupied').length;
  const cleanCount = roomUnits.filter(u => u.cleanStatus === 'clean' || u.cleanStatus === 'inspected').length;
  const dirtyCount = roomUnits.filter(u => u.cleanStatus === 'dirty' || u.cleanStatus === 'in_progress').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Metric Counters */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>Rooms & Floor Management</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Add, reconfigure, or delete physical rooms and floors with instant propagation to Reception, Housekeeping, and Waiter POS.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddFloorOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition cursor-pointer"
            >
              <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Add New Floor</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRoomFloor(floors[0] || '1st Floor');
                setIsAddRoomOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-700 hover:bg-amber-800 text-white shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Room Unit</span>
            </button>
          </div>
        </div>

        {/* Operational Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-stone-100 dark:border-stone-800 text-xs">
          <div className="p-3 bg-stone-50 dark:bg-stone-950/60 rounded-lg border border-stone-200 dark:border-stone-800">
            <span className="text-stone-500 font-mono text-[10px] uppercase">Total Floors</span>
            <div className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5">{floors.length} Floors</div>
          </div>
          <div className="p-3 bg-stone-50 dark:bg-stone-950/60 rounded-lg border border-stone-200 dark:border-stone-800">
            <span className="text-stone-500 font-mono text-[10px] uppercase">Physical Units</span>
            <div className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5">{totalRooms} Rooms</div>
          </div>
          <div className="p-3 bg-stone-50 dark:bg-stone-950/60 rounded-lg border border-stone-200 dark:border-stone-800">
            <span className="text-stone-500 font-mono text-[10px] uppercase">Occupancy</span>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0}% ({occupiedCount} Occupied)
            </div>
          </div>
          <div className="p-3 bg-stone-50 dark:bg-stone-950/60 rounded-lg border border-stone-200 dark:border-stone-800">
            <span className="text-stone-500 font-mono text-[10px] uppercase">Ready for Guests</span>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {cleanCount} Clean · {dirtyCount} Need Turnaround
            </div>
          </div>
        </div>
      </div>

      {/* Floors Overview Card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 font-mono flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600" />
            <span>Configured Floors ({floors.length})</span>
          </h3>
          <span className="text-xs text-stone-400">Click a floor badge to filter rooms below</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedFloorFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedFloorFilter === 'all'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            All Floors ({totalRooms})
          </button>

          {floors.map((floor) => {
            const count = roomUnits.filter((u) => u.floor.toLowerCase() === floor.toLowerCase()).length;
            const isSelected = selectedFloorFilter.toLowerCase() === floor.toLowerCase();

            return (
              <div 
                key={floor} 
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  isSelected 
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200' 
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedFloorFilter(isSelected ? 'all' : floor)}
                  className="font-semibold cursor-pointer text-left"
                >
                  {floor}
                  <span className="ml-1.5 text-[10px] font-mono text-stone-400">({count})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteFloor(floor)}
                  title={confirmDeleteFloor === floor ? `Click again to delete "${floor}"` : `Delete floor "${floor}"`}
                  className={`p-1 rounded transition cursor-pointer ml-1 text-[10px] font-bold ${
                    confirmDeleteFloor === floor
                      ? 'bg-rose-600 text-white px-2'
                      : 'text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60'
                  }`}
                >
                  {confirmDeleteFloor === floor ? 'Delete?' : <Trash2 className="w-3 h-3" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Room Inventory List with Search & Actions */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-sm overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by room #, floor, guest, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium cursor-pointer"
            >
              <option value="all">All Occupancy States</option>
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>
        </div>

        {/* Table of Room Units */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600 dark:text-stone-300">
            <thead className="bg-stone-100/75 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Room #</th>
                <th className="px-4 py-3">Floor</th>
                <th className="px-4 py-3">Category Type</th>
                <th className="px-4 py-3">Occupancy Status</th>
                <th className="px-4 py-3">Cleanliness State</th>
                <th className="px-4 py-3">Current Assignment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-400 font-mono">
                    No physical room units found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredRooms.map((unit) => {
                  const matchingCatalog = rooms.find((r) => r.type === unit.roomType);

                  return (
                    <tr key={unit.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-stone-900 dark:text-stone-100 text-sm">
                        {unit.roomNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-stone-700 dark:text-stone-300">
                        {unit.floor}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-stone-900 dark:text-stone-100">
                          {matchingCatalog?.name || unit.roomType.replace('-', ' ').toUpperCase()}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          ${matchingCatalog?.pricePerNightUSD || 65}/night
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {unit.occupancyStatus === 'occupied' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            Occupied
                          </span>
                        ) : unit.occupancyStatus === 'reserved' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Reserved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Vacant Ready
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          unit.cleanStatus === 'clean' || unit.cleanStatus === 'inspected'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : unit.cleanStatus === 'in_progress'
                            ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}>
                          {unit.cleanStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {unit.currentGuestName ? (
                          <div>
                            <div className="font-semibold text-stone-900 dark:text-stone-100">{unit.currentGuestName}</div>
                            <div className="text-[10px] text-stone-400 font-mono">Code: {unit.currentBookingCode || 'WALK-IN'}</div>
                          </div>
                        ) : unit.maintenanceNote ? (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                            {unit.maintenanceNote}
                          </span>
                        ) : (
                          <span className="text-stone-400 font-mono text-[11px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingUnit(unit)}
                            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition cursor-pointer"
                            title="Edit room configuration"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(unit)}
                            disabled={unit.occupancyStatus === 'occupied'}
                            className={`p-1.5 rounded transition cursor-pointer text-[10px] font-bold ${
                              unit.occupancyStatus === 'occupied'
                                ? 'opacity-30 cursor-not-allowed text-stone-400'
                                : confirmDeleteUnitId === unit.id
                                ? 'bg-rose-600 text-white px-2'
                                : 'hover:bg-rose-50 dark:hover:bg-rose-950/60 text-stone-500 hover:text-rose-600'
                            }`}
                            title={
                              unit.occupancyStatus === 'occupied'
                                ? 'Cannot delete occupied room'
                                : confirmDeleteUnitId === unit.id
                                ? `Click again to confirm removing Room ${unit.roomNumber}`
                                : 'Delete room unit'
                            }
                          >
                            {confirmDeleteUnitId === unit.id ? 'Confirm?' : <Trash2 className="w-3.5 h-3.5" />}
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

      {/* MODAL: ADD NEW FLOOR */}
      {isAddFloorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsAddFloorOpen(false)}
        >
          <div
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto p-5 shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Add New Floor</h3>
              </div>
              <ModalDismissButton onClose={() => setIsAddFloorOpen(false)} ariaLabel="Close Add Floor Modal" />
            </div>
            
            <p className="text-xs text-stone-500">
              Create a new physical floor level for room allocations and housekeeping matrix.
            </p>

            <form onSubmit={handleAddFloorSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Floor Name / Level Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5th Floor - Penthouse Level, Basement Spa Floor"
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddFloorOpen(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-amber-700 hover:bg-amber-800 text-white shadow transition cursor-pointer"
                >
                  Create Floor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ROOM UNIT */}
      {isAddRoomOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsAddRoomOpen(false)}
        >
          <div
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2.5">
              <div className="flex items-center gap-2">
                <DoorClosed className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Add Physical Room Unit</h3>
              </div>
              <ModalDismissButton onClose={() => setIsAddRoomOpen(false)} ariaLabel="Close Add Room Modal" />
            </div>

            <form onSubmit={handleAddRoomSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 501, 502, 105"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Floor Assignment
                  </label>
                  <select
                    value={roomFloor}
                    onChange={(e) => setRoomFloor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    {floors.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Room Category
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value as RoomType)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="deluxe">Deluxe Heritage Mountain View</option>
                    <option value="executive-suite">Executive Himalayan Suite</option>
                    <option value="super-deluxe">Super Deluxe Family Suite</option>
                    <option value="standard-cozy">Standard Cozy Room</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Initial Cleanliness
                  </label>
                  <select
                    value={cleanStatus}
                    onChange={(e) => setCleanStatus(e.target.value as RoomCleanlinessStatus)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="clean">Clean & Inspected</option>
                    <option value="dirty">Dirty (Turnaround Needed)</option>
                    <option value="out_of_order">Out of Order</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Maintenance / Key Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mountain balcony view, smart lock tested"
                  value={maintenanceNote}
                  onChange={(e) => setMaintenanceNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddRoomOpen(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-amber-700 hover:bg-amber-800 text-white shadow transition cursor-pointer"
                >
                  Register Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ROOM UNIT */}
      {editingUnit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setEditingUnit(null)}
        >
          <div
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Configure Room {editingUnit.roomNumber}
                </h3>
              </div>
              <ModalDismissButton onClose={() => setEditingUnit(null)} ariaLabel="Close Configure Room Modal" />
            </div>

            <form onSubmit={handleEditRoomSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Floor Assignment
                  </label>
                  <select
                    value={editingUnit.floor}
                    onChange={(e) => setEditingUnit({ ...editingUnit, floor: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 cursor-pointer"
                  >
                    {floors.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Room Category
                  </label>
                  <select
                    value={editingUnit.roomType}
                    onChange={(e) => setEditingUnit({ ...editingUnit, roomType: e.target.value as RoomType })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 cursor-pointer"
                  >
                    <option value="deluxe">Deluxe Heritage Mountain View</option>
                    <option value="executive-suite">Executive Himalayan Suite</option>
                    <option value="super-deluxe">Super Deluxe Family Suite</option>
                    <option value="standard-cozy">Standard Cozy Room</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Cleanliness Status
                </label>
                <select
                  value={editingUnit.cleanStatus}
                  onChange={(e) => setEditingUnit({ ...editingUnit, cleanStatus: e.target.value as RoomCleanlinessStatus })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 cursor-pointer"
                >
                  <option value="clean">Clean</option>
                  <option value="inspected">Inspected & Verified</option>
                  <option value="dirty">Dirty</option>
                  <option value="in_progress">Cleaning In Progress</option>
                  <option value="out_of_order">Out of Order</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Maintenance / Housekeeping Notes
                </label>
                <input
                  type="text"
                  value={editingUnit.maintenanceNote || ''}
                  onChange={(e) => setEditingUnit({ ...editingUnit, maintenanceNote: e.target.value })}
                  placeholder="Notes for housekeeping or front desk"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-amber-700 hover:bg-amber-800 text-white shadow transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
