import React, { useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { getThemeClasses } from '../utils/theme';
import { CheckCircle } from 'lucide-react';
import rooftopImg from '../assets/images/amenity_rooftop_dining_1793848735329.jpg';

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
      `You are on the preview list for Rooftop Dining at ${vipEmail}.`,
      'success'
    );
  };

  return (
    <section
      id="amenities"
      className="py-16 lg:py-24 bg-white dark:bg-stone-900 border-y border-stone-200/70 dark:border-stone-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Clean Section Intro */}
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-800 dark:text-amber-400 mb-2">
            {themeConfig.amenitiesSectionSubtitle || 'Dining & Hospitality'}
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-stone-900 dark:text-stone-50 tracking-tight text-balance">
            {themeConfig.amenitiesSectionTitle || 'Rooftop Dining & Essential Facilities'}
          </h2>
          <p className="mt-2.5 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            {themeConfig.amenitiesSectionDescription ||
              'Thoughtful everyday essentials paired with our panoramic rooftop terrace overlooking Kathmandu Valley.'}
          </p>
        </div>

        {/* Clean 12-Col Rooftop Dining Feature */}
        <div
          id="dining"
          className="bg-stone-50 dark:bg-stone-950/60 rounded-xl overflow-hidden border border-stone-200/80 dark:border-stone-800 grid grid-cols-1 lg:grid-cols-12 items-stretch"
        >
          <div className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto lg:h-full min-h-[300px]">
            <img
              src={themeConfig.rooftopDiningImage || rooftopImg}
              alt="Rooftop dining terrace at Kamal Hotel Kathmandu"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="lg:col-span-5 p-7 sm:p-10 flex flex-col justify-between space-y-6">
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <span className="font-medium text-amber-800 dark:text-amber-400">
                  {themeConfig.rooftopDiningStatus === 'opening_soon' ? 'Opening Soon' : 'Now Open'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{themeConfig.rooftopOpeningDateText}</span>
              </div>

              <h3 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-50 leading-snug text-balance">
                {themeConfig.rooftopTeaserHeadline}
              </h3>

              <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                {themeConfig.rooftopTeaserDescription}
              </p>

              <p className="text-xs text-stone-500 dark:text-stone-400 pt-1">
                Highland single-origin coffee <span aria-hidden="true">·</span> Newari &amp; Thakali dinners <span aria-hidden="true">·</span> Sunset valley views
              </p>
            </div>

            <div className="pt-5 border-t border-stone-200/80 dark:border-stone-800 space-y-2.5">
              <span className="block text-xs font-medium text-stone-700 dark:text-stone-300">
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
                    className="flex-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-600"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-stone-200/80 dark:border-stone-800">
          {amenities.map((amenity, idx) => (
            <div
              key={amenity.id}
              className="py-7 sm:pr-8 border-b border-stone-200/80 dark:border-stone-800 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  <span className="font-serif text-sm text-amber-800 dark:text-amber-400 tabular-nums">
                    {String(idx + 1).padStart(2, '0')}.
                  </span>
                  <span>{amenity.category}</span>
                </div>
                <h3 className="text-base font-serif font-semibold text-stone-900 dark:text-stone-100">
                  {amenity.name}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
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

