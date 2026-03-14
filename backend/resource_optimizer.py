"""Resource Optimizer — Score-based allocation of ambulances, generators, shelter, supplies."""

from models import ResourceAllocation
from city_graph import find_nearest, compute_accessibility


# Available resources (global pool)
DEFAULT_RESOURCES = {
    "ambulance": 50,
    "generator": 20,
}


def _zone_priority_score(zone, accessibility):
    """Compute priority score for a zone: higher = needs resources more urgently."""
    return zone.risk_score * (zone.population / 10000) * (1 + accessibility / 30)


def optimize_ambulances(zones, infrastructure, graph_nodes, adj, available=50):
    """Allocate ambulances to zones based on risk, population, and hospital proximity.
    
    Returns: list[ResourceAllocation]
    """
    allocations = []
    hospitals = {nid: n for nid, n in graph_nodes.items() if n.node_type == "hospital" and n.status != "failed"}

    # Score each zone
    zone_scores = []
    for zone in zones:
        if zone.risk_score < 15:
            continue
        zone_node_id = f"zone_{zone.id}"
        acc = compute_accessibility(adj, graph_nodes, zone_node_id) if zone_node_id in adj else 30
        score = _zone_priority_score(zone, acc)

        # Find nearest active hospital
        nearest_hosp_id, hosp_cost = find_nearest(adj, graph_nodes, zone_node_id, "hospital") if zone_node_id in adj else (None, 30)
        zone_scores.append((zone, score, nearest_hosp_id, hosp_cost))

    # Sort by priority (highest first)
    zone_scores.sort(key=lambda x: -x[1])

    remaining = available
    for zone, score, hosp_id, hosp_cost in zone_scores:
        if remaining <= 0:
            break
        # Allocate proportional to score
        alloc = max(1, min(remaining, int(score / 20) + 1))
        hosp_node = graph_nodes.get(hosp_id) if hosp_id else None
        allocations.append(ResourceAllocation(
            resource_type="ambulance",
            source_id="central_dispatch",
            target_id=zone.id,
            target_name=zone.name,
            amount=alloc,
            priority_score=round(score, 1),
            route_cost=round(hosp_cost, 1),
        ))
        remaining -= alloc

    return allocations


def optimize_generators(zones, infrastructure, graph_nodes, adj, available=20):
    """Allocate generators to failed/degraded power stations + hospitals.
    
    Returns: list[ResourceAllocation]  
    """
    allocations = []
    remaining = available

    # Priority 1: Failed power stations in high-risk zones
    power_stations = [i for i in infrastructure if i.type.value == "power_station"]
    scored_stations = []
    for ps in power_stations:
        if ps.damage < 30:
            continue
        # Find zone risk
        best_zone = None
        best_dist = float('inf')
        for z in zones:
            d = ((ps.lat - z.center[0])**2 + (ps.lng - z.center[1])**2)**0.5
            if d < best_dist:
                best_dist = d
                best_zone = z
        zone_risk = best_zone.risk_score if best_zone else 0
        score = ps.damage * (1 + zone_risk / 100)
        scored_stations.append((ps, score, best_zone))

    scored_stations.sort(key=lambda x: -x[1])

    for ps, score, zone in scored_stations:
        if remaining <= 0:
            break
        allocations.append(ResourceAllocation(
            resource_type="generator",
            source_id="central_depot",
            target_id=ps.id,
            target_name=ps.name,
            amount=1,
            priority_score=round(score, 1),
            route_cost=0,
        ))
        remaining -= 1

    # Priority 2: Overloaded hospitals
    hospitals = [i for i in infrastructure if i.type.value == "hospital" and i.current_load > i.capacity * 0.8]
    hospitals.sort(key=lambda h: -(h.current_load / max(h.capacity, 1)))

    for hosp in hospitals:
        if remaining <= 0:
            break
        allocations.append(ResourceAllocation(
            resource_type="generator",
            source_id="central_depot",
            target_id=hosp.id,
            target_name=hosp.name,
            amount=1,
            priority_score=round(hosp.current_load / max(hosp.capacity, 1) * 100, 1),
            route_cost=0,
        ))
        remaining -= 1

    return allocations


def optimize_shelter_routing(zones, infrastructure, graph_nodes, adj):
    """Compute optimal evacuation routing from high-risk zones to shelters.
    
    Returns: list[ResourceAllocation] (representing routing recommendations)
    """
    allocations = []
    
    for zone in zones:
        if zone.risk_score < 30:
            continue
        zone_node_id = f"zone_{zone.id}"
        if zone_node_id not in adj:
            continue

        nearest_shelter_id, cost = find_nearest(adj, graph_nodes, zone_node_id, "shelter")
        if nearest_shelter_id and cost < 9999:
            shelter_node = graph_nodes.get(nearest_shelter_id)
            evac_pop = int(zone.population * (zone.risk_score / 100) * 0.3)
            allocations.append(ResourceAllocation(
                resource_type="evacuation_route",
                source_id=zone.id,
                target_id=nearest_shelter_id,
                target_name=shelter_node.label if shelter_node else "Shelter",
                amount=evac_pop,
                priority_score=round(zone.risk_score, 1),
                route_cost=round(cost, 1),
            ))

    allocations.sort(key=lambda a: -a.priority_score)
    return allocations


def get_all_allocations(zones, infrastructure, graph_nodes, adj):
    """Run all optimizers and return combined allocations."""
    ambulances = optimize_ambulances(zones, infrastructure, graph_nodes, adj)
    generators = optimize_generators(zones, infrastructure, graph_nodes, adj)
    shelter_routes = optimize_shelter_routing(zones, infrastructure, graph_nodes, adj)
    return ambulances + generators + shelter_routes
