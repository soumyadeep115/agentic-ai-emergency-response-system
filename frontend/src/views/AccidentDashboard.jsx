import React, { useCallback } from 'react';
import { getHotspots } from '../services/api.js';
import { usePolling } from '../hooks/usePolling.js';

const SEV_MAP = {
  critical: { cls: 'badge-critical', bar: 'bg-accent-red',    pct: '100%' },
  high:     { cls: 'badge-high',     bar: 'bg-accent-orange', pct: '65%'  },
  medium:   { cls: 'badge-medium',   bar: 'bg-yellow-400',    pct: '40%'  },
  low:      { cls: 'badge-low',      bar: 'bg-accent-blue',   pct: '22%'  },
};

function SourcePill({ source, error }) {
  if (source === 'live') return (
    <span className="ml-auto flex items-center gap-1 text-[9px] font-mono text-accent-green">
      <span className="dot-green animate-pulse"></span>LIVE
    </span>
  );
  return (
    <span className="ml-auto flex items-center gap-1 text-[9px] font-mono text-muted" title={error ?? ''}>
      <span className="dot-muted"></span>{error ? 'OFFLINE' : 'WAITING'}
    </span>
  );
}

function MetricCard({ label, value, sub, accent, icon }) {
  return (
    <div className="card px-4 py-3 flex flex-col gap-1 relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-[2px] ${accent}`} />
      <div className="flex items-start justify-between">
        <span className="label-xs">{label}</span>
        <span className="text-muted">{icon}</span>
      </div>
      <div className="font-mono font-bold text-xl text-primary tabular-nums leading-tight mt-0.5">
        {value ?? <span className="text-muted text-sm">—</span>}
      </div>
      {sub && <div className="text-[10px] text-secondary font-mono">{sub}</div>}
    </div>
  );
}

function EmptyState({ endpoint }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div className="text-center">
        <div className="text-[11px] font-semibold text-secondary">Awaiting backend data</div>
        <div className="text-[10px] font-mono text-muted mt-1">{endpoint}</div>
        <div className="text-[9px] text-muted mt-0.5">Start FastAPI: uvicorn api:app --reload</div>
      </div>
    </div>
  );
}

export default function AccidentDashboard() {
  const fetchFn = useCallback(() => getHotspots(), []);
  // Initial state: empty — no mock data
  const { data, source, error, loading } = usePolling(
    fetchFn,
    { zones: [], metrics: null },
    15_000,
  );

  const zones   = data?.zones   ?? [];
  const metrics = data?.metrics ?? null;

  const metricCards = [
    { label: 'Highest Accident Zone', value: metrics?.highest_zone ?? metrics?.highestZone,           sub: 'Primary risk corridor',           accent: 'bg-accent-red',    icon: '⚠' },
    { label: 'Critical Time Window',  value: metrics?.critical_window ?? metrics?.criticalWindow,     sub: 'Peak incident window (IST)',       accent: 'bg-accent-orange', icon: '⏱' },
    { label: 'Total 24H Crashes',     value: metrics?.crashes_24h ?? metrics?.crashes24h,             sub: `${metrics?.active_incidents ?? metrics?.activeIncidents ?? '—'} active`, accent: 'bg-accent-amber',  icon: '🚨' },
    { label: 'Avg Response Time',     value: metrics?.avg_response_min != null ? `${metrics.avg_response_min} min` : null, sub: 'Target: ≤10.0 min', accent: 'bg-accent-green',  icon: '⚡' },
    { label: 'SLA Compliance',        value: metrics?.sla_compliance_pct != null ? `${metrics.sla_compliance_pct}%` : null, sub: 'Incidents within SLA', accent: 'bg-accent-blue', icon: '✓' },
    { label: 'Units Deployed',        value: metrics?.units_deployed ?? metrics?.unitsDeployed,       sub: 'Active EMS/Police units',          accent: 'bg-accent-purple', icon: '🚑' },
  ];

  const isReady = !loading && zones.length > 0;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">

      {/* Metric Grid */}
      <section>
        <div className="flex items-center mb-2">
          <span className="label-xs">24-Hour Command Metrics</span>
          <SourcePill source={source} error={error} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {metricCards.map(c => <MetricCard key={c.label} {...c} />)}
        </div>
      </section>

      {/* Hotspot rankings */}
      <section className="panel">
        <div className="panel-header">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span className="label-xs">Top Critical Accident Locations</span>
          <SourcePill source={source} error={error} />
        </div>

        {loading && (
          <div className="px-3 py-6 text-center">
            <div className="text-[10px] font-mono text-muted animate-pulse">Polling GET /api/v1/analytics/hotspots…</div>
          </div>
        )}

        {!loading && zones.length === 0 && (
          <EmptyState endpoint="GET /api/v1/analytics/hotspots" />
        )}

        {isReady && (
          <div className="divide-y divide-border/50">
            {zones.map((zone, idx) => {
              const sev = SEV_MAP[zone.severity] ?? SEV_MAP.medium;
              const rank = zone.rank ?? idx + 1;
              return (
                <div key={zone.id ?? idx} className="flex items-center gap-3 px-3 py-2.5 hover:bg-card/50 transition-colors">
                  <div className="w-5 font-mono text-[10px] text-muted font-bold shrink-0">{String(rank).padStart(2,'0')}</div>
                  <div className="w-1 h-8 rounded-full bg-border shrink-0 relative overflow-hidden">
                    <div className={`absolute bottom-0 inset-x-0 ${sev.bar} rounded-full`} style={{ height: sev.pct }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary truncate">{zone.name}</span>
                      <span className={sev.cls}>{zone.severity}</span>
                    </div>
                    <div className="text-[10px] font-mono text-muted truncate">{zone.highway ?? zone.location}</div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <div className="font-mono font-bold text-sm text-primary tabular-nums">{zone.crashes_24h ?? zone.crashes24h ?? '—'}</div>
                      <div className="text-[9px] text-muted">crashes</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] text-secondary">{zone.peak_hour ?? zone.peakHour ?? '—'}</div>
                      <div className="text-[9px] text-muted">peak</div>
                    </div>
                    <div className="text-[9px] font-mono text-muted w-16">{zone.id}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Offline notice */}
      {source === 'offline' && !loading && (
        <div className="panel px-4 py-3 flex items-start gap-3 border-accent-orange/30 bg-orange-500/5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d29922" strokeWidth="2" className="mt-0.5 shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <div className="text-[11px] font-semibold text-accent-orange">Backend Offline</div>
            <div className="text-[10px] font-mono text-muted mt-0.5">
              {error} · Dashboard will auto-populate when GET /api/v1/analytics/hotspots is available.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
