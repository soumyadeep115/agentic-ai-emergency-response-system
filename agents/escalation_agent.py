from graph.state import EmergencyState


def escalate_emergency(state: EmergencyState):

    state["escalation_status"] = (
        "No viable hospital capacity. Escalating to regional emergency network."
    )

    return state