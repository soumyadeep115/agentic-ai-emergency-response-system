import networkx as nx
from graph.state import EmergencyState
from utils.road_graph import create_road_graph
from utils.db import get_connection


def evaluate_hospital(state: EmergencyState):

    G = create_road_graph()

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT hospital_id, available_beds, icu_readiness, trauma_score
        FROM hospitals
    """)

    hospitals = cursor.fetchall()

    scored_hospitals = []

    for hospital_id, beds, icu, trauma in hospitals:

        try:
            travel_time = nx.shortest_path_length(
                G,
                source=state["incident_location"],
                target=hospital_id,
                weight="weight"
            )
        except:
            continue

        score = (
            0.5 * beds +
            0.3 * icu +
            0.2 * trauma -
            0.3 * travel_time
        )

        scored_hospitals.append(
            (hospital_id, score, travel_time, beds, icu, trauma)
        )

    if not scored_hospitals:
        state["hospital_candidates"] = []
        state["selected_hospital"] = "Unavailable"

        cursor.close()
        conn.close()
        return state

    scored_hospitals.sort(key=lambda x: x[1], reverse=True)

    state["hospital_candidates"] = [
        f"{h[0]} (Beds: {h[3]}, ICU: {h[4]}, Trauma: {h[5]}, Route: {h[2]} min, Score: {round(h[1],2)})"
        for h in scored_hospitals
    ]

    state["selected_hospital"] = scored_hospitals[0][0]

    cursor.close()
    conn.close()

    return state