import React, { useState } from 'react';
import { emergencyLogs } from '../data/mockData.js';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Accident Dashboard',
    sub: 'Analytics & Hotspots',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    id: 'map',
    label: 'Live Tactical Map',
    sub: 'Operational Core',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
      </svg>
    ),
  },
  {
    id: 'reports',
    label: 'Performance Reports',
    sub: 'SLA Metrics Logs',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
  },
  {
    id: 'resource-admin',
    label: 'Resource Manager',
    sub: 'Add & Edit Field Units',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
];

/* ── Emergency icon (crosshair / target) ── */
const EmergencyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="22" y1="12" x2="18" y2="12"/>
    <line x1="6" y1="12" x2="2" y2="12"/>
    <line x1="12" y1="6" x2="12" y2="2"/>
    <line x1="12" y1="22" x2="12" y2="18"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

/* ── Chevron that rotates when open ── */
const Chevron = ({ open }) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: 'transform 0.25s ease',
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
      flexShrink: 0,
    }}
  >
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export default function Sidebar({ currentView, setCurrentView, systemTime }) {
  /* ── Emergency dropdown state ── */
  const [emergencyOpen, setEmergencyOpen]   = useState(false);
  const [longitude,     setLongitude]       = useState('');
  const [latitude,      setLatitude]        = useState('');
  const [feedback,      setFeedback]        = useState(null); // null | 'ok' | 'err'

  const handleEmergencySubmit = (e) => {
    e.preventDefault();
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lng) || isNaN(lat)) {
      setFeedback('err');
      setTimeout(() => setFeedback(null), 2500);
      return;
    }

    emergencyLogs.push({
      longitude: lng,
      latitude:  lat,
      timestamp: new Date().toISOString(),
    });

    console.info('[Emergency] Logged coordinate:', { longitude: lng, latitude: lat });
    setLongitude('');
    setLatitude('');
    setFeedback('ok');
    setTimeout(() => setFeedback(null), 2500);
  };

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col bg-panel border-r border-border">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-[3px] bg-accent-amber/15 border border-accent-amber/40 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-primary tracking-tight">RoadSoS</div>
            <div className="text-[9px] text-muted uppercase tracking-widest">Dispatch Orchestrator</div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="dot-green animate-pulse-slow"></span>
          <span className="text-[10px] font-mono text-accent-green tracking-wider">SYSTEM ONLINE</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        <div className="px-4 py-2 label-xs">Navigation</div>

        {/* ── Existing 3 nav items (unchanged) ── */}
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            onClick={() => setCurrentView(item.id)}
            className={currentView === item.id ? 'nav-active w-full text-left' : 'nav-inactive w-full text-left'}
          >
            <span className={currentView === item.id ? 'text-accent-amber' : 'text-muted'}>
              {item.icon}
            </span>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold leading-tight truncate">{item.label}</div>
              <div className="text-[9px] text-muted mt-0.5">{item.sub}</div>
            </div>
          </button>
        ))}

        {/* ── 4th item: Emergency (accordion trigger) ── */}
        <button
          id="nav-emergency"
          onClick={() => setEmergencyOpen((o) => !o)}
          className="nav-inactive w-full text-left"
          style={{ color: emergencyOpen ? '#ef4444' : undefined }}
        >
          <span style={{ color: emergencyOpen ? '#ef4444' : undefined, transition: 'color 0.2s' }}>
            <EmergencyIcon />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold leading-tight truncate">Emergency</div>
            <div className="text-[9px] text-muted mt-0.5">Log Coordinates</div>
          </div>
          <span className={emergencyOpen ? 'text-accent-red' : 'text-muted'}>
            <Chevron open={emergencyOpen} />
          </span>
        </button>

        {/* ── Inline dropdown form (smooth height transition) ── */}
        <div
          id="emergency-dropdown"
          style={{
            maxHeight:  emergencyOpen ? '220px' : '0px',
            opacity:    emergencyOpen ? 1 : 0,
            overflow:   'hidden',
            transition: 'max-height 0.3s ease, opacity 0.25s ease',
          }}
        >
          <form
            onSubmit={handleEmergencySubmit}
            style={{
              margin:       '0 8px 6px',
              padding:      '10px',
              background:   'rgba(239,68,68,0.06)',
              border:       '1px solid rgba(239,68,68,0.22)',
              borderRadius: '4px',
            }}
          >
            {/* Longitude row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px' }}>
              <label
                htmlFor="emergency-lng"
                style={{ fontSize: '10px', color: 'var(--color-secondary, #8b949e)', minWidth: '58px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}
              >
                Longitude
              </label>
              <input
                id="emergency-lng"
                type="number"
                step="any"
                placeholder="e.g. 72.8777"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                required
                style={{
                  flex:        1,
                  background:  'rgba(255,255,255,0.04)',
                  border:      '1px solid rgba(255,255,255,0.10)',
                  borderRadius:'3px',
                  color:       'var(--color-primary, #e6edf3)',
                  fontSize:    '10px',
                  padding:     '4px 6px',
                  outline:     'none',
                  fontFamily:  'monospace',
                  minWidth:    0,
                }}
                onFocus={(e)  => { e.target.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                onBlur={(e)   => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; }}
              />
            </div>

            {/* Latitude row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <label
                htmlFor="emergency-lat"
                style={{ fontSize: '10px', color: 'var(--color-secondary, #8b949e)', minWidth: '58px', letterSpacing: '0.04em' }}
              >
                Latitude
              </label>
              <input
                id="emergency-lat"
                type="number"
                step="any"
                placeholder="e.g. 19.0760"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                required
                style={{
                  flex:        1,
                  background:  'rgba(255,255,255,0.04)',
                  border:      '1px solid rgba(255,255,255,0.10)',
                  borderRadius:'3px',
                  color:       'var(--color-primary, #e6edf3)',
                  fontSize:    '10px',
                  padding:     '4px 6px',
                  outline:     'none',
                  fontFamily:  'monospace',
                  minWidth:    0,
                }}
                onFocus={(e)  => { e.target.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                onBlur={(e)   => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; }}
              />
            </div>

            {/* Submit button + feedback */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                id="emergency-submit"
                type="submit"
                style={{
                  flex:           1,
                  fontSize:       '10px',
                  fontWeight:     600,
                  letterSpacing:  '0.08em',
                  textTransform:  'uppercase',
                  padding:        '5px 0',
                  borderRadius:   '3px',
                  border:         '1px solid rgba(239,68,68,0.5)',
                  background:     'rgba(239,68,68,0.15)',
                  color:          '#ef4444',
                  cursor:         'pointer',
                  transition:     'background 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background    = 'rgba(239,68,68,0.28)';
                  e.currentTarget.style.borderColor   = 'rgba(239,68,68,0.75)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background    = 'rgba(239,68,68,0.15)';
                  e.currentTarget.style.borderColor   = 'rgba(239,68,68,0.5)';
                }}
              >
                Log
              </button>

              {/* Inline feedback */}
              {feedback === 'ok' && (
                <span style={{ fontSize: '9px', color: '#3fb950', fontFamily: 'monospace' }}>✓ Logged</span>
              )}
              {feedback === 'err' && (
                <span style={{ fontSize: '9px', color: '#ef4444', fontFamily: 'monospace' }}>Invalid coords</span>
              )}
            </div>
          </form>
        </div>
      </nav>

      {/* System Status Footer */}
      <div className="border-t border-border px-3 py-3 space-y-1.5">
        <div className="label-xs mb-1.5">System Status</div>
        {[
          { label: 'FastAPI Backend',   status: 'ok',  val: ':8000' },
          { label: 'LangGraph Engine',  status: 'ok',  val: 'v0.2.x' },
          { label: 'MPU-6050 Node',     status: 'ok',  val: 'NODE-A7' },
          { label: 'DB Connection',     status: 'ok',  val: 'PostgreSQL' },
        ].map(({ label, status, val }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={status === 'ok' ? 'dot-green' : 'dot-red'}></span>
              <span className="text-[10px] text-secondary">{label}</span>
            </div>
            <span className="text-[9px] font-mono text-muted">{val}</span>
          </div>
        ))}
        <div className="pt-1.5 mt-1 border-t border-border/50">
          <div className="font-mono text-[9px] text-muted tabular-nums">{systemTime}</div>
        </div>
      </div>
    </aside>
  );
}
