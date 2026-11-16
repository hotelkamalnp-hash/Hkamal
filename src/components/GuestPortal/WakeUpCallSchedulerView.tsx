import React, { useState, useMemo } from 'react';
import { AlarmClock, BellRing, Calendar, CheckCircle2, Clock, Coffee, PhoneCall, XCircle } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { GuestRoomSession, WakeUpCallRequest, WakeUpDeliveryMethod } from '../../types/hotel';
import { getThemeClasses } from '../../utils/theme';

interface WakeUpCallSchedulerViewProps {
  session: GuestRoomSession;
}

const PRESET_TIMES = [
  { label: '05:30 AM · Sunrise View', value: '05:30' },
  { label: '06:00 AM · Early Trek', value: '06:00' },
  { label: '06:30 AM · Breakfast Prep', value: '06:30' },
  { label: '07:00 AM · City Tour', value: '07:00' },
  { label: '08:00 AM · Standard Morning', value: '08:00' },
];

const BEVERAGE_OPTIONS = [
  'None',
  'Complimentary Masala Chai',
  'Black Himalayan Coffee',
  'Warm Lemon & Ginger Water',
  'Green Herbal Tea',
];

export const WakeUpCallSchedulerView: React.FC<WakeUpCallSchedulerViewProps> = ({ session }) => {
  const { wakeUpCalls, scheduleWakeUpCall, updateWakeUpCallStatus, themeConfig, showToast } = useHotel();
  const themeClasses = getThemeClasses(themeConfig.palette);

  const todayIso = new Date().toISOString().split('T')[0];
  const tomorrowIso = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [wakeUpDate, setWakeUpDate] = useState<string>(tomorrowIso);
  const [wakeUpTime, setWakeUpTime] = useState<string>('06:30');
  const [deliveryMethod, setDeliveryMethod] = useState<WakeUpDeliveryMethod>('phone_ring');
  const [beveragePreference, setBeveragePreference] = useState<string>('Complimentary Masala Chai');
  const [repeatDaily, setRepeatDaily] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  const myWakeUpCalls = useMemo(() => {
    const normalizedRoom = session.roomNumber.toLowerCase();
    return wakeUpCalls.filter(
      (w) =>
        w.roomNumber.toLowerCase() === normalizedRoom ||
        w.bookingCode.toLowerCase() === session.bookingCode.toLowerCase()
    );
  }, [wakeUpCalls, session.roomNumber, session.bookingCode]);

  const activeCallsCount = myWakeUpCalls.filter(
    (w) => w.status === 'scheduled' || w.status === 'alerted' || w.status === 'acknowledged'
  ).length;

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wakeUpDate || !wakeUpTime) {
      showToast('Missing Time', 'Select both a wake-up date and time.', 'warning');
      return;
    }

    scheduleWakeUpCall({
      roomNumber: session.roomNumber,
      bookingCode: session.bookingCode,
      guestName: session.guestName,
      wakeUpDate,
      wakeUpTime,
      repeatDaily,
      deliveryMethod,
      beveragePreference,
      notes,
    });

    setNotes('');
  };

  const getStatusLabel = (call: WakeUpCallRequest) => {
    if (call.status === 'completed') return { text: 'Completed', cls: 'text-emerald-700 dark:text-emerald-400' };
    if (call.status === 'acknowledged')
      return { text: `Confirmed by ${call.acknowledgedBy || 'Front Desk'}`, cls: 'text-emerald-700 dark:text-emerald-400' };
    if (call.status === 'alerted') return { text: 'Front Desk Alert Active', cls: 'text-rose-700 dark:text-rose-400' };
    if (call.status === 'cancelled') return { text: 'Cancelled', cls: 'text-stone-500 dark:text-stone-400' };
    return { text: 'Scheduled · Front Desk Notified', cls: 'text-amber-700 dark:text-amber-400' };
  };

  const formatDelivery = (method: WakeUpDeliveryMethod) => {
    if (method === 'both') return 'Telephone Ring + Door Knock';
    if (method === 'in_person_knock') return 'Concierge Door Knock';
    return 'In-Room Telephone Ring';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs items-start">
      {/* Left 6 Cols: Schedule New Wake-Up Call */}
      <section className="lg:col-span-6 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-5">
        <div className="border-b border-stone-200 dark:border-stone-800 pb-4 space-y-1">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
            <AlarmClock className="w-4 h-4 shrink-0" />
            <span>24-Hour Front Desk Wake-Up Concierge</span>
          </div>
          <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50">
            Schedule Your Wake-Up Call ({session.roomNumber})
          </h3>
          <p className="text-stone-500 dark:text-stone-400">
            Submitting a request sends an instant alert to our Front Desk Reception console so our hosts reach you on time.
          </p>
        </div>

        {/* Quick Time Presets */}
        <div className="space-y-1.5">
          <div className="font-semibold text-stone-700 dark:text-stone-300">Quick Morning Presets</div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TIMES.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setWakeUpTime(preset.value)}
                className={`px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  wakeUpTime === preset.value
                    ? 'bg-amber-700 border-amber-700 text-white'
                    : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-amber-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Wake-Up Date
              </label>
              <div className="space-y-1.5">
                <input
                  type="date"
                  min={todayIso}
                  required
                  value={wakeUpDate}
                  onChange={(e) => setWakeUpDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono tabular-nums"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWakeUpDate(todayIso)}
                    className={`px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer ${
                      wakeUpDate === todayIso
                        ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setWakeUpDate(tomorrowIso)}
                    className={`px-2 py-0.5 rounded border text-[10px] font-semibold cursor-pointer ${
                      wakeUpDate === tomorrowIso
                        ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Exact Wake-Up Time
              </label>
              <input
                type="time"
                required
                value={wakeUpTime}
                onChange={(e) => setWakeUpTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono text-sm font-bold tabular-nums"
              />
              <label className="mt-2 inline-flex items-center gap-2 text-stone-600 dark:text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={repeatDaily}
                  onChange={(e) => setRepeatDaily(e.target.checked)}
                  className="rounded border-stone-300 dark:border-stone-600 text-amber-700"
                />
                <span>Repeat daily until checkout ({session.checkOutDate})</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Wake-Up Method
              </label>
              <select
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value as WakeUpDeliveryMethod)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                <option value="phone_ring">In-Room Telephone Ring</option>
                <option value="in_person_knock">Concierge Door Knock</option>
                <option value="both">Telephone Ring + Door Knock Backup</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Optional Morning Beverage
              </label>
              <select
                value={beveragePreference}
                onChange={(e) => setBeveragePreference(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              >
                {BEVERAGE_OPTIONS.map((bev) => (
                  <option key={bev} value={bev}>
                    {bev}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Special Instructions for Reception (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Airport taxi at 07:15 AM, please pack breakfast box..."
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>

          <button
            type="submit"
            className={`w-full py-2.5 px-4 rounded-lg font-semibold inline-flex items-center justify-center gap-2 shadow-sm whitespace-nowrap shrink-0 cursor-pointer ${themeClasses.primary}`}
          >
            <BellRing className="w-4 h-4" />
            <span>Schedule Wake-Up Call &amp; Alert Reception</span>
          </button>
        </form>
      </section>

      {/* Right 6 Cols: Guest's Scheduled Wake-Up Calls */}
      <section className="lg:col-span-6 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
          <div>
            <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50">
              My Scheduled Wake-Up Calls ({activeCallsCount} Active)
            </h3>
            <p className="text-stone-500 dark:text-stone-400">
              Live synchronization with Kamal Hotel Reception Desk.
            </p>
          </div>
          <span className="font-mono text-[11px] font-semibold text-stone-500 tabular-nums">
            {session.bookingCode}
          </span>
        </div>

        {myWakeUpCalls.length === 0 ? (
          <div className="p-8 text-center rounded-lg border border-dashed border-stone-300 dark:border-stone-700 text-stone-500 space-y-1">
            <Clock className="w-6 h-6 mx-auto text-stone-400" />
            <div className="font-semibold text-stone-700 dark:text-stone-300">No wake-up calls scheduled</div>
            <p>Use the scheduler on the left to request a wake-up call for your stay.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-200 dark:divide-stone-800">
            {myWakeUpCalls.map((call) => {
              const statusMeta = getStatusLabel(call);
              const isMutable = call.status === 'scheduled' || call.status === 'alerted' || call.status === 'acknowledged';

              return (
                <div key={call.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
                          {call.wakeUpTime}
                        </span>
                        <span className="text-stone-400" aria-hidden="true">·</span>
                        <span className="font-mono text-stone-700 dark:text-stone-300 tabular-nums inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          {call.wakeUpDate}
                        </span>
                        {call.repeatDaily && (
                          <>
                            <span className="text-stone-400" aria-hidden="true">·</span>
                            <span className="font-semibold text-amber-700 dark:text-amber-400">Daily Repeat</span>
                          </>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                        <span className="font-mono">{call.requestCode}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <PhoneCall className="w-3 h-3" />
                          {formatDelivery(call.deliveryMethod)}
                        </span>
                        {call.beveragePreference && call.beveragePreference !== 'None' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-stone-700 dark:text-stone-300">
                              <Coffee className="w-3 h-3 text-amber-600" />
                              {call.beveragePreference}
                            </span>
                          </>
                        )}
                      </div>

                      {call.notes && (
                        <p className="mt-1 text-[11px] text-stone-600 dark:text-stone-400">
                          Note: {call.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right space-y-2 shrink-0">
                      <div className={`text-[11px] font-semibold inline-flex items-center gap-1 ${statusMeta.cls}`}>
                        {call.status === 'completed' || call.status === 'acknowledged' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{statusMeta.text}</span>
                      </div>

                      {isMutable && (
                        <div>
                          <button
                            type="button"
                            onClick={() => updateWakeUpCallStatus(call.id, 'cancelled')}
                            className="px-2.5 py-1 rounded-md border border-stone-300 dark:border-stone-700 hover:border-rose-500 hover:text-rose-600 dark:hover:text-rose-400 text-stone-600 dark:text-stone-300 text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Cancel Call</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
