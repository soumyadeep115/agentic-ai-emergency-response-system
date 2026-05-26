from graph.state import EmergencyState
from utils.db import get_connection


def allocate_ambulance(state: EmergencyState):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT ambulance_id, eta, equipment_score
        FROM ambulances
        WHERE status = 'available'
    """)

    ambulances = cursor.fetchall()

    scored_ambulances = []

    for ambulance_id, eta, equipment in ambulances:

        score = (0.6 * equipment) - (0.4 * eta)

        scored_ambulances.append(
            (ambulance_id, score, eta, equipment)
        )

    scored_ambulances.sort(key=lambda x: x[1], reverse=True)

    state["ambulance_candidates"] = [
        f"{a[0]} (ETA: {a[2]} min, Equipment: {a[3]}, Score: {round(a[1],2)})"
        for a in scored_ambulances
    ]

    cursor.close()
    conn.close()

    return state