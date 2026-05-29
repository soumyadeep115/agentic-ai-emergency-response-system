from graph.state import EmergencyState
from utils.db import get_connection
import math


def _distance(lat1, lng1, lat2, lng2):
    """
    Simple geographic distance score.
    Lower distance = better ambulance candidate.
    """
    return math.sqrt(
        (lat1 - lat2) ** 2 +
        (lng1 - lng2) ** 2
    )


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

    incident_lat = state.get("incident_lat")
    incident_lng = state.get("incident_lng")

    scored_ambulances = []

    for ambulance_id, eta, equipment, lat, lng in ambulances:

        if (
            incident_lat is not None and
            incident_lng is not None and
            lat is not None and
            lng is not None
        ):
            distance = _distance(
                incident_lat,
                incident_lng,
                lat,
                lng
            )
        else:
            distance = 9999

        # Priority:
        # 1. nearest ambulance
        # 2. equipment quality
        # 3. lower ETA
        score = (
            -(distance * 1000) +
            (equipment * 2) -
            eta
        )

        scored_ambulances.append(
            (
                ambulance_id,
                score,
                eta,
                equipment,
                lat,
                lng,
                distance
            )
        )

    if not scored_ambulances:
        state["ambulance_candidates"] = []
        state["selected_ambulance"] = "Unavailable"
        state["selected_ambulance_lat"] = None
        state["selected_ambulance_lng"] = None
        state["dispatch_decision"] = "No ambulances available"
        return state

    # Highest score wins
    scored_ambulances.sort(
        key=lambda x: x[1],
        reverse=True
    )

    state["ambulance_candidates"] = [
        (
            f"{a[0]} "
            f"(ETA: {a[2]} min, "
            f"Equipment: {a[3]}, "
            f"Distance: {round(a[6], 4)}, "
            f"Score: {round(a[1], 2)})"
        )
        for a in scored_ambulances
    ]

    best = scored_ambulances[0]

    state["selected_ambulance"] = best[0]
    state["selected_ambulance_lat"] = best[4]
    state["selected_ambulance_lng"] = best[5]

    return state