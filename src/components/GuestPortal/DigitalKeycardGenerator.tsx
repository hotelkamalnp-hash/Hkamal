import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  KeyRound,
  Clock,
  ShieldCheck,
  Copy,
  Download,
  Printer,
  Ban,
  Plus,
  DoorOpen,
  CheckCircle2,
  XCircle,
  Search,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { DigitalKeyAccessScope, DigitalKeycard } from '../../types/hotel';
import { getThemeClasses } from '../../utils/theme';
import { downloadDigitalKeycardPdf, printElement } from '../../utils/printUtility';

function formatCountdown(expiresAtIso: string, nowMs: number): string {
  const diff = new Date(expiresAtIso).getTime() - nowMs;
  if (diff <= 0) return 'Expired';
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function scopeLabel(scope: DigitalKeyAccessScope): string {
  if (scope === 'vip_all_access') return 'VIP All-Access (Room · Pool · Rooftop Lounge)';
  if (scope === 'room_and_amenities') return 'Room + Lift + Spa & Pool Access';
  return 'Room Door Access Only';
}

export const DigitalKeycardGenerator: React.FC = () => {
  const {
    bookings,
    roomUnits,
    digitalKeycards,
    doorUnlockLogs,
    issueDigitalKeycard,
    revokeDigitalKeycard,
    extendDigitalKeycard,
    themeConfig,
    showToast,
  } = useHotel();

  const themeClasses = getThemeClasses(themeConfig.palette);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [selectedSource, setSelectedSource] = useState<string>(
    bookings[0]?.id ? `bk:${bookings[0].id}` : roomUnits[0]?.id ? `unit:${roomUnits[0].id}` : ''
  );
  const [roomInput, setRoomInput] = useState<string>('Room 302');
  const [guestNameInput, setGuestNameInput] = useState<string>(
    bookings[0]?.guestName || 'Eleanor Vance'
  );
  const [bookingCodeInput, setBookingCodeInput] = useState<string>(
    bookings[0]?.bookingCode || 'KH-2026-9042'
  );
  const [accessScope, setAccessScope] = useState<DigitalKeyAccessScope>('room_and_amenities');
  const [validityPreset, setValidityPreset] = useState<'2h' | '12h' | '24h' | '72h' | 'custom'>('24h');
  const [customExpiry, setCustomExpiry] = useState<string>(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  const [selectedCardId, setSelectedCardId] = useState<string>(digitalKeycards[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'revoked'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Tick remaining validity countdown every 30s
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const computedKeycards = useMemo(() => {
    return digitalKeycards.map((card) => {
      const isTimeExpired = new Date(card.expiresAt).getTime() <= nowMs;
      const effectiveStatus: DigitalKeycard['status'] =
        card.status === 'revoked' ? 'revoked' : isTimeExpired ? 'expired' : 'active';
      return { ...card, effectiveStatus };
    });
  }, [digitalKeycards, nowMs]);

  const activeSelectedCard = useMemo(() => {
    return (
      computedKeycards.find((c) => c.id === selectedCardId) ||
      computedKeycards.find((c) => c.effectiveStatus === 'active') ||
      computedKeycards[0] ||
      null
    );
  }, [computedKeycards, selectedCardId]);

  const encodedQrPayload = useMemo(() => {
    if (!activeSelectedCard) return '';
    return JSON.stringify({
      v: 1,
      token: activeSelectedCard.keyToken,
      room: activeSelectedCard.roomNumber,
      guest: activeSelectedCard.guestName,
      scope: activeSelectedCard.accessScope,
      iat: activeSelectedCard.validFrom,
      exp: activeSelectedCard.expiresAt,
      hotel: themeConfig.hotelName || 'Kamal Hotel',
    });
  }, [activeSelectedCard, themeConfig.hotelName]);

  useEffect(() => {
    if (qrCanvasRef.current && encodedQrPayload) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        encodedQrPayload,
        {
          width: 196,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#1c1917',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) console.error('Digital Keycard QR render error:', err);
        }
      );
    }
  }, [encodedQrPayload]);

  const handleSourceChange = (val: string) => {
    setSelectedSource(val);
    if (val.startsWith('bk:')) {
      const bkId = val.replace('bk:', '');
      const bk = bookings.find((b) => b.id === bkId);
      if (bk) {
        setGuestNameInput(bk.guestName);
        setBookingCodeInput(bk.bookingCode);
        const unit = roomUnits.find((u) => u.currentBookingCode === bk.bookingCode);
        setRoomInput(
          unit
            ? `Room ${unit.roomNumber}`
            : bk.assignedRoomNumber
            ? `Room ${bk.assignedRoomNumber}`
            : `Room ${bk.roomTypeId.replace('room-', '30')}`
        );
      }
    } else if (val.startsWith('unit:')) {
      const unitId = val.replace('unit:', '');
      const unit = roomUnits.find((u) => u.id === unitId);
      if (unit) {
        setRoomInput(`Room ${unit.roomNumber}`);
        setGuestNameInput(unit.currentGuestName || 'Walk-In Guest');
        setBookingCodeInput(unit.currentBookingCode || `WALKIN-${unit.roomNumber}`);
      }
    }
  };

  const handleGenerateKeycard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim()) return;

    let expiresAtIso: string;
    if (validityPreset === 'custom') {
      const parsed = new Date(customExpiry);
      expiresAtIso = Number.isNaN(parsed.getTime())
        ? new Date(Date.now() + 24 * 3600 * 1000).toISOString()
        : parsed.toISOString();
    } else {
      const hoursMap = { '2h': 2, '12h': 12, '24h': 24, '72h': 72 };
      expiresAtIso = new Date(Date.now() + hoursMap[validityPreset] * 3600 * 1000).toISOString();
    }

    const created = issueDigitalKeycard({
      roomNumber: roomInput.trim(),
      guestName: guestNameInput.trim() || 'Hotel Guest',
      bookingCode: bookingCodeInput.trim() || 'DIRECT-KEY',
      accessScope,
      expiresAt: expiresAtIso,
    });

    setSelectedCardId(created.id);
    setNowMs(Date.now());
  };

  const handleCopyText = (text: string, label: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(id);
    showToast('Copied', `${label} copied for Smart Lock Reader testing.`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadQrPng = () => {
    if (!qrCanvasRef.current || !activeSelectedCard) return;
    const url = qrCanvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSelectedCard.keyToken}_${activeSelectedCard.roomNumber.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  const handleDownloadPassPdf = () => {
    if (!activeSelectedCard) return;
    downloadDigitalKeycardPdf(
      activeSelectedCard,
      qrCanvasRef.current,
      themeConfig.hotelName || 'Kamal Hotel'
    );
  };

  const handlePrintPass = () => {
    if (!activeSelectedCard) return;
    const ok = printElement('printable-digital-keycard', `DigitalKey_${activeSelectedCard.keyToken}`);
    if (!ok) {
      handleDownloadPassPdf();
    }
  };

  const filteredKeycards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return computedKeycards.filter((k) => {
      const matchesStatus = statusFilter === 'all' || k.effectiveStatus === statusFilter;
      const matchesSearch =
        !q ||
        k.roomNumber.toLowerCase().includes(q) ||
        k.guestName.toLowerCase().includes(q) ||
        k.keyToken.toLowerCase().includes(q) ||
        k.bookingCode.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [computedKeycards, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const active = computedKeycards.filter((k) => k.effectiveStatus === 'active').length;
    const expired = computedKeycards.filter((k) => k.effectiveStatus === 'expired').length;
    const revoked = computedKeycards.filter((k) => k.effectiveStatus === 'revoked').length;
    const totalUnlocks = computedKeycards.reduce((sum, k) => sum + (k.unlockCount || 0), 0);
    return { active, expired, revoked, totalUnlocks };
  }, [computedKeycards]);

  return (
    <div className="space-y-6 text-xs">
      {/* Header & Single-Elevation KPI Strip */}
      <section className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50">
                Time-Bound Digital Keycard Generator
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Issue unique cryptographic QR room keys with automatic expiry windows. Guests can scan or present generated QR credentials in the In-Room Guest Portal door reader.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 tabular-nums shrink-0">
            <div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">Active Keys</div>
              <div className="text-lg font-serif font-bold text-emerald-700 dark:text-emerald-400">
                {stats.active}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">Expired</div>
              <div className="text-lg font-serif font-bold text-amber-700 dark:text-amber-400">
                {stats.expired}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">Revoked</div>
              <div className="text-lg font-serif font-bold text-rose-700 dark:text-rose-400">
                {stats.revoked}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">Door Unlocks</div>
              <div className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">
                {stats.totalUnlocks}
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Workbench: Generator Form (Left) + Live QR Digital Keycard Preview (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Issuance Form */}
          <form onSubmit={handleGenerateKeycard} className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>Configure New Time-Bound QR Keycard</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Autofill from Reservation or Physical Room Unit
                </label>
                <select
                  value={selectedSource}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  <optgroup label="Active & Upcoming Bookings">
                    {bookings.map((b) => (
                      <option key={b.id} value={`bk:${b.id}`}>
                        {b.bookingCode} · {b.guestName} ({b.roomName})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Physical Room Units">
                    {roomUnits.map((u) => (
                      <option key={u.id} value={`unit:${u.id}`}>
                        Room {u.roomNumber} · {u.floor} ({u.occupancyStatus})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Room Number
                </label>
                <input
                  type="text"
                  required
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  placeholder="e.g. Room 302"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Booking / Folio Reference
                </label>
                <input
                  type="text"
                  required
                  value={bookingCodeInput}
                  onChange={(e) => setBookingCodeInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Guest Full Name
                </label>
                <input
                  type="text"
                  required
                  value={guestNameInput}
                  onChange={(e) => setGuestNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Zone &amp; Elevator Permissions
                </label>
                <select
                  value={accessScope}
                  onChange={(e) => setAccessScope(e.target.value as DigitalKeyAccessScope)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  <option value="room_only">Room Door Access Only</option>
                  <option value="room_and_amenities">Room + Lift + Spa &amp; Pool</option>
                  <option value="vip_all_access">VIP All-Access + Rooftop Lounge</option>
                </select>
              </div>
            </div>

            {/* Time-Bound Expiry Selector */}
            <div className="space-y-2 pt-1">
              <label className="block font-semibold text-stone-700 dark:text-stone-300">
                Time-Bound Validity Window
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: '2h', label: '2 Hours (Temp / Late Out)' },
                    { id: '12h', label: '12 Hours' },
                    { id: '24h', label: '24 Hours' },
                    { id: '72h', label: '72 Hours (3-Night Stay)' },
                    { id: 'custom', label: 'Custom Date & Time' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setValidityPreset(preset.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      validityPreset === preset.id
                        ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                        : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {validityPreset === 'custom' && (
                <div className="pt-1 max-w-xs">
                  <input
                    type="datetime-local"
                    value={customExpiry}
                    onChange={(e) => setCustomExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className={`px-5 py-2.5 rounded-lg font-semibold inline-flex items-center gap-2 shadow-sm whitespace-nowrap shrink-0 cursor-pointer ${themeClasses.primary}`}
              >
                <Plus className="w-4 h-4" />
                <span>Generate Unique QR Keycard</span>
              </button>
            </div>
          </form>

          {/* Right 5 Cols: Live Scannable Keycard Display */}
          <div className="lg:col-span-5">
            {activeSelectedCard ? (
              <div className="space-y-3">
                <div
                  id="printable-digital-keycard"
                  className="rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-950 text-stone-100 p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-stone-800 pb-3">
                    <div>
                      <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">
                        {themeConfig.hotelName || 'Kamal Hotel'} · Smart Key
                      </div>
                      <div className="text-xl font-serif font-bold text-white mt-0.5">
                        {activeSelectedCard.roomNumber}
                      </div>
                      <div className="text-xs text-stone-300">
                        {activeSelectedCard.guestName} · {activeSelectedCard.bookingCode}
                      </div>
                    </div>

                    <div className="text-right font-mono text-[11px]">
                      <div
                        className={`font-bold uppercase ${
                          activeSelectedCard.effectiveStatus === 'active'
                            ? 'text-emerald-400'
                            : activeSelectedCard.effectiveStatus === 'expired'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {activeSelectedCard.effectiveStatus}
                      </div>
                      <div className="text-stone-400 tabular-nums mt-0.5">
                        {formatCountdown(activeSelectedCard.expiresAt, nowMs)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="p-2.5 bg-white rounded-lg shrink-0">
                      <canvas ref={qrCanvasRef} className="block rounded" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2 text-[11px]">
                      <div>
                        <span className="text-stone-400 block">Key Token</span>
                        <span className="font-mono font-bold text-sm text-amber-300 tracking-wider break-all">
                          {activeSelectedCard.keyToken}
                        </span>
                      </div>

                      <div>
                        <span className="text-stone-400 block">Access Permissions</span>
                        <span className="text-stone-200 font-medium">
                          {scopeLabel(activeSelectedCard.accessScope)}
                        </span>
                      </div>

                      <div className="tabular-nums">
                        <span className="text-stone-400 block">Expires At</span>
                        <span className="font-mono text-stone-200">
                          {new Date(activeSelectedCard.expiresAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Utility Action Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        activeSelectedCard.keyToken,
                        `Token ${activeSelectedCard.keyToken}`,
                        `${activeSelectedCard.id}-tok`
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>
                      {copiedId === `${activeSelectedCard.id}-tok` ? 'Token Copied' : 'Copy Token'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        encodedQrPayload,
                        'Signed QR JSON Payload',
                        `${activeSelectedCard.id}-json`
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>
                      {copiedId === `${activeSelectedCard.id}-json` ? 'QR Payload Copied' : 'Copy QR Data'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadQrPng}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save QR PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPassPdf}
                    className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintPass}
                    className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Pass</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-stone-500">
                No digital keycards issued yet. Use the form on the left to generate a time-bound QR room key.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Issued Digital Keycards Registry + Door Lock Telemetry */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Table: Issued Keycards */}
        <section className="xl:col-span-8 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
              Issued Time-Bound Keycards ({filteredKeycards.length})
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search room, guest, token..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs w-48"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
              </div>

              <div className="inline-flex items-center p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                {(['all', 'active', 'expired', 'revoked'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      statusFilter === st
                        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700 dark:text-stone-300">
              <thead className="bg-stone-50 dark:bg-stone-800/80 text-[11px] uppercase tracking-wider font-mono border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="py-3 px-4">Room &amp; Guest</th>
                  <th className="py-3 px-3">Key Token</th>
                  <th className="py-3 px-3">Validity Window</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {filteredKeycards.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-500">
                      No digital keycards match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredKeycards.map((card) => {
                    const isFocused = activeSelectedCard?.id === card.id;
                    return (
                      <tr
                        key={card.id}
                        className={`hover:bg-stone-50/70 dark:hover:bg-stone-800/40 ${
                          isFocused ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-stone-900 dark:text-stone-100">
                            {card.roomNumber} · {card.guestName}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono">
                            {card.bookingCode} · {card.unlockCount} unlocks
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-800 dark:text-amber-300">
                          {card.keyToken}
                        </td>
                        <td className="py-3 px-3 tabular-nums">
                          <div className="font-mono text-[11px]">
                            {new Date(card.expiresAt).toLocaleString()}
                          </div>
                          <div className="text-[11px] text-stone-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatCountdown(card.expiresAt, nowMs)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-semibold inline-flex items-center gap-1 capitalize ${
                              card.effectiveStatus === 'active'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : card.effectiveStatus === 'expired'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {card.effectiveStatus === 'active' ? (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            ) : (
                              <Ban className="w-3.5 h-3.5" />
                            )}
                            <span>{card.effectiveStatus}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedCardId(card.id)}
                              className="px-2.5 py-1 rounded-md border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              View QR
                            </button>
                            <button
                              type="button"
                              onClick={() => extendDigitalKeycard(card.id, 4)}
                              className="px-2.5 py-1 rounded-md border border-stone-300 dark:border-stone-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              +4h
                            </button>
                            {card.effectiveStatus !== 'revoked' && (
                              <button
                                type="button"
                                onClick={() => revokeDigitalKeycard(card.id)}
                                className="px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Smart Lock Door Reader Access Events */}
        <section className="xl:col-span-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <h3 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-amber-600" />
              <span>Smart Lock Reader Feed</span>
            </h3>
            <span className="text-[11px] font-mono text-stone-500 tabular-nums">
              {doorUnlockLogs.length} events
            </span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {doorUnlockLogs.length === 0 ? (
              <div className="py-8 text-center text-stone-500">
                No door lock scans recorded yet. Test a QR keycard inside the In-Room Guest Portal door reader.
              </div>
            ) : (
              doorUnlockLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      {log.result === 'granted' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                      )}
                      <span>{log.roomNumber}</span>
                    </span>
                    <span className="font-mono text-[10px] text-stone-500 tabular-nums">
                      {log.timestamp}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-600 dark:text-stone-300">
                    {log.guestName} · <span className="font-mono">{log.keyToken}</span>
                  </div>
                  <div
                    className={`text-[11px] font-medium ${
                      log.result === 'granted'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {log.reason}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
