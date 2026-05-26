import networkx as nx
from graph.state import EmergencyState
from utils.road_graph import create_road_graph


def plan_route(state: EmergencyState):
    G = create_road_graph()

    shortest_path = nx.shortest_path(
        G,
        source="Ambulance_Station",
        target=state["incident_location"],
        weight="weight"
    )

    travel_time = nx.shortest_path_length(
        G,
        source="Ambulance_Station",
        target=state["incident_location"],
        weight="weight"
    )

    state["route_candidates"] = [
        f"{' -> '.join(shortest_path)} ({travel_time} min)"
    ]

    return state