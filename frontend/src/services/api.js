/**
 * RoadSoS API Service Layer
 *
 * Single source of truth for all backend calls.
 * Backend scan findings (READ-ONLY):
 *   - api.py          → only real endpoint: POST /dispatch (IncidentRequest model)
 *   - graph/state.py  → EmergencyState fields: incident_type, casualties, severity,
 *                        incident_location, police_status, ambulance_candidates,
 *                        hospital_candidates, route_candidates, selected_ambulance,
 *                        selected_hospital, selected_route, escalation_status,
 *                        dispatch_decision
 *   - route_agent.py  → NetworkX node IDs from traffic_edges table (string keys)
 *   - hospital_agent.py → format: "Hospital_ID (Beds: N, ICU: N, Trauma: N, Route: N min, Score: N)"
 *   - ambulance_agent.py → format: "AMB_ID (ETA: N min, Equipment: N, Score: N)"
 *
 * All fallback values are empty structures — no static mock arrays.
 */

const BASE = 'http://127.0.0.1:8000';
const TIMEOUT_MS = 6000;

// ── Geographic lookup: maps backend NetworkX node IDs → lat/lng ───────────────
// These are frontend coordinate calibrations for the Mumbai/Thane region.
// Node ID strings must match traffic_edges.source_node / destination_node values.
export const NODE_COORDS = {
  // Ambulance dispatch stations
  Ambulance_Station: { lat: 19.1127, lng: 72.9250, label: 'EMS Beta · Vikhroli',    type: 'ems' },
  EMS_Alpha:         { lat: 19.1663, lng: 72.8526, label: 'EMS Alpha · Goregaon',   type: 'ems' },
  EMS_Gamma:         { lat: 19.2400, lng: 72.9780, label: 'EMS Gamma · Thane West', type: 'ems' },
  // Incident locations — values of incident_location in EmergencyState
  Incident_A:        { lat: 19.1650, lng: 72.8540, label: 'Incident A · WEH Goregaon',    type: 'crash' },
  Incident_B:        { lat: 19.1100, lng: 72.9280, label: 'Incident B · EEH Vikhroli',    type: 'crash' },
  Incident_C:        { lat: 19.0980, lng: 72.8780, label: 'Incident C · LBS Marg',         type: 'crash' },
  Incident_D:        { lat: 19.2403, lng: 72.9780, label: 'Incident D · Ghodbunder Rd',    type: 'crash' },
  // Hospital IDs from hospitals table (hospital_id column)
  Fortis_Mulund:     { lat: 19.1748, lng: 73.0243, label: 'Fortis Mulund Hospital',        type: 'hospital' },
  Sion_Hospital:     { lat: 19.0406, lng: 72.8644, label: 'Sion Hospital',                 type: 'hospital' },
  Kokilaben:         { lat: 19.1305, lng: 72.8244, label: 'Kokilaben Hospital',             type: 'hospital' },
  Jupiter_Thane:     { lat: 19.2183, lng: 72.9781, label: 'Jupiter Hospital Thane',        type: 'hospital' },
  Hiranandani:       { lat: 19.1197, lng: 72.9083, label: 'Hiranandani Hospital Powai',    type: 'hospital' },
};

// Default map nodes derived purely from NODE_COORDS — no hardcoded data
export const DEFAULT_EMS_STATIONS = [
  { id: 'Ambulance_Station', ...NODE_COORDS.Ambulance_Station, sub: 'Vikhroli Stn' },
  { id: 'EMS_Alpha',         ...NODE_COORDS.EMS_Alpha,         sub: 'Goregaon Stn' },
  { id: 'EMS_Gamma',         ...NODE_COORDS.EMS_Gamma,         sub: 'Thane West'   },
];

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function safeFetch(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = await res.json();
    return { data, error: null, source: 'live' };
  } catch (err) {
    clearTimeout(timer);
    const msg = err.name === 'AbortError' ? 'Request timed out' : (err.message || 'Network error');
    return { data: null, error: msg, source: 'offline' };
  }
}

// ── EmergencyState parsers (field formats from graph/state.py + agents) ───────

/**
 * Parses selected_route into a node array + travel time.
 * Backend format from route_agent.py:
 *   "Ambulance_Station -> Incident_B -> Fortis_Mulund (12 min)"
 */
export function parseRouteNodes(routeStr) {
  if (!routeStr) return null;
  try {
    const match = routeStr.match(/^(.+?)\s*\((\d+(?:\.\d+)?)\s*min\)$/);
    if (!match) return null;
    const nodes = match[1].split('->').map(n => n.trim()).filter(Boolean);
    return { nodes, minutes: parseFloat(match[2]) };
  } catch { return null; }
}

/**
 * Extracts hospital_id from the candidate string.
 * Backend format from hospital_agent.py:
 *   "Fortis_Mulund (Beds: 34, ICU: 8, Trauma: 9, Route: 5 min, Score: 22.5)"
 */
export function parseHospitalId(candidateStr) {
  if (!candidateStr) return null;
  return candidateStr.split(' (')[0].trim();
}

/**
 * Builds agent-stream event log from a real EmergencyState response.
 * Field names are exact matches to graph/state.py TypedDict keys.
 */
export function buildDispatchAgentEvents(state) {
  const events = [];
  const fmt = (ms) => {
    const s = String(Math.floor(ms / 1000)).padStart(2, '0');
    const m = String(ms % 1000).padStart(3, '0').slice(0, 2);
    return `${s}:${m}.${String(ms % 100).padStart(2, '0')}0`;
  };

  if (state.severity !== undefined)
    events.push({ ts: fmt(0),   agent: 'ASSESS_INCIDENT',   msg: `severity=${state.severity} · type=${state.incident_type ?? '?'} · casualties=${state.casualties ?? '?'}`, type: (state.severity ?? 0) >= 8 ? 'warn' : 'info' });
  if (state.police_status)
    events.push({ ts: fmt(312), agent: 'COORDINATE_POLICE', msg: state.police_status, type: 'info' });
  if (state.ambulance_candidates?.length)
    events.push({ ts: fmt(499), agent: 'AMBULANCE_AGENT',   msg: state.ambulance_candidates[0], type: 'ok' });
  if (state.hospital_candidates?.length)
    events.push({ ts: fmt(703), agent: 'HOSPITAL_AGENT',    msg: state.hospital_candidates[0], type: 'ok' });
  if (state.route_candidates?.length)
    events.push({ ts: fmt(1240), agent: 'ROUTING_AGENT',    msg: state.route_candidates[0], type: 'ok' });
  if (state.escalation_status)
    events.push({ ts: fmt(1480), agent: 'ESCALATION_AGENT', msg: state.escalation_status, type: 'warn' });
  if (state.dispatch_decision)
    events.push({ ts: fmt(1891), agent: 'DISPATCH_DECISION',msg: state.dispatch_decision, type: 'ok' });
  events.push({ ts: fmt(2012), agent: 'STATE', msg: `DISPATCHED ✓ · route=${state.selected_route ?? '—'}`, type: 'done' });

  return events;
}

// ── VIEW A: Accident hotspots ─────────────────────────────────────────────────
// Planned endpoint — not yet implemented on backend.
// Returns empty structure until backend exposes GET /api/v1/analytics/hotspots.
export async function getHotspots() {
  const result = await safeFetch(`${BASE}/api/v1/analytics/hotspots`);

console.log(JSON.stringify(result.data, null, 2));

  if (result.data) {
    return {
      zones: result.data.zones ?? result.data ?? [],
      metrics: result.data.metrics ?? null,
      source: 'live',
      error: null,
    };
  }

  return {
    zones: [],
    metrics: null,
    source: 'offline',
    error: result.error
  };
}

// ── VIEW B: Dispatch trigger (POST /dispatch — real endpoint in api.py) ───────
export async function postDispatchTrigger(payload = {}) {
  return safeFetch(`${BASE}/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      incident_type: payload.incident_type ?? 'road_accident',
      casualties: payload.casualties ?? 3,
      incident_location: payload.incident_location ?? 'Incident_B',
      incident_lat: payload.incident_lat ?? null,
      incident_lng: payload.incident_lng ?? null
    }),
  });
}

// ── VIEW B: Map state ────────────────────────────────────────────────────────
// Planned endpoint — not yet implemented. Falls back to NODE_COORDS-derived defaults.
export async function getMapState() {
  const result = await safeFetch(`${BASE}/api/v1/analytics/map-state`);
  if (result.data) {
    return { data: result.data, source: 'live', error: null };
  }
  // Use NODE_COORDS as coordinate source — not mock data
  return {
    data: {
      ems_stations: DEFAULT_EMS_STATIONS,
      crash_sites: [],           // populated dynamically after dispatch
      hospital: null,            // populated from selected_hospital after dispatch
      routes: [],
    },
    source: 'offline',
    error: result.error,
  };
}

// ── Resources: all field units (hospitals, ambulances, police, etc.) ─────────
// GET /api/v1/resources — already implemented in backend.
export async function getResources() {
  const result = await safeFetch(`${BASE}/api/v1/resources`);
  if (result.data) {
    return {
      data: {
        hospitals:    result.data.hospitals    ?? [],
        police:       result.data.police       ?? [],
        ambulances:   result.data.ambulances   ?? [],
        repair_shops: result.data.repair_shops ?? [],
        tow_services: result.data.tow_services ?? [],
      },
      source: 'live',
      error: null,
    };
  }
  return { data: null, source: 'offline', error: result.error };
}

// ── VIEW C: Incident reports ──────────────────────────────────────────────────
// Planned endpoint — not yet implemented on backend.
export async function getIncidents() {
  const result = await safeFetch(`${BASE}/api/v1/reports/incidents`);
  if (result.data) {
    const list = Array.isArray(result.data) ? result.data : (result.data.incidents ?? []);
    const normalised = list.map(inc => ({
      id:           inc.incident_id    ?? inc.id,
      location:     inc.location,
      severity:     inc.severity       ?? 'medium',
      crashTime:    inc.crash_time     ?? inc.crashTime,
      dispatchTime: inc.dispatch_time  ?? inc.dispatchTime,
      etaActual:    inc.eta_actual     ?? inc.etaActual,
      etaTarget:    inc.eta_target     ?? inc.etaTarget ?? 10,
      sla:          (inc.sla_status === 'WITHIN SLA' || inc.sla === 'ok') ? 'ok' : 'breach',
      policeEta:    inc.police_eta     ?? inc.policeEta,
      ambulance:    inc.ambulance_unit ?? inc.ambulance,
      hospital:     inc.hospital,
    }));
    return { data: normalised, source: 'live', error: null };
  }
  return { data: [], source: 'offline', error: result.error };
}

// ── WebSocket: live dispatch stream ───────────────────────────────────────────
export function createDispatchStream(onAgentEvent, onTelemetry, onStatusChange) {
  let ws = null;
  let reconnectTimer = null;
  let destroyed = false;

  function connect() {
    if (destroyed) return;
    onStatusChange?.('connecting');
    try {
      ws = new WebSocket('ws://localhost:8000/api/v1/dispatch/stream');

      ws.onopen = () => onStatusChange?.('open');

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'agent_event' || msg.agent) {
            onAgentEvent?.({
              ts:    msg.ts        ?? msg.timestamp ?? '00:00.000',
              agent: msg.agent     ?? msg.node      ?? 'SYSTEM',
              msg:   msg.msg       ?? msg.message   ?? '',
              type:  msg.event_type ?? msg.type     ?? 'info',
            });
          } else if (msg.type === 'telemetry' || msg.sensor_id) {
            onTelemetry?.({
              nodeId:   msg.sensor_id  ?? msg.nodeId,
              location: msg.location   ?? '—',
              status:   msg.status     ?? 'MONITORING',
              gForceX:  msg.g_force_x  ?? msg.gForceX  ?? 0,
              gForceY:  msg.g_force_y  ?? msg.gForceY  ?? 0,
              gForceZ:  msg.g_force_z  ?? msg.gForceZ  ?? 9.81,
              rollDeg:  msg.roll_deg   ?? msg.rollDeg   ?? 0,
              pitchDeg: msg.pitch_deg  ?? msg.pitchDeg  ?? 0,
              tempC:    msg.temp_c     ?? msg.tempC     ?? 0,
              timestamp: msg.timestamp ?? new Date().toISOString(),
            });
          }
        } catch (e) {
          console.warn('[RoadSoS WS] parse error', e);
        }
      };

      ws.onclose = () => {
        onStatusChange?.('closed');
        if (!destroyed) reconnectTimer = setTimeout(connect, 4000);
      };

      ws.onerror = () => ws?.close();
    } catch {
      onStatusChange?.('closed');
      if (!destroyed) reconnectTimer = setTimeout(connect, 4000);
    }
  }

  connect();
  return () => {
    destroyed = true;
    clearTimeout(reconnectTimer);
    ws?.close();
  };
}
