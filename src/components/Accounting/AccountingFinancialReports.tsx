import React, { useEffect, useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { AccountingPeriod, ExpenseRecord } from '../../types/hotel';
import { formatCurrency, convertPrice, getThemeClasses } from '../../utils/theme';
import {
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  Building,
  Utensils,
  Sparkles,
  Percent,
  Plus,
  Trash2,
  ShieldCheck,
  RefreshCw,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';

interface RealFinancialReport {
  range: AccountingPeriod | 'all';
  dateLabel: string;
  startDate: string;
  endDate: string;
  roomStayRevenueUSD: number;
  restaurantRevenueUSD: number;
  servicesRevenueUSD: number;
  totalGrossRevenueUSD: number;
  discountsGivenUSD: number;
  serviceChargeCollectedUSD: number;
  taxCollectedUSD: number;
  expensesUSD: number;
  netOperatingIncomeUSD: number;
  totalInvoicesCount: number;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
  amountCollectedUSD: number;
  balanceReceivableUSD: number;
  expectedCashDrawerUSD: number;
  irdSubmittedCount: number;
  expenses: ExpenseRecord[];
}

interface ReconciliationReport {
  totalSettledUSD: number;
  totalPendingUSD: number;
  totalRefundedUSD: number;
  byGateway: Record<string, { count: number; totalUSD: number }>;
  unmatchedInvoicesCount: number;
}

interface IrdLogEntry {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  fiscalYear: string;
  totalWithVatNPR: number;
  status: string;
  irdReceiptRef?: string;
  submittedAt: string;
  errorMessage?: string;
}

export const AccountingFinancialReports: React.FC = () => {
  const { invoices, themeConfig, currentCurrency, showToast } = useHotel();
  const themeClasses = getThemeClasses(themeConfig.palette);

  const [selectedPeriod, setSelectedPeriod] = useState<AccountingPeriod>('monthly');
  const [report, setReport] = useState<RealFinancialReport | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [irdLogs, setIrdLogs] = useState<IrdLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Add Expense modal/form state
  const [expCategory, setExpCategory] = useState<string>('utilities');
  const [expDescription, setExpDescription] = useState<string>('');
  const [expVendor, setExpVendor] = useState<string>('');
  const [expAmountUSD, setExpAmountUSD] = useState<string>('');
  const [expDate, setExpDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [savingExpense, setSavingExpense] = useState<boolean>(false);
  const [submittingIrdId, setSubmittingIrdId] = useState<string | null>(null);

  const fetchAccountingData = async (period: AccountingPeriod) => {
    setLoading(true);
    try {
      const [summaryRes, reconRes, irdRes] = await Promise.all([
        fetch(`/api/accounting/summary?range=${encodeURIComponent(period)}`, { credentials: 'include' }),
        fetch('/api/payments/reconcile', { credentials: 'include' }),
        fetch('/api/accounting/ird-cbms/logs', { credentials: 'include' }),
      ]);
      const summaryJson = await summaryRes.json().catch(() => null);
      if (summaryRes.ok && summaryJson?.ok && summaryJson?.report) {
        setReport(summaryJson.report);
      }
      const reconJson = await reconRes.json().catch(() => null);
      if (reconRes.ok && reconJson?.ok && reconJson?.report) {
        setReconciliation(reconJson.report);
      }
      const irdJson = await irdRes.json().catch(() => null);
      if (irdRes.ok && irdJson?.ok && Array.isArray(irdJson.logs)) {
        setIrdLogs(irdJson.logs);
      }
    } catch {
      // Fallback gracefully if static preview
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountingData(selectedPeriod);
  }, [selectedPeriod, invoices.length]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(expAmountUSD);
    if (!expDescription.trim() || !Number.isFinite(amountNum) || amountNum <= 0) {
      showToast('Invalid Expense', 'Enter a valid expense description and positive USD amount.', 'warning');
      return;
    }
    setSavingExpense(true);
    try {
      const res = await fetch('/api/accounting/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category: expCategory,
          description: expDescription.trim(),
          vendor: expVendor.trim() || undefined,
          amountUSD: amountNum,
          expenseDate: expDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        showToast('Expense Rejected', data?.error || 'Unable to record expense.', 'error');
        return;
      }
      setExpDescription('');
      setExpVendor('');
      setExpAmountUSD('');
      showToast('Expense Recorded', `Logged $${amountNum.toFixed(2)} operating expense.`, 'success');
      await fetchAccountingData(selectedPeriod);
    } catch {
      showToast('Network Error', 'Could not reach accounting service.', 'error');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const res = await fetch(`/api/accounting/expenses/${encodeURIComponent(expenseId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        showToast('Expense Deleted', 'Operating expense removed from ledger.', 'info');
        await fetchAccountingData(selectedPeriod);
      }
    } catch {
      showToast('Error', 'Unable to delete expense.', 'error');
    }
  };

  const handleSubmitIrd = async (invoiceId: string) => {
    setSubmittingIrdId(invoiceId);
    try {
      const res = await fetch('/api/accounting/ird-cbms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        showToast(
          data?.code === 'IRD_CBMS_NOT_CONFIGURED' ? 'IRD CBMS Endpoint Pending Config' : 'IRD CBMS Submission Failed',
          data?.error || 'Set IRD_CBMS_ENDPOINT, IRD_CBMS_USERNAME, IRD_CBMS_PASSWORD on server.',
          'warning'
        );
      } else {
        showToast('IRD CBMS Accepted', `Invoice synced (Ref: ${data.log?.irdReceiptRef || 'Recorded'}).`, 'success');
      }
      await fetchAccountingData(selectedPeriod);
    } catch {
      showToast('Network Error', 'Unable to submit IRD CBMS invoice.', 'error');
    } finally {
      setSubmittingIrdId(null);
    }
  };

  // Fallback computation strictly from actual in-state invoices (NO synthetic multipliers)
  const localRoomUSD = invoices
    .flatMap((i) => (i.items || []).filter((it) => it.category === 'room_stay'))
    .reduce((acc, it) => acc + Number(it.amountUSD || 0), 0);
  const localDiningUSD = invoices
    .flatMap((i) => (i.items || []).filter((it) => it.category === 'restaurant_dining'))
    .reduce((acc, it) => acc + Number(it.amountUSD || 0), 0);
  const localServicesUSD = invoices
    .flatMap((i) =>
      (i.items || []).filter((it) => it.category !== 'room_stay' && it.category !== 'restaurant_dining')
    )
    .reduce((acc, it) => acc + Number(it.amountUSD || 0), 0);
  const localGross = invoices.reduce((acc, i) => acc + Number(i.subtotalUSD || 0), 0);
  const localDiscounts = invoices.reduce((acc, i) => acc + Number(i.discountAmountUSD || 0), 0);
  const localSC = invoices.reduce((acc, i) => acc + Number(i.serviceChargeAmountUSD || 0), 0);
  const localVAT = invoices.reduce((acc, i) => acc + Number(i.taxAmountUSD || 0), 0);

  const data = report || {
    range: selectedPeriod,
    dateLabel: `Real Database Ledger (${selectedPeriod.toUpperCase()})`,
    startDate: '',
    endDate: '',
    roomStayRevenueUSD: localRoomUSD,
    restaurantRevenueUSD: localDiningUSD,
    servicesRevenueUSD: localServicesUSD,
    totalGrossRevenueUSD: localGross,
    discountsGivenUSD: localDiscounts,
    serviceChargeCollectedUSD: localSC,
    taxCollectedUSD: localVAT,
    expensesUSD: 0,
    netOperatingIncomeUSD: localGross - localDiscounts,
    totalInvoicesCount: invoices.length,
    paidInvoicesCount: invoices.filter((i) => i.paymentStatus === 'paid').length,
    pendingInvoicesCount: invoices.filter((i) => i.paymentStatus !== 'paid').length,
    amountCollectedUSD: invoices.reduce((acc, i) => acc + Number(i.amountPaidUSD || 0), 0),
    balanceReceivableUSD: invoices.reduce((acc, i) => acc + Number(i.balanceDueUSD || 0), 0),
    expectedCashDrawerUSD: 0,
    irdSubmittedCount: 0,
    expenses: [],
  };

  return (
    <div className="space-y-6">
      {/* Period Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase text-amber-700 dark:text-amber-400">
            Real-Time Financial Ledger &amp; P&amp;L Statement
          </span>
          <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50">
            Revenue, Statutory Tax &amp; Operating Cost Accounting
          </h3>
          <p className="text-xs text-stone-500">
            {data.dateLabel} · Computed strictly from persisted folios, settlements &amp; expense vouchers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-semibold">
            {(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as AccountingPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                  selectedPeriod === p
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 shadow-sm'
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => fetchAccountingData(selectedPeriod)}
            disabled={loading}
            className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer"
            title="Refresh Database Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Financial Key Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500">
            <span>Gross Folio Revenue</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-semibold tracking-tight font-sans tabular-nums text-stone-900 dark:text-stone-50 mt-1">
            {formatCurrency(convertPrice(data.totalGrossRevenueUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}
          </div>
          <div className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-mono">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>
              Collected: {formatCurrency(convertPrice(data.amountCollectedUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500">
            <span>Net Operating Income</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-semibold tracking-tight font-sans tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
            {formatCurrency(convertPrice(data.netOperatingIncomeUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1 font-mono">
            Gross less discounts &amp; recorded OPEX
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500">
            <span>Tax (13% VAT) Liability</span>
            <Percent className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-semibold tracking-tight font-sans tabular-nums text-sky-700 dark:text-sky-400 mt-1">
            {formatCurrency(convertPrice(data.taxCollectedUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1 font-mono">
            {data.irdSubmittedCount} IRD CBMS submitted
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500">
            <span>Service Charge (10%)</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-semibold tracking-tight font-sans tabular-nums text-indigo-700 dark:text-indigo-400 mt-1">
            {formatCurrency(convertPrice(data.serviceChargeCollectedUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1 font-mono">
            Receivable due: {formatCurrency(convertPrice(data.balanceReceivableUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}
          </div>
        </div>
      </div>

      {/* Revenue Breakdown + P&L Margin */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
          <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-50 border-b border-stone-200 dark:border-stone-800 pb-2">
            Departmental Revenue Breakdown ({selectedPeriod.toUpperCase()})
          </h4>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100">Room Stays &amp; Suites</div>
                  <div className="text-[11px] text-stone-400 font-mono">Authoritative night tariffs</div>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                {formatCurrency(convertPrice(data.roomStayRevenueUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100">Ground-Floor Restaurant &amp; Dining</div>
                  <div className="text-[11px] text-stone-400 font-mono">POS &amp; in-room dining folios</div>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                {formatCurrency(convertPrice(data.restaurantRevenueUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100">Transfers, Spa &amp; Concierge</div>
                  <div className="text-[11px] text-stone-400 font-mono">Airport pickups &amp; incidental charges</div>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                {formatCurrency(convertPrice(data.servicesRevenueUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}
              </div>
            </div>
          </div>

          {reconciliation && (
            <div className="pt-3 border-t border-stone-200 dark:border-stone-800">
              <div className="text-[11px] font-mono font-bold uppercase text-stone-500 mb-2">
                Gateway Payment Reconciliation
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300">Settled</div>
                  <div className="font-bold text-emerald-800 dark:text-emerald-200">
                    ${reconciliation.totalSettledUSD.toFixed(2)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                  <div className="text-[10px] text-amber-700 dark:text-amber-300">Pending Auth</div>
                  <div className="font-bold text-amber-800 dark:text-amber-200">
                    ${reconciliation.totalPendingUSD.toFixed(2)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
                  <div className="text-[10px] text-rose-700 dark:text-rose-300">Refunds</div>
                  <div className="font-bold text-rose-800 dark:text-rose-200">
                    ${reconciliation.totalRefundedUSD.toFixed(2)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  <div className="text-[10px] text-stone-500">Unpaid Folios</div>
                  <div className="font-bold text-stone-900 dark:text-stone-100">
                    {reconciliation.unmatchedInvoicesCount}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* P&L Margin Box */}
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4 text-xs font-mono">
          <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-50 font-sans border-b border-stone-200 dark:border-stone-800 pb-2">
            Operating Profit &amp; Loss
          </h4>

          <div className="space-y-2">
            <div className="flex justify-between text-stone-600 dark:text-stone-400">
              <span>Gross Folio Sales:</span>
              <span>{formatCurrency(convertPrice(data.totalGrossRevenueUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span>Promo Discounts:</span>
              <span>-{formatCurrency(convertPrice(data.discountsGivenUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span>Recorded OPEX ({data.expenses.length}):</span>
              <span>-{formatCurrency(convertPrice(data.expensesUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}</span>
            </div>
            <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
              <span>Service Charge Pool:</span>
              <span>+{formatCurrency(convertPrice(data.serviceChargeCollectedUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}</span>
            </div>
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex justify-between font-bold text-sm text-emerald-700 dark:text-emerald-400 font-sans">
              <span>Net Operating Income:</span>
              <span>{formatCurrency(convertPrice(data.netOperatingIncomeUSD, currentCurrency, themeConfig.exchangeRates), currentCurrency)}</span>
            </div>
          </div>

          <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-lg text-[11px] text-stone-500 font-sans mt-3">
            Folios in range:{' '}
            <strong className="text-stone-800 dark:text-stone-200">{data.totalInvoicesCount} total</strong> (
            {data.paidInvoicesCount} settled, {data.pendingInvoicesCount} pending settlement).
          </div>
        </div>
      </div>

      {/* Operating Expenses Ledger & Add Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-3">
          <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-600" />
            <span>Record Operating Expense (OPEX)</span>
          </h4>
          <form onSubmit={handleAddExpense} className="space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-2"
              >
                <option value="utilities">Electricity / Water / Gas</option>
                <option value="kitchen_fnb">Kitchen Supplies</option>
                <option value="payroll">Staff Payroll</option>
                <option value="maintenance">Repairs &amp; Maintenance</option>
                <option value="laundry">Housekeeping &amp; Laundry</option>
                <option value="marketing">OTA / Marketing</option>
                <option value="general">General OPEX</option>
              </select>
              <input
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-2"
                required
              />
            </div>
            <input
              type="text"
              placeholder="Expense description (e.g., NEA Monthly Power Bill)"
              value={expDescription}
              onChange={(e) => setExpDescription(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Vendor (optional)"
                value={expVendor}
                onChange={(e) => setExpVendor(e.target.value)}
                className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-2"
              />
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Amount (USD)"
                value={expAmountUSD}
                onChange={(e) => setExpAmountUSD(e.target.value)}
                className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-2 font-mono"
                required
              />
            </div>
            <button
              type="submit"
              disabled={savingExpense}
              className={`w-full py-2.5 rounded-lg font-semibold text-xs text-white transition cursor-pointer ${themeClasses.primary}`}
            >
              {savingExpense ? 'Recording Expense...' : 'Save Operating Expense'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-50">
              Recorded Operating Expenses ({data.expenses.length})
            </h4>
            <span className="text-xs font-mono text-rose-600 font-bold">
              Total: -${data.expensesUSD.toFixed(2)}
            </span>
          </div>
          {data.expenses.length === 0 ? (
            <p className="text-xs text-stone-500 py-4 text-center">
              No operating expenses recorded for {selectedPeriod}.
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 text-xs">
              {data.expenses.map((exp) => (
                <div key={exp.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-stone-800 dark:text-stone-200">{exp.description}</div>
                    <div className="text-[11px] text-stone-400 font-mono">
                      {exp.expenseDate} · {exp.category} {exp.vendor ? `· ${exp.vendor}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-rose-600">-${Number(exp.amountUSD).toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="text-stone-400 hover:text-rose-600 cursor-pointer"
                      title="Delete expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nepal IRD CBMS Integration Panel */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <div>
              <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-50">
                Nepal IRD CBMS (Central Billing Monitoring System) Tax Sync
              </h4>
              <p className="text-[11px] text-stone-500">
                Sequential VAT invoice compliance logging for Inland Revenue Department Nepal
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
            Logs recorded: {irdLogs.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-stone-800/80 text-stone-500 font-semibold">
              <tr>
                <th className="py-2 px-3">Invoice #</th>
                <th className="py-2 px-3">Guest / Room</th>
                <th className="py-2 px-3 text-right">Total (USD)</th>
                <th className="py-2 px-3 text-center">IRD Status</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {invoices.slice(0, 6).map((inv) => {
                const latestLog = irdLogs.find((l) => l.invoiceId === inv.id);
                return (
                  <tr key={inv.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 text-stone-600 dark:text-stone-300">
                      {inv.guestName} · {inv.roomNumber}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">${inv.grandTotalUSD.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-center">
                      {latestLog?.status === 'submitted' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          <FileCheck2 className="w-3 h-3" /> Submitted
                        </span>
                      ) : latestLog?.status === 'failed' || latestLog?.status === 'queued_pending_config' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="w-3 h-3" /> {latestLog.status}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-stone-400">Not submitted</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        disabled={submittingIrdId === inv.id}
                        onClick={() => handleSubmitIrd(inv.id)}
                        className="px-2.5 py-1 rounded bg-stone-900 dark:bg-amber-700 hover:bg-stone-800 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {submittingIrdId === inv.id ? 'Syncing...' : 'Sync IRD CBMS'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
