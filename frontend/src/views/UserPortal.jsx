import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getResources } from '../services/api.js';

// ─────────────────────────────────────────────────────────────────────────────
// Marker icon styles injected once
// ─────────────────────────────────────────────────────────────────────────────
const PORTAL_STYLE_ID = 'roadsos-portal-icons';
function injectPortalIconStyles() {
  if (document.getElementById(PORTAL_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = PORTAL_STYLE_ID;
  s.textContent = `
    .rp-marker {
      display: flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 50%;
      font-size: 14px; font-weight: 700;
      box-shadow: 0 0 12px rgba(0,0,0,0.5);
      border: 2px solid;
      transition: transform 0.2s;
    }
    .rp-hospital  { background:#0d2d1a; border-color:#3fb950; box-shadow:0 0 10px rgba(63,185,80,0.4); }
    .rp-police    { background:#0d1d38; border-color:#58a6ff; box-shadow:0 0 10px rgba(88,166,255,0.4); }
    .rp-ambulance { background:#2d1a08; border-color:#f97316; box-shadow:0 0 10px rgba(249,115,22,0.4); }
    .rp-repair    { background:#2d250a; border-color:#d29922; box-shadow:0 0 10px rgba(210,153,34,0.4); }
    .rp-tow       { background:#1e0d38; border-color:#8b5cf6; box-shadow:0 0 10px rgba(139,92,246,0.4); }
    .rp-offline   { opacity: 0.45; filter: grayscale(0.7); }
    /* Popup dark theme override */
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

// Resource type → icon / class / color
const TYPE_CONFIG = {
  hospitals:    { cls: 'rp-hospital',  emoji: '✚',  color: '#3fb950', label: 'Hospital'      },
  police:       { cls: 'rp-police',    emoji: '🛡',  color: '#58a6ff', label: 'Police Station' },
  ambulances:   { cls: 'rp-ambulance', emoji: '🚑',  color: '#f97316', label: 'Ambulance Hub'  },
  repair_shops: { cls: 'rp-repair',    emoji: '🔧',  color: '#d29922', label: 'Repair Shop'    },
  tow_services: { cls: 'rp-tow',       emoji: '🚛',  color: '#8b5cf6', label: 'Tow Service'    },
};

const STATUS_COLOR = {
  available: '#3fb950',
  busy:      '#f97316',
  offline:   '#484f58',
};

// ─────────────────────────────────────────────────────────────────────────────
// Leaflet map wrapper
// ─────────────────────────────────────────────────────────────────────────────
function ResourceMap({ resources, visibleTypes, loading }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef([]);

  // Init map once
  useEffect(() => {
    const L = window.L;
    if (!L || mapRef.current || !containerRef.current) return;
    injectPortalIconStyles();

    const map = L.map(containerRef.current, {
      center: [19.13, 72.92],
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Sync markers when resources/visibility changes
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
        const lat = item.latitude  ?? item.lat;
        const lng = item.longitude ?? item.lng;
        if (!lat || !lng) return;

        const isOffline = item.status === 'offline';
        const icon = L.divIcon({
          className: '',
          html: `<div class="rp-marker ${cfg.cls} ${isOffline ? 'rp-offline' : ''}">${cfg.emoji}</div>`,
          iconSize:   [30, 30],
          iconAnchor: [15, 15],
          popupAnchor:[0, -18],
        });

        const m = L.marker([lat, lng], { icon });

        const statusBadge = `<span style="color:${STATUS_COLOR[item.status] ?? '#484f58'};font-weight:700">${(item.status ?? 'unknown').toUpperCase()}</span>`;
        m.bindPopup(`
          <div style="min-width:160px">
            <div style="font-size:12px;font-weight:700;color:${cfg.color};margin-bottom:4px">${item.name ?? item.id}</div>
            <div style="color:#8b949e;font-size:10px;margin-bottom:6px">${cfg.label}</div>
            <div style="display:flex;justify-content:space-between;font-size:10px">
              <span style="color:#484f58">ID</span>
              <span style="color:#e6edf3">${item.id}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px">
              <span style="color:#484f58">Coords</span>
              <span style="color:#e6edf3">${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;margin-top:4px">
              <span style="color:#484f58">Status</span>
              ${statusBadge}
            </div>
          </div>
        `);
        m.addTo(map);
        markersRef.current.push(m);
      });
    });
  }, [resources, visibleTypes]);

  useEffect(() => {
    if (mapRef.current) syncMarkers();
  }, [syncMarkers]);

  useEffect(() => {
    const id = setTimeout(() => syncMarkers(), 600);
    return () => clearTimeout(id);
  }, [syncMarkers]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#080d14' }} />
      {loading && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(13,17,23,0.7)', zIndex: 999, pointerEvents: 'none',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: '2px solid #30363d', borderTopColor: '#58a6ff',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 10px',
              }}
            />
            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#8b949e' }}>
              Fetching resources from /api/v1/resources…
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resource list sidebar
// ─────────────────────────────────────────────────────────────────────────────
function ResourceList({ resources, visibleTypes, onToggle }) {
  const totalItems = Object.values(resources).reduce((s, a) => s + a.length, 0);
  const availableItems = Object.values(resources).flat().filter(r => r.status === 'available').length;

  return (
    <div
      style={{
        width: '280px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #21262d',
        background: '#161b22',
        overflow: 'hidden',
      }}
    >
      {/* Header stats */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #21262d' }}>
        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#484f58', fontWeight: 600, marginBottom: '8px' }}>
          Live Resources
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, background: '#0d1117', border: '1px solid #21262d', borderRadius: '3px', padding: '6px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#e6edf3', fontFamily: 'monospace' }}>{totalItems}</div>
            <div style={{ fontSize: '8px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</div>
          </div>
          <div style={{ flex: 1, background: '#0d1117', border: '1px solid rgba(63,185,80,0.2)', borderRadius: '3px', padding: '6px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#3fb950', fontFamily: 'monospace' }}>{availableItems}</div>
            <div style={{ fontSize: '8px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Available</div>
          </div>
        </div>
      </div>

      {/* Type toggles + item list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const items = resources[type] ?? [];
          const visible = visibleTypes[type];
          const availCount = items.filter(i => i.status === 'available').length;

          return (
            <div key={type}>
              {/* Type header row (toggle) */}
              <button
                id={`toggle-${type}`}
                onClick={() => onToggle(type)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  background: visible ? `rgba(${cfg.color.replace('#','').match(/.{2}/g).map(h=>parseInt(h,16)).join(',')},0.06)` : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: '14px' }}>{cfg.emoji}</span>
                <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: visible ? cfg.color : '#484f58', transition: 'color 0.15s' }}>
                    {cfg.label}
                  </div>
                  <div style={{ fontSize: '8px', color: '#484f58', fontFamily: 'monospace' }}>
                    {items.length} total · {availCount} avail
                  </div>
                </div>
                {/* Toggle pill */}
                <div
                  style={{
                    width: '28px',
                    height: '14px',
                    borderRadius: '7px',
                    background: visible ? cfg.color : '#21262d',
                    position: 'relative',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: visible ? '16px' : '2px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s',
                    }}
                  />
                </div>
              </button>

              {/* Items */}
              {visible && items.length > 0 && (
                <div style={{ paddingBottom: '4px' }}>
                  {items.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '5px 14px 5px 36px',
                        borderTop: '1px solid #21262d20',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: STATUS_COLOR[item.status] ?? '#484f58',
                          flexShrink: 0,
                          marginTop: '4px',
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '10px', color: '#e6edf3', fontWeight: 600, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name ?? item.id}
                        </div>
                        <div style={{ fontSize: '8px', color: '#484f58', fontFamily: 'monospace' }}>
                          {Number(item.latitude ?? item.lat).toFixed(4)}, {Number(item.longitude ?? item.lng).toFixed(4)}
                        </div>
                      </div>
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: '7px',
                          fontFamily: 'monospace',
                          color: STATUS_COLOR[item.status] ?? '#484f58',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          flexShrink: 0,
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {visible && items.length === 0 && (
                <div style={{ padding: '4px 14px 8px 36px', fontSize: '9px', color: '#30363d', fontFamily: 'monospace' }}>
                  No records from backend
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main UserPortal view
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_VISIBLE = { hospitals: true, police: true, ambulances: true, repair_shops: true, tow_services: true };
const EMPTY_RESOURCES  = { hospitals: [], police: [], ambulances: [], repair_shops: [], tow_services: [] };

export default function UserPortal() {
  const [resources,    setResources]    = useState(EMPTY_RESOURCES);
  const [visibleTypes, setVisibleTypes] = useState(INITIAL_VISIBLE);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState(null);
  const [lastFetched,  setLastFetched]  = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const { data, error } = await getResources();
    if (data) {
      setResources({
        hospitals:    data.hospitals    ?? [],
        police:       data.police       ?? [],
        ambulances:   data.ambulances   ?? [],
        repair_shops: data.repair_shops ?? [],
        tow_services: data.tow_services ?? [],
      });
      setLastFetched(new Date().toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' }));
    } else {
      setFetchError(error ?? 'Backend offline');
    }
    setLoading(false);
  }, []);

  // Fetch on mount + poll every 30s
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const handleToggle = useCallback((type) => {
    setVisibleTypes(prev => ({ ...prev, [type]: !prev[type] }));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0d1117' }}>
      {/* Top bar */}
      <div
        style={{
          flexShrink: 0,
          height: '40px',
          borderBottom: '1px solid #21262d',
          background: '#161b22',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: fetchError ? '#ef4444' : '#3fb950',
              display: 'inline-block',
              boxShadow: fetchError ? '0 0 6px #ef444480' : '0 0 6px #3fb95080',
            }}
          />
          <span style={{ fontSize: '9px', fontFamily: 'monospace', color: fetchError ? '#ef4444' : '#3fb950', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {fetchError ? 'Backend Offline' : 'Live Feed · GET /api/v1/resources'}
          </span>
        </div>

        {lastFetched && (
          <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#484f58' }}>
            Last synced: {lastFetched} IST
          </span>
        )}

        <button
          id="user-portal-refresh"
          onClick={fetchData}
          disabled={loading}
          style={{
            marginLeft: 'auto',
            fontSize: '9px',
            fontFamily: 'monospace',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '4px 10px',
            borderRadius: '3px',
            border: '1px solid #30363d',
            background: 'transparent',
            color: loading ? '#484f58' : '#8b949e',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {loading ? '⟳ Syncing…' : '⟳ Refresh'}
        </button>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div
          style={{
            flexShrink: 0,
            padding: '6px 16px',
            background: 'rgba(239,68,68,0.08)',
            borderBottom: '1px solid rgba(239,68,68,0.2)',
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚠</span>
          <span>Could not reach <code>GET /api/v1/resources</code> — {fetchError}. Map will show when backend is available.</span>
        </div>
      )}

      {/* Body: sidebar + map */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <ResourceList resources={resources} visibleTypes={visibleTypes} onToggle={handleToggle} />

        {/* Map */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <ResourceMap resources={resources} visibleTypes={visibleTypes} loading={loading} />

          {/* Legend overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: '52px',
              left: '12px',
              zIndex: 499,
              background: 'rgba(22,27,34,0.92)',
              border: '1px solid #21262d',
              borderRadius: '4px',
              padding: '8px 12px',
              pointerEvents: 'none',
            }}
          >
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
        </div>
      </div>
    </div>
  );
}
