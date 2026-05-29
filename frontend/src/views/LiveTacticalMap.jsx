import React, { useState, useEffect, useCallback } from 'react';
import TacticalMap from '../components/TacticalMap.jsx';
import {
  postDispatchTrigger,
  getMapState,
  NODE_COORDS,
  parseRouteNodes,
  parseHospitalId,
  DEFAULT_EMS_STATIONS,
} from '../services/api.js';
import { buildRouteGeometries } from '../services/osrm.js';

// ─────────────────────────────────────────────────────────────────────────────
// Default map state — derived from NODE_COORDS, no mock data
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_MAP_STATE = {
  ems_stations: DEFAULT_EMS_STATIONS,
  crash_sites: [],
  hospital: null,
  routes: [],
};

const TYPE_COLOR = { info: '#58a6ff', warn: '#d29922', ok: '#3fb950', done: '#39d3c3' };

// ─────────────────────────────────────────────────────────────────────────────
// Main View
// ─────────────────────────────────────────────────────────────────────────────

function IncidentControlPanel({
  incidentLat,
  setIncidentLat,
  incidentLng,
  setIncidentLng,
  locationMode,
  setLocationMode,
  onDispatch,
  simActive,
  lastResult
}) {
  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-r border-border bg-[#0d1117]">
      <div className="panel-header">
        <span className="label-xs">Incident Simulator</span>
        <span className="ml-auto text-[9px] font-mono text-accent-red">
          LIVE DISPATCH
        </span>
      </div>

      <div className="p-4 flex flex-col gap-4">

        <div className="flex gap-4">
          <label className="text-[11px] text-primary">
            <input
              type="radio"
              checked={locationMode === "manual"}
              onChange={() => setLocationMode("manual")}
            /> Coordinates
          </label>

          <label className="text-[11px] text-primary">
            <input
              type="radio"
              checked={locationMode === "map"}
              onChange={() => setLocationMode("map")}
            /> Pick Map
          </label>
        </div>

        {locationMode === "manual" && (
          <>
            <input
              value={incidentLat}
              onChange={(e) => setIncidentLat(e.target.value)}
              placeholder="Latitude"
              className="bg-[#161b22] border border-[#30363d] p-2 text-[11px]"
            />

            <input
              value={incidentLng}
              onChange={(e) => setIncidentLng(e.target.value)}
              placeholder="Longitude"
              className="bg-[#161b22] border border-[#30363d] p-2 text-[11px]"
            />
          </>
        )}

        {locationMode === "map" && (
          <div className="text-[10px] font-mono text-accent-cyan">
            Click tactical map to select incident
          </div>
        )}

        <div className="text-[10px] font-mono text-secondary">
          Selected: {incidentLat || "--"}, {incidentLng || "--"}
        </div>

        {lastResult && (
          <div className="text-[10px] font-mono text-accent-green">
            {lastResult.msg}
          </div>
        )}

        <button
          onClick={onDispatch}
          disabled={simActive}
          className="btn-danger"
        >
          {simActive ? "DISPATCHING..." : "DISPATCH INCIDENT"}
        </button>
      </div>
    </div>
  );
}

export default function LiveTacticalMap() {
  const [simActive, setSimActive] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [routeSource, setRouteSource] = useState(null);
  const [mapState, setMapState] = useState(DEFAULT_MAP_STATE);
  const [liveRoutes, setLiveRoutes] = useState([]);
  const [simCrash, setSimCrash] = useState(null);
  const [incidentLat, setIncidentLat] = useState("");
  const [incidentLng, setIncidentLng] = useState("");
  const [locationMode, setLocationMode] = useState("manual");

  // Fetch initial map state
  useEffect(() => {
    getMapState().then(({ data }) => {
      if (data) setMapState(data);
    });
  }, []);



  // ── Simulate handler ──────────────────────────────────────────────────────
  const handleSimulate = useCallback(async () => {
    if (simActive) return;
    setSimActive(true);
    setLastResult(null);
    setLiveRoutes([]);

    const lat = Number(incidentLat?.trim());
    const lng = Number(incidentLng?.trim());

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setLastResult({ ok: false, msg: "Invalid coordinates" });
      setSimActive(false);
      return;
    }

    const crashCoords = { lat, lng };

    setSimCrash({
      id: 'CS-SIM', label: 'CRASH · SIM', sub: `${incidentLat}, ${incidentLng}`,
      ...crashCoords, active: true, sim: true,
    });

    const { data: apiResult, error } = await postDispatchTrigger({
      incident_type: 'road_accident',
      casualties: 3,
      incident_location: "MAP_SELECTED",
      incident_lat: lat,
      incident_lng: lng
    });

    if (apiResult && !error) {
      setLastResult({ ok: true, msg: 'API dispatch successful' });
      setDispatchResult(apiResult);

      const parsed = parseRouteNodes(apiResult.selected_route);
      const hospitalId = parseHospitalId(apiResult.selected_hospital);

      if (parsed?.nodes?.length >= 2) {
        const waypoints = parsed.nodes
          .map(nodeId => NODE_COORDS[nodeId])
          .filter(Boolean);

        if (waypoints.length >= 2) {
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

      if (hospitalId && NODE_COORDS[hospitalId]) {
        setMapState(prev => ({
          ...prev,
          hospital: { id: hospitalId, ...NODE_COORDS[hospitalId] },
        }));
      }

      setTimeout(() => { setSimActive(false); setSimCrash(null); }, 3500);

    } else {
      setLastResult({ ok: false, msg: error ?? 'Offline' });
      setTimeout(() => { setSimActive(false); setSimCrash(null); }, 3500);

      const waypoints = [NODE_COORDS.Ambulance_Station, crashCoords, NODE_COORDS.Fortis_Mulund];
      const enriched = await buildRouteGeometries([{
        id: 'RT-FALLBACK', label: 'Route (backend offline)', color: '#d29922', waypoints,
      }]);
      setLiveRoutes(enriched);
      setRouteSource(enriched[0]?.source ?? 'fallback');
    }
  }, [simActive, incidentLat, incidentLng]);

  const activeRoutes = liveRoutes.length > 0 ? liveRoutes : mapState.routes ?? [];
  const crashSites = [...(mapState.crash_sites ?? []), ...(simCrash ? [simCrash] : [])];

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left: Telemetry + Stream */}
      <IncidentControlPanel
        incidentLat={incidentLat}
        setIncidentLat={setIncidentLat}
        incidentLng={incidentLng}
        setIncidentLng={setIncidentLng}
        locationMode={locationMode}
        setLocationMode={setLocationMode}
        onDispatch={handleSimulate}
        simActive={simActive}
        lastResult={lastResult}
      />

      {/* Right: Tactical Map */}
      <div className="flex-1 relative overflow-hidden">
        <TacticalMap
          dispatchResult={dispatchResult}
          onIncidentPin={(lat, lng) => {
            console.log("LIVE RECEIVED", lat, lng);

            setIncidentLat(lat.toFixed(6));
            setIncidentLng(lng.toFixed(6));
          }}
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
      </div>
    </div>
  );
}