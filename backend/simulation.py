"""Disaster Simulation Engine – Tick-based simulation with cascading failures and AI decision support."""

import random
from datetime import datetime

from models import (
    Zone, Infrastructure, Road, InfrastructureType, InfraStatus,
    DisasterEvent, DisasterType, SimulationState, CascadingEvent,
)
from agents import (
    WeatherAgent, TrafficAgent, MedicalAgent,
    PowerAgent, LogisticsAgent, CommandAgent,
)
from city_graph import build_city_graph, update_edge_weights
from risk_engine import compute_all_risks
from population_sim import compute_population_metrics, get_city_summary
from resource_optimizer import get_all_allocations
from strategy_ranker import rank_strategies

def build_mumbai():
    """Build a realistic Mumbai layout centered around lat 19.0760, lng 72.8777."""
    district_data = [
        ("z1", "South Mumbai", 18.96, 72.82, [18.92, 19.00], [72.81, 72.84], 80000, True),
        ("z2", "Colaba", 18.91, 72.81, [18.89, 18.93], [72.80, 72.82], 40000, True),
        ("z3", "Dadar", 19.02, 72.84, [19.00, 19.04], [72.83, 72.86], 65000, False),
        ("z4", "Bandra", 19.06, 72.83, [19.04, 19.08], [72.82, 72.85], 70000, True),
        ("z5", "Andheri", 19.11, 72.84, [19.09, 19.14], [72.82, 72.87], 90000, False),
        ("z6", "Juhu", 19.09, 72.82, [19.08, 19.11], [72.81, 72.83], 35000, True),
        ("z7", "Powai", 19.12, 72.90, [19.11, 19.14], [72.89, 72.92], 45000, False),
        ("z8", "Kurla", 19.07, 72.88, [19.05, 19.09], [72.87, 72.90], 85000, True),
        ("z9", "Dharavi", 19.04, 72.85, [19.03, 19.06], [72.84, 72.87], 100000, True),
        ("z10", "Sion", 19.03, 72.86, [19.02, 19.05], [72.85, 72.88], 55000, False),
        ("z11", "Chembur", 19.05, 72.90, [19.03, 19.07], [72.88, 72.92], 60000, False),
        ("z12", "Borivali", 19.23, 72.85, [19.20, 19.25], [72.84, 72.87], 75000, False),
        ("z13", "Thane", 19.21, 72.97, [19.18, 19.24], [72.95, 73.00], 80000, False),
        ("z14", "Navi Mumbai", 19.03, 73.02, [19.00, 19.06], [73.00, 73.05], 65000, True),
    ]

    zones = []
    for d_id, d_name, c_lat, c_lng, lat_bds, lng_bds, pop, flood in district_data:
        polygon = [
            [lat_bds[0], lng_bds[0]],
            [lat_bds[1], lng_bds[0]],
            [lat_bds[1], lng_bds[1]],
            [lat_bds[0], lng_bds[1]]
        ]
        zones.append(Zone(
            id=d_id, name=d_name, center=[c_lat, c_lng], radius=1500,
            polygon=polygon, population=pop, flood_prone=flood
        ))

    infrastructure = []
    infra_counts = {
        InfrastructureType.HOSPITAL: 45,
        InfrastructureType.POWER_STATION: 25,
        InfrastructureType.SHELTER: 50,
        InfrastructureType.FIRE_STATION: 30,
        InfrastructureType.POLICE_STATION: 40,
        InfrastructureType.METRO_STATION: 35,
        InfrastructureType.COMMUNICATIONS: 20,
        InfrastructureType.WATER_PUMP: 15,
    }

    def random_coord_in_land():
        dist = random.choice(district_data)
        lat = random.uniform(dist[4][0], dist[4][1])
        lng = random.uniform(dist[5][0], dist[5][1])
        return lat, lng, dist[1]

    for i_type, count in infra_counts.items():
        for i in range(count):
            lat, lng, dist_name = random_coord_in_land()
            capacity = random.randint(100, 1000)
            if i_type == InfrastructureType.HOSPITAL:
                names = ["KEM", "Sion", "JJ", "Lilavati", "Nanavati", "Hinduja", "Leelavati"]
                name = f"{random.choice(names)} Hospital - {dist_name}"
            elif i_type == InfrastructureType.POWER_STATION:
                name = f"Grid Substation {random.randint(1,99)} ({dist_name})"
                capacity = random.randint(300, 2000)
            elif i_type == InfrastructureType.SHELTER:
                name = f"BMC Relief Camp {random.randint(1,99)} - {dist_name}"
            else:
                name = f"{i_type.name.title().replace('_', ' ')} {random.randint(1,50)} ({dist_name})"
                
            infrastructure.append(Infrastructure(
                id=f"{i_type.value}_{i}", name=name, type=i_type, lat=lat, lng=lng, capacity=capacity
            ))

    roads = []
    weh_points = []
    lat, lng = 18.93, 72.82
    for _ in range(25):
        weh_points.append([lat, lng])
        lat += random.uniform(0.01, 0.015)
        lng += random.uniform(-0.002, 0.005)
    roads.append(Road(id="r_weh", name="Western Express Highway", points=weh_points))

    eeh_points = []
    lat, lng = 19.03, 72.86
    for _ in range(20):
        eeh_points.append([lat, lng])
        lat += random.uniform(0.01, 0.015)
        lng += random.uniform(0.002, 0.008)
    roads.append(Road(id="r_eeh", name="Eastern Express Highway", points=eeh_points))

    num_connectors = 40
    for i in range(num_connectors):
        dist = random.choice(district_data)
        clat, clng = dist[2], dist[3]
        pts = [[clat, clng]]
        cur_lat, cur_lng = clat, clng
        for _ in range(random.randint(3, 8)):
            cur_lat += random.uniform(-0.008, 0.008)
            cur_lng += random.uniform(-0.008, 0.008)
            pts.append([cur_lat, cur_lng])
        roads.append(Road(id=f"r_conn_{i}", name=f"Local Arterial - {dist[1]}", points=pts))

    return zones, infrastructure, roads


class SimulationEngine:
    """Tick-based disaster simulation engine with AI decision-support modules."""

    def __init__(self):
        self.zones, self.infrastructure, self.roads = build_mumbai()
        self.tick = 0
        self.running = False
        self.disaster = None
        self.agents = {
            "weather": WeatherAgent(),
            "traffic": TrafficAgent(),
            "medical": MedicalAgent(),
            "power": PowerAgent(),
            "logistics": LogisticsAgent(),
            "command": CommandAgent(),
        }
        self.recommendations = []
        self.cascading_events = []
        self.agent_logs = []
        self.timeline = []

        # Decision-support modules
        self.graph_nodes, self.graph_edges, self.adj = build_city_graph(
            self.zones, self.infrastructure, self.roads
        )
        self.population_metrics = []
        self.resource_allocations = []
        self.strategies = []
        self.recommended_strategy_id = None
        self.city_summary = {}
        self.risk_breakdowns = {}

    def start(self, disaster: DisasterEvent):
        """Start a simulation with the given disaster event."""
        self.disaster = disaster
        self.running = True
        self.tick = 0
        # Reset all infrastructure
        for infra in self.infrastructure:
            infra.status = InfraStatus.OPERATIONAL
            infra.damage = 0.0
            infra.current_load = 0
        for road in self.roads:
            road.status = InfraStatus.OPERATIONAL
            road.blocked = False
            road.damage = 0.0
        for zone in self.zones:
            zone.risk_score = 0.0
            zone.hazard_intensity = 0.0
        for agent in self.agents.values():
            agent.logs.clear()
            agent.state = agent.__class__().state
        self.recommendations = []
        self.cascading_events = []
        self.agent_logs = []
        self.timeline = []
        self.population_metrics = []
        self.resource_allocations = []
        self.strategies = []
        self.recommended_strategy_id = None
        self.city_summary = {}

        # Rebuild graph with fresh edge weights
        self.graph_nodes, self.graph_edges, self.adj = build_city_graph(
            self.zones, self.infrastructure, self.roads
        )

    def step(self) -> SimulationState:
        """Run one simulation tick."""
        if not self.running or not self.disaster:
            return self.get_state()

        self.tick += 1

        # Gradually increase disaster intensity over time
        if self.disaster.intensity < 95:
            self.disaster.intensity = min(100, self.disaster.intensity + random.uniform(0.5, 2.5))

        # ── 1. Weather Agent → updates zone hazard intensities ──
        weather_recs = self.agents["weather"].analyze(
            self.zones, self.infrastructure, self.roads, self.disaster
        )

        # ── 2. Traffic Agent → road statuses ──
        traffic_recs = self.agents["traffic"].analyze(
            self.zones, self.infrastructure, self.roads, self.disaster
        )

        # ── 3. Update Graph Edge Weights (blocked roads, hazard) ──
        update_edge_weights(self.graph_nodes, self.graph_edges, self.adj, self.zones, self.roads)

        # ── 4. Risk Engine → composite zone risk scores ──
        self.risk_breakdowns = compute_all_risks(self.zones, self.infrastructure, self.roads)

        # ── 5. Population Simulation → exposure, evac, casualties ──
        self.population_metrics = compute_population_metrics(
            self.zones, self.infrastructure, self.graph_nodes, self.adj, self.tick
        )
        self.city_summary = get_city_summary(self.population_metrics)

        # ── 6. Medical Agent ──
        medical_recs = self.agents["medical"].analyze(
            self.zones, self.infrastructure, self.roads, self.disaster,
            other_agent_data={"traffic": self.agents["traffic"].state}
        )

        # ── 7. Power Agent ──
        power_recs = self.agents["power"].analyze(
            self.zones, self.infrastructure, self.roads, self.disaster,
            other_agent_data={"medical": self.agents["medical"].state}
        )

        # ── 8. Logistics Agent ──
        logistics_recs = self.agents["logistics"].analyze(
            self.zones, self.infrastructure, self.roads, self.disaster,
            other_agent_data={"traffic": self.agents["traffic"].state}
        )

        # ── 9. Resource Optimizer → allocations ──
        self.resource_allocations = get_all_allocations(
            self.zones, self.infrastructure, self.graph_nodes, self.adj
        )

        # ── 10. Command Agent → aggregate recommendations ──
        all_agent_data = {
            "weather": {"recommendations": [r.dict() for r in weather_recs], **self.agents["weather"].state},
            "traffic": {"recommendations": [r.dict() for r in traffic_recs], **self.agents["traffic"].state},
            "medical": {"recommendations": [r.dict() for r in medical_recs], **self.agents["medical"].state},
            "power": {"recommendations": [r.dict() for r in power_recs], **self.agents["power"].state},
            "logistics": {"recommendations": [r.dict() for r in logistics_recs], **self.agents["logistics"].state},
        }
        command_recs = self.agents["command"].analyze(
            self.zones, self.infrastructure, self.roads, self.disaster,
            other_agent_data=all_agent_data
        )

        # ── 11. Strategy Ranker → evaluate & rank strategies ──
        self.strategies, self.recommended_strategy_id = rank_strategies(
            self.zones, self.infrastructure, self.roads, self.disaster
        )

        # Merge recommendations
        self.recommendations = weather_recs + traffic_recs + medical_recs + power_recs + logistics_recs + command_recs

        # Collect agent logs
        for agent in self.agents.values():
            for log in agent.get_logs():
                log["tick"] = self.tick
                log["timestamp"] = datetime.now().isoformat()
                self.agent_logs.append(log)

        if len(self.agent_logs) > 50:
            self.agent_logs = self.agent_logs[-50:]

        # Build cascading events
        self.cascading_events = self._compute_cascading_events()

        state = self.get_state()
        self.timeline.append(state.dict())
        if len(self.timeline) > 60:
            self.timeline = self.timeline[-60:]

        return state

    def _compute_cascading_events(self) -> list[CascadingEvent]:
        """Determine the cascading failure chain."""
        events = []
        step = 1

        blocked_roads = [r for r in self.roads if r.blocked]
        if blocked_roads:
            events.append(CascadingEvent(
                step=step,
                source=self.disaster.type.value.title(),
                target="Road Network",
                description=f"{len(blocked_roads)} road(s) blocked by {self.disaster.type.value}",
                icon="🌊" if self.disaster.type == DisasterType.FLOOD else "🌍"
            ))
            step += 1

            events.append(CascadingEvent(
                step=step,
                source="Road Blockage",
                target="Emergency Response",
                description="Ambulance routes compromised – response time increased",
                icon="🚧"
            ))
            step += 1

        overloaded = [i for i in self.infrastructure
                      if i.type == InfrastructureType.HOSPITAL and i.current_load > i.capacity]
        if overloaded:
            events.append(CascadingEvent(
                step=step,
                source="Emergency Response" if blocked_roads else "Casualty Surge",
                target="Hospital System",
                description=f"{len(overloaded)} hospital(s) over capacity",
                icon="🏥"
            ))
            step += 1

        failed_stations = [i for i in self.infrastructure
                           if i.type == InfrastructureType.POWER_STATION and i.status == InfraStatus.FAILED]
        if failed_stations or (overloaded and self.agents["power"].state.get("grid_stress", 0) > 60):
            events.append(CascadingEvent(
                step=step,
                source="Hospital Overload" if overloaded else "Infrastructure Damage",
                target="Power Grid",
                description=f"Grid stress at {self.agents['power'].state.get('grid_stress', 0):.0f}%"
                            + (f", {len(failed_stations)} station(s) failed" if failed_stations else ""),
                icon="⚡"
            ))
            step += 1

        if blocked_roads and self.agents["logistics"].state.get("deliveries_pending", 0) > 0:
            events.append(CascadingEvent(
                step=step,
                source="Road Blockage",
                target="Supply Chain",
                description="Supply deliveries delayed – shelters at risk",
                icon="📦"
            ))

        return events

    def get_state(self) -> SimulationState:
        """Get current simulation state including decision-support data."""
        overall_risk = sum(z.risk_score for z in self.zones) / max(len(self.zones), 1)
        return SimulationState(
            tick=self.tick,
            running=self.running,
            disaster=self.disaster,
            zones=self.zones,
            infrastructure=self.infrastructure,
            roads=self.roads,
            recommendations=self.recommendations,
            cascading_events=self.cascading_events,
            agent_logs=self.agent_logs,
            overall_risk=overall_risk,
            timestamp=datetime.now().isoformat(),
            # Decision-support data
            population_metrics=self.population_metrics,
            resource_allocations=self.resource_allocations,
            strategies=self.strategies,
            recommended_strategy_id=self.recommended_strategy_id,
            city_summary=self.city_summary,
        )

    def get_timeline(self):
        """Get simulation timeline for playback."""
        return self.timeline

    def run_whatif(self, intervention) -> dict:
        """Run a what-if scenario and apply the intervention to the active simulation."""
        # Snapshot 'before'
        before_state = self.get_state()
        before_risk = before_state.overall_risk
        before_infra = {i.id: i.status.value for i in before_state.infrastructure}
        before_cap = sum(i.capacity for i in self.infrastructure if i.type == InfrastructureType.HOSPITAL)

        # Apply intervention directly to active objects
        if intervention.action == "add_ambulances":
            for infra in self.infrastructure:
                if infra.type == InfrastructureType.HOSPITAL:
                    infra.capacity += intervention.amount * 20
                    infra.current_load = max(0, infra.current_load - intervention.amount * 10)
                    if infra.current_load <= infra.capacity:
                        infra.status = InfraStatus.OPERATIONAL

        elif intervention.action == "deploy_generator":
            for infra in self.infrastructure:
                if infra.type == InfrastructureType.POWER_STATION:
                    infra.damage = max(0, infra.damage - intervention.amount * 25)
                    if infra.damage < 40:
                        infra.status = InfraStatus.OPERATIONAL
                    elif infra.damage < 70:
                        infra.status = InfraStatus.DEGRADED
            for infra in self.infrastructure:
                if infra.type == InfrastructureType.HOSPITAL and intervention.target_zone:
                    infra.damage = max(0, infra.damage - 10)

        elif intervention.action == "open_shelter":
            new_shelter = Infrastructure(
                id=f"s_new_{random.randint(100,999)}",
                name="Emergency Shelter (Deployed)",
                type=InfrastructureType.SHELTER,
                # Random location around Mumbai center
                lat=19.0760 + random.uniform(-0.08, 0.08),
                lng=72.8777 + random.uniform(-0.05, 0.05),
                capacity=intervention.amount * 200,
            )
            self.infrastructure.append(new_shelter)

        # Artificially lower overall risk immediately to reflect the intervention
        for z in self.zones:
            z.risk_score = max(0, z.risk_score * 0.85)

        # Compute after metrics
        after_state = self.get_state()
        after_risk = after_state.overall_risk
        after_infra = {i.id: i.status.value for i in after_state.infrastructure}
        after_cap = sum(i.capacity for i in self.infrastructure if i.type == InfrastructureType.HOSPITAL)

        return {
            "before": {
                "overall_risk": round(before_risk, 1),
                "infrastructure_status": before_infra,
                "hospital_capacity": before_cap,
            },
            "after": {
                "overall_risk": round(after_risk, 1),
                "infrastructure_status": after_infra,
                "hospital_capacity": after_cap,
            },
            "improvement": {
                "risk_reduction": round(before_risk - after_risk, 1),
                "intervention": intervention.action,
                "amount": intervention.amount,
            }
        }
