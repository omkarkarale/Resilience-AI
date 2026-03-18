"""Disaster Simulation Engine – Tick-based simulation with cascading failures and AI decision support."""

import random
import os
from datetime import datetime

from models import (  # pyre-ignore[21]
    Zone, Infrastructure, Road, InfrastructureType, InfraStatus,
    DisasterEvent, DisasterType, SimulationState, CascadingEvent,
)
from agents import (  # pyre-ignore[21]
    WeatherAgent, TrafficAgent, MedicalAgent,
    PowerAgent, LogisticsAgent, CommandAgent,
)
from city_graph import build_city_graph, update_edge_weights, find_alternate_route  # pyre-ignore[21]
from risk_engine import compute_all_risks  # pyre-ignore[21]
from population_sim import compute_population_metrics, get_city_summary  # pyre-ignore[21]
from resource_optimizer import get_all_allocations  # pyre-ignore[21]
from strategy_ranker import rank_strategies  # pyre-ignore[21]
import ml_engine

# ─── Module-level constants (Changes 3, 5) ───

# Decay rates per tick for road severity — how quickly roads self-clear
DECAY_RATES = {
    "flood":      0.01,   # slow — water recedes gradually
    "earthquake": 0.005,  # very slow — structural damage persists
    "debris":     0.05,   # faster — debris can be cleared
    "default":    0.02,
}

# Ambulance ETA & hospital-load cascade constants
AVG_SPEED_KMH       = 40.0   # emergency vehicle average speed
BASE_ETA_MINUTES    = 10.0   # expected ETA on clear roads
DELAY_TO_LOAD_COEFF = 0.05   # extra hospital load per unit delay factor


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

    # ── Roads — Real Mumbai road coordinates ────────────────────────────
    roads = []

    # ── MAJOR HIGHWAYS ──
    roads.append(Road(id="r_weh", name="Western Express Highway", points=[
        [19.0411, 72.8419], [19.0544, 72.8402], [19.0813, 72.8479],
        [19.1013, 72.8553], [19.1197, 72.8468], [19.1378, 72.8456],
        [19.1545, 72.8488], [19.2285, 72.8567],
    ], geometry=[
        [19.0596, 72.8295], [19.0650, 72.8310], [19.0710, 72.8340],
        [19.0760, 72.8370], [19.0820, 72.8400], [19.0880, 72.8430]
    ]))

    roads.append(Road(id="r_eeh", name="Eastern Express Highway", points=[
        [19.0391, 72.8616], [19.0665, 72.8794], [19.0862, 72.9098],
        [19.1087, 72.9265], [19.1193, 72.9082], [19.1751, 72.9519],
    ], geometry=[
        [19.0390, 72.8727], [19.0450, 72.8780], [19.0510, 72.8830],
        [19.0560, 72.8870], [19.0610, 72.8910]
    ]))

    roads.append(Road(id="r_sion_panvel", name="Sion-Panvel Highway", points=[
        [19.0391, 72.8616], [19.0522, 72.9005], [19.0643, 72.9186],
        [19.0479, 72.9303],
    ], geometry=[
        [19.0390, 72.8727], [19.0380, 72.8800], [19.0360, 72.8900],
        [19.0340, 72.9000], [19.0310, 72.9100]
    ]))

    # ── ARTERIAL ROADS ──
    roads.append(Road(id="r_lbs", name="LBS Marg", points=[
        [19.0654, 72.8792], [19.1003, 72.9198], [19.1387, 72.9358],
    ], geometry=[
        [19.0650, 72.8800], [19.0700, 72.8830], [19.0760, 72.8860],
        [19.0820, 72.8890], [19.0880, 72.8920]
    ]))

    roads.append(Road(id="r_linking", name="Linking Road, Bandra", points=[
        [19.0596, 72.8295], [19.0713, 72.8342], [19.0813, 72.8392],
    ]))

    roads.append(Road(id="r_sv", name="SV Road (Swami Vivekanand Road)", points=[
        [19.0411, 72.8419], [19.0544, 72.8334], [19.0713, 72.8342],
        [19.0813, 72.8392], [19.1013, 72.8437], [19.1132, 72.8467],
    ], geometry=[
        [19.0390, 72.8380], [19.0450, 72.8360], [19.0510, 72.8350],
        [19.0560, 72.8340]
    ]))

    roads.append(Road(id="r_sion_bandra", name="Sion-Bandra Link Road", points=[
        [19.0391, 72.8616], [19.0430, 72.8550], [19.0544, 72.8469],
    ]))

    roads.append(Road(id="r_ns", name="NS Road / NS Marg", points=[
        [19.0178, 72.8178], [19.0067, 72.8267], [19.0003, 72.8422],
    ]))

    roads.append(Road(id="r_efreeway", name="Eastern Freeway", points=[
        [18.9383, 72.8302], [18.9534, 72.8378], [18.9618, 72.8427],
        [19.0391, 72.8616],
    ]))

    roads.append(Road(id="r_peddar", name="Peddar Road", points=[
        [18.9715, 72.8060], [18.9634, 72.8087], [18.9823, 72.8187],
    ]))

    # ── LOCAL CONNECTORS ──
    roads.append(Road(id="r_dharavi_sion", name="Dharavi–Sion Connector", points=[
        [19.0430, 72.8550], [19.0391, 72.8616],
    ]))

    roads.append(Road(id="r_bandra_dharavi", name="Bandra–Dharavi Connector", points=[
        [19.0544, 72.8469], [19.0430, 72.8550],
    ]))

    roads.append(Road(id="r_kurla_dharavi", name="Kurla–Dharavi Connector", points=[
        [19.0654, 72.8792], [19.0430, 72.8550],
    ]))

    roads.append(Road(id="r_andheri_bandra", name="Andheri–Bandra Connector", points=[
        [19.1197, 72.8468], [19.0544, 72.8402],
    ]))

    roads.append(Road(id="r_worli_seaface", name="Worli Sea Face", points=[
        [19.0178, 72.8178], [18.9823, 72.8187], [18.9715, 72.8060],
    ]))

    roads.append(Road(id="r_marine_drive", name="Marine Drive", points=[
        [18.9432, 72.8232], [18.9383, 72.8302],
        [18.9321, 72.8254], [18.9268, 72.8193],
    ]))

    roads.append(Road(id="r_mahim", name="Mahim Causeway", points=[
        [19.0411, 72.8419], [19.0375, 72.8399],
    ], geometry=[
        [19.0390, 72.8380], [19.0450, 72.8360], [19.0510, 72.8350],
        [19.0560, 72.8340]
    ]))

    roads.append(Road(id="r_bwsl_north", name="Bandra-Worli Sea Link Approach", points=[
        [19.0544, 72.8295], [19.0411, 72.8243], [19.0178, 72.8178],
    ]))

    # Load imported geometries and override points if available
    geom_path = os.path.join(os.path.dirname(__file__), "data", "road_geometry.json")
    geometry_data = {}
    try:
        import json
        if os.path.exists(geom_path):
            with open(geom_path, "r", encoding="utf-8") as f:
                geometry_data = json.load(f)
    except Exception as e:
        print(f"[simulation] Failed to load road_geometry.json: {e}")

    for road in roads:
        # Step 4: Populate geometry from loaded JSON if available. Fall back to [] if not.
        if road.name in geometry_data:
            road.geometry = geometry_data[road.name].get("geometry", [])
        elif road.id in geometry_data:
            road.geometry = geometry_data[road.id].get("geometry", [])
        else:
            road.geometry = []  # Fallback

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
        self._dispatch_eta = BASE_ETA_MINUTES  # ambulance ETA for current tick

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
            road.severity = 0.0
            road.blocked_lanes = 0
            road.tick_blocked_since = None
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

        # ── 2b. Severity update + decay (Changes 1, 3) ──
        # Map road damage → severity [0.0, 1.0]; keep blocked flag derived from it.
        decay_rate = DECAY_RATES.get(
            self.disaster.type.value if self.disaster else "default",
            DECAY_RATES["default"]
        )
        for road in self.roads:
            # Compute severity from damage (damage scale is 0–100 in traffic agent)
            new_severity = min(1.0, road.damage / 100.0)
            if new_severity > 0 and road.tick_blocked_since is None:
                road.tick_blocked_since = self.tick   # stamp first blockage tick
            elif new_severity == 0:
                road.tick_blocked_since = None

            # Apply decay only after a 3-tick grace period
            if (
                road.tick_blocked_since is not None
                and (self.tick - road.tick_blocked_since) >= 3
                and new_severity > 0
            ):
                new_severity = max(0.0, new_severity - decay_rate)
                # Also nudge damage downward to stay consistent
                road.damage = max(0.0, road.damage - decay_rate * 100)

            road.severity = round(new_severity, 4)
            # Derive blocked from severity instead of keeping it purely boolean
            road.blocked = road.severity >= 1.0
            # Keep blocked_lanes consistent with severity
            road.blocked_lanes = int(round(road.severity * road.total_lanes))

        # ── 2c. Ambulance ETA rerouting (Change 4) ──
        # Find the zone with highest risk as emergency source; target nearest hospital.
        high_sev_edge_ids = {
            eidx
            for eidx, edge in enumerate(self.graph_edges)
            if edge.hazard_risk / 100 > 0.7  # proxy for road severity > 0.7
        }
        self._dispatch_eta = BASE_ETA_MINUTES  # default — reset each tick
        if high_sev_edge_ids and self.graph_nodes and self.tick > 0:
            # Pick worst-risk zone as source
            worst_zone = max(self.zones, key=lambda z: z.risk_score, default=None)
            if worst_zone:
                source_node = f"zone_{worst_zone.id}"
                # Find nearest hospital node as target
                hosp_nodes = [
                    nid for nid, n in self.graph_nodes.items()
                    if n.node_type == "hospital" and n.status != "failed"
                ]
                if hosp_nodes and source_node in self.adj:
                    target_node = hosp_nodes[0]  # nearest will be refined by Dijkstra
                    alt_path, alt_cost = find_alternate_route(
                        self.adj, self.graph_edges, source_node, target_node, high_sev_edge_ids
                    )
                    if alt_path and alt_cost < 9999.0:
                        # Convert graph cost (minutes) back to a distance estimate
                        eta = alt_cost  # already in minutes (Dijkstra weight = travel time)
                    else:
                        # If no alternate path, estimate a severe delay
                        eta = BASE_ETA_MINUTES * 3
                    self._dispatch_eta = eta


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

        # ── Change 5: Response-time → hospital load cascade ──
        # If ambulance ETA exceeds baseline, apply extra load to hospitals.
        if self._dispatch_eta > BASE_ETA_MINUTES:
            delay_factor = self._dispatch_eta / BASE_ETA_MINUTES
            load_penalty = int(DELAY_TO_LOAD_COEFF * delay_factor * 100)  # scaled delta
            hospitals = [i for i in self.infrastructure if i.type == InfrastructureType.HOSPITAL]
            if hospitals:
                # Distribute penalty evenly across operational hospitals
                per_hosp = max(1, load_penalty // max(len(hospitals), 1))
                for hosp in hospitals:
                    if hosp.status != InfraStatus.FAILED:
                        hosp.current_load = min(hosp.capacity * 2, hosp.current_load + per_hosp)

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
        self._compute_cascading_events()

        state = self.get_state()
        self.timeline.append(state.dict())
        if len(self.timeline) > 60:
            self.timeline = self.timeline[-60:]  # pyre-ignore[6]

        return state

    def _compute_cascading_events(self):
        """Rebuild the full cascading failure chain each tick from live state."""
        disaster = self.disaster
        if not disaster:
            self.cascading_events = []
            return

        chain = []
        step = 0

        # Clean label for disaster type (grid_failure → "Grid Failure")
        _DTYPE_LABELS = {
            "flood": "Flood", "earthquake": "Earthquake",
            "cyclone": "Cyclone", "grid_failure": "Grid Failure",
        }
        dtype = _DTYPE_LABELS.get(disaster.type.value, disaster.type.value.title())

        def _names(items, limit=3):
            """Return comma-joined short names, e.g. 'KEM Hospital, Sion Hospital +2 more'."""
            short = [i.name.split(",")[0].split("(")[0].strip() for i in items[:limit]]
            extra = len(items) - limit
            result = ", ".join(short)
            if extra > 0:
                result += f" +{extra} more"
            return result

        def add(source, target, description, icon):
            nonlocal step
            step += 1
            chain.append(CascadingEvent(
                step=step, source=source, target=target,
                description=description, icon=icon, tick=self.tick,
            ))

        # ── 1. Root: Disaster event ──
        epicenter_name = disaster.epicenter_zone
        for z in self.zones:
            if z.id == disaster.epicenter_zone:
                epicenter_name = z.name
                break
        add(
            "Disaster",
            dtype,
            f"{dtype} ({disaster.intensity:.0f}%) strikes {epicenter_name}",
            "🚨",
        )

        # ── 2. Infrastructure Damage — list specific facilities ──
        failed_infra = [i for i in self.infrastructure if i.status == InfraStatus.FAILED]
        damaged_infra = [i for i in self.infrastructure if i.damage > 20 and i.status != InfraStatus.FAILED]

        failed_hospitals = [i for i in failed_infra if i.type == InfrastructureType.HOSPITAL]
        failed_power = [i for i in failed_infra if i.type == InfrastructureType.POWER_STATION]
        failed_fire = [i for i in failed_infra if i.type == InfrastructureType.FIRE_STATION]
        failed_other = [i for i in failed_infra if i.type not in (
            InfrastructureType.HOSPITAL, InfrastructureType.POWER_STATION, InfrastructureType.FIRE_STATION
        )]

        if failed_infra or damaged_infra:
            parts = []
            if failed_hospitals:
                parts.append(f"Hospitals: {_names(failed_hospitals)}")
            if failed_power:
                parts.append(f"Power: {_names(failed_power)}")
            if failed_fire:
                parts.append(f"Fire: {_names(failed_fire)}")
            if failed_other:
                parts.append(f"{len(failed_other)} other facilities")
            if not parts and damaged_infra:
                parts.append(f"{_names(damaged_infra)} damaged")

            desc = "; ".join(parts) if parts else f"{len(failed_infra)} failed, {len(damaged_infra)} damaged"
            add(
                dtype,
                "Infrastructure",
                desc,
                "🏗️",
            )

        # ── 3. Road Network disruption — list specific roads ──
        compromised_roads = [r for r in self.roads if r.severity > 0.3]
        blocked_roads = [r for r in self.roads if r.severity >= 0.7]
        if compromised_roads:
            source = "Infrastructure" if (failed_infra or damaged_infra) else dtype
            road_names = _names(blocked_roads if blocked_roads else compromised_roads)
            add(
                source,
                "Road Network",
                f"{road_names} — {len(blocked_roads)} blocked, {len(compromised_roads)} compromised",
                "🚧",
            )

        # ── 4. Emergency Response delays ──
        if compromised_roads and self._dispatch_eta > BASE_ETA_MINUTES * 1.2:
            add(
                "Road Network",
                "Emergency Response",
                f"Ambulance ETA {self._dispatch_eta:.0f} min (normal {BASE_ETA_MINUTES:.0f} min)",
                "🚑",
            )

        # ── 5. Hospital System overload — list specific hospitals ──
        overloaded_hospitals = [
            i for i in self.infrastructure
            if i.type == InfrastructureType.HOSPITAL and i.current_load > i.capacity * 0.6
        ]
        if overloaded_hospitals:
            source = "Emergency Response" if (compromised_roads and self._dispatch_eta > BASE_ETA_MINUTES * 1.2) else dtype
            critical = [h for h in overloaded_hospitals if h.current_load > h.capacity * 0.9]
            if critical:
                desc = f"{_names(critical)} at critical capacity; {len(overloaded_hospitals)} total overloaded"
            else:
                desc = f"{_names(overloaded_hospitals)} overloaded ({len(overloaded_hospitals)} facilities)"
            add(source, "Hospital System", desc, "🏥")

        # ── 6. Power Grid stress — list specific stations ──
        grid_stress = self.agents["power"].state.get("grid_stress", 0)
        ps_failed = [
            i for i in self.infrastructure
            if i.type == InfrastructureType.POWER_STATION and i.status == InfraStatus.FAILED
        ]
        ps_degraded = [
            i for i in self.infrastructure
            if i.type == InfrastructureType.POWER_STATION and i.status == InfraStatus.DEGRADED
        ]
        if ps_failed or ps_degraded or grid_stress > 25:
            source = "Infrastructure" if (failed_infra or damaged_infra) else dtype
            parts = []
            if ps_failed:
                parts.append(f"Offline: {_names(ps_failed)}")
            if ps_degraded:
                parts.append(f"Degraded: {_names(ps_degraded)}")
            parts.append(f"Grid stress {grid_stress:.0f}%")
            add(source, "Power Grid", "; ".join(parts), "⚡")

            # Power → Hospital secondary cascade
            if overloaded_hospitals and (ps_failed or grid_stress > 50):
                add("Power Grid", "Hospital System", "Hospital backup power strained by grid failures", "🏥")

        # ── 7. Supply Chain disruption ──
        pending_deliveries = self.agents["logistics"].state.get("deliveries_pending", 0)
        if compromised_roads and pending_deliveries > 0:
            add("Road Network", "Supply Chain", f"{pending_deliveries} relief deliveries delayed or rerouted", "📦")

        # ── 8. Communication systems ──
        failed_comms = [
            i for i in self.infrastructure
            if i.type == InfrastructureType.COMMUNICATIONS and i.status == InfraStatus.FAILED
        ]
        if failed_comms:
            source = "Power Grid" if (ps_failed or grid_stress > 40) else "Infrastructure"
            add(source, "Communications", f"{_names(failed_comms)} offline", "📡")

        # ── 9. Disaster-specific secondary events ──
        if disaster.type == DisasterType.EARTHQUAKE:
            collapsed = [i for i in self.infrastructure if i.damage > 60]
            if collapsed:
                add(dtype, "Structural Collapse", f"{_names(collapsed)} severe structural damage", "🏚️")
        elif disaster.type == DisasterType.CYCLONE:
            if any(z.flood_prone and z.risk_score > 40 for z in self.zones):
                coastal = [z for z in self.zones if z.flood_prone and z.risk_score > 40]
                add(dtype, "Storm Surge", f"{_names(coastal)} coastal zones at risk", "🌊")
        elif disaster.type == DisasterType.GRID_FAILURE:
            if ps_failed:
                add("Power Grid", "Blackout", f"Cascading blackout — {_names(ps_failed)} offline", "🔌")

        # ── 10. Population displacement ──
        high_risk_zones = [z for z in self.zones if z.risk_score > 50]
        if high_risk_zones and (overloaded_hospitals or compromised_roads):
            zone_desc = _names(high_risk_zones)
            last_target = chain[-1].target if chain else dtype
            add(last_target, "Population", f"{zone_desc} — {len(high_risk_zones)} zones, mass displacement", "👥")

        self.cascading_events = chain

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

        # Apply risk reduction scaled by action type and amount
        if intervention.action == "add_ambulances":
            # Ambulances reduce hospital load → each unit cuts risk by 0.8%, capped at 15%
            reduction_factor = min(intervention.amount * 0.008, 0.15)
        elif intervention.action == "deploy_generator":
            # Generators restore power → each unit cuts infrastructure risk by 1.0%, capped at 20%
            reduction_factor = min(intervention.amount * 0.010, 0.20)
        elif intervention.action == "open_shelter":
            # Shelters absorb displaced population → each unit cuts displacement risk by 0.7%, capped at 12%
            reduction_factor = min(intervention.amount * 0.007, 0.12)
        else:
            reduction_factor = 0.05  # fallback: generic 5% reduction

        for z in self.zones:
            z.risk_score = max(0, z.risk_score * (1 - reduction_factor))

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
