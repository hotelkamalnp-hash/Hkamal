import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import {
  AmenityItem,
  FaqItem,
  GuestReview,
  HeroCtaAction,
  HeroCtaButton,
  HeroCtaVariant,
  HotelThemeConfig,
  ThemePalette,
} from '../../types/hotel';
import { getThemeClasses } from '../../utils/theme';
import {
  ArrowDown,
  ArrowUp,
  BedDouble,
  Check,
  Coins,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Image as ImageIcon,
  LayoutGrid,
  MapPin,
  MousePointerClick,
  Navigation,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Share2,
  Sliders,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  Upload,
  Utensils,
} from 'lucide-react';

import { EmailSmtpSettingsCard } from './EmailSmtpSettingsCard';
import { DatabaseStorageManagementCard } from './DatabaseStorageManagementCard';

interface CmsManagerPanelProps {
  onNavigateTab: (
    tab: 'media' | 'rooms' | 'room_floors' | 'restaurant' | 'coupons'
  ) => void;
  onPreviewGuestSite?: () => void;
  onAddAmenity: () => void;
  onEditAmenity: (amenity: AmenityItem) => void;
  onAddReview: () => void;
  onEditReview: (review: GuestReview) => void;
  onAddFaq: () => void;
  onEditFaq: (faq: FaqItem) => void;
}

type CmsSectionTab =
  | 'all'
  | 'hero_cta'
  | 'branding_palette'
  | 'sections_copy'
  | 'rates_contact'
  | 'email_smtp'
  | 'database_storage'
  | 'collections';

const DEFAULT_HERO_ASSET = './assets/aistudio/hotel_kamal_new_look_6cc0fe47.jpg';

const CTA_ACTION_OPTIONS: { value: HeroCtaAction; label: string }[] = [
  { value: 'booking_modal', label: 'Open Reservation / Booking Modal' },
  { value: 'guest_portal', label: 'Open In-House Guest Room Portal' },
  { value: 'scroll_rooms', label: 'Scroll to Rooms & 2D Floor Plan' },
  { value: 'scroll_dining', label: 'Scroll to Ground-Floor Dining' },
  { value: 'scroll_amenities', label: 'Scroll to Amenities & Facilities' },
  { value: 'scroll_heritage', label: 'Scroll to Heritage Story' },
  { value: 'scroll_location', label: 'Scroll to Neighborhood Map Guide' },
  { value: 'scroll_faq', label: 'Scroll to FAQ Accordion' },
  { value: 'external_url', label: 'Open Custom Link / External URL' },
];

const CTA_STYLE_OPTIONS: { value: HeroCtaVariant; label: string }[] = [
  { value: 'primary', label: 'Primary Accent (Gold/Theme Highlight)' },
  { value: 'amber_outline', label: 'Dark Glass & Amber Border' },
  { value: 'glass_light', label: 'Frosted Light Outline' },
];

export const CmsManagerPanel: React.FC<CmsManagerPanelProps> = ({
  onNavigateTab,
  onPreviewGuestSite,
  onAddAmenity,
  onEditAmenity,
  onAddReview,
  onEditReview,
  onAddFaq,
  onEditFaq,
}) => {
  const {
    themeConfig,
    updateThemeConfig,
    amenities,
    deleteAmenity,
    reviews,
    deleteReview,
    faqs,
    deleteFaq,
    rooms,
    showToast,
  } = useHotel();

  const [draft, setDraft] = useState<HotelThemeConfig>(() => ({ ...themeConfig }));
  const prevSavedRef = useRef<HotelThemeConfig>(themeConfig);
  const [activeSubTab, setActiveSubTab] = useState<CmsSectionTab>('all');

  // Keep clean draft keys synchronized when external updates happen (e.g. from Media tab or Onboarding Wizard)
  useEffect(() => {
    const prevSaved = prevSavedRef.current;
    const assignField = <K extends keyof HotelThemeConfig>(
      target: HotelThemeConfig,
      key: K,
      value: HotelThemeConfig[K]
    ) => {
      target[key] = value;
    };
    setDraft((prevDraft) => {
      const nextDraft: HotelThemeConfig = { ...prevDraft };
      (Object.keys(themeConfig) as (keyof HotelThemeConfig)[]).forEach((key) => {
        if (JSON.stringify(prevDraft[key]) === JSON.stringify(prevSaved[key])) {
          assignField(nextDraft, key, themeConfig[key]);
        }
      });
      return nextDraft;
    });
    prevSavedRef.current = themeConfig;
  }, [themeConfig]);

  const themeClasses = getThemeClasses(draft.palette);

  const updateDraft = (patch: Partial<HotelThemeConfig>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const isFieldDirty = (keys: (keyof HotelThemeConfig)[]) =>
    keys.some((k) => JSON.stringify(draft[k]) !== JSON.stringify(themeConfig[k]));

  const dirtyHeroCta = isFieldDirty([
    'enableAnnouncement',
    'announcementText',
    'heroImage',
    'heroLayoutMode',
    'heroBackgroundFit',
    'heroImagePosition',
    'heroOverlayOpacity',
    'enableHeroParallax',
    'heroKickerBadge',
    'heroHeadline',
    'heroSubheadline',
    'tagline',
    'heroCtaButtons',
    'enablePromoBanner',
    'promoBannerType',
    'promoBannerText',
    'promoBannerCode',
    'promoBannerCtaLabel',
    'promoBannerCtaTarget',
  ]);

  const dirtyBrandPalette = isFieldDirty([
    'hotelName',
    'hotelLegalName',
    'starRating',
    'panVatNumber',
    'palette',
    'brightnessMode',
    'fontFamily',
    'footerDescription',
    'footerCopyrightText',
  ]);

  const dirtyRates = isFieldDirty([
    'defaultCurrency',
    'exchangeRates',
    'seasonalSurgeMultiplier',
    'taxRatePercent',
  ]);

  const dirtyContacts = isFieldDirty([
    'contactEmail',
    'officialEmail',
    'contactPhone',
    'receptionPhone',
    'whatsappNumber',
    'checkInTime',
    'checkOutTime',
    'totalFloorsCount',
    'googleReviewUrl',
    'facebookUrl',
    'instagramUrl',
    'tiktokUrl',
  ]);

  const dirtyVisibility = isFieldDirty([
    'enableWeatherWidget',
    'showHighlightsSection',
    'showRoomsSection',
    'showAmenitiesSection',
    'showHeritageSection',
    'showReviewsSection',
    'enableNeighborhoodGuide',
    'showFaqSection',
  ]);

  const dirtyHighlights = isFieldDirty([
    'stat1Value',
    'stat1Label',
    'stat2Value',
    'stat2Label',
    'stat3Value',
    'stat3Label',
    'stat4Value',
    'stat4Label',
  ]);

  const dirtyDiningRooms = isFieldDirty([
    'roomsSectionSubtitle',
    'roomsSectionTitle',
    'roomsSectionDescription',
    'amenitiesSectionSubtitle',
    'amenitiesSectionTitle',
    'amenitiesSectionDescription',
    'rooftopDiningStatus',
    'rooftopOpeningDateText',
    'rooftopTeaserHeadline',
    'rooftopTeaserDescription',
  ]);

  const dirtyHeritage = isFieldDirty([
    'heritageSubtitle',
    'heritageTitle',
    'heritageStoryP1',
    'heritageStoryP2',
    'heritageStat1Number',
    'heritageStat1Text',
    'heritageStat2Number',
    'heritageStat2Text',
    'heritageQuote',
    'heritageAuthor',
  ]);

  const dirtyLocation = isFieldDirty([
    'address',
    'neighborhood',
    'city',
    'latitude',
    'longitude',
    'googleMapsUrl',
    'neighborhoodGuideSubtitle',
    'neighborhoodGuideTitle',
    'neighborhoodGuideDescription',
    'neighborhoodSearchRadiusMeters',
  ]);

  const dirtyReviewsFaqCopy = isFieldDirty([
    'reviewsSectionSubtitle',
    'reviewsSectionTitle',
    'faqSectionSubtitle',
    'faqSectionTitle',
  ]);

  const dirtySectionCount = [
    dirtyHeroCta,
    dirtyBrandPalette,
    dirtyRates,
    dirtyContacts,
    dirtyVisibility,
    dirtyHighlights,
    dirtyDiningRooms,
    dirtyHeritage,
    dirtyLocation,
    dirtyReviewsFaqCopy,
  ].filter(Boolean).length;

  const hasUnsavedChanges = dirtySectionCount > 0;

  const saveFields = (keys: (keyof HotelThemeConfig)[], sectionLabel: string) => {
    const patch: Partial<HotelThemeConfig> = {};
    keys.forEach((key) => {
      (patch as Record<string, unknown>)[key] = draft[key];
    });
    updateThemeConfig(patch);
    showToast('Section Saved', `${sectionLabel} published to live website.`, 'success');
  };

  const handleSaveAll = () => {
    updateThemeConfig(draft);
    showToast(
      'All CMS Changes Published',
      'Website content, Hero CTA buttons, layout, and rates are now live.',
      'success'
    );
  };

  const handleDiscardAll = () => {
    setDraft({ ...themeConfig });
    showToast('Draft Discarded', 'Reverted unsaved CMS edits back to the live published state.', 'info');
  };

  // Hero CTA Buttons Management Helpers
  const ctaButtons: HeroCtaButton[] = useMemo(
    () =>
      Array.isArray(draft.heroCtaButtons)
        ? draft.heroCtaButtons
        : [
            {
              id: 'cta-reserve',
              label: draft.heroCtaPrimaryText || 'Book Your Stay',
              action: 'booking_modal',
              variant: 'primary',
              enabled: true,
            },
            {
              id: 'cta-rooms',
              label: draft.heroCtaSecondaryText || 'Explore Suites',
              action: 'scroll_rooms',
              variant: 'glass_light',
              enabled: true,
            },
          ],
    [draft.heroCtaButtons, draft.heroCtaPrimaryText, draft.heroCtaSecondaryText]
  );

  const handleAddCtaButton = (preset?: Partial<HeroCtaButton>) => {
    const nextBtn: HeroCtaButton = {
      id: `cta-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      label: preset?.label || 'Explore Rooms',
      action: preset?.action || 'scroll_rooms',
      variant: preset?.variant || (ctaButtons.length === 0 ? 'primary' : 'glass_light'),
      url: preset?.url || '',
      enabled: true,
    };
    updateDraft({ heroCtaButtons: [...ctaButtons, nextBtn] });
  };

  const handleUpdateCtaButton = (id: string, patch: Partial<HeroCtaButton>) => {
    const updated = ctaButtons.map((btn) => (btn.id === id ? { ...btn, ...patch } : btn));
    const firstPrimary = updated.find((b) => b.enabled && b.variant === 'primary');
    const firstSecondary = updated.find((b) => b.enabled && b.variant !== 'primary');
    updateDraft({
      heroCtaButtons: updated,
      ...(firstPrimary ? { heroCtaPrimaryText: firstPrimary.label } : {}),
      ...(firstSecondary ? { heroCtaSecondaryText: firstSecondary.label } : {}),
    });
  };

  const handleRemoveCtaButton = (id: string) => {
    const updated = ctaButtons.filter((btn) => btn.id !== id);
    updateDraft({ heroCtaButtons: updated });
  };

  const handleMoveCtaButton = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= ctaButtons.length) return;
    const copy = [...ctaButtons];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    updateDraft({ heroCtaButtons: copy });
  };

  const SectionSaveBar: React.FC<{
    isDirty: boolean;
    onSave: () => void;
    label: string;
  }> = ({ isDirty, onSave, label }) => (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-200/80 dark:border-stone-700/80">
      <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
        {isDirty ? (
          <span className="text-amber-700 dark:text-amber-400 font-semibold">
            Unsaved edits in this section — click Save to publish
          </span>
        ) : (
          <span>Saved &amp; synced with live site</span>
        )}
      </span>
      <button
        type="button"
        onClick={onSave}
        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
          isDirty
            ? `${themeClasses.primary} shadow-sm`
            : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-600'
        }`}
      >
        <Save className="w-3.5 h-3.5" />
        <span>{isDirty ? `Save ${label}` : 'Saved'}</span>
      </button>
    </div>
  );

  const showBlock = (tab: CmsSectionTab) => activeSubTab === 'all' || activeSubTab === tab;

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header & Global Save / Discard Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-stone-200 dark:border-stone-800">
        <div>
          <span className="text-xs font-mono font-bold uppercase text-amber-700 dark:text-amber-400">
            End-to-End Content Management System (CMS)
          </span>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 mt-0.5">
            Full Website Builder, Hero CTA Studio &amp; Live Content Editor
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Customize every section, add or remove Hero Call-to-Action buttons, toggle visibility, and save individual sections or publish everything together.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onPreviewGuestSite && (
            <button
              type="button"
              onClick={onPreviewGuestSite}
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Public Site</span>
            </button>
          )}

          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleDiscardAll}
              className="px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard ({dirtySectionCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveAll}
            className={`px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              hasUnsavedChanges
                ? `${themeClasses.primary} shadow-md ring-2 ring-amber-400/50`
                : 'bg-emerald-700 text-white hover:bg-emerald-800'
            }`}
          >
            {hasUnsavedChanges ? <Save className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
            <span>{hasUnsavedChanges ? `Save & Publish All (${dirtySectionCount})` : 'All Changes Published'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Pills */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
        {(
          [
            { id: 'all', label: 'All CMS Modules', badge: dirtySectionCount > 0 ? dirtySectionCount : null },
            { id: 'hero_cta', label: 'Hero & CTA Buttons', badge: dirtyHeroCta ? 1 : null },
            { id: 'branding_palette', label: 'Brand, Palette & Footer', badge: dirtyBrandPalette ? 1 : null },
            { id: 'sections_copy', label: 'Sections, Dining & Map', badge: dirtyVisibility || dirtyHighlights || dirtyDiningRooms || dirtyHeritage || dirtyLocation || dirtyReviewsFaqCopy ? '!' : null },
            { id: 'rates_contact', label: 'Rates, Tax & Contacts', badge: dirtyRates || dirtyContacts ? '!' : null },
            { id: 'email_smtp', label: 'Email & SMTP Verification', badge: null },
            { id: 'database_storage', label: 'Database & Supabase Storage', badge: null },
            { id: 'collections', label: `Amenities, Reviews & FAQs (${amenities.length + reviews.length + faqs.length})`, badge: null },
          ] as { id: CmsSectionTab; label: string; badge: number | string | null }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500 text-stone-950 font-bold tabular-nums">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ===================== 1. HERO, PROMO BANNER & DYNAMIC CTA BUTTONS ===================== */}
      {showBlock('hero_cta') && (
        <div className="space-y-6 p-5 sm:p-6 rounded-xl bg-gradient-to-br from-amber-50/50 via-stone-50 to-white dark:from-stone-800/70 dark:to-stone-900 border border-amber-200/80 dark:border-stone-700 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-amber-600" />
                <span>Hero Section, Announcement Bar &amp; Call-to-Action Button Studio</span>
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Add, edit, toggle, reorder, or remove Hero Call-to-Action buttons, customize headlines, framing, scrim opacity, and promo banners.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('media')}
              className="px-3 py-1.5 rounded-lg border border-amber-600/40 bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-300 font-semibold text-xs hover:bg-amber-50 dark:hover:bg-stone-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open Full Media Gallery &rarr;
            </button>
          </div>

          {/* Top Announcement Bar */}
          <div className="p-4 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                Top Header Announcement Strip
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={draft.enableAnnouncement}
                  onChange={(e) => updateDraft({ enableAnnouncement: e.target.checked })}
                  className="w-4 h-4 accent-amber-600"
                />
                <span>Show Header Announcement Bar</span>
              </label>
            </div>
            <input
              type="text"
              value={draft.announcementText}
              onChange={(e) => updateDraft({ announcementText: e.target.value })}
              placeholder="Namaste! Book direct for complimentary welcome tea..."
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-2 text-stone-900 dark:text-stone-100"
            />
          </div>

          {/* Hero Copy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Hero Kicker Badge (Top Line)</label>
              <input
                type="text"
                value={draft.heroKickerBadge || ''}
                onChange={(e) => updateDraft({ heroKickerBadge: e.target.value })}
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-2 text-stone-800 dark:text-stone-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Main Hero Headline</label>
              <input
                type="text"
                value={draft.heroHeadline}
                onChange={(e) => updateDraft({ heroHeadline: e.target.value })}
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-2 text-stone-800 dark:text-stone-100 font-semibold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Hero Value Proposition Subtitle</label>
              <textarea
                rows={2}
                value={draft.heroSubheadline}
                onChange={(e) => updateDraft({ heroSubheadline: e.target.value })}
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-2 text-stone-800 dark:text-stone-100"
              />
            </div>
          </div>

          {/* DYNAMIC HERO CALL-TO-ACTION BUTTONS BUILDER (ADD / EDIT / REMOVE / REORDER) */}
          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-amber-300/70 dark:border-amber-800/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5 text-amber-600" />
                  <span>Hero Call-to-Action (CTA) Buttons ({ctaButtons.length})</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Add unlimited CTA buttons, customize action targets &amp; styles, toggle visibility, reorder, or remove any button.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleAddCtaButton({
                      label: 'Explore 2D Floor Plan',
                      action: 'scroll_rooms',
                      variant: 'amber_outline',
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-[11px] font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Floor Plan CTA</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAddCtaButton({
                      label: 'Neighborhood Guide',
                      action: 'scroll_location',
                      variant: 'glass_light',
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-[11px] font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Map CTA</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCtaButton()}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${themeClasses.primary}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add CTA Button</span>
                </button>
              </div>
            </div>

            {/* Live Hero CTA Preview Bar */}
            <div className="p-3 rounded-lg bg-slate-950 text-white space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                Live Hero CTA Preview ({ctaButtons.filter((b) => b.enabled && b.label.trim()).length} active)
              </div>
              {ctaButtons.filter((b) => b.enabled && b.label.trim()).length === 0 ? (
                <div className="text-[11px] text-stone-400 italic py-1">
                  All CTA buttons removed or hidden — Hero will render without CTA buttons.
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {ctaButtons
                    .filter((b) => b.enabled && b.label.trim())
                    .map((cta) => (
                      <span
                        key={cta.id}
                        className={
                          cta.variant === 'primary'
                            ? `px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md whitespace-nowrap ${themeClasses.primary}`
                            : cta.variant === 'amber_outline'
                            ? 'px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-md bg-slate-900 text-amber-200 border border-amber-400/50 whitespace-nowrap'
                            : 'px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider rounded-md bg-white/10 text-white border border-white/30 whitespace-nowrap'
                        }
                      >
                        {cta.label}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Individual Editable CTA Rows */}
            {ctaButtons.length === 0 ? (
              <div className="p-5 text-center rounded-lg border border-dashed border-stone-300 dark:border-stone-700 space-y-2">
                <p className="text-stone-500">No Hero Call-to-Action buttons configured.</p>
                <button
                  type="button"
                  onClick={() =>
                    handleAddCtaButton({
                      label: 'Book Your Stay',
                      action: 'booking_modal',
                      variant: 'primary',
                    })
                  }
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${themeClasses.primary}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Primary Booking CTA</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {ctaButtons.map((cta, idx) => (
                  <div
                    key={cta.id}
                    className={`p-3 rounded-lg border space-y-2.5 transition-colors ${
                      cta.enabled
                        ? 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700'
                        : 'bg-stone-100/60 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800 opacity-70'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                          Button Label
                        </label>
                        <input
                          type="text"
                          value={cta.label}
                          onChange={(e) => handleUpdateCtaButton(cta.id, { label: e.target.value })}
                          placeholder="e.g. Reserve Your Stay"
                          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold text-stone-900 dark:text-stone-100"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                          Click Action / Target
                        </label>
                        <select
                          value={cta.action}
                          onChange={(e) =>
                            handleUpdateCtaButton(cta.id, { action: e.target.value as HeroCtaAction })
                          }
                          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-medium text-stone-900 dark:text-stone-100"
                        >
                          {CTA_ACTION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                          Visual Style
                        </label>
                        <select
                          value={cta.variant}
                          onChange={(e) =>
                            handleUpdateCtaButton(cta.id, { variant: e.target.value as HeroCtaVariant })
                          }
                          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-medium text-stone-900 dark:text-stone-100"
                        >
                          {CTA_STYLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-1 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateCtaButton(cta.id, { enabled: !cta.enabled })}
                          title={cta.enabled ? 'Hide button' : 'Show button'}
                          className={`p-1.5 rounded border cursor-pointer ${
                            cta.enabled
                              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : 'border-stone-300 dark:border-stone-700 text-stone-400'
                          }`}
                        >
                          {cta.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveCtaButton(idx, -1)}
                          disabled={idx === 0}
                          title="Move left / up"
                          className="p-1.5 rounded border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveCtaButton(idx, 1)}
                          disabled={idx === ctaButtons.length - 1}
                          title="Move right / down"
                          className="p-1.5 rounded border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCtaButton(cta.id)}
                          title="Remove CTA Button"
                          className="p-1.5 rounded border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {cta.action === 'external_url' && (
                      <div>
                        <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                          Destination URL (HTTPS or tel:/mailto:/https://wa.me/...)
                        </label>
                        <input
                          type="text"
                          value={cta.url || ''}
                          onChange={(e) => handleUpdateCtaButton(cta.id, { url: e.target.value })}
                          placeholder="https://wa.me/9779851023456"
                          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono text-xs"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hero Photo, Framing & Parallax */}
          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-4">
            <div className="font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Hero Image, Parallax &amp; Architectural Framing</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-3 aspect-video rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 bg-slate-950">
                <img
                  src={draft.heroImage || DEFAULT_HERO_ASSET}
                  alt="Hero preview"
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover ${
                    draft.heroImagePosition === 'top'
                      ? 'object-top'
                      : draft.heroImagePosition === 'bottom'
                      ? 'object-bottom'
                      : 'object-center'
                  }`}
                />
              </div>
              <div className="md:col-span-9 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={draft.heroImage}
                    onChange={(e) => updateDraft({ heroImage: e.target.value })}
                    placeholder={DEFAULT_HERO_ASSET}
                    className="flex-1 min-w-[200px] bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono text-xs"
                  />
                  <label className="px-3 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const img = new window.Image();
                          img.onload = () => {
                            const maxDim = 1600;
                            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                            const canvas = document.createElement('canvas');
                            canvas.width = Math.round(img.width * scale);
                            canvas.height = Math.round(img.height * scale);
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                              updateDraft({ heroImage: canvas.toDataURL('image/jpeg', 0.88) });
                              showToast('Image Staged', 'Click "Save Hero & CTA Settings" to publish.', 'info');
                            }
                          };
                          if (typeof reader.result === 'string') img.src = reader.result;
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft({
                        heroImage: DEFAULT_HERO_ASSET,
                        heroLayoutMode: 'full_bleed',
                        heroBackgroundFit: 'whole_building',
                        heroImagePosition: 'center',
                      })
                    }
                    className="px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Restore Default
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Hero Layout</label>
                    <select
                      value={draft.heroLayoutMode || 'full_bleed'}
                      onChange={(e) =>
                        updateDraft({
                          heroLayoutMode: e.target.value as 'full_bleed' | 'centered_classic' | 'architectural_showcase',
                        })
                      }
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
                    >
                      <option value="full_bleed">Luxury Panoramic Twilight</option>
                      <option value="centered_classic">Centered Classic Overlay</option>
                      <option value="architectural_showcase">Split Architectural Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Background Fit</label>
                    <select
                      value={draft.heroBackgroundFit || 'whole_building'}
                      onChange={(e) =>
                        updateDraft({ heroBackgroundFit: e.target.value as 'whole_building' | 'cover' })
                      }
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
                    >
                      <option value="whole_building">Zoomed Whole Building</option>
                      <option value="cover">Edge-to-Edge Cover</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Focal Alignment</label>
                    <select
                      value={draft.heroImagePosition || 'center'}
                      onChange={(e) =>
                        updateDraft({ heroImagePosition: e.target.value as 'center' | 'top' | 'bottom' })
                      }
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
                    >
                      <option value="center">Center Facade</option>
                      <option value="top">Upper Stories &amp; Sky</option>
                      <option value="bottom">Signage &amp; Entrance</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span>Hero Scrim Darkness</span>
                      <span className="font-mono text-amber-700 dark:text-amber-400">
                        {Math.round((draft.heroOverlayOpacity ?? 0.32) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="0.75"
                      step="0.02"
                      value={draft.heroOverlayOpacity ?? 0.32}
                      onChange={(e) => updateDraft({ heroOverlayOpacity: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={draft.enableHeroParallax ?? true}
                      onChange={(e) => updateDraft({ enableHeroParallax: e.target.checked })}
                      className="w-4 h-4 accent-amber-600"
                    />
                    <span>Enable Scroll Parallax on Hero Photo</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Promo Banner */}
          <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>Hero Promotional Announcement Banner (Seasonal Offers / Flash Sales)</span>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={draft.enablePromoBanner ?? true}
                  onChange={(e) => updateDraft({ enablePromoBanner: e.target.checked })}
                  className="w-4 h-4 accent-amber-600"
                />
                <span>Show Promo Banner</span>
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">Campaign Type</label>
                <select
                  value={draft.promoBannerType || 'seasonal_offer'}
                  onChange={(e) => {
                    const nextType = e.target.value as 'seasonal_offer' | 'flash_sale';
                    updateDraft({
                      promoBannerType: nextType,
                      promoBannerCtaLabel: nextType === 'flash_sale' ? 'Flash Sales' : 'Seasonal Offers',
                    });
                  }}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
                >
                  <option value="seasonal_offer">Seasonal Offers</option>
                  <option value="flash_sale">Flash Sales</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Banner CTA Label</label>
                <input
                  type="text"
                  value={draft.promoBannerCtaLabel || ''}
                  onChange={(e) => updateDraft({ promoBannerCtaLabel: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Banner CTA Action</label>
                <select
                  value={draft.promoBannerCtaTarget || 'rooms'}
                  onChange={(e) =>
                    updateDraft({ promoBannerCtaTarget: e.target.value as 'rooms' | 'booking_modal' | 'dining' })
                  }
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
                >
                  <option value="rooms">Scroll to Rooms &amp; Suites</option>
                  <option value="booking_modal">Open Reservation Modal</option>
                  <option value="dining">Scroll to Ground-Floor Dining</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Promo Code</label>
                <input
                  type="text"
                  value={draft.promoBannerCode || ''}
                  onChange={(e) => updateDraft({ promoBannerCode: e.target.value.toUpperCase() })}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono font-bold text-amber-600"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block font-semibold mb-1">Announcement Copy</label>
                <input
                  type="text"
                  value={draft.promoBannerText || ''}
                  onChange={(e) => updateDraft({ promoBannerText: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
            </div>
          </div>

          <SectionSaveBar
            isDirty={dirtyHeroCta}
            label="Hero & CTAs"
            onSave={() =>
              saveFields(
                [
                  'enableAnnouncement',
                  'announcementText',
                  'heroImage',
                  'heroLayoutMode',
                  'heroBackgroundFit',
                  'heroImagePosition',
                  'heroOverlayOpacity',
                  'enableHeroParallax',
                  'heroKickerBadge',
                  'heroHeadline',
                  'heroSubheadline',
                  'heroCtaButtons',
                  'heroCtaPrimaryText',
                  'heroCtaSecondaryText',
                  'enablePromoBanner',
                  'promoBannerType',
                  'promoBannerText',
                  'promoBannerCode',
                  'promoBannerCtaLabel',
                  'promoBannerCtaTarget',
                ],
                'Hero & CTA Settings'
              )
            }
          />
        </div>
      )}

      {/* ===================== 2. BRAND IDENTITY, PALETTE, BRIGHTNESS & FOOTER ===================== */}
      {showBlock('branding_palette') && (
        <div className="space-y-5 p-5 sm:p-6 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-600" />
                <span>Brand Identity, Visual Palette, Typography &amp; Footer</span>
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Configure property name, legal details, color palette, brightness ambiance, typography, and footer text.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                updateDraft({
                  palette: 'bright-himalayan-gold',
                  brightnessMode: 'warm-sunlit',
                  heroOverlayOpacity: 0.32,
                })
              }
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Preset: Bright Himalayan Gold</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 p-1.5 flex items-center justify-center shrink-0">
                <img
                  src="./kamal-hotel-logo.png"
                  alt="Hotel Kamal PNG Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="font-bold text-stone-900 dark:text-stone-100">
                  Official Hotel Kamal Brand Emblem (PNG)
                </div>
                <p className="text-[11px] text-stone-500">
                  High-resolution 1024×1024 transparent-ready PNG emblem for print invoices, signage, and partner listings.
                </p>
              </div>
            </div>
            <a
              href="./kamal-hotel-logo.png"
              download="kamal-hotel-logo.png"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Logo (PNG)</span>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold mb-1">Hotel Brand Name</label>
              <input
                type="text"
                value={draft.hotelName}
                onChange={(e) => updateDraft({ hotelName: e.target.value })}
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Legal Entity Name</label>
              <input
                type="text"
                value={draft.hotelLegalName || ''}
                onChange={(e) => updateDraft({ hotelLegalName: e.target.value })}
                placeholder="Kamal Hospitality Pvt. Ltd."
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Star Rating</label>
              <select
                value={draft.starRating}
                onChange={(e) => updateDraft({ starRating: Number(e.target.value) })}
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
              >
                <option value={3}>3-Star Boutique</option>
                <option value={4}>4-Star Heritage</option>
                <option value={5}>5-Star Luxury</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">PAN / VAT Number</label>
              <input
                type="text"
                value={draft.panVatNumber || ''}
                onChange={(e) => updateDraft({ panVatNumber: e.target.value })}
                placeholder="609812345"
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Hotel Tagline</label>
              <input
                type="text"
                value={draft.tagline}
                onChange={(e) => updateDraft({ tagline: e.target.value })}
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Ambient Brightness Mode</label>
              <select
                value={draft.brightnessMode || 'warm-sunlit'}
                onChange={(e) => updateDraft({ brightnessMode: e.target.value as HotelThemeConfig['brightnessMode'] })}
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
              >
                <option value="warm-sunlit">Warm Sunlit Horizon</option>
                <option value="ultra-bright">Ultra Bright Daylight</option>
                <option value="classic">Classic Evening Contrast</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Typography Pairing</label>
              <select
                value={draft.fontFamily}
                onChange={(e) => updateDraft({ fontFamily: e.target.value as HotelThemeConfig['fontFamily'] })}
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
              >
                <option value="garamond">Cormorant Garamond (Boutique Editorial)</option>
                <option value="playfair">Playfair Display (Heritage Luxury)</option>
                <option value="jakarta">Plus Jakarta Sans (Modern Crisp)</option>
              </select>
            </div>
          </div>

          {/* 6 Color Palettes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { id: 'bright-himalayan-gold', name: 'Bright Himalayan Gold', colorHex: 'bg-amber-400' },
              { id: 'luminous-emerald', name: 'Luminous Emerald', colorHex: 'bg-emerald-400' },
              { id: 'radiant-terracotta', name: 'Radiant Terracotta', colorHex: 'bg-orange-400' },
              { id: 'royal-maroon', name: 'Royal Maroon', colorHex: 'bg-rose-700' },
              { id: 'heritage-bronze', name: 'Heritage Bronze', colorHex: 'bg-amber-700' },
              { id: 'midnight-navy', name: 'Midnight Navy', colorHex: 'bg-slate-800' },
            ].map((palette) => (
              <button
                key={palette.id}
                type="button"
                onClick={() => updateDraft({ palette: palette.id as ThemePalette })}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  draft.palette === palette.id
                    ? 'border-amber-600 bg-white dark:bg-stone-900 ring-2 ring-amber-500 shadow-sm'
                    : 'border-stone-200 dark:border-stone-700 bg-white/70 dark:bg-stone-900/50 hover:border-amber-400'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full block mb-1.5 ${palette.colorHex}`} />
                <div className="font-bold text-stone-900 dark:text-stone-100 leading-tight">{palette.name}</div>
              </button>
            ))}
          </div>

          {/* Footer Copy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200 dark:border-stone-700">
            <div>
              <label className="block font-semibold mb-1">Footer Brand Summary</label>
              <input
                type="text"
                value={draft.footerDescription || ''}
                onChange={(e) => updateDraft({ footerDescription: e.target.value })}
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Footer Copyright Text</label>
              <input
                type="text"
                value={draft.footerCopyrightText || ''}
                onChange={(e) => updateDraft({ footerCopyrightText: e.target.value })}
                placeholder={`© 2026 ${draft.hotelName}. Kamalpokhari, Kathmandu, Nepal.`}
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
              />
            </div>
          </div>

          <SectionSaveBar
            isDirty={dirtyBrandPalette}
            label="Brand & Palette"
            onSave={() =>
              saveFields(
                [
                  'hotelName',
                  'hotelLegalName',
                  'starRating',
                  'panVatNumber',
                  'tagline',
                  'palette',
                  'brightnessMode',
                  'fontFamily',
                  'footerDescription',
                  'footerCopyrightText',
                ],
                'Brand, Palette & Footer'
              )
            }
          />
        </div>
      )}

      {/* ===================== 3. RATES, CURRENCY & CONTACTS ===================== */}
      {showBlock('rates_contact') && (
        <div className="space-y-6">
          <div className="space-y-4 p-5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs">
            <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>Multi-Currency Exchange Rates, Taxes &amp; Seasonal Surge Pricing</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block font-semibold mb-1">Default Display Currency</label>
                <select
                  value={draft.defaultCurrency}
                  onChange={(e) => updateDraft({ defaultCurrency: e.target.value as 'NPR' | 'USD' | 'INR' })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-bold"
                >
                  <option value="NPR">NPR (Rs. Nepali Rupees)</option>
                  <option value="USD">USD ($ US Dollars)</option>
                  <option value="INR">INR (₹ Indian Rupees)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">1 USD = NPR Rate</label>
                <input
                  type="number"
                  step="0.5"
                  value={draft.exchangeRates.NPR}
                  onChange={(e) =>
                    updateDraft({
                      exchangeRates: { ...draft.exchangeRates, NPR: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono font-bold tabular-nums"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">1 USD = INR Rate</label>
                <input
                  type="number"
                  step="0.5"
                  value={draft.exchangeRates.INR}
                  onChange={(e) =>
                    updateDraft({
                      exchangeRates: { ...draft.exchangeRates, INR: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono font-bold tabular-nums"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Seasonal Surge (e.g. 1.0)</label>
                <input
                  type="number"
                  step="0.05"
                  value={draft.seasonalSurgeMultiplier}
                  onChange={(e) => updateDraft({ seasonalSurgeMultiplier: Number(e.target.value) })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono font-bold tabular-nums"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">VAT Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={draft.taxRatePercent}
                  onChange={(e) => updateDraft({ taxRatePercent: Number(e.target.value) })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono font-bold tabular-nums"
                />
              </div>
            </div>
            <SectionSaveBar
              isDirty={dirtyRates}
              label="Rates & Tax"
              onSave={() =>
                saveFields(
                  ['defaultCurrency', 'exchangeRates', 'seasonalSurgeMultiplier', 'taxRatePercent'],
                  'Currency Rates & Tax'
                )
              }
            />
          </div>

          {/* Direct Contacts, Check-In Hours & Social Links */}
          <div className="space-y-4 p-5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs">
            <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Phone className="w-4 h-4 text-sky-600" />
              <span>Hotel Contacts, Check-In Hours &amp; Social Media Links</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">Public Booking Email</label>
                <input
                  type="email"
                  value={draft.contactEmail}
                  onChange={(e) => updateDraft({ contactEmail: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Front Desk Phone</label>
                <input
                  type="text"
                  value={draft.contactPhone}
                  onChange={(e) => updateDraft({ contactPhone: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">WhatsApp Concierge Number</label>
                <input
                  type="text"
                  value={draft.whatsappNumber}
                  onChange={(e) => updateDraft({ whatsappNumber: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Check-In / Check-Out</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={draft.checkInTime}
                    onChange={(e) => updateDraft({ checkInTime: e.target.value })}
                    placeholder="02:00 PM"
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono text-[11px]"
                  />
                  <input
                    type="text"
                    value={draft.checkOutTime}
                    onChange={(e) => updateDraft({ checkOutTime: e.target.value })}
                    placeholder="12:00 PM"
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono text-[11px]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Google Review Button URL</label>
                <input
                  type="text"
                  value={draft.googleReviewUrl}
                  onChange={(e) => updateDraft({ googleReviewUrl: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Facebook URL</label>
                <input
                  type="text"
                  value={draft.facebookUrl}
                  onChange={(e) => updateDraft({ facebookUrl: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Instagram URL</label>
                <input
                  type="text"
                  value={draft.instagramUrl}
                  onChange={(e) => updateDraft({ instagramUrl: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">TikTok URL</label>
                <input
                  type="text"
                  value={draft.tiktokUrl}
                  onChange={(e) => updateDraft({ tiktokUrl: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono"
                />
              </div>
            </div>
            <SectionSaveBar
              isDirty={dirtyContacts}
              label="Contacts & Socials"
              onSave={() =>
                saveFields(
                  [
                    'contactEmail',
                    'contactPhone',
                    'whatsappNumber',
                    'checkInTime',
                    'checkOutTime',
                    'googleReviewUrl',
                    'facebookUrl',
                    'instagramUrl',
                    'tiktokUrl',
                  ],
                  'Contacts & Social Links'
                )
              }
            />
          </div>
        </div>
      )}

      {/* ===================== 4. SECTIONS, VISIBILITY, DINING, HERITAGE & NEIGHBORHOOD ===================== */}
      {showBlock('sections_copy') && (
        <div className="space-y-6 text-xs">
          {/* Page Section Visibility Matrix */}
          <div className="space-y-4 p-5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
            <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-amber-600" />
              <span>Landing Page Section Visibility Controller</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: 'enableWeatherWidget' as const, label: 'Live Kathmandu Weather' },
                { key: 'showHighlightsSection' as const, label: '4 Highlights Strip' },
                { key: 'showRoomsSection' as const, label: 'Rooms & 2D Floor Plan' },
                { key: 'showAmenitiesSection' as const, label: 'Amenities & Ground-Floor Dining' },
                { key: 'showHeritageSection' as const, label: 'Heritage Story' },
                { key: 'showReviewsSection' as const, label: 'Guest Reviews' },
                { key: 'enableNeighborhoodGuide' as const, label: 'Neighborhood Map Guide' },
                { key: 'showFaqSection' as const, label: 'FAQ Accordion' },
              ].map((item) => {
                const checked = draft[item.key] !== false;
                return (
                  <label
                    key={item.key}
                    className={`p-3 rounded-lg border flex items-center gap-2 cursor-pointer font-semibold transition-colors ${
                      checked
                        ? 'bg-white dark:bg-stone-900 border-amber-300 dark:border-amber-800 text-stone-900 dark:text-stone-100'
                        : 'bg-stone-100 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800 text-stone-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => updateDraft({ [item.key]: e.target.checked })}
                      className="w-4 h-4 accent-amber-600"
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>
            <SectionSaveBar
              isDirty={dirtyVisibility}
              label="Visibility Settings"
              onSave={() =>
                saveFields(
                  [
                    'enableWeatherWidget',
                    'showHighlightsSection',
                    'showRoomsSection',
                    'showAmenitiesSection',
                    'showHeritageSection',
                    'showReviewsSection',
                    'enableNeighborhoodGuide',
                    'showFaqSection',
                  ],
                  'Page Section Visibility'
                )
              }
            />
          </div>

          {/* Key Highlights Strip */}
          <div className="space-y-4 p-5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
            <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
              Key Performance Highlights Strip (4 Cards Below Hero)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { valKey: 'stat1Value' as const, lblKey: 'stat1Label' as const, title: 'Highlight 1' },
                { valKey: 'stat2Value' as const, lblKey: 'stat2Label' as const, title: 'Highlight 2' },
                { valKey: 'stat3Value' as const, lblKey: 'stat3Label' as const, title: 'Highlight 3' },
                { valKey: 'stat4Value' as const, lblKey: 'stat4Label' as const, title: 'Highlight 4' },
              ].map((stat) => (
                <div key={stat.valKey} className="p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg space-y-2">
                  <div className="font-semibold text-stone-700 dark:text-stone-300">{stat.title}</div>
                  <input
                    type="text"
                    value={draft[stat.valKey] || ''}
                    onChange={(e) => updateDraft({ [stat.valKey]: e.target.value })}
                    className="w-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 rounded p-1.5 font-bold font-serif"
                  />
                  <input
                    type="text"
                    value={draft[stat.lblKey] || ''}
                    onChange={(e) => updateDraft({ [stat.lblKey]: e.target.value })}
                    className="w-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 rounded p-1.5 text-xs"
                  />
                </div>
              ))}
            </div>
            <SectionSaveBar
              isDirty={dirtyHighlights}
              label="Highlights Strip"
              onSave={() =>
                saveFields(
                  [
                    'stat1Value',
                    'stat1Label',
                    'stat2Value',
                    'stat2Label',
                    'stat3Value',
                    'stat3Label',
                    'stat4Value',
                    'stat4Label',
                  ],
                  'Key Highlights Strip'
                )
              }
            />
          </div>

          {/* Rooms Copy & Ground-Floor Dining Teaser */}
          <div className="space-y-4 p-5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-amber-700" />
              <span>Rooms Catalog Copy &amp; Ground-Floor Dining Manager</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">Rooms Section Kicker</label>
                <input
                  type="text"
                  value={draft.roomsSectionSubtitle ?? 'Sanctuary & Comfort'}
                  onChange={(e) => updateDraft({ roomsSectionSubtitle: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Rooms Section Title</label>
                <input
                  type="text"
                  value={draft.roomsSectionTitle ?? 'Rooms & Suites in Kamalpokhari'}
                  onChange={(e) => updateDraft({ roomsSectionTitle: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Rooms Description</label>
                <input
                  type="text"
                  value={draft.roomsSectionDescription ?? ''}
                  onChange={(e) => updateDraft({ roomsSectionDescription: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Amenities Section Kicker</label>
                <input
                  type="text"
                  value={draft.amenitiesSectionSubtitle ?? 'Boutique Comforts'}
                  onChange={(e) => updateDraft({ amenitiesSectionSubtitle: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Amenities Section Title</label>
                <input
                  type="text"
                  value={draft.amenitiesSectionTitle ?? 'Hospitality Tailored to You'}
                  onChange={(e) => updateDraft({ amenitiesSectionTitle: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Amenities Description</label>
                <input
                  type="text"
                  value={draft.amenitiesSectionDescription ?? ''}
                  onChange={(e) => updateDraft({ amenitiesSectionDescription: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Ground-Floor Dining Status</label>
                <select
                  value={draft.rooftopDiningStatus}
                  onChange={(e) =>
                    updateDraft({ rooftopDiningStatus: e.target.value as 'opening_soon' | 'open' | 'renovation' })
                  }
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
                >
                  <option value="opening_soon">Opening Soon (Teaser Active)</option>
                  <option value="open">Now Open (Full Service)</option>
                  <option value="renovation">Renovation</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Dining Opening Hours Banner</label>
                <input
                  type="text"
                  value={draft.rooftopOpeningDateText}
                  onChange={(e) => updateDraft({ rooftopOpeningDateText: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block font-semibold mb-1">Dining Teaser Headline</label>
                <input
                  type="text"
                  value={draft.rooftopTeaserHeadline}
                  onChange={(e) => updateDraft({ rooftopTeaserHeadline: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block font-semibold mb-1">Dining Teaser Description</label>
                <textarea
                  rows={2}
                  value={draft.rooftopTeaserDescription}
                  onChange={(e) => updateDraft({ rooftopTeaserDescription: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
            </div>
            <SectionSaveBar
              isDirty={dirtyDiningRooms}
              label="Rooms & Dining Copy"
              onSave={() =>
                saveFields(
                  [
                    'roomsSectionSubtitle',
                    'roomsSectionTitle',
                    'roomsSectionDescription',
                    'amenitiesSectionSubtitle',
                    'amenitiesSectionTitle',
                    'amenitiesSectionDescription',
                    'rooftopDiningStatus',
                    'rooftopOpeningDateText',
                    'rooftopTeaserHeadline',
                    'rooftopTeaserDescription',
                  ],
                  'Rooms & Ground-Floor Dining Copy'
                )
              }
            />
          </div>

          {/* Heritage Story */}
          <div className="space-y-4 p-5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
            <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
              Heritage &amp; Cultural Story Section
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Subtitle / Kicker</label>
                <input
                  type="text"
                  value={draft.heritageSubtitle || ''}
                  onChange={(e) => updateDraft({ heritageSubtitle: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Section Title</label>
                <input
                  type="text"
                  value={draft.heritageTitle || ''}
                  onChange={(e) => updateDraft({ heritageTitle: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Story Paragraph 1</label>
                <textarea
                  rows={2}
                  value={draft.heritageStoryP1 || ''}
                  onChange={(e) => updateDraft({ heritageStoryP1: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Story Paragraph 2</label>
                <textarea
                  rows={2}
                  value={draft.heritageStoryP2 || ''}
                  onChange={(e) => updateDraft({ heritageStoryP2: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Heritage Stat 1</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft.heritageStat1Number || ''}
                    onChange={(e) => updateDraft({ heritageStat1Number: e.target.value })}
                    className="w-1/3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-bold font-serif"
                  />
                  <input
                    type="text"
                    value={draft.heritageStat1Text || ''}
                    onChange={(e) => updateDraft({ heritageStat1Text: e.target.value })}
                    className="w-2/3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Heritage Stat 2</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft.heritageStat2Number || ''}
                    onChange={(e) => updateDraft({ heritageStat2Number: e.target.value })}
                    className="w-1/3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-bold font-serif"
                  />
                  <input
                    type="text"
                    value={draft.heritageStat2Text || ''}
                    onChange={(e) => updateDraft({ heritageStat2Text: e.target.value })}
                    className="w-2/3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Cultural Quote</label>
                <input
                  type="text"
                  value={draft.heritageQuote || ''}
                  onChange={(e) => updateDraft({ heritageQuote: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold text-amber-700 dark:text-amber-400"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Quote Attribution</label>
                <input
                  type="text"
                  value={draft.heritageAuthor || ''}
                  onChange={(e) => updateDraft({ heritageAuthor: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
            </div>
            <SectionSaveBar
              isDirty={dirtyHeritage}
              label="Heritage Story"
              onSave={() =>
                saveFields(
                  [
                    'heritageSubtitle',
                    'heritageTitle',
                    'heritageStoryP1',
                    'heritageStoryP2',
                    'heritageStat1Number',
                    'heritageStat1Text',
                    'heritageStat2Number',
                    'heritageStat2Text',
                    'heritageQuote',
                    'heritageAuthor',
                  ],
                  'Heritage Story'
                )
              }
            />
          </div>

          {/* Location, GPS & Neighborhood Guide */}
          <div className="space-y-4 p-5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
            <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-rose-600" />
              <span>Location, GPS Coordinates &amp; Interactive Neighborhood Guide</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Postal Address</label>
                <input
                  type="text"
                  value={draft.address}
                  onChange={(e) => updateDraft({ address: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Neighborhood</label>
                <input
                  type="text"
                  value={draft.neighborhood}
                  onChange={(e) => updateDraft({ neighborhood: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={draft.latitude}
                  onChange={(e) => updateDraft({ latitude: Number(e.target.value) })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={draft.longitude}
                  onChange={(e) => updateDraft({ longitude: Number(e.target.value) })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Google Maps URL</label>
                <input
                  type="text"
                  value={draft.googleMapsUrl}
                  onChange={(e) => updateDraft({ googleMapsUrl: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Guide Section Kicker</label>
                <input
                  type="text"
                  value={draft.neighborhoodGuideSubtitle ?? 'Kamalpokhari Explorer'}
                  onChange={(e) => updateDraft({ neighborhoodGuideSubtitle: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Guide Section Title</label>
                <input
                  type="text"
                  value={draft.neighborhoodGuideTitle ?? 'Prime Kamalpokhari Neighborhood Guide'}
                  onChange={(e) => updateDraft({ neighborhoodGuideTitle: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Discovery Radius</label>
                <select
                  value={draft.neighborhoodSearchRadiusMeters ?? 2500}
                  onChange={(e) =>
                    updateDraft({ neighborhoodSearchRadiusMeters: Number(e.target.value) })
                  }
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
                >
                  <option value={500}>500 m (Walking Immediate)</option>
                  <option value={1200}>1,200 m (15-min Stroll)</option>
                  <option value={2500}>2,500 m (Valley Core)</option>
                  <option value={5000}>5,000 m (Kathmandu Highlights)</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block font-semibold mb-1">Guide Description</label>
                <textarea
                  rows={2}
                  value={draft.neighborhoodGuideDescription ?? ''}
                  onChange={(e) => updateDraft({ neighborhoodGuideDescription: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
            </div>
            <SectionSaveBar
              isDirty={dirtyLocation}
              label="Location & Map Guide"
              onSave={() =>
                saveFields(
                  [
                    'address',
                    'neighborhood',
                    'latitude',
                    'longitude',
                    'googleMapsUrl',
                    'neighborhoodGuideSubtitle',
                    'neighborhoodGuideTitle',
                    'neighborhoodGuideDescription',
                    'neighborhoodSearchRadiusMeters',
                  ],
                  'Location & Neighborhood Guide'
                )
              }
            />
          </div>

          {/* Reviews & FAQ Section Headers */}
          <div className="space-y-4 p-5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
            <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
              Reviews &amp; FAQ Section Headings
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">Reviews Kicker</label>
                <input
                  type="text"
                  value={draft.reviewsSectionSubtitle ?? 'Verified Guest Impressions'}
                  onChange={(e) => updateDraft({ reviewsSectionSubtitle: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Reviews Title</label>
                <input
                  type="text"
                  value={draft.reviewsSectionTitle ?? 'Loved by Travelers in Kathmandu'}
                  onChange={(e) => updateDraft({ reviewsSectionTitle: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">FAQ Kicker</label>
                <input
                  type="text"
                  value={draft.faqSectionSubtitle ?? 'Guest Assistance'}
                  onChange={(e) => updateDraft({ faqSectionSubtitle: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">FAQ Title</label>
                <input
                  type="text"
                  value={draft.faqSectionTitle ?? 'Frequently Asked Questions'}
                  onChange={(e) => updateDraft({ faqSectionTitle: e.target.value })}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-2 font-semibold"
                />
              </div>
            </div>
            <SectionSaveBar
              isDirty={dirtyReviewsFaqCopy}
              label="Reviews & FAQ Titles"
              onSave={() =>
                saveFields(
                  [
                    'reviewsSectionSubtitle',
                    'reviewsSectionTitle',
                    'faqSectionSubtitle',
                    'faqSectionTitle',
                  ],
                  'Reviews & FAQ Section Headings'
                )
              }
            />
          </div>
        </div>
      )}

      {/* ===================== 5. COLLECTIONS CRUD (AMENITIES, REVIEWS, FAQS & CROSS-LINKS) ===================== */}
      {showBlock('collections') && (
        <div className="space-y-6 pt-2">
          {/* Quick End-to-End Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <button
              type="button"
              onClick={() => onNavigateTab('rooms')}
              className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 hover:border-amber-500 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between font-bold text-stone-900 dark:text-stone-100">
                <span>Room Types &amp; Pricing ({rooms.length})</span>
                <BedDouble className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">Add, edit or delete room categories &amp; rates &rarr;</p>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('room_floors')}
              className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 hover:border-amber-500 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between font-bold text-stone-900 dark:text-stone-100">
                <span>Floors &amp; 2D Room Numbers</span>
                <MapPin className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">Manage room units, wings &amp; floor assignments &rarr;</p>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('media')}
              className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 hover:border-amber-500 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between font-bold text-stone-900 dark:text-stone-100">
                <span>Hero &amp; Suite Photo Library</span>
                <ImageIcon className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">Swap hero, dining, or room photos &rarr;</p>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('coupons')}
              className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 hover:border-amber-500 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between font-bold text-stone-900 dark:text-stone-100">
                <span>Promo Codes &amp; Campaigns</span>
                <Share2 className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">Create flash-sale coupon codes &amp; rules &rarr;</p>
            </button>
          </div>

          {/* Amenities CRUD */}
          <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
                  Hotel Amenities &amp; Facilities Manager ({amenities.length})
                </h4>
                <p className="text-xs text-stone-500">Add, edit, or delete amenities displayed on the public site.</p>
              </div>
              <button
                type="button"
                onClick={onAddAmenity}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${themeClasses.primary}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Amenity</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {amenities.map((amenity) => (
                <div
                  key={amenity.id}
                  className="p-3.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-stone-900 dark:text-stone-100">{amenity.name}</span>
                      <span className="ml-1.5 text-[10px] font-mono uppercase text-amber-700 dark:text-amber-400">
                        · {amenity.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditAmenity(amenity)}
                        className="p-1 text-stone-400 hover:text-amber-600 cursor-pointer"
                        title="Edit Amenity"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAmenity(amenity.id)}
                        className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                        title="Delete Amenity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-stone-600 dark:text-stone-300 text-[11px] leading-relaxed">{amenity.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials CRUD */}
          <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
                  Guest Testimonials &amp; Reviews Manager ({reviews.length})
                </h4>
                <p className="text-xs text-stone-500">Add, edit, or delete featured guest reviews.</p>
              </div>
              <button
                type="button"
                onClick={onAddReview}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${themeClasses.primary}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Review</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-stone-900 dark:text-stone-100">{rev.author}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditReview(rev)}
                          className="p-1 text-stone-400 hover:text-amber-600 cursor-pointer"
                          title="Edit Review"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteReview(rev.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                          title="Delete Review"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-[11px] text-stone-500">{rev.location}</div>
                    <p className="text-stone-600 dark:text-stone-300 italic mt-2">“{rev.quote}”</p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-stone-200 dark:border-stone-700 text-stone-400">
                    <span>{rev.rating} ★ Rating</span>
                    <span>{rev.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQs CRUD */}
          <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
                  Frequently Asked Questions ({faqs.length})
                </h4>
                <p className="text-xs text-stone-500">Add, edit, or delete guest FAQs.</p>
              </div>
              <button
                type="button"
                onClick={onAddFaq}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${themeClasses.primary}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add FAQ</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="p-3.5 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-stone-900 dark:text-stone-100">{faq.question}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditFaq(faq)}
                        className="p-1 text-stone-400 hover:text-amber-600 cursor-pointer"
                        title="Edit FAQ"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFaq(faq.id)}
                        className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                        title="Delete FAQ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-stone-600 dark:text-stone-300 text-[11px] leading-relaxed">{faq.answer}</p>
                  <span className="inline-block text-[10px] font-mono uppercase text-amber-700 dark:text-amber-400 font-semibold">
                    {faq.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 6: REAL EMAIL, SMTP & BOOKING VERIFICATION */}
      {showBlock('email_smtp') && (
        <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
          <EmailSmtpSettingsCard />
        </div>
      )}

      {/* MODULE 7: SUPABASE DATABASE, KEEP-ALIVE & FREE-TIER STORAGE */}
      {showBlock('database_storage') && (
        <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
          <DatabaseStorageManagementCard />
        </div>
      )}

      {/* Bottom Sticky/Persistent Publish Footer whenever editing */}
      {hasUnsavedChanges && (
        <div className="sticky bottom-3 z-20 p-3.5 rounded-xl bg-stone-900 dark:bg-stone-950 text-white border border-amber-500/50 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>{dirtySectionCount}</strong> CMS {dirtySectionCount === 1 ? 'section has' : 'sections have'} unsaved edits. Save to publish live.
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleDiscardAll}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold cursor-pointer whitespace-nowrap shrink-0"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className={`px-4 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${themeClasses.primary}`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save &amp; Publish All</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
