import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { getThemeClasses } from '../../utils/theme';
import { 
  Image, 
  Upload, 
  Sparkles, 
  Check, 
  ExternalLink, 
  Camera, 
  Building2, 
  Utensils, 
  BedDouble, 
  RotateCcw,
  Eye
} from 'lucide-react';
import { HorizontalTabSlider } from '../Common/HorizontalTabSlider';

interface ImagePreset {
  id: string;
  name: string;
  category: 'hero' | 'rooftop' | 'room';
  url: string;
  description: string;
}

const DEFAULT_HERO_ASSET = './assets/aistudio/hotel_kamal_new_look_6cc0fe47.jpg';

const PRESET_LIBRARY: ImagePreset[] = [
  {
    id: 'hero-kamal-twilight-exterior',
    name: 'Hotel Kamal Twilight Exterior (Signature Look)',
    category: 'hero',
    url: DEFAULT_HERO_ASSET,
    description: 'Illuminated brick facade at twilight featuring glowing Hotel Kamal signage and ground-floor restaurant',
  },
  {
    id: 'hero-himalayan-boutique',
    name: 'Kamal Boutique Himalayan Heritage Facade',
    category: 'hero',
    url: './assets/images/hero_himalayan_boutique_1793983309553.jpg',
    description: 'Heritage Nepali carved woodwork, warm lanterns, and snowy Himalayan mountain ridge at twilight',
  },
  {
    id: 'hero-kathmandu-terrace',
    name: 'Kathmandu Courtyard & Terraces',
    category: 'hero',
    url: './assets/images/hero_boutique_kathmandu_1793848719266.jpg',
    description: 'Traditional terracotta courtyard and mountain valley architecture',
  },
  {
    id: 'rooftop-candlelight-dining',
    name: 'Kamal Candlelit Ground-Floor Terrace & Bar',
    category: 'rooftop',
    url: './assets/images/rooftop_candlelight_dining_1793983310740.jpg',
    description: 'Atmospheric candlelit dining overlooking Kathmandu garden lights and Himalayan ambiance',
  },
  {
    id: 'rooftop-terrace-garden',
    name: 'Ground-Floor Terrace Garden Pergola',
    category: 'rooftop',
    url: './assets/images/rooftop_dining_terrace_1793848750868.jpg',
    description: 'Open-air ground-floor dining with ambient bistro lights and lush highland planters',
  },
  {
    id: 'suite-himalayan-deluxe',
    name: 'Deluxe Himalayan King Suite',
    category: 'room',
    url: './assets/images/suite_himalayan_deluxe_1793983311349.jpg',
    description: 'Handcrafted solid teak king bed, local cashmere textiles, and sunlit valley view balcony',
  },
  {
    id: 'suite-presidential-living',
    name: 'Presidential Penthouse & Stone Tub Suite',
    category: 'room',
    url: './assets/images/suite_presidential_living_1793983311442.jpg',
    description: 'Nepali carved lattice salon with freestanding stone soaking tub and panoramic Boudha/valley views',
  },
];

export const MediaGalleryManager: React.FC = () => {
  const { 
    themeConfig, 
    updateThemeConfig, 
    rooms, 
    updateRoom, 
    showToast 
  } = useHotel();

  const themeClasses = getThemeClasses(themeConfig.palette);

  // Form Inputs
  const [heroInput, setHeroInput] = useState<string>(themeConfig.heroImage || DEFAULT_HERO_ASSET);
  const [heroLayoutDraft, setHeroLayoutDraft] = useState<'full_bleed' | 'centered_classic' | 'architectural_showcase'>(
    themeConfig.heroLayoutMode || 'full_bleed'
  );
  const [heroFitDraft, setHeroFitDraft] = useState<'whole_building' | 'cover'>(
    themeConfig.heroBackgroundFit || 'whole_building'
  );
  const [heroPositionDraft, setHeroPositionDraft] = useState<'center' | 'top' | 'bottom'>(
    themeConfig.heroImagePosition || 'center'
  );
  const [rooftopInput, setRooftopInput] = useState<string>(themeConfig.rooftopDiningImage || './assets/images/rooftop_dining_terrace_1793848750868.jpg');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '');
  const [roomImageInput, setRoomImageInput] = useState<string>(rooms[0]?.images[0] || '');

  const [activeTab, setActiveTab] = useState<'hero' | 'rooftop' | 'rooms' | 'presets'>('hero');

  React.useEffect(() => {
    if (themeConfig.heroImage) {
      setHeroInput(themeConfig.heroImage);
    }
    setHeroLayoutDraft(themeConfig.heroLayoutMode || 'full_bleed');
    setHeroFitDraft(themeConfig.heroBackgroundFit || 'whole_building');
    setHeroPositionDraft(themeConfig.heroImagePosition || 'center');
  }, [themeConfig.heroImage, themeConfig.heroLayoutMode, themeConfig.heroBackgroundFit, themeConfig.heroImagePosition]);

  const [storageUploading, setStorageUploading] = useState<boolean>(false);

  const uploadMediaFile = async (
    file: File,
    category: 'hero' | 'rooftop' | 'room' | 'general'
  ): Promise<string | null> => {
    setStorageUploading(true);
    try {
      // 1. Direct upload via base64 to server (Supabase Storage bucket hotel-media / local disk)
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const uploadRes = await fetch('/api/media/upload-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'image/jpeg',
          base64Data,
          category,
        }),
      });

      const uploadData = await uploadRes.json().catch(() => ({}));
      if (uploadRes.ok && uploadData?.ok && uploadData?.publicUrl) {
        const providerName =
          uploadData.provider === 'supabase'
            ? 'Supabase Storage'
            : uploadData.provider === 'r2'
            ? 'Cloudflare R2'
            : 'Local Storage';
        showToast(`Uploaded to ${providerName}`, 'Image stored safely in cloud storage. Click Save to apply.', 'success');
        return uploadData.publicUrl;
      }

      // 2. Fallback to presigned URL if direct upload returned error
      const presignRes = await fetch('/api/media/presign-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'image/jpeg',
          sizeBytes: file.size,
          category,
        }),
      });
      const presignData = await presignRes.json().catch(() => ({}));
      if (presignRes.ok && presignData?.ok && presignData?.uploadUrl && presignData.uploadUrl !== '/api/media/upload-direct') {
        const putRes = await fetch(presignData.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });
        if (putRes.ok) {
          showToast('Uploaded to Cloud Storage', 'Object uploaded successfully.', 'success');
          return presignData.publicUrl || presignData.objectKey;
        }
      }

      showToast(
        'Upload Notice',
        uploadData?.error || 'Could not upload to cloud storage. Using compressed data URL.',
        'warning'
      );
      return null;
    } catch (err: any) {
      showToast('Upload Error', err?.message || 'Unable to upload file to media storage.', 'error');
      return null;
    } finally {
      setStorageUploading(false);
    }
  };

  const handleUploadHeroStorage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = await uploadMediaFile(file, 'hero');
    if (url) setHeroInput(url);
  };

  const handleUploadHeroFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setHeroInput(dataUrl);
          showToast('Photo Ready to Save', 'Preview updated. Click "Save & Update Hero Live" to publish.', 'info');
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyHero = () => {
    updateThemeConfig({
      heroImage: heroInput.trim() || DEFAULT_HERO_ASSET,
      heroLayoutMode: heroLayoutDraft,
      heroBackgroundFit: heroFitDraft,
      heroImagePosition: heroPositionDraft,
    });
    showToast('Hero Picture & Framing Saved', 'Homepage hero photo and layout settings are now live!', 'success');
  };

  const hasUnsavedHeroMedia =
    heroInput !== (themeConfig.heroImage || DEFAULT_HERO_ASSET) ||
    heroLayoutDraft !== (themeConfig.heroLayoutMode || 'full_bleed') ||
    heroFitDraft !== (themeConfig.heroBackgroundFit || 'whole_building') ||
    heroPositionDraft !== (themeConfig.heroImagePosition || 'center');

  const handleApplyRooftop = () => {
    updateThemeConfig({ rooftopDiningImage: rooftopInput.trim() });
    showToast('Dining Picture Updated', 'Ground-floor garden dining picture updated live!', 'success');
  };

  const handleApplyRoomPhoto = () => {
    if (!selectedRoomId) return;
    const targetRoom = rooms.find((r) => r.id === selectedRoomId);
    if (!targetRoom) return;

    updateRoom(selectedRoomId, {
      images: [roomImageInput.trim(), ...targetRoom.images.slice(1)],
    });
    showToast('Room Photo Updated', `Primary photo for ${targetRoom.name} updated successfully!`, 'success');
  };

  const handleSelectPreset = (preset: ImagePreset) => {
    if (preset.category === 'hero') {
      setHeroInput(preset.url);
      updateThemeConfig({ heroImage: preset.url });
      showToast('Hero Image Applied', `Set to "${preset.name}"`, 'success');
    } else if (preset.category === 'rooftop') {
      setRooftopInput(preset.url);
      updateThemeConfig({ rooftopDiningImage: preset.url });
      showToast('Dining Image Applied', `Set to "${preset.name}"`, 'success');
    } else if (preset.category === 'room' && selectedRoomId) {
      setRoomImageInput(preset.url);
      updateRoom(selectedRoomId, { images: [preset.url] });
      showToast('Room Photo Applied', `Set to "${preset.name}"`, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Super Admin Visual CMS
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs text-stone-500">Live Website Image Controller</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-50 mt-1">
              Website Pictures, Hero Banners & Media CMS
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Super Admin can change, upload, or link high-resolution photos for the website hero, ground-floor restaurant, and room suites with live preview and Save publishing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800/60">
              {hasUnsavedHeroMedia ? 'Unsaved Hero Draft' : 'All Media Saved'}
            </span>
          </div>
        </div>

        {/* Section Tabs Slider */}
        <div className="mt-6 pt-6 border-t border-stone-100 dark:border-stone-800">
          <HorizontalTabSlider scrollStep={240} ariaLabel="Media CMS Sections">
            <div className="flex items-center gap-2 w-max py-0.5">
              {[
                { id: 'hero', label: '1. Hero Banner Photo', icon: <Building2 className="w-4 h-4" /> },
                { id: 'rooftop', label: '2. Ground-Floor Dining Photo', icon: <Utensils className="w-4 h-4" /> },
                { id: 'rooms', label: '3. Room Suite Photos', icon: <BedDouble className="w-4 h-4" /> },
                { id: 'presets', label: 'Curated Himalayan Presets', icon: <Sparkles className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-amber-800 text-white shadow-xs'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </HorizontalTabSlider>
        </div>
      </div>

      {/* TAB 1: HERO BANNER */}
      {activeTab === 'hero' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm">
          <div className="lg:col-span-6 space-y-4">
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
                Homepage Hero Cover Picture
              </h3>
              <p className="text-xs text-stone-500">
                The full-viewport background image guests see when first loading Kamal Hotel.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                Image URL, Local Asset Path, or Upload Custom Photo *
              </label>
              <input
                type="text"
                value={heroInput}
                onChange={(e) => setHeroInput(e.target.value)}
                placeholder="./assets/aistudio/hotel_kamal_new_look_6cc0fe47.jpg or https://..."
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-2.5 text-xs font-mono"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Supports local paths (<code>./assets/aistudio/...</code>), uploaded images, or HTTPS URLs.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                  Hero Display Layout
                </label>
                <select
                  value={heroLayoutDraft}
                  onChange={(e) =>
                    setHeroLayoutDraft(e.target.value as 'full_bleed' | 'centered_classic' | 'architectural_showcase')
                  }
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-2 text-xs font-medium"
                >
                  <option value="full_bleed">Luxury Panoramic Twilight (Recommended)</option>
                  <option value="centered_classic">Centered Classic Overlay</option>
                  <option value="architectural_showcase">Split Architectural Card</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                  Background Fit
                </label>
                <select
                  value={heroFitDraft}
                  onChange={(e) => setHeroFitDraft(e.target.value as 'whole_building' | 'cover')}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-2 text-xs font-medium"
                >
                  <option value="whole_building">Zoomed Whole Building</option>
                  <option value="cover">Edge-to-Edge Full Cover</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                  Focal Framing
                </label>
                <select
                  value={heroPositionDraft}
                  onChange={(e) => setHeroPositionDraft(e.target.value as 'center' | 'top' | 'bottom')}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-2 text-xs font-medium"
                >
                  <option value="center">Center Facade</option>
                  <option value="top">Upper Stories &amp; Sky</option>
                  <option value="bottom">Signage &amp; Ground Entrance</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleApplyHero}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${themeClasses.primary}`}
              >
                <Check className="w-4 h-4" />
                <span>{hasUnsavedHeroMedia ? 'Save & Update Hero Live' : 'Saved Live'}</span>
              </button>

              <label className="px-3.5 py-2.5 rounded-lg text-xs font-semibold border border-sky-600/40 text-sky-800 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{storageUploading ? 'Uploading to Storage...' : 'Upload to Cloud / Supabase'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={storageUploading}
                  onChange={handleUploadHeroStorage}
                  className="sr-only"
                />
              </label>

              <label className="px-3.5 py-2.5 rounded-lg text-xs font-semibold border border-amber-600/40 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Local Compress</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadHeroFile}
                  className="sr-only"
                />
              </label>

              <button
                onClick={() => {
                  setHeroInput(DEFAULT_HERO_ASSET);
                  setHeroLayoutDraft('full_bleed');
                  setHeroFitDraft('whole_building');
                  setHeroPositionDraft('center');
                  updateThemeConfig({
                    heroImage: DEFAULT_HERO_ASSET,
                    heroLayoutMode: 'full_bleed',
                    heroBackgroundFit: 'whole_building',
                    heroImagePosition: 'center',
                  });
                  showToast('Hero Restored', 'Restored default Hotel Kamal whole-building twilight hero.', 'info');
                }}
                className="px-3.5 py-2.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="lg:col-span-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-300">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>Live Hero Preview</span>
              </span>
              <span className="font-mono text-[10px] text-stone-400">
                {heroLayoutDraft === 'full_bleed'
                  ? heroFitDraft === 'whole_building'
                    ? 'Luxury Panoramic · Whole Building'
                    : 'Panoramic · Full Cover'
                  : heroLayoutDraft === 'centered_classic'
                  ? 'Centered Classic'
                  : 'Split Architectural Card'}
              </span>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-md group bg-gradient-to-b from-[#041236] via-[#071947] to-[#0a0c13]">
              {heroLayoutDraft === 'full_bleed' &&
              heroFitDraft === 'whole_building' ? (
                <>
                  <div className="absolute inset-y-0 right-0 w-[68%] flex items-center justify-end pointer-events-none">
                    <img
                      src={heroInput}
                      alt="Hero Preview"
                      className="w-full h-full object-cover object-[52%_70%] [mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.45)_12%,black_34%,black_100%)]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_HERO_ASSET;
                      }}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#040e29] via-[#050f29]/75 via-40% to-transparent flex flex-col justify-center p-5 text-white">
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-amber-400">Kamalpokhari, Kathmandu</span>
                    <h4 className="font-serif font-bold text-sm sm:text-base max-w-[56%] leading-snug mt-1">
                      {themeConfig.heroHeadline}
                    </h4>
                  </div>
                </>
              ) : (
                <>
                  <img
                    src={heroInput}
                    alt="Hero Preview"
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                      heroPositionDraft === 'top'
                        ? 'object-top'
                        : heroPositionDraft === 'bottom'
                        ? 'object-bottom'
                        : 'object-center'
                    }`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_HERO_ASSET;
                    }}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-stone-950/80 via-stone-950/20 to-transparent flex flex-col justify-end p-4 text-white">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">Kamalpokhari, Kathmandu</span>
                    <h4 className="font-serif font-bold text-base sm:text-lg">{themeConfig.heroHeadline}</h4>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GROUND-FLOOR DINING */}
      {activeTab === 'rooftop' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm">
          <div className="lg:col-span-6 space-y-4">
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
                Ground-Floor Garden Dining Feature Photo
              </h3>
              <p className="text-xs text-stone-500">
                Featured across the ground-floor dining teaser section and in-room dining portal.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-stone-300">
                Image URL or Relative Path *
              </label>
              <input
                type="text"
                value={rooftopInput}
                onChange={(e) => setRooftopInput(e.target.value)}
                placeholder="./assets/images/rooftop_dining_terrace_1793848750868.jpg or https://..."
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-2.5 text-xs font-mono"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleApplyRooftop}
                className={`px-5 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-2 ${themeClasses.primary}`}
              >
                <Check className="w-4 h-4" />
                <span>Save &amp; Update Dining Photo</span>
              </button>

              <button
                onClick={() => setRooftopInput('./assets/images/rooftop_dining_terrace_1793848750868.jpg')}
                className="px-3.5 py-2.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="lg:col-span-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-300">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>Live Ground-Floor Dining Preview</span>
              </span>
              <span className="font-mono text-[10px] text-stone-400">4:3 Aspect Ratio</span>
            </div>

            <div className="relative aspect-4/3 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-md group">
              <img
                src={rooftopInput}
                alt="Ground-Floor Dining Preview"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = './assets/images/rooftop_dining_terrace_1793848750868.jpg';
                }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-stone-950/80 via-transparent to-transparent flex flex-col justify-end p-4 text-white">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">Ground-Floor Garden Bar</span>
                <h4 className="font-serif font-bold text-base">{themeConfig.rooftopTeaserHeadline}</h4>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ROOM SUITE PHOTOS */}
      {activeTab === 'rooms' && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
              Room Suite Catalog Photos
            </h3>
            <p className="text-xs text-stone-500">
              Select any room to inspect or change its primary booking photo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rooms.map((room) => {
              const isSelected = selectedRoomId === room.id;

              return (
                <div
                  key={room.id}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setRoomImageInput(room.images[0] || '');
                  }}
                  className={`rounded-xl border p-3 cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'border-amber-600 ring-2 ring-amber-600 bg-amber-50/40 dark:bg-amber-950/30'
                      : 'border-stone-200 dark:border-stone-800 hover:border-stone-400'
                  }`}
                >
                  <div className="aspect-16/10 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800">
                    <img
                      src={room.images[0]}
                      alt={room.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                      {room.name}
                    </h4>
                    <p className="text-[11px] text-stone-500">{room.type} · ${room.pricePerNightUSD}/nt</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edit Selected Room Photo Form */}
          {selectedRoomId && (
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-3">
              <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                Update Photo for: {rooms.find((r) => r.id === selectedRoomId)?.name}
              </span>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={roomImageInput}
                  onChange={(e) => setRoomImageInput(e.target.value)}
                  placeholder="Image URL or relative path..."
                  className="flex-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-2 text-xs font-mono"
                />
                <button
                  onClick={handleApplyRoomPhoto}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold text-white shadow transition cursor-pointer ${themeClasses.primary}`}
                >
                  Save Room Photo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CURATED PRESETS */}
      {activeTab === 'presets' && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
              Curated Himalayan Heritage Preset Library
            </h3>
            <p className="text-xs text-stone-500">
              High-resolution boutique photographs optimized for web fast loading and authentic Kathmandu character.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRESET_LIBRARY.map((preset) => (
              <div
                key={preset.id}
                className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs hover:border-amber-600/60 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-16/10 relative overflow-hidden bg-stone-100 dark:bg-stone-800">
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-2 left-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-900/80 text-white font-semibold backdrop-blur-xs">
                      {preset.category}
                    </span>
                  </div>

                  <div className="p-3.5 space-y-1">
                    <h4 className="font-serif font-bold text-xs text-stone-900 dark:text-stone-100">
                      {preset.name}
                    </h4>
                    <p className="text-[11px] text-stone-500 leading-snug">
                      {preset.description}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 pt-0">
                  <button
                    onClick={() => handleSelectPreset(preset)}
                    className="w-full py-1.5 rounded-lg border border-amber-600/40 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Apply as {preset.category.toUpperCase()}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
