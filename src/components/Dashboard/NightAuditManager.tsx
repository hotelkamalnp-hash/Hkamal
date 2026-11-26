import React, { useState, useEffect } from 'react';
import { useHotel } from '../../context/HotelContext';
import { convertPrice, formatCurrency } from '../../utils/theme';
import {
  Moon,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Receipt,
  ShieldCheck,
  FileSpreadsheet,
  Coins,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface DailySummaryResponse {
  roomStayRevenueUSD: number;
  restaurantRevenueUSD: number;
  servicesRevenueUSD: number;
  totalGrossRevenueUSD: number;
  serviceChargeCollectedUSD: number;
  taxCollectedUSD: number;
  expectedCashDrawerUSD: number;
}

export const NightAuditManager: React.FC = () => {
  const {
    nightAudits,
    runNightAudit,
    roomUnits,
    bookings,
    restaurantOrders,
    invoices,
    themeConfig,
    currentCurrency,
    activeUser,
    showToast,
  } = useHotel();

  const fmt = (usd: number) =>
    formatCurrency(convertPrice(usd, currentCurrency, themeConfig.exchangeRates), currentCurrency);

  const nprRate = themeConfig.exchangeRates?.NPR || 135;
  const [liveSummary, setLiveSummary] = useState<DailySummaryResponse | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);

  // Derived fallback directly from real state records (zero fabricated multipliers or hardcoded amounts)
  const localRoomRevenue = bookings
    .filter((b) => b.bookingStatus === 'checked-in' || b.bookingStatus === 'checked-out')
    .reduce((acc, b) => acc + Number(b.subtotal || 0) / Math.max(1, b.nights || 1), 0);
  const localFAndBRevenue = restaurantOrders.reduce((acc, o) => acc + Number(o.subtotalUSD || 0), 0);
  const localServicesRevenue = invoices
    .flatMap((inv) => inv.items || [])
    .filter((it) => it.category !== 'room_stay' && it.category !== 'restaurant_dining')
    .reduce((acc, it) => acc + Number(it.amountUSD || 0), 0);
  const localExpectedCashUSD = invoices
    .filter((inv) => inv.paymentMethod === 'onsite' && inv.paymentStatus === 'paid')
    .reduce((acc, inv) => acc + Number(inv.amountPaidUSD || 0), 0);

  const [expectedCashDrawerNPR, setExpectedCashDrawerNPR] = useState(() =>
    Math.round(localExpectedCashUSD * nprRate)
  );
  const [physicalCashDrawerNPR, setPhysicalCashDrawerNPR] = useState(() =>
    Math.round(localExpectedCashUSD * nprRate)
  );
  const [isAuditing, setIsAuditing] = useState(false);

  const fetchDailyAccounting = async () => {
    setLoadingLive(true);
    try {
      const res = await fetch('/api/accounting/summary?range=daily', { credentials: 'include' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && data?.report) {
        const rep = data.report;
        setLiveSummary({
          roomStayRevenueUSD: Number(rep.roomStayRevenueUSD || 0),
          restaurantRevenueUSD: Number(rep.restaurantRevenueUSD || 0),
          servicesRevenueUSD: Number(rep.servicesRevenueUSD || 0),
          totalGrossRevenueUSD: Number(rep.totalGrossRevenueUSD || 0),
          serviceChargeCollectedUSD: Number(rep.serviceChargeCollectedUSD || 0),
          taxCollectedUSD: Number(rep.taxCollectedUSD || 0),
          expectedCashDrawerUSD: Number(rep.expectedCashDrawerUSD || 0),
        });
        const expectedNpr = Math.round(Number(rep.expectedCashDrawerUSD || 0) * nprRate);
        setExpectedCashDrawerNPR(expectedNpr);
        setPhysicalCashDrawerNPR(expectedNpr);
      }
    } catch {
      // Keep derived state
    } finally {
      setLoadingLive(false);
    }
  };

  useEffect(() => {
    fetchDailyAccounting();
  }, [invoices.length, bookings.length, restaurantOrders.length]);

  const totalOccupied = roomUnits.filter((u) => u.occupancyStatus === 'occupied').length;
  const occupancyPercent = Math.round((totalOccupied / (roomUnits.length || 1)) * 100);

  const roomRevenue = liveSummary ? liveSummary.roomStayRevenueUSD : localRoomRevenue;
  const fAndBRevenue = liveSummary ? liveSummary.restaurantRevenueUSD : localFAndBRevenue;
  const servicesRevenue = liveSummary ? liveSummary.servicesRevenueUSD : localServicesRevenue;
  const totalGrossRevenue = liveSummary
    ? liveSummary.totalGrossRevenueUSD
    : roomRevenue + fAndBRevenue + servicesRevenue;
  const serviceCharge10 = liveSummary ? liveSummary.serviceChargeCollectedUSD : totalGrossRevenue * 0.1;
  const vat13 = liveSummary ? liveSummary.taxCollectedUSD : (totalGrossRevenue + serviceCharge10) * 0.13;
  const grandTotalRevenue = totalGrossRevenue + serviceCharge10 + vat13;

  const adr = totalOccupied > 0 ? roomRevenue / totalOccupied : 0;
  const revPar = roomUnits.length > 0 ? roomRevenue / roomUnits.length : 0;

  const cashDiscrepancy = physicalCashDrawerNPR - expectedCashDrawerNPR;

  const handleRunAudit = () => {
    setIsAuditing(true);
    const countedUSD = Math.round((physicalCashDrawerNPR / nprRate) * 100) / 100;
    runNightAudit(activeUser?.name || 'Hotel Duty Auditor', countedUSD);
    setTimeout(() => {
      setIsAuditing(false);
      fetchDailyAccounting();
    }, 350);
  };

  return (
    <div className="space-y-6">
      {/* Night Audit Header */}
      <div className="bg-stone-900 text-stone-100 rounded-xl border border-stone-800 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-serif font-bold text-white">
              Night Audit & Daily Operations Close
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Midnight room charge batch posting, statutory 10% SC + 13% VAT tax liabilities, cash drawer reconciliation, and Daily Sales Report (DSR).
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunAudit}
          disabled={isAuditing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition shadow-sm cursor-pointer disabled:opacity-50"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>{isAuditing ? 'Executing Midnight Batch...' : 'Run Daily Night Audit Close'}</span>
        </button>
      </div>

      {/* Operational Flash Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] text-stone-500 font-medium">Occupancy Rate</div>
          <div className="text-2xl font-sans font-semibold tracking-tight tabular-nums text-stone-900 dark:text-stone-100 mt-1">
            {occupancyPercent}%
          </div>
          <div className="text-[10px] text-stone-400 mt-1">
            {totalOccupied} of {roomUnits.length} rooms sold
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] text-stone-500 font-medium">Average Daily Rate (ADR)</div>
          <div className="text-2xl font-sans font-semibold tracking-tight tabular-nums text-stone-900 dark:text-stone-100 mt-1">
            {fmt(adr)}
          </div>
          <div className="text-[10px] text-stone-400 mt-1">
            Per occupied room night
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] text-stone-500 font-medium">RevPAR (Rev/Avail Room)</div>
          <div className="text-2xl font-sans font-semibold tracking-tight tabular-nums text-stone-900 dark:text-stone-100 mt-1">
            {fmt(revPar)}
          </div>
          <div className="text-[10px] text-stone-400 mt-1">
            Across total hotel capacity
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] text-stone-500 font-medium">Grand Operating Total</div>
          <div className="text-2xl font-sans font-semibold tracking-tight tabular-nums text-amber-700 dark:text-amber-400 mt-1">
            {fmt(grandTotalRevenue)}
          </div>
          <div className="text-[10px] text-stone-400 mt-1">
            Includes 10% SC & 13% VAT
          </div>
        </div>
      </div>

      {/* Cash Drawer & Gateway Balancing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
            <Coins className="w-4 h-4 text-amber-600" />
            <h3 className="font-serif font-bold text-base">Front Desk Cash Drawer Balancing</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-stone-600 dark:text-stone-400 mb-1">
                Actual Physical Cash Counted in Drawer (NPR Rs.)
              </label>
              <input
                type="number"
                value={physicalCashDrawerNPR}
                onChange={(e) => setPhysicalCashDrawerNPR(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-stone-600 dark:text-stone-400 mb-1">
                System Expected Cash from Invoices (NPR Rs.)
              </label>
              <input
                type="number"
                value={expectedCashDrawerNPR}
                onChange={(e) => setExpectedCashDrawerNPR(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 font-mono text-sm"
              />
            </div>

            <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center justify-between font-mono">
              <span className="font-semibold text-stone-700 dark:text-stone-300">Variance / Discrepancy:</span>
              <span className={`font-bold ${cashDiscrepancy === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {cashDiscrepancy >= 0 ? `+NPR ${cashDiscrepancy.toLocaleString()}` : `-NPR ${Math.abs(cashDiscrepancy).toLocaleString()}`}
                {currentCurrency !== 'NPR' && (
                  <span className="ml-1.5 text-[11px] font-normal opacity-80">
                    ({cashDiscrepancy >= 0 ? '+' : '-'}{fmt(Math.abs(cashDiscrepancy) / nprRate)})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Daily Departmental Revenue Split */}
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
            <h3 className="font-serif font-bold text-base">Daily Sales Report (DSR) Breakdown</h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-stone-100 dark:border-stone-800 font-mono">
              <span className="text-stone-600 dark:text-stone-400">Room Stay Tariffs:</span>
              <span className="font-bold text-stone-900 dark:text-stone-100">{fmt(roomRevenue)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-stone-100 dark:border-stone-800 font-mono">
              <span className="text-stone-600 dark:text-stone-400">Ground-Floor Restaurant & Bar F&B:</span>
              <span className="font-bold text-stone-900 dark:text-stone-100">{fmt(fAndBRevenue)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-stone-100 dark:border-stone-800 font-mono">
              <span className="text-stone-600 dark:text-stone-400">Services & Incidentals (Laundry, Transfers):</span>
              <span className="font-bold text-stone-900 dark:text-stone-100">{fmt(servicesRevenue)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-stone-100 dark:border-stone-800 font-mono">
              <span className="text-stone-600 dark:text-stone-400">10% Hotel Service Charge Collected:</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">{fmt(serviceCharge10)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-stone-100 dark:border-stone-800 font-mono">
              <span className="text-stone-600 dark:text-stone-400">13% Nepal VAT Tax Payable (IRD):</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">{fmt(vat13)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Night Audit Records */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-base">
          Closed Night Audit Batch History ({nightAudits.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-semibold border-b border-stone-200 dark:border-stone-700">
              <tr>
                <th className="py-2.5 px-3">Audit Date</th>
                <th className="py-2.5 px-3">Auditor</th>
                <th className="py-2.5 px-3 text-right">Occupancy %</th>
                <th className="py-2.5 px-3 text-right">ADR ({currentCurrency})</th>
                <th className="py-2.5 px-3 text-right">RevPAR ({currentCurrency})</th>
                <th className="py-2.5 px-3 text-right">Room Rev</th>
                <th className="py-2.5 px-3 text-right">F&amp;B Rev</th>
                <th className="py-2.5 px-3 text-right">Total Net</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {nightAudits.map((aud) => (
                <tr key={aud.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                  <td className="py-3 px-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                    {aud.auditDate}
                  </td>
                  <td className="py-3 px-3 text-stone-600 dark:text-stone-400">
                    {aud.auditorName}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold">
                    {aud.occupancyPercentage}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {fmt(aud.adrUSD)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {fmt(aud.revParUSD)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {fmt(aud.roomRevenueUSD)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {fmt(aud.fAndBRevenueUSD)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-amber-700 dark:text-amber-400">
                    {fmt(aud.totalRevenueUSD)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {aud.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
