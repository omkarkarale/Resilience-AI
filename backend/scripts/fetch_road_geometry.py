import os
import json
import logging
from math import radians, cos, sin, asin, sqrt
try:
    import osmnx as ox
except ImportError:
    print("Please install osmnx first: pip install osmnx")
    exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Road names/endpoints extracted from simulation.py
ROADS_TO_FETCH = {
    "Western Express Highway": [19.0411, 72.8419],
    "Eastern Express Highway": [19.0391, 72.8616],
    "Sion-Panvel Highway": [19.0391, 72.8616],
    "LBS Marg": [19.0654, 72.8792],
    "Linking Road, Bandra": [19.0596, 72.8295],
    "SV Road (Swami Vivekanand Road)": [19.0411, 72.8419],
    "Sion-Bandra Link Road": [19.0391, 72.8616],
    "NS Road / NS Marg": [19.0178, 72.8178],
    "Eastern Freeway": [18.9383, 72.8302],
    "Peddar Road": [18.9715, 72.8060],
    "Dharavi–Sion Connector": [19.0430, 72.8550],
    "Bandra–Dharavi Connector": [19.0544, 72.8469],
    "Kurla–Dharavi Connector": [19.0654, 72.8792],
    "Andheri–Bandra Connector": [19.1197, 72.8468],
    "Worli Sea Face": [19.0178, 72.8178],
    "Marine Drive": [18.9432, 72.8232],
    "Mahim Causeway": [19.0411, 72.8419],
    "Bandra-Worli Sea Link Approach": [19.0544, 72.8295],
}

def main():
    logger.info("Fetching Mumbai road graph from OSM... This might take a minute.")
    G = ox.graph_from_place("Mumbai, India", network_type="drive")
    G = ox.project_graph(G, to_crs="EPSG:4326")
    logger.info("Graph fetched. Matching roads...")

    road_geometry = {}
    matched = 0

    for road_name, start_coords in ROADS_TO_FETCH.items():
        lat, lon = start_coords[0], start_coords[1]
        
        try:
            # osmnx needs query points as (y, x) i.e. (lat, lon)? No, nearest_edges uses (X, Y) i.e. (lon, lat)
            # Actually ox.nearest_edges signature is (G, X, Y) where X=lon, Y=lat
            u, v, key = ox.nearest_edges(G, lon, lat)
            edge_data = G.get_edge_data(u, v, key)
            
            osm_name = edge_data.get("name", "Unknown")
            if isinstance(osm_name, list):
                osm_name = osm_name[0]
            
            # Extract geometry
            if "geometry" in edge_data:
                # geometry is a shapely LineString
                geom = [[lat, lon] for lon, lat in edge_data["geometry"].coords]
            else:
                # fall back to nodes
                node_u = G.nodes[u]
                node_v = G.nodes[v]
                geom = [[node_u['y'], node_u['x']], [node_v['y'], node_v['x']]]
                
            road_geometry[road_name] = {
                "name": road_name,
                "osm_name": osm_name,
                "geometry": geom
            }
            logger.info(f"Matched '{road_name}' to OSM '{osm_name}' with {len(geom)} waypoints.")
            matched += 1
        except Exception as e:
            logger.error(f"Failed to match {road_name}: {e}")

    # Write JSON
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(os.path.dirname(script_dir), "data")
    os.makedirs(data_dir, exist_ok=True)
    out_path = os.path.join(data_dir, "road_geometry.json")
    
    with open(out_path, "w") as f:
        json.dump(road_geometry, f, indent=2)

    logger.info(f"\nSaved {matched}/{len(ROADS_TO_FETCH)} road geometries to {out_path}.")

if __name__ == "__main__":
    main()
