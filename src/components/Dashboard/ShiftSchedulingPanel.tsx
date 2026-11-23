import React, { useMemo, useState } from 'react';
import {
  CalendarClock,
  Clock,
  LogIn,
  LogOut,
  Coffee,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import {
  HotelDepartment,
  ShiftAttendanceStatus,
  ShiftType,
  StaffAvailabilityEntry,
  StaffRole,
} from '../../types/hotel';

const DEPARTMENTS: HotelDepartment[] = [
  'Reception & Front Desk',
  'Housekeeping & Laundry',
  'Kitchen & Culinary',
  'Restaurant & Banquet',
  'Management & Admin',
];

const SHIFT_META: Record<ShiftType, { label: string; hours: string; code: string }> = {
  morning: { label: 'Morning Shift', hours: '06:00 – 14:00', code: 'M' },
  evening: { label: 'Evening Shift', hours: '14:00 – 22:00', code: 'E' },
  night: { label: 'Night Shift', hours: '22:00 – 06:00', code: 'N' },
};

function getDateISO(daysOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDayShort(iso: string): string {
  const todayIso = getDateISO(0);
  const tomorrowIso = getDateISO(1);
  if (iso === todayIso) return 'Today';
  if (iso === tomorrowIso) return 'Tomorrow';
  const dt = new Date(iso + 'T12:00:00');
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function inferDepartmentFromRole(role: StaffRole, deptText: string): HotelDepartment {
  const lower = deptText.toLowerCase();
  if (role === 'receptionist' || lower.includes('front office') || lower.includes('reception')) {
    return 'Reception & Front Desk';
  }
  if (role === 'housekeeping' || lower.includes('housekeeping') || lower.includes('laundry')) {
    return 'Housekeeping & Laundry';
  }
  if (role === 'chef' || lower.includes('culinary') || lower.includes('kitchen')) {
    return 'Kitchen & Culinary';
  }
  if (role === 'waiter' || role === 'restaurant_owner' || lower.includes('restaurant') || lower.includes('dining')) {
    return 'Restaurant & Banquet';
  }
  return 'Management & Admin';
}

const ATTENDANCE_STYLES: Record<
  ShiftAttendanceStatus,
  { label: string; textClass: string }
> = {
  clocked_in: {
    label: 'Clocked In',
    textClass: 'text-emerald-700 dark:text-emerald-400 font-semibold',
  },
  scheduled: {
    label: 'Scheduled',
    textClass: 'text-sky-700 dark:text-sky-400 font-semibold',
  },
  on_break: {
    label: 'On Break',
    textClass: 'text-amber-700 dark:text-amber-400 font-semibold',
  },
  clocked_out: {
    label: 'Clocked Out',
    textClass: 'text-stone-500 dark:text-stone-400 font-medium',
  },
  on_leave: {
    label: 'On Leave',
    textClass: 'text-rose-700 dark:text-rose-400 font-semibold',
  },
};

export const ShiftSchedulingPanel: React.FC = () => {
  const {
    staff,
    staffShifts,
    staffAvailability,
    assignStaffShift,
    clockStaffAction,
    removeStaffShift,
    updateStaffAvailability,
  } = useHotel();

  const [viewMode, setViewMode] = useState<'daily_roster' | 'availability_matrix'>('daily_roster');
  const [selectedDate, setSelectedDate] = useState<string>(getDateISO(0));
  const [deptFilter, setDeptFilter] = useState<HotelDepartment | 'All'>('All');

  // Assign Shift Composer State
  const [isComposerOpen, setIsComposerOpen] = useState<boolean>(false);
  const [formStaffId, setFormStaffId] = useState<string>(staff[0]?.id || '');
  const [formDepartment, setFormDepartment] = useState<HotelDepartment>('Reception & Front Desk');
  const [formDate, setFormDate] = useState<string>(getDateISO(0));
  const [formSlot, setFormSlot] = useState<ShiftType>('morning');
  const [formStation, setFormStation] = useState<string>('Front Desk Check-In & Folios');
  const [formNotes, setFormNotes] = useState<string>('');

  const upcoming7Days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => getDateISO(i)),
    []
  );

  const metrics = useMemo(() => {
    const todayIso = getDateISO(0);
    const todayShifts = staffShifts.filter((s) => s.date === todayIso);
    const clockedInNow = todayShifts.filter((s) => s.attendanceStatus === 'clocked_in').length;
    const onBreakNow = todayShifts.filter((s) => s.attendanceStatus === 'on_break').length;
    const receptionCount = todayShifts.filter(
      (s) => s.department === 'Reception & Front Desk'
    ).length;
    const housekeepingCount = todayShifts.filter(
      (s) => s.department === 'Housekeeping & Laundry'
    ).length;

    return {
      clockedInNow,
      onBreakNow,
      scheduledToday: todayShifts.length,
      receptionCount,
      housekeepingCount,
    };
  }, [staffShifts]);

  const filteredRoster = useMemo(() => {
    return staffShifts
      .filter((s) => s.date === selectedDate)
      .filter((s) => deptFilter === 'All' || s.department === deptFilter)
      .sort((a, b) => a.shiftSlot.localeCompare(b.shiftSlot));
  }, [staffShifts, selectedDate, deptFilter]);

  const filteredStaffForMatrix = useMemo(() => {
    return staff.filter((member) => {
      if (deptFilter === 'All') return true;
      return inferDepartmentFromRole(member.role, member.department) === deptFilter;
    });
  }, [staff, deptFilter]);

  const handleStaffSelectChange = (newStaffId: string) => {
    setFormStaffId(newStaffId);
    const member = staff.find((s) => s.id === newStaffId);
    if (member) {
      const inferredDept = inferDepartmentFromRole(member.role, member.department);
      setFormDepartment(inferredDept);
      if (inferredDept === 'Reception & Front Desk') {
        setFormStation('Main Check-In Desk & Folios');
      } else if (inferredDept === 'Housekeeping & Laundry') {
        setFormStation('1st–3rd Floor Rooms & Inspection');
      } else if (inferredDept === 'Kitchen & Culinary') {
        setFormStation('Main Kitchen Line & KDS');
      } else if (inferredDept === 'Restaurant & Banquet') {
        setFormStation('Ground-Floor Dining & Room Service');
      } else {
        setFormStation('Operations & Duty Management');
      }
    }
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStaffId) return;
    assignStaffShift({
      staffId: formStaffId,
      department: formDepartment,
      date: formDate,
      shiftSlot: formSlot,
      assignedStation: formStation,
      notes: formNotes.trim() || undefined,
    });
    setSelectedDate(formDate);
    setFormNotes('');
    setIsComposerOpen(false);
  };

  const cycleAvailability = (staffId: string, date: string, current?: StaffAvailabilityEntry['availability']) => {
    const order: StaffAvailabilityEntry['availability'][] = [
      'available',
      'preferred_morning',
      'preferred_evening',
      'unavailable',
    ];
    const currentIdx = current ? order.indexOf(current) : -1;
    const next = order[(currentIdx + 1) % order.length];
    updateStaffAvailability(staffId, date, next);
  };

  return (
    <section
      aria-label="Department Shift Scheduling and Attendance"
      className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50">
              Shift Scheduling, Clock-Ins &amp; Department Availability
            </h3>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Assign daily operational roles, track real-time staff clock-in/out attendance, and inspect 7-day availability across Housekeeping, Reception, and Dining.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Shift scheduling view mode"
            className="inline-flex items-center rounded-lg bg-stone-100 dark:bg-stone-800 p-1 border border-stone-200 dark:border-stone-700"
          >
            <button
              type="button"
              onClick={() => setViewMode('daily_roster')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'daily_roster'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Daily Roster &amp; Clock-Ins
            </button>
            <button
              type="button"
              onClick={() => setViewMode('availability_matrix')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'availability_matrix'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              7-Day Availability
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormDate(selectedDate);
              setIsComposerOpen(!isComposerOpen);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isComposerOpen ? 'Close Assigner' : 'Assign Daily Shift'}</span>
          </button>
        </div>
      </div>

      {/* Flat Metric Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-5 border-b border-stone-200 dark:border-stone-800 tabular-nums text-xs">
        <div>
          <div className="text-stone-500 dark:text-stone-400 font-medium">Active Clocked-In Staff</div>
          <div className="mt-1 text-2xl font-sans font-semibold tracking-tight tabular-nums text-emerald-700 dark:text-emerald-400">
            {metrics.clockedInNow}
            <span className="text-xs font-sans font-normal text-stone-500 ml-1.5">
              / {metrics.scheduledToday} scheduled today
            </span>
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400">
            {metrics.onBreakNow > 0 ? `${metrics.onBreakNow} currently on break` : 'Live attendance tracking'}
          </div>
        </div>

        <div>
          <div className="text-stone-500 dark:text-stone-400 font-medium">Reception &amp; Front Desk</div>
          <div className="mt-1 text-2xl font-sans font-semibold tracking-tight tabular-nums text-stone-900 dark:text-stone-50">
            {metrics.receptionCount}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400">
            Assigned today across shifts
          </div>
        </div>

        <div>
          <div className="text-stone-500 dark:text-stone-400 font-medium">Housekeeping &amp; Laundry</div>
          <div className="mt-1 text-2xl font-sans font-semibold tracking-tight tabular-nums text-stone-900 dark:text-stone-50">
            {metrics.housekeepingCount}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400">
            Floor turnaround coverage
          </div>
        </div>

        <div>
          <div className="text-stone-500 dark:text-stone-400 font-medium">Registered Staff Pool</div>
          <div className="mt-1 text-2xl font-sans font-semibold tracking-tight tabular-nums text-stone-900 dark:text-stone-50">
            {staff.filter((s) => s.status === 'active').length}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400">
            Active across {DEPARTMENTS.length} departments
          </div>
        </div>
      </div>

      {/* Department Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setDeptFilter('All')}
            className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              deptFilter === 'All'
                ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            All Departments
          </button>
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setDeptFilter(dept)}
              className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                deptFilter === dept
                  ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {viewMode === 'daily_roster' && (
          <div className="flex items-center gap-2 shrink-0 text-xs">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 rounded-md border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
            />
          </div>
        )}
      </div>

      {/* Inline Daily Shift Assignment Composer */}
      {isComposerOpen && (
        <form
          onSubmit={handleAssignSubmit}
          className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/70 bg-amber-50/40 dark:bg-amber-950/20 space-y-4 text-xs"
        >
          <div className="font-semibold text-sm text-stone-900 dark:text-stone-100">
            Assign Daily Staff Role &amp; Station
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Staff Member *
              </label>
              <select
                value={formStaffId}
                onChange={(e) => handleStaffSelectChange(e.target.value)}
                required
                className="w-full px-2.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              >
                {staff.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Department *
              </label>
              <select
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value as HotelDepartment)}
                className="w-full px-2.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Shift Date *
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
                className="w-full px-2.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Shift Slot *
              </label>
              <select
                value={formSlot}
                onChange={(e) => setFormSlot(e.target.value as ShiftType)}
                className="w-full px-2.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              >
                <option value="morning">Morning (06:00 – 14:00)</option>
                <option value="evening">Evening (14:00 – 22:00)</option>
                <option value="night">Night (22:00 – 06:00)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                Assigned Daily Station *
              </label>
              <input
                type="text"
                value={formStation}
                onChange={(e) => setFormStation(e.target.value)}
                placeholder="e.g. Check-In Desk A"
                required
                className="w-full px-2.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Optional briefing note (e.g. VIP check-in at 14:30 or Floor 2 deep clean)"
              className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 font-semibold text-stone-700 dark:text-stone-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save Shift Assignment</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* VIEW 1: DAILY ROSTER & CLOCK-INS */}
      {viewMode === 'daily_roster' && (
        <div className="space-y-4">
          {/* Quick Day Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {upcoming7Days.map((iso) => (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(iso)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedDate === iso
                    ? 'bg-amber-700 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {formatDayShort(iso)}
              </button>
            ))}
          </div>

          {filteredRoster.length === 0 ? (
            <div className="p-8 text-center rounded-lg border border-dashed border-stone-300 dark:border-stone-700 space-y-2 text-xs">
              <Users className="w-6 h-6 text-stone-400 mx-auto" />
              <div className="font-semibold text-stone-700 dark:text-stone-200">
                No shifts scheduled for {formatDayShort(selectedDate)}
                {deptFilter !== 'All' ? ` in ${deptFilter}` : ''}.
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormDate(selectedDate);
                  if (deptFilter !== 'All') setFormDepartment(deptFilter);
                  setIsComposerOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold cursor-pointer"
              >
                Assign Shift for This Day
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Staff &amp; Role</th>
                    <th className="py-2.5 px-3 font-semibold">Department</th>
                    <th className="py-2.5 px-3 font-semibold">Shift Window</th>
                    <th className="py-2.5 px-3 font-semibold">Assigned Daily Station</th>
                    <th className="py-2.5 px-3 font-semibold">Clock Log</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Attendance Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {filteredRoster.map((shift) => {
                    const attMeta = ATTENDANCE_STYLES[shift.attendanceStatus];
                    const shiftInfo = SHIFT_META[shift.shiftSlot];
                    return (
                      <tr key={shift.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/30">
                        <td className="py-3 px-3 align-top">
                          <div className="font-semibold text-stone-900 dark:text-stone-100">
                            {shift.staffName}
                          </div>
                          <div className="text-[11px] text-stone-500 capitalize">
                            {shift.staffRole.replace('_', ' ')}
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top text-stone-700 dark:text-stone-300">
                          {shift.department}
                        </td>

                        <td className="py-3 px-3 align-top tabular-nums">
                          <div className="font-medium text-stone-900 dark:text-stone-100">
                            {shiftInfo.label}
                          </div>
                          <div className="text-[11px] font-mono text-stone-500">
                            {shiftInfo.hours}
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top">
                          <div className="font-medium text-stone-800 dark:text-stone-200">
                            {shift.assignedStation}
                          </div>
                          {shift.notes && (
                            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                              {shift.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 align-top tabular-nums">
                          <div className={attMeta.textClass}>{attMeta.label}</div>
                          <div className="text-[11px] font-mono text-stone-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {shift.clockInTime ? `In ${shift.clockInTime}` : 'Not clocked in'}
                              {shift.clockOutTime ? ` · Out ${shift.clockOutTime}` : ''}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top text-right">
                          <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                            {(shift.attendanceStatus === 'scheduled' ||
                              shift.attendanceStatus === 'clocked_out') && (
                              <button
                                type="button"
                                onClick={() => clockStaffAction(shift.id, 'clock_in')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                              >
                                <LogIn className="w-3 h-3" />
                                <span>Clock In</span>
                              </button>
                            )}

                            {shift.attendanceStatus === 'clocked_in' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => clockStaffAction(shift.id, 'break')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 cursor-pointer"
                                >
                                  <Coffee className="w-3 h-3" />
                                  <span>Break</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => clockStaffAction(shift.id, 'clock_out')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 cursor-pointer"
                                >
                                  <LogOut className="w-3 h-3" />
                                  <span>Clock Out</span>
                                </button>
                              </>
                            )}

                            {shift.attendanceStatus === 'on_break' && (
                              <button
                                type="button"
                                onClick={() => clockStaffAction(shift.id, 'resume')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                              >
                                <LogIn className="w-3 h-3" />
                                <span>Resume</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => removeStaffShift(shift.id)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 cursor-pointer"
                              aria-label={`Remove shift for ${shift.staffName}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: UPCOMING 7-DAY DEPARTMENT AVAILABILITY MATRIX */}
      {viewMode === 'availability_matrix' && (
        <div className="space-y-3">
          <div className="text-xs text-stone-500 dark:text-stone-400 flex flex-wrap items-center justify-between gap-2">
            <span>
              Click any date cell to cycle staff availability (Available / Prefer Morning / Prefer Evening / Day Off) or click Assign to schedule that day.
            </span>
            <span className="font-mono text-[11px]">
              Shift Codes: M = Morning · E = Evening · N = Night
            </span>
          </div>

          <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="py-2.5 px-3 font-semibold min-w-[180px]">Staff Member</th>
                  {upcoming7Days.map((iso) => (
                    <th key={iso} className="py-2.5 px-2 font-semibold text-center min-w-[115px] tabular-nums">
                      <div>{formatDayShort(iso)}</div>
                      <div className="text-[10px] font-mono font-normal opacity-75">{iso.slice(5)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {filteredStaffForMatrix.map((member) => {
                  const dept = inferDepartmentFromRole(member.role, member.department);
                  return (
                    <tr key={member.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/20">
                      <td className="py-3 px-3 align-top">
                        <div className="font-semibold text-stone-900 dark:text-stone-100">
                          {member.name}
                        </div>
                        <div className="text-[11px] text-stone-500">{dept}</div>
                      </td>

                      {upcoming7Days.map((iso) => {
                        const dayShifts = staffShifts.filter(
                          (s) => s.staffId === member.id && s.date === iso
                        );
                        const availRecord = staffAvailability.find(
                          (a) => a.staffId === member.id && a.date === iso
                        );
                        const avail = availRecord?.availability || 'available';

                        const availDisplay =
                          avail === 'unavailable'
                            ? { text: 'Day Off', cls: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' }
                            : avail === 'preferred_morning'
                            ? { text: 'Pref. AM', cls: 'bg-amber-50 dark:bg-amber-950/35 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' }
                            : avail === 'preferred_evening'
                            ? { text: 'Pref. PM', cls: 'bg-sky-50 dark:bg-sky-950/35 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800' }
                            : { text: 'Available', cls: 'bg-emerald-50 dark:bg-emerald-950/35 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };

                        return (
                          <td key={iso} className="py-2.5 px-2 align-top text-center">
                            <div className="space-y-1">
                              {dayShifts.length > 0 ? (
                                <div className="space-y-1">
                                  {dayShifts.map((ds) => (
                                    <div
                                      key={ds.id}
                                      className="px-2 py-1 rounded bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-[10px] font-semibold truncate"
                                      title={`${SHIFT_META[ds.shiftSlot].label} · ${ds.assignedStation}`}
                                    >
                                      {SHIFT_META[ds.shiftSlot].code} · {ds.assignedStation}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => cycleAvailability(member.id, iso, avail)}
                                  className={`w-full px-2 py-1 rounded border text-[11px] font-medium cursor-pointer transition-colors ${availDisplay.cls}`}
                                  title="Click to cycle availability"
                                >
                                  {availDisplay.text}
                                </button>
                              )}

                              {avail !== 'unavailable' && dayShifts.length === 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleStaffSelectChange(member.id);
                                    setFormDate(iso);
                                    setSelectedDate(iso);
                                    setFormSlot(avail === 'preferred_evening' ? 'evening' : 'morning');
                                    setIsComposerOpen(true);
                                    setViewMode('daily_roster');
                                  }}
                                  className="text-[10px] text-stone-500 hover:text-amber-700 dark:hover:text-amber-400 underline cursor-pointer"
                                >
                                  + Schedule
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
