import { jsPDF } from 'jspdf';
import {
  BillSettings,
  CurrencyCode,
  DigitalKeycard,
  GuestRoomSession,
  LostAndFoundItem,
  MasterInvoice,
} from '../types/hotel';
import { convertPrice, formatCurrency } from './theme';

/**
 * Robust Cross-Browser & Iframe-Resilient Print & Real PDF Engine
 * - Properly clones live canvases (QR codes) into raster <img> tags for printing.
 * - Uses full-layout offscreen dimensions (820x1120) so Chrome/Safari render content instead of blank 0x0 frames.
 * - Generates genuine binary `.pdf` files (`application/pdf`) via jsPDF for all Download actions.
 */

function buildIsolatedPrintNode(targetEl: HTMLElement): HTMLElement {
  const clone = targetEl.cloneNode(true) as HTMLElement;

  // Replace empty cloned <canvas> elements with crisp PNG images from live canvases
  const origCanvases = Array.from(targetEl.querySelectorAll('canvas'));
  const cloneCanvases = Array.from(clone.querySelectorAll('canvas'));

  origCanvases.forEach((origCanvas, idx) => {
    const cloneCanvas = cloneCanvases[idx];
    if (!cloneCanvas || !cloneCanvas.parentNode) return;
    try {
      const dataUrl = origCanvas.toDataURL('image/png');
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = 'QR Code';
      img.className = cloneCanvas.className;
      img.style.width = `${origCanvas.width || 180}px`;
      img.style.height = `${origCanvas.height || 180}px`;
      img.style.display = 'block';
      cloneCanvas.parentNode.replaceChild(img, cloneCanvas);
    } catch {
      // Ignore tainted canvas errors
    }
  });

  // Remove interactive screen-only elements from print clone
  clone.querySelectorAll('.print\\:hidden, button, [role="button"], .no-print').forEach((el) => {
    el.remove();
  });

  // Ensure light paper contrast inside clone regardless of dark mode
  clone.classList.remove('dark', 'overflow-y-auto', 'max-h-[92vh]');
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.backgroundColor = '#ffffff';
  clone.style.color = '#111827';
  clone.querySelectorAll('.dark').forEach((el) => el.classList.remove('dark'));

  return clone;
}

export function printElement(elementId: string, documentTitle: string = 'Document'): boolean {
  try {
    const targetEl = document.getElementById(elementId);
    if (!targetEl) {
      console.warn(`Print target #${elementId} not found, falling back to window.print()`);
      window.print();
      return true;
    }

    const existingRoot = document.getElementById('kamal-print-root');
    if (existingRoot) existingRoot.remove();

    const printRoot = document.createElement('div');
    printRoot.id = 'kamal-print-root';
    const clonedContent = buildIsolatedPrintNode(targetEl);
    printRoot.appendChild(clonedContent);
    document.body.appendChild(printRoot);

    const previousTitle = document.title;
    document.title = documentTitle;
    document.body.classList.add('kamal-print-mode');

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.body.classList.remove('kamal-print-mode');
      document.title = previousTitle;
      const rootEl = document.getElementById('kamal-print-root');
      if (rootEl) rootEl.remove();
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 3000);

    window.focus();
    window.print();
    return true;
  } catch (err) {
    document.body.classList.remove('kamal-print-mode');
    const rootEl = document.getElementById('kamal-print-root');
    if (rootEl) rootEl.remove();
    console.warn('Isolated print failed:', err);
    return false;
  }
}

/* ==========================================================================
   REAL BINARY PDF GENERATORS (jsPDF — genuine .pdf downloads)
   ========================================================================== */

function safeFilename(name: string): string {
  const cleaned = name.replace(/\.html$/i, '').replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
  return `${cleaned}.pdf`;
}

function drawPdfHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  rightBadge: string,
  hotelName: string,
  addressLine: string,
  metaLine: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Warm gold top bar
  doc.setFillColor(146, 64, 14); // amber-800
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Hotel title
  doc.setTextColor(28, 25, 23); // stone-900
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text(hotelName.toUpperCase(), 16, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(87, 83, 78); // stone-600
  doc.text(addressLine, 16, 28);
  if (metaLine) {
    doc.text(metaLine, 16, 33);
  }

  // Right document badge
  doc.setFillColor(245, 245, 244); // stone-100
  doc.setDrawColor(214, 211, 209); // stone-300
  doc.roundedRect(pageWidth - 78, 13, 62, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text(subtitle.toUpperCase(), pageWidth - 47, 19, { align: 'center' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(rightBadge, pageWidth - 47, 26, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text(title, pageWidth - 47, 31.5, { align: 'center' });

  // Rule
  doc.setDrawColor(146, 64, 14);
  doc.setLineWidth(0.5);
  doc.line(16, 40, pageWidth - 16, 40);

  return 48;
}

export interface VoucherPdfPayload {
  bookingCode: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCountry?: string;
  roomName: string;
  assignedRoomNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  checkInTime: string;
  checkOutTime: string;
  nights: number;
  adults: number;
  children: number;
  paymentMethod: string;
  paymentStatus: string;
  currency: CurrencyCode;
  roomSubtotalFormatted: string;
  addons?: { name: string; priceFormatted: string }[];
  couponCode?: string;
  discountFormatted?: string;
  serviceChargeFormatted: string;
  taxFormatted: string;
  totalAmountFormatted: string;
  specialRequests?: string;
  hotelName: string;
  hotelAddress: string;
  hotelPhone: string;
  hotelEmail: string;
  panVatNumber?: string;
}

export function downloadBookingVoucherPdf(data: VoucherPdfPayload): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = drawPdfHeader(
    doc,
    'Official Stay Confirmation',
    'Reservation Voucher',
    data.bookingCode,
    data.hotelName,
    data.hotelAddress,
    `Tel: ${data.hotelPhone}  |  Email: ${data.hotelEmail}${data.panVatNumber ? `  |  PAN/VAT: ${data.panVatNumber}` : ''}`
  );

  // Guaranteed status strip
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(16, y, pageWidth - 32, 13, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(6, 95, 70);
  doc.text('GUARANTEED RESERVATION VOUCHER', 21, y + 8);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    `ROOM: ${data.assignedRoomNumber ? `Room ${data.assignedRoomNumber}` : 'Front Desk Allocation'}`,
    pageWidth - 21,
    y + 8,
    { align: 'right' }
  );

  y += 20;

  // Guest & Accommodation 2-column grid
  const colW = (pageWidth - 38) / 2;
  doc.setFillColor(250, 250, 249);
  doc.setDrawColor(231, 229, 228);
  doc.roundedRect(16, y, colW, 38, 2, 2, 'FD');
  doc.roundedRect(22 + colW, y, colW, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text('GUEST INFORMATION', 21, y + 7);
  doc.text('STAY ITINERARY', 27 + colW, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(data.guestName, 21, y + 14);
  doc.text(data.roomName, 27 + colW, y + 14, { maxWidth: colW - 10 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(68, 64, 60);
  doc.text(`Email: ${data.guestEmail}`, 21, y + 21);
  doc.text(`Phone: ${data.guestPhone}`, 21, y + 26.5);
  if (data.guestCountry) {
    doc.text(`Country: ${data.guestCountry}`, 21, y + 32);
  }

  doc.text(`Check-In:  ${data.checkInDate} (${data.checkInTime})`, 27 + colW, y + 21);
  doc.text(`Check-Out: ${data.checkOutDate} (${data.checkOutTime})`, 27 + colW, y + 26.5);
  doc.text(
    `Duration:  ${data.nights} Night(s) · ${data.adults} Adult(s)${data.children ? `, ${data.children} Child` : ''}`,
    27 + colW,
    y + 32
  );

  y += 46;

  // Charges Breakdown Header
  doc.setFillColor(28, 25, 23);
  doc.rect(16, y, pageWidth - 32, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('RESERVATION CHARGES & STATUTORY TAXES', 20, y + 6);
  doc.text(`AMOUNT (${data.currency})`, pageWidth - 20, y + 6, { align: 'right' });

  y += 14;

  const drawRow = (label: string, value: string, bold = false, accentColor?: [number, number, number]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10.5 : 9.5);
    doc.setTextColor(...(accentColor || [41, 37, 36]));
    doc.text(label, 20, y);
    doc.setFont('courier', bold ? 'bold' : 'normal');
    doc.text(value, pageWidth - 20, y, { align: 'right' });
    y += 6.5;
    doc.setDrawColor(231, 229, 228);
    doc.setLineWidth(0.2);
    doc.line(16, y - 2.2, pageWidth - 16, y - 2.2);
  };

  drawRow(`${data.roomName} (${data.nights} Night${data.nights > 1 ? 's' : ''})`, data.roomSubtotalFormatted);

  if (data.addons && data.addons.length > 0) {
    data.addons.forEach((a) => {
      drawRow(`Add-On: ${a.name}`, a.priceFormatted);
    });
  }

  if (data.couponCode && data.discountFormatted) {
    drawRow(`Promo Voucher Savings (${data.couponCode})`, `-${data.discountFormatted}`, false, [5, 150, 105]);
  }

  drawRow('Hotel Service Charge (10%)', data.serviceChargeFormatted);
  drawRow('Nepal Statutory VAT (13% IRD)', data.taxFormatted);

  y += 2;
  doc.setFillColor(254, 243, 199); // amber-100
  doc.roundedRect(16, y - 4, pageWidth - 32, 12, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(120, 53, 15);
  doc.text(`TOTAL (${data.paymentStatus.toUpperCase()} · ${data.paymentMethod.toUpperCase()})`, 20, y + 3.5);
  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.text(data.totalAmountFormatted, pageWidth - 20, y + 3.5, { align: 'right' });

  y += 18;

  if (data.specialRequests) {
    doc.setFillColor(250, 250, 249);
    doc.setDrawColor(214, 211, 209);
    const noteLines = doc.splitTextToSize(`Special Requests / Notes: ${data.specialRequests}`, pageWidth - 40);
    const boxH = Math.max(14, noteLines.length * 5 + 7);
    doc.roundedRect(16, y, pageWidth - 32, boxH, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(68, 64, 60);
    doc.text(noteLines, 20, y + 6.5);
    y += boxH + 8;
  }

  // Arrival Policies Footer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 25, 23);
  doc.text('Check-In & Cancellation Policy', 16, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(87, 83, 78);
  const policyLines = [
    `• Standard Check-in is from ${data.checkInTime}; Check-out until ${data.checkOutTime}. Present a valid Passport or Government ID at Front Desk.`,
    '• Complimentary high-speed Wi-Fi & 24/7 Front Desk concierge assistance included.',
    '• Free cancellation up to 48 hours prior to scheduled arrival date.',
  ];
  doc.text(policyLines, 16, y + 6);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(120, 113, 108);
  doc.text(`Issued by ${data.hotelName} · ${data.hotelAddress} · ${data.hotelPhone}`, pageWidth / 2, 282, {
    align: 'center',
  });

  doc.save(safeFilename(`Kamal_Hotel_Voucher_${data.bookingCode}`));
}

export function downloadInvoicePdf(
  invoice: MasterInvoice,
  billSettings: BillSettings,
  currency: CurrencyCode,
  exchangeRates?: { USD: number; NPR: number; INR: number }
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const fmt = (usd: number) => formatCurrency(convertPrice(usd, currency, exchangeRates), currency);

  let y = drawPdfHeader(
    doc,
    `Issued: ${invoice.issuedAt}`,
    'Tax Invoice / Folio',
    invoice.invoiceNumber,
    billSettings.hotelLegalName || 'Kamal Hotel Pvt. Ltd.',
    billSettings.addressLine || 'Kamalpokhari Marg, Kathmandu 44600, Nepal',
    `PAN/VAT Reg: ${billSettings.panVatNumber}  |  Tel: ${billSettings.contactSupportPhone}`
  );

  // Guest / Folio Info box
  doc.setFillColor(250, 250, 249);
  doc.setDrawColor(231, 229, 228);
  doc.roundedRect(16, y, pageWidth - 32, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text('BILLED TO GUEST', 20, y + 6);
  doc.text('ALLOCATED ROOM', 90, y + 6);
  doc.text('STAY DATES', 135, y + 6);
  doc.text('STATUS', pageWidth - 20, y + 6, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text(invoice.guestName, 20, y + 13);
  doc.text(invoice.roomNumber, 90, y + 13);
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.text(`${invoice.checkInDate} -> ${invoice.checkOutDate}`, 135, y + 13);
  doc.setFont('courier', 'bold');
  doc.setTextColor(invoice.paymentStatus === 'paid' ? 5 : 180, invoice.paymentStatus === 'paid' ? 150 : 83, 9);
  doc.text(`${invoice.paymentStatus.toUpperCase()} (${invoice.paymentMethod.toUpperCase()})`, pageWidth - 20, y + 13, {
    align: 'right',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(87, 83, 78);
  doc.text(`${invoice.guestEmail} · ${invoice.guestPhone}`, 20, y + 20);
  doc.text(`Booking Ref: ${invoice.bookingCode}`, 135, y + 20);

  y += 34;

  // Table header
  doc.setFillColor(120, 53, 15); // amber-900
  doc.rect(16, y, pageWidth - 32, 8.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('PARTICULARS / DESCRIPTION', 20, y + 5.7);
  doc.text('QTY', 124, y + 5.7, { align: 'center' });
  doc.text(`RATE (${currency})`, 156, y + 5.7, { align: 'right' });
  doc.text(`AMOUNT (${currency})`, pageWidth - 20, y + 5.7, { align: 'right' });

  y += 13;

  invoice.items.forEach((item) => {
    if (y > 245) {
      doc.addPage();
      y = 20;
    }
    const descLines = doc.splitTextToSize(item.description, 94);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(28, 25, 23);
    doc.text(descLines, 20, y);

    doc.setFont('courier', 'normal');
    doc.text(String(item.quantity), 124, y, { align: 'center' });
    doc.text(fmt(item.rateUSD), 156, y, { align: 'right' });
    doc.setFont('courier', 'bold');
    doc.text(fmt(item.amountUSD), pageWidth - 20, y, { align: 'right' });

    const rowHeight = Math.max(7, descLines.length * 4.5 + 3);
    doc.setDrawColor(231, 229, 228);
    doc.setLineWidth(0.2);
    doc.line(16, y + rowHeight - 2.5, pageWidth - 16, y + rowHeight - 2.5);
    y += rowHeight;
  });

  y += 6;

  // Totals Card on Right
  const boxX = pageWidth - 96;
  const boxW = 80;
  doc.setFillColor(250, 250, 249);
  doc.setDrawColor(214, 211, 209);
  doc.roundedRect(boxX, y, boxW, invoice.discountAmountUSD > 0 ? 48 : 42, 2, 2, 'FD');

  let ty = y + 7;
  const drawTotalLine = (lbl: string, val: string, isBold = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isBold ? 10 : 8.5);
    doc.setTextColor(28, 25, 23);
    doc.text(lbl, boxX + 4, ty);
    doc.setFont('courier', isBold ? 'bold' : 'normal');
    doc.text(val, boxX + boxW - 4, ty, { align: 'right' });
    ty += 6;
  };

  drawTotalLine('Subtotal:', fmt(invoice.subtotalUSD));
  if (invoice.discountAmountUSD > 0) {
    drawTotalLine(`Discount (${invoice.discountPercent}%):`, `-${fmt(invoice.discountAmountUSD)}`);
  }
  drawTotalLine(`${billSettings.serviceChargeLabel || 'Service Charge'} (${invoice.serviceChargePercent}%):`, `+${fmt(invoice.serviceChargeAmountUSD)}`);
  drawTotalLine(`${billSettings.taxLabel || 'VAT'} (${invoice.taxPercent}%):`, `+${fmt(invoice.taxAmountUSD)}`);

  doc.setDrawColor(146, 64, 14);
  doc.line(boxX + 4, ty - 2, boxX + boxW - 4, ty - 2);
  ty += 2;
  drawTotalLine('GRAND TOTAL:', fmt(invoice.grandTotalUSD), true);
  drawTotalLine('Amount Paid:', fmt(invoice.amountPaidUSD));
  drawTotalLine('Balance Due:', fmt(invoice.balanceDueUSD), true);

  // Left Terms & Signatory
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(87, 83, 78);
  const footerNoteLines = doc.splitTextToSize(`"${billSettings.footerNote || 'Thank you for staying with us.'}"`, 85);
  doc.text(footerNoteLines, 16, y + 6);

  if (billSettings.termsAndConditions) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 113, 108);
    doc.text(doc.splitTextToSize(billSettings.termsAndConditions, 85), 16, y + 18);
  }

  // Signature block
  const sigY = Math.max(ty + 18, y + 58);
  doc.setDrawColor(168, 162, 158);
  doc.line(pageWidth - 68, sigY, pageWidth - 16, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(28, 25, 23);
  doc.text(billSettings.authorizedSignatoryName || 'Authorized Signatory', pageWidth - 42, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text(billSettings.authorizedSignatoryTitle || 'Front Office Manager', pageWidth - 42, sigY + 9.5, { align: 'center' });

  doc.save(safeFilename(`Kamal_Hotel_Invoice_${invoice.invoiceNumber}`));
}

export function downloadKeycardSlipPdf(
  session: GuestRoomSession,
  qrCanvas: HTMLCanvasElement | null,
  hotelName: string = 'Kamal Hotel',
  hotelAddress: string = 'Kamalpokhari Marg, Kathmandu 44600, Nepal',
  hotelPhone: string = '+977-1-4523678'
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = drawPdfHeader(
    doc,
    'In-Room Portal & Wi-Fi',
    'Guest Keycard Slip',
    `ROOM ${session.roomNumber}`,
    hotelName,
    hotelAddress,
    `24/7 Front Desk: ${hotelPhone}`
  );

  doc.setFillColor(250, 250, 249);
  doc.setDrawColor(214, 211, 209);
  doc.roundedRect(16, y, pageWidth - 32, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text('GUEST NAME', 22, y + 7);
  doc.text('BOOKING REFERENCE', 95, y + 7);
  doc.text('STAY DATES', 148, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(session.guestName, 22, y + 15);
  doc.setFont('courier', 'bold');
  doc.text(session.bookingCode, 95, y + 15);
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.text(`${session.checkInDate} -> ${session.checkOutDate}`, 148, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(87, 83, 78);
  doc.text('Scan QR or enter your In-Room Portal PIN to order ground-floor dining, inspect your live folio, or call reception.', 22, y + 23.5);

  y += 38;

  // QR + PIN card
  doc.setDrawColor(146, 64, 14);
  doc.roundedRect(16, y, pageWidth - 32, 68, 3, 3, 'D');

  if (qrCanvas) {
    try {
      const qrData = qrCanvas.toDataURL('image/png');
      doc.addImage(qrData, 'PNG', 26, y + 9, 48, 48);
    } catch {
      // Skip if canvas empty
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120, 113, 108);
  doc.text('IN-ROOM PORTAL ACCESS PIN', 88, y + 18);

  doc.setFillColor(245, 158, 11);
  doc.roundedRect(88, y + 22, 56, 16, 2, 2, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(28, 25, 23);
  doc.text(session.passcode, 116, y + 33, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(68, 64, 60);
  doc.text('• Order Room Dining & Ground-Floor Grill', 88, y + 46);
  doc.text('• Audio Intercom directly to Reception', 88, y + 52);
  doc.text('• Live Folios & Housekeeping Requests', 88, y + 58);

  y += 78;

  // WiFi Box
  doc.setFillColor(28, 25, 23);
  doc.roundedRect(16, y, pageWidth - 32, 26, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(251, 191, 36);
  doc.text('Complimentary High-Speed Guest Wi-Fi', 22, y + 8);
  doc.setFont('courier', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(245, 245, 244);
  doc.text('Network (SSID): KamalHotel_Guest_5G', 22, y + 15.5);
  doc.text('Password:       kamalpokhari#2025', 22, y + 21.5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text('For security, this passkey automatically expires upon formal checkout.', pageWidth / 2, y + 36, { align: 'center' });

  doc.save(safeFilename(`Kamal_Hotel_Keycard_Room_${session.roomNumber}`));
}

export function downloadDigitalKeycardPdf(
  card: DigitalKeycard,
  qrCanvas: HTMLCanvasElement | null,
  hotelName: string = 'Kamal Hotel'
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = drawPdfHeader(
    doc,
    'Cryptographic Smart Lock Key',
    'Digital Keycard Pass',
    card.keyToken,
    hotelName,
    'Kamalpokhari, Kathmandu, Nepal',
    `Booking Ref: ${card.bookingCode}`
  );

  doc.setFillColor(28, 25, 23);
  doc.roundedRect(24, y, pageWidth - 48, 92, 4, 4, 'F');

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(251, 191, 36);
  doc.text(`${hotelName.toUpperCase()} · SMART ACCESS KEY`, 34, y + 12);

  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(card.roomNumber, 34, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(214, 211, 209);
  doc.text(`Guest: ${card.guestName}`, 34, y + 29);

  if (qrCanvas) {
    try {
      const qrData = qrCanvas.toDataURL('image/png');
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(34, y + 35, 48, 48, 2, 2, 'F');
      doc.addImage(qrData, 'PNG', 36, y + 37, 44, 44);
    } catch {
      // Ignore canvas serialization error
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(168, 162, 158);
  doc.text('KEY TOKEN', 92, y + 42);
  doc.setFont('courier', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(252, 211, 77);
  doc.text(card.keyToken, 92, y + 49);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(168, 162, 158);
  doc.text('ACCESS SCOPE', 92, y + 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(245, 245, 244);
  doc.text(card.accessScope.replace(/_/g, ' ').toUpperCase(), 92, y + 66);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(168, 162, 158);
  doc.text('EXPIRES AT', 92, y + 76);
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(245, 245, 244);
  doc.text(new Date(card.expiresAt).toLocaleString(), 92, y + 82);

  doc.save(safeFilename(`DigitalKey_${card.keyToken}`));
}

export function downloadLostFoundSlipPdf(
  item: LostAndFoundItem,
  hotelName: string,
  address: string,
  phone: string,
  email: string
): void {
  const refId = item.referenceId || `LF-${item.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}`;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = drawPdfHeader(
    doc,
    'Official Custody Voucher',
    'Lost & Found Slip',
    refId,
    hotelName,
    address,
    `Tel: ${phone}  |  Email: ${email}`
  );

  doc.setFillColor(245, 245, 244);
  doc.roundedRect(16, y, pageWidth - 32, 10, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 25, 23);
  doc.text('LOST & FOUND GUEST RECOVERY SLIP', 20, y + 6.5);
  doc.setFont('courier', 'bold');
  doc.text(
    `STATUS: ${item.status === 'claimed' ? 'RELEASED TO GUEST' : item.status.toUpperCase()}`,
    pageWidth - 20,
    y + 6.5,
    { align: 'right' }
  );

  y += 16;

  doc.setDrawColor(214, 211, 209);
  doc.roundedRect(16, y, pageWidth - 32, 22, 1.5, 1.5, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text('ITEM DESCRIPTION', 20, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(item.itemDescription, 20, y + 13);
  if (item.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(87, 83, 78);
    doc.text(`Remarks: ${item.notes}`, 20, y + 18.5);
  }

  y += 28;

  const colW = (pageWidth - 36) / 2;
  const fields: [string, string][] = [
    ['LOCATION FOUND', /^\d+$/.test(item.roomNumber) ? `Room ${item.roomNumber}` : item.roomNumber],
    ['CATEGORY & DATE', `${item.category} · ${item.foundDate}`],
    ['LOGGED BY STAFF', item.foundBy],
    ['VAULT CUSTODY SHELF', item.storageLocation],
  ];

  fields.forEach((f, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const fx = 16 + col * (colW + 4);
    const fy = y + row * 18;
    doc.setDrawColor(214, 211, 209);
    doc.roundedRect(fx, fy, colW, 15, 1.5, 1.5, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 113, 108);
    doc.text(f[0], fx + 4, fy + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(28, 25, 23);
    doc.text(f[1], fx + 4, fy + 11.5);
  });

  y += 42;

  doc.setDrawColor(168, 162, 158);
  doc.roundedRect(16, y, pageWidth - 32, 24, 1.5, 1.5, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text('GUEST CLAIMANT VERIFICATION', 20, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(28, 25, 23);
  doc.text(`Claimant Name: ${item.claimedByGuestName || '_______________________'}`, 20, y + 14);
  doc.text(`Passport / ID #: ${item.claimedByIdNumber || '__________________'}`, 95, y + 14);
  doc.text(`Phone: ${item.contactPhone || '__________________'}`, 148, y + 14);

  y += 38;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(87, 83, 78);
  doc.text(
    `I hereby acknowledge receipt of the above-described property in satisfactory condition from ${hotelName} Front Desk Custody.`,
    16,
    y,
    { maxWidth: pageWidth - 32 }
  );

  y += 24;
  doc.line(16, y, 86, y);
  doc.line(pageWidth - 86, y, pageWidth - 16, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Guest / Recipient Signature', 16, y + 5);
  doc.text('Front Desk / Concierge Officer', pageWidth - 86, y + 5);

  doc.save(safeFilename(`Recovery_Slip_${refId}`));
}

/**
 * Generic element-to-PDF exporter so every download button outputs a real `.pdf` binary file.
 */
export function downloadPrintableHtml(
  elementId: string,
  filename: string,
  title: string = 'Kamal Hotel Document'
): void {
  const targetEl = document.getElementById(elementId);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = drawPdfHeader(
    doc,
    new Date().toLocaleDateString(),
    'Official Record',
    title.slice(0, 26),
    'Kamal Hotel',
    'Kamalpokhari Marg, Kathmandu 44600, Nepal',
    ''
  );

  const rawText = targetEl?.innerText || 'Document content unavailable.';
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(28, 25, 23);

  lines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, pageWidth - 32);
    wrapped.forEach((wl: string) => {
      if (y > 278) {
        doc.addPage();
        y = 20;
      }
      doc.text(wl, 16, y);
      y += 5.5;
    });
  });

  doc.save(safeFilename(filename));
}
