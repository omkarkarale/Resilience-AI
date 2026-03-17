"""Disaster Simulation Engine – Tick-based simulation with cascading failures and AI decision support."""

import random
from datetime import datetime

from models import (  # pyre-ignore[21]
    Zone, Infrastructure, Road, InfrastructureType, InfraStatus,
    DisasterEvent, DisasterType, SimulationState, CascadingEvent,
)
from agents import (  # pyre-ignore[21]
    WeatherAgent, TrafficAgent, MedicalAgent,
    PowerAgent, LogisticsAgent, CommandAgent,
)
from city_graph import build_city_graph, update_edge_weights  # pyre-ignore[21]
from risk_engine import compute_all_risks  # pyre-ignore[21]
from population_sim import compute_population_metrics, get_city_summary  # pyre-ignore[21]
from resource_optimizer import get_all_allocations  # pyre-ignore[21]
from strategy_ranker import rank_strategies  # pyre-ignore[21]
import ml_engine

def build_mumbai():
    """Build a realistic Mumbai layout centered around lat 19.0760, lng 72.8777."""
    # Fixed seed so infrastructure locations are deterministic across resets
    rng_state = random.getstate()
    random.seed(42)

    # Zone bounding boxes are meticulously crafted to fit Mumbai's actual landmass.
    # Mumbai is a narrow peninsula; imprecise rectangles will spill into the Arabian Sea
    # or the eastern harbour.
    district_data = [
        #  id,   name,           cLat,   cLng,  latBounds,       lngBounds,       pop,   flood
        ("z1",  "South Mumbai",  18.945, 72.830, [18.930, 18.965], [72.820, 72.840], 80000,  True),
        ("z2",  "Colaba",        18.915, 72.820, [18.895, 18.930], [72.813, 72.828], 40000,  True),
        ("z3",  "Dadar",         19.020, 72.845, [19.010, 19.035], [72.835, 72.855], 65000,  False),
        ("z4",  "Bandra",        19.050, 72.835, [19.040, 19.065], [72.830, 72.845], 70000,  True),
        ("z5",  "Andheri",       19.110, 72.845, [19.100, 19.125], [72.835, 72.860], 90000,  False),
        ("z6",  "Juhu",          19.100, 72.830, [19.090, 19.110], [72.825, 72.835], 35000,  True),
        ("z7",  "Powai",         19.120, 72.900, [19.110, 19.135], [72.890, 72.910], 45000,  False),
        ("z8",  "Kurla",         19.070, 72.880, [19.060, 19.085], [72.870, 72.890], 85000,  True),
        ("z9",  "Dharavi",       19.042, 72.855, [19.035, 19.050], [72.850, 72.860], 100000, True),
        ("z10", "Sion",          19.040, 72.865, [19.030, 19.050], [72.860, 72.875], 55000,  False),
        ("z11", "Chembur",       19.055, 72.895, [19.045, 19.070], [72.885, 72.910], 60000,  False),
        ("z12", "Borivali",      19.230, 72.860, [19.220, 19.245], [72.850, 72.870], 75000,  False),
        ("z13", "Thane",         19.200, 72.975, [19.180, 19.220], [72.960, 72.990], 80000,  False),
        ("z14", "Navi Mumbai",   19.050, 73.020, [19.030, 19.070], [73.000, 73.040], 65000,  True),
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

    # ── Real-world infrastructure with accurate lat/lng ──────────────────
    # Named items are placed at their actual IRL locations.  The remaining
    # items (to meet simulation counts) are randomly placed within the
    # corrected land-only bounding boxes.

    named_infra = [
        # ── Hospitals (real locations) ──
        ("hosp_kem",   "KEM Hospital, Parel",            "hospital",       19.0003, 72.8422, 600),
        ("hosp_sion",  "Sion Hospital",                   "hospital",       19.0392, 72.8627, 500),
        ("hosp_jj",    "JJ Hospital, Byculla",            "hospital",       18.9638, 72.8337, 550),
        ("hosp_lila",  "Lilavati Hospital, Bandra",       "hospital",       19.0509, 72.8282, 400),
        ("hosp_nana",  "Nanavati Hospital, Vile Parle",   "hospital",       19.0968, 72.8434, 450),
        ("hosp_hind",  "Hinduja Hospital, Mahim",         "hospital",       19.0375, 72.8399, 480),
        ("hosp_brea",  "Breach Candy Hospital",           "hospital",       18.9715, 72.8060, 350),
        ("hosp_jasl",  "Jaslok Hospital, Peddar Rd",      "hospital",       18.9695, 72.8112, 380),
        ("hosp_bomb",  "Bombay Hospital, Marine Lines",   "hospital",       18.9383, 72.8302, 500),
        ("hosp_glob",  "Global Hospital, Parel",          "hospital",       19.0013, 72.8402, 300),
        ("hosp_kohi",  "Kohinoor Hospital, Kurla",        "hospital",       19.0723, 72.8846, 280),
        ("hosp_forh",  "Fortis Hospital, Mulund",         "hospital",       19.1751, 72.9519, 400),
        ("hosp_hira",  "Hiranandani Hospital, Powai",     "hospital",       19.1193, 72.9082, 350),
        ("hosp_holy",  "Holy Family Hospital, Bandra",    "hospital",       19.0443, 72.8411, 260),
        ("hosp_seve",  "Seven Hills Hospital, Andheri",   "hospital",       19.1097, 72.8599, 370),
        ("hosp_nair",  "Nair Hospital, Mumbai Central",   "hospital",       18.9775, 72.8268, 500),
        ("hosp_rahi",  "Rajawadi Hospital, Ghatkopar",    "hospital",       19.0862, 72.9098, 350),
        ("hosp_vrn",   "V N Desai Hospital, Santacruz",   "hospital",       19.0802, 72.8516, 250),
        ("hosp_coop",  "Cooper Hospital, Vile Parle",     "hospital",       19.1014, 72.8470, 280),
        ("hosp_masn",  "Masina Hospital, Byculla",        "hospital",       18.9773, 72.8354, 200),

        # ── Power Stations / Grid Substations ──
        ("pow_tromb",  "Trombay Thermal Power Stn",       "power_station",  19.0160, 72.9120, 2000),
        ("pow_dahanu","Dahanu Grid Relay – Borivali",     "power_station",  19.2280, 72.8560, 1500),
        ("pow_andr",   "Andheri-MSEDCL Substation",       "power_station",  19.1150, 72.8550, 800),
        ("pow_bndra",  "Bandra Reclamation Substation",   "power_station",  19.0440, 72.8370, 700),
        ("pow_chrni",  "Churchgate Grid Substation",      "power_station",  18.9350, 72.8280, 600),
        ("pow_kurla",  "Kurla 220kV Substation",          "power_station",  19.0700, 72.8790, 800),
        ("pow_gtkpr",  "Ghatkopar Substation",            "power_station",  19.0870, 72.9100, 650),
        ("pow_thane",  "Thane MSETCL Substation",         "power_station",  19.1960, 72.9630, 900),
        ("pow_chmbr",  "Chembur 132kV Substation",        "power_station",  19.0550, 72.9000, 550),
        ("pow_mlnd",   "Mulund Receiving Station",        "power_station",  19.1700, 72.9560, 700),

        # ── Fire Stations ──
        ("fire_byc",   "Mumbai Fire Brigade HQ, Byculla", "fire_station",  18.9785, 72.8322, 200),
        ("fire_bndra", "Bandra Fire Station",             "fire_station",  19.0545, 72.8377, 150),
        ("fire_andr",  "Andheri Fire Station",            "fire_station",  19.1127, 72.8534, 150),
        ("fire_dadr",  "Dadar Fire Station",              "fire_station",  19.0178, 72.8438, 120),
        ("fire_kurla", "Kurla Fire Station",              "fire_station",   19.0692, 72.8785, 130),
        ("fire_borv",  "Borivali Fire Station",           "fire_station",  19.2310, 72.8560, 140),
        ("fire_chmbr","Chembur Fire Station",             "fire_station",  19.0590, 72.8970, 120),
        ("fire_gtkpr","Ghatkopar Fire Station",           "fire_station",  19.0840, 72.9070, 110),
        ("fire_mlnd", "Mulund Fire Station",              "fire_station",  19.1690, 72.9490, 120),
        ("fire_wrli", "Worli Fire Station",               "fire_station",  19.0180, 72.8180, 130),

        # ── Police Stations ──
        ("pol_colaba", "Colaba Police Station",           "police_station", 18.9220, 72.8320, 100),
        ("pol_bndra",  "Bandra Police Station",           "police_station", 19.0530, 72.8400, 120),
        ("pol_andr",   "Andheri Police Station",          "police_station", 19.1177, 72.8490, 110),
        ("pol_juhu",   "Juhu Police Station",             "police_station", 19.0950, 72.8350, 90),
        ("pol_kurla",  "Kurla Police Station",            "police_station", 19.0700, 72.8810, 100),
        ("pol_dadr",   "Dadar Police Station",            "police_station", 19.0185, 72.8440, 100),
        ("pol_borv",   "Borivali Police Station",         "police_station", 19.2290, 72.8555, 110),
        ("pol_thane",  "Thane Nagar Police Station",      "police_station", 19.1960, 72.9700, 130),
        ("pol_chmbr",  "Chembur Police Station",          "police_station", 19.0580, 72.8960, 100),
        ("pol_gtkpr",  "Ghatkopar Police Station",        "police_station", 19.0855, 72.9120, 100),
        ("pol_mahim",  "Mahim Police Station",            "police_station", 19.0383, 72.8400, 90),
        ("pol_sntcrz", "Santacruz Police Station",        "police_station", 19.0830, 72.8430, 100),
        ("pol_marns",  "Marine Drive Police Stn",         "police_station", 18.9430, 72.8240, 80),
        ("pol_pvrng",  "Pavan Hans, Vashi PS",            "police_station", 19.0660, 72.9990, 100),

        # ── Shelters / Relief Camps ──
        ("shl_azad",   "Azad Maidan Relief Camp",         "shelter",        18.9398, 72.8324, 800),
        ("shl_dharv",  "Dharavi Community Shelter",        "shelter",        19.0430, 72.8550, 1200),
        ("shl_bndra",  "Bandra Reclamation Shelter",       "shelter",       19.0447, 72.8360, 600),
        ("shl_andr",   "Andheri Sports Complex Shelter",   "shelter",       19.1200, 72.8480, 700),
        ("shl_kurla",  "Kurla BKC Relief Camp",            "shelter",       19.0650, 72.8710, 900),
        ("shl_borv",   "Borivali National Park Shelter",   "shelter",       19.2350, 72.8620, 500),
        ("shl_chmbr",  "Chembur Relief Ground",            "shelter",       19.0560, 72.8940, 600),
        ("shl_sion",   "Sion Relief Camp",                 "shelter",       19.0400, 72.8610, 550),
        ("shl_worli",  "Worli Seaface Shelter",            "shelter",       19.0210, 72.8200, 450),
        ("shl_malad",  "Malad Community Shelter",          "shelter",       19.1870, 72.8430, 650),
        ("shl_thane",  "Thane Civic Relief Camp",          "shelter",       19.2000, 72.9650, 800),
        ("shl_nvm",    "Navi Mumbai Relief Camp",          "shelter",       19.0350, 73.0200, 700),

        # ── Metro Stations (actual Mumbai Metro locations) ──
        ("mtr_gtkpr",  "Ghatkopar Metro Station",         "metro_station",  19.0868, 72.9085, 300),
        ("mtr_andr",   "Andheri Metro Station",            "metro_station",  19.1190, 72.8465, 300),
        ("mtr_vrso",   "Versova Metro Station",            "metro_station",  19.1310, 72.8195, 200),
        ("mtr_dngri",  "DN Nagar Metro Station",           "metro_station",  19.1254, 72.8356, 200),
        ("mtr_saki",   "Saki Naka Metro Station",          "metro_station",  19.1017, 72.8893, 200),
        ("mtr_chakg",  "Chakala Metro Station",            "metro_station",  19.1110, 72.8583, 200),
        ("mtr_aarey",  "Aarey Colony Metro Station",       "metro_station",  19.1460, 72.8670, 150),
        ("mtr_mrl",    "Marol Naka Metro Station",         "metro_station",  19.1085, 72.8780, 200),
        ("mtr_weh",    "WEH Metro Station",                "metro_station",  19.1092, 72.8542, 200),
        ("mtr_azd",    "Azad Nagar Metro Station",         "metro_station",  19.1265, 72.8410, 200),

        # ── Communications Towers ──
        ("com_wrli",   "Worli Communication Tower",        "communications", 19.0170, 72.8200, 100),
        ("com_powai",  "Powai Tech Park Comm",             "communications", 19.1180, 72.9050, 120),
        ("com_bkc",    "BKC Data Centre Tower",            "communications", 19.0660, 72.8700, 150),
        ("com_andr",   "Andheri West Comm Hub",            "communications", 19.1190, 72.8410, 100),
        ("com_thane",  "Thane Comm Tower",                 "communications", 19.2050, 72.9640, 100),

        # ── Water Pumping Stations ──
        ("wtr_bhandup","Bhandup Water Treatment Plant",    "water_pump",     19.1530, 72.9360, 500),
        ("wtr_tromb",  "Trombay Pumping Station",          "water_pump",     19.0210, 72.9050, 300),
        ("wtr_powai",  "Powai Lake Pumping Station",       "water_pump",     19.1260, 72.9070, 250),
        ("wtr_mlnd",   "Mulund Pumping Station",           "water_pump",     19.1730, 72.9450, 350),
        ("wtr_vhar",   "Vihar Lake Pumping Station",       "water_pump",     19.1350, 72.9200, 300),
    ]

    infrastructure = []
    type_map = {
        "hospital": InfrastructureType.HOSPITAL,
        "power_station": InfrastructureType.POWER_STATION,
        "fire_station": InfrastructureType.FIRE_STATION,
        "police_station": InfrastructureType.POLICE_STATION,
        "shelter": InfrastructureType.SHELTER,
        "metro_station": InfrastructureType.METRO_STATION,
        "communications": InfrastructureType.COMMUNICATIONS,
        "water_pump": InfrastructureType.WATER_PUMP,
    }

    # Add all named real-world infrastructure
    for inf_id, inf_name, inf_type_str, inf_lat, inf_lng, inf_cap in named_infra:
        infrastructure.append(Infrastructure(
            id=inf_id, name=inf_name, type=type_map[inf_type_str],
            lat=inf_lat, lng=inf_lng, capacity=inf_cap,
        ))

    # Count how many of each type we already have
    existing_counts = {}
    for infra in infrastructure:
        existing_counts[infra.type] = existing_counts.get(infra.type, 0) + 1

    # Target counts — fill remaining with random land-bound locations
    infra_targets = {
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
        """Pick a random coordinate guaranteed to be on land."""
        dist = random.choice(district_data)
        lat = random.uniform(dist[4][0], dist[4][1])
        lng = random.uniform(dist[5][0], dist[5][1])
        return lat, lng, dist[1]

    for i_type, target in infra_targets.items():
        have = existing_counts.get(i_type, 0)
        for i in range(target - have):
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
                id=f"{i_type.value}_{have + i}", name=name, type=i_type,
                lat=lat, lng=lng, capacity=capacity,
            ))

    # ── Roads ────────────────────────────────────────────────────────────
    roads = []
    weh_points = []
    lat, lng = 18.94, 72.83
    for _ in range(25):
        weh_points.append([lat, lng])
        lat += random.uniform(0.01, 0.015)
        lng += random.uniform(-0.001, 0.003)
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
            cur_lat += random.uniform(-0.006, 0.006)
            cur_lng += random.uniform(-0.006, 0.006)
            pts.append([cur_lat, cur_lng])
        roads.append(Road(id=f"r_conn_{i}", name=f"Local Arterial - {dist[1]}", points=pts))

    # Restore RNG state so simulation ticks remain random
    random.setstate(rng_state)

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
        self.ml_output = None   # MLOutput from ml_engine

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
        self.ml_output = None

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
        disaster = self.disaster
        if disaster and disaster.intensity < 95:
            disaster.intensity = min(100, disaster.intensity + random.uniform(0.5, 2.5))  # pyre-ignore

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

        # ── 12. ML Engine → predict risk/casualties + optimize resources ──
        try:
            self.ml_output = ml_engine.analyze(
                self.zones, self.infrastructure, self.roads,
                self.disaster, self.population_metrics
            )
        except Exception as e:
            print(f"[ML] Engine error at tick {self.tick}: {e}")

        # Merge recommendations
        self.recommendations = weather_recs + traffic_recs + medical_recs + power_recs + logistics_recs + command_recs

        # Collect agent logs
        for agent in self.agents.values():
            for log in agent.get_logs():
                log["tick"] = self.tick
                log["timestamp"] = datetime.now().isoformat()
                self.agent_logs.append(log)

        if len(self.agent_logs) > 50:
            self.agent_logs = self.agent_logs[-50:]  # pyre-ignore[6]

        # Build cascading events
        self.cascading_events = self._compute_cascading_events()

        state = self.get_state()
        self.timeline.append(state.dict())
        if len(self.timeline) > 60:
            self.timeline = self.timeline[-60:]  # pyre-ignore[6]

        return state

    def _compute_cascading_events(self) -> list[CascadingEvent]:
        """Determine the cascading failure chain."""
        events = []
        step = 1

        disaster = self.disaster
        if not disaster:
            return events

        blocked_roads = [r for r in self.roads if r.blocked]
        if blocked_roads:
            events.append(CascadingEvent(
                step=step,
                source=str(disaster.type).title(),
                target="Road Network",
                description=f"{len(blocked_roads)} road(s) blocked by {disaster.type}",
                icon="🌊" if disaster.type == DisasterType.FLOOD else "🌍"
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
            ml_output=self.ml_output,
        )

    def get_timeline(self):
        """Get simulation timeline for playback."""
        return self.timeline

    def run_whatif(self, intervention) -> dict:
        """Run a what-if scenario and apply the intervention to the active simulation."""
        # Snapshot 'before'
        before_state = self.get_state()
        before_risk = before_state.overall_risk
        before_infra = {i.id: str(i.status) for i in before_state.infrastructure}
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
        after_infra = {i.id: str(i.status) for i in after_state.infrastructure}
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
