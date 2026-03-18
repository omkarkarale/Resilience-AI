"""
ML Engine — Scikit-learn risk/casualty prediction + OR-Tools ambulance optimization.

Architecture:
  1. Feature extraction  → derive numeric vectors from live sim state
  2. Risk model          → RandomForestRegressor  (risk score 0-100 per zone)
  3. Casualty model      → GradientBoostingRegressor (estimated casualties per zone)
  4. Uncertainty         → per-tree std-dev → confidence interval
  5. OR-Tools ILP        → allocate ambulances, generators, shelter buses to zones
  6. Integration hooks   → called from SimulationEngine.step()

Why this beats the basic plan:
  - Features are derived FROM your real sim objects (no fake inputs required).
  - Synthetic training data matches your actual disaster physics formulas.
  - Two models: risk AND casualties (different decision questions).
  - Confidence intervals from forest variance (not a hardcoded "High").
  - OR-Tools uses real constraints: supply limits, min coverage, priority tiers.
  - Clean interface: ml_engine.analyze(zones, infra, roads, disaster, tick) → MLOutput
"""

import math
import numpy as np
from typing import Optional

# ── Scikit-learn ──────────────────────────────────────────────────────────────
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import MinMaxScaler

# ── OR-Tools ──────────────────────────────────────────────────────────────────
from ortools.linear_solver import pywraplp

# ── Pydantic output models live in models.py to avoid circular imports ─────────
from models import MLOutput, ZoneMLPrediction


# =============================================================================
#  Feature Engineering
#  Extracts an 8-dimensional feature vector from live sim objects per zone.
# =============================================================================

FEATURE_NAMES = [
    "hazard_intensity",       # 0-100  — direct from zone
    "population_density_norm",# 0-100  — pop / max_pop
    "road_blockage_pct",      # 0-100  — % roads blocked near zone
    "hospital_load_pct",      # 0-100  — avg load% of nearby hospitals
    "power_damage_pct",       # 0-100  — avg damage% of nearby power stations
    "flood_prone",            # 0 or 1
    "infra_damage_index",     # 0-100  — avg damage of ALL nearby infra
    "disaster_intensity",     # 0-100  — the event's global intensity
]

MAX_POP = 100_000
PROXIMITY_KM = 2.5


def _haversine_km(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def extract_features(zone, infrastructure, roads, disaster) -> np.ndarray:
    """
    Build the 8-feature vector for one zone using live sim objects.
    All features are already 0-100 or 0-1 — no additional scaling needed
    before training (we use MinMaxScaler anyway for robustness).
    """
    clat, clng = zone.center[0], zone.center[1]

    # ── Road blockage ──────────────────────────────────────────────────────
    nearby_roads, blocked_roads = 0, 0
    for road in roads:
        for pt in road.points[:4]:
            dist = _haversine_km(clat, clng, pt[0], pt[1])
            if dist < PROXIMITY_KM:
                nearby_roads += 1
                if road.blocked:
                    blocked_roads += 1
                break
    road_blockage_pct = (blocked_roads / max(nearby_roads, 1)) * 100

    # ── Hospital load ──────────────────────────────────────────────────────
    hosp_loads = []
    power_damages = []
    all_infra_damages = []
    for infra in infrastructure:
        dist = _haversine_km(clat, clng, infra.lat, infra.lng)
        if dist > PROXIMITY_KM:
            continue
        all_infra_damages.append(infra.damage)
        t = str(infra.type)
        if "hospital" in t:
            load_pct = (infra.current_load / max(infra.capacity, 1)) * 100
            hosp_loads.append(min(100, load_pct))
        elif "power" in t:
            power_damages.append(infra.damage)

    hospital_load_pct = sum(hosp_loads) / max(len(hosp_loads), 1) if hosp_loads else 50.0
    power_damage_pct  = sum(power_damages) / max(len(power_damages), 1) if power_damages else 0.0
    infra_damage_idx  = sum(all_infra_damages) / max(len(all_infra_damages), 1) if all_infra_damages else 0.0

    pop_density_norm = min(100.0, (zone.population / MAX_POP) * 100)
    disaster_intensity = disaster.intensity if disaster else 0.0

    return np.array([
        zone.hazard_intensity,
        pop_density_norm,
        road_blockage_pct,
        hospital_load_pct,
        power_damage_pct,
        float(zone.flood_prone),
        infra_damage_idx,
        disaster_intensity,
    ], dtype=np.float64)


# =============================================================================
#  Synthetic Training Data Generator
#  Matches your actual disaster physics so the model learns real patterns.
# =============================================================================

def _generate_training_data(n: int = 2000, seed: int = 42) -> tuple:
    """
    Generate synthetic (X, y_risk, y_casualties) that mirrors the
    weighted risk formula in risk_engine.py and population_sim.py.

    risk_engine weights:
        W_HAZARD=0.30, W_INFRA_DAMAGE=0.20, W_POPULATION=0.15,
        W_ROAD_ACCESS=0.20, W_MEDICAL_LOAD=0.15

    We add realistic noise + nonlinear interactions (flood × hazard,
    pop × infra_damage) so the model learns something beyond the linear formula.
    """
    rng = np.random.default_rng(seed)

    hazard        = rng.uniform(0, 100, n)
    pop_norm      = rng.uniform(0, 100, n)
    road_block    = rng.uniform(0, 100, n)
    hosp_load     = rng.uniform(0, 100, n)
    power_dmg     = rng.uniform(0, 100, n)
    flood_prone   = rng.integers(0, 2, n).astype(float)
    infra_dmg     = rng.uniform(0, 100, n)
    disaster_int  = rng.uniform(0, 100, n)

    X = np.column_stack([
        hazard, pop_norm, road_block, hosp_load,
        power_dmg, flood_prone, infra_dmg, disaster_int,
    ])

    # Risk — mirrors risk_engine.py weights, with nonlinear interactions
    risk = (
        0.30 * hazard
        + 0.20 * infra_dmg
        + 0.15 * pop_norm
        + 0.20 * road_block
        + 0.15 * hosp_load
        # Interactions: flood amplifies hazard, high pop + damage combo
        + 0.05 * flood_prone * hazard
        + 0.04 * (pop_norm / 100) * (infra_dmg / 100) * 100
        + 0.03 * (disaster_int / 100) * hazard
    )
    risk = np.clip(risk / 100, 0, 1)  # normalise 0-1 for training

    # Noise
    risk += rng.normal(0, 0.02, n)
    risk = np.clip(risk, 0, 1)

    # Casualties — driven by exposure × medical delay × hazard
    exposure = pop_norm / 100 * hazard / 100 * 0.6  # mirrors population_sim.py
    medical_delay = np.clip(hosp_load / 100 * road_block / 100 * 3.0, 0, 3)
    casualty_rate = 0.002 * (hazard / 100) * (medical_delay + 1)
    casualties = exposure * (pop_norm / 100 * MAX_POP) * casualty_rate
    casualties += rng.normal(0, 0.5, n)
    casualties = np.clip(casualties, 0, None)

    return X, risk, casualties


# =============================================================================
#  Model Training
# =============================================================================

class DisasterMLModels:
    """
    Trains and holds two models:
      - risk_model      → RandomForestRegressor  (predict zone risk 0-1)
      - casualty_model  → GradientBoostingRegressor (predict casualties count)

    Both are trained once on init with synthetic data that mirrors your
    simulation physics. They are then called every tick.
    """

    def __init__(self, n_train: int = 2000):
        X, y_risk, y_cas = _generate_training_data(n_train)

        self.scaler = MinMaxScaler()
        X_scaled = self.scaler.fit_transform(X)

        # ── Risk Model ─────────────────────────────────────────────────────
        self.risk_model = RandomForestRegressor(
            n_estimators=120,
            max_depth=10,
            min_samples_leaf=4,
            random_state=42,
            n_jobs=-1,
        )
        self.risk_model.fit(X_scaled, y_risk)

        # ── Casualty Model ─────────────────────────────────────────────────
        self.casualty_model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.05,
            max_depth=5,
            subsample=0.8,
            random_state=42,
        )
        self.casualty_model.fit(X_scaled, y_cas)

        # Quick R² on training data (good enough for hackathon; use holdout in prod)
        self.risk_r2     = round(self.risk_model.score(X_scaled, y_risk), 3)
        self.casualty_r2 = round(self.casualty_model.score(X_scaled, y_cas), 3)

        self._importances = dict(zip(FEATURE_NAMES, self.risk_model.feature_importances_))

    def predict_risk(self, X_raw: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Returns:
            mean_risk   (n,)  — mean prediction 0-1
            ci_low      (n,)  — 2.5th percentile across trees
            ci_high     (n,)  — 97.5th percentile across trees
        """
        X_s = self.scaler.transform(X_raw)
        # Per-tree predictions for uncertainty
        tree_preds = np.array([t.predict(X_s) for t in self.risk_model.estimators_])
        mean_risk = tree_preds.mean(axis=0)
        ci_low    = np.percentile(tree_preds, 2.5,  axis=0)
        ci_high   = np.percentile(tree_preds, 97.5, axis=0)
        return np.clip(mean_risk, 0, 1), np.clip(ci_low, 0, 1), np.clip(ci_high, 0, 1)

    def predict_casualties(self, X_raw: np.ndarray) -> np.ndarray:
        X_s = self.scaler.transform(X_raw)
        return np.clip(self.casualty_model.predict(X_s), 0, None)

    def top_features(self, X_raw_row: np.ndarray, top_k: int = 3) -> dict:
        """Return top-k contributing features for a single zone (for explainability)."""
        contributions = {
            name: round(float(X_raw_row[i] / 100 * imp), 4)
            for i, (name, imp) in enumerate(self._importances.items())
        }
        sorted_c = sorted(contributions.items(), key=lambda kv: -kv[1])
        return dict(sorted_c[:top_k])


# =============================================================================
#  OR-Tools Integer Linear Program — Resource Allocation
# =============================================================================

# Global resource pool
RESOURCE_POOL = {
    "ambulance":    50,
    "generator":    20,
    "shelter_bus":  30,
}

# Minimum allocation guarantees (per zone if risk > threshold)
MIN_AMBULANCE_IF_HIGH_RISK = 2
MIN_BUS_IF_HIGH_RISK       = 1
HIGH_RISK_THRESHOLD        = 0.45   # on the 0-1 ML scale


def optimize_resources(
    zone_ids:        list[str],
    risk_scores:     list[float],   # 0-1 from ML
    populations:     list[int],
    exposed_pops:    list[int],
    hosp_access:     list[float],   # travel minutes to nearest hospital
    shelter_access:  list[float],   # travel minutes to nearest shelter
    flood_prone:     list[bool],
    total_ambulances: int = RESOURCE_POOL["ambulance"],
    total_generators: int = RESOURCE_POOL["generator"],
    total_buses:      int = RESOURCE_POOL["shelter_bus"],
) -> dict[str, list[int]]:
    """
    ILP that maximises weighted impact across all zones subject to:
      - Total supply constraints for each resource type
      - Minimum allocations for high-risk zones
      - Integer decisions (you can't send half an ambulance)

    Objective:
      maximise  Σ_i  risk_i * pop_weight_i * (amb_i * w_amb + gen_i * w_gen + bus_i * w_bus)

    Returns dict with keys "ambulance", "generator", "shelter_bus"
    each being a list aligned with zone_ids.
    """
    n = len(zone_ids)
    if n == 0:
        return {"ambulance": [], "generator": [], "shelter_bus": []}

    solver = pywraplp.Solver.CreateSolver("SCIP")
    if not solver:
        # Fallback: proportional allocation if OR-Tools unavailable
        return _proportional_fallback(risk_scores, total_ambulances, total_generators, total_buses)

    solver.SetTimeLimit(3000)  # 3 second timeout

    # ── Decision variables ─────────────────────────────────────────────────
    amb = [solver.IntVar(0, total_ambulances, f"amb_{i}") for i in range(n)]
    gen = [solver.IntVar(0, total_generators, f"gen_{i}") for i in range(n)]
    bus = [solver.IntVar(0, total_buses,      f"bus_{i}") for i in range(n)]

    # ── Supply constraints ─────────────────────────────────────────────────
    solver.Add(solver.Sum(amb) <= total_ambulances)
    solver.Add(solver.Sum(gen) <= total_generators)
    solver.Add(solver.Sum(bus) <= total_buses)

    # ── Minimum allocations for high-risk zones ────────────────────────────
    for i, r in enumerate(risk_scores):
        if r >= HIGH_RISK_THRESHOLD:
            solver.Add(amb[i] >= MIN_AMBULANCE_IF_HIGH_RISK)
            solver.Add(bus[i] >= MIN_BUS_IF_HIGH_RISK)

    # ── Objective weights ──────────────────────────────────────────────────
    # Scale population so large zones don't dominate unfairly
    max_pop  = max(populations) if populations else 1
    max_exp  = max(exposed_pops) if exposed_pops else 1
    max_dist = max(max(hosp_access), max(shelter_access), 1)

    objective_terms = []
    for i in range(n):
        pop_weight  = populations[i]  / max_pop   # 0-1
        exp_weight  = exposed_pops[i] / max_exp   # 0-1
        dist_weight = (hosp_access[i] + shelter_access[i]) / (2 * max_dist)  # harder to reach = more urgent
        flood_bonus = 1.2 if flood_prone[i] else 1.0

        zone_urgency = risk_scores[i] * (0.4 * pop_weight + 0.4 * exp_weight + 0.2 * dist_weight) * flood_bonus

        # Ambulances matter most where hospital access is poor
        amb_value = zone_urgency * (1 + hosp_access[i] / max_dist)
        # Generators matter where power damage is high (already embedded in risk)
        gen_value = zone_urgency * 0.6
        # Shelter buses matter where shelter access is poor and exposed pop is high
        bus_value = zone_urgency * (1 + shelter_access[i] / max_dist) * exp_weight

        objective_terms.append(amb[i] * amb_value)
        objective_terms.append(gen[i] * gen_value)
        objective_terms.append(bus[i] * bus_value)

    solver.Maximize(solver.Sum(objective_terms))

    status = solver.Solve()
    ok = status in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE)

    if ok:
        return {
            "ambulance":   [int(amb[i].solution_value()) for i in range(n)],
            "generator":   [int(gen[i].solution_value()) for i in range(n)],
            "shelter_bus": [int(bus[i].solution_value()) for i in range(n)],
            "status": "optimal" if status == pywraplp.Solver.OPTIMAL else "feasible",
        }
    else:
        return _proportional_fallback(risk_scores, total_ambulances, total_generators, total_buses)


def _proportional_fallback(risk_scores, total_amb, total_gen, total_bus):
    """Simple proportional allocation used when OR-Tools fails."""
    n = len(risk_scores)
    total_risk = sum(risk_scores) or 1
    amb = [max(0, round(r / total_risk * total_amb)) for r in risk_scores]
    gen = [max(0, round(r / total_risk * total_gen)) for r in risk_scores]
    bus = [max(0, round(r / total_risk * total_bus)) for r in risk_scores]
    # Fix rounding overflow
    while sum(amb) > total_amb: amb[amb.index(max(amb))] -= 1
    while sum(gen) > total_gen: gen[gen.index(max(gen))] -= 1
    while sum(bus) > total_bus: bus[bus.index(max(bus))] -= 1
    return {"ambulance": amb, "generator": gen, "shelter_bus": bus, "status": "fallback"}


# =============================================================================
#  Main Integration Interface
# =============================================================================

# Singleton — trained once at import time
_models: Optional[DisasterMLModels] = None


def _get_models() -> DisasterMLModels:
    global _models
    if _models is None:
        _models = DisasterMLModels(n_train=2000)
    return _models


def analyze(zones, infrastructure, roads, disaster, population_metrics=None) -> MLOutput:
    """
    Called from SimulationEngine.step() after risk_engine and population_sim have run.

    Args:
        zones:              list[Zone]
        infrastructure:     list[Infrastructure]
        roads:              list[Road]
        disaster:           DisasterEvent | None
        population_metrics: list[PopulationMetrics] | None  — from population_sim

    Returns:
        MLOutput — ready to attach to SimulationState
    """
    models = _get_models()

    if not disaster or not zones:
        return MLOutput(optimization_status="no_disaster")

    # ── Feature extraction ─────────────────────────────────────────────────
    feature_matrix = np.array([
        extract_features(z, infrastructure, roads, disaster)
        for z in zones
    ])

    # ── Predictions ────────────────────────────────────────────────────────
    mean_risks, ci_lows, ci_highs = models.predict_risk(feature_matrix)
    pred_casualties = models.predict_casualties(feature_matrix)

    # ── Build population lookup ─────────────────────────────────────────────
    pop_metrics_by_zone: dict = {}
    if population_metrics:
        for pm in population_metrics:
            pop_metrics_by_zone[pm.zone_id] = pm

    # ── OR-Tools inputs ────────────────────────────────────────────────────
    zone_ids      = [z.id for z in zones]
    populations   = [z.population for z in zones]
    exposed_pops  = []
    hosp_access   = []
    shelter_access= []
    flood_prone   = [z.flood_prone for z in zones]

    for z in zones:
        pm = pop_metrics_by_zone.get(z.id)
        exposed_pops.append(pm.exposed if pm else int(z.population * 0.3))
        hosp_access.append(pm.est_evac_time_min if pm else 30.0)
        # Use evac_time as proxy for shelter access if specific metric unavailable
        shelter_access.append((pm.est_evac_time_min * 0.8) if pm else 25.0)

    # ── Dynamic Resource Pools based on Disaster Severity ──────────────────
    avg_pred_risk = float(mean_risks.mean()) if len(mean_risks) > 0 else 0.0
    # Scale resources linearly up to full use when risk gets above ~55%
    urgency_scalar = min(1.0, max(0.15, avg_pred_risk * 1.8))
    
    dyn_amb = max(3, int(RESOURCE_POOL["ambulance"] * urgency_scalar))
    dyn_gen = max(1, int(RESOURCE_POOL["generator"] * urgency_scalar))
    dyn_bus = max(2, int(RESOURCE_POOL["shelter_bus"] * urgency_scalar))

    # ── Resource optimization ──────────────────────────────────────────────
    alloc = optimize_resources(
        zone_ids, mean_risks.tolist(), populations,
        exposed_pops, hosp_access, shelter_access, flood_prone,
        total_ambulances=dyn_amb,
        total_generators=dyn_gen,
        total_buses=dyn_bus,
    )

    opt_status = alloc.get("status", "unknown")

    # ── Assemble per-zone predictions ──────────────────────────────────────
    predictions = []
    for i, zone in enumerate(zones):
        top_feats = models.top_features(feature_matrix[i])
        predictions.append(ZoneMLPrediction(
            zone_id=zone.id,
            zone_name=zone.name,
            predicted_risk=round(float(mean_risks[i]) * 100, 1),   # back to 0-100
            predicted_casualties=max(0, int(round(float(pred_casualties[i])))),
            risk_confidence_low=round(float(ci_lows[i])  * 100, 1),
            risk_confidence_high=round(float(ci_highs[i]) * 100, 1),
            feature_importances=top_feats,
            ambulances_allocated=alloc["ambulance"][i],
            generators_allocated=alloc["generator"][i],
            shelter_buses_allocated=alloc["shelter_bus"][i],
        ))

    # ── Summary ────────────────────────────────────────────────────────────
    total_pred_casualties = sum(p.predicted_casualties for p in predictions)
    avg_predicted_risk    = round(float(mean_risks.mean()) * 100, 1)
    highest_risk_zone     = max(predictions, key=lambda p: p.predicted_risk)
    avg_confidence_width  = round(
        float(np.mean((ci_highs - ci_lows) * 100)), 1
    )

    ml_summary = {
        "avg_predicted_risk": avg_predicted_risk,
        "total_predicted_casualties": total_pred_casualties,
        "highest_risk_zone": highest_risk_zone.zone_name,
        "highest_risk_score": highest_risk_zone.predicted_risk,
        "avg_confidence_interval_width": avg_confidence_width,
        "risk_model_r2": models.risk_r2,
        "casualty_model_r2": models.casualty_r2,
        "top_global_features": {
            k: round(v, 4) for k, v in
            sorted(models._importances.items(), key=lambda x: -x[1])[:4]
        },
    }

    return MLOutput(
        predictions=predictions,
        model_accuracy_r2=models.risk_r2,
        casualty_model_r2=models.casualty_r2,
        total_ambulances_deployed=sum(alloc["ambulance"]),
        total_generators_deployed=sum(alloc["generator"]),
        total_shelter_buses_deployed=sum(alloc["shelter_bus"]),
        optimization_status=opt_status,
        ml_summary=ml_summary,
    )
