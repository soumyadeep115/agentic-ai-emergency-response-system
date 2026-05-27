import networkx as nx
from graph.state import EmergencyState
from utils.road_graph import create_road_graph


def plan_route(state: EmergencyState):

    G = create_road_graph()

    try:
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

        route_string = f"{' -> '.join(shortest_path)} ({travel_time} min)"

        state["route_candidates"] = [route_string]
        state["selected_route"] = route_string

    except nx.NetworkXNoPath:
        state["route_candidates"] = []
        state["selected_route"] = "No route available"

    except Exception:
        state["route_candidates"] = []
        state["selected_route"] = "Routing failed"

    return state