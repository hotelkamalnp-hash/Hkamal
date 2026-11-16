import React from 'react';
import { Award, CheckCircle2, Gift, Sparkles, TrendingUp } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { GuestRoomSession, LoyaltyTier } from '../../types/hotel';

interface KamalRewardsPortalViewProps {
  session: GuestRoomSession;
}

const REWARD_PERKS = [
  {
    id: 'perk-chai',
    title: 'Complimentary Himalayan Tea & Artisan Pastry Platter',
    detail: 'Delivered fresh to your room or served at our Rooftop Terrace.',
    costPoints: 250,
  },
  {
    id: 'perk-late-out',
    title: '2-Hour Express Late Checkout Extension (Until 2:00 PM)',
    detail: 'Priority late checkout subject to room availability.',
    costPoints: 500,
  },
  {
    id: 'perk-thali',
    title: 'Traditional Newari Khaja / Thali Experience for Two',
    detail: 'Curated signature platter prepared by our Rooftop Head Chef.',
    costPoints: 1200,
  },
  {
    id: 'perk-transfer',
    title: 'Private Sedan Airport Drop-Off (TIA)',
    detail: 'Chauffeured transfer directly from Kamalpokhari to Tribhuvan Airport.',
    costPoints: 1800,
  },
];

function getNextTierInfo(lifetimePoints: number): {
  currentTier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  pointsNeeded: number;
  progressPercent: number;
} {
  if (lifetimePoints >= 3000) {
    return {
      currentTier: 'Platinum Summit',
      nextTier: null,
      pointsNeeded: 0,
      progressPercent: 100,
    };
  }
  if (lifetimePoints >= 1000) {
    const progress = Math.min(100, Math.round(((lifetimePoints - 1000) / 2000) * 100));
    return {
      currentTier: 'Gold Himalayan',
      nextTier: 'Platinum Summit',
      pointsNeeded: 3000 - lifetimePoints,
      progressPercent: progress,
    };
  }
  const progress = Math.min(100, Math.round((lifetimePoints / 1000) * 100));
  return {
    currentTier: 'Silver Explorer',
    nextTier: 'Gold Himalayan',
    pointsNeeded: 1000 - lifetimePoints,
    progressPercent: progress,
  };
}

export const KamalRewardsPortalView: React.FC<KamalRewardsPortalViewProps> = ({ session }) => {
  const { getGuestLoyaltyAccount, redeemLoyaltyPerk, bookings } = useHotel();

  const linkedBooking = bookings.find(
    (b) => b.bookingCode.toLowerCase() === session.bookingCode.toLowerCase()
  );

  const member = getGuestLoyaltyAccount(
    linkedBooking?.guestEmail,
    session.guestName,
    session.bookingCode
  );

  const pointsBalance = member?.pointsBalance ?? 0;
  const lifetimePoints = member?.lifetimePointsEarned ?? 0;
  const tierInfo = getNextTierInfo(Math.max(lifetimePoints, pointsBalance));

  return (
    <div className="space-y-6 text-xs max-w-5xl mx-auto">
      {/* Main Balance & Tier Progress Card */}
      <section className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-mono font-semibold uppercase tracking-wider text-[11px]">
              <Award className="w-4 h-4" />
              <span>Kamal Rewards Loyalty Program</span>
            </div>
            <h3 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-50">
              {session.guestName}
            </h3>
            <div className="text-stone-500 dark:text-stone-400 flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span>Member ID: {member?.memberNumber || 'Enrolling at Check-In'}</span>
              <span aria-hidden="true">·</span>
              <span>Current Tier: {member?.tier || tierInfo.currentTier}</span>
              <span aria-hidden="true">·</span>
              <span>Earn Rate: 10 pts per $1 on Stays &amp; Dining</span>
            </div>
          </div>

          <div className="md:text-right shrink-0">
            <div className="text-[11px] uppercase font-mono text-stone-500 dark:text-stone-400">
              Available Points Balance
            </div>
            <div className="text-4xl font-serif font-bold text-amber-800 dark:text-amber-300 tabular-nums mt-0.5">
              {pointsBalance.toLocaleString()} <span className="text-base font-sans font-semibold">pts</span>
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 tabular-nums mt-0.5">
              Lifetime Earned: {lifetimePoints.toLocaleString()} pts
            </div>
          </div>
        </div>

        {/* Tier Progress Bar */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {tierInfo.nextTier
                  ? `${tierInfo.pointsNeeded.toLocaleString()} pts to ${tierInfo.nextTier}`
                  : 'Highest Tier Unlocked — Platinum Summit Status'}
              </span>
            </span>
            <span className="font-mono text-stone-500 tabular-nums">
              {tierInfo.progressPercent}% progress
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
            <div
              className="h-full bg-amber-600 dark:bg-amber-500 transition-all duration-300"
              style={{ width: `${tierInfo.progressPercent}%` }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 text-[11px] text-stone-600 dark:text-stone-400">
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">
                Silver Explorer (0 – 999 pts)
              </span>
              <span>10 pts / $1 spend · Express digital check-in</span>
            </div>
            <div>
              <span className="font-semibold text-amber-800 dark:text-amber-300 block">
                Gold Himalayan (1,000 – 2,999 pts)
              </span>
              <span>Complimentary late checkout · Welcome rooftop tea</span>
            </div>
            <div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 block">
                Platinum Summit (3,000+ pts)
              </span>
              <span>Priority suite upgrades · Complimentary airport transfer</span>
            </div>
          </div>
        </div>
      </section>

      {/* Instant In-Stay Perk Redemption & Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Redeem Perks */}
        <section className="lg:col-span-6 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
            <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-600" />
              <span>Redeem Points During Your Stay</span>
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              Instant point redemption automatically alerts Reception and Room Service for {session.roomNumber}.
            </p>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {REWARD_PERKS.map((perk) => {
              const canAfford = pointsBalance >= perk.costPoints;
              return (
                <div
                  key={perk.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-stone-900 dark:text-stone-100">
                      {perk.title}
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">
                      {perk.detail}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() =>
                      redeemLoyaltyPerk({
                        guestName: session.guestName,
                        guestEmail: linkedBooking?.guestEmail,
                        bookingCode: session.bookingCode,
                        costPoints: perk.costPoints,
                        perkTitle: perk.title,
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      canAfford
                        ? 'bg-amber-700 hover:bg-amber-800 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    Redeem · {perk.costPoints.toLocaleString()} pts
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Points Activity Ledger */}
        <section className="lg:col-span-6 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Points Activity History</span>
            </h4>
            <span className="font-mono text-[11px] text-stone-500 tabular-nums">
              {member?.transactions.length ?? 0} entries
            </span>
          </div>

          {!member || member.transactions.length === 0 ? (
            <div className="p-6 text-center rounded-lg border border-dashed border-stone-300 dark:border-stone-700 text-stone-500">
              No points activity recorded yet. Stay nights and room dining orders automatically earn Kamal Rewards points.
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-[360px] overflow-y-auto pr-1">
              {member.transactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          tx.pointsDelta >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      />
                      <span className="truncate">{tx.reason}</span>
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono flex flex-wrap items-center gap-1.5">
                      <span>{tx.timestamp}</span>
                      {tx.bookingCode && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{tx.bookingCode}</span>
                        </>
                      )}
                      {tx.adjustedBy && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{tx.adjustedBy}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 tabular-nums font-mono">
                    <div
                      className={`font-bold ${
                        tx.pointsDelta >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {tx.pointsDelta >= 0 ? `+${tx.pointsDelta.toLocaleString()}` : tx.pointsDelta.toLocaleString()} pts
                    </div>
                    <div className="text-[10px] text-stone-400">
                      Bal: {tx.balanceAfter.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
