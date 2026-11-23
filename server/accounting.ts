import crypto from 'crypto';
import type {
  BillSettings,
  Booking,
  MasterInvoice,
  NightAuditRecord,
  RestaurantOrder,
  RoomOperationalUnit,
} from '../src/types/hotel';
import {
  deleteCollectionItem,
  getCollectionItem,
  getKvSetting,
  listCollection,
  runInSqliteTransaction,
  upsertCollectionItem,
  type ExpenseRecord,
  type IrdCbmsLogRecord,
  type PaymentTransactionRecord,
} from './db.ts';
import { broadcastRealtimeEvent } from './realtime.ts';

export type AccountingRange = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all' | 'custom';

function extractIsoDatePrefix(dateOrTimestamp?: string): string {
  if (!dateOrTimestamp) return '';
  return dateOrTimestamp.slice(0, 10);
}

function getDateWindow(range: AccountingRange, startDate?: string, endDate?: string): { start: string; end: string } {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  if (range === 'custom' && startDate && endDate) {
    return { start: startDate, end: endDate };
  }
  if (range === 'all') {
    return { start: '2000-01-01', end: '2099-12-31' };
  }
  const d = new Date(now);
  if (range === 'daily') {
    return { start: todayIso, end: todayIso };
  }
  if (range === 'weekly') {
    d.setDate(d.getDate() - 6);
    return { start: d.toISOString().slice(0, 10), end: '2099-12-31' };
  }
  if (range === 'monthly') {
    d.setDate(1);
    return { start: d.toISOString().slice(0, 10), end: '2099-12-31' };
  }
  if (range === 'quarterly') {
    d.setMonth(d.getMonth() - 3);
    return { start: d.toISOString().slice(0, 10), end: '2099-12-31' };
  }
  d.setMonth(0, 1);
  return { start: d.toISOString().slice(0, 10), end: '2099-12-31' };
}

export function buildRealFinancialReport(params: {
  range?: AccountingRange;
  startDate?: string;
  endDate?: string;
}) {
  const range: AccountingRange = params.range || 'all';
  const windowBounds = getDateWindow(range, params.startDate, params.endDate);

  const allInvoices = listCollection<MasterInvoice>('invoices');
  const allExpenses = listCollection<ExpenseRecord>('expenses');
  const allOrders = listCollection<RestaurantOrder>('restaurantOrders');
  const allTransactions = listCollection<PaymentTransactionRecord>('paymentTransactions');
  const irdLogs = listCollection<IrdCbmsLogRecord>('irdCbmsLogs');

  const inWindow = (dateStr?: string) => {
    const d = extractIsoDatePrefix(dateStr);
    if (!d) return range === 'all';
    return d >= windowBounds.start && d <= windowBounds.end;
  };

  const invoices = allInvoices.filter((inv) => inWindow(inv.issuedAt));
  const expenses = allExpenses.filter((exp) => inWindow(exp.expenseDate));
  const orders = allOrders.filter((o) => o.status !== 'cancelled' && inWindow(o.createdAt));

  let roomRevenueUSD = 0;
  let diningBilledInInvoicesUSD = 0;
  let ancillaryServicesUSD = 0;
  let discountsTotalUSD = 0;
  let serviceChargeTotalUSD = 0;
  let vatTaxTotalUSD = 0;
  let grandTotalBilledUSD = 0;
  let cashCollectedOnFoliosUSD = 0;
  let outstandingReceivablesUSD = 0;

  let auditMismatchesCount = 0;

  for (const inv of invoices) {
    let lineSum = 0;
    for (const item of inv.items) {
      lineSum += item.amountUSD;
      if (item.category === 'room_stay') roomRevenueUSD += item.amountUSD;
      else if (item.category === 'restaurant_dining') diningBilledInInvoicesUSD += item.amountUSD;
      else ancillaryServicesUSD += item.amountUSD;
    }

    const expectedTaxable = Math.max(0, lineSum - (inv.discountAmountUSD || 0)) + (inv.serviceChargeAmountUSD || 0);
    const expectedGrand = Math.round((expectedTaxable + (inv.taxAmountUSD || 0)) * 100) / 100;
    if (Math.abs(expectedGrand - inv.grandTotalUSD) > 0.25) {
      auditMismatchesCount += 1;
    }

    discountsTotalUSD += inv.discountAmountUSD || 0;
    serviceChargeTotalUSD += inv.serviceChargeAmountUSD || 0;
    vatTaxTotalUSD += inv.taxAmountUSD || 0;
    grandTotalBilledUSD += inv.grandTotalUSD || 0;
    cashCollectedOnFoliosUSD += inv.amountPaidUSD || 0;
    outstandingReceivablesUSD += inv.balanceDueUSD || 0;
  }

  // Add standalone POS orders not already double-counted as invoice line items
  const standalonePosRevenueUSD = orders
    .filter((o) => o.destination !== 'room')
    .reduce((acc, o) => acc + (o.totalAmountUSD || 0), 0);

  const fAndBRevenueUSD = Math.round((diningBilledInInvoicesUSD + standalonePosRevenueUSD) * 100) / 100;
  const opexExpensesUSD = Math.round(expenses.reduce((acc, e) => acc + Number(e.amountUSD || 0), 0) * 100) / 100;

  const totalGrossRevenueUSD = Math.round((grandTotalBilledUSD + standalonePosRevenueUSD) * 100) / 100;
  const netProfitUSD = Math.round((totalGrossRevenueUSD - vatTaxTotalUSD - opexExpensesUSD) * 100) / 100;

  // Expenses by category
  const expenseByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    const cat = e.category || 'other';
    acc[cat] = Math.round(((acc[cat] || 0) + Number(e.amountUSD || 0)) * 100) / 100;
    return acc;
  }, {});

  // Payment method distribution directly from real invoices & verified payment transactions
  const paymentMix = {
    card: 0,
    esewa: 0,
    khalti: 0,
    onsite: 0,
  };
  const verifiedTxns = allTransactions.filter((t) => t.status === 'completed' && inWindow(t.createdAt));
  if (verifiedTxns.length > 0) {
    for (const t of verifiedTxns) {
      if (t.gateway === 'esewa') paymentMix.esewa += t.amountUSD;
      else if (t.gateway === 'khalti') paymentMix.khalti += t.amountUSD;
      else if (t.gateway === 'stripe_card') paymentMix.card += t.amountUSD;
      else if (t.gateway === 'onsite') paymentMix.onsite += t.amountUSD;
    }
  } else {
    for (const inv of invoices) {
      if (inv.paymentMethod === 'esewa') paymentMix.esewa += inv.amountPaidUSD;
      else if (inv.paymentMethod === 'khalti') paymentMix.khalti += inv.amountPaidUSD;
      else if (inv.paymentMethod === 'card') paymentMix.card += inv.amountPaidUSD;
      else paymentMix.onsite += inv.amountPaidUSD;
    }
  }

  const paidInvoicesCount = invoices.filter((i) => i.paymentStatus === 'paid').length;
  const pendingInvoicesCount = invoices.filter((i) => i.paymentStatus !== 'paid').length;

  const onsiteCashTxnsUSD = verifiedTxns
    .filter((t) => t.gateway === 'onsite')
    .reduce((acc, t) => acc + Number(t.amountUSD || 0), 0);
  const expectedCashDrawerUSD = Math.round(
    (onsiteCashTxnsUSD > 0
      ? onsiteCashTxnsUSD
      : invoices
          .filter((i) => i.paymentMethod === 'onsite')
          .reduce((acc, i) => acc + Number(i.amountPaidUSD || 0), 0)) * 100
  ) / 100;

  const roundedRoomUSD = Math.round(roomRevenueUSD * 100) / 100;
  const roundedAncillaryUSD = Math.round(ancillaryServicesUSD * 100) / 100;
  const roundedDiscountsUSD = Math.round(discountsTotalUSD * 100) / 100;
  const roundedSCUSD = Math.round(serviceChargeTotalUSD * 100) / 100;
  const roundedVatUSD = Math.round(vatTaxTotalUSD * 100) / 100;
  const roundedCollectedUSD = Math.round((cashCollectedOnFoliosUSD + standalonePosRevenueUSD) * 100) / 100;
  const roundedReceivableUSD = Math.round(outstandingReceivablesUSD * 100) / 100;
  const irdSubmittedCount = irdLogs.filter((l) => l.status === 'submitted').length;
  const dateLabel =
    range === 'all'
      ? 'All-Time Cumulative Ledger'
      : `${range.toUpperCase()} (${windowBounds.start} -> ${windowBounds.end === '2099-12-31' ? new Date().toISOString().slice(0, 10) : windowBounds.end})`;

  return {
    generatedAt: new Date().toISOString(),
    range,
    window: windowBounds,
    dateLabel,
    startDate: windowBounds.start,
    endDate: windowBounds.end === '2099-12-31' ? new Date().toISOString().slice(0, 10) : windowBounds.end,
    invoiceCount: invoices.length,
    expenseCount: expenses.length,
    orderCount: orders.length,
    // Compatibility flat fields for NightAuditManager & AccountingFinancialReports
    roomStayRevenueUSD: roundedRoomUSD,
    restaurantRevenueUSD: fAndBRevenueUSD,
    servicesRevenueUSD: roundedAncillaryUSD,
    totalGrossRevenueUSD,
    discountsGivenUSD: roundedDiscountsUSD,
    serviceChargeCollectedUSD: roundedSCUSD,
    taxCollectedUSD: roundedVatUSD,
    expensesUSD: opexExpensesUSD,
    netOperatingIncomeUSD: netProfitUSD,
    totalInvoicesCount: invoices.length,
    paidInvoicesCount,
    pendingInvoicesCount,
    amountCollectedUSD: roundedCollectedUSD,
    balanceReceivableUSD: roundedReceivableUSD,
    expectedCashDrawerUSD,
    irdSubmittedCount,
    metrics: {
      roomRevenueUSD: roundedRoomUSD,
      fAndBRevenueUSD,
      ancillaryServicesUSD: roundedAncillaryUSD,
      discountsTotalUSD: roundedDiscountsUSD,
      serviceChargeTotalUSD: roundedSCUSD,
      vatTaxTotalUSD: roundedVatUSD,
      grossRevenueUSD: totalGrossRevenueUSD,
      collectedRevenueUSD: roundedCollectedUSD,
      outstandingReceivablesUSD: roundedReceivableUSD,
      opexExpensesUSD,
      netProfitUSD,
      profitMarginPercent:
        totalGrossRevenueUSD > 0 ? Math.round((netProfitUSD / totalGrossRevenueUSD) * 1000) / 10 : 0,
    },
    paymentMixUSD: {
      card: Math.round(paymentMix.card * 100) / 100,
      esewa: Math.round(paymentMix.esewa * 100) / 100,
      khalti: Math.round(paymentMix.khalti * 100) / 100,
      onsite: Math.round(paymentMix.onsite * 100) / 100,
    },
    expenseByCategory,
    auditIntegrity: {
      verifiedFolios: invoices.length - auditMismatchesCount,
      mismatchCount: auditMismatchesCount,
      irdSyncedInvoicesCount: invoices.filter((i) => (i as any).irdSynced).length,
    },
    expenses,
    irdLogs,
  };
}

export function createExpenseRecord(
  input: Omit<ExpenseRecord, 'id' | 'createdAt'>
): { ok: true; expense: ExpenseRecord } | { ok: false; status: number; message: string } {
  const amount = Math.round(Number(input.amountUSD || 0) * 100) / 100;
  if (!input.description?.trim() || amount <= 0) {
    return { ok: false, status: 400, message: 'Expense description and positive USD amount are required.' };
  }
  const nowIso = new Date().toISOString();
  const expense: ExpenseRecord = {
    id: `exp-${crypto.randomUUID().slice(0, 8)}`,
    category: input.category || 'general',
    description: input.description.trim(),
    vendor: input.vendor?.trim() || undefined,
    amountUSD: amount,
    paymentMethod: input.paymentMethod || 'bank_transfer',
    expenseDate: input.expenseDate || nowIso.slice(0, 10),
    referenceNo: input.referenceNo?.trim() || undefined,
    recordedBy: input.recordedBy,
    createdAt: nowIso,
  };
  upsertCollectionItem('expenses', expense.id, expense);
  upsertCollectionItem('auditLogs', `log-${crypto.randomUUID().slice(0, 8)}`, {
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    timestamp: nowIso.slice(0, 19).replace('T', ' '),
    actorName: input.recordedBy,
    actorRole: 'Finance',
    action: 'Expense Logged',
    category: 'payment',
    details: `Recorded OPEX $${amount.toFixed(2)} (${expense.category}): ${expense.description}`,
    ipAddress: 'server',
  });
  broadcastRealtimeEvent('accounting:updated', { expense }, 'staff');
  return { ok: true, expense };
}

export function removeExpenseRecord(id: string): boolean {
  return deleteCollectionItem('expenses', id);
}

export function executeNightAudit(params: {
  auditDate?: string;
  auditorName: string;
  cashDrawerCountedUSD?: number;
  notes?: string;
}): NightAuditRecord {
  return runInSqliteTransaction(() => {
    const auditDate = params.auditDate || new Date().toISOString().slice(0, 10);
    const units = listCollection<RoomOperationalUnit>('roomUnits');
    const bookings = listCollection<Booking>('bookings');
    const invoices = listCollection<MasterInvoice>('invoices');
    const orders = listCollection<RestaurantOrder>('restaurantOrders');
    const transactions = listCollection<PaymentTransactionRecord>('paymentTransactions');

    const totalRoomsAvailable = Math.max(1, units.length);
    const occupiedUnits = units.filter((u) => u.occupancyStatus === 'occupied');
    const activeCheckInBookings = bookings.filter(
      (b) =>
        b.bookingStatus === 'checked-in' ||
        (b.bookingStatus === 'confirmed' && b.checkInDate <= auditDate && b.checkOutDate > auditDate)
    );

    const totalRoomsSold = Math.max(occupiedUnits.length, activeCheckInBookings.length);
    const occupancyPercentage = Math.round((totalRoomsSold / totalRoomsAvailable) * 100);

    const theme = getKvSetting<any>('themeConfig', {});
    const nprRate = Number(theme?.exchangeRates?.NPR || 135);
    const inrRate = Number(theme?.exchangeRates?.INR || 84.5);

    // Real DB room revenue from night stay rates of active checked-in/occupied rooms + invoices issued today
    const roomRevenueUSD = Math.round(
      activeCheckInBookings.reduce((acc, b) => {
        const nightly = b.nights > 0 ? b.subtotal / b.nights : b.subtotal;
        return acc + (b.currency === 'NPR' ? nightly / nprRate : b.currency === 'INR' ? nightly / inrRate : nightly);
      }, 0) * 100
    ) / 100;

    const dayOrders = orders.filter(
      (o) => o.status !== 'cancelled' && extractIsoDatePrefix(o.createdAt) === auditDate
    );
    const fAndBRevenueUSD = Math.round(dayOrders.reduce((acc, o) => acc + (o.totalAmountUSD || 0), 0) * 100) / 100;

    // Ancillary services strictly from DB invoice line items dated on auditDate (NO hardcoded 45!)
    let servicesRevenueUSD = 0;
    let serviceChargeCollectedUSD = 0;
    let vatCollectedUSD = 0;
    for (const inv of invoices) {
      if (extractIsoDatePrefix(inv.issuedAt) === auditDate) {
        serviceChargeCollectedUSD += inv.serviceChargeAmountUSD || 0;
        vatCollectedUSD += inv.taxAmountUSD || 0;
      }
      for (const line of inv.items) {
        if (
          line.date === auditDate &&
          line.category !== 'room_stay' &&
          line.category !== 'restaurant_dining'
        ) {
          servicesRevenueUSD += line.amountUSD || 0;
        }
      }
    }

    servicesRevenueUSD = Math.round(servicesRevenueUSD * 100) / 100;
    const totalRevenueUSD = Math.round((roomRevenueUSD + fAndBRevenueUSD + servicesRevenueUSD) * 100) / 100;
    const adrUSD = totalRoomsSold > 0 ? Math.round((roomRevenueUSD / totalRoomsSold) * 100) / 100 : 0;
    const revParUSD = Math.round((roomRevenueUSD / totalRoomsAvailable) * 100) / 100;

    const expectedOnsiteCashUSD = transactions
      .filter(
        (t) =>
          t.gateway === 'onsite' &&
          t.status === 'completed' &&
          extractIsoDatePrefix(t.createdAt) === auditDate
      )
      .reduce((acc, t) => acc + t.amountUSD, 0);

    const counted = params.cashDrawerCountedUSD ?? expectedOnsiteCashUSD;
    const cashDrawerDiscrepancyUSD = Math.round((counted - expectedOnsiteCashUSD) * 100) / 100;

    const existing = listCollection<NightAuditRecord>('nightAudits').find(
      (n) => n.auditDate === auditDate
    );
    const record: NightAuditRecord = {
      id: existing?.id || `na-${crypto.randomUUID().slice(0, 8)}`,
      auditDate,
      auditorName: params.auditorName,
      totalRoomsSold,
      totalRoomsAvailable,
      occupancyPercentage,
      roomRevenueUSD,
      fAndBRevenueUSD,
      servicesRevenueUSD,
      totalRevenueUSD,
      serviceChargeCollectedUSD: Math.round(serviceChargeCollectedUSD * 100) / 100,
      vatCollectedUSD: Math.round(vatCollectedUSD * 100) / 100,
      adrUSD,
      revParUSD,
      cashDrawerDiscrepancyUSD,
      status: 'closed',
      notes:
        params.notes ||
        `Night audit closed cleanly from live database records for ${auditDate}.`,
    };

    upsertCollectionItem('nightAudits', record.id, record);
    upsertCollectionItem('auditLogs', `log-${crypto.randomUUID().slice(0, 8)}`, {
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      actorName: params.auditorName,
      actorRole: 'Night Auditor',
      action: 'Night Audit Closed',
      category: 'booking',
      details: `Closed ${auditDate}: Rooms=${totalRoomsSold}/${totalRoomsAvailable} (${occupancyPercentage}%), Total Revenue=$${totalRevenueUSD.toFixed(2)}, Cash Variance=$${cashDrawerDiscrepancyUSD.toFixed(2)}.`,
      ipAddress: 'server',
    });

    broadcastRealtimeEvent('nightaudit:closed', record, 'staff');
    return record;
  });
}

export async function submitInvoiceToNepalIrdCbms(params: {
  invoiceId: string;
  fiscalYear?: string;
  actorName: string;
}): Promise<
  | { ok: true; log: IrdCbmsLogRecord; configured: boolean }
  | { ok: false; status: number; code: string; message: string; log?: IrdCbmsLogRecord }
> {
  const invoice = getCollectionItem<MasterInvoice>('invoices', params.invoiceId);
  if (!invoice) {
    return { ok: false, status: 404, code: 'INVOICE_NOT_FOUND', message: 'Invoice not found.' };
  }

  const billSettings = getKvSetting<BillSettings>('billSettings', {} as BillSettings);
  const endpoint = (process.env.IRD_CBMS_ENDPOINT || '').trim();
  const username = (process.env.IRD_CBMS_USERNAME || '').trim();
  const password = (process.env.IRD_CBMS_PASSWORD || '').trim();
  const sellerPan = (process.env.IRD_CBMS_SELLER_PAN || billSettings.panVatNumber || '').trim();

  const fiscalYear = params.fiscalYear || '2082/83';
  const nprRate = 135;
  const taxableSalesNpr = Math.round(
    (invoice.subtotalUSD - invoice.discountAmountUSD + invoice.serviceChargeAmountUSD) * nprRate * 100
  ) / 100;
  const vatNpr = Math.round(invoice.taxAmountUSD * nprRate * 100) / 100;
  const totalSalesNpr = Math.round((taxableSalesNpr + vatNpr) * 100) / 100;

  const payload = {
    username: username || 'UNCONFIGURED',
    password: password ? '***REDACTED_ON_REST***' : 'UNCONFIGURED',
    seller_pan: sellerPan,
    buyer_pan: (invoice as any).guestPan || '',
    fiscal_year: fiscalYear,
    buyer_name: invoice.guestName,
    invoice_number: invoice.invoiceNumber,
    invoice_date: invoice.issuedAt.slice(0, 10),
    total_sales: totalSalesNpr,
    taxable_sales_vat: taxableSalesNpr,
    vat: vatNpr,
    excisable_amount: 0,
    excise: 0,
    taxable_sales_hst: 0,
    hst: 0,
    amount_for_eservice: Math.round(invoice.serviceChargeAmountUSD * nprRate * 100) / 100,
    tax_exempted_sales: invoice.taxPercent === 0 ? totalSalesNpr : 0,
    isrealtime: true,
    datetimeclient: new Date().toISOString(),
  };

  const nowIso = new Date().toISOString();
  const log: IrdCbmsLogRecord & {
    totalWithVatNPR?: number;
    irdReceiptRef?: string;
    errorMessage?: string;
  } = {
    id: `ird-${crypto.randomUUID().slice(0, 8)}`,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    fiscalYear,
    payload,
    totalWithVatNPR: totalSalesNpr,
    status: 'queued',
    attempts: 1,
    createdAt: nowIso,
  };

  if (!endpoint || !username || !password || !sellerPan) {
    log.status = 'pending_credentials';
    log.errorMessage =
      'IRD CBMS credentials (IRD_CBMS_ENDPOINT, IRD_CBMS_USERNAME, IRD_CBMS_PASSWORD) not configured; payload staged.';
    log.responseBody = log.errorMessage;
    upsertCollectionItem('irdCbmsLogs', log.id, log);
    return {
      ok: false,
      status: 503,
      code: 'IRD_CBMS_NOT_CONFIGURED',
      message: log.responseBody,
      log,
    };
  }

  try {
    const livePayload = { ...payload, username, password };
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(livePayload),
    });
    const text = await resp.text();
    log.responseCode = resp.status;
    log.responseBody = text.slice(0, 500);
    if (resp.ok) {
      log.status = 'submitted';
      log.submittedAt = nowIso;
      log.irdReceiptRef = log.id;
      upsertCollectionItem('invoices', invoice.id, {
        ...invoice,
        irdSynced: true,
        irdSyncId: log.id,
      } as any);
    } else {
      log.status = 'failed';
      log.errorMessage = `IRD HTTP ${resp.status}: ${text.slice(0, 200)}`;
    }
    upsertCollectionItem('irdCbmsLogs', log.id, log);
    return resp.ok
      ? { ok: true, log, configured: true }
      : { ok: false, status: 502, code: 'IRD_CBMS_REJECTED', message: `IRD HTTP ${resp.status}: ${text}`, log };
  } catch (err) {
    log.status = 'failed';
    log.responseBody = err instanceof Error ? err.message : 'Network error';
    upsertCollectionItem('irdCbmsLogs', log.id, log);
    return { ok: false, status: 502, code: 'IRD_CBMS_ERROR', message: log.responseBody, log };
  }
}
