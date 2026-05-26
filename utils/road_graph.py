import networkx as nx
from utils.db import get_connection


def create_road_graph():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT source_node, destination_node, travel_time
        FROM traffic_edges
    """)

    edges = cursor.fetchall()

    G = nx.Graph()

    for source, destination, time in edges:
        G.add_edge(source, destination, weight=time)

    cursor.close()
    conn.close()

    return G