import React, { useState, useEffect, useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import {
  Compass,
  Landmark,
  Utensils,
  TrainFront,
  Star,
  ExternalLink,
  RefreshCw,
  MapPin,
  Clock,
  Navigation,
  AlertCircle,
} from 'lucide-react';
import { useHotel } from '../context/HotelContext';

export type NeighborhoodCategory = 'all' | 'landmarks' | 'restaurants' | 'transit';

export interface NeighborhoodPlace {
  id: string;
  name: string;
  formattedAddress: string;
  shortFormattedAddress?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  primaryType?: string;
  primaryTypeDisplayName?: string;
  types: string[];
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsUri?: string;
  openNow?: boolean | null;
  businessStatus?: string;
  categoryBucket: Exclude<NeighborhoodCategory, 'all'>;
}

interface PlaceMarkerWithInfoProps {
  place: NeighborhoodPlace;
  isSelected: boolean;
  onSelect: (place: NeighborhoodPlace) => void;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<
  Exclude<NeighborhoodCategory, 'all'>,
  { bg: string; border: string; glyph: string; label: string }
> = {
  landmarks: {
    bg: '#0284c7',
    border: '#075985',
    glyph: '#ffffff',
    label: 'Landmark',
  },
  restaurants: {
    bg: '#059669',
    border: '#065f46',
    glyph: '#ffffff',
    label: 'Dining',
  },
  transit: {
    bg: '#7c3aed',
    border: '#5b21b6',
    glyph: '#ffffff',
    label: 'Transit',
  },
};

const PlaceMarkerWithInfo: React.FC<PlaceMarkerWithInfoProps> = ({
  place,
  isSelected,
  onSelect,
  onClose,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const palette = CATEGORY_COLORS[place.categoryBucket] || CATEGORY_COLORS.landmarks;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: place.location.latitude, lng: place.location.longitude }}
        title={place.name}
        onClick={() => onSelect(place)}
        zIndex={isSelected ? 40 : 10}
      >
        <Pin
          background={palette.bg}
          borderColor={palette.border}
          glyphColor={palette.glyph}
          scale={isSelected ? 1.2 : 1}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose} maxWidth={280}>
          <div className="p-1 text-stone-900 space-y-1.5 min-w-[200px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                {place.primaryTypeDisplayName || palette.label}
              </span>
              {typeof place.openNow === 'boolean' && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    place.openNow
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {place.openNow ? 'Open Now' : 'Closed'}
                </span>
              )}
            </div>

            <div className="font-serif font-bold text-sm text-stone-900 leading-snug">
              {place.name}
            </div>

            {typeof place.rating === 'number' && (
              <div className="flex items-center gap-1 text-xs text-amber-700 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{place.rating.toFixed(1)}</span>
                {typeof place.userRatingCount === 'number' && (
                  <span className="text-stone-500 font-normal">
                    ({place.userRatingCount.toLocaleString()} reviews)
                  </span>
                )}
              </div>
            )}

            {(place.shortFormattedAddress || place.formattedAddress) && (
              <p className="text-[11px] text-stone-600 leading-snug">
                {place.shortFormattedAddress || place.formattedAddress}
              </p>
            )}

            {place.googleMapsUri && (
              <a
                href={place.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:underline pt-1"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface HotelAnchorMarkerProps {
  hotelName: string;
  address: string;
  googleMapsUrl: string;
  position: { lat: number; lng: number };
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const HotelAnchorMarker: React.FC<HotelAnchorMarkerProps> = ({
  hotelName,
  address,
  googleMapsUrl,
  position,
  isOpen,
  onToggle,
  onClose,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        title={hotelName}
        onClick={onToggle}
        zIndex={50}
      >
        <Pin
          background="#b45309"
          borderColor="#78350f"
          glyphColor="#fef3c7"
          scale={1.25}
        />
      </AdvancedMarker>

      {isOpen && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose} maxWidth={260}>
          <div className="p-1 text-stone-900 space-y-1.5">
            <span className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
              Your Stay · Anchor Point
            </span>
            <div className="font-serif font-bold text-sm text-stone-900">
              {hotelName}
            </div>
            <p className="text-[11px] text-stone-600 leading-snug">{address}</p>
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:underline"
              >
                <span>Get Directions</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const NeighborhoodGuide: React.FC = () => {
  const { themeConfig } = useHotel();

  const centerLat = Number(themeConfig.latitude) || 27.7123;
  const centerLng = Number(themeConfig.longitude) || 85.324;
  const radiusMeters = Number(themeConfig.neighborhoodSearchRadiusMeters) || 1200;

  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || ''
  );
  const [configLoaded, setConfigLoaded] = useState<boolean>(false);

  const [activeCategory, setActiveCategory] = useState<NeighborhoodCategory>('all');
  const [places, setPlaces] = useState<NeighborhoodPlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState<boolean>(false);
  const [placesError, setPlacesError] = useState<string>('');
  const [selectedPlace, setSelectedPlace] = useState<NeighborhoodPlace | null>(null);
  const [hotelInfoOpen, setHotelInfoOpen] = useState<boolean>(true);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: centerLat,
    lng: centerLng,
  });

  useEffect(() => {
    setMapCenter({ lat: centerLat, lng: centerLng });
  }, [centerLat, centerLng]);

  useEffect(() => {
    let active = true;
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/maps/config');
        if (res.ok) {
          const data = await res.json();
          if (active && data?.apiKey) {
            setMapsApiKey(data.apiKey);
          }
        }
      } catch {
        // Fallback to VITE_GOOGLE_MAPS_API_KEY if set
      } finally {
        if (active) setConfigLoaded(true);
      }
    };
    loadConfig();
    return () => {
      active = false;
    };
  }, []);

  const fetchNearbyPlaces = useCallback(async () => {
    setIsLoadingPlaces(true);
    setPlacesError('');
    try {
      const res = await fetch('/api/neighborhood/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: centerLat,
          longitude: centerLng,
          radiusMeters,
          category: activeCategory,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (res.status === 429 || payload?.error?.status === 'RESOURCE_EXHAUSTED') {
        window.dispatchEvent(
          new CustomEvent('gmp-quota-exceeded', {
            detail: { reason: payload?.message || 'RESOURCE_EXHAUSTED' },
          })
        );
        setPlaces([]);
        setPlacesError(
          'Google Places API request quota has been reached. Try again later or view the area directly on Google Maps.'
        );
        return;
      }

      if (!res.ok) {
        setPlaces([]);
        setPlacesError(
          payload?.message ||
            'Live nearby places directory is unavailable right now. Use Google Maps Directions to explore Kamalpokhari.'
        );
        return;
      }

      const rawList = Array.isArray(payload?.places) ? payload.places : [];
      const toPlainText = (val: unknown): string | undefined => {
        if (typeof val === 'string') return val;
        if (val && typeof val === 'object' && 'text' in val) {
          const text = (val as { text?: unknown }).text;
          return typeof text === 'string' ? text : undefined;
        }
        return undefined;
      };

      const list: NeighborhoodPlace[] = rawList
        .filter((p: unknown): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
        .map((p: Record<string, unknown>) => {
          const loc = p.location as { latitude?: number; longitude?: number } | undefined;
          const bucket = p.categoryBucket;
          const safeBucket: Exclude<NeighborhoodCategory, 'all'> =
            bucket === 'restaurants' || bucket === 'transit' || bucket === 'landmarks'
              ? bucket
              : 'landmarks';
          return {
            id: String(p.id || `${loc?.latitude ?? 0},${loc?.longitude ?? 0}`),
            name: toPlainText(p.name) || toPlainText(p.displayName) || 'Local Place',
            formattedAddress: typeof p.formattedAddress === 'string' ? p.formattedAddress : '',
            shortFormattedAddress:
              typeof p.shortFormattedAddress === 'string' ? p.shortFormattedAddress : undefined,
            location: {
              latitude: Number(loc?.latitude) || centerLat,
              longitude: Number(loc?.longitude) || centerLng,
            },
            primaryType: typeof p.primaryType === 'string' ? p.primaryType : undefined,
            primaryTypeDisplayName: toPlainText(p.primaryTypeDisplayName),
            types: Array.isArray(p.types) ? p.types.filter((t): t is string => typeof t === 'string') : [],
            rating: typeof p.rating === 'number' ? p.rating : null,
            userRatingCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
            googleMapsUri: typeof p.googleMapsUri === 'string' ? p.googleMapsUri : undefined,
            openNow: typeof p.openNow === 'boolean' ? p.openNow : null,
            businessStatus: typeof p.businessStatus === 'string' ? p.businessStatus : undefined,
            categoryBucket: safeBucket,
          };
        });

      setPlaces(list);
      setSelectedPlace((prev) =>
        prev ? list.find((item) => item.id === prev.id) || null : null
      );
    } catch {
      setPlaces([]);
      setPlacesError('Unable to reach nearby places service. Check network connectivity.');
    } finally {
      setIsLoadingPlaces(false);
    }
  }, [centerLat, centerLng, radiusMeters, activeCategory]);

  useEffect(() => {
    fetchNearbyPlaces();
  }, [fetchNearbyPlaces]);

  const handleSelectPlace = (place: NeighborhoodPlace) => {
    setSelectedPlace(place);
    setHotelInfoOpen(false);
    setMapCenter({
      lat: place.location.latitude,
      lng: place.location.longitude,
    });
  };

  const categories: {
    id: NeighborhoodCategory;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { id: 'all', label: 'All Nearby', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'landmarks', label: 'Landmarks', icon: <Landmark className="w-3.5 h-3.5" /> },
    { id: 'restaurants', label: 'Restaurants', icon: <Utensils className="w-3.5 h-3.5" /> },
    { id: 'transit', label: 'Transit', icon: <TrainFront className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="bg-[#FAF7F2] dark:bg-[#171411] rounded-2xl border border-[#E6DFD3] dark:border-[#2A241E] shadow-sm overflow-hidden">
      {/* Guide Controls Bar */}
      <div className="p-4 sm:p-5 bg-white dark:bg-[#1B1713] border-b border-[#E6DFD3] dark:border-[#2A241E] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-[#1A1714] text-[#FAF7F2] dark:bg-[#C69553] dark:text-[#14110E] shadow-xs'
                  : 'bg-[#F3EDE2] dark:bg-[#231E19] text-[#5C544B] dark:text-[#C5BCB0] hover:bg-[#EAE1D2] dark:hover:bg-[#2D2620]'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-[#6B6258] dark:text-[#AFA699]">
          <span className="font-mono text-[11px]">
            Radius: {(radiusMeters / 1000).toFixed(1)} km around Kamalpokhari
          </span>
          <button
            type="button"
            onClick={fetchNearbyPlaces}
            disabled={isLoadingPlaces}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E6DFD3] dark:border-[#342C24] hover:bg-[#F3EDE2] dark:hover:bg-[#231E19] text-[#1A1714] dark:text-[#F4EFE6] font-semibold text-xs cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
            title="Refresh live Places data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPlaces ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Interactive Split Map + Places List */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Map Viewport (explicit height prevents CF2 collapse) */}
        <div className="lg:col-span-7 relative h-[360px] sm:h-[420px] bg-[#EFE9DF] dark:bg-[#14110E]">
          {mapsApiKey ? (
            <APIProvider apiKey={mapsApiKey} language="en" region="NP">
              <GoogleMap
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                defaultCenter={{ lat: centerLat, lng: centerLng }}
                center={mapCenter}
                onCameraChanged={(ev) => {
                  if (ev?.detail?.center) {
                    setMapCenter(ev.detail.center);
                  }
                }}
                defaultZoom={15}
                gestureHandling="cooperative"
                className="w-full h-full"
              >
                <HotelAnchorMarker
                  hotelName={themeConfig.hotelName}
                  address={themeConfig.address}
                  googleMapsUrl={themeConfig.googleMapsUrl}
                  position={{ lat: centerLat, lng: centerLng }}
                  isOpen={hotelInfoOpen}
                  onToggle={() => {
                    setHotelInfoOpen((prev) => !prev);
                    setSelectedPlace(null);
                  }}
                  onClose={() => setHotelInfoOpen(false)}
                />

                {places.map((place) => (
                  <PlaceMarkerWithInfo
                    key={place.id}
                    place={place}
                    isSelected={selectedPlace?.id === place.id}
                    onSelect={handleSelectPlace}
                    onClose={() => setSelectedPlace(null)}
                  />
                ))}
              </GoogleMap>
            </APIProvider>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
              <MapPin className="w-8 h-8 text-[#96682E] dark:text-[#D4A76A]" />
              <div className="font-serif font-bold text-base text-[#1A1714] dark:text-[#F4EFE6]">
                {configLoaded ? 'Interactive Map View Ready on Key Activation' : 'Loading Google Maps...'}
              </div>
              <p className="text-xs text-[#5C544B] dark:text-[#AFA699] max-w-sm">
                Explore Kamalpokhari landmarks and direct route instructions via Google Maps Directions.
              </p>
              <a
                href={themeConfig.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#96682E] hover:bg-[#7D5522] dark:bg-[#C69553] dark:text-[#14110E] text-white text-xs font-semibold"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Open Directions on Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Legend Strip */}
          <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-[#171411]/95 backdrop-blur-sm border border-[#E6DFD3] dark:border-[#342C24] rounded-lg px-3 py-1.5 shadow-md flex flex-wrap items-center gap-3 text-[11px] font-medium text-[#1A1714] dark:text-[#F4EFE6]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#96682E]" />
              <span>{themeConfig.hotelName}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
              <span>Landmarks</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span>Dining</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
              <span>Transit</span>
            </span>
          </div>
        </div>

        {/* Clickable Live Nearby Places Directory */}
        <div className="lg:col-span-5 h-[360px] sm:h-[420px] flex flex-col bg-[#FAF7F2] dark:bg-[#14110E] border-t lg:border-t-0 lg:border-l border-[#E6DFD3] dark:border-[#2A241E]">
          <div className="px-4 py-3 border-b border-[#E6DFD3] dark:border-[#2A241E] bg-white dark:bg-[#1B1713] flex items-center justify-between text-xs shrink-0">
            <span className="font-semibold text-[#1A1714] dark:text-[#F4EFE6]">
              Nearby Around Kamalpokhari
            </span>
            <span className="font-mono text-[11px] text-[#6B6258] dark:text-[#AFA699]">
              {isLoadingPlaces ? 'Searching...' : `${places.length} verified places`}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {isLoadingPlaces && (
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-[#171411] border border-[#E6DFD3] dark:border-[#2A241E] space-y-2"
                  >
                    <div className="h-3.5 w-2/3 bg-[#EFE9DF] dark:bg-[#231E19] rounded" />
                    <div className="h-3 w-full bg-[#F5F0E7] dark:bg-[#1E1914] rounded" />
                  </div>
                ))}
              </div>
            )}

            {!isLoadingPlaces && placesError && (
              <div className="p-4 rounded-xl bg-[#FAF3E6] dark:bg-[#261E14] border border-[#DFBE88] dark:border-[#6A4C25] text-xs text-[#6B4A1E] dark:text-[#EAD8B8] space-y-2">
                <div className="flex items-start gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#96682E] dark:text-[#D4A76A]" />
                  <span>{placesError}</span>
                </div>
                <a
                  href={themeConfig.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold underline"
                >
                  <span>Explore Kamalpokhari on Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {!isLoadingPlaces && !placesError && places.length === 0 && (
              <div className="p-6 text-center text-xs text-[#6B6258] dark:text-[#AFA699] space-y-2">
                <p>No places returned for this filter within {(radiusMeters / 1000).toFixed(1)} km.</p>
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className="px-3 py-1.5 rounded-lg border border-[#E6DFD3] dark:border-[#342C24] font-semibold text-[#1A1714] dark:text-[#F4EFE6] hover:bg-[#EFE9DF] dark:hover:bg-[#231E19] cursor-pointer"
                >
                  Show All Nearby Categories
                </button>
              </div>
            )}

            {!isLoadingPlaces &&
              places.map((place) => {
                const isSelected = selectedPlace?.id === place.id;
                const palette =
                  CATEGORY_COLORS[place.categoryBucket] || CATEGORY_COLORS.landmarks;
                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => handleSelectPlace(place)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'bg-[#FAF3E6] dark:bg-[#261E14] border-[#96682E] dark:border-[#C69553] shadow-sm'
                        : 'bg-white dark:bg-[#171411] border-[#E6DFD3] dark:border-[#2A241E] hover:border-[#C69553]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-xs text-[#1A1714] dark:text-[#F4EFE6] leading-snug">
                        {place.name}
                      </div>
                      <span
                        className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold shrink-0 text-white"
                        style={{ backgroundColor: palette.bg }}
                      >
                        {place.primaryTypeDisplayName || palette.label}
                      </span>
                    </div>

                    {(place.shortFormattedAddress || place.formattedAddress) && (
                      <div className="text-[11px] text-[#6B6258] dark:text-[#AFA699] line-clamp-1">
                        {place.shortFormattedAddress || place.formattedAddress}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
                      <div className="flex items-center gap-2">
                        {typeof place.rating === 'number' && (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#96682E] dark:text-[#D4A76A]">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{place.rating.toFixed(1)}</span>
                            {typeof place.userRatingCount === 'number' && (
                              <span className="text-[#8E8477] font-normal">
                                ({place.userRatingCount})
                              </span>
                            )}
                          </span>
                        )}
                        {typeof place.openNow === 'boolean' && (
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              place.openNow
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{place.openNow ? 'Open' : 'Closed'}</span>
                          </span>
                        )}
                      </div>

                      {place.googleMapsUri && (
                        <a
                          href={place.googleMapsUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[#96682E] dark:text-[#D4A76A] font-semibold hover:underline"
                        >
                          <span>Directions</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
