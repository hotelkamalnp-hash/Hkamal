import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  performanceTracker, 
  RenderMetric, 
  ApiRequestMetric, 
  BottleneckAlert 
} from '../../services/performanceTracker';
import { runLiveBenchmark } from '../../services/supabaseQueryHooks';
import { useHotel } from '../../context/HotelContext';
import { 
  Activity, 
  Zap, 
  Clock, 
  Database, 
  Layers, 
  RefreshCw, 
  Play, 
  Trash2, 
  Download, 
  AlertTriangle, 
  Wifi, 
  Search,
  Gauge
} from 'lucide-react';

export const PerformanceMonitoringDashboard: React.FC = () => {
  const { themeConfig, showToast } = useHotel();
  const queryClient = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState<'renders' | 'network' | 'cache'>('renders');
  const [renderMetrics, setRenderMetrics] = useState<RenderMetric[]>([]);
  const [apiMetrics, setApiMetrics] = useState<ApiRequestMetric[]>([]);
  const [alerts, setAlerts] = useState<BottleneckAlert[]>([]);
  const [summary, setSummary] = useState(performanceTracker.getSummary());
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<any[] | null>(null);
  const [apiFilter, setApiFilter] = useState<'all' | 'cached' | 'network' | 'slow'>('all');
  const [apiSearch, setApiSearch] = useState('');
  const [renderSearch, setRenderSearch] = useState('');

  // Subscribe to real-time telemetry changes
  useEffect(() => {
    const refreshData = () => {
      setRenderMetrics(performanceTracker.getRenderMetrics());
      setApiMetrics(performanceTracker.getApiMetrics());
      setAlerts(performanceTracker.detectBottlenecks());
      setSummary(performanceTracker.getSummary());
    };

    refreshData();
    const unsubscribe = performanceTracker.subscribe(refreshData);
    return unsubscribe;
  }, []);

  // Filtered API logs
  const filteredApiMetrics = useMemo(() => {
    const q = apiSearch.toLowerCase();
    return apiMetrics.filter((m) => {
      const matchesSearch = !q || m.endpoint.toLowerCase().includes(q) || (m.details && m.details.toLowerCase().includes(q));
      if (!matchesSearch) return false;

      if (apiFilter === 'cached') return m.isCacheHit;
      if (apiFilter === 'network') return !m.isCacheHit && m.durationMs <= 200;
      if (apiFilter === 'slow') return m.durationMs > 200;
      return true;
    });
  }, [apiMetrics, apiSearch, apiFilter]);

  // Filtered Render metrics
  const filteredRenderMetrics = useMemo(() => {
    const q = renderSearch.toLowerCase();
    return renderMetrics.filter((r) => !q || r.component.toLowerCase().includes(q));
  }, [renderMetrics, renderSearch]);

  const handleRunStressBenchmark = async () => {
    setIsRunningBenchmark(true);
    try {
      const results = await runLiveBenchmark(themeConfig.supabaseUrl, themeConfig.supabaseAnonKey);
      setBenchmarkResults(results);
      showToast('Diagnostic Benchmark Complete', 'Measured cold network latency vs warm React Query cache hits.', 'success');
    } catch (err: any) {
      showToast('Benchmark Error', err.message || 'Diagnostic failed', 'error');
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  const handleInvalidateCache = () => {
    queryClient.invalidateQueries();
    performanceTracker.recordApiCall({
      endpoint: 'React Query: Cache Invalidation (All Keys)',
      method: 'PING',
      status: 'success',
      durationMs: 0.5,
      source: 'react_query',
      isCacheHit: false,
      statusCode: 200,
      details: 'All query caches marked stale; background revalidations queued',
    });
    showToast('Cache Invalidated', 'All query keys reset to verify fresh background fetches.', 'info');
  };

  const handleToggleSlowNetwork = () => {
    const isSimulating = performanceTracker.toggleSimulateSlowNetwork();
    showToast(
      isSimulating ? 'Latency Simulator Active' : 'Normal Network Restored',
      isSimulating ? 'Simulating 600ms latency on external API calls.' : 'Standard network response times restored.',
      isSimulating ? 'warning' : 'info'
    );
  };

  const handleClearTelemetry = () => {
    performanceTracker.clearMetrics();
    setBenchmarkResults(null);
    showToast('Telemetry Reset', 'Render counters and network logs cleared.', 'info');
  };

  const handleExportTelemetryJson = () => {
    const report = {
      timestamp: new Date().toISOString(),
      summary: performanceTracker.getSummary(),
      renderMetrics: performanceTracker.getRenderMetrics(),
      networkMetrics: performanceTracker.getApiMetrics(),
      alerts: performanceTracker.detectBottlenecks(),
      cachingConfiguration: {
        staleTime: '5 minutes',
        gcTime: '30 minutes',
        refetchOnWindowFocus: false,
        client: 'TanStack React Query v5',
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Kamal_Hotel_Performance_Telemetry_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast('Telemetry Exported', 'Downloaded complete performance audit report.', 'success');
  };

  // Inspect React Query active cache keys
  const activeQueries = queryClient.getQueryCache().getAll();

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Quick Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-50">
              Platform Performance & Telemetry Engine
            </h2>
            <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>
            <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Telemetry Active
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Real-time tracking of API response times, component render cycles, and TanStack Query cache hit ratios.
          </p>
        </div>

        {/* Global Control Actions */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRunStressBenchmark}
            disabled={isRunningBenchmark}
            className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            title="Execute live cold vs warm cache latency benchmark"
          >
            <Play className={`w-3.5 h-3.5 ${isRunningBenchmark ? 'animate-spin' : ''}`} />
            <span>{isRunningBenchmark ? 'Benchmarking...' : 'Run Stress Test'}</span>
          </button>

          <button
            type="button"
            onClick={handleInvalidateCache}
            className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 text-xs font-semibold flex items-center gap-1.5 border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer"
            title="Mark all React Query keys stale to test cold revalidation"
          >
            <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
            <span>Purge Query Cache</span>
          </button>

          <button
            type="button"
            onClick={handleToggleSlowNetwork}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
              summary.isSimulatingSlowNetwork
                ? 'bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700'
            }`}
            title="Simulate slow 3G network latency (+600ms)"
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>{summary.isSimulatingSlowNetwork ? 'Slow 3G: ON (+600ms)' : 'Simulate Slow 3G'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportTelemetryJson}
            className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 text-xs font-semibold flex items-center gap-1.5 border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer"
            title="Download JSON telemetry audit"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={handleClearTelemetry}
            className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors rounded"
            title="Clear current metrics and reset counters"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Key Performance Indicators (KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* KPI 1: Cache Hit Ratio */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Cache Hit Efficiency</span>
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-stone-900 dark:text-stone-50 tabular-nums">
              {summary.cacheHitRate}%
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {summary.cacheHits} / {summary.totalRequests} cached
            </span>
          </div>
          <div className="mt-2 text-[11px] text-stone-400">
            TanStack SWR cache prevents repeated Supabase network hops.
          </div>
        </div>

        {/* KPI 2: Average API Latency */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Avg Response Latency</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-stone-900 dark:text-stone-50 tabular-nums">
              {summary.avgResponseTimeMs}ms
            </span>
            <span className="text-xs text-stone-500 font-mono">
              (Warm &lt; 2ms)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-stone-400">
            Blended average across Supabase RPC, Weather, and cache reads.
          </div>
        </div>

        {/* KPI 3: Render Cycles Tracked */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Tracked Render Cycles</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-stone-900 dark:text-stone-50 tabular-nums">
              {summary.totalRenders}
            </span>
            <span className="text-xs text-stone-500 font-mono">
              across {summary.trackedComponentsCount} components
            </span>
          </div>
          <div className="mt-2 text-[11px] text-stone-400">
            Monitored via high-resolution performance.now() render observer.
          </div>
        </div>

        {/* KPI 4: Frame Budget / UI Smoothness */}
        <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>60 FPS Budget Health</span>
            <Gauge className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
              summary.totalSlowRenders === 0 ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {summary.totalSlowRenders === 0 ? '100% Smooth' : `${summary.totalSlowRenders} Drops`}
            </span>
            <span className="text-xs text-stone-500 font-mono">
              &le; 16.6ms limit
            </span>
          </div>
          <div className="mt-2 text-[11px] text-stone-400">
            {summary.totalSlowRenders === 0 ? 'Zero UI blocking detected; silky smooth 60fps.' : 'Slow render passes exceeding single frame budget.'}
          </div>
        </div>

      </div>

      {/* 3. Live Benchmark Stress-Test Results Panel (if executed) */}
      {benchmarkResults && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-stone-900 dark:to-stone-800 rounded-xl border border-amber-300 dark:border-amber-800/60 shadow-sm space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Diagnostic Benchmark Results: Cold Network vs. React Query Memory Cache
              </h3>
            </div>
            <button
              onClick={() => setBenchmarkResults(null)}
              className="text-stone-400 hover:text-stone-700 text-xs"
            >
              ✕ Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {benchmarkResults.map((b, idx) => (
              <div 
                key={idx}
                className="p-3 bg-white dark:bg-stone-900/90 rounded-lg border border-stone-200 dark:border-stone-700 text-xs space-y-1.5"
              >
                <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                  {b.testName}
                </div>
                <div className="flex items-center justify-between text-stone-500 font-mono text-[11px]">
                  <span>Cold Network:</span>
                  <span className="text-rose-600 font-bold">{b.coldLatencyMs}ms</span>
                </div>
                <div className="flex items-center justify-between text-stone-500 font-mono text-[11px]">
                  <span>Warm Cache:</span>
                  <span className="text-emerald-600 font-bold">{b.warmCacheLatencyMs}ms</span>
                </div>
                <div className="pt-1.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between font-semibold">
                  <span className="text-stone-700 dark:text-stone-300">Latency Drop:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                    -{b.latencyReductionPct}% faster
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Active Bottlenecks & Optimization Advisories */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Active Diagnostics & Optimization Recommendations ({alerts.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 bg-amber-50/70 dark:bg-stone-900/80 rounded-xl border border-amber-200 dark:border-amber-900/40 text-xs space-y-1.5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    {alert.title}
                  </span>
                  <span className="font-mono text-[10px] text-stone-400">{alert.timestamp}</span>
                </div>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-[11px]">
                  {alert.message}
                </p>
                <div className="pt-1 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                  <strong>Recommendation:</strong> {alert.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 text-xs">
        <button
          onClick={() => setActiveSubTab('renders')}
          className={`px-4 py-2.5 font-semibold transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer ${
            activeSubTab === 'renders'
              ? 'border-amber-700 text-amber-900 dark:text-amber-300'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Component Render Cycles ({renderMetrics.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('network')}
          className={`px-4 py-2.5 font-semibold transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer ${
            activeSubTab === 'network'
              ? 'border-amber-700 text-amber-900 dark:text-amber-300'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>API & Network Response Log ({apiMetrics.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cache')}
          className={`px-4 py-2.5 font-semibold transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer ${
            activeSubTab === 'cache'
              ? 'border-amber-700 text-amber-900 dark:text-amber-300'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>React Query Cache Keys ({activeQueries.length})</span>
        </button>
      </div>

      {/* ==================== SUB-TAB 1: COMPONENT RENDER CYCLES ==================== */}
      {activeSubTab === 'renders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Filter component by name..."
                value={renderSearch}
                onChange={(e) => setRenderSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
            </div>

            <span className="text-[11px] text-stone-400 font-mono">
              Sorted by cumulative CPU render time
            </span>
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600 dark:text-stone-300">
                <thead className="bg-stone-50 dark:bg-stone-800/80 text-[11px] uppercase tracking-wider font-mono border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Component</th>
                    <th className="py-3 px-3 text-center">Render Passes</th>
                    <th className="py-3 px-3 text-right">Last Duration</th>
                    <th className="py-3 px-3 text-right">Avg Duration</th>
                    <th className="py-3 px-3 text-right">Max Spike</th>
                    <th className="py-3 px-3 text-right">Total CPU Time</th>
                    <th className="py-3 px-4 text-center">Frame Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {filteredRenderMetrics.map((r) => {
                    const isOptimal = r.avgDurationMs < 8;
                    const isWarning = r.avgDurationMs >= 8 && r.avgDurationMs <= 16.6;
                    const isSlow = r.avgDurationMs > 16.6;

                    return (
                      <tr key={r.component} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                        <td className="py-2.5 px-4 font-mono font-medium text-stone-900 dark:text-stone-100">
                          &lt;{r.component} /&gt;
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold tabular-nums">
                          {r.renderCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {r.lastDurationMs.toFixed(2)}ms
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-stone-900 dark:text-stone-100">
                          {r.avgDurationMs.toFixed(2)}ms
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-500">
                          {r.maxDurationMs.toFixed(2)}ms
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-700 dark:text-stone-300">
                          {r.totalTimeMs.toFixed(1)}ms
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`font-mono text-[11px] font-semibold tabular-nums ${
                            isSlow
                              ? 'text-rose-700 dark:text-rose-400'
                              : isOptimal
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : isWarning
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-stone-600 dark:text-stone-400'
                          }`}>
                            {isSlow ? 'Exceeded (>16.6ms)' : isOptimal ? 'Optimal (<8ms)' : 'Normal (8-16ms)'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRenderMetrics.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-400 text-xs">
                        No component render profiles match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: API & NETWORK RESPONSE LOG ==================== */}
      {activeSubTab === 'network' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Filter by endpoint, query or details..."
                value={apiSearch}
                onChange={(e) => setApiSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
            </div>

            <div className="flex items-center gap-1 font-medium">
              <span className="text-stone-400">Filter:</span>
              {(['all', 'cached', 'network', 'slow'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setApiFilter(f)}
                  className={`px-2.5 py-1 rounded text-xs capitalize transition cursor-pointer ${
                    apiFilter === f
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                  }`}
                >
                  {f === 'all' ? 'All Calls' : f === 'cached' ? 'Cached (<2ms)' : f === 'network' ? 'Network (<200ms)' : 'Slow (>200ms)'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600 dark:text-stone-300">
                <thead className="bg-stone-50 dark:bg-stone-800/80 text-[11px] uppercase tracking-wider font-mono border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3">Endpoint / Query Target</th>
                    <th className="py-3 px-3">Source & Cache</th>
                    <th className="py-3 px-3 text-right">Duration</th>
                    <th className="py-3 px-4">Details & Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {filteredApiMetrics.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-stone-400 whitespace-nowrap">
                        {item.timestamp}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200">
                          {item.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-stone-900 dark:text-stone-100">
                        {item.endpoint}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.isCacheHit ? (
                          <span className="font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400">
                            CACHE_HIT
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] text-stone-500">
                            NETWORK_FETCH
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span className={item.durationMs <= 5 ? 'text-emerald-600' : item.durationMs <= 180 ? 'text-stone-800 dark:text-stone-200' : 'text-amber-600'}>
                          {item.durationMs.toFixed(1)}ms
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-stone-500 text-[11px] max-w-xs truncate">
                        {item.details || 'OK'}
                      </td>
                    </tr>
                  ))}
                  {filteredApiMetrics.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-400 text-xs">
                        No requests match current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 3: REACT QUERY CACHE REGISTRY & SUPABASE AUDIT ==================== */}
      {activeSubTab === 'cache' && (
        <div className="space-y-5">
          <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 text-xs space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-100">
                <Database className="w-4 h-4 text-amber-600" />
                <span>TanStack React Query Cache & Supabase Optimization Architecture</span>
              </div>
              <span className="font-mono text-[11px] text-stone-500 tabular-nums">
                staleTime: 5m · gcTime: 30m · refetchOnWindowFocus: false
              </span>
            </div>
            <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-[11px]">
              Replaced blocking sequential <code className="font-mono text-stone-800 dark:text-stone-200">for (const room of rooms)</code> HTTP loops in Supabase sync with parallel batched <code className="font-mono text-stone-800 dark:text-stone-200">Promise.all([hotel_config.upsert, rooms.upsert(batch)])</code> payloads and Stale-While-Revalidate caching to eliminate UI freeze and duplicate network hops.
            </p>
          </div>

          {/* Live In-Memory QueryCache Inspector */}
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                Live In-Memory QueryCache Entries ({activeQueries.length})
              </h3>
              <button
                type="button"
                onClick={() => queryClient.refetchQueries()}
                className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Revalidate All Active</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600 dark:text-stone-300">
                <thead className="bg-stone-50 dark:bg-stone-800/80 text-[11px] font-mono border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="py-2.5 px-4">Query Key</th>
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3">Freshness</th>
                    <th className="py-2.5 px-3 text-right">Last Updated</th>
                    <th className="py-2.5 px-3 text-right">Observers</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {activeQueries.map((q) => {
                    const isStale = q.isStale();
                    const updatedStr = q.state.dataUpdatedAt
                      ? new Date(q.state.dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : 'Pending';
                    return (
                      <tr key={q.queryHash} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                        <td className="py-2.5 px-4 font-mono font-medium text-stone-900 dark:text-stone-100">
                          {JSON.stringify(q.queryKey)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          <span className={
                            q.state.status === 'success'
                              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                              : q.state.status === 'error'
                              ? 'text-rose-700 dark:text-rose-400 font-semibold'
                              : 'text-amber-700 dark:text-amber-400'
                          }>
                            {q.state.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {isStale ? 'Stale (Next Mount Revalidates)' : 'Fresh (In-Memory Cache)'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-500">
                          {updatedStr}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {q.getObserversCount()}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => queryClient.invalidateQueries({ queryKey: q.queryKey })}
                            className="text-xs font-medium text-stone-700 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 cursor-pointer"
                          >
                            Invalidate
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {activeQueries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-stone-400 text-xs">
                        No live queries populated yet. Weather or Supabase queries register automatically upon first access.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Configured Cache Policies */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { key: "['supabase', 'rooms']", desc: 'Room Catalog & Inventory Units (Batched)', staleTime: '5 mins', revalidate: 'Background' },
              { key: "['supabase', 'config']", desc: 'Hotel CMS & Rates Configuration', staleTime: '10 mins', revalidate: 'Background' },
              { key: "['supabase', 'bookings']", desc: 'Reservations & Guest Codes', staleTime: '2 mins', revalidate: 'On Mutation' },
              { key: "['supabase', 'reviews']", desc: 'Guest Testimonials & Approvals', staleTime: '15 mins', revalidate: 'Background' },
              { key: "['weather', 'kathmandu']", desc: 'Satellite Meteo Feed (lat 27.71)', staleTime: '5 mins (SWR)', revalidate: 'Background' },
              { key: "['smtp', 'test_connection']", desc: 'Mail Gateway Handshake', staleTime: 'On Demand', revalidate: 'Manual' },
            ].map((cachePolicy, idx) => (
              <div
                key={idx}
                className="p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2 shadow-xs text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-amber-800 dark:text-amber-300 text-[11px] truncate">
                    {cachePolicy.key}
                  </span>
                  <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
                    Active
                  </span>
                </div>
                <p className="text-stone-600 dark:text-stone-400 text-[11px]">
                  {cachePolicy.desc}
                </p>
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 font-mono tabular-nums">
                  <span>TTL: {cachePolicy.staleTime}</span>
                  <span>{cachePolicy.revalidate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
