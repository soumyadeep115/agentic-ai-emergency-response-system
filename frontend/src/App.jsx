import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import AccidentDashboard from './views/AccidentDashboard.jsx';
import LiveTacticalMap from './views/LiveTacticalMap.jsx';
import PerformanceReports from './views/PerformanceReports.jsx';

const VIEWS = {
  dashboard: AccidentDashboard,
  map: LiveTacticalMap,
  reports: PerformanceReports,
};

const VIEW_LABELS = {
  dashboard: { title: 'ACCIDENT DASHBOARD', crumb: 'Analytics & Hotspots' },
  map: { title: 'LIVE TACTICAL MAP', crumb: 'Operational Core' },
  reports: { title: 'PERFORMANCE REPORTS', crumb: 'SLA Metrics & Logs' },
};

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [systemTime, setSystemTime] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setSystemTime(now.toLocaleTimeString('en-IN', {
        hour12: false, timeZone: 'Asia/Kolkata',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }) + ' IST');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const ViewComponent = VIEWS[currentView];
  const { title, crumb } = VIEW_LABELS[currentView];

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
            {/* Mumbai / Region */}
            <div className="flex items-center gap-1.5 border-l border-border pl-4">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
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
