import React, { useMemo, useState } from 'react';
import {
  Zap,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  ArrowRight,
  Play,
  CheckCheck,
  UserCheck,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { ExpressTurnoverPriority } from '../../types/hotel';
import { RoomHeatmapWidget } from './RoomHeatmapWidget';

const PRIORITY_META: Record<
  ExpressTurnoverPriority,
  { label: string; textClass: string }
> = {
  rush_vip: {
    label: 'Rush VIP (< 30m)',
    textClass: 'text-rose-700 dark:text-rose-400',
  },
  same_day_arrival: {
    label: 'Same-Day Arrival',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
  standard: {
    label: 'Standard Turnover',
    textClass: 'text-stone-600 dark:text-stone-400',
  },
};

function getDefaultTargetTime(): string {
  const d = new Date(Date.now() + 30 * 60000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const ExpressTurnoverPanel: React.FC = () => {
  const {
    expressTurnovers,
    triggerExpressTurnover,
    toggleExpressTurnoverStep,
    completeExpressTurnoverJob,
    roomUnits,
    staff,
    showToast,
  } = useHotel();

  const sortedUnits = useMemo(
    () => [...roomUnits].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })),
    [roomUnits]
  );

  // Pick a dirty/in-progress room by default if available
  const defaultUnit = useMemo(
    () =>
      sortedUnits.find((u) => u.cleanStatus === 'dirty' || u.cleanStatus === 'in_progress') ||
      sortedUnits[0],
    [sortedUnits]
  );

  const housekeepingStaff = useMemo(() => {
    const hk = staff.filter((s) => s.role === 'housekeeping');
    return hk.length > 0 ? hk : staff;
  }, [staff]);

  const [selectedUnitId, setSelectedUnitId] = useState<string>(defaultUnit?.id || '');
  const [priority, setPriority] = useState<ExpressTurnoverPriority>('rush_vip');
  const [assignedHousekeeper, setAssignedHousekeeper] = useState<string>(
    housekeepingStaff[0]?.name || 'Sunita Magar'
  );
  const [targetReadyTime, setTargetReadyTime] = useState<string>(getDefaultTargetTime);
  const [notes, setNotes] = useState<string>('');
  const [queueFilter, setQueueFilter] = useState<'active' | 'completed' | 'all'>('active');

  const effectiveUnitId = selectedUnitId || defaultUnit?.id || '';

  const kpis = useMemo(() => {
    const activeJobs = expressTurnovers.filter((j) => j.status !== 'completed');
    const completedJobs = expressTurnovers.filter((j) => j.status === 'completed');
    const rushActive = activeJobs.filter((j) => j.priority === 'rush_vip').length;
    const readyUnitsCount = roomUnits.filter(
      (u) => u.occupancyStatus === 'vacant' && u.cleanStatus === 'inspected' && !u.maintenanceNote
    ).length;

    const totalSteps = expressTurnovers.reduce((acc, j) => acc + j.steps.length, 0);
    const doneSteps = expressTurnovers.reduce(
      (acc, j) => acc + j.steps.filter((s) => s.completed).length,
      0
    );

    return {
      activeCount: activeJobs.length,
      completedCount: completedJobs.length,
      rushActive,
      readyUnitsCount,
      doneSteps,
      totalSteps,
    };
  }, [expressTurnovers, roomUnits]);

  const filteredJobs = useMemo(() => {
    return expressTurnovers.filter((job) => {
      if (queueFilter === 'active') return job.status !== 'completed';
      if (queueFilter === 'completed') return job.status === 'completed';
      return true;
    });
  }, [expressTurnovers, queueFilter]);

  const handleTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUnitId) {
      showToast('No Room Selected', 'Choose a room unit to launch an express turnover.', 'warning');
      return;
    }

    const created = triggerExpressTurnover({
      unitId: effectiveUnitId,
      priority,
      assignedHousekeeper: assignedHousekeeper.trim() || 'Housekeeping Team',
      targetReadyTime: targetReadyTime || getDefaultTargetTime(),
      notes: notes.trim() || undefined,
    });

    if (created) {
      setNotes('');
      setQueueFilter('active');
    }
  };

  const handleCompleteNextStep = (jobId: string) => {
    const job = expressTurnovers.find((j) => j.id === jobId);
    if (!job) return;
    const nextStep = [...job.steps]
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .find((s) => !s.completed);
    if (nextStep) {
      toggleExpressTurnoverStep(job.id, nextStep.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            Express Room Turnover Workflow
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Dispatch a sequenced 6-step housekeeping workflow. Completing the final QA inspection item automatically flips the room to{' '}
            <strong className="text-emerald-700 dark:text-emerald-400">Ready for Guest</strong> on the live occupancy heatmap.
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4">
          <div className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold">
            Active Turnovers
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {kpis.activeCount}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
            {kpis.rushActive} Rush VIP priority
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold">
            Checklist Progress
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {kpis.doneSteps} / {kpis.totalSteps}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Steps signed off across jobs
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4">
          <div className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
            Ready for Guest
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {kpis.readyUnitsCount}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Inspected &amp; live on heatmap
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold">
            Completed Jobs
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {kpis.completedCount}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            QA cleared today
          </div>
        </div>
      </div>

      {/* Main Grid: Trigger Form (Left) + Sequenced Checklist Queue (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Dispatch New Turnover */}
        <form
          onSubmit={handleTrigger}
          className="xl:col-span-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-50">
                Trigger Express Turnover
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Assigns room to Cleaning and queues 6 ordered steps.
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Select Room Unit *
              </label>
              <select
                value={effectiveUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                {sortedUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    Room {u.roomNumber} · {u.floor} ({u.cleanStatus.replace('_', ' ')} / {u.occupancyStatus})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Priority Tier
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ExpressTurnoverPriority)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  <option value="rush_vip">Rush VIP (&lt; 30m)</option>
                  <option value="same_day_arrival">Same-Day Arrival</option>
                  <option value="standard">Standard Turnover</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Target Ready Time
                </label>
                <input
                  type="time"
                  value={targetReadyTime}
                  onChange={(e) => setTargetReadyTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Assigned Housekeeper
              </label>
              <input
                type="text"
                list="kamal-hk-staff"
                value={assignedHousekeeper}
                onChange={(e) => setAssignedHousekeeper(e.target.value)}
                placeholder="Housekeeper name"
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
              <datalist id="kamal-hk-staff">
                {housekeepingStaff.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Special Arrival Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Honeymoon setup, extra hypoallergenic pillows, welcome tea..."
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            Launch 6-Step Express Turnover
          </button>
        </form>

        {/* Right: Active Workflow Queue */}
        <div className="xl:col-span-8 space-y-4">
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-50">
                Housekeeping Sequenced Queue
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Check off tasks sequentially or use Complete Next Step.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
              {(['active', 'completed', 'all'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setQueueFilter(tab)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    queueFilter === tab
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  {tab === 'active'
                    ? `Active (${kpis.activeCount})`
                    : tab === 'completed'
                    ? `Completed (${kpis.completedCount})`
                    : `All (${expressTurnovers.length})`}
                </button>
              ))}
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-10 text-center text-xs text-stone-500 dark:text-stone-400">
              No express turnover jobs in this view. Trigger a room turnover from the dispatch panel on the left.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => {
                const orderedSteps = [...job.steps].sort((a, b) => a.stepOrder - b.stepOrder);
                const doneCount = orderedSteps.filter((s) => s.completed).length;
                const progressPct = orderedSteps.length > 0 ? Math.round((doneCount / orderedSteps.length) * 100) : 0;
                const isDone = job.status === 'completed';
                const priorityInfo = PRIORITY_META[job.priority];

                return (
                  <div
                    key={job.id}
                    className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4"
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className="font-mono font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                            {job.jobCode}
                          </span>
                          <span className="text-stone-300 dark:text-stone-700">·</span>
                          <span className="font-semibold text-stone-900 dark:text-stone-50">
                            Room {job.roomNumber} ({job.floor})
                          </span>
                          <span className="text-stone-300 dark:text-stone-700">·</span>
                          <span className={`font-semibold ${priorityInfo.textClass}`}>
                            {priorityInfo.label}
                          </span>
                        </div>

                        <div className="text-xs text-stone-500 dark:text-stone-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="inline-flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                            {job.assignedHousekeeper}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            Target {job.targetReadyTime}
                          </span>
                          {job.notes && (
                            <>
                              <span>·</span>
                              <span className="italic">{job.notes}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            Ready for Guest
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCompleteNextStep(job.id)}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Complete Next Step
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => completeExpressTurnoverJob(job.id)}
                              className="px-3 py-1.5 rounded-lg border border-emerald-600 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              Finish All &amp; Mark Ready
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 dark:text-stone-400 tabular-nums">
                        <span>Sequence Completion</span>
                        <span>
                          {doneCount} / {orderedSteps.length} steps ({progressPct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isDone ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* 6-Step Ordered Sequence */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {orderedSteps.map((step) => (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => toggleExpressTurnoverStep(job.id, step.id)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                            step.completed
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/70 text-stone-900 dark:text-stone-100'
                              : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700/80 text-stone-700 dark:text-stone-300 hover:border-amber-400 dark:hover:border-amber-600'
                          }`}
                        >
                          {step.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium leading-snug">
                              <span className="font-mono text-[11px] text-stone-400 mr-1.5 tabular-nums">
                                0{step.stepOrder}
                              </span>
                              <span className={step.completed ? 'line-through text-stone-500 dark:text-stone-400' : ''}>
                                {step.label}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Live Room Heatmap synced directly with Express Turnover completion */}
      <div className="pt-2">
        <RoomHeatmapWidget />
      </div>
    </div>
  );
};
