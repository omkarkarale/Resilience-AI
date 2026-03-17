# Resilience AI

**Team Name:** Axiom Crew  
**PS Title:** Open Innovation  

## Overview
Resilience AI is an AI-powered disaster simulation and decision support platform designed to help cities prepare for and respond to disasters more effectively.  
It creates a digital model of a city and simulates how disasters such as floods, earthquakes, and other crises can affect interconnected systems like roads, hospitals, shelters, power infrastructure, and emergency response networks.

The platform uses simulation, graph-based infrastructure modeling, and multi-agent intelligence to analyze cascading failures and recommend the best response strategies in real time.

## Problem Statement
Modern cities are highly vulnerable to disasters because their infrastructure systems are deeply interconnected.  
A disruption in one system, such as road blockage, can quickly affect ambulance movement, hospital access, shelter management, and power stability.

Current disaster management systems are often reactive and fragmented.  
Resilience AI aims to solve this by providing a predictive, city-scale decision-support platform.

## Key Features
- Disaster simulation for urban environments
- Digital twin model of city infrastructure
- Multi-agent AI system for response coordination
- Cascading failure analysis
- Interactive dashboard with live risk monitoring
- What-if scenario testing
- Strategy recommendation and response planning

## Tech Stack
### Frontend
- React
- Vite
- Tailwind CSS
- Leaflet / React-Leaflet

### Backend
- Python
- FastAPI
- WebSockets
- Uvicorn

### Simulation / Intelligence
- NetworkX
- NumPy
- Pandas
- OR-Tools
- Scikit-learn

### Data Layer
- PostgreSQL
- PostGIS
- Neo4j Community Edition
- Redis Open Source

## How It Works
1. A disaster scenario is selected
2. The simulation engine models how the event spreads across the city
3. Infrastructure and emergency systems are evaluated in real time
4. AI agents analyze traffic, hospitals, power, and logistics
5. The platform generates recommendations and response strategies
6. Users can test different interventions using what-if analysis

## SDG Alignment
This project aligns with:
- SDG 3: Good Health and Well-being
- SDG 9: Industry, Innovation and Infrastructure
- SDG 11: Sustainable Cities and Communities
- SDG 13: Climate Action

## Future Scope
- Real-time weather and disaster data integration
- Advanced graph-based routing and optimization
- Strategy ranking engine
- Population movement simulation
- Scalable multi-city deployment
