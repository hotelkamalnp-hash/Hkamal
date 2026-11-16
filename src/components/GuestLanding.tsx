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
import suiteImg from '../assets/images/room_deluxe_suite_1793848735141.jpg';

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
  const overlayOpacity = typeof themeConfig.heroOverlayOpacity === 'number' ? themeConfig.heroOverlayOpacity : 0.32;
  const heroLayoutMode = themeConfig.heroLayoutMode || 'full_bleed';
  const heroBackgroundFit = themeConfig.heroBackgroundFit || 'whole_building';
  const heroPositionClass =
    themeConfig.heroImagePosition === 'top'
      ? 'object-top'
      : themeConfig.heroImagePosition === 'bottom'
      ? 'object-bottom'
      : heroLayoutMode === 'full_bleed' && heroBackgroundFit === 'whole_building'
      ? 'object-[52%_42%]'
      : 'object-center';
  const heroImgSrc = themeConfig.heroImage || './assets/aistudio/hotel_kamal_new_look_6cc0fe47.jpg';

  const parallaxStyle: React.CSSProperties | undefined = isParallaxEnabled
    ? {
        transform: `translate3d(0, ${heroParallaxY}px, 0) scale(${1.07 + Math.min(0.03, heroParallaxY * 0.001)})`,
        willChange: 'transform',
      }
    : undefined;

  const activeHeroCtas = (
    themeConfig.heroCtaButtons && Array.isArray(themeConfig.heroCtaButtons)
      ? themeConfig.heroCtaButtons
      : [
          {
            id: 'cta-reserve',
            label: themeConfig.heroCtaPrimaryText || 'Reserve Your Sanctuary',
            action: 'booking_modal' as const,
            variant: 'primary' as const,
            enabled: true,
          },
          ...(onOpenInRoomPortal
            ? [
                {
                  id: 'cta-portal',
                  label: 'In-House Guest Room Portal',
                  action: 'guest_portal' as const,
                  variant: 'amber_outline' as const,
                  enabled: true,
                },
              ]
            : []),
          {
            id: 'cta-dining',
            label: themeConfig.heroCtaSecondaryText || 'Explore Rooftop Dining',
            action: 'scroll_dining' as const,
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
      <div className={`flex flex-wrap items-center ${justifyClass} gap-3 pt-1.5`}>
        {activeHeroCtas.map((cta) => {
          const styleClass =
            cta.variant === 'primary'
              ? `px-5 sm:px-6 py-2.5 text-xs sm:text-[13px] font-semibold rounded-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${themeClasses.primary}`
              : cta.variant === 'amber_outline'
              ? 'px-4 py-2.5 text-xs sm:text-[13px] font-medium rounded-lg bg-slate-950/60 hover:bg-slate-900/85 text-amber-200 border border-amber-300/40 backdrop-blur-md transition-all inline-flex items-center gap-1.5 active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0'
              : 'px-4 py-2.5 text-xs sm:text-[13px] font-medium rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/25 transition-all inline-flex items-center gap-1.5 active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0';

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

  const showTopRibbon = Boolean(
    themeConfig.enablePromoBanner || (themeConfig.enableAnnouncement && themeConfig.announcementText)
  );
  const topRibbonLabel = themeConfig.enablePromoBanner
    ? themeConfig.promoBannerType === 'flash_sale'
      ? 'Flash Sale'
      : 'Seasonal Offer'
    : 'Notice';
  const topRibbonMessage = themeConfig.enablePromoBanner
    ? themeConfig.promoBannerText ||
      'Himalayan Sunlit Season: Enjoy an instant 10% discount on direct suite reservations'
    : themeConfig.announcementText;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 transition-colors w-full max-w-full overflow-x-hidden">
      {/* 1. HERO SECTION (COMPACT LUXURY PANORAMIC TWILIGHT WITH SCROLL PARALLAX & CLEAN PROMO RIBBON) */}
      <section
        ref={heroSectionRef}
        className="relative min-h-[340px] sm:min-h-[380px] lg:min-h-[420px] flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#041236] via-[#071947] to-[#0a0c13]"
      >
        {/* Architectural Background Layers with Scroll-Triggered Parallax */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {heroLayoutMode === 'full_bleed' && heroBackgroundFit === 'whole_building' ? (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_25%,rgba(29,78,216,0.22),transparent_65%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_78%,rgba(245,158,11,0.12),transparent_58%)]" />

              <div
                style={parallaxStyle}
                className="absolute -inset-y-4 inset-x-0 lg:left-auto lg:right-0 lg:w-[440px] xl:w-[480px] flex items-center justify-end transition-transform duration-150 ease-out"
              >
                <img
                  src={heroImgSrc}
                  alt={`${themeConfig.hotelName} illuminated twilight exterior in Kamalpokhari, Kathmandu`}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover ${heroPositionClass} lg:[mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.45)_14%,rgba(0,0,0,0.92)_30%,black_42%,black_100%)]`}
                />
              </div>

              <div
                className="hidden lg:block absolute inset-0"
                style={{
                  background: `linear-gradient(90deg, rgba(4,12,34,${Math.min(0.96, 0.86 + overlayOpacity * 0.25)}) 0%, rgba(5,15,41,${Math.min(0.9, 0.72 + overlayOpacity * 0.25)}) 48%, rgba(6,18,46,0.28) 66%, transparent 80%)`,
                }}
              />
              <div
                className="lg:hidden absolute inset-0"
                style={{
                  background: `linear-gradient(to top, rgba(4,12,34,0.94) 0%, rgba(5,15,41,${Math.min(0.85, 0.62 + overlayOpacity * 0.35)}) 52%, rgba(4,12,34,0.22) 84%, rgba(4,12,34,0.3) 100%)`,
                }}
              />
            </>
          ) : (
            <>
              <div
                style={parallaxStyle}
                className="absolute -inset-y-4 inset-x-0 transition-transform duration-150 ease-out"
              >
                <img
                  src={heroImgSrc}
                  alt={`${themeConfig.hotelName} in Kamalpokhari, Kathmandu`}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover ${heroPositionClass} ${
                    heroLayoutMode === 'architectural_showcase'
                      ? 'scale-110 blur-2xl opacity-40 brightness-90'
                      : 'scale-105'
                  }`}
                />
              </div>
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  backgroundColor:
                    heroLayoutMode === 'architectural_showcase'
                      ? `rgba(8, 15, 36, ${Math.min(0.9, Math.max(0.5, overlayOpacity + 0.3))})`
                      : `rgba(8, 12, 24, ${overlayOpacity})`,
                }}
              />
            </>
          )}

          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#040f2c]/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-transparent" />
        </div>

        {/* TOP OF HERO: SINGLE CLEAN EDITORIAL PROMO RIBBON */}
        {showTopRibbon && (
          <aside
            aria-label="Promotional Announcement"
            className="relative z-20 w-full bg-slate-950/70 backdrop-blur-md border-b border-white/10 text-stone-100 py-2 px-4 sm:px-6 lg:px-8"
          >
            <div className="max-w-7xl mx-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-amber-300 shrink-0">{topRibbonLabel}</span>
                <span className="text-white/25 shrink-0" aria-hidden="true">·</span>
                <span className="text-stone-200 truncate">{topRibbonMessage}</span>
              </div>

              {themeConfig.enablePromoBanner && (
                <div className="flex items-center gap-3 ml-auto shrink-0">
                  {themeConfig.promoBannerCode && (
                    <button
                      type="button"
                      onClick={() => handleCopyPromo(themeConfig.promoBannerCode || 'HIMALAYA10')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white/10 hover:bg-white/15 border border-white/15 text-amber-200 font-mono text-[11px] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      title="Copy promo code"
                    >
                      <span>{themeConfig.promoBannerCode}</span>
                      {copiedPromo ? (
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <Copy className="w-3 h-3 text-stone-300 shrink-0" />
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePromoBannerCta}
                    className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-medium text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>
                      {themeConfig.promoBannerCtaLabel ||
                        (themeConfig.promoBannerType === 'flash_sale' ? 'Flash Sales' : 'Seasonal Offers')}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              )}
            </div>
          </aside>
        )}

        <div className="relative z-10 w-full flex-1 flex items-end lg:items-center">
        {heroLayoutMode === 'architectural_showcase' ? (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              <div className="lg:col-span-7 text-center lg:text-left text-white space-y-3">
                <p className="text-xs font-medium tracking-[0.14em] uppercase text-amber-300/95">
                  {themeConfig.heroKickerBadge || `${themeConfig.starRating}-Star Sanctuary · Kamalpokhari, Kathmandu`}
                </p>

                <h1 className="text-3xl sm:text-4xl lg:text-[2.7rem] font-serif font-semibold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.65)] leading-[1.12] text-balance">
                  {themeConfig.heroHeadline}
                </h1>

                <p className="max-w-xl mx-auto lg:mx-0 text-xs sm:text-sm lg:text-[15px] text-stone-200/90 font-normal leading-relaxed text-balance">
                  {themeConfig.heroSubheadline}
                </p>

                {renderHeroCtaButtons('justify-center lg:justify-start')}
              </div>

              <div className="lg:col-span-5">
                <div className="relative mx-auto w-full max-w-[260px] sm:max-w-[285px] aspect-square rounded-2xl overflow-hidden border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.65)] bg-slate-950">
                  <img
                    src={heroImgSrc}
                    alt={`${themeConfig.hotelName} twilight facade in Kamalpokhari, Kathmandu`}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover ${heroPositionClass} transition-transform duration-700 hover:scale-[1.02]`}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : heroLayoutMode === 'centered_classic' ? (
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white pt-6 pb-20 space-y-3.5">
            <p className="text-xs font-medium tracking-[0.14em] uppercase text-amber-300/95">
              {themeConfig.heroKickerBadge || `${themeConfig.starRating}-Star Sanctuary · Kamalpokhari, Kathmandu`}
            </p>

            <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-serif font-semibold tracking-tight text-white drop-shadow-[0_3px_16px_rgba(0,0,0,0.75)] max-w-4xl mx-auto leading-[1.12] text-balance">
              {themeConfig.heroHeadline}
            </h1>

            <p className="max-w-2xl mx-auto text-xs sm:text-sm lg:text-[15px] text-stone-100/90 font-normal leading-relaxed text-balance">
              {themeConfig.heroSubheadline}
            </p>

            {renderHeroCtaButtons('justify-center')}

            <div className="pt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-stone-200/90">
              {themeConfig.googleReviewUrl && (
                <a
                  href={themeConfig.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Star className="w-3.5 h-3.5 text-amber-300 fill-current" />
                  <span className="font-medium">4.9 Google Rating</span>
                </a>
              )}
              <span className="text-white/30" aria-hidden="true">·</span>
              <span>Kamalpokhari, Kathmandu</span>
              <span className="text-white/30" aria-hidden="true">·</span>
              <span className="text-amber-200/95">Best Direct Rate</span>
            </div>
          </div>
        ) : (
          /* Default: Clean Editorial Twilight Hero */
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20">
            <div className="max-w-xl text-left text-white space-y-3.5">
              <p className="text-xs font-medium tracking-[0.14em] uppercase text-amber-300/95">
                {themeConfig.heroKickerBadge || `${themeConfig.starRating}-Star Sanctuary · Kamalpokhari, Kathmandu`}
              </p>

              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-serif font-semibold tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.7)] leading-[1.12] text-balance">
                {themeConfig.heroHeadline}
              </h1>

              <p className="text-xs sm:text-sm lg:text-[15px] text-stone-200/90 font-normal leading-relaxed max-w-lg text-balance">
                {themeConfig.heroSubheadline}
              </p>

              {renderHeroCtaButtons('justify-start')}

              <div className="pt-3 border-t border-white/15 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-200/90">
                {themeConfig.googleReviewUrl && (
                  <a
                    href={themeConfig.googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-300 fill-current shrink-0" />
                    <span className="font-medium">4.9 Google Rating</span>
                  </a>
                )}
                <span className="text-white/30" aria-hidden="true">·</span>
                <span>Kamalpokhari, Kathmandu</span>
                <span className="text-white/30" aria-hidden="true">·</span>
                <span className="text-amber-200/95">Best Direct Rate</span>
              </div>
            </div>
          </div>
        )}
        </div>
      </section>

      {/* 2. REAL-TIME BOOKING AVAILABILITY BAR */}
      <BookingBar onSearch={handleBookingBarSearch} />

      {/* 3. QUIET KATHMANDU CLIMATE STRIP */}
      {themeConfig.enableWeatherWidget !== false && (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 mt-5">
          <KathmanduWeatherWidget variant="minimal" />
        </div>
      )}

      {/* 4. ARCHITECTURAL METRICS STRIP */}
      {themeConfig.showHighlightsSection !== false && (
      <section className="mt-10 border-y border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-y-0 md:divide-x divide-stone-200/80 dark:divide-stone-800">
            <div className="md:pr-6">
              <div className="text-2xl sm:text-3xl font-serif font-semibold text-stone-900 dark:text-stone-50 tabular-nums">
                {themeConfig.stat1Value || '360°'}
              </div>
              <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {themeConfig.stat1Label || 'Mountain & Valley Views'}
              </div>
            </div>

            <div className="md:px-6">
              <div className="text-2xl sm:text-3xl font-serif font-semibold text-stone-900 dark:text-stone-50 tabular-nums">
                {themeConfig.stat2Value || '100%'}
              </div>
              <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {themeConfig.stat2Label || 'Solar Power & Hot Water'}
              </div>
            </div>

            <div className="md:px-6">
              <div className="text-2xl sm:text-3xl font-serif font-semibold text-stone-900 dark:text-stone-50 tabular-nums">
                {themeConfig.stat3Value || '4.9 ★'}
              </div>
              <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {themeConfig.stat3Label || 'Google Guest Rating'}
              </div>
            </div>

            <div className="md:pl-6">
              <div className="text-2xl sm:text-3xl font-serif font-semibold text-stone-900 dark:text-stone-50 tabular-nums">
                {themeConfig.stat4Value || '24/7'}
              </div>
              <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {themeConfig.stat4Label || 'Front Desk & Concierge'}
              </div>
            </div>
          </div>
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

      {/* 4. REAL-TIME AMENITIES & ROOFTOP DINING */}
      {themeConfig.showAmenitiesSection !== false && <AmenitiesSection />}

      {/* 5. HERITAGE & HOSPITALITY STORY */}
      {themeConfig.showHeritageSection !== false && (
      <section id="heritage" className="py-16 lg:py-24 bg-white dark:bg-stone-900 transition-colors border-t border-stone-200/80 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            <div className="lg:col-span-6 space-y-5">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-800 dark:text-amber-400">
                {themeConfig.heritageSubtitle || 'Kathmandu Valley Living'}
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-stone-900 dark:text-stone-50 tracking-tight text-balance">
                {themeConfig.heritageTitle || 'Peaceful Haven in Kamalpokhari, Kathmandu'}
              </h2>
              <p className="text-sm sm:text-[15px] text-stone-600 dark:text-stone-300 leading-relaxed">
                {themeConfig.heritageStoryP1 || 'Situated in the historic Kamalpokhari neighborhood of central Kathmandu, Kamal Hotel offers travelers a tranquil oasis away from city bustle while keeping you minutes away from City Center, Thamel, and Durbar Marg.'}
              </p>
              <p className="text-sm sm:text-[15px] text-stone-600 dark:text-stone-300 leading-relaxed">
                {themeConfig.heritageStoryP2 || 'Built with authentic Newari woodwork, warm river stone masonry, and peaceful courtyard views, our boutique property pairs traditional Himalayan hospitality with uninterrupted fiber-optic Wi-Fi and solar hot water continuity.'}
              </p>

              {(themeConfig.heritageQuote || themeConfig.heritageAuthor) && (
                <blockquote className="border-l-2 border-amber-500/70 pl-4 py-0.5 space-y-1">
                  <div className="text-xs font-serif font-semibold text-stone-900 dark:text-stone-100">
                    {themeConfig.heritageQuote || '“Atithi Devo Bhava”'}
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                    {themeConfig.heritageAuthor || 'Guest is equivalent to God in Himalayan culture. Our local team is here for you 24/7.'}
                  </p>
                </blockquote>
              )}

              <div className="grid grid-cols-2 gap-6 pt-5 border-t border-stone-200/80 dark:border-stone-800">
                <div>
                  <div className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-50 tabular-nums">
                    {themeConfig.heritageStat1Number || '2 Mins'}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    {themeConfig.heritageStat1Text || 'Walk to Kamalpokhari Pond & City Center'}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-50 tabular-nums">
                    {themeConfig.heritageStat2Number || '15 Mins'}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    {themeConfig.heritageStat2Text || 'Tribhuvan International Airport (TIA)'}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-800 shadow-lg">
                <img
                  src={suiteImg}
                  alt="Carved woodwork suite at Kamal Hotel Kathmandu"
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
      <section className="py-16 lg:py-24 bg-stone-50 dark:bg-stone-950 border-t border-stone-200/80 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-xl">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-800 dark:text-amber-400 mb-2">
                {themeConfig.reviewsSectionSubtitle || 'Guest Impressions'}
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-stone-900 dark:text-stone-50 tracking-tight">
                {themeConfig.reviewsSectionTitle || 'Loved by Travelers in Kathmandu'}
              </h2>
            </div>

            {themeConfig.googleReviewUrl && (
              <a
                href={themeConfig.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-medium text-stone-900 dark:text-stone-100 hover:border-stone-400 dark:hover:border-stone-600 transition-colors self-start md:self-auto"
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Write a Review</span>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {approvedReviews.map((review) => (
              <article
                key={review.id}
                className="bg-white dark:bg-stone-900 p-6 rounded-xl border border-stone-200/90 dark:border-stone-800 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[...Array(review.rating)].map((_, idx) => (
                      <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                    “{review.quote}”
                  </p>
                </div>
                <div className="pt-4 border-t border-stone-100 dark:border-stone-800 text-xs">
                  <div className="font-semibold text-stone-900 dark:text-stone-100">{review.author}</div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
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
      <section id="location" className="py-16 lg:py-24 bg-white dark:bg-stone-900 border-t border-stone-200/80 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-800 dark:text-amber-400">
                {themeConfig.neighborhoodGuideSubtitle || 'Neighborhood Guide'}
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-stone-900 dark:text-stone-50 tracking-tight">
                {themeConfig.neighborhoodGuideTitle || 'Kamalpokhari & Nearby Landmarks'}
              </h2>
              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                {themeConfig.neighborhoodGuideDescription ||
                  'Located on Kamalpokhari Marg beside the historic lotus pond. Explore landmarks, dining, and transit stops on the interactive map below.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                <MapPin className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
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
            <div className="p-6 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="font-serif font-semibold text-base text-stone-900 dark:text-stone-100">
                  {themeConfig.hotelName} · {themeConfig.neighborhood}
                </div>
                <div className="text-stone-600 dark:text-stone-300">
                  {themeConfig.address} · 15 min from TIA Airport · 2 min walk to City Center Mall
                </div>
              </div>
              <a
                href={themeConfig.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium whitespace-nowrap shrink-0"
              >
                <span>Open in Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Clean Hairline Transit Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 sm:gap-y-0 sm:divide-x divide-stone-200 dark:divide-stone-800 pt-6 border-t border-stone-200/80 dark:border-stone-800 text-xs">
            <div className="sm:pr-6">
              <div className="font-semibold text-stone-900 dark:text-stone-100 tabular-nums">15 min</div>
              <div className="text-stone-500 dark:text-stone-400 mt-0.5">Tribhuvan International Airport (TIA)</div>
            </div>
            <div className="sm:px-6">
              <div className="font-semibold text-stone-900 dark:text-stone-100 tabular-nums">2 min</div>
              <div className="text-stone-500 dark:text-stone-400 mt-0.5">Kamalpokhari Lotus Pond & City Center</div>
            </div>
            <div className="sm:pl-6">
              <div className="font-semibold text-stone-900 dark:text-stone-100 tabular-nums">8 min</div>
              <div className="text-stone-500 dark:text-stone-400 mt-0.5">Thamel, Narayanhiti & Durbar Marg</div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQS HAIRLINE ACCORDION */}
      {themeConfig.showFaqSection !== false && (
      <section id="faq" className="py-16 lg:py-24 bg-stone-50 dark:bg-stone-950 border-t border-stone-200/80 dark:border-stone-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-800 dark:text-amber-400 mb-2">
              {themeConfig.faqSectionSubtitle || 'Guest Assistance'}
            </p>
            <h2 className="text-3xl font-serif font-semibold text-stone-900 dark:text-stone-50 tracking-tight">
              {themeConfig.faqSectionTitle || 'Frequently Asked Questions'}
            </h2>
          </div>

          <div className="divide-y divide-stone-200 dark:divide-stone-800 border-y border-stone-200 dark:border-stone-800">
            {faqs.map((faq, index) => (
              <div key={faq.id || index}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full py-4 sm:py-5 text-left flex items-center justify-between gap-4 text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100 hover:text-amber-800 dark:hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="pb-5 text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed max-w-2xl">
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
      <footer className="bg-stone-950 text-stone-400 border-t border-stone-800/80 pt-14 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-stone-800/80">
            
            <div className="space-y-3">
              <span className="text-xl font-serif font-semibold text-white tracking-tight block">
                {themeConfig.hotelName}
              </span>
              <p className="text-xs text-stone-400 leading-relaxed">
                {themeConfig.footerDescription ||
                  'Boutique hospitality in Kamalpokhari, Kathmandu with high-speed fiber Wi-Fi and Himalayan rooftop views.'}
              </p>
              
              {(themeConfig.facebookUrl || themeConfig.instagramUrl || themeConfig.tiktokUrl) && (
                <div className="flex items-center gap-4 pt-1 text-xs">
                  {themeConfig.facebookUrl && (
                    <a href={themeConfig.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-stone-300 hover:text-white transition-colors">
                      Facebook
                    </a>
                  )}
                  {themeConfig.instagramUrl && (
                    <a href={themeConfig.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-stone-300 hover:text-white transition-colors">
                      Instagram
                    </a>
                  )}
                  {themeConfig.tiktokUrl && (
                    <a href={themeConfig.tiktokUrl} target="_blank" rel="noopener noreferrer" className="text-stone-300 hover:text-white transition-colors">
                      TikTok
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="font-semibold text-white">Contact</div>
              <div className="space-y-1.5">
                <div>
                  <a href={`mailto:${themeConfig.contactEmail}`} className="hover:text-white transition-colors">
                    {themeConfig.contactEmail}
                  </a>
                </div>
                <div className="tabular-nums">{themeConfig.contactPhone}</div>
                <div className="text-stone-500">Front Desk · 24/7 Concierge</div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="font-semibold text-white">Location</div>
              <p className="leading-relaxed">{themeConfig.address}</p>
              <div>
                <a
                  href={themeConfig.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1"
                >
                  <span>Directions</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="font-semibold text-white">Operations</div>
              <p className="text-stone-400">
                Front desk, dining POS, kitchen display & CMS portal.
              </p>
              <button
                type="button"
                onClick={onOpenDashboard}
                className="inline-flex items-center px-3.5 py-1.5 rounded-lg border border-stone-800 bg-stone-900 text-stone-200 hover:text-white hover:border-stone-700 transition-colors cursor-pointer text-xs font-medium"
              >
                Staff Portal
              </button>
            </div>

          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <div>
              {themeConfig.footerCopyrightText ||
                `© 2026 ${themeConfig.hotelName}. Kamalpokhari, Kathmandu, Nepal.`}
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span>Direct Best Rate</span>
              <span aria-hidden="true">·</span>
              <span>NPR, USD & INR</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
