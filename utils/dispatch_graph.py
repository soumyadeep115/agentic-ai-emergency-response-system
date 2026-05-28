from langgraph.graph import StateGraph, END
from graph.state import EmergencyState
from agents.incident_agent import assess_incident
from agents.ambulance_agent import allocate_ambulance
from agents.hospital_agent import evaluate_hospital
from agents.route_agent import plan_route
from agents.police_agent import coordinate_police
from agents.escalation_agent import escalate_emergency


# ─────────────────────────────────────────────
# Node: Dispatch decision
# ─────────────────────────────────────────────

def dispatch_decision(state: EmergencyState):

    ambulances = state.get("ambulance_candidates", [])
    hospitals  = state.get("hospital_candidates", [])
    routes     = state.get("route_candidates", [])

    if not ambulances:
        state["selected_ambulance"]  = "Unavailable"
        state["dispatch_decision"]   = "Dispatch failed: No ambulances available"
        state["route_geometry"]      = None
        state["real_eta_seconds"]    = 0
        state["route_source"]        = None
        return state

    if not hospitals:
        state["selected_hospital"]   = "Unavailable"
        state["dispatch_decision"]   = "Dispatch failed: No hospitals available"
        state["route_geometry"]      = None
        state["real_eta_seconds"]    = 0
        state["route_source"]        = None
        return state

    if not routes:
        state["selected_route"]      = "Unavailable"
        state["dispatch_decision"]   = "Dispatch failed: No route available"
        state["route_geometry"]      = None
        state["real_eta_seconds"]    = 0
        state["route_source"]        = None
        return state

    best_ambulance = ambulances[0]
    best_hospital  = hospitals[0]
    best_route     = routes[0]

    state["selected_ambulance"] = best_ambulance
    state["selected_hospital"]  = best_hospital
    state["selected_route"]     = best_route

    # route_geometry, real_eta_seconds, route_source already set by plan_route
    # Just build the human-readable decision string
    eta_seconds = state.get("real_eta_seconds", 0)
    route_src   = state.get("route_source", "Unknown")
    eta_display = f"{round(eta_seconds / 60, 1)} min" if eta_seconds else "ETA unknown"

    state["dispatch_decision"] = (
        f"Dispatch {best_ambulance} "
        f"to transport patient via {best_route} "
        f"to {best_hospital} "
        f"[ETA: {eta_display}, Route: {route_src}]"
    )

    return state


# ─────────────────────────────────────────────
# Conditional: severity branch
# ─────────────────────────────────────────────

def route_severity(state: EmergencyState):
    if state.get("severity", 0) >= 8:
        return "critical"
    return "normal"


# ─────────────────────────────────────────────
# Conditional: hospital capacity branch
# ─────────────────────────────────────────────

def route_hospital_capacity(state: EmergencyState):
    hospitals = state.get("hospital_candidates", [])

    if not hospitals:
        return "overloaded"

    best_hospital = hospitals[0]

    try:
        beds = int(best_hospital.split("Beds: ")[1].split(",")[0])
        return "overloaded" if beds < 20 else "available"
    except Exception:
        return "overloaded"


# ─────────────────────────────────────────────
# Graph construction
# ─────────────────────────────────────────────

builder = StateGraph(EmergencyState)

builder.add_node("assess_incident",    assess_incident)
builder.add_node("allocate_ambulance", allocate_ambulance)
builder.add_node("evaluate_hospital",  evaluate_hospital)
builder.add_node("plan_route",         plan_route)
builder.add_node("dispatch_decision",  dispatch_decision)
builder.add_node("coordinate_police",  coordinate_police)
builder.add_node("escalate_emergency", escalate_emergency)

builder.set_entry_point("assess_incident")

builder.add_conditional_edges(
    "assess_incident",
    route_severity,
    {
        "critical": "coordinate_police",
        "normal":   "allocate_ambulance"
    }
)

builder.add_conditional_edges(
    "evaluate_hospital",
    route_hospital_capacity,
    {
        "available":  "plan_route",
        "overloaded": "escalate_emergency"
    }
)

builder.add_edge("allocate_ambulance", "evaluate_hospital")
builder.add_edge("plan_route",         "dispatch_decision")
builder.add_edge("coordinate_police",  "allocate_ambulance")
builder.add_edge("escalate_emergency", "plan_route")
builder.add_edge("dispatch_decision",  END)

graph = builder.compile()


# ─────────────────────────────────────────────
# Dispatch runner
# ─────────────────────────────────────────────

def run_dispatch(initial_state):
    return graph.invoke(initial_state)


# ─────────────────────────────────────────────
# Local test
# ─────────────────────────────────────────────

if __name__ == "__main__":

    initial_state = {
        "incident_type":     "road_accident",
        "casualties":        3,
        "incident_location": "Incident_B",
        "incident_lat":      19.0760,   # real coordinates for ORS
        "incident_lng":      72.8777,
        "severity":          0,
        "dispatch_decision": ""
    }

    result = run_dispatch(initial_state)
    print(result)