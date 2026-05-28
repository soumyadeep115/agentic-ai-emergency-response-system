import math
from graph.state import EmergencyState
from utils.db import get_connection


def _haversine_minutes(lat1, lng1, lat2, lng2, avg_speed_kmh=40):
    """
    Straight-line travel time estimate in minutes between two coordinates.
    Used when the hospital is not a named node in the NetworkX graph.
    avg_speed_kmh: assumed urban ambulance speed (default 40 km/h)
    """
    R = 6371.0
    phi1, phi2   = math.radians(lat1), math.radians(lat2)
    dphi         = math.radians(lat2 - lat1)
    dlambda      = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    distance_km  = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return (distance_km / avg_speed_kmh) * 60   # minutes


def evaluate_hospital(state: EmergencyState):

    conn   = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT hospital_id, available_beds, icu_readiness, trauma_score,
               latitude, longitude
        FROM hospitals
    """)

    hospitals = cursor.fetchall()
    cursor.close()
    conn.close()

    # Prefer incident coordinates for travel time; fall back to fixed estimate
    incident_lat = state.get("incident_lat")
    incident_lng = state.get("incident_lng")

    scored_hospitals = []

    for hospital_id, beds, icu, trauma, hosp_lat, hosp_lng in hospitals:

        # ── Travel time ───────────────────────────────────────
        if (incident_lat is not None and incident_lng is not None
                and hosp_lat is not None and hosp_lng is not None):
            travel_time = _haversine_minutes(
                incident_lat, incident_lng, hosp_lat, hosp_lng
            )
        else:
            # No coordinates available — use neutral estimate
            travel_time = 10.0

        # ── Scoring formula (unchanged from original) ─────────
        score = (
            0.5 * (beds  or 0) +
            0.3 * (icu   or 0) +
            0.2 * (trauma or 0) -
            0.3 * travel_time
        )

        scored_hospitals.append(
            (hospital_id, score, travel_time, beds, icu, trauma)
        )

    if not scored_hospitals:
        state["hospital_candidates"] = []
        state["selected_hospital"]   = "Unavailable"
        return state

    scored_hospitals.sort(key=lambda x: x[1], reverse=True)

    state["hospital_candidates"] = [
        f"{h[0]} (Beds: {h[3]}, ICU: {h[4]}, Trauma: {h[5]}, "
        f"Route: {round(h[2], 1)} min, Score: {round(h[1], 2)})"
        for h in scored_hospitals
    ]

    state["selected_hospital"] = scored_hospitals[0][0]

    return state