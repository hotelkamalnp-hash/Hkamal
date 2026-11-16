import React, { useRef, useState } from 'react';
import { MasterInvoice, BillSettings, CurrencyCode, BillItemLine } from '../../types/hotel';
import { formatCurrency, convertPrice } from '../../utils/theme';
import { 
  Printer, 
  Download, 
  X, 
  CheckCircle2, 
  Building2, 
  QrCode, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard,
  FileText,
  Tag,
  Plus,
  Trash2,
  SlidersHorizontal,
  Percent
} from 'lucide-react';
import { useModalDismiss, ModalDismissButton } from '../Common/ModalDismissHandler';
import { useHotel } from '../../context/HotelContext';
import { printElement, downloadInvoicePdf } from '../../utils/printUtility';

interface InvoicePrintModalProps {
  invoice: MasterInvoice;
  billSettings: BillSettings;
  currency: CurrencyCode;
  onClose: () => void;
  onMarkPaid?: () => void;
  onUpdateInvoice?: (updated: MasterInvoice) => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  invoice: initialInvoice,
  billSettings,
  currency,
  onClose,
  onMarkPaid,
  onUpdateInvoice
}) => {
  const { themeConfig } = useHotel();
  const [invoice, setInvoice] = useState<MasterInvoice>(initialInvoice);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(initialInvoice.discountPercent || 0);
  const [adjustmentDesc, setAdjustmentDesc] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [printStatusNotice, setPrintStatusNotice] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useModalDismiss({
    isOpen: true,
    onClose,
  });

  const handlePrint = () => {
    setPrintStatusNotice('Opening print dialog...');
    const ok = printElement('printable-invoice-area', `Invoice_${invoice.invoiceNumber}`);
    if (ok) {
      setPrintStatusNotice('Print dialog dispatched. You can also download a genuine PDF copy.');
    } else {
      setPrintStatusNotice('Direct print unavailable in this window. Downloading PDF invoice...');
      handleDownloadPdf();
    }
    setTimeout(() => setPrintStatusNotice(null), 5000);
  };

  const handleDownloadPdf = () => {
    downloadInvoicePdf(invoice, billSettings, currency, themeConfig.exchangeRates);
    setPrintStatusNotice(`Downloaded PDF: Kamal_Hotel_Invoice_${invoice.invoiceNumber}.pdf`);
    setTimeout(() => setPrintStatusNotice(null), 5000);
  };

  const applyDiscount = (newPercent: number) => {
    setDiscountPercent(newPercent);
    const subtotal = invoice.items.reduce((acc: number, it: BillItemLine) => acc + it.amountUSD, 0);
    const discAmount = (subtotal * newPercent) / 100;
    const discountedSub = Math.max(0, subtotal - discAmount);
    const scPct = invoice.serviceChargePercent ?? 10;
    const vatPct = invoice.taxPercent ?? 13;
    const scAmount = (discountedSub * scPct) / 100;
    const vatBase = discountedSub + scAmount;
    const taxAmount = (vatBase * vatPct) / 100;
    const grandTotal = Math.round((vatBase + taxAmount) * 100) / 100;
    const balance = Math.max(0, grandTotal - invoice.amountPaidUSD);

    const updated: MasterInvoice = {
      ...invoice,
      discountPercent: newPercent,
      discountAmountUSD: discAmount,
      serviceChargeAmountUSD: scAmount,
      taxAmountUSD: taxAmount,
      grandTotalUSD: grandTotal,
      balanceDueUSD: balance,
    };
    setInvoice(updated);
    if (onUpdateInvoice) onUpdateInvoice(updated);
  };

  const handleAddLineItem = () => {
    if (!adjustmentDesc.trim() || adjustmentAmount === 0) return;
    const newItem: BillItemLine = {
      id: 'adj-' + Date.now(),
      description: adjustmentDesc.trim(),
      category: 'other',
      date: new Date().toISOString().split('T')[0],
      quantity: 1,
      rateUSD: adjustmentAmount,
      amountUSD: adjustmentAmount,
    };
    const updatedItems = [...invoice.items, newItem];
    const subtotal = updatedItems.reduce((acc: number, it: BillItemLine) => acc + it.amountUSD, 0);
    const discAmount = (subtotal * discountPercent) / 100;
    const discountedSub = Math.max(0, subtotal - discAmount);
    const scPct = invoice.serviceChargePercent ?? 10;
    const vatPct = invoice.taxPercent ?? 13;
    const scAmount = (discountedSub * scPct) / 100;
    const vatBase = discountedSub + scAmount;
    const taxAmount = (vatBase * vatPct) / 100;
    const grandTotal = Math.round((vatBase + taxAmount) * 100) / 100;
    const balance = Math.max(0, grandTotal - invoice.amountPaidUSD);

    const updated: MasterInvoice = {
      ...invoice,
      items: updatedItems,
      subtotalUSD: subtotal,
      discountPercent,
      discountAmountUSD: discAmount,
      serviceChargeAmountUSD: scAmount,
      taxAmountUSD: taxAmount,
      grandTotalUSD: grandTotal,
      balanceDueUSD: balance,
    };
    setInvoice(updated);
    if (onUpdateInvoice) onUpdateInvoice(updated);
    setAdjustmentDesc('');
    setAdjustmentAmount(0);
  };

  const handleRemoveLineItem = (itemId: string) => {
    const updatedItems = invoice.items.filter((it: BillItemLine) => it.id !== itemId);
    const subtotal = updatedItems.reduce((acc: number, it: BillItemLine) => acc + it.amountUSD, 0);
    const discAmount = (subtotal * discountPercent) / 100;
    const discountedSub = Math.max(0, subtotal - discAmount);
    const scPct = invoice.serviceChargePercent ?? 10;
    const vatPct = invoice.taxPercent ?? 13;
    const scAmount = (discountedSub * scPct) / 100;
    const vatBase = discountedSub + scAmount;
    const taxAmount = (vatBase * vatPct) / 100;
    const grandTotal = Math.round((vatBase + taxAmount) * 100) / 100;
    const balance = Math.max(0, grandTotal - invoice.amountPaidUSD);

    const updated: MasterInvoice = {
      ...invoice,
      items: updatedItems,
      subtotalUSD: subtotal,
      discountPercent,
      discountAmountUSD: discAmount,
      serviceChargeAmountUSD: scAmount,
      taxAmountUSD: taxAmount,
      grandTotalUSD: grandTotal,
      balanceDueUSD: balance,
    };
    setInvoice(updated);
    if (onUpdateInvoice) onUpdateInvoice(updated);
  };

  const template = billSettings.template;

  return (
    <div 
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-4xl w-full border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh] animate-fade-in">
        
        {/* Modal Top Control Bar (Hidden during actual print) */}
        <div className="p-4 bg-stone-100 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-50">
                Official Hotel Bill & Folio · {invoice.invoiceNumber}
              </h3>
              <p className="text-[11px] text-stone-500 font-mono">
                Room: <span className="font-bold text-amber-700 dark:text-amber-400">{invoice.roomNumber}</span> · PAN/VAT: {billSettings.panVatNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Pre-Print Adjustment Toggle */}
            <button
              onClick={() => setShowAdjustments(!showAdjustments)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                showAdjustments
                  ? 'bg-amber-600 text-white border-amber-700'
                  : 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-600'
              }`}
              title="Apply discount or adjust bill line items before printing"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showAdjustments ? 'Hide Adjustments' : 'Edit Discount & Items'}</span>
            </button>

            {invoice.paymentStatus !== 'paid' && onMarkPaid && (
              <button
                onClick={onMarkPaid}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Paid</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              title="Send to physical printer or browser print dialog"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              title="Download standalone file with auto-print & save as PDF capability"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save / Download PDF</span>
            </button>

            <ModalDismissButton onClose={onClose} ariaLabel="Close bill preview" />
          </div>
        </div>

        {/* Dynamic Status / Sandbox Notice Banner */}
        {printStatusNotice && (
          <div className="px-4 py-2 bg-amber-100 dark:bg-amber-950/80 border-b border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between print:hidden animate-fade-in">
            <span className="font-medium flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-amber-700" />
              {printStatusNotice}
            </span>
            <button
              onClick={() => setPrintStatusNotice(null)}
              className="text-amber-800 hover:text-amber-950 text-xs font-bold px-1.5 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Pre-Print Adjustments Panel (Collapsible, print:hidden) */}
        {showAdjustments && (
          <div className="p-4 bg-amber-50/70 dark:bg-stone-800/80 border-b border-amber-200/80 dark:border-stone-700 print:hidden space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                Pre-Print Discount & Final Adjustments (Recalculates 10% Service Charge + 13% Nepal VAT)
              </span>
              <span className="text-[11px] text-stone-500">
                All changes reflect live in the preview below and print output
              </span>
            </div>

            {/* Quick Discount Buttons + Percentage Slider */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-stone-900 p-3 rounded-xl border border-amber-200 dark:border-stone-700">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Apply Discount Percentage (%):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={discountPercent}
                    onChange={(e) => applyDiscount(Number(e.target.value))}
                    className="flex-1 accent-amber-600"
                  />
                  <span className="font-mono font-bold text-sm w-12 text-right text-amber-900 dark:text-amber-300">
                    {discountPercent}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyDiscount(pct)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                        discountPercent === pct
                          ? 'bg-amber-700 text-white'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                      }`}
                    >
                      {pct === 0 ? 'None' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Custom Charge / Waiver Line Item */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Add Custom Adjustment (e.g. Late Checkout, Waiver):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Description (e.g. Courtesy Breakfast Deduction)"
                    value={adjustmentDesc}
                    onChange={(e) => setAdjustmentDesc(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs border border-stone-300 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800"
                  />
                  <input
                    type="number"
                    placeholder="USD (+/-)"
                    value={adjustmentAmount || ''}
                    onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                    className="w-20 px-2 py-1 text-xs font-mono border border-stone-300 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    disabled={!adjustmentDesc.trim() || adjustmentAmount === 0}
                    className="px-2.5 py-1 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  Enter negative amount (e.g. -10) for deductions or positive (e.g. 15) for additional charges.
                </p>
              </div>
            </div>

            {/* Existing Line Items removal control */}
            <div className="bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700">
              <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                Current Bill Line Items ({invoice.items.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {invoice.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-lg text-[11px]"
                  >
                    <span className="font-medium text-stone-800 dark:text-stone-200">
                      {it.quantity}x {it.description}
                    </span>
                    <span className="font-mono font-bold text-amber-800 dark:text-amber-400">
                      ${it.amountUSD.toFixed(2)}
                    </span>
                    {invoice.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(it.id)}
                        className="text-stone-400 hover:text-red-600 transition ml-1"
                        title="Remove line item"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Printable Bill Area - Target for @media print */}
        <div id="printable-invoice-area" className="p-6 sm:p-10 overflow-y-auto bg-white text-stone-900 font-sans" ref={printAreaRef}>
          
          {/* ==================== TEMPLATE 1: HERITAGE GOLD (ELEGANT NEWARI) ==================== */}
          {template === 'heritage-gold' && (
            <div className="space-y-6 border-4 border-amber-900/20 p-6 sm:p-8 rounded-xl bg-amber-50/20">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-amber-800/40 pb-6">
                <div className="flex items-center gap-4">
                  {billSettings.hotelLogoUrl && (
                    <img 
                      src={billSettings.hotelLogoUrl} 
                      alt="Kamal Hotel Logo" 
                      className="h-16 w-16 object-contain rounded-lg border border-amber-900/20 bg-white p-1"
                    />
                  )}
                  <div>
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-amber-950 uppercase">
                      {billSettings.hotelLegalName}
                    </h1>
                    <p className="text-xs text-amber-900/80 font-medium">{billSettings.addressLine || 'Kamalpokhari Marg, Ward No. 1, Kathmandu, Nepal'}</p>
                    <div className="text-[11px] text-amber-800/70 font-mono mt-1">
                      PAN/VAT Reg: <span className="font-bold text-amber-950">{billSettings.panVatNumber}</span> · Ph: {billSettings.contactSupportPhone} {billSettings.contactEmail ? `· ${billSettings.contactEmail}` : ''}
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right font-mono">
                  <div className="inline-block px-3 py-1 bg-amber-900 text-amber-100 text-xs font-bold uppercase tracking-wider rounded">
                    TAX INVOICE / GUEST FOLIO
                  </div>
                  {billSettings.watermarkText && (
                    <div className="text-[9px] text-amber-800/60 uppercase font-mono tracking-widest mt-0.5">
                      {billSettings.watermarkText}
                    </div>
                  )}
                  <div className="text-sm font-bold text-amber-950 mt-1">{invoice.invoiceNumber}</div>
                  <div className="text-xs text-stone-500">Date: {invoice.issuedAt}</div>
                  <div className="text-xs text-stone-500">Booking Ref: <span className="font-bold text-stone-800">{invoice.bookingCode}</span></div>
                </div>
              </div>

              {/* Guest & Room Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-amber-100/40 p-4 rounded-lg text-xs">
                <div>
                  <span className="text-stone-500 block uppercase font-mono text-[10px]">Guest Name</span>
                  <span className="font-bold text-stone-900 text-sm">{invoice.guestName}</span>
                </div>
                <div>
                  <span className="text-stone-500 block uppercase font-mono text-[10px]">Allocated Room</span>
                  <span className="font-bold text-amber-900 text-sm">{invoice.roomNumber}</span>
                </div>
                <div>
                  <span className="text-stone-500 block uppercase font-mono text-[10px]">Check-In / Out</span>
                  <span className="font-mono text-stone-800">{invoice.checkInDate} &rarr; {invoice.checkOutDate}</span>
                </div>
                <div>
                  <span className="text-stone-500 block uppercase font-mono text-[10px]">Payment Status</span>
                  <span className={`font-bold uppercase font-mono ${invoice.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    ● {invoice.paymentStatus} ({invoice.paymentMethod})
                  </span>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-xs text-left">
                <thead className="bg-amber-900 text-amber-50 uppercase font-mono text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Service / Particulars</th>
                    <th className="py-2.5 px-2 text-center">Category</th>
                    <th className="py-2.5 px-2 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate ({currency})</th>
                    <th className="py-2.5 px-3 text-right">Amount ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-900/10">
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-amber-50/50">
                      <td className="py-2.5 px-3 font-medium text-stone-900">
                        {item.description}
                        <span className="block text-[10px] text-stone-400 font-mono">{item.date}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center uppercase font-mono text-[10px] text-amber-800">
                        {item.category.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {formatCurrency(convertPrice(item.rateUSD, currency), currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                        {formatCurrency(convertPrice(item.amountUSD, currency), currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Calculations Box */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t-2 border-amber-900/20">
                <div className="max-w-xs text-[11px] text-stone-500 space-y-2">
                  <p className="italic">“{billSettings.footerNote}”</p>
                  <p className="text-[10px] text-stone-400">{billSettings.termsAndConditions}</p>
                </div>

                <div className="w-full sm:w-72 space-y-1.5 text-xs font-mono bg-amber-50/60 p-4 rounded-lg border border-amber-900/10">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(convertPrice(invoice.subtotalUSD, currency), currency)}</span>
                  </div>

                  {invoice.discountAmountUSD > 0 && (
                    <div className="flex justify-between text-rose-700 font-semibold">
                      <span>Discount ({invoice.discountPercent}%):</span>
                      <span>-{formatCurrency(convertPrice(invoice.discountAmountUSD, currency), currency)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-stone-600">
                    <span>{billSettings.serviceChargeLabel || 'Service Charge'} ({invoice.serviceChargePercent}%):</span>
                    <span>+{formatCurrency(convertPrice(invoice.serviceChargeAmountUSD, currency), currency)}</span>
                  </div>

                  <div className="flex justify-between text-stone-600">
                    <span>{billSettings.taxLabel || 'VAT'} ({invoice.taxPercent}%):</span>
                    <span>+{formatCurrency(convertPrice(invoice.taxAmountUSD, currency), currency)}</span>
                  </div>

                  <div className="flex justify-between text-base font-bold font-sans text-amber-950 pt-2 border-t-2 border-amber-900/30">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(convertPrice(invoice.grandTotalUSD, currency), currency)}</span>
                  </div>

                  <div className="flex justify-between text-stone-600 pt-1 text-[11px]">
                    <span>Amount Paid:</span>
                    <span>{formatCurrency(convertPrice(invoice.amountPaidUSD, currency), currency)}</span>
                  </div>

                  <div className="flex justify-between font-bold text-amber-900 pt-1 border-t border-amber-900/10">
                    <span>Balance Due:</span>
                    <span>{formatCurrency(convertPrice(invoice.balanceDueUSD, currency), currency)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures & QR */}
              <div className="flex flex-col sm:flex-row justify-between items-end gap-6 pt-6 border-t border-dashed border-amber-900/30 text-xs">
                {billSettings.showQrCodeForPayment && (
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-stone-100 border border-stone-300 rounded p-1 flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-stone-800" />
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">
                      <span>Scan to pay via eSewa / Fonepay</span>
                      <span className="block font-bold text-stone-800">Kamal Hotel Kathmandu</span>
                    </div>
                  </div>
                )}

                <div className="text-right">
                  <div className="h-10 border-b border-stone-400 w-48 mb-1"></div>
                  <span className="text-[11px] font-semibold text-stone-800 block">
                    {billSettings.authorizedSignatoryName}
                  </span>
                  <span className="text-[10px] text-stone-400 uppercase font-mono">
                    {billSettings.authorizedSignatoryTitle || 'Authorized Signatory'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TEMPLATE 2: EXECUTIVE MODERN (CLEAN CORPORATE) ==================== */}
          {template === 'executive-modern' && (
            <div className="space-y-6 p-4 sm:p-6 bg-white">
              <div className="flex justify-between items-start border-b-2 border-stone-900 pb-6">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-stone-900 uppercase">
                    INVOICE
                  </h1>
                  <p className="text-xs font-bold text-stone-700 mt-1">{billSettings.hotelLegalName}</p>
                  <p className="text-xs text-stone-500">Kamalpokhari, Kathmandu, Nepal</p>
                  <p className="text-xs text-stone-500 font-mono">VAT: {billSettings.panVatNumber}</p>
                </div>
                <div className="text-right font-mono text-xs space-y-1">
                  <div className="text-base font-bold text-stone-900">#{invoice.invoiceNumber}</div>
                  <div>Issued: {invoice.issuedAt}</div>
                  <div>Room: <span className="font-bold">{invoice.roomNumber}</span></div>
                  <div className={`font-bold uppercase ${invoice.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    Status: {invoice.paymentStatus}
                  </div>
                </div>
              </div>

              {/* Billed To */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-stone-50 p-4 rounded-lg">
                <div>
                  <span className="text-stone-400 font-mono uppercase text-[10px] block">Billed To</span>
                  <span className="font-bold text-sm text-stone-900">{invoice.guestName}</span>
                  <span className="block text-stone-500">{invoice.guestEmail}</span>
                  <span className="block text-stone-500">{invoice.guestPhone}</span>
                </div>
                <div className="text-right">
                  <span className="text-stone-400 font-mono uppercase text-[10px] block">Reservation Dates</span>
                  <span className="font-mono">{invoice.checkInDate} to {invoice.checkOutDate}</span>
                  <span className="block text-stone-500 font-mono">Code: {invoice.bookingCode}</span>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-100 text-stone-700 uppercase font-mono text-[10px] border-b">
                  <tr>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Price</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {invoice.items.map((i, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-3 font-medium text-stone-900">{i.description}</td>
                      <td className="py-3 px-2 text-center font-mono">{i.quantity}</td>
                      <td className="py-3 px-3 text-right font-mono">
                        {formatCurrency(convertPrice(i.rateUSD, currency), currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {formatCurrency(convertPrice(i.amountUSD, currency), currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="flex justify-end pt-4 border-t">
                <div className="w-64 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(convertPrice(invoice.subtotalUSD, currency), currency)}</span>
                  </div>
                  {invoice.discountAmountUSD > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(convertPrice(invoice.discountAmountUSD, currency), currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{billSettings.serviceChargeLabel || 'Service'} ({invoice.serviceChargePercent}%):</span>
                    <span>+{formatCurrency(convertPrice(invoice.serviceChargeAmountUSD, currency), currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{billSettings.taxLabel || 'Tax'} ({invoice.taxPercent}%):</span>
                    <span>+{formatCurrency(convertPrice(invoice.taxAmountUSD, currency), currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold font-sans pt-2 border-t-2 border-stone-900 text-stone-900">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(convertPrice(invoice.grandTotalUSD, currency), currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TEMPLATE 3: MINIMALIST CLEAN ==================== */}
          {template === 'minimalist-clean' && (
            <div className="space-y-6 text-stone-800 font-sans p-4">
              <div className="flex justify-between items-center pb-4 border-b border-stone-200">
                <div>
                  <h2 className="text-xl font-light tracking-wide text-stone-900 uppercase">
                    {billSettings.hotelLegalName}
                  </h2>
                  <p className="text-xs text-stone-400">Kathmandu · VAT {billSettings.panVatNumber}</p>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-stone-400">Folio: </span>
                  <span className="font-bold">{invoice.invoiceNumber}</span>
                </div>
              </div>

              <div className="text-xs flex justify-between py-2 text-stone-600">
                <div>Guest: <strong className="text-stone-900">{invoice.guestName}</strong> ({invoice.roomNumber})</div>
                <div>Dates: {invoice.checkInDate} — {invoice.checkOutDate}</div>
              </div>

              <div className="divide-y divide-stone-100 text-xs">
                {invoice.items.map((it, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-stone-900">{it.description}</div>
                      <div className="text-[10px] text-stone-400 font-mono">Qty: {it.quantity}</div>
                    </div>
                    <div className="font-mono font-medium">
                      {formatCurrency(convertPrice(it.amountUSD, currency), currency)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-stone-200 space-y-1 text-xs text-right font-mono">
                <div>Total Tax & Service: +{formatCurrency(convertPrice(invoice.taxAmountUSD + invoice.serviceChargeAmountUSD, currency), currency)}</div>
                <div className="text-base font-bold text-stone-900 pt-1">
                  Due: {formatCurrency(convertPrice(invoice.grandTotalUSD, currency), currency)}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TEMPLATE 4: REGAL HIMALAYAN (BURGUNDY & SAPPHIRE) ==================== */}
          {template === 'regal-himalayan' && (
            <div className="space-y-6 p-6 sm:p-8 rounded-xl bg-gradient-to-br from-rose-950/5 via-stone-50 to-amber-950/5 border-2 border-rose-900/30">
              <div className="flex justify-between items-center border-b-2 border-rose-900 pb-4">
                <div className="flex items-center gap-3">
                  {billSettings.hotelLogoUrl && (
                    <img src={billSettings.hotelLogoUrl} alt="Logo" className="w-14 h-14 object-contain rounded" />
                  )}
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-rose-950 tracking-wider">
                      KAMAL HOTEL LUXURY RESIDENCE
                    </h2>
                    <p className="text-xs text-rose-900/70">Kamalpokhari Heritage District, Kathmandu</p>
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div className="text-rose-900 font-bold text-sm">FOLIO: {invoice.invoiceNumber}</div>
                  <div className="text-stone-500">{invoice.issuedAt}</div>
                </div>
              </div>

              {/* Items */}
              <table className="w-full text-xs">
                <thead className="bg-rose-950 text-white font-mono text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Description</th>
                    <th className="py-2.5 px-2 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Amount ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-950/10">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/50">
                      <td className="py-2.5 px-3 font-medium text-stone-900">{item.description}</td>
                      <td className="py-2.5 px-2 text-center font-mono">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-950">
                        {formatCurrency(convertPrice(item.amountUSD, currency), currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pt-4 border-t-2 border-rose-900/30">
                <div className="w-72 space-y-1.5 text-xs font-mono bg-rose-50/50 p-4 rounded-lg border border-rose-900/20">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(convertPrice(invoice.subtotalUSD, currency), currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{billSettings.serviceChargeLabel || 'Service'} ({invoice.serviceChargePercent}%):</span>
                    <span>+{formatCurrency(convertPrice(invoice.serviceChargeAmountUSD, currency), currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{billSettings.taxLabel || 'VAT'} ({invoice.taxPercent}%):</span>
                    <span>+{formatCurrency(convertPrice(invoice.taxAmountUSD, currency), currency)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold font-serif text-rose-950 pt-2 border-t border-rose-900/20">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(convertPrice(invoice.grandTotalUSD, currency), currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TEMPLATE 5: COMPACT POS THERMAL ==================== */}
          {template === 'compact-pos-thermal' && (
            <div className="max-w-xs mx-auto font-mono text-xs space-y-3 p-4 border border-dashed border-stone-400 bg-stone-50 rounded">
              <div className="text-center space-y-1 pb-2 border-b border-dashed border-stone-300">
                <div className="font-bold text-sm uppercase">{billSettings.hotelLegalName}</div>
                <div className="text-[10px] text-stone-500">{billSettings.addressLine || 'Kamalpokhari, Kathmandu'}</div>
                <div className="text-[10px] text-stone-500">PAN: {billSettings.panVatNumber}</div>
                <div className="text-[10px]">RCPT #{invoice.invoiceNumber}</div>
                <div className="text-[10px]">{invoice.issuedAt}</div>
              </div>

              <div className="text-[11px] space-y-1 border-b border-dashed border-stone-300 pb-2">
                <div>GUEST: {invoice.guestName}</div>
                <div>ROOM: {invoice.roomNumber}</div>
              </div>

              <div className="space-y-1.5 border-b border-dashed border-stone-300 pb-2 text-[11px]">
                {invoice.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate max-w-[180px]">{it.quantity}x {it.description}</span>
                    <span className="font-bold">{formatCurrency(convertPrice(it.amountUSD, currency), currency)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>{formatCurrency(convertPrice(invoice.subtotalUSD, currency), currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{billSettings.serviceChargeLabel || 'SVC'} ({invoice.serviceChargePercent}%):</span>
                  <span>+{formatCurrency(convertPrice(invoice.serviceChargeAmountUSD, currency), currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{billSettings.taxLabel || 'VAT'} ({invoice.taxPercent}%):</span>
                  <span>+{formatCurrency(convertPrice(invoice.taxAmountUSD, currency), currency)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-stone-400">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(convertPrice(invoice.grandTotalUSD, currency), currency)}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-stone-400 pt-2 italic">
                {billSettings.footerNote}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
