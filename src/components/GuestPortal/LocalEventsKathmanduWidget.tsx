import React, { useEffect, useState, useCallback } from 'react';
import {
  CloudSun,
  Calendar,
  MapPin,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Compass,
  Mountain,
  Wind,
} from 'lucide-react';

interface GroundedSource {
  title: string;
  uri: string;
}

interface ParsedWeatherInfo {
  condition: string;
  temperatureC: string;
  feelsLikeOrRange: string;
  humidityOrWind: string;
  himalayanVisibility: string;
  guestTip: string;
}

interface ParsedCulturalEvent {
  title: string;
  dateOrTiming: string;
  location: string;
  category: string;
  summary: string;
}

interface ParsedAttraction {
  name: string;
  distanceFromKamalpokhari: string;
  bestTimeToday: string;
  highlight: string;
}

interface KathmanduGuideData {
  focus: string;
  fetchedAt: string;
  conciergeBrief: string;
  weather: ParsedWeatherInfo;
  events: ParsedCulturalEvent[];
  attractions: ParsedAttraction[];
  rawSummary?: string;
  searchQueries: string[];
  sources: GroundedSource[];
}

type GuideFocus = 'all' | 'events' | 'weather' | 'attractions';

interface LocalEventsKathmanduWidgetProps {
  compact?: boolean;
  onExpandFull?: () => void;
}

export const LocalEventsKathmanduWidget: React.FC<LocalEventsKathmanduWidgetProps> = ({
  compact = false,
  onExpandFull,
}) => {
  const [focus, setFocus] = useState<GuideFocus>('all');
  const [data, setData] = useState<KathmanduGuideData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchGuide = useCallback(async (selectedFocus: GuideFocus) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/local-guide/kathmandu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focus: selectedFocus }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || `Server responded with status ${response.status}`);
      }

      setData(payload as KathmanduGuideData);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to reach live Kathmandu local guide service.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuide(focus);
  }, [fetchGuide, focus]);

  if (compact) {
    return (
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 px-5 py-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start md:items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-amber-700 dark:text-amber-400 shrink-0">
            <CloudSun className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-semibold text-stone-900 dark:text-stone-50">
                Kathmandu Live Guide
              </span>
              <span className="text-stone-300 dark:text-stone-700">·</span>
              {isLoading && !data ? (
                <span className="text-stone-500">Fetching live weather &amp; cultural events...</span>
              ) : error && !data ? (
                <span className="text-rose-600 dark:text-rose-400 truncate">{error}</span>
              ) : data ? (
                <span className="text-stone-600 dark:text-stone-300 truncate">
                  <strong className="font-mono tabular-nums text-stone-900 dark:text-stone-100">
                    {data.weather.temperatureC}
                  </strong>{' '}
                  · {data.weather.condition} ·{' '}
                  {data.events.length > 0
                    ? `${data.events.length} cultural events found`
                    : 'Local events ready'}
                </span>
              ) : null}
            </div>
            {data?.conciergeBrief && (
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                {data.conciergeBrief}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchGuide(focus)}
            disabled={isLoading}
            className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {onExpandFull && (
            <button
              type="button"
              onClick={onExpandFull}
              className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-amber-700 hover:bg-stone-800 dark:hover:bg-amber-600 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              Explore Events &amp; Weather
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Focus Controls */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>Kamalpokhari Concierge · Live Google Search Grounding</span>
            </div>
            <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-50">
              Kathmandu Local Events, Attractions &amp; Live Weather
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Real-time Kathmandu Valley weather, cultural festivals, temple ceremonies, and heritage planning tips.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {data?.fetchedAt && (
              <span className="text-[11px] font-mono text-stone-400 tabular-nums hidden sm:inline">
                Updated {new Date(data.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              type="button"
              onClick={() => fetchGuide(focus)}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Searching Kathmandu...' : 'Refresh Live Updates'}</span>
            </button>
          </div>
        </div>

        {/* Focus Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
          {(
            [
              { id: 'all', label: 'Complete Kathmandu Guide' },
              { id: 'events', label: 'Cultural Events & Festivals' },
              { id: 'weather', label: 'Weather & Mountain Visibility' },
              { id: 'attractions', label: 'Temples & Heritage Sites' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFocus(item.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                focus === item.id
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5 text-rose-900 dark:text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Could not load live Kathmandu guide</div>
              <div className="mt-0.5 text-rose-800 dark:text-rose-300">{error}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchGuide(focus)}
            className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="h-56 rounded-2xl bg-stone-200/70 dark:bg-stone-800/70" />
          <div className="lg:col-span-2 h-56 rounded-2xl bg-stone-200/70 dark:bg-stone-800/70" />
        </div>
      )}

      {/* Loaded Content */}
      {data && (
        <div className="space-y-6">
          {/* Weather + Brief Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Kathmandu Weather Card */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Live Kathmandu Weather
                </span>
                <CloudSun className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>

              <div>
                <div className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-50 tabular-nums">
                  {data.weather.temperatureC}
                </div>
                <div className="text-sm font-semibold text-amber-800 dark:text-amber-300 mt-0.5">
                  {data.weather.condition}
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 tabular-nums">
                  {data.weather.feelsLikeOrRange}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-stone-100 dark:border-stone-800 text-xs">
                <div className="flex items-start gap-2 text-stone-600 dark:text-stone-300">
                  <Wind className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                  <span>{data.weather.humidityOrWind}</span>
                </div>
                <div className="flex items-start gap-2 text-stone-600 dark:text-stone-300">
                  <Mountain className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                  <span>{data.weather.himalayanVisibility}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/70 text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                <span className="font-semibold text-stone-900 dark:text-stone-100">Concierge Tip: </span>
                {data.weather.guestTip}
              </div>
            </div>

            {/* Cultural Events & Concierge Brief */}
            <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
              <div className="space-y-1.5 pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Current Cultural Events &amp; Festivals</span>
                </div>
                <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                  {data.conciergeBrief}
                </p>
              </div>

              {data.rawSummary ? (
                <div className="text-xs text-stone-700 dark:text-stone-300 whitespace-pre-line leading-relaxed">
                  {data.rawSummary}
                </div>
              ) : data.events.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-500 dark:text-stone-400">
                  No specific time-bound festival bulletins returned right now; explore evergreen Kathmandu attractions below.
                </div>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-stone-800">
                  {data.events.map((ev, idx) => (
                    <div key={`${ev.title}-${idx}`} className="py-3 first:pt-1 last:pb-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-50">
                          {ev.title}
                        </h4>
                        <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400">
                          {ev.category} · {ev.dateOrTiming}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{ev.location}</span>
                      </div>
                      {ev.summary && (
                        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                          {ev.summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nearby Heritage & Attractions Grid */}
          {data.attractions.length > 0 && (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                <div>
                  <h4 className="font-serif font-bold text-base text-stone-900 dark:text-stone-50">
                    Recommended Cultural Sites &amp; Attractions Near Kamalpokhari
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Ask Reception to arrange a vetted hotel cab or cultural guide for any stop below.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.attractions.map((site, idx) => (
                  <div
                    key={`${site.name}-${idx}`}
                    className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 space-y-1.5 text-xs"
                  >
                    <h5 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
                      {site.name}
                    </h5>
                    <div className="text-[11px] font-mono text-amber-700 dark:text-amber-400">
                      {site.distanceFromKamalpokhari} · Best: {site.bestTimeToday}
                    </div>
                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                      {site.highlight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grounded Web Sources */}
          {data.sources.length > 0 && (
            <div className="bg-stone-50 dark:bg-stone-900/70 rounded-xl border border-stone-200 dark:border-stone-800 p-4 space-y-2 text-xs">
              <div className="font-mono text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Grounded Web Sources ({data.sources.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {data.sources.map((src) => (
                  <a
                    key={src.uri}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:border-amber-600 dark:hover:border-amber-500 transition-colors"
                  >
                    <span className="truncate max-w-[220px]">{src.title}</span>
                    <ExternalLink className="w-3 h-3 text-stone-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
