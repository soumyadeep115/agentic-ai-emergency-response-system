from typing import TypedDict
from langgraph.graph import StateGraph, END
from graph.state import EmergencyState
from agents.incident_agent import assess_incident
from agents.ambulance_agent import allocate_ambulance
from agents.hospital_agent import evaluate_hospital
from agents.route_agent import plan_route
from agents.police_agent import coordinate_police
from agents.escalation_agent import escalate_emergency

# -------------------------
# Node: Decide dispatch
# -------------------------
def dispatch_decision(state: EmergencyState):

    best_ambulance = state["ambulance_candidates"][0]
    best_hospital = state["hospital_candidates"][0]
    best_route = state["route_candidates"][0]

    state["selected_ambulance"] = best_ambulance
    state["selected_hospital"] = best_hospital
    state["selected_route"] = best_route

    state["dispatch_decision"] = (
        f"Dispatch {best_ambulance} "
        f"to transport patient via {best_route} "
        f"to {best_hospital}"
    )

    return state

# -------------------------
# Node: route severity
# -------------------------
def route_severity(state: EmergencyState):
    if state["severity"] >= 8:
        return "critical"
    return "normal"

# -------------------------
# Node: Hospital capacity check
# -------------------------
def route_hospital_capacity(state: EmergencyState):

    best_hospital = state["hospital_candidates"][0]

    beds = int(
        best_hospital.split("Beds: ")[1].split(",")[0]
    )

    if beds < 20:
        return "overloaded"

    return "available"

# -------------------------
# Edges of graph
# -------------------------
builder = StateGraph(EmergencyState)

builder.add_node("assess_incident", assess_incident)
builder.add_node("allocate_ambulance", allocate_ambulance)
builder.add_node("evaluate_hospital", evaluate_hospital)
builder.add_node("plan_route", plan_route)
builder.add_node("dispatch_decision", dispatch_decision)
builder.add_node("coordinate_police", coordinate_police)
builder.add_node("escalate_emergency", escalate_emergency)

builder.set_entry_point("assess_incident")

builder.add_conditional_edges(
    "assess_incident",
    route_severity,
    {
        "critical": "coordinate_police",
        "normal": "allocate_ambulance"
    }
)
builder.add_conditional_edges(
    "evaluate_hospital",
    route_hospital_capacity,
    {
        "available": "plan_route",
        "overloaded": "escalate_emergency"
    }
)
builder.add_edge("allocate_ambulance", "evaluate_hospital")
builder.add_edge("plan_route", "dispatch_decision")
builder.add_edge("coordinate_police", "allocate_ambulance")
builder.add_edge("escalate_emergency", "plan_route")
builder.add_edge("dispatch_decision", END)

graph = builder.compile()


# -------------------------
# Dispatch function
# -------------------------
def run_dispatch(initial_state):
    return graph.invoke(initial_state)


# -------------------------
# Local test run
# -------------------------
if __name__ == "__main__":

    initial_state = {
        "incident_type": "road_accident",
        "casualties": 3,
        "incident_location": "Incident_B",
        "severity": 0,
        "dispatch_decision": ""
    }

    result = run_dispatch(initial_state)

    print(result)