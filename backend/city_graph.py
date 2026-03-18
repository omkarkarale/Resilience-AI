"""City Graph — Node/edge graph model with Dijkstra routing for Mumbai infrastructure."""

import heapq
import math
import os
from models import GraphNode, GraphEdge

# ─── Constants ───
CONGESTION_MULTIPLIER = 2.5   # used in effective_travel_time calc (Change 1)
_OSMNX_CACHE_PATH = os.path.join(os.path.dirname(__file__), "data", "mumbai_roads.graphml")


# ─── Optional OSMnx road loader (Change 2) ───

def load_osmnx_roads(place: str = "Mumbai, India") -> dict:
    """Fetch the drivable road network for `place` via osmnx.

    Results are cached at backend/data/mumbai_roads.graphml so subsequent
    server starts are instant.  The function returns a dict mapping
    road_id ("osm_{osmid}") → {lat, lon, length_km, name}.

    Falls back to an empty dict if osmnx is not installed or the
    network fetch fails, so the caller can gracefully degrade to the
    hardcoded road seeds already in simulation.py.
    """
    try:
        import osmnx as ox  # optional dependency
    except ImportError:
        print("[city_graph] osmnx not installed — skipping real road enrichment.")
        return {}

    # Use cached graphml if available
    if os.path.exists(_OSMNX_CACHE_PATH):
        try:
            G = ox.load_graphml(_OSMNX_CACHE_PATH)
            print(f"[city_graph] Loaded Mumbai road graph from cache ({_OSMNX_CACHE_PATH}).")
        except Exception as e:
            print(f"[city_graph] Cache load failed ({e}), re-fetching from OSM.")
            G = None
    else:
        G = None

    if G is None:
        try:
            G = ox.graph_from_place(place, network_type="drive")
            os.makedirs(os.path.dirname(_OSMNX_CACHE_PATH), exist_ok=True)
            ox.save_graphml(G, _OSMNX_CACHE_PATH)
            print(f"[city_graph] Fetched & cached Mumbai road graph ({len(G.edges())} edges).")
        except Exception as e:
            print(f"[city_graph] OSM fetch failed ({e}) — using hardcoded fallback.")
            return {}

    roads: dict = {}
    for u, v, data in G.edges(data=True):
        road_id = f"osm_{u}_{v}"
        name = data.get("name", f"OSM Road {u}-{v}")
        if isinstance(name, list):
            name = name[0]
        length_km = data.get("length", 0) / 1000.0
        # Use the 'from' node coords as representative lat/lon
        node_data = G.nodes[u]
        roads[road_id] = {
            "lat": node_data.get("y", 0.0),
            "lon": node_data.get("x", 0.0),
            "length_km": round(length_km, 4),
            "name": name,
        }
    return roads


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
    import json
    import os
    geom_path = os.path.join(os.path.dirname(__file__), "data", "road_geometry.json")
    try:
        if os.path.exists(geom_path):
            with open(geom_path, "r", encoding="utf-8") as f:
                geometry_data = json.load(f)
            for road in roads:
                if road.name in geometry_data:
                    road.geometry = geometry_data[road.name].get("geometry", [])
                elif road.id in geometry_data:
                    road.geometry = geometry_data[road.id].get("geometry", [])
    except Exception as e:
        print(f"[city_graph] Failed to load road_geometry.json: {e}")

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
        if str(infra.type) not in major_types:
            continue
        node = GraphNode(
            id=f"infra_{infra.id}",
            label=infra.name,
            node_type=str(infra.type),
            lat=infra.lat,
            lng=infra.lng,
            capacity=infra.capacity,
            current_load=infra.current_load,
            status=str(infra.status),
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

    # Build a severity lookup from the Road model (keyed by road id)
    road_severity = {r.id: r.severity for r in roads}
    any_partial = any(s > 0 for s in road_severity.values())

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

        # Derive severity for this edge: use avg of zone hazard → [0.0, 1.0]
        # (Road-level severity from traffic agent is tracked on the Road model;
        #  here we proxy from zone hazard so the graph stays consistent.)
        edge_severity = min(1.0, avg_hazard / 100)

        # Full blockage when severity >= 1.0 (derived from Road.blocked or hazard)
        is_blocked = avg_hazard >= 100  # keep existing hard-block threshold

        edge.hazard_risk = round(avg_hazard, 1)
        edge.blocked = is_blocked
        edge.congestion = round(min(100, avg_hazard * 0.8), 1)

        if is_blocked:
            edge.weight = 9999.0  # effectively disconnected
        else:
            # Change 1: effective_travel_time = base * (1 + severity * congestion_multiplier)
            effective_time = base_time * hazard_factor * (1.0 + edge_severity * CONGESTION_MULTIPLIER)
            edge.weight = round(max(0.5, effective_time), 2)

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


# ─── Alternate Route Finder (Change 4) ───

def find_alternate_route(adj: dict, edges: list, source_id: str, target_id: str,
                         blocked_edge_ids: set) -> tuple:
    """Find shortest path from source to target, ignoring edges in blocked_edge_ids.

    Temporarily removes blocked edges from adj, runs Dijkstra, then restores.

    Args:
        adj: adjacency dict {node_id: [(neighbor_id, weight, edge_idx), ...]}
        edges: list of GraphEdge objects (used to verify edge_idx)
        source_id: starting node id
        target_id: destination node id
        blocked_edge_ids: set of edge indices (int) to skip

    Returns:
        (path: list[str], cost: float)  — path is [] if unreachable.
    """
    if source_id not in adj or target_id not in adj:
        return [], float('inf')

    # Build a filtered adjacency without blocked edges
    filtered_adj: dict = {}
    for node_id, neighbors in adj.items():
        filtered_adj[node_id] = [
            (nid, w, eidx)
            for nid, w, eidx in neighbors
            if eidx not in blocked_edge_ids
        ]

    # Run Dijkstra on filtered graph
    dist = {node_id: float('inf') for node_id in filtered_adj}
    prev: dict = {node_id: None for node_id in filtered_adj}
    dist[source_id] = 0
    pq = [(0.0, source_id)]

    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        if u == target_id:
            break
        for v, w, _ in filtered_adj.get(u, []):
            nd = d + w
            if nd < dist.get(v, float('inf')):
                dist[v] = nd
                prev[v] = u
                heapq.heappush(pq, (nd, v))

    cost = dist.get(target_id, float('inf'))
    if cost == float('inf'):
        return [], float('inf')

    # Reconstruct path
    path = []
    node: str | None = target_id
    while node is not None:
        path.append(node)
        node = prev.get(node)
    path.reverse()
    return path, cost
