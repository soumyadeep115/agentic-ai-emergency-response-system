import math
import networkx as nx
from utils.db import get_connection


def create_road_graph():
    """
    Build NetworkX graph from traffic_edges table.
    Unchanged from original — used by both direct node routing
    and coordinate-based fallback routing.
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT source_node, destination_node, travel_time
            FROM traffic_edges
        """)
        edges = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    G = nx.Graph()
    for source, destination, time in edges:
        G.add_edge(source, destination, weight=time)

    return G


def get_all_nodes_with_coords():
    """
    Fetch all named graph nodes with their lat/lng from the nodes table.
    Returns list of dicts: {node_id, name, latitude, longitude}
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT node_id, name, latitude, longitude
            FROM nodes
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        """)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def haversine_distance(lat1, lng1, lat2, lng2):
    """
    Great-circle distance in km between two lat/lng points.
    Used to find nearest graph node to a real-world coordinate.
    """
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def nearest_node(lat, lng, node_list):
    """
    Given a lat/lng and a list of node dicts (each with latitude/longitude),
    return the node_id of the closest node.
    """
    if not node_list:
        return None

    return min(
        node_list,
        key=lambda n: haversine_distance(lat, lng, n["latitude"], n["longitude"])
    )["node_id"]


def node_path_to_geojson(node_path, node_list):
    """
    Convert a list of node_ids to a GeoJSON LineString using node coordinates.
    Nodes not found in node_list are skipped.
    Returns GeoJSON dict or None if fewer than 2 points resolved.
    """
    node_map = {n["node_id"]: n for n in node_list}
    coordinates = []

    for node_id in node_path:
        node = node_map.get(node_id)
        if node and node.get("latitude") and node.get("longitude"):
            # GeoJSON coordinate order is [longitude, latitude]
            coordinates.append([node["longitude"], node["latitude"]])

    if len(coordinates) < 2:
        return None

    return {
        "type": "LineString",
        "coordinates": coordinates
    }