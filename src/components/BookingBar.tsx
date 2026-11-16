import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { getThemeClasses, calculateStayDuration } from '../utils/theme';
import { Search } from 'lucide-react';

interface BookingBarProps {
  onSearch: (filters: { checkIn: string; checkOut: string; guests: number; roomType: string }) => void;
}

export const BookingBar: React.FC<BookingBarProps> = ({ onSearch }) => {
  const { themeConfig } = useHotel();
  const themeClasses = getThemeClasses(themeConfig.palette);

  // Default dates: tomorrow and 3 days later
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const checkoutDefault = new Date(today);
  checkoutDefault.setDate(today.getDate() + 4);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState<string>(formatDate(tomorrow));
  const [checkOut, setCheckOut] = useState<string>(formatDate(checkoutDefault));
  const [guests, setGuests] = useState<number>(2);
  const [roomType, setRoomType] = useState<string>('all');

  const nights = calculateStayDuration(checkIn, checkOut);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ checkIn, checkOut, guests, roomType });
  };

  return (
    <div className="w-full max-w-5xl mx-auto -mt-8 relative z-20 px-4 sm:px-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-stone-900 rounded-xl shadow-[0_18px_45px_rgba(0,0,0,0.12)] border border-stone-200/90 dark:border-stone-800 p-3 sm:p-4 transition-colors"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 lg:gap-0 lg:divide-x divide-stone-200/80 dark:divide-stone-800 items-center">
          {/* Check-In */}
          <div className="lg:col-span-3 lg:pr-4 space-y-1">
            <label className="block text-[11px] font-medium text-stone-500 dark:text-stone-400">
              Check-in
            </label>
            <input
              type="date"
              value={checkIn}
              min={formatDate(today)}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100 focus:outline-none tabular-nums cursor-pointer"
              required
            />
          </div>

          {/* Check-Out */}
          <div className="lg:col-span-3 lg:px-4 space-y-1">
            <label className="flex items-center justify-between text-[11px] font-medium text-stone-500 dark:text-stone-400">
              <span>Check-out</span>
              <span className="text-amber-700 dark:text-amber-400 tabular-nums">
                {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
            </label>
            <input
              type="date"
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100 focus:outline-none tabular-nums cursor-pointer"
              required
            />
          </div>

          {/* Guests */}
          <div className="lg:col-span-3 lg:px-4 space-y-1">
            <label className="block text-[11px] font-medium text-stone-500 dark:text-stone-400">
              Guests
            </label>
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100 focus:outline-none cursor-pointer"
            >
              <option value={1} className="dark:bg-stone-900">1 Guest</option>
              <option value={2} className="dark:bg-stone-900">2 Guests</option>
              <option value={3} className="dark:bg-stone-900">3 Guests</option>
              <option value={4} className="dark:bg-stone-900">4+ Guests</option>
            </select>
          </div>

          {/* Submit Action */}
          <div className="lg:col-span-3 lg:pl-4">
            <button
              type="submit"
              className={`w-full py-2.5 px-4 rounded-lg font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${themeClasses.primary}`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Check Availability</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
