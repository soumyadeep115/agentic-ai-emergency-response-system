import React from 'react';

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
];

export default function Sidebar({ currentView, setCurrentView, systemTime }) {
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
      <nav className="flex-1 py-2">
        <div className="px-4 py-2 label-xs">Navigation</div>
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
