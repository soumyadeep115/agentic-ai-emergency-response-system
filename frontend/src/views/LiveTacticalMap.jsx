import React, { useState, useEffect, useRef, useCallback } from 'react';
import LeafletMap from '../components/LeafletMap.jsx';
import {
  postDispatchTrigger,
  getMapState,
  createDispatchStream,
  NODE_COORDS,
  parseRouteNodes,
  parseHospitalId,
  buildDispatchAgentEvents,
  DEFAULT_EMS_STATIONS,
} from '../services/api.js';
import { buildRouteGeometries } from '../services/osrm.js';

// ─────────────────────────────────────────────────────────────────────────────
// Default map state — derived from NODE_COORDS, no mock data
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_MAP_STATE = {
  ems_stations: DEFAULT_EMS_STATIONS,
  crash_sites:  [],
  hospital:     null,
  routes:       [],
};

const TYPE_COLOR = { info: '#58a6ff', warn: '#d29922', ok: '#3fb950', done: '#39d3c3' };

// ─────────────────────────────────────────────────────────────────────────────
// TelemetryPanel — shows null/offline state when no WebSocket data yet
// ─────────────────────────────────────────────────────────────────────────────
function TelemetryPanel({ telem, simActive }) {
  if (!telem) {
    return (
      <div className="panel flex flex-col flex-shrink-0">
        <div className="panel-header">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span className="label-xs">MPU-6050 Telemetry</span>
          <span className="ml-auto text-[9px] font-mono text-muted">OFFLINE</span>
        </div>
        <div className="p-4 flex flex-col items-center gap-2">
          <span className="dot-muted"></span>
          <div className="text-[10px] font-mono text-muted text-center leading-relaxed">
            Awaiting MPU-6050 sensor feed<br/>via WS /api/v1/dispatch/stream
          </div>
        </div>
      </div>
    );
  }
  const spike = telem.gForceX > 2.0;
  const rows = [
    { label: 'Node ID',     val: telem.nodeId,                                  color: 'text-secondary' },
    { label: 'Location',    val: telem.location,                                 color: 'text-secondary' },
    { label: 'Status',      val: telem.status,                                   color: spike ? 'text-accent-red' : 'text-accent-green', bold: spike },
    { label: 'G-Force X',   val: `${Number(telem.gForceX).toFixed(2)} g`,      color: spike ? 'text-accent-red' : 'text-primary', bold: spike },
    { label: 'G-Force Y',   val: `${Number(telem.gForceY).toFixed(2)} g`,      color: 'text-primary' },
    { label: 'G-Force Z',   val: `${Number(telem.gForceZ).toFixed(2)} g`,      color: 'text-primary' },
    { label: 'Roll Angle',  val: `${Number(telem.rollDeg).toFixed(1)}°`,       color: spike ? 'text-accent-orange' : 'text-primary' },
    { label: 'Pitch Angle', val: `${Number(telem.pitchDeg).toFixed(1)}°`,      color: 'text-primary' },
    { label: 'Temp',        val: `${Number(telem.tempC).toFixed(1)} °C`,       color: 'text-primary' },
    { label: 'Timestamp',   val: String(telem.timestamp).slice(0, 22) + 'Z',   color: 'text-muted' },
  ];
  return (
    <div className="panel flex flex-col flex-shrink-0">
      <div className="panel-header">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <span className="label-xs">MPU-6050 Telemetry</span>
        {spike && <span className="ml-auto badge-critical animate-pulse-slow">SPIKE</span>}
      </div>
      <div className="overflow-y-auto">
        {rows.map(({ label, val, color, bold }) => (
          <div key={label} className="telem-row">
            <span className="label-xs">{label}</span>
            <span className={`font-mono text-[11px] tabular-nums ${color} ${bold ? 'font-bold' : ''}`}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AgentStream
// ─────────────────────────────────────────────────────────────────────────────
function AgentStream({ events, wsStatus, simActive }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [events]);

  const [dotCls, textCls, label] = wsStatus === 'open'
    ? ['dot-green animate-pulse', 'text-accent-green', 'WS LIVE']
    : wsStatus === 'connecting'
    ? ['dot-amber animate-pulse', 'text-accent-amber', 'CONNECTING']
    : simActive
    ? ['dot-red animate-pulse', 'text-accent-red', 'SIMULATING']
    : ['dot-muted', 'text-muted', 'CACHED'];

  return (
    <div className="panel flex flex-col" style={{ height: '280px', maxHeight: '280px' }}>
      <div className="panel-header">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
        <span className="label-xs">Agent Negotiation Stream</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className={dotCls}></span>
          <span className={`text-[9px] font-mono ${textCls}`}>{label}</span>
        </div>
      </div>
      <div className="overflow-y-auto p-2 bg-base/30 space-y-1" style={{ flex: '1 1 0', minHeight: 0 }}>
        {events.map((ev, i) => (
          <div key={i} className="font-mono p-1.5 rounded bg-[#0d1117]/40 border border-[#21262d]/30 shrink-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[9px] text-muted tabular-nums shrink-0">[{ev.ts}]</span>
              <span className="text-[10px] font-bold truncate" style={{ color: TYPE_COLOR[ev.type] ?? '#8b949e' }}>{ev.agent}</span>
            </div>
            <div className="text-[11px] leading-snug text-[#c9d1d9] break-words">&gt;&gt; {ev.msg}</div>
          </div>
        ))}
        {simActive && (
          <div className="font-mono p-1.5 rounded bg-[#0d1117]/40 border border-[#21262d]/30 shrink-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[9px] text-muted tabular-nums">[...]</span>
              <span className="text-[10px] font-bold text-accent-green">SYSTEM</span>
            </div>
            <div className="text-[11px] text-[#c9d1d9]">&gt;&gt; <span className="animate-blink">█</span></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SimulatorPanel
// ─────────────────────────────────────────────────────────────────────────────
function SimulatorPanel({ onSimulate, simActive, lastResult, routeSource }) {
  return (
    <div className="absolute bottom-4 right-4 panel shadow-2xl z-[500]" style={{ width: '272px' }}>
      <div className="panel-header">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span className="label-xs">Simulator Utility</span>
        <span className="ml-auto text-[9px] font-mono text-muted">DEV CTRL</span>
      </div>
      <div className="p-3 space-y-2.5">
        <p className="text-[10px] text-secondary font-mono leading-snug">
          Fires <span className="text-accent-blue">POST /dispatch</span> — triggers full LangGraph pipeline + OSRM road routing.
        </p>
        <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono bg-base/60 border border-border rounded-[3px] p-2">
          {[
            ['incident_type', 'road_accident'],
            ['casualties', '3'],
            ['incident_location', 'Incident_B'],
            ['severity', '→ AUTO'],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <span className="text-muted uppercase">{k}</span>
              <span className="text-accent-cyan">{v}</span>
            </div>
          ))}
        </div>

        {lastResult && (
          <div className={`text-[9px] font-mono px-2 py-1 rounded-[2px] border ${
            lastResult.ok
              ? 'text-accent-green bg-green-500/5 border-green-500/20'
              : 'text-accent-orange bg-orange-500/5 border-orange-500/20'
          }`}>
            {lastResult.ok ? `✓ Dispatch via API · route=${routeSource ?? '—'}` : `⚠ ${lastResult.msg} (mock fallback)`}
          </div>
        )}

        <button
          id="btn-simulate-crash"
          onClick={onSimulate}
          disabled={simActive}
          className={`w-full btn-danger ${simActive ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {simActive ? '⚡ SIMULATING...' : '⚡ SIMULATE CRASH EVENT'}
        </button>

        {simActive && (
          <div className="text-[9px] font-mono text-accent-orange animate-pulse-slow text-center">
            POST /dispatch → OSRM road geometry…
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────
export default function LiveTacticalMap() {
  const [simActive,    setSimActive]    = useState(false);
  const [lastResult,   setLastResult]   = useState(null);
  const [routeSource,  setRouteSource]  = useState(null);
  const [streamEvents, setStreamEvents] = useState([]);
  const [telem,        setTelem]        = useState(null);
  const [wsStatus,     setWsStatus]     = useState('closed');
  const [mapState,     setMapState]     = useState(DEFAULT_MAP_STATE);
  const [liveRoutes,   setLiveRoutes]   = useState([]);
  const [simCrash,     setSimCrash]     = useState(null);

  // Fetch initial map state (falls back to DEFAULT_MAP_STATE if backend offline)
  useEffect(() => {
    getMapState().then(({ data }) => {
      if (data) setMapState(data);
    });
  }, []);

  // WebSocket live stream
  useEffect(() => {
    return createDispatchStream(
      (ev)  => setStreamEvents(prev => [...prev.slice(-49), ev]),
      (tel) => setTelem(tel),
      (st)  => setWsStatus(st),
    );
  }, []);

  // ── Simulate handler: POST /dispatch → parse EmergencyState → OSRM routes ──
  const handleSimulate = useCallback(async () => {
    if (simActive) return;
    setSimActive(true);
    setStreamEvents([]);
    setLastResult(null);
    setLiveRoutes([]);

    // Immediately mark crash on map
    const simIncidentNode = 'Incident_B';
    const crashCoords = NODE_COORDS[simIncidentNode] ?? { lat: 19.1100, lng: 72.9280 };
    setSimCrash({
      id: 'CS-SIM', label: 'CRASH · SIM', sub: 'Incident_B · EEH Vikhroli',
      ...crashCoords, active: true, sim: true,
    });

    // Update telemetry (no TELEMETRY_INITIAL — all live values)
    setTelem({
      nodeId:    'MPU-6050-NODE-B3',
      location:  'EEH · km 15.4 (Incident_B)',
      status:    'IMPACT_DETECTED',
      gForceX:   3.71,
      gForceY:   0.08,
      gForceZ:   9.81,
      rollDeg:   62.4,
      pitchDeg:  14.2,
      tempC:     41.3,
      timestamp: new Date().toISOString(),
    });

    // POST to real backend: POST /dispatch
    const { data: dispatchResult, error } = await postDispatchTrigger({
      incident_type:     'road_accident',
      casualties:        3,
      incident_location: simIncidentNode,     // must match a node in traffic_edges
    });

    if (dispatchResult && !error) {
      // ── Parse EmergencyState response (field names from graph/state.py) ──
      setLastResult({ ok: true, msg: 'API dispatch successful' });

      // Build agent stream from real response fields
      const agentEvents = buildDispatchAgentEvents({
        ...dispatchResult,
        incident_type: 'road_accident',
        casualties: 3,
      });
      setStreamEvents(agentEvents);

      // Parse selected_route to extract node sequence
      // Format: "Ambulance_Station -> Incident_B -> Fortis_Mulund (12 min)"
      const parsed = parseRouteNodes(dispatchResult.selected_route);
      const hospitalId = parseHospitalId(dispatchResult.selected_hospital);

      if (parsed?.nodes?.length >= 2) {
        // Map node IDs to lat/lng waypoints
        const waypoints = parsed.nodes
          .map(nodeId => NODE_COORDS[nodeId])
          .filter(Boolean);

        if (waypoints.length >= 2) {
          // Fetch real OSRM road-network geometry
          const routeDefs = [{
            id: 'RT-DISPATCH',
            label: `Route · ${parsed.nodes.join(' → ')} · ${parsed.minutes} min`,
            color: '#39d3c3',
            waypoints,
          }];

          const enrichedRoutes = await buildRouteGeometries(routeDefs);
          setLiveRoutes(enrichedRoutes);
          setRouteSource(enrichedRoutes[0]?.source ?? 'fallback');
        }
      }

      // Update hospital marker to the dispatched one
      if (hospitalId && NODE_COORDS[hospitalId]) {
        setMapState(prev => ({
          ...prev,
          hospital: { id: hospitalId, ...NODE_COORDS[hospitalId] },
        }));
      }

      setTimeout(() => { setSimActive(false); setSimCrash(null); }, 3500);

    } else {
      // Backend offline → OSRM fallback route only (no mock stream events)
      setLastResult({ ok: false, msg: error ?? 'Offline' });
      setTimeout(() => { setSimActive(false); setSimCrash(null); }, 3500);
      // Still fetch OSRM geometry with known coords
      const waypoints = [NODE_COORDS.Ambulance_Station, crashCoords, NODE_COORDS.Fortis_Mulund];
      const enriched = await buildRouteGeometries([{
        id: 'RT-FALLBACK', label: 'Route (backend offline)', color: '#d29922', waypoints,
      }]);
      setLiveRoutes(enriched);
      setRouteSource(enriched[0]?.source ?? 'fallback');
    }
  }, [simActive]);

  // Merge static routes + any live OSRM routes
  const activeRoutes = liveRoutes.length > 0 ? liveRoutes : mapState.routes ?? [];
  const crashSites = [...(mapState.crash_sites ?? []), ...(simCrash ? [simCrash] : [])];

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left: Telemetry + Stream */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-border overflow-hidden">
        <TelemetryPanel telem={telem} simActive={simActive} />
        <div className="flex-1 flex flex-col min-h-0 border-t border-border">
          <AgentStream events={streamEvents} wsStatus={wsStatus} simActive={simActive} />
        </div>
      </div>

      {/* Right: Leaflet Map */}
      <div className="flex-1 relative overflow-hidden">
        <LeafletMap
          emsStations={mapState.ems_stations ?? []}
          crashSites={crashSites}
          hospital={mapState.hospital ?? null}
          routes={activeRoutes}
        />

        {/* Overlay pills */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-[499] pointer-events-none">
          <div className="bg-panel/90 border border-border rounded-[3px] px-3 py-1.5 flex items-center gap-2">
            <span className="dot-red animate-pulse"></span>
            <span className="text-[10px] font-mono text-primary font-semibold tracking-wide">TACTICAL OVERLAY · LIVE</span>
          </div>
          {liveRoutes.length > 0 && (
            <div className="bg-panel/90 border border-border rounded-[3px] px-3 py-1.5">
              <span className={`text-[9px] font-mono ${liveRoutes[0]?.source === 'osrm' ? 'text-accent-cyan' : 'text-accent-orange'}`}>
                {liveRoutes[0]?.source === 'osrm' ? '✓ OSRM road network' : '⚠ straight-line fallback'}
              </span>
            </div>
          )}
        </div>

        <SimulatorPanel
          onSimulate={handleSimulate}
          simActive={simActive}
          lastResult={lastResult}
          routeSource={routeSource}
        />
      </div>
    </div>
  );
}
