import React, { useMemo, useState } from 'react';
import { AlarmClock, BellRing, Check, CheckCircle2, Coffee, PhoneCall, XCircle } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { WakeUpCallRequest } from '../../types/hotel';

interface WakeUpCallFrontDeskPanelProps {
  compact?: boolean;
}

export const WakeUpCallFrontDeskPanel: React.FC<WakeUpCallFrontDeskPanelProps> = ({ compact = false }) => {
  const { wakeUpCalls, updateWakeUpCallStatus } = useHotel();
  const [filterStatus, setFilterStatus] = useState<'active' | 'completed' | 'all'>('active');

  const counts = useMemo(() => {
    const active = wakeUpCalls.filter(
      (w) => w.status === 'scheduled' || w.status === 'alerted' || w.status === 'acknowledged'
    ).length;
    const unacknowledged = wakeUpCalls.filter(
      (w) => w.status === 'scheduled' || w.status === 'alerted'
    ).length;
    const completed = wakeUpCalls.filter((w) => w.status === 'completed').length;
    return { active, unacknowledged, completed };
  }, [wakeUpCalls]);

  const filteredCalls = useMemo(() => {
    return wakeUpCalls.filter((w) => {
      if (filterStatus === 'active') {
        return w.status === 'scheduled' || w.status === 'alerted' || w.status === 'acknowledged';
      }
      if (filterStatus === 'completed') {
        return w.status === 'completed' || w.status === 'cancelled';
      }
      return true;
    });
  }, [wakeUpCalls, filterStatus]);

  const displayedCalls = compact ? filteredCalls.slice(0, 4) : filteredCalls;

  const formatDelivery = (call: WakeUpCallRequest) => {
    if (call.deliveryMethod === 'both') return 'Phone + Knock';
    if (call.deliveryMethod === 'in_person_knock') return 'Door Knock';
    return 'Phone Ring';
  };

  return (
    <section className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <AlarmClock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-50">
              Front Desk Wake-Up Call Queue &amp; Alerts
            </h3>
            {counts.unacknowledged > 0 && (
              <span className="font-mono text-[11px] font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                ({counts.unacknowledged} New Alert{counts.unacknowledged > 1 ? 's' : ''})
              </span>
            )}
          </div>
          <p className="text-stone-500 dark:text-stone-400">
            Live wake-up call requests submitted from rooms in the In-Room Guest Portal.
          </p>
        </div>

        <div className="inline-flex items-center p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 self-start">
          {(
            [
              { id: 'active', label: `Active (${counts.active})` },
              { id: 'completed', label: `History (${counts.completed})` },
              { id: 'all', label: 'All' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {displayedCalls.length === 0 ? (
        <div className="p-6 text-center rounded-lg border border-dashed border-stone-300 dark:border-stone-700 text-stone-500">
          No wake-up call requests in this view.
        </div>
      ) : (
        <div className="divide-y divide-stone-200 dark:divide-stone-800">
          {displayedCalls.map((call) => {
            const isActionable = call.status === 'scheduled' || call.status === 'alerted' || call.status === 'acknowledged';
            return (
              <div
                key={call.id}
                className="py-3 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-stone-900 dark:text-stone-50 tabular-nums">
                      {call.wakeUpTime}
                    </span>
                    <span className="font-mono text-stone-500 tabular-nums">{call.wakeUpDate}</span>
                    <span aria-hidden="true" className="text-stone-400">·</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      {call.roomNumber} — {call.guestName}
                    </span>
                    <span aria-hidden="true" className="text-stone-400">·</span>
                    <span className="font-mono text-[11px] text-stone-500">{call.requestCode}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                    <span className="inline-flex items-center gap-1">
                      <PhoneCall className="w-3 h-3" />
                      {formatDelivery(call)}
                    </span>
                    {call.repeatDaily && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">Daily Repeat</span>
                      </>
                    )}
                    {call.beveragePreference && call.beveragePreference !== 'None' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-stone-700 dark:text-stone-300">
                          <Coffee className="w-3 h-3 text-amber-600" />
                          {call.beveragePreference}
                        </span>
                      </>
                    )}
                    {call.notes && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{call.notes}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span
                    className={`font-semibold text-[11px] ${
                      call.status === 'completed' || call.status === 'acknowledged'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : call.status === 'alerted'
                        ? 'text-rose-700 dark:text-rose-400'
                        : call.status === 'cancelled'
                        ? 'text-stone-500'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {call.status === 'scheduled' && 'Awaiting Ack'}
                    {call.status === 'alerted' && 'Wake-Up Due Alert'}
                    {call.status === 'acknowledged' && `Ack: ${call.acknowledgedBy || 'Front Desk'}`}
                    {call.status === 'completed' && `Done (${call.completedAt || ''})`}
                    {call.status === 'cancelled' && 'Cancelled'}
                  </span>

                  {isActionable && (
                    <>
                      {call.status === 'scheduled' && (
                        <button
                          type="button"
                          onClick={() => updateWakeUpCallStatus(call.id, 'acknowledged')}
                          className="px-2.5 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Acknowledge</span>
                        </button>
                      )}

                      {call.status !== 'alerted' && (
                        <button
                          type="button"
                          onClick={() => updateWakeUpCallStatus(call.id, 'alerted')}
                          className="px-2.5 py-1.5 rounded-md border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                          title="Broadcast due-now front desk chime alert"
                        >
                          <BellRing className="w-3.5 h-3.5" />
                          <span>Ring Alert</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => updateWakeUpCallStatus(call.id, 'completed')}
                        className="px-2.5 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Called</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateWakeUpCallStatus(call.id, 'cancelled')}
                        className="p-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-400 hover:text-rose-600 cursor-pointer"
                        title="Cancel Wake-Up Call"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
