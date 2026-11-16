import React, { useMemo, useState } from 'react';
import {
  Crown,
  BellRing,
  Search,
  Plus,
  Trash2,
  Power,
  Mail,
  Phone,
  Sparkles,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { VipTier } from '../../types/hotel';

const TIER_LABELS: Record<VipTier, { label: string; colorClass: string }> = {
  returning_vip: {
    label: 'Returning VIP',
    colorClass: 'text-amber-700 dark:text-amber-400',
  },
  high_value: {
    label: 'High-Value Guest',
    colorClass: 'text-emerald-700 dark:text-emerald-400',
  },
  vvip_executive: {
    label: 'VVIP Executive',
    colorClass: 'text-rose-700 dark:text-rose-400',
  },
  corporate_account: {
    label: 'Corporate VIP',
    colorClass: 'text-sky-700 dark:text-sky-400',
  },
};

export const VipGuestFlagPanel: React.FC = () => {
  const {
    vipGuestProfiles,
    bookings,
    flagVipGuest,
    toggleVipGuestActive,
    removeVipGuestFlag,
    dispatchOperationalAlert,
    showToast,
  } = useHotel();

  // Form state
  const [selectedBookingGuestId, setSelectedBookingGuestId] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [tier, setTier] = useState<VipTier>('returning_vip');
  const [staysCount, setStaysCount] = useState<string>('2');
  const [lifetimeSpendUSD, setLifetimeSpendUSD] = useState<string>('1500');
  const [preferences, setPreferences] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState<string>('');

  // Search & filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<'all' | VipTier>('all');

  const uniqueBookingGuests = useMemo(() => {
    const seen = new Set<string>();
    return bookings.filter((b) => {
      const key = (b.guestEmail || b.guestName).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [bookings]);

  const handleSelectFromBookings = (bookingId: string) => {
    setSelectedBookingGuestId(bookingId);
    const b = bookings.find((bk) => bk.id === bookingId);
    if (!b) return;
    setGuestName(b.guestName);
    setGuestEmail(b.guestEmail);
    setGuestPhone(b.guestPhone || '');
    setPreferences(b.specialRequests || 'Upper-floor quiet suite & welcome Himalayan tea.');
    setAlertMessage(`VIP Guest ${b.guestName} arriving — notify hotel manager & concierge immediately.`);
  };

  const handleFlagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      showToast('Guest Name Required', 'Enter or select the guest to flag as VIP.', 'warning');
      return;
    }

    flagVipGuest({
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim() || `${guestName.trim().toLowerCase().replace(/\s+/g, '.')}@guest.com`,
      guestPhone: guestPhone.trim() || undefined,
      tier,
      staysCount: Number(staysCount) || 1,
      lifetimeSpendUSD: Number(lifetimeSpendUSD) || 0,
      preferences: preferences.trim() || 'Preferred room setup & welcome hospitality tray.',
      alertMessage:
        alertMessage.trim() ||
        `VIP arrival alert: Prepare priority check-in and notify duty manager for ${guestName.trim()}.`,
    });

    setSelectedBookingGuestId('');
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setPreferences('');
    setAlertMessage('');
  };

  const handleSimulateNextCheckInAlert = (vipId: string) => {
    const vip = vipGuestProfiles.find((v) => v.id === vipId);
    if (!vip) return;
    const tierInfo = TIER_LABELS[vip.tier];
    dispatchOperationalAlert({
      title: `VIP Check-In Alert: ${vip.guestName} (${tierInfo.label})`,
      message: `Front Desk Arrival Alert · ${vip.alertMessage || vip.preferences}`,
      type: 'vip_checkin',
      targetRoles: ['super_admin', 'admin', 'hotel_manager', 'receptionist', 'housekeeping', 'restaurant_owner'],
      linkTab: 'vip_guests',
    });
    showToast(
      `VIP Arrival Alert · ${tierInfo.label}`,
      `${vip.guestName}: ${vip.alertMessage || vip.preferences}`,
      'warning'
    );
  };

  const kpis = useMemo(() => {
    const active = vipGuestProfiles.filter((v) => v.isActive).length;
    const highValue = vipGuestProfiles.filter((v) => v.tier === 'high_value' || v.tier === 'vvip_executive').length;
    const returning = vipGuestProfiles.filter((v) => v.tier === 'returning_vip').length;
    const alertsTriggered = vipGuestProfiles.filter((v) => Boolean(v.lastAlertTriggeredAt)).length;
    return { active, highValue, returning, alertsTriggered };
  }, [vipGuestProfiles]);

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vipGuestProfiles.filter((v) => {
      if (tierFilter !== 'all' && v.tier !== tierFilter) return false;
      if (!q) return true;
      return (
        v.guestName.toLowerCase().includes(q) ||
        v.guestEmail.toLowerCase().includes(q) ||
        (v.guestPhone || '').toLowerCase().includes(q) ||
        v.preferences.toLowerCase().includes(q)
      );
    });
  }, [vipGuestProfiles, searchQuery, tierFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2.5">
            <Crown className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            VIP Guest Flagging &amp; Arrival Alert Registry
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Label returning, high-value, or corporate guests so front desk, housekeeping, and management automatically receive a priority alert upon their next check-in.
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4">
          <div className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold">
            Active VIP Flags
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {kpis.active}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Armed for next check-in
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4">
          <div className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
            High-Value / VVIP
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {kpis.highValue}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Top-spend suite guests
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold">
            Returning Loyalists
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {kpis.returning}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Repeat stay recognition
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold">
            Arrival Alerts Fired
          </div>
          <div className="mt-1.5 text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
            {kpis.alertsTriggered}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            Confirmed check-in notifications
          </div>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Flag Guest Form */}
        <form
          onSubmit={handleFlagSubmit}
          className="xl:col-span-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4 text-xs"
        >
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-50">
                Flag Returning / VIP Guest
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Triggers special staff alert automatically on check-in.
              </p>
            </div>
            <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
              Quick-Pick From Existing Bookings
            </label>
            <select
              value={selectedBookingGuestId}
              onChange={(e) => handleSelectFromBookings(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              <option value="">-- Select guest from reservations --</option>
              {uniqueBookingGuests.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.guestName} ({b.bookingCode} · {b.bookingStatus})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Guest Full Name *
              </label>
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Rajesh & Pooja Agarwal"
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Guest Email *
                </label>
                <input
                  type="email"
                  required
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="+977 98..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3 sm:col-span-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  VIP Classification
                </label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as VipTier)}
                  className="w-full px-2.5 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                >
                  <option value="returning_vip">Returning VIP</option>
                  <option value="high_value">High-Value Guest</option>
                  <option value="vvip_executive">VVIP Executive</option>
                  <option value="corporate_account">Corporate VIP</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Prior Stays
                </label>
                <input
                  type="number"
                  min={1}
                  value={staysCount}
                  onChange={(e) => setStaysCount(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Lifetime ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={lifetimeSpendUSD}
                  onChange={(e) => setLifetimeSpendUSD(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Guest Preferences &amp; Room Notes
              </label>
              <textarea
                rows={2}
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="e.g. Prefers 3rd floor away from elevator, two firm pillows, ginger-mint welcome drink..."
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Staff Check-In Alert Message
              </label>
              <textarea
                rows={2}
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                placeholder="Special action triggered across Front Desk & Housekeeping on arrival..."
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-700 text-white font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Save VIP Flag &amp; Arm Check-In Alert
          </button>
        </form>

        {/* Right: VIP Watchlist Directory */}
        <div className="xl:col-span-8 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search VIP guest, email, phone, preferences..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg overflow-x-auto">
              {(['all', 'returning_vip', 'high_value', 'vvip_executive', 'corporate_account'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTierFilter(t)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    tierFilter === t
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  {t === 'all' ? `All (${vipGuestProfiles.length})` : TIER_LABELS[t].label}
                </button>
              ))}
            </div>
          </div>

          {filteredProfiles.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-500 dark:text-stone-400">
              No VIP guest flags match this filter. Label a returning or high-value guest from the left panel or Reservations table.
            </div>
          ) : (
            <div className="divide-y divide-stone-200 dark:divide-stone-800">
              {filteredProfiles.map((vip) => {
                const tierInfo = TIER_LABELS[vip.tier];
                return (
                  <div
                    key={vip.id}
                    className={`py-4 first:pt-1 last:pb-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      !vip.isActive ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span className={`font-semibold uppercase tracking-wide text-[11px] inline-flex items-center gap-1 ${tierInfo.colorClass}`}>
                          <Crown className="w-3.5 h-3.5" />
                          {tierInfo.label}
                        </span>
                        <span className="text-stone-300 dark:text-stone-700">·</span>
                        <span className="font-mono text-stone-600 dark:text-stone-300 tabular-nums">
                          {vip.staysCount} stays
                        </span>
                        <span className="text-stone-300 dark:text-stone-700">·</span>
                        <span className="font-mono text-stone-600 dark:text-stone-300 tabular-nums">
                          ${vip.lifetimeSpendUSD.toLocaleString()} LTV
                        </span>
                        <span className="text-stone-300 dark:text-stone-700">·</span>
                        <span
                          className={`font-semibold ${
                            vip.isActive
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-stone-500 dark:text-stone-400'
                          }`}
                        >
                          {vip.isActive ? 'Check-In Alert Armed' : 'Paused'}
                        </span>
                      </div>

                      <div className="text-base font-serif font-bold text-stone-900 dark:text-stone-50">
                        {vip.guestName}
                      </div>

                      <div className="text-xs text-stone-500 dark:text-stone-400 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {vip.guestEmail}
                        </span>
                        {vip.guestPhone && (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Phone className="w-3 h-3" />
                            {vip.guestPhone}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          Flagged by {vip.flaggedBy}
                        </span>
                      </div>

                      <div className="text-xs text-stone-700 dark:text-stone-300 pt-1">
                        <span className="font-semibold text-stone-900 dark:text-stone-100">Preferences:</span>{' '}
                        {vip.preferences}
                      </div>

                      <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 rounded-lg px-3 py-2 flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Staff Arrival Instructions:</span> {vip.alertMessage}
                        </div>
                      </div>

                      {vip.lastAlertTriggeredAt && (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 tabular-nums">
                          <CheckCircle2 className="w-3 h-3" />
                          Last arrival alert triggered: {vip.lastAlertTriggeredAt}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSimulateNextCheckInAlert(vip.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        Broadcast Alert Now
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleVipGuestActive(vip.id)}
                        className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" />
                        {vip.isActive ? 'Pause' : 'Arm'}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeVipGuestFlag(vip.id)}
                        title="Remove VIP flag"
                        className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
