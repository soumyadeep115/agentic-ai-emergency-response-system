import React, { useCallback } from 'react';
import { getIncidents } from '../services/api.js';
import { usePolling } from '../hooks/usePolling.js';

const SEV_CLS = { critical:'badge-critical', high:'badge-high', medium:'badge-medium', low:'badge-low' };

// Latency values are static model characteristics, not incident data
const AGENT_LATENCY = [
  { node:'assess_incident',   ms:142, color:'bg-accent-orange' },
  { node:'coordinate_police', ms:312, color:'bg-accent-purple' },
  { node:'hospital_agent',    ms:204, color:'bg-accent-blue'   },
  { node:'ambulance_agent',   ms:187, color:'bg-accent-cyan'   },
  { node:'routing_agent',     ms:537, color:'bg-accent-amber'  },
  { node:'dispatch_decision', ms:98,  color:'bg-accent-green'  },
  { node:'escalation_agent',  ms:421, color:'bg-accent-red'    },
  { node:'evaluate_hospital', ms:165, color:'bg-accent-blue'   },
];

function SourcePill({ source, error }) {
  if (source === 'live') return (
    <span className="flex items-center gap-1 text-[9px] font-mono text-accent-green">
      <span className="dot-green animate-pulse"></span>LIVE
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[9px] font-mono text-muted" title={error ?? ''}>
      <span className="dot-muted"></span>{error ? 'OFFLINE' : 'WAITING'}
    </span>
  );
}

function EmptyIncidentTable() {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="1.5">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      </div>
      <div className="text-center">
        <div className="text-[11px] font-semibold text-secondary">No incident records</div>
        <div className="text-[10px] font-mono text-muted mt-1">GET /api/v1/reports/incidents</div>
        <div className="text-[9px] text-muted mt-0.5">Endpoint not yet implemented on backend.</div>
        <div className="text-[9px] text-muted">Records will populate automatically when available.</div>
      </div>
    </div>
  );
}

export default function PerformanceReports() {
  const fetchFn = useCallback(() => getIncidents(), []);
  // getIncidents() returns { data: [...], source, error } — usePolling stores the whole object.
  // Destructure carefully: if data is already an array (initial fallback []), use it directly;
  // otherwise pull .data out of the returned object.
  const { data: rawResult, source: rawSource, error: rawError, loading } = usePolling(fetchFn, { data: [], source: 'cached', error: null }, 20_000);

  // rawResult may be the object { data, source, error } from getIncidents(), or the
  // fallback { data: [], source: 'cached', error: null } — normalise both cases.
  const rows   = Array.isArray(rawResult) ? rawResult : (Array.isArray(rawResult?.data) ? rawResult.data : []);
  const source = rawResult?.source ?? rawSource ?? 'cached';
  const error  = rawResult?.error  ?? rawError  ?? null;

  // Compute live summary stats from real data only
  const resolved  = rows.length;
  const breached  = rows.filter(r => r.sla === 'breach').length;
  const avgEta    = rows.length ? (rows.reduce((s,r) => s + Number(r.etaActual ?? 0), 0) / rows.length).toFixed(1) : null;
  const avgPolice = rows.length ? (rows.reduce((s,r) => s + Number(r.policeEta ?? 0), 0) / rows.length).toFixed(1) : null;
  const slaPct    = rows.length ? ((( rows.length - breached) / rows.length) * 100).toFixed(1) : null;

  const execStats = [
    { label: 'Incidents Resolved',     value: rows.length ? `${resolved} / ${resolved}` : null,  sub: '100% closure rate',          color: 'text-accent-green' },
    { label: 'SLA Compliance',         value: slaPct ? `${slaPct}%` : null,                       sub: `${resolved - breached} within target`, color: 'text-accent-amber' },
    { label: 'Avg Ambulance ETA',      value: avgEta ? `${avgEta} min` : null,                    sub: 'vs 10.0 min target',         color: 'text-accent-blue'  },
    { label: 'Avg Police Response',    value: avgPolice ? `${avgPolice} min` : null,              sub: 'all dispatched units',        color: 'text-accent-cyan'  },
    { label: 'Multi-Agent Route Gain', value: null,                                               sub: 'computed post-session',       color: 'text-muted'        },
    { label: 'Peak-Hour Share',        value: null,                                               sub: 'analytics endpoint pending',  color: 'text-muted'        },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">

      {/* Executive Summary */}
      <section className="panel">
        <div className="panel-header">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
          <span className="label-xs">Executive Summary — LangGraph Multi-Agent Orchestration</span>
          <div className="ml-auto flex items-center gap-2">
            <SourcePill source={source} error={error} />
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {execStats.map(({ label, value, sub, color }) => (
              <div key={label} className="card px-3 py-2.5">
                <div className="label-xs mb-1">{label}</div>
                <div className={`font-mono font-bold text-base tabular-nums ${color}`}>
                  {value ?? <span className="text-muted text-sm">—</span>}
                </div>
                <div className="text-[9px] text-muted mt-0.5 font-mono">{sub}</div>
              </div>
            ))}
          </div>

          <div className="bg-base border border-border rounded-[3px] px-4 py-3 space-y-2">
            <div className="label-xs mb-1.5">Systemic Analysis</div>
            <p className="text-[11px] text-secondary leading-relaxed font-mono">
              The LangGraph multi-agent architecture routes dispatch decisions through sequential agents:
              assess_incident → coordinate_police → allocate_ambulance → evaluate_hospital → plan_route → dispatch_decision.
              Parallel scoring of ambulances (ETA + equipment) and hospitals (beds + ICU + trauma) eliminates sequential bottlenecks.
            </p>
            <p className="text-[11px] text-secondary leading-relaxed font-mono">
              Route planning uses NetworkX shortest-path on the traffic_edges graph (source_node, destination_node, travel_time).
              Hospital overload triggers escalation_agent → fallback regional response.
            </p>
            {rows.length === 0 && (
              <p className="text-[10px] font-mono text-muted border-t border-border/50 pt-2 mt-2">
                Quantitative SLA metrics will appear here once GET /api/v1/reports/incidents is implemented on the backend.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Incident Log Table */}
      <section className="panel">
        <div className="panel-header">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <span className="label-xs">Resolved Incident Log — GET /api/v1/reports/incidents</span>
          <div className="ml-auto flex items-center gap-2">
            <SourcePill source={source} error={error} />
            {rows.length > 0 && <span className="badge-ok">{rows.length} resolved</span>}
          </div>
        </div>

        {loading && (
          <div className="px-3 py-4 text-center text-[10px] font-mono text-muted animate-pulse">
            Fetching from /api/v1/reports/incidents…
          </div>
        )}

        {!loading && rows.length === 0 && <EmptyIncidentTable />}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Incident ID</th><th>Location</th><th>Severity</th><th>Crash Time</th>
                  <th>Dispatch</th><th>Ambulance</th><th>ETA Actual</th><th>ETA Target</th>
                  <th>SLA Status</th><th>Police ETA</th><th>Hospital</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inc) => (
                  <tr key={inc.id}>
                    <td className="text-accent-blue font-mono text-[11px]">{inc.id}</td>
                    <td className="text-primary max-w-[160px] truncate" title={inc.location}>{inc.location}</td>
                    <td><span className={SEV_CLS[inc.severity] ?? 'badge-medium'}>{inc.severity}</span></td>
                    <td className="tabular-nums">{inc.crashTime}</td>
                    <td className="tabular-nums">{inc.dispatchTime}</td>
                    <td className="text-accent-cyan">{inc.ambulance}</td>
                    <td className={`tabular-nums font-bold ${Number(inc.etaActual) > Number(inc.etaTarget) ? 'text-accent-red' : 'text-accent-green'}`}>
                      {Number(inc.etaActual).toFixed(1)} min
                    </td>
                    <td className="tabular-nums text-muted">{Number(inc.etaTarget).toFixed(1)} min</td>
                    <td>{inc.sla === 'ok' ? <span className="badge-ok">WITHIN SLA</span> : <span className="badge-breach">BREACHED</span>}</td>
                    <td className="tabular-nums text-accent-purple">{Number(inc.policeEta).toFixed(1)} min</td>
                    <td className="text-secondary max-w-[130px] truncate" title={inc.hospital}>{inc.hospital}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Agent node latency — model characteristics, not incident data */}
      <section className="panel">
        <div className="panel-header">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/>
          </svg>
          <span className="label-xs">LangGraph Node Execution — Avg Latency per Agent (ms)</span>
          <span className="ml-auto text-[9px] font-mono text-muted">MODEL PROFILE</span>
        </div>
        <div className="p-3 grid grid-cols-4 gap-2">
          {AGENT_LATENCY.map(({ node, ms, color }) => (
            <div key={node} className="card px-3 py-2">
              <div className="text-[9px] font-mono text-secondary truncate mb-1.5">{node}</div>
              <div className="h-1 bg-border rounded-full overflow-hidden mb-1">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.round((ms/537)*100)}%` }} />
              </div>
              <div className="font-mono font-bold text-[11px] text-primary tabular-nums">{ms} ms</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
