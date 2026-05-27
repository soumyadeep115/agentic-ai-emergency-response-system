/**
 * mockData.js — PURGED
 *
 * All static mock arrays have been removed. Data is now served exclusively
 * from the live FastAPI backend at http://localhost:8000.
 *
 * Real endpoint (api.py):
 *   POST /dispatch  → EmergencyState (graph/state.py)
 *
 * Planned endpoints (not yet implemented on backend):
 *   GET /api/v1/analytics/hotspots   → AccidentDashboard
 *   GET /api/v1/reports/incidents    → PerformanceReports
 *   WS  /api/v1/dispatch/stream      → LiveTacticalMap agent stream
 *
 * Geographic coordinate mapping for NetworkX node IDs lives in:
 *   src/services/api.js → NODE_COORDS
 */

/**
 * emergencyLogs — mutable in-memory store for manually entered emergency coordinates.
 * Populated at runtime by the Sidebar "Emergency" form.
 * Shape: Array<{ longitude: number, latitude: number, timestamp: string }>
 */
export const emergencyLogs = [];
