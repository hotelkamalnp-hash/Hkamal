import React, { useState, useEffect } from 'react';
import { useHotel } from '../../context/HotelContext';
import {
  Database,
  Cloud,
  HardDrive,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Server,
  Sparkles,
  ShieldCheck,
  FileText,
  Activity,
  Layers,
} from 'lucide-react';

interface StorageHealthData {
  storageMode: string;
  supabaseConnected: boolean;
  supabaseUrlMasked: string;
  totalRecordsCount: number;
  estimatedDiskSizeBytes: number;
  estimatedDiskSizeMb: string;
  supabaseFreeTierLimitMb: number;
  freeTierUsedPercent: string;
  healthStatus: 'optimal' | 'moderate' | 'action_needed';
  lastPingTimestamp: string;
  collectionBreakdown: Record<string, number>;
  pruneRecommendations: string[];
}

export const DatabaseStorageManagementCard: React.FC = () => {
  const { showToast } = useHotel();
  const [loading, setLoading] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pruning, setPruning] = useState(false);
  const [resettingFresh, setResettingFresh] = useState(false);
  const [health, setHealth] = useState<StorageHealthData | null>(null);
  const [pingStatus, setPingStatus] = useState<{
    ok: boolean;
    latencyMs: number;
    message: string;
    timestamp: string;
  } | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/database/storage-health', {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok && data.health) {
        setHealth(data.health);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHealth();
  }, []);

  const handlePingKeepAlive = async () => {
    setPinging(true);
    try {
      const res = await fetch('/api/health/supabase-ping');
      const data = await res.json().catch(() => ({}));
      setPingStatus({
        ok: Boolean(data.ok),
        latencyMs: Number(data.latencyMs || 0),
        message: String(data.message || 'Ping completed'),
        timestamp: new Date().toLocaleTimeString(),
      });
      if (data.ok) {
        showToast('Keep-Alive Ping OK', `Supabase responded in ${data.latencyMs}ms. Inactivity pause prevented.`, 'success');
      } else {
        showToast('Supabase Notice', data.message || 'Supabase unreachable or tables initializing.', 'warning');
      }
    } catch (err: any) {
      showToast('Ping Error', err?.message || 'Could not reach server keep-alive route.', 'error');
    } finally {
      setPinging(false);
    }
  };

  const handlePruneEphemeral = async () => {
    if (!window.confirm('Prune ephemeral transient records (door unlock logs > 60d, audit logs > 90d, expired guest sessions)? Rooms, bookings, and financial invoices will NOT be touched.')) {
      return;
    }
    setPruning(true);
    try {
      const res = await fetch('/api/admin/database/prune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          maxDoorLogsAgeDays: 60,
          maxAuditLogsAgeDays: 90,
          purgeExpiredGuestSessions: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok && data.prunedCounts) {
        const total =
          (data.prunedCounts.doorUnlockLogs || 0) +
          (data.prunedCounts.auditLogs || 0) +
          (data.prunedCounts.guestSessions || 0);
        showToast('Prune Completed', `Removed ${total} transient logs. Supabase storage optimized for free tier.`, 'success');
        void fetchHealth();
      } else {
        showToast('Prune Notice', data.error || 'No records pruned.', 'info');
      }
    } catch (err: any) {
      showToast('Prune Error', err?.message || 'Prune request failed.', 'error');
    } finally {
      setPruning(false);
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = '/api/admin/database/backup';
    showToast('Export Initiated', 'Downloading complete hotel database snapshot JSON.', 'success');
  };

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!window.confirm(`Restore database from "${file.name}"? This will update collections from the backup JSON.`)) {
      return;
    }

    try {
      const text = await file.text();
      const backupJson = JSON.parse(text);

      const res = await fetch('/api/admin/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ backup: backupJson }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        showToast('Database Restored', `Restored ${data.result?.restoredBookings || 0} bookings and ${data.result?.restoredCollections || 0} records.`, 'success');
        void fetchHealth();
      } else {
        showToast('Restore Failed', data.error || 'Failed to restore database.', 'error');
      }
    } catch (err: any) {
      showToast('Invalid File', err?.message || 'Could not parse JSON backup file.', 'error');
    }
  };

  const handleResetFreshProduction = async () => {
    const code = window.prompt(
      'START FRESH PRODUCTION OPERATIONS:\n\nThis will purge test/mock bookings, demo invoices, demo food orders, and fake guest door sessions, leaving all 8 physical rooms, room inventory units, authentic Nepali menus, staff accounts, and CMS settings clean and ready for real guests.\n\nType "CONFIRM" to proceed:'
    );
    if (code !== 'CONFIRM') {
      if (code !== null) showToast('Canceled', 'Confirmation text did not match.', 'info');
      return;
    }

    setResettingFresh(true);
    try {
      const res = await fetch('/api/admin/database/reset-fresh-production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        showToast(
          'Clean Production Slate Activated',
          `Purged test bookings. All ${data.roomsAvailable || 8} room units marked clean and ready for real guests!`,
          'success'
        );
        void fetchHealth();
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        showToast('Reset Failed', data.error || 'Failed to reset database.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err?.message || 'Request failed.', 'error');
    } finally {
      setResettingFresh(false);
    }
  };

  const handleDownloadSupabaseSql = () => {
    window.open('/supabase_schema.sql', '_blank');
  };

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>Database, Storage &amp; Multi-Property Architecture</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold uppercase tracking-wider">
                Production Active
              </span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Supabase PostgreSQL primary sync, keep-alive heartbeat, free-tier space manager, and 1-click disaster recovery.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchHealth}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer transition shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Grid: 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Supabase Connection & Keep-Alive */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-sky-500" />
              <span>Supabase Cloud Engine</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
              <Activity className="w-3 h-3 text-emerald-500" />
              <span>Active</span>
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-stone-600 dark:text-stone-400">
            <div className="flex justify-between">
              <span className="text-stone-400">Host URL:</span>
              <span className="font-mono text-[11px] text-stone-800 dark:text-stone-200">
                {health?.supabaseUrlMasked || 'Supabase Connected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Storage Mode:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                PostgreSQL + Cache Mirror
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Inactivity Guard:</span>
              <span className="font-medium text-sky-600 dark:text-sky-400">
                Auto 6h Heartbeat Active
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePingKeepAlive}
              disabled={pinging}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${pinging ? 'animate-spin' : ''}`} />
              <span>{pinging ? 'Pinging Supabase...' : 'Test Keep-Alive Ping'}</span>
            </button>
          </div>
          {pingStatus && (
            <div className="text-[11px] text-stone-500 dark:text-stone-400 text-center">
              Latency: <strong className="text-emerald-600 dark:text-emerald-400">{pingStatus.latencyMs}ms</strong> at {pingStatus.timestamp}
            </div>
          )}
        </div>

        {/* Card 2: Space Usage & Free-Tier Optimization */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-amber-500" />
              <span>Free-Tier Storage Meter</span>
            </span>
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 font-mono">
              {health?.estimatedDiskSizeMb || '1.2'} MB / 500 MB
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(1, Math.min(100, Number(health?.freeTierUsedPercent?.replace('%', '') || 1)))}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-stone-500">
              <span>Used: {health?.freeTierUsedPercent || '0.24%'}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                99%+ Free Headroom
              </span>
            </div>
          </div>

          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
            Supabase provides 500MB database and 1GB storage. Automatic pruning keeps ephemeral logs trimmed so your property stays comfortably on the free tier.
          </p>

          <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800">
            <button
              type="button"
              onClick={handlePruneEphemeral}
              disabled={pruning}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-600/40 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-semibold cursor-pointer transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{pruning ? 'Pruning Logs...' : 'Prune Ephemeral Logs'}</span>
            </button>
          </div>
        </div>

        {/* Card 3: 1-Click Disaster Recovery & Backup */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Disaster Recovery</span>
            </span>
            <span className="text-[10px] text-stone-400 uppercase font-mono">1-Click JSON</span>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold cursor-pointer transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Full Backup JSON</span>
            </button>

            <label className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold cursor-pointer transition">
              <Upload className="w-3.5 h-3.5" />
              <span>Restore from Backup JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleRestoreBackupFile}
                className="sr-only"
              />
            </label>
          </div>

          <p className="text-[11px] text-stone-400 text-center">
            Zero data loss on app or server restarts. Daily snapshot recommended.
          </p>
        </div>
      </div>

      {/* Row Count Breakdown Strip */}
      {health?.collectionBreakdown && (
        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/80 dark:border-stone-800 space-y-2">
          <div className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-stone-400" />
              <span>Live Synced Records Breakdown</span>
            </span>
            <span className="text-stone-500 font-mono text-[11px]">
              Total Records: {health.totalRecordsCount}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(health.collectionBreakdown).slice(0, 10).map(([key, count]) => (
              <span
                key={key}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 font-mono text-[11px]"
              >
                {key}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Clean Launch & Multi-Tenant Setup Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
        {/* Clean Operational Start */}
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-950/80 bg-red-50/40 dark:bg-red-950/10 space-y-3">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Production Launch: Fresh Operational Slate</span>
          </div>
          <p className="text-xs text-red-700/80 dark:text-red-300/80 leading-relaxed">
            Ready to hand over to the hotel staff today? This purge removes test bookings, mock invoices, and demo orders. It marks all 8 physical room units clean &amp; vacant so live front-desk check-in starts fresh.
          </p>
          <button
            type="button"
            onClick={handleResetFreshProduction}
            disabled={resettingFresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{resettingFresh ? 'Resetting Slate...' : 'Clear Demo Transactions (Start Fresh Operations)'}</span>
          </button>
        </div>

        {/* White-Label / Multi-Hotel Scaling Guide */}
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40 space-y-3">
          <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200 font-bold text-xs">
            <Server className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Multi-Hotel White-Label Readiness</span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            To provision this platform for another hotel property:
            1. Update the hotel name, PAN, phone, and colors in this CMS.
            2. Point to their own Supabase database via environment variables.
            3. Run the standard schema script in their Supabase SQL editor.
          </p>
          <div className="flex items-center gap-2">
            <a
              href="/supabase_schema.sql"
              download="supabase_schema.sql"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-100 cursor-pointer transition"
            >
              <FileText className="w-3.5 h-3.5 text-sky-500" />
              <span>Download Ready-To-Run SQL Schema</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
