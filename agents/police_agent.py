from graph.state import EmergencyState
from utils.db import get_connection


def coordinate_police(state: EmergencyState):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT unit_id, eta, clearance_capacity
        FROM police_units
        WHERE status = 'available'
    """)

    police_units = cursor.fetchall()

    scored_units = []

    for unit_id, eta, clearance in police_units:

        score = (0.7 * clearance) - (0.3 * eta)

        scored_units.append(
            (unit_id, score, eta, clearance)
        )

    if not scored_units:
        state["police_required"] = False
        state["police_status"] = "No police units available"

        cursor.close()
        conn.close()
        return state

    scored_units.sort(key=lambda x: x[1], reverse=True)

    best_unit = scored_units[0]

    state["police_required"] = True
    state["police_status"] = (
        f"{best_unit[0]} dispatched "
        f"(ETA: {best_unit[2]} min, "
        f"Clearance: {best_unit[3]}, "
        f"Score: {round(best_unit[1], 2)})"
    )

    cursor.close()
    conn.close()

    return state