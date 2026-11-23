import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, Calendar, BarChart3, Sparkles } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { CurrencyCode } from '../../types/hotel';
import { convertPrice, formatCurrency } from '../../utils/theme';

type Granularity = 'monthly' | 'weekly';

interface RevenueBucket {
  key: string;
  label: string;
  fullLabel: string;
  paidEarnings: number;
  pendingEarnings: number;
  totalEarnings: number;
  bookingsCount: number;
  nightsCount: number;
  momGrowthPct: number | null;
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseBookingDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function normalizeToUSD(
  amount: number,
  fromCurrency: CurrencyCode,
  exchangeRates: { USD: number; NPR: number; INR: number }
): number {
  if (fromCurrency === 'USD') return amount;
  if (fromCurrency === 'NPR') return amount / (exchangeRates.NPR || 135);
  if (fromCurrency === 'INR') return amount / (exchangeRates.INR || 84.5);
  return amount;
}

function roundForCurrency(amount: number, currency: CurrencyCode): number {
  if (currency === 'USD') {
    return Math.round(amount * 100) / 100;
  }
  return Math.round(amount);
}

function getMondayStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatCompactAxisTick(value: number, currency: CurrencyCode): string {
  const symbol = currency === 'NPR' ? 'रू ' : currency === 'INR' ? '₹ ' : '$';
  if (value === 0) return `${symbol}0`;
  if (Math.abs(value) >= 1_000_000) {
    return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${symbol}${Math.round(value / 1_000)}k`;
  }
  return `${symbol}${Math.round(value)}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: RevenueBucket;
  }>;
  currentCurrency: CurrencyCode;
}

const CustomRevenueTooltip: React.FC<CustomTooltipProps> = ({ active, payload, currentCurrency }) => {
  if (!active || !payload || payload.length === 0) return null;
  const bucket = payload[0].payload;

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg shadow-xl p-3.5 text-xs min-w-[215px] space-y-2">
      <div className="font-semibold text-stone-900 dark:text-stone-50 border-b border-stone-100 dark:border-stone-800 pb-1.5 flex items-center justify-between gap-2">
        <span>{bucket.fullLabel}</span>
        {bucket.momGrowthPct !== null && (
          <span
            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
              bucket.momGrowthPct >= 0
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
            }`}
          >
            {bucket.momGrowthPct >= 0 ? '+' : ''}
            {bucket.momGrowthPct.toFixed(1)}% MoM
          </span>
        )}
      </div>

      <div className="space-y-1.5 tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
            <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
            <span>Confirmed Paid</span>
          </span>
          <span className="font-semibold text-stone-900 dark:text-stone-100">
            {formatCurrency(bucket.paidEarnings, currentCurrency)}
          </span>
        </div>

        {bucket.pendingEarnings > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
              <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
              <span>Pending Due</span>
            </span>
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              {formatCurrency(bucket.pendingEarnings, currentCurrency)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pt-1 border-t border-stone-100 dark:border-stone-800 font-bold text-stone-900 dark:text-stone-50">
          <span>Total Earnings</span>
          <span>{formatCurrency(bucket.totalEarnings, currentCurrency)}</span>
        </div>
      </div>

      <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between pt-0.5 tabular-nums">
        <span>{bucket.bookingsCount} {bucket.bookingsCount === 1 ? 'reservation' : 'reservations'}</span>
        <span>{bucket.nightsCount} {bucket.nightsCount === 1 ? 'night' : 'nights'}</span>
      </div>
    </div>
  );
};

export const RevenueTrendsWidget: React.FC = () => {
  const { bookings, currentCurrency, themeConfig } = useHotel();
  const [granularity, setGranularity] = useState<Granularity>('monthly');

  const activeBookings = useMemo(
    () =>
      bookings.filter(
        (b) => b.bookingStatus !== 'cancelled' && b.paymentStatus !== 'refunded'
      ),
    [bookings]
  );

  const { monthlyData, weeklyData } = useMemo(() => {
    const now = new Date();
    let anchorMs = now.getTime();

    for (const booking of activeBookings) {
      const dt = parseBookingDate(booking.createdAt) || parseBookingDate(booking.checkInDate);
      if (dt && dt.getTime() > anchorMs) {
        anchorMs = dt.getTime();
      }
    }

    const anchorDate = new Date(anchorMs);

    // 1. Build trailing 6-month series
    const monthBuckets: RevenueBucket[] = [];
    const monthIndex = new Map<string, RevenueBucket>();

    for (let offset = -5; offset <= 0; offset++) {
      const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + offset, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      const bucket: RevenueBucket = {
        key,
        label: `${MONTH_NAMES_SHORT[m]} '${String(y).slice(-2)}`,
        fullLabel: `${MONTH_NAMES_FULL[m]} ${y}`,
        paidEarnings: 0,
        pendingEarnings: 0,
        totalEarnings: 0,
        bookingsCount: 0,
        nightsCount: 0,
        momGrowthPct: null,
      };
      monthBuckets.push(bucket);
      monthIndex.set(key, bucket);
    }

    // 2. Build trailing 8-week series (Monday-Sunday)
    const anchorMonday = getMondayStart(anchorDate);
    const weekBuckets: RevenueBucket[] = [];
    const weekIndex = new Map<string, RevenueBucket>();

    for (let offset = -7; offset <= 0; offset++) {
      const start = new Date(anchorMonday);
      start.setDate(anchorMonday.getDate() + offset * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const key = formatDateISO(start);
      const label = `${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getDate()}`;
      const fullLabel = `${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getDate()} – ${MONTH_NAMES_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;

      const bucket: RevenueBucket = {
        key,
        label,
        fullLabel,
        paidEarnings: 0,
        pendingEarnings: 0,
        totalEarnings: 0,
        bookingsCount: 0,
        nightsCount: 0,
        momGrowthPct: null,
      };
      weekBuckets.push(bucket);
      weekIndex.set(key, bucket);
    }

    // 3. Bucket live bookings into monthly & weekly earnings
    for (const booking of activeBookings) {
      const bookingDate = parseBookingDate(booking.createdAt) || parseBookingDate(booking.checkInDate);
      if (!bookingDate) continue;

      const usdValue = normalizeToUSD(
        booking.totalAmount || 0,
        booking.currency || 'USD',
        themeConfig.exchangeRates
      );
      const convertedValue = convertPrice(
        usdValue,
        currentCurrency,
        themeConfig.exchangeRates
      );

      const isPaid = booking.paymentStatus === 'paid';
      const nights = booking.nights || 1;

      // Monthly bucket match
      const monthKey = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
      const mBucket = monthIndex.get(monthKey);
      if (mBucket) {
        if (isPaid) {
          mBucket.paidEarnings = roundForCurrency(mBucket.paidEarnings + convertedValue, currentCurrency);
        } else {
          mBucket.pendingEarnings = roundForCurrency(mBucket.pendingEarnings + convertedValue, currentCurrency);
        }
        mBucket.totalEarnings = roundForCurrency(mBucket.paidEarnings + mBucket.pendingEarnings, currentCurrency);
        mBucket.bookingsCount += 1;
        mBucket.nightsCount += nights;
      }

      // Weekly bucket match
      const weekMonday = getMondayStart(bookingDate);
      const weekKey = formatDateISO(weekMonday);
      const wBucket = weekIndex.get(weekKey);
      if (wBucket) {
        if (isPaid) {
          wBucket.paidEarnings = roundForCurrency(wBucket.paidEarnings + convertedValue, currentCurrency);
        } else {
          wBucket.pendingEarnings = roundForCurrency(wBucket.pendingEarnings + convertedValue, currentCurrency);
        }
        wBucket.totalEarnings = roundForCurrency(wBucket.paidEarnings + wBucket.pendingEarnings, currentCurrency);
        wBucket.bookingsCount += 1;
        wBucket.nightsCount += nights;
      }
    }

    const assignGrowthRates = (series: RevenueBucket[]) => {
      for (let i = 1; i < series.length; i++) {
        const prev = series[i - 1];
        const curr = series[i];
        if (prev.totalEarnings > 0) {
          curr.momGrowthPct = Number(
            (((curr.totalEarnings - prev.totalEarnings) / prev.totalEarnings) * 100).toFixed(1)
          );
        } else if (curr.totalEarnings > 0) {
          curr.momGrowthPct = 100;
        }
      }
    };

    assignGrowthRates(monthBuckets);
    assignGrowthRates(weekBuckets);

    return { monthlyData: monthBuckets, weeklyData: weekBuckets };
  }, [activeBookings, currentCurrency, themeConfig.exchangeRates]);

  const activeData = granularity === 'monthly' ? monthlyData : weeklyData;

  const summary = useMemo(() => {
    const totalWindowEarnings = activeData.reduce((acc, b) => acc + b.totalEarnings, 0);
    const paidWindowEarnings = activeData.reduce((acc, b) => acc + b.paidEarnings, 0);
    const pendingWindowEarnings = activeData.reduce((acc, b) => acc + b.pendingEarnings, 0);
    const totalBookingsCount = activeData.reduce((acc, b) => acc + b.bookingsCount, 0);
    const totalNights = activeData.reduce((acc, b) => acc + b.nightsCount, 0);
    const avgBookingValue = totalBookingsCount > 0 ? totalWindowEarnings / totalBookingsCount : 0;

    let peakBucket = activeData[0];
    for (const bucket of activeData) {
      if (bucket.totalEarnings > (peakBucket?.totalEarnings || 0)) {
        peakBucket = bucket;
      }
    }

    const hasPendingSeries = activeData.some((b) => b.pendingEarnings > 0);
    const currentPeriod = activeData[activeData.length - 1];
    const previousPeriod = activeData[activeData.length - 2];
    let periodDeltaPercent: number | null = currentPeriod?.momGrowthPct ?? null;
    if (periodDeltaPercent === null && previousPeriod && previousPeriod.totalEarnings > 0 && currentPeriod) {
      periodDeltaPercent =
        ((currentPeriod.totalEarnings - previousPeriod.totalEarnings) / previousPeriod.totalEarnings) * 100;
    }

    const collectionRatePct =
      totalWindowEarnings > 0 ? Math.round((paidWindowEarnings / totalWindowEarnings) * 100) : 100;

    return {
      totalWindowEarnings: roundForCurrency(totalWindowEarnings, currentCurrency),
      paidWindowEarnings: roundForCurrency(paidWindowEarnings, currentCurrency),
      pendingWindowEarnings: roundForCurrency(pendingWindowEarnings, currentCurrency),
      totalBookingsCount,
      totalNights,
      avgBookingValue: roundForCurrency(avgBookingValue, currentCurrency),
      peakBucket,
      hasPendingSeries,
      periodDeltaPercent,
      collectionRatePct,
    };
  }, [activeData, currentCurrency]);

  return (
    <section
      aria-label="Booking Revenue Trends"
      className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6"
    >
      {/* Header & Granularity Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-50">
              Monthly Revenue Growth &amp; Booking Earnings
            </h3>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {granularity === 'monthly'
              ? `Trailing 6-month revenue & month-over-month (MoM) growth trajectory normalized to ${currentCurrency}.`
              : `Trailing 8-week revenue & week-over-week pace normalized to ${currentCurrency}.`}
          </p>
        </div>

        <div
          role="group"
          aria-label="Select revenue timeframe"
          className="inline-flex items-center rounded-lg bg-stone-100 dark:bg-stone-800 p-1 border border-stone-200 dark:border-stone-700 self-start sm:self-auto shrink-0"
        >
          <button
            type="button"
            onClick={() => setGranularity('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              granularity === 'monthly'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Monthly</span>
          </button>
          <button
            type="button"
            onClick={() => setGranularity('weekly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              granularity === 'weekly'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Weekly</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Row (Flat divider layout, tabular numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-5 border-b border-stone-200 dark:border-stone-800 tabular-nums">
        <div>
          <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            {granularity === 'monthly' ? '6-Month Booking Earnings' : '8-Week Booking Earnings'}
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-50">
            {formatCurrency(summary.totalWindowEarnings, currentCurrency)}
          </div>
          <div className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
            {summary.periodDeltaPercent !== null ? (
              <span
                className={
                  summary.periodDeltaPercent >= 0
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-rose-600 dark:text-rose-400 font-semibold'
                }
              >
                {summary.periodDeltaPercent >= 0 ? '+' : ''}
                {summary.periodDeltaPercent.toFixed(1)}% vs prior {granularity === 'monthly' ? 'month' : 'week'}
              </span>
            ) : (
              <span>Confirmed &amp; pending bookings</span>
            )}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Confirmed &amp; Settled
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-sans font-semibold tracking-tight tabular-nums text-stone-900 dark:text-stone-50">
            {formatCurrency(summary.paidWindowEarnings, currentCurrency)}
          </div>
          <div className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
            {summary.totalWindowEarnings > 0
              ? `${summary.collectionRatePct}% collection rate`
              : 'No settled bookings yet'}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Reservations &amp; Room Nights
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-sans font-semibold tracking-tight tabular-nums text-stone-900 dark:text-stone-50">
            {summary.totalBookingsCount}
            <span className="text-sm font-sans font-normal text-stone-500 dark:text-stone-400 ml-1.5">
              / {summary.totalNights} nights
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
            Avg. {formatCurrency(summary.avgBookingValue, currentCurrency)} per stay
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Peak {granularity === 'monthly' ? 'Month' : 'Week'}
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-sans font-semibold tracking-tight tabular-nums text-amber-700 dark:text-amber-400">
            {summary.peakBucket && summary.peakBucket.totalEarnings > 0
              ? formatCurrency(summary.peakBucket.totalEarnings, currentCurrency)
              : formatCurrency(0, currentCurrency)}
          </div>
          <div className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
            {summary.peakBucket && summary.peakBucket.totalEarnings > 0
              ? summary.peakBucket.fullLabel
              : 'Awaiting new bookings'}
          </div>
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="h-72 sm:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {granularity === 'monthly' ? (
            <ComposedChart data={activeData} margin={{ top: 12, right: 8, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#a8a29e" strokeOpacity={0.25} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#78716c' }}
                dy={8}
              />
              <YAxis
                yAxisId="rev"
                axisLine={false}
                tickLine={false}
                width={64}
                tick={{ fontSize: 11, fill: '#78716c' }}
                tickFormatter={(val: number) => formatCompactAxisTick(val, currentCurrency)}
              />
              <YAxis
                yAxisId="growth"
                orientation="right"
                axisLine={false}
                tickLine={false}
                width={44}
                tick={{ fontSize: 11, fill: '#10b981' }}
                tickFormatter={(val: number) => `${val > 0 ? '+' : ''}${val}%`}
              />
              <ReferenceLine yAxisId="growth" y={0} stroke="#78716c" strokeDasharray="3 3" strokeOpacity={0.5} />
              <Tooltip
                cursor={{ fill: 'rgba(217, 119, 6, 0.08)' }}
                content={<CustomRevenueTooltip currentCurrency={currentCurrency} />}
              />
              <Bar
                yAxisId="rev"
                dataKey="paidEarnings"
                name="Confirmed Paid"
                stackId="earnings"
                fill="#d97706"
                radius={summary.hasPendingSeries ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                maxBarSize={44}
              />
              {summary.hasPendingSeries && (
                <Bar
                  yAxisId="rev"
                  dataKey="pendingEarnings"
                  name="Pending Due"
                  stackId="earnings"
                  fill="#0d9488"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                />
              )}
              <Line
                yAxisId="growth"
                type="monotone"
                dataKey="momGrowthPct"
                name="MoM Growth %"
                stroke="#10b981"
                strokeWidth={2.5}
                connectNulls
                dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </ComposedChart>
          ) : (
            <BarChart data={activeData} margin={{ top: 10, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#a8a29e" strokeOpacity={0.25} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#78716c' }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={64}
                tick={{ fontSize: 11, fill: '#78716c' }}
                tickFormatter={(val: number) => formatCompactAxisTick(val, currentCurrency)}
              />
              <Tooltip
                cursor={{ fill: 'rgba(217, 119, 6, 0.08)' }}
                content={<CustomRevenueTooltip currentCurrency={currentCurrency} />}
              />
              <Bar
                dataKey="paidEarnings"
                name="Confirmed Paid"
                stackId="earnings"
                fill="#d97706"
                radius={summary.hasPendingSeries ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                maxBarSize={44}
              />
              {summary.hasPendingSeries && (
                <Bar
                  dataKey="pendingEarnings"
                  name="Pending Due"
                  stackId="earnings"
                  fill="#0d9488"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Actionable Management Revenue Insights Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-stone-100 dark:border-stone-800/80">
        <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/60 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>MoM Growth Trajectory</span>
          </div>
          <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
            {summary.periodDeltaPercent !== null ? (
              summary.periodDeltaPercent >= 0 ? (
                <>Revenue pace is up <strong>+{summary.periodDeltaPercent.toFixed(1)}%</strong> vs the prior {granularity === 'monthly' ? 'month' : 'week'}. Maintain direct-booking perks and Executive Suite upsell bundles.</>
              ) : (
                <>Volume softened <strong>{summary.periodDeltaPercent.toFixed(1)}%</strong> vs the prior {granularity === 'monthly' ? 'month' : 'week'}. Activate a Hero flash-sale banner and corporate weekend packages.</>
              )
            ) : (
              <>Average booking value sits at <strong>{formatCurrency(summary.avgBookingValue, currentCurrency)}</strong> across {summary.totalNights} booked room nights.</>
            )}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/60 space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
            Collection &amp; Folio Health
          </div>
          <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
            {summary.pendingWindowEarnings > 0 ? (
              <><strong>{formatCurrency(summary.pendingWindowEarnings, currentCurrency)}</strong> remains pending collection ({100 - summary.collectionRatePct}%). Prompt reception to collect deposit pre-auth before arrival.</>
            ) : (
              <><strong>{summary.collectionRatePct}%</strong> settled payment realization across confirmed bookings—zero overdue receivables in this window.</>
            )}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/60 space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Peak Yield Benchmark
          </div>
          <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
            {summary.peakBucket && summary.peakBucket.totalEarnings > 0 ? (
              <><strong>{summary.peakBucket.fullLabel}</strong> led at <strong>{formatCurrency(summary.peakBucket.totalEarnings, currentCurrency)}</strong> ({summary.peakBucket.nightsCount} room nights)—use it as your ADR floor benchmark.</>
            ) : (
              <>Continue logging confirmed stays to establish seasonal peak revenue benchmarks across Kathmandu travel cycles.</>
            )}
          </p>
        </div>
      </div>

      {/* Concise Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 dark:border-stone-800/80 text-[11px] text-stone-500 dark:text-stone-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-block" />
            <span>Confirmed &amp; Paid Bookings</span>
          </span>
          {summary.hasPendingSeries && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-teal-600 inline-block" />
              <span>Pending Collection</span>
            </span>
          )}
          {granularity === 'monthly' && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-500 inline-block" />
              <span>MoM Growth %</span>
            </span>
          )}
        </div>
        <span>Live multi-currency conversion ({currentCurrency})</span>
      </div>
    </section>
  );
};
