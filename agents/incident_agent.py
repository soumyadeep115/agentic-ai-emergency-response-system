from graph.state import EmergencyState


def assess_incident(state: EmergencyState):
    severity = state["casualties"] * 2

    if state["incident_type"] == "road_accident":
        severity += 3
    elif state["incident_type"] == "fire":
        severity += 4
    elif state["incident_type"] == "medical":
        severity += 2

    state["severity"] = severity

    return state