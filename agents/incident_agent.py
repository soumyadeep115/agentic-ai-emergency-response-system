from graph.state import EmergencyState


def assess_incident(state: EmergencyState):

    casualties = state.get("casualties", 0)
    incident_type = state.get("incident_type", "unknown")

    severity = casualties * 2

    if incident_type == "road_accident":
        severity += 3
    elif incident_type == "fire":
        severity += 4
    elif incident_type == "medical":
        severity += 2
    else:
        severity += 1

    state["severity"] = severity

    return state