import { useEffect, useRef, useCallback } from 'react';

const CARTO_DARK =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>';

// Styles injected once for custom div-icon markers
const ICON_STYLE_ID = 'roadsos-leaflet-icons';
function injectIconStyles() {
  if (document.getElementById(ICON_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = ICON_STYLE_ID;
  s.textContent = `
    .rl-ems {
      background:#1c3a5e; border:2px solid #58a6ff; border-radius:50%;
      width:26px; height:26px; display:flex; align-items:center; justify-content:center;
      font-family:'JetBrains Mono',monospace; font-size:7px; color:#58a6ff; font-weight:700;
      box-shadow:0 0 10px rgba(88,166,255,0.4);
    }
    .rl-hospital {
      background:#1a3a25; border:2px solid #3fb950; border-radius:4px;
      width:28px; height:28px; display:flex; align-items:center; justify-content:center;
      font-size:15px; color:#3fb950;
      box-shadow:0 0 12px rgba(63,185,80,0.4);
    }
    .rl-crash-ring {
      position: absolute;
      inset: -10px;
      border-radius: 50%;
      border: 1.5px solid rgba(248,81,73,0.6);
      animation: sonarRing 3s ease-out infinite;
    }
    .rl-crash-ring-2 {
      position: absolute;
      inset: -10px;
      border-radius: 50%;
      border: 1px solid rgba(248,81,73,0.3);
      animation: sonarRing 3s ease-out infinite 1.5s;
    }
    .rl-crash-icon {
      position: absolute;
      inset: 0;
      background: #3d1215;
      border: 1.5px solid #f85149;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: #f85149;
      font-weight: 700;
      box-shadow: 0 0 8px rgba(248,81,73,0.25);
    }
    .rl-crash-sim .rl-crash-ring { border-color: rgba(249,115,22,0.6); }
    .rl-crash-sim .rl-crash-ring-2 { border-color: rgba(249,115,22,0.3); }
    .rl-crash-sim .rl-crash-icon { background:#2d1a0a; border-color:#f97316; color:#f97316; box-shadow:0 0 8px rgba(249,115,22,0.25); }
    @keyframes sonarRing {
      0%   { transform: scale(0.6); opacity: 0.8; }
      100% { transform: scale(2.8); opacity: 0; }
    }
    /* Override leaflet popup to match dark theme */
    .leaflet-popup-content-wrapper {
      background:#161b22; border:1px solid #30363d; border-radius:3px;
      color:#e6edf3; font-family:'JetBrains Mono',monospace; font-size:11px;
      box-shadow:0 4px 20px rgba(0,0,0,0.6);
    }
    .leaflet-popup-tip { background:#161b22; }
    .leaflet-popup-close-button { color:#8b949e !important; }
    .leaflet-control-zoom a {
      background:#161b22 !important; color:#8b949e !important;
      border-color:#30363d !important;
    }
    .leaflet-control-zoom a:hover { background:#21262d !important; color:#e6edf3 !important; }
    .leaflet-bar { border:1px solid #30363d !important; border-radius:3px !important; }
    .leaflet-control-attribution {
      background:rgba(13,17,23,0.75) !important; color:#484f58 !important;
      font-size:9px !important;
    }
    .leaflet-control-attribution a { color:#484f58 !important; }
  `;
  document.head.appendChild(s);
}

function makeIcon(cls, label) {
  return window.L.divIcon({
    className: '',
    html: `<div class="${cls}">${label}</div>`,
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
    popupAnchor:[0, -16],
  });
}

/**
 * LeafletMap — wraps vanilla Leaflet (loaded via CDN) in a React component.
 *
 * Props:
 *   emsStations  [{id, label, sub, lat, lng}]
 *   crashSites   [{id, label, sub, lat, lng, active, sim?}]
 *   hospital     {id, label, sub, lat, lng}
 *   routes       [{id, label, color, coordinates: [[lat,lng],...]}]
 */
export default function LeafletMap({ emsStations = [], crashSites = [], hospital = null, routes = [] }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const layersRef    = useRef([]);

  // ── Initialise map once ───────────────────────────────────────────────────
  useEffect(() => {
    const L = window.L;
    if (!L || mapRef.current || !containerRef.current) return;

    injectIconStyles();

    const map = L.map(containerRef.current, {
      center: [19.13, 72.94],
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer(CARTO_DARK, {
      attribution: CARTO_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Update markers / routes when data changes ─────────────────────────────
  const syncLayers = useCallback(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    // Clear previous dynamic layers
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];

    const add = (layer) => {
      layer.addTo(map);
      layersRef.current.push(layer);
    };

    // Routes (render first so markers sit on top)
    routes.forEach((route) => {
      if (!route.coordinates?.length) return;
      const poly = L.polyline(route.coordinates, {
        color: route.color ?? '#58a6ff',
        weight: 3,
        opacity: 0.85,
        dashArray: route.dash ? '8 6' : null,
      });
      poly.bindTooltip(route.label ?? route.id, { sticky: true });
      add(poly);
    });

    // EMS stations
    emsStations.forEach((s) => {
      const m = L.marker([s.lat, s.lng], { icon: makeIcon('rl-ems', 'EMS') });
      m.bindPopup(`<strong>${s.label}</strong><br/>${s.sub}<br/><span style="color:#484f58">${s.id}</span>`);
      add(m);
    });

    // Hospital
    if (hospital?.lat) {
      const m = L.marker([hospital.lat, hospital.lng], { icon: makeIcon('rl-hospital', '✚') });
      m.bindPopup(`<strong>${hospital.label}</strong><br/>${hospital.sub}<br/><span style="color:#3fb950">TRAUMA READY</span>`);
      add(m);
    }

    // Crash sites
    crashSites.forEach((cs) => {
      const wrapperClass = cs.sim ? 'rl-crash-sim' : '';
      const crashIcon = window.L.divIcon({
        className: '',
        html: `<div class="${wrapperClass}" style="position:relative;width:28px;height:28px">
                 <div class="rl-crash-ring"></div>
                 <div class="rl-crash-ring-2"></div>
                 <div class="rl-crash-icon">!</div>
               </div>`,
        iconSize:   [28, 28],
        iconAnchor: [14, 14],
        popupAnchor:[0, -16],
      });
      const m = window.L.marker([cs.lat, cs.lng], { icon: crashIcon });
      m.bindPopup(`<strong style="color:${cs.sim ? '#f97316' : '#f85149'}">${cs.label}</strong><br/>${cs.sub}<br/><span style="color:#f85149">ACTIVE INCIDENT</span>`);
      add(m);
    });
  }, [emsStations, crashSites, hospital, routes]);

  useEffect(() => {
    if (mapRef.current) {
      syncLayers();
    }
  }, [syncLayers]);

  // Retry sync after map init if data arrived first
  useEffect(() => {
    const id = setTimeout(() => syncLayers(), 500);
    return () => clearTimeout(id);
  }, [syncLayers]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: '#080d14' }}
    />
  );
}
