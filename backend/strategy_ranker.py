"""Strategy Ranker — Compare and rank response strategy bundles."""

import copy
import random
from models import Strategy, DisasterType # pyre-ignore


def define_strategies(zones, infrastructure, roads, disaster):
    """Generate 4 context-aware response strategies based on current state.
    
    Each strategy is a bundle of actions that can be evaluated.
    """
    if not disaster: return []
    
    intensity_pct = disaster.intensity
    scale = intensity_pct / 100.0
    high_risk_zones = [z for z in zones if z.risk_score > 50]
    blocked_roads = [r for r in roads if r.blocked]
    
    # Contextual labels
    evac_target = high_risk_zones[0].name if high_risk_zones else "nearby areas"
    total_recs = len(high_risk_zones)
    
    # Unmistakable resource counts
    amb_limit = max(2, int(60 * scale))
    gen_limit = max(1, int(15 * scale))
    shelter_target = max(1, total_recs)

    strategies = []

    # 1. Aggressive Evacuation
    strategies.append(Strategy(
        id="aggressive_evac",
        name="Aggressive Evacuation",
        description=f"PRIORITY: Mass evacuation for {total_recs} high-risk sectors at {intensity_pct}% intensity.",
        actions=[
            f"Mandatory evacuation of {evac_target} and surrounding sectors",
            f"Mobilize primary ambulance pool: {amb_limit} units assigned",
            f"Activate {shelter_target} emergency city-shelters for immediate intake",
            f"Direct priority clearing of {len(blocked_roads)} blocked roads near {evac_target}",
            "Deploy air-scouts for isolated population identification",
        ],
    ))

    # 2. Fortify-in-Place
    strategies.append(Strategy(
        id="fortify_in_place",
        name="Fortify in Place",
        description="Localized safety hardening with minimal transit dependency.",
        actions=[
            f"Broadcast 'Stay-at-Home' advisory to {len(zones)} residential sectors",
            f"Ship {gen_limit} high-output generators to critical nodes",
            f"Establish secure water/food distribution point at {evac_target}",
            "Harden hospital perimeters against environmental breach",
            f"Deploy engineers to reinforce {max(1, total_recs)} critical structures",
        ],
    ))

    # 3. Balanced Response
    strategies.append(Strategy(
        id="balanced",
        name="Balanced Response",
        description="Mixed reactive strategy for moderate risk stabilization.",
        actions=[
            f"Partial evacuation for high-impact sectors in {evac_target}",
            f"Deploy {max(1, amb_limit // 2)} transit-support ambulances",
            "Coordinate city-wide neighborhood watch reporting system",
            f"Restore primary power links for {max(1, gen_limit // 2)} nodes",
            "Monitor area stability via live satellite mapping",
        ],
    ))

    # 4. Infrastructure First
    strategies.append(Strategy(
        id="infra_first",
        name="Infrastructure First",
        description="Focus on backbone utility restoration and road clearing.",
        actions=[
            f"Dispatch heavy road-clearing units to {len(blocked_roads)} blocked routes",
            f"Direct tech-teams to restore power in {evac_target} grid sectors",
            "Prioritize LTE/Cellular network tower restoration",
            "Secure road link parity for hospital logistical convoys",
            f"Phase transition from utility repair to medical response at 75% local clearance",
        ],
    ))

    return strategies


def evaluate_strategy(strategy, zones, infrastructure, roads, disaster):
    """Evaluate a strategy by simulating its impact with dynamic environment-awareness.
    
    Scores each strategy on: risk_reduction, time_saved, survival_improvement, confidence, cost.
    """
    if not zones or not disaster: return strategy

    overall_risk = sum(z.risk_score for z in zones) / max(len(zones), 1)
    high_risk_count = sum(1 for z in zones if z.risk_score > 50)
    blocked_count = sum(1 for r in roads if r.blocked)
    failed_power = sum(1 for i in infrastructure if i.type == "power_station" and i.status == "failed")
    overloaded_hosp = sum(1 for i in infrastructure if i.type == "hospital" and i.current_load > i.capacity)
    total_pop = sum(z.population for z in zones)
    exposed_pop = sum(z.population * (z.risk_score / 100) * 0.6 for z in zones)
    intensity = disaster.intensity

    # ── DYNAMIC DISASTER-SPECIFIC MULTIPLIERS ──
    disaster_type = disaster.type
    
    # Base multipliers
    type_bonus = 1.0
    intensity_penalty = 1.0

    if strategy.id == "aggressive_evac":
        # PENALTY: Massive penalty for grid failures (you don't evac for power outages)
        if disaster_type == DisasterType.GRID_FAILURE:
            type_bonus = 0.15 
        # PENALTY: Huge over-reaction for low intensity
        if intensity < 35:
            intensity_penalty = 0.3
            
        road_block_penalty = 1.0 - min(0.7, (blocked_count / max(1, len(roads))) * 2.2)
        urgency_bonus = 1.0 + (high_risk_count / len(zones)) * 0.7

        risk_reduction = min(45, overall_risk * 0.50 * road_block_penalty * type_bonus * intensity_penalty)
        time_saved = (25 + high_risk_count * 3) * road_block_penalty * intensity_penalty
        survival_imp = (min(45, exposed_pop / total_pop * 100 * 0.8)) * road_block_penalty * urgency_bonus * type_bonus
        confidence = 85 * road_block_penalty * intensity_penalty
        resource_cost = 90

    elif strategy.id == "fortify_in_place":
        # BONUS: Best for earthquakes where movement is deadly
        if disaster_type == DisasterType.EARTHQUAKE:
            type_bonus = 1.6
            
        road_block_bonus = 1.0 + (blocked_count / max(1, len(roads))) * 0.5
        hosp_load_bonus = 1.0 + (overloaded_hosp / 5.0) * 0.4

        risk_reduction = min(30, (overall_risk * 0.35) * road_block_bonus * type_bonus)
        time_saved = 10 + blocked_count * 1.5
        survival_imp = min(25, exposed_pop / total_pop * 100 * 0.5) * hosp_load_bonus * type_bonus
        confidence = 80 + (5 if road_block_bonus > 1.3 else 0)
        resource_cost = 40

    elif strategy.id == "balanced":
        # Scales naturally with intensity
        intensity_mult = 0.4 + (intensity / 100.0)
        risk_reduction = min(35, overall_risk * 0.4 * intensity_mult)
        time_saved = 20 + high_risk_count * 2
        survival_imp = min(30, exposed_pop / total_pop * 100 * 0.6)
        confidence = 90
        resource_cost = 65

    elif strategy.id == "infra_first":
        # BONUS: Absolute priority for grid failures and road clearing
        if disaster_type == DisasterType.GRID_FAILURE:
            type_bonus = 3.5 # Massive boost for power outages
        elif disaster_type == DisasterType.FLOOD:
            type_bonus = 1.3 
            
        failure_bonus = 1.0 + (failed_power / 5.0) * 0.8 + (blocked_count / 10.0) * 0.7
        
        risk_reduction = min(35, (overall_risk * 0.25 + failed_power * 5) * type_bonus)
        time_saved = (20 + blocked_count * 8) * failure_bonus
        survival_imp = min(22, exposed_pop / total_pop * 100 * 0.4) * (1.0 + failed_power * 0.2) * type_bonus
        confidence = 82 + (failed_power * 3)
        resource_cost = 55

    else:
        risk_reduction, time_saved, survival_imp, confidence, resource_cost = 5, 5, 5, 50, 50

    # Composite impact score (weighted)
    impact_score = (
        risk_reduction * 0.40 +        # Increased weight for risk
        time_saved * 0.45 +            # High weight for time
        survival_imp * 0.85 +          # Survival is top priority
        (100 - resource_cost) * 0.12 + 
        confidence * 0.18
    )

    strategy.risk_reduction = round(risk_reduction, 1)
    strategy.time_saved_min = round(time_saved, 1)
    strategy.survival_improvement = round(survival_imp, 1)
    strategy.confidence = round(min(99.5, max(40, confidence)), 1)
    strategy.resource_cost = round(resource_cost, 1)
    strategy.impact_score = round(min(100, impact_score), 1)

    return strategy


def rank_strategies(zones, infrastructure, roads, disaster):
    """Define, evaluate, and rank all strategies.
    
    Returns: (sorted strategies list, recommended_strategy_id)
    """
    if not disaster:
        return [], None

    strategies = define_strategies(zones, infrastructure, roads, disaster)

    for s in strategies:
        evaluate_strategy(s, zones, infrastructure, roads, disaster)

    # Sort by impact score descending
    strategies.sort(key=lambda s: -s.impact_score)

    recommended_id = strategies[0].id if strategies else None
    return strategies, recommended_id
