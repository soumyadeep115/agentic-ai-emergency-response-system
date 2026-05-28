from graph.state import EmergencyState
from utils.db import get_connection


def allocate_ambulance(state: EmergencyState):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT ambulance_id, eta, equipment_score, latitude, longitude
        FROM ambulances
        WHERE status = 'available'
    """)

    ambulances = cursor.fetchall()

    cursor.close()
    conn.close()

    scored_ambulances = []

    for ambulance_id, eta, equipment, lat, lng in ambulances:
        score = (0.6 * equipment) - (0.4 * eta)
        scored_ambulances.append(
            (ambulance_id, score, eta, equipment, lat, lng)
        )

    if not scored_ambulances:
        state["ambulance_candidates"]    = []
        state["selected_ambulance"]      = "Unavailable"
        state["selected_ambulance_lat"]  = None
        state["selected_ambulance_lng"]  = None
        state["dispatch_decision"]       = "No ambulances available"
        return state

    scored_ambulances.sort(key=lambda x: x[1], reverse=True)

    state["ambulance_candidates"] = [
        f"{a[0]} (ETA: {a[2]} min, Equipment: {a[3]}, Score: {round(a[1], 2)})"
        for a in scored_ambulances
    ]

    best = scored_ambulances[0]
    state["selected_ambulance"]     = best[0]
    state["selected_ambulance_lat"] = best[4]   # latitude from DB
    state["selected_ambulance_lng"] = best[5]   # longitude from DB

    return state