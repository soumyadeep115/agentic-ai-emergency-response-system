import React, { useState } from 'react';

/* ─────────────────────────────────────────────
   Inline styles — all colours sourced from the
   existing tailwind.config / index.css tokens.
   No new dependencies required.
───────────────────────────────────────────── */

const BASE      = '#0d1117';
const PANEL     = '#161b22';
const BORDER    = '#21262d';
const PRIMARY   = '#e6edf3';
const SECONDARY = '#8b949e';
const MUTED     = '#484f58';
const AMBER     = '#f97316';
const RED       = '#ef4444';
const GREEN     = '#3fb950';

const styles = {
  root: {
    minHeight:       '100vh',
    background:      BASE,
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    justifyContent:  'center',
    fontFamily:      "'Inter', system-ui, sans-serif",
    WebkitFontSmoothing: 'antialiased',
    position:        'relative',
    overflow:        'hidden',
  },

  /* subtle grid overlay */
  grid: {
    position:        'absolute',
    inset:           0,
    backgroundImage: `
      linear-gradient(rgba(249,115,22,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(249,115,22,0.03) 1px, transparent 1px)
    `,
    backgroundSize:  '48px 48px',
    pointerEvents:   'none',
  },

  /* radial amber glow behind the cards */
  glow: {
    position:        'absolute',
    top:             '50%',
    left:            '50%',
    transform:       'translate(-50%, -50%)',
    width:           '600px',
    height:          '400px',
    background:      'radial-gradient(ellipse at center, rgba(249,115,22,0.07) 0%, transparent 70%)',
    pointerEvents:   'none',
  },

  content: {
    position:        'relative',
    zIndex:          1,
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    gap:             '48px',
    padding:         '32px 24px',
    width:           '100%',
    maxWidth:        '720px',
  },

  /* ── Header ── */
  header: {
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    gap:             '12px',
    textAlign:       'center',
  },
  logoRow: {
    display:         'flex',
    alignItems:      'center',
    gap:             '10px',
  },
  logoBox: {
    width:           '36px',
    height:          '36px',
    borderRadius:    '4px',
    background:      'rgba(249,115,22,0.12)',
    border:          `1px solid rgba(249,115,22,0.35)`,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
  },
  brandName: {
    fontSize:        '22px',
    fontWeight:      700,
    color:           PRIMARY,
    letterSpacing:   '-0.02em',
  },
  tagline: {
    fontSize:        '11px',
    color:           MUTED,
    textTransform:   'uppercase',
    letterSpacing:   '0.18em',
    fontWeight:      600,
  },
  divider: {
    width:           '1px',
    height:          '20px',
    background:      BORDER,
  },
  systemBadge: {
    display:         'flex',
    alignItems:      'center',
    gap:             '6px',
    fontSize:        '10px',
    fontFamily:      'monospace',
    color:           GREEN,
    letterSpacing:   '0.1em',
  },
  dotGreen: {
    width:           '6px',
    height:          '6px',
    borderRadius:    '50%',
    background:      GREEN,
    boxShadow:       `0 0 6px ${GREEN}`,
    flexShrink:      0,
    animation:       'pulse-dot 2s ease-in-out infinite',
  },
  headline: {
    marginTop:       '8px',
    fontSize:        '28px',
    fontWeight:      700,
    color:           PRIMARY,
    letterSpacing:   '-0.025em',
    lineHeight:      1.2,
  },
  sub: {
    fontSize:        '13px',
    color:           SECONDARY,
    maxWidth:        '380px',
    lineHeight:      1.6,
  },

  /* ── Cards row ── */
  cardsRow: {
    display:         'flex',
    gap:             '20px',
    width:           '100%',
    justifyContent:  'center',
    flexWrap:        'wrap',
  },
};

/* ── Portal card ── */
function PortalCard({ id, icon, title, description, accent, accentRgb, label, onClick }) {
  const [hovered, setHovered] = useState(false);

  const cardStyle = {
    flex:            '1 1 260px',
    maxWidth:        '280px',
    background:      hovered
      ? `rgba(${accentRgb}, 0.06)`
      : PANEL,
    border:          `1px solid ${hovered ? `rgba(${accentRgb}, 0.45)` : BORDER}`,
    borderRadius:    '6px',
    padding:         '28px 24px',
    cursor:          'pointer',
    display:         'flex',
    flexDirection:   'column',
    gap:             '18px',
    transition:      'background 0.2s ease, border-color 0.2s ease, transform 0.18s ease, box-shadow 0.2s ease',
    transform:       hovered ? 'translateY(-3px)' : 'translateY(0)',
    boxShadow:       hovered
      ? `0 8px 32px rgba(${accentRgb}, 0.15), 0 0 0 1px rgba(${accentRgb}, 0.1)`
      : '0 2px 8px rgba(0,0,0,0.3)',
    userSelect:      'none',
  };

  const iconBoxStyle = {
    width:           '44px',
    height:          '44px',
    borderRadius:    '5px',
    background:      `rgba(${accentRgb}, 0.10)`,
    border:          `1px solid rgba(${accentRgb}, 0.28)`,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
    transition:      'background 0.2s ease',
  };

  const btnStyle = {
    marginTop:       'auto',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    padding:         '9px 14px',
    borderRadius:    '4px',
    background:      hovered ? `rgba(${accentRgb}, 0.18)` : `rgba(${accentRgb}, 0.08)`,
    border:          `1px solid rgba(${accentRgb}, ${hovered ? '0.55' : '0.25'})`,
    color:           accent,
    fontSize:        '11px',
    fontWeight:      700,
    letterSpacing:   '0.1em',
    textTransform:   'uppercase',
    fontFamily:      'monospace',
    transition:      'background 0.15s ease, border-color 0.15s ease',
  };

  return (
    <div
      id={id}
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Enter ${title}`}
    >
      {/* Icon + title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={iconBoxStyle}>{icon}</div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: PRIMARY, letterSpacing: '-0.01em', marginBottom: '6px' }}>
            {title}
          </div>
          <div style={{ fontSize: '11px', color: SECONDARY, lineHeight: 1.65 }}>
            {description}
          </div>
        </div>
      </div>

      {/* CTA row */}
      <div style={btnStyle}>
        <span>{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
    </div>
  );
}

/* ── Footer strip ── */
function Footer() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {[
        { dot: GREEN,  label: 'FastAPI Backend',  val: 'LIVE'      },
        { dot: GREEN,  label: 'LangGraph Engine', val: 'v0.2.x'     },
        { dot: GREEN,  label: 'MPU-6050 Node',    val: 'NODE-A7'    },
        { dot: MUTED,  label: 'Region',           val: 'Mumbai · IN' },
      ].map(({ dot, label, val }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0 }} />
          <span style={{ fontSize: '9px', color: MUTED, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
            {label}
          </span>
          <span style={{ fontSize: '9px', color: '#30363d', margin: '0 2px' }}>·</span>
          <span style={{ fontSize: '9px', color: MUTED, fontFamily: 'monospace' }}>{val}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main component
══════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <div style={styles.root}>
      {/* Background decoration */}
      <div style={styles.grid} aria-hidden="true" />
      <div style={styles.glow}  aria-hidden="true" />

      {/* Keyframe for pulsing dot (injected once) */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      <div style={styles.content}>

        {/* ── Header ── */}
        <header style={styles.header}>
          <div style={styles.logoRow}>
            {/* Brand */}
            <div style={styles.logoBox}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <span style={styles.brandName}>RoadSoS</span>
            <div style={styles.divider} />
            <span style={styles.tagline}>Dispatch Orchestrator</span>
          </div>

          {/* System online badge */}
          <div style={styles.systemBadge}>
            <span style={styles.dotGreen} />
            SYSTEM ONLINE
          </div>

          <h1 style={styles.headline}>Select Your Portal</h1>
          <p style={styles.sub}>
            Choose your access level to enter the RoadSoS tactical environment.
          </p>
        </header>

        {/* ── Choice cards ── */}
        <main style={styles.cardsRow} aria-label="Portal selection">
          <PortalCard
            id="portal-admin"
            accent={AMBER}
            accentRgb="249,115,22"
            title="Admin Portal"
            description="Full access to the tactical dashboard — accident analytics, live map, dispatch control, and performance reports."
            label="Enter Dashboard"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            }
            onClick={() => { window.location.hash = '/admin'; }}
          />

          <PortalCard
            id="portal-user"
            accent="#58a6ff"
            accentRgb="88,166,255"
            title="User Portal"
            description="Live resource map showing all active ambulances, police stations, repair shops and tow services. Fetches from the live backend."
            label="Enter User View"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            }
            onClick={() => { window.location.hash = '/user'; }}
          />
        </main>

        {/* ── Footer ── */}
        <footer>
          <Footer />
        </footer>

      </div>
    </div>
  );
}
