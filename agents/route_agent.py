import os
import requests
import networkx as nx

from graph.state import EmergencyState
from utils.road_graph import (
    create_road_graph,
    get_all_nodes_with_coords,
    nearest_node,
    node_path_to_geojson,
)

# OSRM public demo — no API key required, real road geometry
OSRM_URL            = "http://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson"
OSRM_TIMEOUT_SECONDS = 8


# ─────────────────────────────────────────────
# Primary path: OSRM Directions
# ─────────────────────────────────────────────

def _route_via_osrm(ambulance_lat, ambulance_lng, incident_lat, incident_lng):
    """
    Call OSRM public demo server for real road routing.
    No API key required.
    Returns (geojson_geometry, eta_seconds, readable_string)
    """
    url = OSRM_URL.format(
        lng1=ambulance_lng, lat1=ambulance_lat,
        lng2=incident_lng,  lat2=incident_lat
    )

    response = requests.get(url, timeout=OSRM_TIMEOUT_SECONDS)
    response.raise_for_status()

    data = response.json()

    if data.get("code") != "Ok":
        raise ValueError(f"OSRM returned code: {data.get('code')}")

    routes = data.get("routes", [])
    if not routes:
        raise ValueError("OSRM returned no routes")

    route      = routes[0]
    geometry   = route["geometry"]          # GeoJSON LineString
    eta_seconds = int(route["duration"])    # seconds
    distance_m  = route["distance"]         # metres

    eta_minutes = round(eta_seconds / 60, 1)
    readable    = (
        f"OSRM route: {round(distance_m / 1000, 2)} km "
        f"({eta_minutes} min)"
    )

    return geometry, eta_seconds, readable


# ─────────────────────────────────────────────
# Fallback path: NetworkX + nodes table
# ─────────────────────────────────────────────

def _route_via_networkx(
    ambulance_lat, ambulance_lng,
    incident_lat,  incident_lng,
    incident_location_name
):
    G         = create_road_graph()
    node_list = get_all_nodes_with_coords()

    if ambulance_lat is not None and ambulance_lng is not None and node_list:
        source_node = nearest_node(ambulance_lat, ambulance_lng, node_list)
    else:
        source_node = "Ambulance_Station"

    if incident_lat is not None and incident_lng is not None and node_list:
        target_node = nearest_node(incident_lat, incident_lng, node_list)
    else:
        target_node = incident_location_name

    if not source_node or not target_node:
        raise ValueError("Could not resolve source or target node for NetworkX routing")

    shortest_path       = nx.shortest_path(G, source=source_node, target=target_node, weight="weight")
    travel_time_minutes = nx.shortest_path_length(G, source=source_node, target=target_node, weight="weight")

    eta_seconds = int(travel_time_minutes * 60)
    geometry    = node_path_to_geojson(shortest_path, node_list) if node_list else None
    readable    = f"{' -> '.join(shortest_path)} ({travel_time_minutes} min) [NetworkX fallback]"

    return geometry, eta_seconds, readable


# ─────────────────────────────────────────────
# LangGraph node
# ─────────────────────────────────────────────

def plan_route(state: EmergencyState):
    ambulance_lat     = state.get("selected_ambulance_lat")
    ambulance_lng     = state.get("selected_ambulance_lng")
    incident_lat      = state.get("incident_lat")
    incident_lng      = state.get("incident_lng")
    incident_location = state.get("incident_location", "Incident_B")

    geometry     = None
    eta_seconds  = 0
    route_string = "Route unavailable"
    route_source = "NetworkX"

    ors_eligible = (
        ambulance_lat is not None and ambulance_lng is not None and
        incident_lat  is not None and incident_lng  is not None
    )

    # ── Try OSRM first ─────────────────────────────────────────
    if ors_eligible:
        try:
            geometry, eta_seconds, route_string = _route_via_osrm(
                ambulance_lat, ambulance_lng,
                incident_lat,  incident_lng
            )
            route_source = "OSRM"
            print(f"[RouteAgent] OSRM succeeded: {route_string}")
        except Exception as osrm_error:
            print(f"[RouteAgent] OSRM failed ({osrm_error}), falling back to NetworkX")
    else:
        print(f"[RouteAgent] Routing not eligible — ambulance: ({ambulance_lat}, {ambulance_lng}), incident: ({incident_lat}, {incident_lng})")

    # ── NetworkX fallback ──────────────────────────────────────
    if route_source != "OSRM":
        try:
            geometry, eta_seconds, route_string = _route_via_networkx(
                ambulance_lat, ambulance_lng,
                incident_lat,  incident_lng,
                incident_location
            )
            route_source = "NetworkX"
        except nx.NetworkXNoPath:
            route_string = "No route available"
            geometry     = None
            eta_seconds  = 0
        except Exception as nx_error:
            print(f"[RouteAgent] NetworkX also failed: {nx_error}")
            route_string = "Routing failed"
            geometry     = None
            eta_seconds  = 0

    state["route_candidates"] = [route_string]
    state["selected_route"]   = route_string
    state["route_geometry"]   = geometry
    state["real_eta_seconds"] = eta_seconds
    state["route_source"]     = route_source

    return state