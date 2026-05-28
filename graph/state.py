from typing import TypedDict, List, Optional


class EmergencyState(TypedDict):
    # ── Incident ───────────────────────────────────────────────
    incident_type: str
    casualties: int
    severity: int
    incident_location: str          # human-readable / node name (kept for NetworkX fallback)
    incident_lat: Optional[float]   # device location latitude
    incident_lng: Optional[float]   # device location longitude

    # ── Police ────────────────────────────────────────────────
    police_required: bool
    police_status: str

    # ── Candidates ────────────────────────────────────────────
    ambulance_candidates: List[str]
    hospital_candidates: List[str]
    route_candidates: List[str]

    # ── Selections ────────────────────────────────────────────
    selected_ambulance: str
    selected_hospital: str
    selected_route: str             # human-readable string for dispatch_decision text

    # ── Selected ambulance coordinates (set by ambulance agent) ──
    selected_ambulance_lat: Optional[float]
    selected_ambulance_lng: Optional[float]

    # ── Route output (structured, for dispatch_logs + map) ───
    route_geometry: Optional[dict]  # GeoJSON LineString or None
    real_eta_seconds: Optional[int]
    route_source: Optional[str]     # "ORS" | "NetworkX"

    # ── Escalation ────────────────────────────────────────────
    escalation_status: str

    # ── Final decision ────────────────────────────────────────
    dispatch_decision: str