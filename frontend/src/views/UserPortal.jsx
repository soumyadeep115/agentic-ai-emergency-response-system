import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getResources } from '../services/api.js';
import TacticalMap from '../components/TacticalMap.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const BASE = 'http://127.0.0.1:8000';

const INCIDENT_TYPES = [
  { value: 'road_accident',   label: 'Road Accident',   icon: '🚗' },
  { value: 'fire',            label: 'Fire',             icon: '🔥' },
  { value: 'medical',         label: 'Medical Emergency',icon: '🏥' },
  { value: 'flood',           label: 'Flood',            icon: '🌊' },
  { value: 'other',           label: 'Other',            icon: '⚠️'  },
];

const TYPE_CONFIG = {
  hospitals:    { cls: 'rp-hospital',  emoji: '✚',  color: '#3fb950', label: 'Hospital'      },
  police:       { cls: 'rp-police',    emoji: '🛡',  color: '#58a6ff', label: 'Police Station' },
  ambulances:   { cls: 'rp-ambulance', emoji: '🚑',  color: '#f97316', label: 'Ambulance Hub'  },
  repair_shops: { cls: 'rp-repair',    emoji: '🔧',  color: '#d29922', label: 'Repair Shop'    },
  tow_services: { cls: 'rp-tow',       emoji: '🚛',  color: '#8b5cf6', label: 'Tow Service'    },
};

const STATUS_COLOR = { available: '#3fb950', busy: '#f97316', offline: '#484f58' };

const INITIAL_VISIBLE = {
  hospitals: true, police: true, ambulances: true,
  repair_shops: true, tow_services: true,
};
const EMPTY_RESOURCES = {
  hospitals: [], police: [], ambulances: [],
  repair_shops: [], tow_services: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Leaflet map styles injection
// ─────────────────────────────────────────────────────────────────────────────
const PORTAL_STYLE_ID = 'roadsos-portal-icons';
function injectPortalIconStyles() {
  if (document.getElementById(PORTAL_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = PORTAL_STYLE_ID;
  s.textContent = `
    .rp-marker {
      display:flex; align-items:center; justify-content:center;
      width:30px; height:30px; border-radius:50%;
      font-size:14px; font-weight:700;
      box-shadow:0 0 12px rgba(0,0,0,0.5); border:2px solid;
      transition:transform 0.2s;
    }
    .rp-hospital  { background:#0d2d1a; border-color:#3fb950; box-shadow:0 0 10px rgba(63,185,80,0.4); }
    .rp-police    { background:#0d1d38; border-color:#58a6ff; box-shadow:0 0 10px rgba(88,166,255,0.4); }
    .rp-ambulance { background:#2d1a08; border-color:#f97316; box-shadow:0 0 10px rgba(249,115,22,0.4); }
    .rp-repair    { background:#2d250a; border-color:#d29922; box-shadow:0 0 10px rgba(210,153,34,0.4); }
    .rp-tow       { background:#1e0d38; border-color:#8b5cf6; box-shadow:0 0 10px rgba(139,92,246,0.4); }
    .rp-offline   { opacity:0.45; filter:grayscale(0.7); }
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
    @keyframes sos-ring {
      0%   { transform:translate(-50%,-50%) scale(1);   opacity:0.8; }
      100% { transform:translate(-50%,-50%) scale(2.2); opacity:0; }
    }
    @keyframes sos-spin {
      to { transform:rotate(360deg); }
    }
  `;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaflet Resource Map (Live Browse mode)
// ─────────────────────────────────────────────────────────────────────────────
function ResourceMap({ resources, visibleTypes, loading }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef([]);

  useEffect(() => {
    const L = window.L;
    if (!L || mapRef.current || !containerRef.current) return;
    injectPortalIconStyles();

    const map = L.map(containerRef.current, {
      center: [19.13, 72.92], zoom: 12,
      zoomControl: false, attributionControl: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Center on device GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        map.setView([coords.latitude, coords.longitude], 13);
      }, () => {});
    }

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const syncMarkers = useCallback(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    Object.entries(resources).forEach(([type, items]) => {
      if (!visibleTypes[type]) return;
      const cfg = TYPE_CONFIG[type];
      if (!cfg) return;
      items.forEach(item => {
        const lat = item.latitude ?? item.lat;
        const lng = item.longitude ?? item.lng;
        if (!lat || !lng) return;
        const isOffline = item.status === 'offline';
        const icon = L.divIcon({
          className: '',
          html: `<div class="rp-marker ${cfg.cls} ${isOffline ? 'rp-offline' : ''}">${cfg.emoji}</div>`,
          iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -18],
        });
        const m = L.marker([lat, lng], { icon });
        const statusBadge = `<span style="color:${STATUS_COLOR[item.status] ?? '#484f58'};font-weight:700">${(item.status ?? 'unknown').toUpperCase()}</span>`;
        m.bindPopup(`
          <div style="min-width:160px">
            <div style="font-size:12px;font-weight:700;color:${cfg.color};margin-bottom:4px">${item.name ?? item.id}</div>
            <div style="color:#8b949e;font-size:10px;margin-bottom:6px">${cfg.label}</div>
            <div style="display:flex;justify-content:space-between;font-size:10px">
              <span style="color:#484f58">ID</span><span style="color:#e6edf3">${item.id}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px">
              <span style="color:#484f58">Coords</span>
              <span style="color:#e6edf3">${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;margin-top:4px">
              <span style="color:#484f58">Status</span>${statusBadge}
            </div>
          </div>
        `);
        m.addTo(map);
        markersRef.current.push(m);
      });
    });
  }, [resources, visibleTypes]);

  useEffect(() => { if (mapRef.current) syncMarkers(); }, [syncMarkers]);
  useEffect(() => { const id = setTimeout(() => syncMarkers(), 600); return () => clearTimeout(id); }, [syncMarkers]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#080d14' }} />
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'rgba(13,17,23,0.7)', zIndex: 999, pointerEvents: 'none',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '2px solid #30363d', borderTopColor: '#58a6ff',
              animation: 'sos-spin 0.8s linear infinite', margin: '0 auto 10px',
            }} />
            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#8b949e' }}>
              Fetching resources…
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOS Button Panel
// ─────────────────────────────────────────────────────────────────────────────
function SOSPanel({ onDispatch, dispatching, dispatchResult, gpsError }) {
  const [expanded,      setExpanded]      = useState(false);
  const [incidentType,  setIncidentType]  = useState('road_accident');
  const [casualties,    setCasualties]    = useState(1);
  const [countdown,     setCountdown]     = useState(null);
  const countdownRef = useRef(null);

  // Auto-fire after 3s if user doesn't interact
  const startCountdown = useCallback(() => {
    let t = 3;
    setCountdown(t);
    countdownRef.current = setInterval(() => {
      t -= 1;
      if (t <= 0) {
        clearInterval(countdownRef.current);
        setCountdown(null);
        onDispatch({ incident_type: incidentType, casualties });
      } else {
        setCountdown(t);
      }
    }, 1000);
  }, [incidentType, casualties, onDispatch]);

  const cancelCountdown = () => {
    clearInterval(countdownRef.current);
    setCountdown(null);
  };

  useEffect(() => () => clearInterval(countdownRef.current), []);

  const handleSOSPress = () => {
    if (dispatching || dispatchResult) return;
    startCountdown();
  };

  const handleDispatchNow = () => {
    cancelCountdown();
    onDispatch({ incident_type: incidentType, casualties });
  };

  // If dispatch done, show result card instead
  if (dispatchResult) {
    return (
      <div style={{
        background: '#161b22', border: '1px solid rgba(249,115,22,0.4)',
        borderRadius: '8px', padding: '16px', display: 'flex',
        flexDirection: 'column', gap: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#f97316', boxShadow: '0 0 8px #f9731680',
            flexShrink: 0, animation: 'none',
          }} />
          <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#f97316', letterSpacing: '0.1em' }}>
            DISPATCH ACTIVE
          </span>
        </div>
        {dispatchResult.selected_ambulance && (
          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#8b949e' }}>
            <span style={{ color: '#484f58' }}>Ambulance: </span>
            <span style={{ color: '#e6edf3' }}>{dispatchResult.selected_ambulance}</span>
          </div>
        )}
        {dispatchResult.selected_hospital && (
          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#8b949e' }}>
            <span style={{ color: '#484f58' }}>Hospital: </span>
            <span style={{ color: '#e6edf3' }}>{dispatchResult.selected_hospital}</span>
          </div>
        )}
        {dispatchResult.real_eta_seconds && (
          <div style={{ fontSize: '10px', fontFamily: 'monospace' }}>
            <span style={{ color: '#484f58' }}>ETA: </span>
            <span style={{ color: '#f97316', fontWeight: 700 }}>
              {Math.floor(dispatchResult.real_eta_seconds / 60)}m {dispatchResult.real_eta_seconds % 60}s
            </span>
          </div>
        )}
        <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#484f58', borderTop: '1px solid #21262d', paddingTop: '8px' }}>
          Help is on the way. Stay calm and stay on the line.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* GPS error warning */}
      {gpsError && (
        <div style={{
          fontSize: '10px', fontFamily: 'monospace', color: '#f97316',
          background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)',
          borderRadius: '4px', padding: '6px 10px',
        }}>
          ⚠ GPS unavailable — dispatch will use default location
        </div>
      )}

      {/* Countdown banner */}
      {countdown !== null && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: '4px', padding: '8px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#ef4444', fontWeight: 700 }}>
            Dispatching in {countdown}s…
          </span>
          <button
            onClick={cancelCountdown}
            style={{
              fontSize: '9px', fontFamily: 'monospace', color: '#8b949e',
              background: 'transparent', border: '1px solid #30363d',
              borderRadius: '3px', padding: '3px 8px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* SOS Button */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <div style={{ position: 'relative', width: '100px', height: '100px' }}>
          {/* Pulse rings */}
          {(countdown !== null || dispatching) && (
            <>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                width: '100px', height: '100px', borderRadius: '50%',
                border: '2px solid rgba(239,68,68,0.6)',
                animation: 'sos-ring 1.2s ease-out infinite',
              }} />
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                width: '100px', height: '100px', borderRadius: '50%',
                border: '2px solid rgba(239,68,68,0.3)',
                animation: 'sos-ring 1.2s ease-out infinite 0.6s',
              }} />
            </>
          )}
          <button
            id="sos-button"
            onClick={handleSOSPress}
            disabled={dispatching}
            style={{
              position: 'absolute', inset: 0,
              width: '100px', height: '100px', borderRadius: '50%',
              background: dispatching
                ? 'rgba(239,68,68,0.3)'
                : countdown !== null
                ? 'rgba(239,68,68,0.25)'
                : 'rgba(239,68,68,0.15)',
              border: `3px solid ${countdown !== null || dispatching ? '#ef4444' : 'rgba(239,68,68,0.6)'}`,
              color: '#ef4444',
              fontSize: dispatching ? '11px' : '22px',
              fontWeight: 900,
              fontFamily: 'monospace',
              letterSpacing: dispatching ? '0.05em' : '0.1em',
              cursor: dispatching ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: countdown !== null || dispatching
                ? '0 0 30px rgba(239,68,68,0.4)'
                : '0 0 16px rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {dispatching ? 'SENDING…' : 'SOS'}
          </button>
        </div>
      </div>

      {/* Dispatch now button (shown during countdown) */}
      {countdown !== null && (
        <button
          onClick={handleDispatchNow}
          style={{
            width: '100%', padding: '8px',
            background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: '4px', color: '#ef4444',
            fontSize: '11px', fontFamily: 'monospace', fontWeight: 700,
            letterSpacing: '0.1em', cursor: 'pointer',
          }}
        >
          ⚡ DISPATCH NOW
        </button>
      )}

      {/* Optional details toggle */}
      {countdown === null && !dispatching && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            width: '100%', padding: '6px',
            background: 'transparent', border: '1px solid #21262d',
            borderRadius: '4px', color: '#484f58',
            fontSize: '9px', fontFamily: 'monospace',
            letterSpacing: '0.1em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}
        >
          {expanded ? '▲' : '▼'} OPTIONAL DETAILS
        </button>
      )}

      {/* Optional fields */}
      {expanded && countdown === null && (
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid #21262d',
          borderRadius: '4px', padding: '12px', display: 'flex',
          flexDirection: 'column', gap: '10px',
        }}>
          {/* Incident type */}
          <div>
            <div style={{ fontSize: '9px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
              Incident Type
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {INCIDENT_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setIncidentType(t.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 10px', borderRadius: '3px', cursor: 'pointer',
                    border: `1px solid ${incidentType === t.value ? 'rgba(239,68,68,0.5)' : '#21262d'}`,
                    background: incidentType === t.value ? 'rgba(239,68,68,0.1)' : 'transparent',
                    color: incidentType === t.value ? '#ef4444' : '#8b949e',
                    fontSize: '11px', fontFamily: 'monospace', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                  {incidentType === t.value && (
                    <span style={{ marginLeft: 'auto', fontSize: '10px' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Casualties */}
          <div>
            <div style={{ fontSize: '9px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
              Casualties (approx.)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setCasualties(c => Math.max(1, c - 1))}
                style={{
                  width: '28px', height: '28px', borderRadius: '3px',
                  border: '1px solid #30363d', background: 'transparent',
                  color: '#8b949e', fontSize: '16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >−</button>
              <span style={{
                flex: 1, textAlign: 'center', fontSize: '18px', fontWeight: 700,
                fontFamily: 'monospace', color: '#e6edf3',
              }}>
                {casualties}
              </span>
              <button
                onClick={() => setCasualties(c => Math.min(20, c + 1))}
                style={{
                  width: '28px', height: '28px', borderRadius: '3px',
                  border: '1px solid #30363d', background: 'transparent',
                  color: '#8b949e', fontSize: '16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >+</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#30363d', textAlign: 'center' }}>
        Tap SOS to alert emergency services
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resource sidebar (Live Browse)
// ─────────────────────────────────────────────────────────────────────────────
function ResourceList({ resources, visibleTypes, onToggle }) {
  const totalItems     = Object.values(resources).reduce((s, a) => s + a.length, 0);
  const availableItems = Object.values(resources).flat().filter(r => r.status === 'available').length;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      borderBottom: '1px solid #21262d', background: '#161b22',
      overflow: 'hidden', maxHeight: '260px',
    }}>
      {/* Stats */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #21262d', display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1, background: '#0d1117', border: '1px solid #21262d', borderRadius: '3px', padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#e6edf3', fontFamily: 'monospace' }}>{totalItems}</div>
          <div style={{ fontSize: '8px', color: '#484f58', textTransform: 'uppercase' }}>Total</div>
        </div>
        <div style={{ flex: 1, background: '#0d1117', border: '1px solid rgba(63,185,80,0.2)', borderRadius: '3px', padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#3fb950', fontFamily: 'monospace' }}>{availableItems}</div>
          <div style={{ fontSize: '8px', color: '#484f58', textTransform: 'uppercase' }}>Available</div>
        </div>
      </div>

      {/* Toggles */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const items   = resources[type] ?? [];
          const visible = visibleTypes[type];
          return (
            <button
              key={type}
              onClick={() => onToggle(type)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '7px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: '1px solid #21262d10',
              }}
            >
              <span style={{ fontSize: '13px' }}>{cfg.emoji}</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: visible ? cfg.color : '#484f58' }}>{cfg.label}</div>
                <div style={{ fontSize: '8px', color: '#484f58', fontFamily: 'monospace' }}>{items.length} units</div>
              </div>
              <div style={{
                width: '26px', height: '13px', borderRadius: '7px',
                background: visible ? cfg.color : '#21262d', position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{
                  position: 'absolute', top: '2px',
                  left: visible ? '15px' : '2px',
                  width: '9px', height: '9px', borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s',
                }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main UserPortal view
// ─────────────────────────────────────────────────────────────────────────────
export default function UserPortal() {
  const [resources,      setResources]      = useState(EMPTY_RESOURCES);
  const [visibleTypes,   setVisibleTypes]   = useState(INITIAL_VISIBLE);
  const [loading,        setLoading]        = useState(true);
  const [fetchError,     setFetchError]     = useState(null);
  const [lastFetched,    setLastFetched]    = useState(null);
  const [dispatching,    setDispatching]    = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [dispatchError,  setDispatchError]  = useState(null);
  const [gpsError,       setGpsError]       = useState(false);
  const [mapMode,        setMapMode]        = useState('live'); // 'live' | 'dispatch'

  // ── Fetch resources ─────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res  = await fetch(`${BASE}/api/v1/resources`);
      const data = await res.json();
      setResources({
        hospitals:    data.hospitals    ?? [],
        police:       data.police       ?? [],
        ambulances:   data.ambulances   ?? [],
        repair_shops: data.repair_shops ?? [],
        tow_services: data.tow_services ?? [],
      });
      setLastFetched(new Date().toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' }));
    } catch (err) {
      setFetchError('Backend offline');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  // ── SOS dispatch handler ────────────────────────────────────────────────
  const handleDispatch = useCallback(({ incident_type, casualties }) => {
    setDispatching(true);
    setDispatchError(null);

    const fire = async (lat, lng) => {
      try {
        const body = {
          incident_type,
          casualties,
          incident_location: 'Incident_B', // default node
          ...(lat != null && lng != null ? { incident_lat: lat, incident_lng: lng } : {}),
        };
        const res  = await fetch(`${BASE}/dispatch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        setDispatchResult(data);
        setMapMode('dispatch');
      } catch (err) {
        setDispatchError('Dispatch failed — backend unreachable');
      } finally {
        setDispatching(false);
      }
    };

    // Try GPS first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setGpsError(false);
          fire(coords.latitude, coords.longitude);
        },
        () => {
          setGpsError(true);
          fire(null, null); // fire anyway with default location
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      setGpsError(true);
      fire(null, null);
    }
  }, []);

  const handleToggle = useCallback((type) => {
    setVisibleTypes(prev => ({ ...prev, [type]: !prev[type] }));
  }, []);

  // ── Layout ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0d1117' }}>

      {/* Top bar */}
      <div style={{
        flexShrink: 0, height: '40px', borderBottom: '1px solid #21262d',
        background: '#161b22', display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: fetchError ? '#ef4444' : '#3fb950',
            display: 'inline-block',
            boxShadow: fetchError ? '0 0 6px #ef444480' : '0 0 6px #3fb95080',
          }} />
          <span style={{ fontSize: '9px', fontFamily: 'monospace', color: fetchError ? '#ef4444' : '#3fb950', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {fetchError ? 'Backend Offline' : 'Live Feed · GET /api/v1/resources'}
          </span>
        </div>
        {lastFetched && (
          <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#484f58' }}>
            Last synced: {lastFetched} IST
          </span>
        )}
        {mapMode === 'dispatch' && (
          <button
            onClick={() => { setMapMode('live'); setDispatchResult(null); }}
            style={{
              marginLeft: 'auto', fontSize: '9px', fontFamily: 'monospace',
              padding: '3px 10px', borderRadius: '3px', border: '1px solid #30363d',
              background: 'transparent', color: '#8b949e', cursor: 'pointer',
            }}
          >
            ← Back to Live
          </button>
        )}
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            marginLeft: mapMode === 'dispatch' ? '8px' : 'auto',
            fontSize: '9px', fontFamily: 'monospace', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '4px 10px', borderRadius: '3px', border: '1px solid #30363d',
            background: 'transparent', color: loading ? '#484f58' : '#8b949e',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⟳ Syncing…' : '⟳ Refresh'}
        </button>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div style={{
          flexShrink: 0, padding: '6px 16px',
          background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)',
          fontSize: '10px', fontFamily: 'monospace', color: '#ef4444',
        }}>
          ⚠ Could not reach backend — {fetchError}
        </div>
      )}

      {/* Dispatch error */}
      {dispatchError && (
        <div style={{
          flexShrink: 0, padding: '6px 16px',
          background: 'rgba(249,115,22,0.08)', borderBottom: '1px solid rgba(249,115,22,0.2)',
          fontSize: '10px', fontFamily: 'monospace', color: '#f97316',
        }}>
          ⚠ {dispatchError}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left sidebar */}
        <div style={{
          width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: '1px solid #21262d', background: '#0d1117', overflow: 'hidden',
        }}>
          {/* SOS panel */}
          <div style={{ padding: '14px', borderBottom: '1px solid #21262d' }}>
            <div style={{ fontSize: '9px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px', fontWeight: 600 }}>
              Emergency SOS
            </div>
            <SOSPanel
              onDispatch={handleDispatch}
              dispatching={dispatching}
              dispatchResult={dispatchResult}
              gpsError={gpsError}
            />
          </div>

          {/* Resource toggles — only in live mode */}
          {mapMode === 'live' && (
            <ResourceList
              resources={resources}
              visibleTypes={visibleTypes}
              onToggle={handleToggle}
            />
          )}

          {/* Dispatch summary in dispatch mode */}
          {mapMode === 'dispatch' && dispatchResult && (
            <div style={{ padding: '14px', flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: '9px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                Dispatch Log
              </div>
              {[
                ['Ambulance',  dispatchResult.selected_ambulance],
                ['Hospital',   dispatchResult.selected_hospital],
                ['Route',      dispatchResult.selected_route],
                ['Police',     dispatchResult.police_status],
                ['Escalation', dispatchResult.escalation_status],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '8px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                  <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#c9d1d9', lineHeight: 1.4, marginTop: '2px', wordBreak: 'break-word' }}>{val}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {mapMode === 'live' ? (
            <>
              <ResourceMap resources={resources} visibleTypes={visibleTypes} loading={loading} />
              {/* Legend */}
              <div style={{
                position: 'absolute', bottom: '52px', left: '12px', zIndex: 499,
                background: 'rgba(22,27,34,0.92)', border: '1px solid #21262d',
                borderRadius: '4px', padding: '8px 12px', pointerEvents: 'none',
              }}>
                <div style={{ fontSize: '8px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 700 }}>
                  Legend
                </div>
                {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px' }}>{cfg.emoji}</span>
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', color: visibleTypes[type] ? cfg.color : '#30363d', transition: 'color 0.2s' }}>
                      {cfg.label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <TacticalMap dispatchResult={dispatchResult} />
          )}
        </div>
      </div>
    </div>
  );
}