import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { getThemeClasses } from '../utils/theme';
import { CheckCircle } from 'lucide-react';
import rooftopImg from '../assets/images/rooftop_candlelight_dining_1793983310740.jpg';

export const AmenitiesSection: React.FC = () => {
  const { amenities, themeConfig, showToast } = useHotel();
  const [vipRegistered, setVipRegistered] = useState(false);
  const [vipEmail, setVipEmail] = useState('');

  const themeClasses = getThemeClasses(themeConfig.palette);

  const handleVipRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vipEmail) return;
    setVipRegistered(true);
    showToast(
      'Invitation Saved',
      `You are on the preview list for Ground-Floor Dining at ${vipEmail}.`,
      'success'
    );
  };

  return (
    <section
      id="amenities"
      className="py-16 lg:py-24 bg-[#F3EDE2] dark:bg-[#14110E] border-y border-[#E2D8C8] dark:border-[#2A241E] transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Clean Section Intro */}
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#96682E] dark:text-[#D4A76A] mb-2">
            {themeConfig.amenitiesSectionSubtitle || 'Dining & Hospitality'}
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-[#1A1714] dark:text-[#F4EFE6] tracking-tight text-balance">
            {themeConfig.amenitiesSectionTitle || 'Ground-Floor Dining & Essential Facilities'}
          </h2>
          <p className="mt-2.5 text-sm text-[#5C544B] dark:text-[#C5BCB0] leading-relaxed">
            {themeConfig.amenitiesSectionDescription ||
              'Thoughtful everyday essentials paired with our serene ground-floor garden restaurant in Kamalpokhari.'}
          </p>
        </div>

        {/* Clean 12-Col Ground-Floor Dining Feature */}
        <div
          id="dining"
          className="bg-white dark:bg-[#171411] rounded-2xl overflow-hidden border border-[#E6DFD3] dark:border-[#2A241E] shadow-[0_14px_38px_rgba(26,23,20,0.06)] grid grid-cols-1 lg:grid-cols-12 items-stretch"
        >
          <div className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto lg:h-full min-h-[320px]">
            <img
              src={themeConfig.rooftopDiningImage || rooftopImg}
              alt="Ground-floor garden dining at Kamal Hotel Kathmandu"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="lg:col-span-5 p-7 sm:p-10 flex flex-col justify-between space-y-6">
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-xs text-[#6B6258] dark:text-[#AFA699]">
                <span className="font-semibold text-[#96682E] dark:text-[#D4A76A] uppercase tracking-wider">
                  {themeConfig.rooftopDiningStatus === 'opening_soon' ? 'Opening Soon' : 'Now Open'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{themeConfig.rooftopOpeningDateText}</span>
              </div>

              <h3 className="text-2xl font-serif font-semibold text-[#1A1714] dark:text-[#F4EFE6] leading-snug text-balance">
                {themeConfig.rooftopTeaserHeadline}
              </h3>

              <p className="text-sm text-[#5C544B] dark:text-[#C5BCB0] leading-relaxed">
                {themeConfig.rooftopTeaserDescription}
              </p>

              <p className="text-xs text-[#6B6258] dark:text-[#AFA699] pt-1">
                Highland single-origin coffee <span aria-hidden="true">·</span> Authentic Nepali dinners <span aria-hidden="true">·</span> Ground-floor courtyard ambiance
              </p>
            </div>

            <div className="pt-5 border-t border-[#EFE9DF] dark:border-[#2A241E] space-y-2.5">
              <span className="block text-xs font-medium text-[#1A1714] dark:text-[#F4EFE6]">
                Request opening preview invitation
              </span>
              {vipRegistered ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Invitation confirmed for {vipEmail}.</span>
                </div>
              ) : (
                <form onSubmit={handleVipRegister} className="flex gap-2">
                  <input
                    type="email"
                    value={vipEmail}
                    onChange={(e) => setVipEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 bg-[#FAF7F2] dark:bg-[#211B16] border border-[#E6DFD3] dark:border-[#342C24] rounded-lg px-3 py-2 text-xs text-[#1A1714] dark:text-[#F4EFE6] focus:outline-none focus:ring-1 focus:ring-[#96682E]"
                    required
                  />
                  <button
                    type="submit"
                    className={`px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${themeClasses.primary}`}
                  >
                    Notify Me
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Clean Numbered Architectural Amenities Grid (Zero icon-box clutter) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-[#E2D8C8] dark:border-[#2A241E]">
          {amenities.map((amenity, idx) => (
            <div
              key={amenity.id}
              className="py-7 sm:pr-8 border-b border-[#E2D8C8] dark:border-[#2A241E] flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#8E8477]">
                  <span className="font-sans text-xs font-semibold tracking-tight text-[#96682E] dark:text-[#D4A76A] tabular-nums">
                    {String(idx + 1).padStart(2, '0')}.
                  </span>
                  <span>{amenity.category}</span>
                </div>
                <h3 className="text-base font-serif font-semibold text-[#1A1714] dark:text-[#F4EFE6]">
                  {amenity.name}
                </h3>
                <p className="text-xs sm:text-sm text-[#5C544B] dark:text-[#C5BCB0] leading-relaxed">
                  {amenity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

