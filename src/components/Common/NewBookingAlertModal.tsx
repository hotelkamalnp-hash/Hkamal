import React from 'react';
import { BellRing, Calendar, CheckCircle2, ArrowRight, BedDouble, CreditCard } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { formatCurrency } from '../../utils/theme';
import { ModalDismissButton, useModalDismiss } from './ModalDismissHandler';

interface NewBookingAlertModalProps {
  onViewReservations: () => void;
}

export const NewBookingAlertModal: React.FC<NewBookingAlertModalProps> = ({
  onViewReservations,
}) => {
  const {
    latestBookingPopup,
    dismissBookingPopup,
    isStaffLoggedIn,
    activeRole,
  } = useHotel();

  const shouldShow = Boolean(
    latestBookingPopup && isStaffLoggedIn && activeRole !== 'guest'
  );

  useModalDismiss({
    isOpen: shouldShow,
    onClose: dismissBookingPopup,
  });

  if (!shouldShow || !latestBookingPopup) return null;

  const { booking } = latestBookingPopup;

  return (
    <div
      className="fixed inset-0 z-[70] bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismissBookingPopup();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-booking-alert-title"
    >
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden border-2 border-amber-500/80 dark:border-amber-500 shadow-2xl animate-fade-in">
        {/* Sticky Header with Explicit Close Button */}
        <div className="px-5 py-3.5 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-800 dark:text-amber-300">
                Live Reservation Alert
              </div>
              <h3
                id="new-booking-alert-title"
                className="font-serif font-bold text-base text-stone-900 dark:text-stone-50 truncate"
              >
                New Booking Received
              </h3>
            </div>
          </div>

          <ModalDismissButton
            onClose={dismissBookingPopup}
            ariaLabel="Close new booking alert"
          />
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {booking.guestName}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  {booking.guestEmail} · {booking.guestPhone}
                </div>
              </div>
              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                {booking.bookingCode}
              </span>
            </div>

            {booking.emailVerified && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                <span>Guest Email Verified</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800">
              <div className="text-[10px] uppercase font-mono text-stone-400 flex items-center gap-1">
                <BedDouble className="w-3 h-3 text-amber-600" />
                <span>Accommodation</span>
              </div>
              <div className="font-semibold text-stone-900 dark:text-stone-100 mt-0.5 line-clamp-1">
                {booking.roomName}
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400 font-mono font-semibold mt-0.5">
                {booking.assignedRoomNumber
                  ? `Room ${booking.assignedRoomNumber} Assigned`
                  : 'Pending Room Assignment'}
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800">
              <div className="text-[10px] uppercase font-mono text-stone-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-600" />
                <span>Stay Dates</span>
              </div>
              <div className="font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
                {booking.checkInDate} → {booking.checkOutDate}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                {booking.nights} {booking.nights === 1 ? 'Night' : 'Nights'} · {booking.adults} Adults
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-semibold">
              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Total Settled ({booking.paymentMethod.toUpperCase()})</span>
            </div>
            <span className="font-serif font-bold text-base text-emerald-800 dark:text-emerald-300 tabular-nums">
              {formatCurrency(booking.totalAmount, booking.currency)}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-stone-50 dark:bg-stone-800/50 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={dismissBookingPopup}
            className="px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer whitespace-nowrap"
          >
            Acknowledge
          </button>
          <button
            type="button"
            onClick={() => {
              dismissBookingPopup();
              onViewReservations();
            }}
            className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer whitespace-nowrap"
          >
            <span>Open Reservations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
