import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import {
  Mail,
  Smartphone,
  Star,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquareQuote,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { PostCheckoutSurvey } from '../../types/hotel';

interface GuestSurveyFeedbackPanelProps {
  compact?: boolean;
  onOpenFullConsole?: () => void;
}

type SurveyFilter = 'all' | 'completed' | 'sent' | 'low_score';

export const GuestSurveyFeedbackPanel: React.FC<GuestSurveyFeedbackPanelProps> = ({
  compact = false,
  onOpenFullConsole,
}) => {
  const {
    surveys,
    bookings,
    autoTriggerSurveyOnCheckout,
    setAutoTriggerSurveyOnCheckout,
    triggerPostCheckoutSurvey,
    openSurveyModal,
    publishSurveyToReviews,
    smtpConfig,
  } = useHotel();

  const [filter, setFilter] = useState<SurveyFilter>('all');

  // Manual Survey Trigger Form State
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [customGuestName, setCustomGuestName] = useState<string>('');
  const [customGuestEmail, setCustomGuestEmail] = useState<string>('');
  const [customGuestPhone, setCustomGuestPhone] = useState<string>('');
  const [customRoomNumber, setCustomRoomNumber] = useState<string>('104');
  const [sendEmail, setSendEmail] = useState<boolean>(true);
  const [sendSms, setSendSms] = useState<boolean>(true);

  const aggregated = useMemo(() => {
    const completed = surveys.filter((s) => s.status === 'completed');
    const pending = surveys.filter((s) => s.status === 'sent');
    const responseRate = surveys.length > 0 ? Math.round((completed.length / surveys.length) * 100) : 0;

    const avgOverall =
      completed.length > 0
        ? completed.reduce((acc, s) => acc + (s.overallRating || 0), 0) / completed.length
        : 0;

    // Net Promoter Score calculation (% Promoters 9-10 minus % Detractors 0-6)
    const withNps = completed.filter((s) => typeof s.npsScore === 'number');
    let nps = 0;
    if (withNps.length > 0) {
      const promoters = withNps.filter((s) => (s.npsScore || 0) >= 9).length;
      const detractors = withNps.filter((s) => (s.npsScore || 0) <= 6).length;
      nps = Math.round(((promoters - detractors) / withNps.length) * 100);
    }

    const avgDim = (key: keyof NonNullable<PostCheckoutSurvey['ratings']>): number => {
      const valid = completed.filter((s) => s.ratings && typeof s.ratings[key] === 'number');
      if (valid.length === 0) return 0;
      return (
        Math.round(
          (valid.reduce((acc, s) => acc + (s.ratings?.[key] || 0), 0) / valid.length) * 10
        ) / 10
      );
    };

    const categoryScores = [
      { category: 'Cleanliness', score: avgDim('cleanliness') },
      { category: 'Hospitality', score: avgDim('staffHospitality') },
      { category: 'Room Comfort', score: avgDim('roomComfort') },
      { category: 'Dining', score: avgDim('diningExperience') },
      { category: 'Value', score: avgDim('valueForMoney') },
    ];

    const lowAlertsCount = completed.filter((s) => (s.overallRating || 5) <= 3).length;

    return {
      totalSent: surveys.length,
      completedCount: completed.length,
      pendingCount: pending.length,
      responseRate,
      avgOverall: Math.round(avgOverall * 10) / 10,
      nps,
      categoryScores,
      lowAlertsCount,
      recentCompleted: completed.slice(0, 3),
    };
  }, [surveys]);

  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      if (filter === 'completed') return s.status === 'completed';
      if (filter === 'sent') return s.status === 'sent';
      if (filter === 'low_score') return s.status === 'completed' && (s.overallRating || 5) <= 3;
      return true;
    });
  }, [surveys, filter]);

  const handleManualDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const channels: ('email' | 'sms')[] = [];
    if (sendEmail) channels.push('email');
    if (sendSms) channels.push('sms');
    if (channels.length === 0) return;

    const matchedBooking = bookings.find((b) => b.id === selectedBookingId);
    if (matchedBooking) {
      triggerPostCheckoutSurvey({
        bookingCode: matchedBooking.bookingCode,
        roomNumber: matchedBooking.assignedRoomNumber || customRoomNumber || 'Front Desk',
        roomName: matchedBooking.roomName,
        guestName: matchedBooking.guestName,
        guestEmail: matchedBooking.guestEmail,
        guestPhone: matchedBooking.guestPhone,
        checkOutDate: matchedBooking.checkOutDate,
        channels,
        triggerMode: 'manual',
      });
    } else if (customGuestName.trim()) {
      triggerPostCheckoutSurvey({
        bookingCode: `KH-MANUAL-${Math.floor(1000 + Math.random() * 9000)}`,
        roomNumber: customRoomNumber || '101',
        roomName: 'Kamal Hotel Stay',
        guestName: customGuestName.trim(),
        guestEmail: customGuestEmail.trim() || 'guest@kamalhotel.com',
        guestPhone: customGuestPhone.trim() || '+977 9800000000',
        channels,
        triggerMode: 'manual',
      });
      setCustomGuestName('');
      setCustomGuestEmail('');
      setCustomGuestPhone('');
    }
  };

  return (
    <section
      aria-label="Post-Checkout Guest Satisfaction and Survey System"
      className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50">
              {compact
                ? 'Manager Feedback Summary & Post-Checkout Surveys'
                : 'Post-Checkout Email/SMS Survey Automation & Manager Feedback'}
            </h3>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Automatically dispatches rating links via Email and SMS upon guest check-out and aggregates stay scores for management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setAutoTriggerSurveyOnCheckout(!autoTriggerSurveyOnCheckout)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              autoTriggerSurveyOnCheckout
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              Auto-Trigger on Check-Out: {autoTriggerSurveyOnCheckout ? 'Enabled' : 'Paused'}
            </span>
          </button>

          {compact && onOpenFullConsole && (
            <button
              type="button"
              onClick={onOpenFullConsole}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 transition-colors cursor-pointer"
            >
              <span>Manage Survey Triggers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Aggregated KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-5 border-b border-stone-200 dark:border-stone-800 tabular-nums">
        <div>
          <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Average Guest Rating
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-50">
              {aggregated.avgOverall > 0 ? aggregated.avgOverall.toFixed(1) : '—'}
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400">/ 5.0</span>
          </div>
          <div className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
            Across {aggregated.completedCount} completed stays
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Net Promoter Score (NPS)
          </div>
          <div className="mt-1 text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400">
            {aggregated.completedCount > 0 ? (aggregated.nps >= 0 ? `+${aggregated.nps}` : aggregated.nps) : '—'}
          </div>
          <div className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
            Promoters (9–10) minus Detractors
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Email &amp; SMS Response Rate
          </div>
          <div className="mt-1 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50">
            {aggregated.responseRate}%
          </div>
          <div className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
            {aggregated.completedCount} replied · {aggregated.pendingCount} awaiting
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Low-Score Escalations (&le; 3★)
          </div>
          <div
            className={`mt-1 text-2xl font-serif font-bold ${
              aggregated.lowAlertsCount > 0
                ? 'text-rose-700 dark:text-rose-400'
                : 'text-stone-900 dark:text-stone-50'
            }`}
          >
            {aggregated.lowAlertsCount}
          </div>
          <div className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
            {aggregated.lowAlertsCount > 0 ? 'Manager follow-up advised' : 'No low-score complaints'}
          </div>
        </div>
      </div>

      {/* Category Breakdown Chart + Recent Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              Department &amp; Service Ratings Breakdown
            </span>
            <span className="text-stone-400 tabular-nums">Scale 1.0 – 5.0</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={aggregated.categoryScores}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#a8a29e" strokeOpacity={0.25} />
                <XAxis
                  type="number"
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#78716c' }}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={95}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#78716c' }}
                />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)} / 5.0`, 'Avg Score']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e7e5e4',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {aggregated.categoryScores.map((entry) => (
                    <Cell
                      key={entry.category}
                      fill={entry.score >= 4.5 ? '#16a34a' : entry.score >= 3.8 ? '#d97706' : '#dc2626'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Completed Feedback List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              Latest Checked-Out Guest Remarks
            </span>
            <span className="text-stone-400">
              SMTP: {smtpConfig.isConfigured ? smtpConfig.senderEmail : 'Built-in Gateway'}
            </span>
          </div>

          {aggregated.recentCompleted.length === 0 ? (
            <div className="p-6 text-center rounded-lg border border-dashed border-stone-300 dark:border-stone-700 text-xs text-stone-500">
              No completed guest survey responses yet. Check out a guest or test a survey link to collect ratings.
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg">
              {aggregated.recentCompleted.map((item) => (
                <div key={item.id} className="p-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-stone-900 dark:text-stone-100">
                      {item.guestName}
                      <span className="font-normal text-stone-500 dark:text-stone-400 ml-1.5">
                        · Room {item.roomNumber} · NPS {item.npsScore ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-mono font-bold text-amber-700 dark:text-amber-400 tabular-nums shrink-0">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{(item.overallRating || 0).toFixed(1)}</span>
                    </div>
                  </div>
                  {item.comment && (
                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                      “{item.comment}”
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full Console Sections: Manual Dispatcher & Complete Survey Ledger */}
      {!compact && (
        <>
          {/* Manual Survey Trigger Form */}
          <form
            onSubmit={handleManualDispatch}
            className="pt-5 border-t border-stone-200 dark:border-stone-800 space-y-4 text-xs"
          >
            <div>
              <h4 className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                Dispatch Survey Manually (Email &amp; SMS)
              </h4>
              <p className="text-stone-500 dark:text-stone-400">
                Select a reservation or enter guest details to immediately push a rating link to Email &amp; SMS logs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Select Guest Reservation
                </label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  <option value="">-- Enter Custom Checked-Out Guest --</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.guestName} ({b.bookingCode} · Room {b.assignedRoomNumber || 'TBD'})
                    </option>
                  ))}
                </select>
              </div>

              {!selectedBookingId && (
                <>
                  <div>
                    <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                      Guest Full Name *
                    </label>
                    <input
                      type="text"
                      required={!selectedBookingId}
                      value={customGuestName}
                      onChange={(e) => setCustomGuestName(e.target.value)}
                      placeholder="e.g. Sita Gurung"
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={customGuestEmail}
                        onChange={(e) => setCustomGuestEmail(e.target.value)}
                        placeholder="guest@email.com"
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                        SMS Phone / Room
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={customGuestPhone}
                          onChange={(e) => setCustomGuestPhone(e.target.value)}
                          placeholder="+977 98..."
                          className="w-full px-2.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                        />
                        <input
                          type="text"
                          value={customRoomNumber}
                          onChange={(e) => setCustomRoomNumber(e.target.value)}
                          placeholder="101"
                          className="w-16 px-2 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                          title="Room Number"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-end gap-3 md:col-span-3 justify-between pt-1">
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-stone-700 dark:text-stone-300">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="rounded border-stone-300"
                    />
                    <Mail className="w-3.5 h-3.5 text-amber-600" />
                    <span>Email Survey Link</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-stone-700 dark:text-stone-300">
                    <input
                      type="checkbox"
                      checked={sendSms}
                      onChange={(e) => setSendSms(e.target.checked)}
                      className="rounded border-stone-300"
                    />
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>SMS Rating Link</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!sendEmail && !sendSms}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white shadow-xs transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Survey Now</span>
                </button>
              </div>
            </div>
          </form>

          {/* Complete Survey Dispatch & Feedback Ledger */}
          <div className="pt-5 border-t border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h4 className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                Post-Checkout Survey Dispatch &amp; Response Log ({filteredSurveys.length})
              </h4>

              <div className="inline-flex flex-wrap items-center rounded-lg bg-stone-100 dark:bg-stone-800 p-1 border border-stone-200 dark:border-stone-700 gap-1">
                {(
                  [
                    { id: 'all', label: `All (${surveys.length})` },
                    { id: 'completed', label: `Completed (${aggregated.completedCount})` },
                    { id: 'sent', label: `Awaiting (${aggregated.pendingCount})` },
                    { id: 'low_score', label: `Low Score (${aggregated.lowAlertsCount})` },
                  ] as { id: SurveyFilter; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      filter === tab.id
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredSurveys.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 border border-dashed border-stone-300 dark:border-stone-700 rounded-lg">
                No survey records in this filter view.
              </div>
            ) : (
              <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Guest &amp; Stay</th>
                      <th className="py-2.5 px-3 font-semibold">Channels &amp; Token</th>
                      <th className="py-2.5 px-3 font-semibold">Status &amp; Rating</th>
                      <th className="py-2.5 px-3 font-semibold">Guest Feedback</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {filteredSurveys.map((srv) => (
                      <tr key={srv.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/30">
                        <td className="py-3 px-3 align-top">
                          <div className="font-semibold text-stone-900 dark:text-stone-100">
                            {srv.guestName}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono">
                            Room {srv.roomNumber} · {srv.bookingCode}
                          </div>
                          <div className="text-[11px] text-stone-400">
                            Out {srv.checkOutDate} · {srv.triggerMode === 'auto_checkout' ? 'Auto Check-Out' : 'Manual'}
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top">
                          <div className="font-mono text-[11px] text-stone-800 dark:text-stone-200">
                            {srv.surveyToken}
                          </div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            {srv.channels.map((c) => c.toUpperCase()).join(' + ')}
                          </div>
                          <div className="text-[10px] text-stone-400 truncate max-w-[180px]">
                            {srv.guestEmail} · {srv.guestPhone}
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top tabular-nums">
                          {srv.status === 'completed' ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span>{(srv.overallRating || 0).toFixed(1)} / 5</span>
                                {(srv.overallRating || 5) <= 3 && (
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 ml-1" />
                                )}
                              </div>
                              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                Completed · NPS {srv.npsScore ?? '—'}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-stone-500 dark:text-stone-400">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Awaiting Guest</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 align-top max-w-xs">
                          {srv.status === 'completed' ? (
                            <div className="space-y-1">
                              <p className="text-stone-700 dark:text-stone-300 leading-snug">
                                {srv.comment || 'Submitted rating without comment.'}
                              </p>
                              {srv.ratings && (
                                <div className="text-[10px] text-stone-400 tabular-nums">
                                  Clean {srv.ratings.cleanliness} · Staff {srv.ratings.staffHospitality} · Comfort {srv.ratings.roomComfort} · Dining {srv.ratings.diningExperience}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-stone-400">Sent {srv.triggeredAt}</span>
                          )}
                        </td>

                        <td className="py-3 px-3 align-top text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            {srv.status === 'sent' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openSurveyModal(srv.surveyToken)}
                                  className="px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-700 hover:bg-amber-800 text-white whitespace-nowrap cursor-pointer"
                                >
                                  Open Guest Survey Form
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    triggerPostCheckoutSurvey({
                                      bookingCode: srv.bookingCode,
                                      roomNumber: srv.roomNumber,
                                      roomName: srv.roomName,
                                      guestName: srv.guestName,
                                      guestEmail: srv.guestEmail,
                                      guestPhone: srv.guestPhone,
                                      checkOutDate: srv.checkOutDate,
                                      channels: srv.channels,
                                      triggerMode: 'manual',
                                    })
                                  }
                                  className="text-[11px] text-stone-600 dark:text-stone-300 hover:underline whitespace-nowrap cursor-pointer"
                                >
                                  Resend Email/SMS
                                </button>
                              </>
                            ) : srv.publishedAsReview ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                                <Globe className="w-3 h-3" />
                                <span>On Website</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => publishSurveyToReviews(srv.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 whitespace-nowrap cursor-pointer"
                              >
                                <Globe className="w-3 h-3" />
                                <span>Publish Review</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};
