import React, { useState, useEffect } from 'react';

// ── Existing dashboard components (untouched) ──────────────────────────────
import Sidebar from './components/Sidebar.jsx';
import AccidentDashboard from './views/AccidentDashboard.jsx';
import LiveTacticalMap from './views/LiveTacticalMap.jsx';
import PerformanceReports from './views/PerformanceReports.jsx';
import ResourceAdmin from './views/ResourceAdmin.jsx';

// ── New landing page + user portal ──────────────────────────────────────────
import LandingPage from './components/LandingPage.jsx';
import UserPortalView from './views/UserPortal.jsx';

// ───────────────────────────────────────────────────────────────────────────
// Lightweight hash-based router
// Reads window.location.hash, strips the leading '#', defaults to '/'
// ───────────────────────────────────────────────────────────────────────────
function getPath() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  return hash;
}

// ── Dashboard sub-views ──────────────────────────────────────────────────
const VIEWS = {
  dashboard:        AccidentDashboard,
  map:              LiveTacticalMap,
  reports:          PerformanceReports,
  'resource-admin': ResourceAdmin,
};

const VIEW_LABELS = {
  dashboard:        { title: 'ACCIDENT DASHBOARD', crumb: 'Analytics & Hotspots'  },
  map:              { title: 'LIVE TACTICAL MAP',   crumb: 'Operational Core'      },
  reports:          { title: 'PERFORMANCE REPORTS', crumb: 'SLA Metrics & Logs'    },
  'resource-admin': { title: 'RESOURCE MANAGER',    crumb: 'Field Unit Registry'   },
};

// ── Admin dashboard shell ───────────────────────────────────────────────────
function AdminDashboard() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [systemTime,  setSystemTime]  = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setSystemTime(
        now.toLocaleTimeString('en-IN', {
          hour12: false, timeZone: 'Asia/Kolkata',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }) + ' IST'
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const ViewComponent = VIEWS[currentView] ?? AccidentDashboard;
  const { title, crumb } = VIEW_LABELS[currentView] ?? VIEW_LABELS.dashboard;

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        systemTime={systemTime}
      />

      {/* Main workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 h-10 border-b border-border bg-panel flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted font-mono uppercase tracking-wider">
              RoadSoS
            </span>
            <span className="text-muted">/</span>
            <span className="text-[11px] font-semibold text-primary tracking-wide">{title}</span>
            <span className="text-muted mx-1">·</span>
            <span className="text-[10px] text-secondary">{crumb}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Active incidents badge */}
            <div className="flex items-center gap-1.5">
              <span className="dot-red animate-pulse"></span>
              <span className="text-[10px] font-mono text-accent-red font-semibold">3 ACTIVE</span>
            </div>
            {/* User Portal link */}
            <a
              href="#/user"
              className="text-[9px] font-mono text-muted hover:text-primary border border-border hover:border-muted rounded-[3px] px-2 py-1 transition-all"
            >
              User Portal →
            </a>
            {/* Mumbai / Region */}
            <div className="flex items-center gap-1.5 border-l border-border pl-4">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span className="text-[10px] text-muted font-mono">Mumbai / Thane · IN</span>
            </div>
            <div className="font-mono text-[10px] text-secondary tabular-nums">{systemTime}</div>
          </div>
        </header>

        {/* View workspace */}
        <main className="flex-1 overflow-hidden animate-fade-in" key={currentView}>
          <ViewComponent />
        </main>
      </div>
    </div>
  );
}

// ── User portal (live resource map) ────────────────────────────────────────
function UserPortal() {
  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Minimal top bar */}
        <header className="flex-shrink-0 h-10 border-b border-border bg-panel flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted font-mono uppercase tracking-wider">RoadSoS</span>
            <span className="text-muted">/</span>
            <span className="text-[11px] font-semibold text-primary tracking-wide">LIVE RESOURCE MAP</span>
            <span className="text-muted mx-1">·</span>
            <span className="text-[10px] text-secondary">Emergency Services</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="dot-green animate-pulse-slow"></span>
            <span className="text-[9px] font-mono text-accent-green">GET /api/v1/resources</span>
            <a
              href="#/admin"
              className="text-[9px] font-mono text-muted hover:text-primary border border-border hover:border-muted rounded-[3px] px-2 py-1 transition-all ml-3"
            >
              ← Admin
            </a>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          <UserPortalView />
        </main>
      </div>
    </div>
  );
}

// ── Root app — hash router ──────────────────────────────────────────────────
export default function App() {
  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const onHashChange = () => setPath(getPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  switch (path) {
    case '/admin':
      return <AdminDashboard />;
    case '/user':
      return <UserPortal />;
    default:
      // '/' and any unknown fragment → landing page
      return <LandingPage />;
  }
}
