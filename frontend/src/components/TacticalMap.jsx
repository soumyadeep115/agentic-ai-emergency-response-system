/**
 * ROADSOS — TacticalMap.jsx
 * Fixes applied:
 *   1. Route drawn from backend route_geometry (real ORS road geometry) instead
 *      of re-routing client-side via OSRM/straight-line fallback
 *   2. Police ETA card rendered below ambulance ETA card post-dispatch
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MAP_STATE_URL   = "http://localhost:8000/api/v1/map-state";
const POLL_INTERVAL_MS = 5000;
const DEFAULT_CENTER  = [19.076, 72.8777];
const DEFAULT_ZOOM    = 13;
const TILE_URL        = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR       = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// ─── Icon factory ─────────────────────────────────────────────────────────────

function makeIcon(color, symbol, pulsing = false, large = false) {
  const size = large ? 44 : 32;
  const pulse = pulsing
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:${size + 20}px;height:${size + 20}px;border-radius:50%;
        border:2px solid ${color};opacity:0.6;
        animation:roadsos-pulse 1.4s ease-out infinite;"></div>`
    : "";
  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      ${pulse}
      <div style="width:${size}px;height:${size}px;background:${color};
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        border:2px solid rgba(255,255,255,0.25);
        box-shadow:0 0 ${large ? 16 : 8}px ${color}80;
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:${large ? 18 : 13}px;line-height:1;user-select:none;">${symbol}</span>
      </div></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function makeIncidentIcon() {
  return L.divIcon({
    html: `<div style="position:relative;width:40px;height:40px;">
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:58px;height:58px;border-radius:50%;border:2px solid #ff4444;
        opacity:0.7;animation:roadsos-pulse 1s ease-out infinite;"></div>
      <div style="width:40px;height:40px;background:#ff1a1a;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);border:2px solid rgba(255,255,255,0.3);
        box-shadow:0 0 20px #ff1a1a80;display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:18px;line-height:1;">⚠</span>
      </div></div>`,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
}

const RESOURCE_CONFIG = {
  hospitals:    { color: "#22c55e", symbol: "✚", label: "Hospital" },
  police:       { color: "#3b82f6", symbol: "⚑", label: "Police Unit" },
  ambulances:   { color: "#f97316", symbol: "🚑", label: "Ambulance" },
  repair_shops: { color: "#eab308", symbol: "🔧", label: "Repair Shop" },
  tow_services: { color: "#a855f7", symbol: "🚛", label: "Tow Service" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestPerType(resources, lat, lng) {
  const result = {};
  for (const [type, items] of Object.entries(resources)) {
    if (!items?.length) continue;
    let best = null, bestDist = Infinity;
    for (const item of items) {
      if (item.latitude == null || item.longitude == null) continue;
      const d = haversine(lat, lng, item.latitude, item.longitude);
      if (d < bestDist) { bestDist = d; best = item.id; }
    }
    if (best) result[type] = best;
  }
  return result;
}

function formatEta(seconds) {
  if (!seconds && seconds !== 0) return "N/A";
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function injectStyles() {
  if (document.getElementById("roadsos-map-styles")) return;
  const style = document.createElement("style");
  style.id = "roadsos-map-styles";
  style.textContent = `
    @keyframes roadsos-pulse {
      0%   { transform:translate(-50%,-50%) scale(0.8); opacity:0.8; }
      70%  { transform:translate(-50%,-50%) scale(1.6); opacity:0; }
      100% { transform:translate(-50%,-50%) scale(0.8); opacity:0; }
    }
    .roadsos-popup .leaflet-popup-content-wrapper {
      background:#161b22 !important; border:1px solid #30363d !important;
      border-radius:8px !important; color:#e6edf3 !important;
      box-shadow:0 8px 24px rgba(0,0,0,0.6) !important;
    }
    .roadsos-popup .leaflet-popup-tip { background:#161b22 !important; }
    .roadsos-popup .leaflet-popup-content {
      margin:12px 16px !important; font-family:'JetBrains Mono',monospace !important;
      font-size:12px !important; line-height:1.6 !important;
    }
    .leaflet-container { background:#0d1117 !important; }
  `;
  document.head.appendChild(style);
}

function extractId(str) {
  if (!str) return null;
  const match = str.match(/^([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

function statusColor(s) {
  if (!s) return "#c9d1d9";
  const v = s.toLowerCase();
  if (v === "available") return "#22c55e";
  if (v === "busy" || v === "deployed") return "#f97316";
  if (v === "offline") return "#6e7681";
  return "#c9d1d9";
}

function infoRow(label, value, color = "#c9d1d9") {
  return `<div style="display:flex;justify-content:space-between;margin-bottom:3px;">
    <span style="color:#6e7681;">${label}</span>
    <span style="color:${color};">${value}</span></div>`;
}

function buildPopupHtml(type, item, cfg, isSelected, isNearest) {
  const rows = [];
  if (item.name) rows.push(`<div style="color:#e6edf3;font-weight:700;margin-bottom:6px;">${item.name}</div>`);
  rows.push(`<div style="color:#6e7681;font-size:10px;letter-spacing:0.1em;margin-bottom:8px;">${cfg.label} · ${item.id}</div>`);
  if (item.latitude != null) rows.push(infoRow("Coords", `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`));
  if (item.status)              rows.push(infoRow("Status", item.status, statusColor(item.status)));
  if (item.eta != null)         rows.push(infoRow("ETA", `${item.eta} min`));
  if (item.available_beds != null) rows.push(infoRow("Beds", item.available_beds));
  if (item.icu_readiness != null)  rows.push(infoRow("ICU", `${item.icu_readiness}%`));
  if (item.trauma_score != null)   rows.push(infoRow("Trauma", item.trauma_score));
  if (item.equipment_score != null) rows.push(infoRow("Equipment", item.equipment_score));
  if (item.clearance_capacity != null) rows.push(infoRow("Clearance", item.clearance_capacity));
  if (isSelected) rows.push(`<div style="margin-top:8px;padding:4px 8px;background:#f9731620;border:1px solid #f97316;border-radius:4px;color:#f97316;font-size:10px;text-align:center;letter-spacing:0.1em;">▶ DISPATCHED</div>`);
  if (isNearest)  rows.push(`<div style="margin-top:8px;padding:4px 8px;background:#22c55e20;border:1px solid #22c55e;border-radius:4px;color:#22c55e;font-size:10px;text-align:center;letter-spacing:0.1em;">◉ NEAREST TO INCIDENT</div>`);
  return rows.join("");
}

// ─── ETA Card ─────────────────────────────────────────────────────────────────

function EtaCard({ label, unitId, etaSeconds, etaMinutes, color }) {
  const displayEta = etaSeconds != null
    ? formatEta(etaSeconds)
    : etaMinutes != null
      ? `${etaMinutes}m 0s`
      : "N/A";

  return (
    <div style={{
      background: "#161b22",
      border: `1px solid ${color}`,
      borderRadius: 8,
      padding: "12px 16px",
      fontFamily: "monospace",
      boxShadow: `0 4px 20px ${color}40`,
      minWidth: 160,
    }}>
      <div style={{ color: "#8b949e", fontSize: 10, letterSpacing: "0.12em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color, fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
        {displayEta}
      </div>
      {unitId && (
        <div style={{ color: "#6e7681", fontSize: 10, marginTop: 6 }}>
          {unitId}
        </div>
      )}
    </div>
  );
}

// ─── DispatchRow ──────────────────────────────────────────────────────────────

function DispatchRow({ label, value, accent }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 5, alignItems: "flex-start" }}>
      <span style={{ color: "#6e7681", flexShrink: 0, width: 70 }}>{label}:</span>
      <span style={{ color: accent || "#c9d1d9", wordBreak: "break-word", lineHeight: 1.4 }}>{value}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TacticalMap({ dispatchResult = null, onIncidentPin }) {
  const mapRef            = useRef(null);
  const mapDivRef         = useRef(null);
  const markersRef        = useRef({});
  const routeLayersRef    = useRef([]);    // array — glow layer + dash layer
  const incidentMarkerRef = useRef(null);

  const [mapState,    setMapState]    = useState(null);
  const [incidentPin, setIncidentPin] = useState(null);
  const [nearestMap,  setNearestMap]  = useState({});
  const [mode,        setMode]        = useState("live");
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // ── Map init ────────────────────────────────────────────────────────────────

  useEffect(() => {
    injectStyles();
    if (mapRef.current) return;

    const map = L.map(mapDivRef.current, {
      center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM,
      zoomControl: false, attributionControl: true,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Dark tile filter
    const applyFilter = () => {
      const pane = mapDivRef.current?.querySelector(".leaflet-tile-pane");
      if (pane) pane.style.filter =
        "invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.8)";
    };
    map.on("load", applyFilter);
    setTimeout(applyFilter, 500);

    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      setIncidentPin({ lat, lng });
      if (onIncidentPin) onIncidentPin(lat, lng);
    });

    mapRef.current = map;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          // Guard: map may have been destroyed before GPS callback fires
          if (!mapRef.current) return;
          try {
            mapRef.current.setView([coords.latitude, coords.longitude], DEFAULT_ZOOM);
          } catch (e) {
            // Map was unmounted during geolocation resolution — safe to ignore
          }
        },
        () => {}
      );
    }

    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tile pane dark filter observer ──────────────────────────────────────────

  useEffect(() => {
    if (!mapDivRef.current) return;
    const observer = new MutationObserver(() => {
      const pane = mapDivRef.current?.querySelector(".leaflet-tile-pane");
      if (pane && !pane.style.filter) {
        pane.style.filter =
          "invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.8)";
      }
    });
    observer.observe(mapDivRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // ── Poll map-state ──────────────────────────────────────────────────────────

  const fetchMapState = useCallback(async () => {
    try {
      const res = await fetch(MAP_STATE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMapState(await res.json());
      setError(null);
    } catch {
      setError("Map state unavailable — backend unreachable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMapState();
    const id = setInterval(fetchMapState, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchMapState]);

  // ── Mode detection ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (dispatchResult?.selected_ambulance || dispatchResult?.route_geometry) {
      setMode("dispatch");
    } else {
      setMode("live");
    }
  }, [dispatchResult]);

  // ── Nearest highlight ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!incidentPin || !mapState?.resources) return;
    setNearestMap(nearestPerType(mapState.resources, incidentPin.lat, incidentPin.lng));
  }, [incidentPin, mapState]);

  // ── Render markers ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapState?.resources) return;
    const map       = mapRef.current;
    const resources = mapState.resources;
    const dispatch  = mapState.active_dispatch;

    const selectedAmbuId   = mode === "dispatch" ? extractId(dispatch?.selected_ambulance) : null;
    const selectedPoliceId = mode === "dispatch" ? extractId(dispatch?.selected_police)    : null;

    for (const [type, items] of Object.entries(resources)) {
      if (!items?.length) continue;
      const cfg = RESOURCE_CONFIG[type];
      if (!cfg) continue;
      if (!markersRef.current[type]) markersRef.current[type] = {};

      const existingIds = new Set(Object.keys(markersRef.current[type]));

      for (const item of items) {
        if (item.latitude == null || item.longitude == null) continue;
        const id = item.id;
        existingIds.delete(id);

        const isSelected =
          (type === "ambulances" && id === selectedAmbuId) ||
          (type === "police"     && id === selectedPoliceId);
        const isNearest = mode === "live" && nearestMap[type] === id;
        const icon      = makeIcon(cfg.color, cfg.symbol, isSelected || isNearest, isSelected);
        const popup     = buildPopupHtml(type, item, cfg, isSelected, isNearest);

        if (markersRef.current[type][id]) {
          markersRef.current[type][id].setIcon(icon);
          markersRef.current[type][id].getPopup()?.setContent(popup);
        } else {
          markersRef.current[type][id] = L.marker([item.latitude, item.longitude], { icon })
            .addTo(map)
            .bindPopup(popup, { className: "roadsos-popup", maxWidth: 260 });
        }
      }

      for (const staleId of existingIds) {
        markersRef.current[type][staleId]?.remove();
        delete markersRef.current[type][staleId];
      }
    }
  }, [mapState, mode, nearestMap]);

  // ── Incident pin marker ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !incidentPin) return;
    if (incidentMarkerRef.current) {
      incidentMarkerRef.current.setLatLng([incidentPin.lat, incidentPin.lng]);
    } else {
      incidentMarkerRef.current = L.marker([incidentPin.lat, incidentPin.lng], {
        icon: makeIncidentIcon(), zIndexOffset: 1000,
      })
        .addTo(mapRef.current)
        .bindPopup(
          `<div style="color:#ff4444;font-weight:bold;">⚠ INCIDENT LOCATION</div>
           <div style="color:#8b949e;margin-top:4px;">${incidentPin.lat.toFixed(5)}, ${incidentPin.lng.toFixed(5)}</div>`,
          { className: "roadsos-popup" }
        );
    }
  }, [incidentPin]);

  // ── Route polyline — drawn from backend route_geometry ──────────────────────
  //
  // KEY FIX: We use geometry from the dispatch API response or map-state directly.
  // If route_source is "ORS", this is a real road-following GeoJSON LineString.
  // If route_source is "NetworkX", it's a coordinate polyline from the nodes table.
  // Either way we just draw whatever the backend computed — no client-side re-routing.

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old route layers
    routeLayersRef.current.forEach(l => l.remove());
    routeLayersRef.current = [];

    if (mode !== "dispatch") return;

    // Prefer live dispatchResult geometry; fall back to persisted map-state geometry
    const geometry =
      dispatchResult?.route_geometry ||
      mapState?.active_dispatch?.route_geometry;

    if (!geometry?.coordinates?.length) return;

    // GeoJSON is [lng, lat]; Leaflet needs [lat, lng]
    const latLngs = geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    if (latLngs.length < 2) return;

    // Glow layer
    const glow = L.polyline(latLngs, {
      color: "#f9731640", weight: 12, opacity: 0.4, lineJoin: "round",
    }).addTo(mapRef.current);

    // Main dashed line
    const dash = L.polyline(latLngs, {
      color: "#f97316", weight: 4, opacity: 0.9,
      dashArray: "10, 8", lineJoin: "round",
    }).addTo(mapRef.current);

    routeLayersRef.current = [glow, dash];

    mapRef.current.fitBounds(L.latLngBounds(latLngs), { padding: [60, 60] });
  }, [mode, dispatchResult, mapState]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const activeDispatch = mapState?.active_dispatch;
  const routeSource    = dispatchResult?.route_source    || activeDispatch?.route_source;
  const etaSeconds     = dispatchResult?.real_eta_seconds || activeDispatch?.real_eta_seconds;
  const policeEtaMins  = dispatchResult?.selected_police_eta || activeDispatch?.selected_police_eta;
  const policeId       = dispatchResult?.selected_police     || activeDispatch?.selected_police;
  const ambulanceId    = activeDispatch?.selected_ambulance;

  const resourceCounts = mapState?.resources
    ? Object.fromEntries(Object.entries(mapState.resources).map(([k, v]) => [k, v?.length ?? 0]))
    : {};

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{
      width: "100%", height: "100%", minHeight: "500px", position: "relative",
      background: "#0d1117", borderRadius: "12px", overflow: "hidden",
      border: "1px solid #30363d",
    }}>
      {/* Map canvas */}
      <div ref={mapDivRef} style={{ width: "100%", height: "100%", minHeight: "500px" }} />

      {/* Mode + route source badges */}
      <div style={{ position: "absolute", top: 16, left: 16, zIndex: 1000, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{
          background: mode === "dispatch" ? "#f97316" : "#22c55e",
          color: "#0d1117", fontFamily: "monospace", fontWeight: 700,
          fontSize: 11, letterSpacing: "0.12em", padding: "4px 12px",
          borderRadius: 4, textTransform: "uppercase",
          boxShadow: `0 0 12px ${mode === "dispatch" ? "#f9731660" : "#22c55e60"}`,
        }}>
          {mode === "dispatch" ? "▶ DISPATCH ACTIVE" : "◎ LIVE BROWSE"}
        </div>

        {mode === "dispatch" && routeSource && (
          <div style={{
            background: routeSource === "OSRM" ? "#3b82f6" : "#eab308",
            color: "#0d1117", fontFamily: "monospace", fontWeight: 700,
            fontSize: 10, letterSpacing: "0.1em", padding: "3px 10px",
            borderRadius: 4, textTransform: "uppercase",
          }}>
            {routeSource === "OSRM" ? "⚡ OSRM ROUTING" : "⟁ NETWORKX FALLBACK"}
          </div>
        )}
      </div>

      {/* ETA cards — ambulance + police stacked */}
      {mode === "dispatch" && (
        <div style={{
          position: "absolute", top: 16, right: 16, zIndex: 1000,
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          {/* Ambulance ETA */}
          {(etaSeconds != null) && (
            <EtaCard
              label="ESTIMATED ARRIVAL"
              unitId={ambulanceId}
              etaSeconds={etaSeconds}
              color="#f97316"
            />
          )}

          {/* Police ETA — shown when a police unit was dispatched */}
          {policeId && (
            <EtaCard
              label="POLICE ETA"
              unitId={policeId}
              etaMinutes={policeEtaMins}
              color="#3b82f6"
            />
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 40, left: 16, zIndex: 1000,
        background: "rgba(22,27,34,0.92)", border: "1px solid #30363d",
        borderRadius: 8, padding: "10px 14px", fontFamily: "monospace",
        fontSize: 11, backdropFilter: "blur(8px)",
      }}>
        <div style={{ color: "#8b949e", fontSize: 10, letterSpacing: "0.1em", marginBottom: 8 }}>
          RESOURCE LEGEND
        </div>
        {Object.entries(RESOURCE_CONFIG).map(([type, cfg]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: cfg.color, boxShadow: `0 0 6px ${cfg.color}80`, flexShrink: 0,
            }} />
            <span style={{ color: "#c9d1d9" }}>{cfg.label}</span>
            <span style={{ color: "#6e7681", marginLeft: "auto", paddingLeft: 12 }}>
              {resourceCounts[type] ?? 0}
            </span>
          </div>
        ))}
        {mode === "live" && (
          <div style={{ color: "#6e7681", fontSize: 10, marginTop: 8, borderTop: "1px solid #30363d", paddingTop: 8 }}>
            Click map to pin incident
          </div>
        )}
      </div>

      {/* Dispatch summary panel */}
      {mode === "dispatch" && activeDispatch && (
        <div style={{
          position: "absolute", bottom: 40, right: 16, zIndex: 1000,
          background: "rgba(22,27,34,0.95)", border: "1px solid #30363d",
          borderRadius: 8, padding: "12px 16px", fontFamily: "monospace",
          fontSize: 11, maxWidth: 260, backdropFilter: "blur(8px)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}>
          <div style={{ color: "#f97316", fontSize: 10, letterSpacing: "0.12em", marginBottom: 10 }}>
            DISPATCH SUMMARY
          </div>
          <DispatchRow label="Ambulance" value={activeDispatch.selected_ambulance} />
          <DispatchRow label="Police"    value={activeDispatch.selected_police} />
          <DispatchRow label="Hospital"  value={activeDispatch.selected_hospital} />
          <DispatchRow label="Incident"  value={activeDispatch.incident_location} />
          {activeDispatch.route_source && (
            <DispatchRow
              label="Route"
              value={activeDispatch.route_source}
              accent={activeDispatch.route_source === "OSRM" ? "#3b82f6" : "#eab308"}
            />
          )}
          {activeDispatch.created_at && (
            <DispatchRow label="Time" value={new Date(activeDispatch.created_at).toLocaleTimeString()} />
          )}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2000,
          background: "rgba(13,17,23,0.85)", display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 12, fontFamily: "monospace",
        }}>
          <div style={{
            width: 36, height: 36, border: "3px solid #30363d",
            borderTop: "3px solid #f97316", borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ color: "#8b949e", fontSize: 12, letterSpacing: "0.1em" }}>
            INITIALISING TACTICAL MAP
          </span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 1000, background: "#2d1b1b", border: "1px solid #6e2222",
          borderRadius: 6, padding: "8px 16px", fontFamily: "monospace",
          fontSize: 11, color: "#f87171",
        }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}