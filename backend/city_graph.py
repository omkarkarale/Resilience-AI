"""City Graph — Node/edge graph model with Dijkstra routing for Mumbai infrastructure."""

import heapq
import math
from models import GraphNode, GraphEdge


def _haversine_km(lat1, lng1, lat2, lng2):
    """Approximate distance in km between two lat/lng points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ─── Graph Construction ───

def build_city_graph(zones, infrastructure, roads):
    """Build adjacency-list graph from zones + infrastructure.
    
    Returns:
        nodes: dict[str, GraphNode]
        edges: list[GraphEdge]
        adj: dict[str, list[tuple[str, float, int]]]  — adjacency: node_id → [(neighbor_id, weight, edge_index)]
    """
    nodes = {}
    edges = []
    adj = {}

    # Create zone centroid nodes
    for zone in zones:
        node = GraphNode(
            id=f"zone_{zone.id}",
            label=zone.name,
            node_type="zone",
            lat=zone.center[0],
            lng=zone.center[1],
            zone_id=zone.id,
        )
        nodes[node.id] = node
        adj[node.id] = []

    # Create infrastructure nodes (only major types)
    major_types = {"hospital", "power_station", "shelter"}
    for infra in infrastructure:
        if infra.type.value not in major_types:
            continue
        node = GraphNode(
            id=f"infra_{infra.id}",
            label=infra.name,
            node_type=infra.type.value,
            lat=infra.lat,
            lng=infra.lng,
            capacity=infra.capacity,
            current_load=infra.current_load,
            status=infra.status.value if hasattr(infra.status, 'value') else str(infra.status),
        )
        # Assign zone
        best_zone = None
        best_dist = float('inf')
        for zone in zones:
            d = _haversine_km(infra.lat, infra.lng, zone.center[0], zone.center[1])
            if d < best_dist:
                best_dist = d
                best_zone = zone.id
        node.zone_id = best_zone
        nodes[node.id] = node
        adj[node.id] = []

    # Build edges: connect nodes within proximity threshold
    node_list = list(nodes.values())
    CONNECT_RADIUS_KM = 3.0
    BASE_SPEED_KPH = 25.0  # urban avg speed

    for i in range(len(node_list)):
        for j in range(i + 1, len(node_list)):
            n1, n2 = node_list[i], node_list[j]
            dist = _haversine_km(n1.lat, n1.lng, n2.lat, n2.lng)
            if dist <= CONNECT_RADIUS_KM:
                travel_time = (dist / BASE_SPEED_KPH) * 60  # minutes
                edge = GraphEdge(
                    source=n1.id,
                    target=n2.id,
                    weight=max(0.5, travel_time),
                    distance_km=round(dist, 2),
                )
                edge_idx = len(edges)
                edges.append(edge)
                adj[n1.id].append((n2.id, edge.weight, edge_idx))
                adj[n2.id].append((n1.id, edge.weight, edge_idx))

    return nodes, edges, adj


# ─── Edge Weight Updates ───

def update_edge_weights(nodes, edges, adj, zones, roads):
    """Recalculate edge weights based on current hazard, road blocks, and congestion.
    
    Modifies edges in-place and rebuilds adj weights.
    """
    # Build zone hazard lookup
    zone_hazard = {z.id: z.hazard_intensity for z in zones}

    # Build blocked road set (road IDs)
    blocked_road_ids = {r.id for r in roads if r.blocked}
    any_blocked = len(blocked_road_ids) > 0

    BASE_SPEED_KPH = 25.0

    for idx, edge in enumerate(edges):
        src = nodes.get(edge.source)
        tgt = nodes.get(edge.target)
        if not src or not tgt:
            continue

        # Base travel time
        base_time = (edge.distance_km / BASE_SPEED_KPH) * 60

        # Hazard penalty: avg hazard of connected zone(s)
        src_hazard = zone_hazard.get(src.zone_id, 0) if src.zone_id else 0
        tgt_hazard = zone_hazard.get(tgt.zone_id, 0) if tgt.zone_id else 0
        avg_hazard = (src_hazard + tgt_hazard) / 2
        hazard_factor = 1.0 + (avg_hazard / 100) * 2.0  # up to 3x slower in max hazard

        # Check if edge is blocked (if either endpoint zone has severe blockage)
        is_blocked = False
        if any_blocked and avg_hazard > 60:
            # Probabilistic blockage based on hazard — edges in high-hazard areas more likely blocked
            is_blocked = avg_hazard > 75

        edge.hazard_risk = round(avg_hazard, 1)
        edge.blocked = is_blocked
        edge.congestion = round(min(100, avg_hazard * 0.8), 1)

        if is_blocked:
            edge.weight = 9999.0  # effectively disconnected
        else:
            edge.weight = round(max(0.5, base_time * hazard_factor), 2)

    # Rebuild adj weights
    for node_id in adj:
        adj[node_id] = [(nid, edges[eidx].weight, eidx) for nid, _, eidx in adj[node_id]]


# ─── Dijkstra Shortest Path ───

def dijkstra(adj, source_id, target_id=None):
    """Dijkstra's shortest path from source to target (or all nodes if target=None).
    
    Returns:
        dist: dict[str, float]  — shortest distance from source to each node
        prev: dict[str, str|None]  — previous node for path reconstruction
    """
    dist = {node_id: float('inf') for node_id in adj}
    prev = {node_id: None for node_id in adj}
    dist[source_id] = 0
    pq = [(0, source_id)]

    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        if target_id and u == target_id:
            break
        for v, w, _ in adj.get(u, []):
            nd = d + w
            if nd < dist.get(v, float('inf')):
                dist[v] = nd
                prev[v] = u
                heapq.heappush(pq, (nd, v))

    return dist, prev


def get_shortest_path(adj, source_id, target_id):
    """Get shortest path and total cost between two nodes.
    
    Returns: (path: list[str], cost: float)
    """
    dist, prev = dijkstra(adj, source_id, target_id)
    cost = dist.get(target_id, float('inf'))
    if cost == float('inf'):
        return [], cost
    
    path = []
    node = target_id
    while node:
        path.append(node)
        node = prev.get(node)
    path.reverse()
    return path, cost


def find_nearest(adj, nodes, source_id, target_type):
    """Find nearest node of a given type from source.
    
    Args:
        target_type: e.g., "hospital", "shelter", "power_station"
    
    Returns: (node_id, cost) or (None, inf)
    """
    dist, _ = dijkstra(adj, source_id)
    
    best_id = None
    best_cost = float('inf')
    for node_id, node in nodes.items():
        if node.node_type == target_type and node.status != "failed":
            if dist.get(node_id, float('inf')) < best_cost:
                best_cost = dist[node_id]
                best_id = node_id
    
    return best_id, best_cost


def compute_accessibility(adj, nodes, zone_node_id):
    """Compute accessibility score for a zone: avg travel time to nearest hospital + shelter.
    
    Lower score = better access. Returns minutes.
    """
    _, hosp_cost = find_nearest(adj, nodes, zone_node_id, "hospital")
    _, shelter_cost = find_nearest(adj, nodes, zone_node_id, "shelter")
    
    hosp_cost = min(hosp_cost, 60)  # cap at 60 min
    shelter_cost = min(shelter_cost, 60)
    
    return round((hosp_cost + shelter_cost) / 2, 1)
