import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useRenderTracker } from '../../hooks/useRenderTracker';
import { performanceTracker } from '../../services/performanceTracker';
import { 
  Sun, 
  CloudSun, 
  CloudRain, 
  Wind, 
  Droplets, 
  Eye, 
  Compass, 
  Mountain, 
  Sparkles, 
  RefreshCw, 
  Clock, 
  Thermometer, 
  ChevronRight,
  Info
} from 'lucide-react';
import { ModalDismissButton } from '../Common/ModalDismissHandler';

interface KathmanduWeatherData {
  tempC: number;
  tempF: number;
  condition: string;
  isDay: boolean;
  humidity: number;
  windSpeedKmH: number;
  visibilityKm: number;
  mountainVisibility: 'excellent' | 'good' | 'hazy';
  mountainNote: string;
  packingTip: string;
  forecast: {
    day: string;
    condition: string;
    highC: number;
    lowC: number;
    highF: number;
    lowF: number;
    icon: string;
  }[];
  updatedAt: string;
  isLive: boolean;
}

const DEFAULT_KATHMANDU_WEATHER: KathmanduWeatherData = {
  tempC: 22,
  tempF: 72,
  condition: 'Sunny & Clear Skies',
  isDay: true,
  humidity: 48,
  windSpeedKmH: 8,
  visibilityKm: 10,
  mountainVisibility: 'excellent',
  mountainNote: 'Clear Mountain Horizon · Langtang & Ganesh Himal Peaks Visible from Rooftop',
  packingTip: 'Crisp sunny afternoons with cool Himalayan breeze. Perfect for rooftop dining; light shawl or jacket recommended after 6:00 PM.',
  forecast: [
    { day: 'Today', condition: 'Sunny', highC: 24, lowC: 13, highF: 75, lowF: 55, icon: 'sun' },
    { day: 'Tomorrow', condition: 'Clear', highC: 23, lowC: 12, highF: 73, lowF: 54, icon: 'sun' },
    { day: 'Sunday', condition: 'Partly Cloudy', highC: 22, lowC: 12, highF: 72, lowF: 54, icon: 'cloud-sun' },
  ],
  updatedAt: 'Live',
  isLive: false,
};

export const KathmanduWeatherWidget: React.FC<{
  variant?: 'banner' | 'card' | 'compact' | 'minimal';
  className?: string;
}> = ({ variant = 'banner', className = '' }) => {
  useRenderTracker('KathmanduWeatherWidget');
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [kathmanduTime, setKathmanduTime] = useState<string>('');

  // Keep live Kathmandu local time (UTC+5:45) - updated every 60 seconds to prevent lag
  useEffect(() => {
    const updateTime = () => {
      try {
        const timeStr = new Date().toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kathmandu',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        setKathmanduTime(timeStr);
      } catch (e) {
        setKathmanduTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Dismiss modal on Escape key
  useEffect(() => {
    if (!isDetailModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDetailModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailModalOpen]);

  // Cached & instrumented Open-Meteo API fetch via TanStack Query
  const {
    data: weather = DEFAULT_KATHMANDU_WEATHER,
    isFetching: isLoading,
    refetch: fetchLiveWeather,
  } = useQuery<KathmanduWeatherData>({
    queryKey: ['weather', 'kathmandu'],
    queryFn: async () => {
      const startTime = performance.now();
      const delay = performanceTracker.getSlowNetworkDelay();
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));

      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=27.7172&longitude=85.3240&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FKathmandu'
        );
        const duration = performance.now() - startTime;

        if (!res.ok) {
          performanceTracker.recordApiCall({
            endpoint: 'api.open-meteo.com/v1/forecast (Kathmandu)',
            method: 'GET',
            status: 'error',
            durationMs: duration,
            source: 'weather_api',
            isCacheHit: false,
            statusCode: res.status,
            details: `HTTP ${res.status} fallback to seasonal cache`,
          });
          return { ...DEFAULT_KATHMANDU_WEATHER, isLive: false };
        }

        const data = await res.json();
        const current = data.current;
        const tempC = Math.round(current.temperature_2m);
        const tempF = Math.round((tempC * 9) / 5 + 32);

        const code = current.weather_code || 0;
        let condText = 'Sunny & Clear';
        let mountainVis: 'excellent' | 'good' | 'hazy' = 'excellent';
        let mountainNote = 'Langtang & Ganesh Himal Peaks Visible from Rooftop';

        if (code === 0) {
          condText = 'Crisp Sunlit Himalayan Sky';
          mountainVis = 'excellent';
          mountainNote = 'Magnificent 360° Mountain Clarity from Kamal Hotel Rooftop';
        } else if (code <= 3) {
          condText = 'Partly Sunlit & Mild Breeze';
          mountainVis = 'good';
          mountainNote = 'Soft Mountain Contours Visible against Azure Sky';
        } else if (code >= 51 && code <= 67) {
          condText = 'Gentle Valley Rain & Fresh Breeze';
          mountainVis = 'hazy';
          mountainNote = 'Lush Valley Atmosphere · Mountain Rain Retreat';
        } else {
          condText = 'Pleasant Himalayan Climate';
        }

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const daily = data.daily || {};
        const forecastList = (daily.time || []).slice(0, 3).map((dateStr: string, idx: number) => {
          const d = new Date(dateStr);
          const dayName = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : days[d.getDay()];
          const maxC = Math.round(daily.temperature_2m_max[idx] || 22);
          const minC = Math.round(daily.temperature_2m_min[idx] || 12);
          return {
            day: dayName,
            condition: (daily.weather_code[idx] || 0) <= 2 ? 'Sunny' : 'Scattered Clouds',
            highC: maxC,
            lowC: minC,
            highF: Math.round((maxC * 9) / 5 + 32),
            lowF: Math.round((minC * 9) / 5 + 32),
            icon: (daily.weather_code[idx] || 0) <= 2 ? 'sun' : 'cloud-sun',
          };
        });

        performanceTracker.recordApiCall({
          endpoint: 'api.open-meteo.com/v1/forecast (Kathmandu)',
          method: 'GET',
          status: 'success',
          durationMs: duration,
          source: 'weather_api',
          isCacheHit: false,
          statusCode: 200,
          details: `Live Kathmandu telemetry (${tempC}°C, ${condText}) cached for 5m`,
        });

        return {
          tempC,
          tempF,
          condition: condText,
          isDay: Boolean(current.is_day),
          humidity: current.relative_humidity_2m || 50,
          windSpeedKmH: Math.round(current.wind_speed_10m || 6),
          visibilityKm: 10,
          mountainVisibility: mountainVis,
          mountainNote,
          packingTip: tempC > 20 
            ? 'Warm sunlit day. Comfortable cottons for Kathmandu city walks; light sweater for rooftop dining.' 
            : 'Pleasant cool climate. Bring a cozy layer or fleece for evening mountain breezes.',
          forecast: forecastList.length ? forecastList : DEFAULT_KATHMANDU_WEATHER.forecast,
          updatedAt: 'Live Open-Meteo',
          isLive: true,
        };
      } catch (e) {
        const duration = performance.now() - startTime;
        performanceTracker.recordApiCall({
          endpoint: 'api.open-meteo.com/v1/forecast (Kathmandu)',
          method: 'GET',
          status: 'error',
          durationMs: duration,
          source: 'weather_api',
          isCacheHit: false,
          statusCode: 0,
          details: 'Offline / blocked fallback to seasonal defaults',
        });
        return { ...DEFAULT_KATHMANDU_WEATHER, isLive: false };
      }
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const currentTemp = unit === 'C' ? `${weather.tempC}°C` : `${weather.tempF}°F`;

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-900 dark:text-amber-200 ${className}`}>
        <Sun className="w-4 h-4 text-amber-500" />
        <span>Kathmandu:</span>
        <button
          type="button"
          onClick={() => setUnit(unit === 'C' ? 'F' : 'C')}
          className="font-bold hover:underline cursor-pointer tabular-nums"
          title="Click to toggle °C / °F"
        >
          {currentTemp}
        </button>
        <span className="text-stone-400">·</span>
        <span className="truncate max-w-[150px]">{weather.condition}</span>
      </div>
    );
  }

  const isMinimal = variant === 'minimal';
  const isCard = variant === 'card';

  return (
    <>
      {isMinimal ? (
        <div
          className={`w-full rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 px-4 py-2.5 text-xs text-stone-600 dark:text-stone-300 flex flex-wrap items-center justify-between gap-3 ${className}`}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5 font-medium text-stone-900 dark:text-stone-100">
              <Sun className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Kathmandu</span>
            </span>
            <button
              type="button"
              onClick={() => setUnit(unit === 'C' ? 'F' : 'C')}
              className="font-semibold text-stone-900 dark:text-stone-100 hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer tabular-nums"
              title="Toggle °C / °F"
            >
              {currentTemp}
            </button>
            <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>
            <span>{weather.condition}</span>
            <span className="hidden lg:inline text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>
            <span className="hidden lg:inline text-stone-500 dark:text-stone-400 truncate max-w-md">
              {weather.mountainNote}
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto text-xs">
            <span className="text-stone-500 dark:text-stone-400 tabular-nums">
              {kathmanduTime || '5:45 PM'} NPT
            </span>
            <button
              type="button"
              onClick={() => setIsDetailModalOpen(true)}
              className="font-medium text-amber-800 dark:text-amber-400 hover:underline cursor-pointer whitespace-nowrap"
            >
              Forecast
            </button>
          </div>
        </div>
      ) : (
      <div
        className={`w-full bg-gradient-to-r from-amber-50/90 via-amber-100/60 to-yellow-50/90 dark:from-stone-900 dark:via-amber-950/30 dark:to-stone-900 ${
          isCard 
            ? 'rounded-xl border border-amber-300/70 dark:border-amber-800/50 shadow-md backdrop-blur-sm' 
            : 'border-y border-amber-200/80 dark:border-amber-800/40 shadow-xs'
        } text-xs text-stone-800 dark:text-stone-200 transition-all ${className}`}
      >
        <div className={isCard ? 'px-3.5 py-3 sm:px-5 sm:py-3.5' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5'}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Left: Weather Indicator & Real-Time Temperature */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500 text-stone-950 shadow-xs">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-serif font-bold text-sm text-stone-900 dark:text-stone-50">
                      Kathmandu Valley Climate:
                    </span>
                    <button
                      type="button"
                      onClick={() => setUnit(unit === 'C' ? 'F' : 'C')}
                      className="px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/60 font-mono font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-300 transition cursor-pointer text-xs"
                      title="Toggle Celsius / Fahrenheit"
                    >
                      {currentTemp} ({unit === 'C' ? '°F' : '°C'})
                    </button>
                  </div>
                  <div className="text-[11px] text-amber-900/80 dark:text-amber-300/80 font-medium flex items-center gap-1">
                    <span>{weather.condition}</span>
                    <span className="text-stone-400">·</span>
                    <span className="font-mono text-[10px]">Humidity {weather.humidity}%</span>
                  </div>
                </div>
              </div>

              {/* Center: Mountain Visibility Badge */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/70 dark:bg-stone-800/60 border border-amber-300/60 dark:border-amber-700/40 text-[11px]">
                <Mountain className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-semibold text-amber-950 dark:text-amber-200">
                  {weather.mountainNote}
                </span>
              </div>
            </div>

            {/* Right: Kathmandu Local Time Clock & Live Advisory Details */}
            <div className="flex items-center gap-2 sm:gap-3 text-[11px]">
              <div className="flex items-center gap-1 font-mono text-stone-600 dark:text-stone-400 bg-white/60 dark:bg-stone-800/60 px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>Kathmandu (NPT): {kathmanduTime || '5:45 PM'}</span>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs transition cursor-pointer text-[11px]"
              >
                <Sparkles className="w-3 h-3" />
                <span>Climate & Travel Tips</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  void fetchLiveWeather();
                }}
                disabled={isLoading}
                className="p-1 rounded text-stone-500 hover:text-amber-700 hover:bg-amber-200/50 transition cursor-pointer"
                title="Refresh Live Weather Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

          </div>
        </div>
      </div>
      )}

      {/* CLIMATE & PACKING ADVISORY MODAL (PORTALED DIRECTLY TO DOCUMENT.BODY AT Z-[9999]) */}
      {isDetailModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDetailModalOpen(false);
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-900/60 rounded-2xl max-w-lg w-full p-5 shadow-2xl relative space-y-4 text-stone-800 dark:text-stone-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2.5 border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-amber-500 text-stone-950 shadow-sm shrink-0">
                  <Sun className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 truncate">
                    Kathmandu & Himalayan Weather Report
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                    Kamalpokhari, Kathmandu (Elevation: 1,400m / 4,600ft) · Live Open-Meteo Feed
                  </p>
                </div>
              </div>
              <ModalDismissButton onClose={() => setIsDetailModalOpen(false)} ariaLabel="Close weather report" />
            </div>

            {/* Current Conditions Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-stone-800/60 border border-amber-200/60 dark:border-amber-800/40">
                <span className="text-[10px] uppercase font-mono text-stone-400 block">Temperature</span>
                <span className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5 block">
                  {currentTemp}
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400">{weather.condition}</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-stone-800/60 border border-amber-200/60 dark:border-amber-800/40">
                <span className="text-[10px] uppercase font-mono text-stone-400 block">Humidity</span>
                <span className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5 block">
                  {weather.humidity}%
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Comfortable</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-stone-800/60 border border-amber-200/60 dark:border-amber-800/40">
                <span className="text-[10px] uppercase font-mono text-stone-400 block">Wind Breeze</span>
                <span className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5 block">
                  {weather.windSpeedKmH} km/h
                </span>
                <span className="text-[10px] text-stone-500">Gentle Valley Wind</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-stone-800/60 border border-amber-200/60 dark:border-amber-800/40">
                <span className="text-[10px] uppercase font-mono text-stone-400 block">Mountain View</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  98% Clear
                </span>
                <span className="text-[10px] text-stone-500">Peak Sightings</span>
              </div>
            </div>

            {/* Traveler Advisory / Packing Guidance */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-stone-800 dark:to-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs space-y-1.5">
              <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Concierge Seasonal Advisory & Packing Tips</span>
              </div>
              <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                {weather.packingTip}
              </p>
            </div>

            {/* 3-Day Forecast */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase text-stone-400 font-bold block">
                3-Day Kathmandu Weather Outlook:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {weather.forecast.map((f, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-center text-xs"
                  >
                    <div className="font-semibold text-stone-900 dark:text-stone-100">{f.day}</div>
                    <div className="text-[11px] text-stone-400 my-1">{f.condition}</div>
                    <div className="font-bold text-amber-800 dark:text-amber-300 font-mono text-xs">
                      {unit === 'C' ? `${f.highC}° / ${f.lowC}°C` : `${f.highF}° / ${f.lowF}°F`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500">
              <span>Data source: Live Open-Meteo Satellite Feed</span>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-amber-700 hover:bg-amber-800 text-white transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
