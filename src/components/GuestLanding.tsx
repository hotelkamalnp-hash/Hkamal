import React, { useState, useEffect, useRef } from 'react';
import { useHotel } from '../context/HotelContext';
import { useRenderTracker } from '../hooks/useRenderTracker';
import { getThemeClasses } from '../utils/theme';
import { BookingBar } from './BookingBar';
import { RoomCatalog } from './RoomCatalog';
import { AmenitiesSection } from './AmenitiesSection';
import { KathmanduWeatherWidget } from './Weather/KathmanduWeatherWidget';
import { NeighborhoodGuide } from './NeighborhoodGuide';
import { 
  Star, 
  MapPin, 
  ChevronDown, 
  ExternalLink,
  Navigation,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';
import exteriorImg from '../assets/images/hero_hotel_exterior_1793848734140.jpg';
import heroFallbackImg from '../assets/images/hero_himalayan_boutique_1793983309553.jpg';

interface GuestLandingProps {
  onOpenDashboard: () => void;
  onOpenInRoomPortal?: () => void;
}

export const GuestLanding: React.FC<GuestLandingProps> = ({ onOpenDashboard, onOpenInRoomPortal }) => {
  useRenderTracker('GuestLanding');
  const { themeConfig, reviews, faqs, openBookingModal, showToast } = useHotel();
  const themeClasses = getThemeClasses(themeConfig.palette);

  // Search filter passed from BookingBar to RoomCatalog
  const [searchFilter, setSearchFilter] = useState<{
    checkIn: string;
    checkOut: string;
    guests: number;
    roomType: string;
  } | null>(null);

  // FAQ & Promo state
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedPromo, setCopiedPromo] = useState<boolean>(false);

  // Subtle GPU-composited scroll parallax for Hero background
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const [heroParallaxY, setHeroParallaxY] = useState<number>(0);

  const isParallaxEnabled = themeConfig.enableHeroParallax !== false;

  useEffect(() => {
    if (!isParallaxEnabled) {
      setHeroParallaxY(0);
      return;
    }

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      setHeroParallaxY(0);
      return;
    }

    let rafId = 0;
    const updateParallax = () => {
      rafId = 0;
      const el = heroSectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const scrolled = Math.max(0, -rect.top);
      const offset = Math.min(28, Number((scrolled * 0.14).toFixed(2)));
      setHeroParallaxY(offset);
    };

    const handleScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateParallax);
      }
    };

    updateParallax();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [isParallaxEnabled]);

  const handleBookingBarSearch = (filters: {
    checkIn: string;
    checkOut: string;
    guests: number;
    roomType: string;
  }) => {
    setSearchFilter(filters);
    const roomsElement = document.getElementById('rooms');
    if (roomsElement) {
      roomsElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCopyPromo = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedPromo(true);
    setTimeout(() => setCopiedPromo(false), 2500);
  };

  const handlePromoBannerCta = () => {
    const code = themeConfig.promoBannerCode?.trim();
    if (code) {
      navigator.clipboard?.writeText(code);
      setCopiedPromo(true);
      setTimeout(() => setCopiedPromo(false), 2500);
    }

    const target = themeConfig.promoBannerCtaTarget || 'rooms';
    const label =
      themeConfig.promoBannerCtaLabel ||
      (themeConfig.promoBannerType === 'flash_sale' ? 'Flash Sales' : 'Seasonal Offers');

    if (target === 'booking_modal') {
      if (code) {
        showToast(label, `Promo code ${code} copied — apply it at checkout.`, 'success');
      }
      openBookingModal();
      return;
    }

    const sectionId = target === 'dining' ? 'dining' : 'rooms';
    const sectionEl = document.getElementById(sectionId);
    if (sectionEl) {
      sectionEl.scrollIntoView({ behavior: 'smooth' });
    }
    if (code) {
      showToast(label, `Code ${code} copied! Select a suite to redeem your offer.`, 'success');
    }
  };

  const approvedReviews = reviews.filter((r) => r.isApproved);
  const overlayOpacity = typeof themeConfig.heroOverlayOpacity === 'number' ? themeConfig.heroOverlayOpacity : 0.38;
  const heroLayoutMode = themeConfig.heroLayoutMode || 'full_bleed';
  const heroPositionClass =
    themeConfig.heroImagePosition === 'top'
      ? 'object-top'
      : themeConfig.heroImagePosition === 'bottom'
      ? 'object-bottom'
      : 'object-center';
  const heroImgSrc =
    !themeConfig.heroImage || themeConfig.heroImage.includes('hotel_kamal_new_look_6cc0fe47')
      ? heroFallbackImg
      : themeConfig.heroImage;

  const parallaxStyle: React.CSSProperties | undefined = isParallaxEnabled
    ? {
        transform: `translate3d(0, ${heroParallaxY}px, 0) scale(${1.05 + Math.min(0.03, heroParallaxY * 0.001)})`,
        willChange: 'transform',
      }
    : undefined;

  const activeHeroCtas = (
    themeConfig.heroCtaButtons && Array.isArray(themeConfig.heroCtaButtons)
      ? themeConfig.heroCtaButtons
      : [
          {
            id: 'cta-reserve',
            label: themeConfig.heroCtaPrimaryText || 'Book Your Stay',
            action: 'booking_modal' as const,
            variant: 'primary' as const,
            enabled: true,
          },
          {
            id: 'cta-rooms',
            label: themeConfig.heroCtaSecondaryText || 'Explore Suites',
            action: 'scroll_rooms' as const,
            variant: 'glass_light' as const,
            enabled: true,
          },
        ]
  ).filter((btn) => btn.enabled && btn.label.trim().length > 0);

  const handleHeroCtaClick = (action: string) => {
    if (action === 'booking_modal') {
      openBookingModal();
      return;
    }
    if (action === 'guest_portal') {
      onOpenInRoomPortal?.();
      return;
    }
    const targetMap: Record<string, string> = {
      scroll_rooms: 'rooms',
      scroll_amenities: 'amenities',
      scroll_dining: 'dining',
      scroll_heritage: 'heritage',
      scroll_location: 'location',
      scroll_faq: 'faq',
    };
    const elId = targetMap[action];
    if (elId) {
      document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const renderHeroCtaButtons = (justifyClass: string) => {
    if (activeHeroCtas.length === 0) return null;
    return (
      <div className={`flex flex-wrap items-center ${justifyClass} gap-3 pt-2`}>
        {activeHeroCtas.map((cta) => {
          const styleClass =
            cta.variant === 'primary'
              ? `px-6 py-3 text-xs sm:text-sm font-semibold rounded-lg shadow-[0_10px_28px_rgba(20,17,14,0.38)] active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${themeClasses.primary}`
              : cta.variant === 'amber_outline'
              ? 'px-5 py-3 text-xs sm:text-sm font-medium rounded-lg bg-[#14110E]/70 hover:bg-[#1E1914]/90 text-[#EAD8B8] border border-[#C69553]/45 backdrop-blur-md transition-all inline-flex items-center gap-1.5 active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0'
              : 'px-5 py-3 text-xs sm:text-sm font-medium rounded-lg bg-white/12 hover:bg-white/20 backdrop-blur-md text-[#FAF7F2] border border-white/25 transition-all inline-flex items-center gap-1.5 active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0';

          if (cta.action === 'external_url') {
            return (
              <a
                key={cta.id}
                href={cta.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={styleClass}
              >
                <span>{cta.label}</span>
              </a>
            );
          }

          return (
            <button
              key={cta.id}
              type="button"
              onClick={() => handleHeroCtaClick(cta.action)}
              className={styleClass}
            >
              <span>{cta.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const showPromoStrip = Boolean(
    themeConfig.enablePromoBanner && themeConfig.promoBannerText
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#0F0D0B] text-[#1A1714] dark:text-[#F4EFE6] transition-colors w-full max-w-full overflow-x-hidden">
      {/* 1. HERO SECTION — Full-Bleed Architectural Dusk Composition */}
      <section
        ref={heroSectionRef}
        className="relative min-h-[450px] sm:min-h-[510px] lg:min-h-[560px] flex items-center overflow-hidden bg-[#14110E]"
      >
        {/* Edge-to-Edge Photography Layer with Warm Obsidian Directional Vignette */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            style={parallaxStyle}
            className="absolute -inset-y-4 inset-x-0 transition-transform duration-150 ease-out"
          >
            <img
              src={heroImgSrc}
              alt={`${themeConfig.hotelName} boutique Himalayan courtyard at dusk in Kamalpokhari, Kathmandu`}
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover ${heroPositionClass} ${
                heroLayoutMode === 'architectural_showcase'
                  ? 'scale-110 blur-xl opacity-45 brightness-75'
                  : ''
              }`}
            />
          </div>

          {heroLayoutMode === 'architectural_showcase' ? (
            <div
              className="absolute inset-0 transition-opacity duration-300"
              style={{
                backgroundColor: `rgba(16, 13, 10, ${Math.min(0.88, Math.max(0.55, overlayOpacity + 0.28))})`,
              }}
            />
          ) : heroLayoutMode === 'centered_classic' ? (
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse at center, rgba(16,13,10,${Math.min(0.82, 0.56 + overlayOpacity * 0.4)}) 0%, rgba(16,13,10,0.44) 70%, rgba(16,13,10,0.62) 100%)`,
              }}
            />
          ) : (
            <>
              <div
                className="hidden lg:block absolute inset-0"
                style={{
                  background: `linear-gradient(90deg, rgba(16,13,10,${Math.min(0.92, 0.72 + overlayOpacity * 0.35)}) 0%, rgba(16,13,10,${Math.min(0.74, 0.48 + overlayOpacity * 0.35)}) 42%, rgba(16,13,10,0.22) 70%, rgba(16,13,10,0.12) 100%)`,
                }}
              />
              <div
                className="lg:hidden absolute inset-0"
                style={{
                  background: `linear-gradient(to top, rgba(16,13,10,0.92) 0%, rgba(16,13,10,${Math.min(0.76, 0.54 + overlayOpacity * 0.32)}) 50%, rgba(16,13,10,0.28) 100%)`,
                }}
              />
            </>
          )}

          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#14110E]/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#14110E]/90 via-[#14110E]/35 to-transparent" />
        </div>

        <div className="relative z-10 w-full">
        {heroLayoutMode === 'architectural_showcase' ? (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 text-center lg:text-left text-[#FAF7F2] space-y-4">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#DFBE88]">
                  {themeConfig.heroKickerBadge || 'Kamalpokhari · Kathmandu'}
                </p>

                <h1 className="text-[clamp(2.15rem,4.1vw,3.4rem)] font-serif font-semibold tracking-tight text-white drop-shadow-[0_3px_16px_rgba(0,0,0,0.65)] leading-[1.08] text-balance max-w-xl mx-auto lg:mx-0">
                  {themeConfig.heroHeadline}
                </h1>

                <p className="max-w-md mx-auto lg:mx-0 text-sm sm:text-base text-[#E7DFD3] font-normal leading-relaxed text-balance">
                  {themeConfig.heroSubheadline}
                </p>

                {renderHeroCtaButtons('justify-center lg:justify-start')}
              </div>

              <div className="lg:col-span-5">
                <div className="relative mx-auto w-full max-w-[270px] sm:max-w-[300px] aspect-[4/3] rounded-2xl overflow-hidden border border-[#C69553]/35 shadow-[0_24px_60px_rgba(0,0,0,0.65)] bg-[#14110E]">
                  <img
                    src={heroImgSrc}
                    alt={`${themeConfig.hotelName} courtyard in Kamalpokhari, Kathmandu`}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover ${heroPositionClass} transition-transform duration-700 hover:scale-[1.03]`}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : heroLayoutMode === 'centered_classic' ? (
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[#FAF7F2] pt-12 pb-24 space-y-4">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#DFBE88]">
              {themeConfig.heroKickerBadge || 'Kamalpokhari · Kathmandu'}
            </p>

            <h1 className="text-[clamp(2.15rem,4.2vw,3.5rem)] font-serif font-semibold tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.7)] max-w-2xl mx-auto leading-[1.08] text-balance">
              {themeConfig.heroHeadline}
            </h1>

            <p className="max-w-lg mx-auto text-sm sm:text-base text-[#E7DFD3] font-normal leading-relaxed text-balance">
              {themeConfig.heroSubheadline}
            </p>

            {renderHeroCtaButtons('justify-center')}
          </div>
        ) : (
          /* Default: Clean Full-Bleed Himalayan Sanctuary Hero */
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24">
            <div className="max-w-xl text-left text-[#FAF7F2] space-y-4">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#DFBE88]">
                {themeConfig.heroKickerBadge || 'Kamalpokhari · Kathmandu'}
              </p>

              <h1 className="text-[clamp(2.15rem,4.1vw,3.4rem)] font-serif font-semibold tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.65)] leading-[1.08] text-balance">
                {themeConfig.heroHeadline}
              </h1>

              <p className="text-sm sm:text-base text-[#E7DFD3] font-normal leading-relaxed max-w-md text-balance">
                {themeConfig.heroSubheadline}
              </p>

              {renderHeroCtaButtons('justify-start')}
            </div>
          </div>
        )}
        </div>
      </section>

      {/* 2. REAL-TIME BOOKING AVAILABILITY BAR */}
      <BookingBar onSearch={handleBookingBarSearch} />

      {/* 3. QUIET HIGHLIGHTS & LIVE CONDITIONS */}
      {(themeConfig.showHighlightsSection !== false || themeConfig.enableWeatherWidget !== false || showPromoStrip) && (
      <section className="mt-10 border-y border-[#E6DFD3] dark:border-[#2A241E] bg-white dark:bg-[#171411]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {themeConfig.showHighlightsSection !== false && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-y-0 md:divide-x divide-[#E6DFD3] dark:divide-[#2A241E]">
              <div className="md:pr-6">
                <div data-numeric-stat="true" className="text-2xl sm:text-3xl font-sans font-bold tracking-tight text-[#1A1714] dark:text-[#F4EFE6] tabular-nums">
                  {themeConfig.stat1Value || '360°'}
                </div>
                <div className="mt-1 text-xs text-[#6B6258] dark:text-[#AFA699]">
                  {themeConfig.stat1Label || 'Mountain & Valley Views'}
                </div>
              </div>

              <div className="md:px-6">
                <div data-numeric-stat="true" className="text-2xl sm:text-3xl font-sans font-bold tracking-tight text-[#1A1714] dark:text-[#F4EFE6] tabular-nums">
                  {themeConfig.stat2Value || '100%'}
                </div>
                <div className="mt-1 text-xs text-[#6B6258] dark:text-[#AFA699]">
                  {themeConfig.stat2Label || 'Solar Power & Hot Water'}
                </div>
              </div>

              <div className="md:px-6">
                <div data-numeric-stat="true" className="text-2xl sm:text-3xl font-sans font-bold tracking-tight text-[#1A1714] dark:text-[#F4EFE6] tabular-nums">
                  {themeConfig.stat3Value || '4.9 ★'}
                </div>
                <div className="mt-1 text-xs text-[#6B6258] dark:text-[#AFA699]">
                  {themeConfig.stat3Label || 'Google Guest Rating'}
                </div>
              </div>

              <div className="md:pl-6">
                <div data-numeric-stat="true" className="text-2xl sm:text-3xl font-sans font-bold tracking-tight text-[#1A1714] dark:text-[#F4EFE6] tabular-nums">
                  {themeConfig.stat4Value || '24/7'}
                </div>
                <div className="mt-1 text-xs text-[#6B6258] dark:text-[#AFA699]">
                  {themeConfig.stat4Label || 'Front Desk & Concierge'}
                </div>
              </div>
            </div>
          )}

          {(themeConfig.enableWeatherWidget !== false || showPromoStrip) && (
            <div className="pt-5 border-t border-[#EFE9DF] dark:border-[#2A241E] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {themeConfig.enableWeatherWidget !== false && (
                <div className="flex-1 min-w-0">
                  <KathmanduWeatherWidget variant="minimal" />
                </div>
              )}

              {showPromoStrip && (
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#5C544B] dark:text-[#C5BCB0] shrink-0">
                  <span className="font-medium text-[#1A1714] dark:text-[#F4EFE6]">
                    {themeConfig.promoBannerText}
                  </span>
                  {themeConfig.promoBannerCode && (
                    <button
                      type="button"
                      onClick={() => handleCopyPromo(themeConfig.promoBannerCode || 'HIMALAYA10')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAF7F2] dark:bg-[#211B16] hover:bg-[#F3EDE2] dark:hover:bg-[#2C241D] border border-[#E6DFD3] dark:border-[#342C24] text-[#96682E] dark:text-[#DFBE88] font-mono text-[11px] transition-colors cursor-pointer whitespace-nowrap"
                      title="Copy promo code"
                    >
                      <span>{themeConfig.promoBannerCode}</span>
                      {copiedPromo ? (
                        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      ) : (
                        <Copy className="w-3 h-3 text-[#8E8477] shrink-0" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePromoBannerCta}
                    className="inline-flex items-center gap-1 text-[#96682E] dark:text-[#D4A76A] hover:underline font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <span>{themeConfig.promoBannerCtaLabel || 'Apply Offer'}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      )}

      {/* 3. ROOMS & ACCOMMODATIONS CATALOG */}
      {themeConfig.showRoomsSection !== false && (
        <RoomCatalog
          filteredType={searchFilter?.roomType || 'all'}
          minGuests={searchFilter?.guests || 1}
        />
      )}

      {/* 4. REAL-TIME AMENITIES & GROUND-FLOOR DINING */}
      {themeConfig.showAmenitiesSection !== false && <AmenitiesSection />}

      {/* 5. HERITAGE & HOSPITALITY STORY */}
      {themeConfig.showHeritageSection !== false && (
      <section id="heritage" className="py-16 lg:py-24 bg-white dark:bg-[#171411] transition-colors border-t border-[#E6DFD3] dark:border-[#2A241E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            <div className="lg:col-span-6 space-y-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#96682E] dark:text-[#D4A76A]">
                {themeConfig.heritageSubtitle || 'Kathmandu Valley Living'}
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-[#1A1714] dark:text-[#F4EFE6] tracking-tight text-balance">
                {themeConfig.heritageTitle || 'Peaceful Haven in Kamalpokhari, Kathmandu'}
              </h2>
              <p className="text-sm sm:text-[15px] text-[#5C544B] dark:text-[#C5BCB0] leading-relaxed">
                {themeConfig.heritageStoryP1 || 'Situated in the historic Kamalpokhari neighborhood of central Kathmandu, Kamal Hotel offers travelers a tranquil oasis away from city bustle while keeping you minutes away from City Center, Thamel, and Durbar Marg.'}
              </p>
              <p className="text-sm sm:text-[15px] text-[#5C544B] dark:text-[#C5BCB0] leading-relaxed">
                {themeConfig.heritageStoryP2 || 'Built with authentic Nepali woodwork, warm river stone masonry, and peaceful courtyard views, our boutique property pairs warm Nepali comfort with uninterrupted fiber-optic Wi-Fi and solar hot water continuity.'}
              </p>

              {(themeConfig.heritageQuote || themeConfig.heritageAuthor) && (
                <blockquote className="border-y border-[#E6DFD3] dark:border-[#2A241E] py-3.5 space-y-1">
                  <div className="text-sm font-serif italic font-semibold text-[#1A1714] dark:text-[#F4EFE6]">
                    {themeConfig.heritageQuote || '“Atithi Devo Bhava”'}
                  </div>
                  <p className="text-xs text-[#6B6258] dark:text-[#AFA699] leading-relaxed">
                    {themeConfig.heritageAuthor || 'Guest is equivalent to God in Himalayan culture. Our local team is here for you 24/7.'}
                  </p>
                </blockquote>
              )}

              <div className="grid grid-cols-2 gap-6 pt-3">
                <div>
                  <div className="text-2xl font-sans font-semibold tracking-tight text-[#1A1714] dark:text-[#F4EFE6] tabular-nums">
                    {themeConfig.heritageStat1Number || '2 Mins'}
                  </div>
                  <div className="text-xs text-[#6B6258] dark:text-[#AFA699] mt-1">
                    {themeConfig.heritageStat1Text || 'Walk to Kamalpokhari Pond & City Center'}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-sans font-semibold tracking-tight text-[#1A1714] dark:text-[#F4EFE6] tabular-nums">
                    {themeConfig.heritageStat2Number || '15 Mins'}
                  </div>
                  <div className="text-xs text-[#6B6258] dark:text-[#AFA699] mt-1">
                    {themeConfig.heritageStat2Text || 'Tribhuvan International Airport (TIA)'}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#EFE9DF] dark:bg-[#231E19] border border-[#E6DFD3] dark:border-[#2A241E] shadow-[0_18px_48px_rgba(26,23,20,0.1)]">
                <img
                  src={exteriorImg}
                  alt="Kamal Hotel illuminated brick architecture in Kamalpokhari, Kathmandu"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

          </div>
        </div>
      </section>
      )}

      {/* 6. GUEST REVIEWS SECTION */}
      {themeConfig.showReviewsSection !== false && (
      <section className="py-16 lg:py-24 bg-[#FAF7F2] dark:bg-[#0F0D0B] border-t border-[#E6DFD3] dark:border-[#2A241E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#96682E] dark:text-[#D4A76A] mb-2">
                {themeConfig.reviewsSectionSubtitle || 'Guest Impressions'}
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-[#1A1714] dark:text-[#F4EFE6] tracking-tight">
                {themeConfig.reviewsSectionTitle || 'Loved by Travelers in Kathmandu'}
              </h2>
            </div>

            {themeConfig.googleReviewUrl && (
              <a
                href={themeConfig.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-[#171411] border border-[#E6DFD3] dark:border-[#2A241E] text-xs font-medium text-[#1A1714] dark:text-[#F4EFE6] hover:border-[#96682E] dark:hover:border-[#C69553] transition-colors self-start md:self-auto"
              >
                <Star className="w-3.5 h-3.5 text-[#96682E] dark:text-[#D4A76A] fill-current" />
                <span>Write a Review</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#8E8477]" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {approvedReviews.map((review) => (
              <article
                key={review.id}
                className="bg-white dark:bg-[#171411] p-6 rounded-xl border border-[#E6DFD3] dark:border-[#2A241E] hover:border-[#C69553]/55 transition-colors flex flex-col justify-between space-y-5 shadow-[0_6px_24px_rgba(26,23,20,0.03)]"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-0.5 text-[#96682E] dark:text-[#D4A76A]">
                    {[...Array(review.rating)].map((_, idx) => (
                      <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-[#4A433B] dark:text-[#D7CFC3] leading-relaxed">
                    “{review.quote}”
                  </p>
                </div>
                <div className="pt-4 border-t border-[#EFE9DF] dark:border-[#2A241E] text-xs">
                  <div className="font-semibold text-[#1A1714] dark:text-[#F4EFE6]">{review.author}</div>
                  <div className="text-[11px] text-[#6B6258] dark:text-[#AFA699] mt-0.5">
                    {review.role} · {review.location}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* 7. INTERACTIVE NEIGHBORHOOD GUIDE & LOCATION */}
      <section id="location" className="py-16 lg:py-24 bg-white dark:bg-[#171411] border-t border-[#E6DFD3] dark:border-[#2A241E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#96682E] dark:text-[#D4A76A]">
                {themeConfig.neighborhoodGuideSubtitle || 'Neighborhood Guide'}
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-[#1A1714] dark:text-[#F4EFE6] tracking-tight">
                {themeConfig.neighborhoodGuideTitle || 'Kamalpokhari & Nearby Landmarks'}
              </h2>
              <p className="text-sm text-[#5C544B] dark:text-[#C5BCB0] leading-relaxed">
                {themeConfig.neighborhoodGuideDescription ||
                  'Located on Kamalpokhari Marg beside the historic lotus pond. Explore landmarks, dining, and transit stops on the interactive map below.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <div className="flex items-center gap-2 text-xs text-[#5C544B] dark:text-[#C5BCB0]">
                <MapPin className="w-4 h-4 text-[#96682E] dark:text-[#D4A76A] shrink-0" />
                <span>{themeConfig.address}</span>
              </div>

              <a
                href={themeConfig.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${themeClasses.primary}`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Directions</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {themeConfig.enableNeighborhoodGuide !== false ? (
            <NeighborhoodGuide />
          ) : (
            <div className="p-6 rounded-xl bg-[#FAF7F2] dark:bg-[#1D1813] border border-[#E6DFD3] dark:border-[#2A241E] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="font-serif font-semibold text-base text-[#1A1714] dark:text-[#F4EFE6]">
                  {themeConfig.hotelName} · {themeConfig.neighborhood}
                </div>
                <div className="text-[#5C544B] dark:text-[#C5BCB0]">
                  {themeConfig.address} · 15 min from TIA Airport · 2 min walk to City Center Mall
                </div>
              </div>
              <a
                href={themeConfig.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1A1714] hover:bg-[#2C2520] text-white font-medium whitespace-nowrap shrink-0"
              >
                <span>Open in Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Clean Hairline Transit Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 sm:gap-y-0 sm:divide-x divide-[#E6DFD3] dark:divide-[#2A241E] pt-6 border-t border-[#E6DFD3] dark:border-[#2A241E] text-xs">
            <div className="sm:pr-6">
              <div className="font-semibold text-[#1A1714] dark:text-[#F4EFE6] tabular-nums">15 min</div>
              <div className="text-[#6B6258] dark:text-[#AFA699] mt-0.5">Tribhuvan International Airport (TIA)</div>
            </div>
            <div className="sm:px-6">
              <div className="font-semibold text-[#1A1714] dark:text-[#F4EFE6] tabular-nums">2 min</div>
              <div className="text-[#6B6258] dark:text-[#AFA699] mt-0.5">Kamalpokhari Lotus Pond & City Center</div>
            </div>
            <div className="sm:pl-6">
              <div className="font-semibold text-[#1A1714] dark:text-[#F4EFE6] tabular-nums">8 min</div>
              <div className="text-[#6B6258] dark:text-[#AFA699] mt-0.5">Thamel, Narayanhiti & Durbar Marg</div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQS HAIRLINE ACCORDION */}
      {themeConfig.showFaqSection !== false && (
      <section id="faq" className="py-16 lg:py-24 bg-[#FAF7F2] dark:bg-[#0F0D0B] border-t border-[#E6DFD3] dark:border-[#2A241E]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#96682E] dark:text-[#D4A76A] mb-2">
              {themeConfig.faqSectionSubtitle || 'Guest Assistance'}
            </p>
            <h2 className="text-3xl font-serif font-semibold text-[#1A1714] dark:text-[#F4EFE6] tracking-tight">
              {themeConfig.faqSectionTitle || 'Frequently Asked Questions'}
            </h2>
          </div>

          <div className="divide-y divide-[#E6DFD3] dark:divide-[#2A241E] border-y border-[#E6DFD3] dark:border-[#2A241E]">
            {faqs.map((faq, index) => (
              <div key={faq.id || index}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full py-4 sm:py-5 text-left flex items-center justify-between gap-4 text-xs sm:text-sm font-medium text-[#1A1714] dark:text-[#F4EFE6] hover:text-[#96682E] dark:hover:text-[#D4A76A] transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#8E8477] shrink-0 transition-transform duration-200 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="pb-5 text-xs sm:text-sm text-[#5C544B] dark:text-[#C5BCB0] leading-relaxed max-w-2xl">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* 9. ARCHITECTURAL FOOTER */}
      <footer className="bg-[#14110E] text-[#AFA699] border-t border-[#2A241E] pt-14 pb-24 md:pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-[#2A241E]">
            
            <div className="space-y-3">
              <span className="text-xl font-serif font-semibold text-[#FAF7F2] tracking-tight block">
                {themeConfig.hotelName}
              </span>
              <p className="text-xs text-[#AFA699] leading-relaxed">
                {themeConfig.footerDescription ||
                  'Boutique Nepali comfort in Kamalpokhari, Kathmandu with high-speed fiber Wi-Fi and ground-floor garden dining.'}
              </p>
              
              {(themeConfig.facebookUrl || themeConfig.instagramUrl || themeConfig.tiktokUrl) && (
                <div className="flex items-center gap-4 pt-1 text-xs">
                  {themeConfig.facebookUrl && (
                    <a href={themeConfig.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-[#D7CFC3] hover:text-[#DFBE88] transition-colors">
                      Facebook
                    </a>
                  )}
                  {themeConfig.instagramUrl && (
                    <a href={themeConfig.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-[#D7CFC3] hover:text-[#DFBE88] transition-colors">
                      Instagram
                    </a>
                  )}
                  {themeConfig.tiktokUrl && (
                    <a href={themeConfig.tiktokUrl} target="_blank" rel="noopener noreferrer" className="text-[#D7CFC3] hover:text-[#DFBE88] transition-colors">
                      TikTok
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="font-semibold text-[#FAF7F2]">Contact</div>
              <div className="space-y-1.5">
                <div>
                  <a href={`mailto:${themeConfig.contactEmail}`} className="hover:text-[#DFBE88] transition-colors">
                    {themeConfig.contactEmail}
                  </a>
                </div>
                <div className="tabular-nums">{themeConfig.contactPhone}</div>
                <div className="text-[#8E8477]">Front Desk · 24/7 Concierge</div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="font-semibold text-[#FAF7F2]">Location</div>
              <p className="leading-relaxed">{themeConfig.address}</p>
              <div>
                <a
                  href={themeConfig.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#DFBE88] hover:text-[#EAD8B8] transition-colors inline-flex items-center gap-1"
                >
                  <span>Directions</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="font-semibold text-[#FAF7F2]">Operations</div>
              <p className="text-[#AFA699]">
                Front desk, dining POS, kitchen display &amp; CMS portal.
              </p>
              <button
                type="button"
                onClick={onOpenDashboard}
                className="inline-flex items-center px-3.5 py-1.5 rounded-lg border border-[#342C24] bg-[#1D1813] text-[#EFE9DF] hover:text-[#DFBE88] hover:border-[#96682E] transition-colors cursor-pointer text-xs font-medium"
              >
                Staff Portal
              </button>
            </div>

          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8E8477]">
            <div>
              {themeConfig.footerCopyrightText ||
                `© 2026 ${themeConfig.hotelName}. Kamalpokhari, Kathmandu, Nepal.`}
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span>Direct Best Rate</span>
              <span aria-hidden="true">·</span>
              <span>NPR, USD &amp; INR</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
