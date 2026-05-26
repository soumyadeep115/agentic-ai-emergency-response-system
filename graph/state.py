from typing import TypedDict, List


class EmergencyState(TypedDict):
    incident_type: str
    casualties: int
    severity: int
    incident_location: str

    police_required: bool
    police_status: str

    ambulance_candidates: List[str]
    hospital_candidates: List[str]
    route_candidates: List[str]

    selected_ambulance: str
    selected_hospital: str
    selected_route: str

    escalation_status: str

    dispatch_decision: str