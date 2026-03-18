# Resilience AI

**Team Name:** Axiom Crew  
**PS Title:** Open Innovation  

## Overview
Resilience AI is an AI-powered educational simulation platform that enables students, trainees, and researchers to explore urban disaster scenarios in a safe, virtual environment.  
It models a city as an interconnected digital twin — comprising roads, hospitals, shelters, power grids, and emergency services — and lets users simulate the spread of disasters such as floods and earthquakes across these systems.

Through an interactive dashboard, learners can observe cascading infrastructure failures in real time, test different response strategies, and receive AI-generated recommendations — all while building critical thinking and systems-level reasoning.

## Problem Statement
Students and educators in disaster management, urban planning, and civil engineering lack access to interactive, hands-on tools to understand how disasters affect interconnected city systems.  
Traditional classroom methods cannot replicate the complexity of cascading infrastructure failures — leaving learners unprepared for real-world emergencies.

Resilience AI solves this by transforming complex disaster management concepts into an engaging, visual, and hands-on learning experience.

## Key Features
- **Digital Twin City Model** — Graph-based simulation of interconnected urban infrastructure (roads, hospitals, power grids, shelters) that students can explore and interact with
- **Multi-Hazard Scenario Simulation** — Simulate floods, earthquakes, and multi-system failures to observe how disruptions cascade across a city
- **Multi-Agent AI for Education** — Autonomous AI agents demonstrate traffic rerouting, hospital load balancing, and resource allocation, helping students learn coordination strategies
- **Live Risk Dashboard** — Visual, real-time display of infrastructure health, risk zones, and resource availability for intuitive learning
- **What-If Scenario Testing** — Students can modify variables, deploy interventions, and compare outcomes to learn decision-making under pressure
- **Cascading Failure Analysis** — Highlights critical failure points across the city, teaching learners to identify vulnerabilities in urban systems
- **Strategy Recommendation Engine** — AI-generated response plans with explanations, helping students understand trade-offs in emergency management

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
- Neo4j Community Edition
- Redis Open Source

## How It Works
1. A learner selects a disaster scenario (e.g. flood, earthquake)
2. The simulation engine models how the event spreads across the city's infrastructure
3. AI agents demonstrate real-time responses — rerouting traffic, balancing hospital load, allocating resources
4. Students observe cascading failures and critical vulnerabilities on the live dashboard
5. The platform generates AI-recommended response strategies with explanations
6. Learners test different interventions using what-if analysis and compare outcomes

## SDG Alignment
This project aligns with:
- **SDG 4:** Quality Education — Provides students and trainees with immersive, simulation-based disaster management education
- **SDG 3:** Good Health and Well-being — Teaches effective emergency response to improve future healthcare outcomes
- **SDG 11:** Sustainable Cities and Communities — Builds the next generation of urban planners equipped to design resilient cities
- **SDG 13:** Climate Action — Educates learners on climate-related disaster risks and prepares them to develop adaptive strategies

## Future Scope
- **Interactive Scenario Editor**: Tools for instructors to design custom disaster scenarios and infrastructure challenges
- **Multiplayer Cooperative Mode**: Team-based simulation where students take on different roles (Traffic, Power, Medical) to solve a crisis together
- **AI-Driven Reflection & Assessment**: Post-simulation analysis using LLMs to provide students with personalized feedback and critical thinking questions
- **LMS Integration**: Seamless integration with platforms like Moodle and Canvas for curriculum tracking and assignment management
- **Real-Time Data Injection**: Integration of live weather and environmental data to create "dynamic-difficulty" simulations
- **Global Leaderboards**: Competitive learning tracks where schools and universities can compare their resilience strategies and outcomes
