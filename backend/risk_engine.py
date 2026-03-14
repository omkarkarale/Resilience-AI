"""Risk Engine — Multi-factor composite risk scoring per zone."""

import math
from city_graph import compute_accessibility, _haversine_km


# Risk factor weights
W_HAZARD = 0.30
W_INFRA_DAMAGE = 0.20
W_POPULATION = 0.15
W_ROAD_ACCESS = 0.20
W_MEDICAL_LOAD = 0.15


def _infra_damage_index(zone, infrastructure):
    """Average damage of infrastructure within this zone (0-100)."""
    nearby = []
    for infra in infrastructure:
        dist = _haversine_km(infra.lat, infra.lng, zone.center[0], zone.center[1])
        if dist < 2.5:  # within 2.5 km
            nearby.append(infra.damage)
    return sum(nearby) / max(len(nearby), 1)


def _population_density_norm(zone, max_pop=100000):
    """Normalized population density (0-100)."""
    return min(100, (zone.population / max_pop) * 100)


def _road_inaccessibility(zone, roads):
    """Percentage of roads blocked near the zone (0-100)."""
    nearby_total = 0
    nearby_blocked = 0
    for road in roads:
        for point in road.points[:3]:  # check first few points for speed
            dist = ((point[0] - zone.center[0])**2 + (point[1] - zone.center[1])**2)**0.5
            if dist < 0.02:  # ~2.2 km
                nearby_total += 1
                if road.blocked:
                    nearby_blocked += 1
                break
    if nearby_total == 0:
        return 0
    return (nearby_blocked / nearby_total) * 100


def _medical_load_index(zone, infrastructure):
    """Hospital load pressure near the zone (0-100)."""
    hospitals = []
    for infra in infrastructure:
        if infra.type.value != "hospital":
            continue
        dist = _haversine_km(infra.lat, infra.lng, zone.center[0], zone.center[1])
        if dist < 3.0:
            if infra.capacity > 0:
                load_pct = (infra.current_load / infra.capacity) * 100
                hospitals.append(min(100, load_pct))
    if not hospitals:
        return 50  # no nearby hospitals = moderate concern
    return sum(hospitals) / len(hospitals)


def compute_zone_risk(zone, infrastructure, roads):
    """Compute composite risk score for a single zone (0-100).
    
    Returns: (score, breakdown_dict)
    """
    hazard = zone.hazard_intensity
    infra_dmg = _infra_damage_index(zone, infrastructure)
    pop_norm = _population_density_norm(zone)
    road_access = _road_inaccessibility(zone, roads)
    med_load = _medical_load_index(zone, infrastructure)

    score = (
        W_HAZARD * hazard +
        W_INFRA_DAMAGE * infra_dmg +
        W_POPULATION * pop_norm +
        W_ROAD_ACCESS * road_access +
        W_MEDICAL_LOAD * med_load
    )
    score = min(100, max(0, score))

    breakdown = {
        "hazard": round(hazard, 1),
        "infra_damage": round(infra_dmg, 1),
        "population": round(pop_norm, 1),
        "road_access": round(road_access, 1),
        "medical_load": round(med_load, 1),
    }
    return round(score, 1), breakdown


def compute_all_risks(zones, infrastructure, roads):
    """Compute risk scores for all zones. Updates zone.risk_score in place.
    
    Returns: dict[zone_id → breakdown]
    """
    breakdowns = {}
    for zone in zones:
        score, breakdown = compute_zone_risk(zone, infrastructure, roads)
        zone.risk_score = score
        breakdowns[zone.id] = breakdown
    return breakdowns
