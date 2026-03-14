"""Population Simulation — Exposure, evacuation timing, shelter pressure, casualty estimation."""

from models import PopulationMetrics
from city_graph import find_nearest, _haversine_km


def compute_population_metrics(zones, infrastructure, graph_nodes, adj, tick):
    """Compute per-zone population impact metrics.
    
    Args:
        zones: list of Zone objects
        infrastructure: list of Infrastructure objects
        graph_nodes: dict of GraphNode objects
        adj: adjacency list for the graph
        tick: current simulation tick
    
    Returns: list[PopulationMetrics]
    """
    metrics = []

    # Pre-compute shelter capacity per zone
    zone_shelter_cap = {}
    zone_shelter_load = {}
    for infra in infrastructure:
        if infra.type.value != "shelter":
            continue
        # Find which zone this shelter belongs to
        best_zone = None
        best_dist = float('inf')
        for zone in zones:
            d = _haversine_km(infra.lat, infra.lng, zone.center[0], zone.center[1])
            if d < best_dist:
                best_dist = d
                best_zone = zone.id
        if best_zone:
            zone_shelter_cap[best_zone] = zone_shelter_cap.get(best_zone, 0) + infra.capacity
            zone_shelter_load[best_zone] = zone_shelter_load.get(best_zone, 0) + infra.current_load

    for zone in zones:
        # Exposure: population × hazard fraction, ramping over ticks
        exposure_factor = min(1.0, zone.hazard_intensity / 100)
        exposed = int(zone.population * exposure_factor * 0.6)

        # Evacuation ramps up over ticks (starts slow, accelerates)
        evac_rate = min(0.85, 0.1 * tick * (1 - zone.hazard_intensity / 200))
        evacuating = int(exposed * max(0, evac_rate))

        # Sheltered = actual shelter load in zone
        sheltered = zone_shelter_load.get(zone.id, 0)

        # Evacuation time estimate via graph
        zone_node_id = f"zone_{zone.id}"
        est_evac_time = 0.0
        if zone_node_id in adj:
            _, shelter_cost = find_nearest(adj, graph_nodes, zone_node_id, "shelter")
            est_evac_time = min(120, shelter_cost)  # cap at 120 min
            # Add congestion delay based on hazard
            est_evac_time *= (1 + zone.hazard_intensity / 200)
        else:
            est_evac_time = 30.0  # default

        # Shelter pressure
        total_cap = zone_shelter_cap.get(zone.id, 1)
        shelter_pressure = min(200, (sheltered / max(total_cap, 1)) * 100)

        # Casualty estimation
        # Factors: exposure, evac time, medical inaccessibility
        _, hosp_cost = find_nearest(adj, graph_nodes, zone_node_id, "hospital") if zone_node_id in adj else (None, 30)
        medical_delay_factor = min(3.0, hosp_cost / 15)  # normalized to expected 15-min response
        casualty_rate = 0.002 * (zone.hazard_intensity / 100) * medical_delay_factor
        casualties_est = int(exposed * casualty_rate)

        metrics.append(PopulationMetrics(
            zone_id=zone.id,
            zone_name=zone.name,
            total_population=zone.population,
            exposed=exposed,
            evacuating=evacuating,
            sheltered=sheltered,
            est_evac_time_min=round(est_evac_time, 1),
            shelter_pressure_pct=round(shelter_pressure, 1),
            casualties_est=casualties_est,
        ))

    return metrics


def get_city_summary(metrics):
    """Aggregate city-wide population summary from per-zone metrics."""
    total_pop = sum(m.total_population for m in metrics)
    total_exposed = sum(m.exposed for m in metrics)
    total_evacuating = sum(m.evacuating for m in metrics)
    total_sheltered = sum(m.sheltered for m in metrics)
    total_casualties = sum(m.casualties_est for m in metrics)
    avg_evac_time = sum(m.est_evac_time_min for m in metrics) / max(len(metrics), 1)

    return {
        "total_population": total_pop,
        "total_exposed": total_exposed,
        "total_evacuating": total_evacuating,
        "total_sheltered": total_sheltered,
        "total_casualties_est": total_casualties,
        "avg_evac_time_min": round(avg_evac_time, 1),
        "exposure_pct": round((total_exposed / max(total_pop, 1)) * 100, 1),
    }
