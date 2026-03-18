# Resilience AI: Disaster Simulation & Crisis Management Digital Twin

**Resilience AI** is an advanced, real-time "Digital Twin" of Mumbai designed for disaster simulation, risk prediction, and resource optimization. It combines agent-based modelling with Machine Learning (Random Forest, Gradient Boosting) and Integer Linear Programming (ILP) to provide a comprehensive decision-support system for emergency responders.

---

## 🚀 Core Features

### 1. Real-Time Digital Twin (Mumbai)
- **Geographic Precision**: Features 14 realistic Mumbai zones (from Colaba to Powai) with accurate bounding boxes.
- **Infrastructure Mapping**: Includes 100+ critical facilities (Hospitals, Power Stations, Shelters, Fire Stations) mapped to their real-world GPS coordinates.
- **Dynamic Road Network**: Simulates major highways (WEH, EEH, Bandra-Worli Sea Link) with real-time blockage and severity logic.

### 2. Multi-Agent Simulation Engine
- **Autonomous Reasoning**: Six specialized agents (Weather, Traffic, Medical, Power, Logistics, Command) analyze simulation data and provide real-time recommendations.
- **Cascading Failures**: A sophisticated engine that simulates how a power grid failure can overload hospitals or how road blockages increase casualty rates.
- **Tick-based Evolution**: Situations evolve every 5 seconds, with disaster intensity following a stochastic (weighted random) walk.

### 3. ML & Optimization Layer
- **Risk Prediction**: Uses a **Random Forest Regressor** to predict zone-level risk with 95% confidence intervals and automated local explainability.
- **Resource Optimization**: Implements **Integer Linear Programming (ILP)** via **Google OR-Tools (SCIP Solver)** to optimally distribute limited ambulances and generators across high-risk zones.
- **Synthetic Training**: Models are trained on a custom-built synthetic generator that encodes the physics of the simulation world.

## 🔄 System Workflows

### 1. Frontend Architecture & Flow (React)
The frontend is a real-time reactive dashboard that maintains a synchronized state with the backend "Digital Twin."

**Workflow Lifecycle:**
1.  **Direct Auth**: The user logs in via `AuthContext.jsx`. In this simplified version, the email is treated as a session token, bypassing traditional JWT verification for local demo speed.
2.  **Dashboard Initialization**: On load, `useSimulation.js` fetches the initial "City State" via a REST call (`/api/city`) to populate the map and metrics.
3.  **WebSocket Handshake**: After the REST fetch, the client opens a **Persisted WebSocket** (`/ws`). This is the heart of the real-time experience.
4.  **Simulation Trigger**: When an Admin clicks "Start Simulation," a POST request is sent to `/api/start`. The backend responds with the "Epicenter" coordinates.
5.  **Live State Updates**: The WebSocket begins broadcasting a fresh `SimulationState` every 5 seconds. The frontend receives this, parses the JSON, and triggers a re-render of the Leaflet Map and Risk Charts.
6.  **Intervention (What-If)**: Users can interact with the map to deploy resources. This triggers a REST call to `/api/whatif`, which the backend processes and reflects in the next WebSocket broadcast.

### 2. Backend Lifecycle (The Simulation Tick)
The backend is built around a "Tick-based" engine. Every 5 seconds (one "tick"), the entire city is re-evaluated.

```mermaid
sequenceDiagram
    participant FE as Frontend Dashboard
    participant BE as FastAPI Server
    participant SE as Simulation Engine
    participant AG as AI Agents (Weather/Traffic)
    participant ML as ML Engine (Random Forest)
    participant OPT as Resource Optimizer (ILP)

    FE->>BE: POST /api/start
    BE->>SE: engine.start(disaster)
    Note over SE: Background Tick Loop Starts
    loop Every 5 Seconds
        SE->>AG: Analyze Situation (Heuristics)
        AG->>SE: Component Recommendations
        SE->>ML: Predict Risk & Casualties
        ML->>SE: Risk Scores + Conf Interval
        SE->>OPT: Optimize Resource Distribution
        OPT->>SE: Optimal Ambulance/Bus Allocations
        SE->>BE: Compute Composite State
        BE->>FE: WebSocket Broadcast (JSON)
    end
```

**Internal Tick Logic:**
- **Dynamic Decay**: Roads don't stay blocked forever. A decay algorithm gradually "clears" debris or receding water over multiple ticks.
- **Agent Reasoning**: Before the ML runs, 6 heuristic agents (e.g., Traffic Agent) adjust the "Digital Twin" parameters based on programmed rules.
- **Optimization Strategy**: The ILP solver (OR-Tools) ensures that limited resources are never "double-counted" and are always sent to the zones where they will save the most lives based on ML predictions.

---

## 🛡️ Three-Tier RBAC Architecture

The platform enforces a strict Role-Based Access Control system to ensure data integrity during a crisis:

| Tier | Role | Access Level | Key Permissions |
| :--- | :--- | :--- | :--- |
| **1** | **Admin** | Full Control | User management, Strategy configuration, What-if scenarios, Audit logs. |
| **2** | **Operator** | Command | Live dashboard, Field reporting, Real-time risk monitoring. |
| **3** | **Public** | Situational | Public notices, Simplified city-wide risk overview. |

---

## 🛠️ Technical Stack

- **Frontend**: React.js, Vite, Leaflet.js (Map visualization), Tailwind CSS.
- **Backend**: FastAPI (Python), WebSockets (Real-time updates), Pydantic (Data validation).
- **ML/Optimization**: Scikit-Learn, Google OR-Tools, Pandas, NumPy.
- **Deployment**: Local dev server (npm/uvicorn), WebSocket broadcast architecture.

---

## 📦 How to Run

### Backend
1. Navigate to `backend/`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Run the server: `python main.py`.
4. API will be live at `http://localhost:8000`.

### Frontend
1. Navigate to `frontend/`.
2. Install dependencies: `npm install`.
3. Start the dev server: `npm run dev`.
4. Open `http://localhost:5173` in your browser.

---

## 📈 ML Implementation Details (Hackathon Segment)

**Why Random Forest?**
- **Non-Linearity**: Crisis data is rarely linear (1+1 doesn't always equal 2 in disasters). RF handles these interactions out of the box.
- **Uncertainty Tracking**: By analyzing the variance across 120 trees, we provide "Reliability Scores" for our predictions.

**The ILP Advantage**
Instead of simple priority queues, our **Integer Linear Programming** solver looks at the *entire city* at once. It finds the "global optimum" for resource distribution, ensuring that saving a life in Zone A doesn't accidentally cause a catastrophe in Zone B due to lack of accessibility.

---

## ⚖️ License
Educational simulation project for hackathon purposes. Non-production / Demo only.
