from typing import TypedDict, List, Optional


class EmergencyState(TypedDict):
    # ── Incident ───────────────────────────────────────────────
    incident_type: str
    casualties: int
    severity: int
    incident_location: str
    incident_lat: Optional[float]
    incident_lng: Optional[float]

    # ── Police ────────────────────────────────────────────────
    police_required: bool
    police_status: str
    selected_police: Optional[str]
    selected_police_eta: Optional[int]
    selected_police_lat: Optional[float]
    selected_police_lng: Optional[float]

    # ── Candidates ────────────────────────────────────────────
    ambulance_candidates: List[str]
    hospital_candidates: List[str]
    route_candidates: List[str]

    # ── Selections ────────────────────────────────────────────
    selected_ambulance: str
    selected_hospital: str
    selected_route: str

    # ── Selected ambulance coordinates ────────────────────────
    selected_ambulance_lat: Optional[float]
    selected_ambulance_lng: Optional[float]

    # ── Route output ──────────────────────────────────────────
    route_geometry: Optional[dict]
    real_eta_seconds: Optional[int]
    route_source: Optional[str]

    # ── Escalation ────────────────────────────────────────────
    escalation_status: str

    # ── Final decision ────────────────────────────────────────
    dispatch_decision: str