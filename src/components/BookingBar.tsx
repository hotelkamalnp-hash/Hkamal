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
    <div className="w-full max-w-5xl mx-auto -mt-9 relative z-20 px-4 sm:px-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#171411] rounded-xl shadow-[0_20px_50px_-14px_rgba(24,18,12,0.16)] border border-[#E6DFD3] dark:border-[#2E2720] p-3.5 sm:p-4 transition-colors"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 lg:gap-0 lg:divide-x divide-[#EAE3D7] dark:divide-[#2A241E] items-center">
          {/* Check-In */}
          <div className="lg:col-span-3 lg:pr-5 space-y-1">
            <label className="block text-[11px] font-medium text-[#6B6258] dark:text-[#A69C8F]">
              Check-in
            </label>
            <input
              type="date"
              value={checkIn}
              min={formatDate(today)}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-[#1A1714] dark:text-[#F4EFE6] focus:outline-none tabular-nums cursor-pointer"
              required
            />
          </div>

          {/* Check-Out */}
          <div className="lg:col-span-3 lg:px-5 space-y-1">
            <label className="flex items-center justify-between text-[11px] font-medium text-[#6B6258] dark:text-[#A69C8F]">
              <span>Check-out</span>
              <span className="text-[#8A5D25] dark:text-[#D4A76A] font-semibold tabular-nums">
                {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
            </label>
            <input
              type="date"
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-[#1A1714] dark:text-[#F4EFE6] focus:outline-none tabular-nums cursor-pointer"
              required
            />
          </div>

          {/* Guests */}
          <div className="lg:col-span-3 lg:px-5 space-y-1">
            <label className="block text-[11px] font-medium text-[#6B6258] dark:text-[#A69C8F]">
              Guests
            </label>
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-[#1A1714] dark:text-[#F4EFE6] focus:outline-none cursor-pointer"
            >
              <option value={1} className="dark:bg-[#171411]">1 Guest</option>
              <option value={2} className="dark:bg-[#171411]">2 Guests</option>
              <option value={3} className="dark:bg-[#171411]">3 Guests</option>
              <option value={4} className="dark:bg-[#171411]">4+ Guests</option>
            </select>
          </div>

          {/* Submit Action */}
          <div className="lg:col-span-3 lg:pl-5">
            <button
              type="submit"
              className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${themeClasses.primary}`}
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
