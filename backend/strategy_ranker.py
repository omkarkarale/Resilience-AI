"""Strategy Ranker — Compare and rank response strategy bundles."""

import copy
import random
from models import Strategy


def define_strategies(zones, infrastructure, roads, disaster):
    """Generate 4 context-aware response strategies based on current state.
    
    Each strategy is a bundle of actions that can be evaluated.
    """
    high_risk_zones = [z for z in zones if z.risk_score > 50]
    blocked_roads = [r for r in roads if r.blocked]
    failed_power = [i for i in infrastructure if i.type.value == "power_station" and i.status.value == "failed"]
    overloaded_hospitals = [i for i in infrastructure if i.type.value == "hospital" and i.current_load > i.capacity]

    strategies = []

    # Strategy 1: Aggressive Evacuation
    evac_zones = ", ".join(z.name for z in high_risk_zones[:4]) or "high-risk areas"
    strategies.append(Strategy(
        id="aggressive_evac",
        name="Aggressive Evacuation",
        description=f"Evacuate all {len(high_risk_zones)} high-risk zones, deploy max ambulances, open all shelters",
        actions=[
            f"Mandatory evacuation of {evac_zones}",
            "Deploy all 50 ambulances to affected zones",
            "Open all emergency shelters at maximum capacity",
            "Activate air evacuation for isolated zones",
            f"Clear {len(blocked_roads)} blocked evacuation corridors",
        ],
    ))

    # Strategy 2: Fortify-in-Place
    strategies.append(Strategy(
        id="fortify_in_place",
        name="Fortify in Place",
        description="Shelter-in-place with infrastructure hardening, minimal evacuation",
        actions=[
            "Issue shelter-in-place advisory for all zones",
            f"Deploy generators to {len(failed_power)} failed substations",
            "Prioritize power restoration to hospitals",
            "Distribute emergency supply kits to neighborhoods",
            "Reinforce critical building structures",
        ],
    ))

    # Strategy 3: Balanced Response
    partial_evac = ", ".join(z.name for z in high_risk_zones[:2]) or "worst zones"
    strategies.append(Strategy(
        id="balanced",
        name="Balanced Response",
        description=f"Partial evacuation of worst zones, targeted resource deployment",
        actions=[
            f"Evacuate {partial_evac} only",
            "Deploy 25 ambulances to critical areas",
            f"Deploy 10 generators to most damaged substations",
            "Open shelters in evacuated zones",
            "Maintain logistics supply chain to active shelters",
        ],
    ))

    # Strategy 4: Infrastructure First
    strategies.append(Strategy(
        id="infra_first",
        name="Infrastructure First",
        description="Prioritize grid repair and road clearing before medical response",
        actions=[
            f"Emergency road clearing for {min(len(blocked_roads), 5)} critical corridors",
            f"Deploy all generators to {len(failed_power)} failed substations",
            "Restore communications network priority",
            "Re-establish hospital access routes",
            "Deploy medical teams after routes are secured",
        ],
    ))

    return strategies


def evaluate_strategy(strategy, zones, infrastructure, roads, disaster):
    """Evaluate a strategy by simulating its impact.
    
    Scores each strategy on: risk_reduction, time_saved, survival_improvement, confidence, cost.
    """
    overall_risk = sum(z.risk_score for z in zones) / max(len(zones), 1)
    high_risk_count = sum(1 for z in zones if z.risk_score > 50)
    blocked_count = sum(1 for r in roads if r.blocked)
    failed_infra = sum(1 for i in infrastructure if i.status.value == "failed" or (hasattr(i.status, 'value') and i.status == "failed"))
    total_pop = sum(z.population for z in zones)
    exposed_pop = sum(z.population * (z.risk_score / 100) * 0.6 for z in zones)

    if strategy.id == "aggressive_evac":
        # High risk reduction, high time cost, high resource cost
        risk_reduction = min(40, overall_risk * 0.45)
        time_saved = 25 + high_risk_count * 3
        survival_improvement = min(35, exposed_pop / total_pop * 100 * 0.7) if total_pop > 0 else 10
        confidence = 82 + random.uniform(-3, 3)
        resource_cost = 85

    elif strategy.id == "fortify_in_place":
        # Moderate risk reduction, low time cost, moderate resource cost
        risk_reduction = min(25, overall_risk * 0.25)
        time_saved = 8 + blocked_count
        survival_improvement = min(18, exposed_pop / total_pop * 100 * 0.35) if total_pop > 0 else 5
        confidence = 70 + random.uniform(-5, 5)
        resource_cost = 45

    elif strategy.id == "balanced":
        # Good balance across all metrics
        risk_reduction = min(32, overall_risk * 0.35)
        time_saved = 18 + high_risk_count * 2
        survival_improvement = min(28, exposed_pop / total_pop * 100 * 0.55) if total_pop > 0 else 8
        confidence = 88 + random.uniform(-3, 3)
        resource_cost = 60

    elif strategy.id == "infra_first":
        # Lower immediate risk reduction, but improves future capacity
        risk_reduction = min(20, overall_risk * 0.2 + failed_infra * 2)
        time_saved = 12 + blocked_count * 4  # road clearing saves lots of time
        survival_improvement = min(15, exposed_pop / total_pop * 100 * 0.25) if total_pop > 0 else 4
        confidence = 75 + random.uniform(-4, 4)
        resource_cost = 55

    else:
        risk_reduction = overall_risk * 0.1
        time_saved = 5
        survival_improvement = 5
        confidence = 60
        resource_cost = 50

    # Composite impact score (weighted)
    impact_score = (
        risk_reduction * 0.35 +
        time_saved * 0.5 +
        survival_improvement * 0.8 +
        (100 - resource_cost) * 0.1 +
        confidence * 0.15
    )

    strategy.risk_reduction = round(risk_reduction, 1)
    strategy.time_saved_min = round(time_saved, 1)
    strategy.survival_improvement = round(survival_improvement, 1)
    strategy.confidence = round(min(99, max(50, confidence)), 1)
    strategy.resource_cost = round(resource_cost, 1)
    strategy.impact_score = round(min(100, impact_score), 1)

    return strategy


def rank_strategies(zones, infrastructure, roads, disaster):
    """Define, evaluate, and rank all strategies.
    
    Returns: (sorted strategies list, recommended_strategy_id)
    """
    strategies = define_strategies(zones, infrastructure, roads, disaster)

    for s in strategies:
        evaluate_strategy(s, zones, infrastructure, roads, disaster)

    strategies.sort(key=lambda s: -s.impact_score)

    recommended_id = strategies[0].id if strategies else None
    return strategies, recommended_id
