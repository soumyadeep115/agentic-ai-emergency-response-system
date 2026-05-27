from graph.state import EmergencyState


def escalate_emergency(state: EmergencyState):

    if "selected_hospital" not in state or state["selected_hospital"] == "Unavailable":
        state["escalation_status"] = (
            "No viable hospital capacity. Escalating to regional emergency network."
        )
    else:
        state["escalation_status"] = (
            "Hospital allocation successful. No escalation required."
        )

    return state