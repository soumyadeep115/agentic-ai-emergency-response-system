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

ORS_API_KEY = os.getenv("ORS_API_KEY")
ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
ORS_TIMEOUT_SECONDS = 6


# ─────────────────────────────────────────────
# Primary path: ORS Directions API
# ─────────────────────────────────────────────

def _route_via_ors(ambulance_lat, ambulance_lng, incident_lat, incident_lng):
    """
    Call ORS Directions API.
    Returns (geojson_geometry, eta_seconds, readable_string) or raises on failure.
    """
    if not ORS_API_KEY:
        raise ValueError("ORS_API_KEY not set in environment")

    payload = {
        "coordinates": [
            [ambulance_lng, ambulance_lat],   # ORS expects [lng, lat]
            [incident_lng, incident_lat]
        ]
    }

    headers = {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json"
    }

    response = requests.post(
        ORS_DIRECTIONS_URL,
        json=payload,
        headers=headers,
        timeout=ORS_TIMEOUT_SECONDS
    )
    response.raise_for_status()

    data = response.json()

    features = data.get("features", [])
    if not features:
        raise ValueError("ORS returned no route features")

    feature = features[0]
    geometry = feature.get("geometry")              # GeoJSON LineString
    summary = feature["properties"]["summary"]
    eta_seconds = int(summary["duration"])          # seconds
    distance_m = summary["distance"]                # metres

    eta_minutes = round(eta_seconds / 60, 1)
    readable = (
        f"ORS route: {round(distance_m / 1000, 2)} km "
        f"({eta_minutes} min)"
    )

    return geometry, eta_seconds, readable


# ─────────────────────────────────────────────
# Fallback path: NetworkX + nodes table
# ─────────────────────────────────────────────

def _route_via_networkx(
    ambulance_lat, ambulance_lng,
    incident_lat, incident_lng,
    incident_location_name
):
    """
    NetworkX Dijkstra fallback.
    Uses nodes table to map coordinates → nearest named node.
    Falls back to "Ambulance_Station" as source if coordinate lookup fails.
    Returns (geojson_geometry_or_None, eta_seconds, readable_string) or raises.
    """
    G = create_road_graph()
    node_list = get_all_nodes_with_coords()

    # Resolve source node
    if ambulance_lat is not None and ambulance_lng is not None and node_list:
        source_node = nearest_node(ambulance_lat, ambulance_lng, node_list)
    else:
        source_node = "Ambulance_Station"   # legacy fallback node name

    # Resolve target node
    if incident_lat is not None and incident_lng is not None and node_list:
        target_node = nearest_node(incident_lat, incident_lng, node_list)
    else:
        # Use incident_location_name directly as node name (original behaviour)
        target_node = incident_location_name

    if not source_node or not target_node:
        raise ValueError("Could not resolve source or target node for NetworkX routing")

    shortest_path = nx.shortest_path(
        G,
        source=source_node,
        target=target_node,
        weight="weight"
    )

    travel_time_minutes = nx.shortest_path_length(
        G,
        source=source_node,
        target=target_node,
        weight="weight"
    )

    eta_seconds = int(travel_time_minutes * 60)

    # Convert node path → GeoJSON if nodes table has coordinates
    geometry = node_path_to_geojson(shortest_path, node_list) if node_list else None

    readable = (
        f"{' -> '.join(shortest_path)} "
        f"({travel_time_minutes} min) [NetworkX fallback]"
    )

    return geometry, eta_seconds, readable


# ─────────────────────────────────────────────
# LangGraph node
# ─────────────────────────────────────────────

def plan_route(state: EmergencyState):
    """
    Route Planning Agent.

    Primary:  ORS Directions API → real road geometry + real ETA
    Fallback: NetworkX Dijkstra  → graph-based geometry + estimated ETA

    Both paths write the same state keys:
        route_candidates    list[str]   (readable string)
        selected_route      str
        route_geometry      dict|None   (GeoJSON LineString)
        real_eta_seconds    int
        route_source        str         "ORS" | "NetworkX"
    """
    ambulance_lat = state.get("selected_ambulance_lat")
    ambulance_lng = state.get("selected_ambulance_lng")
    incident_lat  = state.get("incident_lat")
    incident_lng  = state.get("incident_lng")
    incident_location = state.get("incident_location", "Incident_B")

    geometry      = None
    eta_seconds   = 0
    route_string  = "Route unavailable"
    route_source  = "NetworkX"

    # ── Try ORS first ──────────────────────────────────────────
    ors_eligible = (
        ambulance_lat is not None and ambulance_lng is not None and
        incident_lat  is not None and incident_lng  is not None
    )

    if ors_eligible:
        try:
            geometry, eta_seconds, route_string = _route_via_ors(
                ambulance_lat, ambulance_lng,
                incident_lat, incident_lng
            )
            route_source = "ORS"

        except Exception as ors_error:
            print(f"[RouteAgent] ORS failed ({ors_error}), falling back to NetworkX")

    # ── NetworkX fallback ──────────────────────────────────────
    if route_source != "ORS":
        try:
            geometry, eta_seconds, route_string = _route_via_networkx(
                ambulance_lat, ambulance_lng,
                incident_lat, incident_lng,
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

    # ── Write unified output to state ──────────────────────────
    state["route_candidates"]  = [route_string]
    state["selected_route"]    = route_string
    state["route_geometry"]    = geometry
    state["real_eta_seconds"]  = eta_seconds
    state["route_source"]      = route_source

    return state