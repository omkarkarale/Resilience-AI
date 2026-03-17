import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from models import DisasterEvent, WhatIfIntervention
from simulation import SimulationEngine
from auth import get_current_user, require_role, require_auth
from rbac_models import UserRole, UserInDB
from rbac_routes import router as rbac_router
import seed_store as store

app = FastAPI(title="Resilience AI", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount RBAC routes
app.include_router(rbac_router)

engine = SimulationEngine()
active_connections: list[WebSocket] = []
simulation_task = None


async def broadcast(data: dict):
    """Broadcast simulation state to all connected WebSocket clients."""
    print(f"[WS] Broadcasting tick {data.get('tick')} to {len(active_connections)} clients")
    dead = []
    for ws in active_connections:
        try:
            await ws.send_json(data)
        except Exception as e:
            print(f"[WS] Broadcast error for client: {e}")
            dead.append(ws)
    for ws in dead:
        active_connections.remove(ws)


async def simulation_loop():
    """Run simulation ticks every 5 seconds and broadcast state."""
    print(f"[LOOP] Simulation loop started. Running: {engine.running}")
    while engine.running:
        try:
            state = engine.step()
            # Use state.json() and then reload to ensure Enums/types are JSON-serializable
            data = json.loads(state.json()) if hasattr(state, "json") else state.dict()
            await broadcast(data)
        except Exception as e:
            print(f"[LOOP] Simulation tick error: {e}")
            import traceback
            traceback.print_exc()
        await asyncio.sleep(5)


@app.get("/api/city")
async def get_city():
    """Get the initial city data."""
    state = engine.get_state()
    return state.dict()


@app.post("/api/start")
async def start_simulation(event: DisasterEvent,
                            user: UserInDB = Depends(require_role(UserRole.ADMIN))):
    """Start a disaster simulation. Admin only."""
    global simulation_task
    engine.start(event)
    if simulation_task and not simulation_task.done():
        simulation_task.cancel()
    simulation_task = asyncio.create_task(simulation_loop())

    store.add_audit_log(
        user_id=user.id, user_name=user.name, role=user.role.value,
        department=user.department.value if user.department else None,
        action="simulation_start", target=event.type.value, success=True,
        detail=f"Zone: {event.epicenter_zone}, Intensity: {event.intensity}",
    )
    return {"status": "started", "disaster": event.dict()}


@app.post("/api/stop")
async def stop_simulation(user: UserInDB = Depends(require_role(UserRole.ADMIN))):
    """Stop the running simulation. Admin only."""
    global simulation_task
    engine.running = False
    if simulation_task and not simulation_task.done():
        simulation_task.cancel()

    store.add_audit_log(
        user_id=user.id, user_name=user.name, role=user.role.value,
        department=user.department.value if user.department else None,
        action="simulation_stop", success=True,
    )

    try:
        state = engine.get_state()
        await broadcast(state.dict())
    except Exception as e:
        print(f"Stop broadcast error: {e}")
    return {"status": "stopped"}


@app.post("/api/reset")
async def reset_simulation(user: UserInDB = Depends(require_role(UserRole.ADMIN))):
    """Fully reset the simulation engine to initial state. Admin only."""
    global simulation_task, engine
    engine.running = False
    if simulation_task and not simulation_task.done():
        simulation_task.cancel()
        simulation_task = None
    engine = SimulationEngine()

    store.add_audit_log(
        user_id=user.id, user_name=user.name, role=user.role.value,
        department=user.department.value if user.department else None,
        action="simulation_reset", success=True,
    )

    try:
        state = engine.get_state()
        await broadcast(state.dict())
    except Exception as e:
        print(f"Reset broadcast error: {e}")
    return {"status": "reset"}


@app.post("/api/whatif")
async def what_if(intervention: WhatIfIntervention,
                   user: UserInDB = Depends(require_role(UserRole.ADMIN))):
    """Run a what-if scenario. Admin only."""
    result = engine.run_whatif(intervention)
    store.add_audit_log(
        user_id=user.id, user_name=user.name, role=user.role.value,
        department=user.department.value if user.department else None,
        action="whatif_scenario", target=intervention.action, success=True,
    )
    return result


@app.get("/api/timeline")
async def get_timeline():
    """Get simulation timeline for playback."""
    return engine.get_timeline()


@app.get("/api/strategies")
async def get_strategies():
    """Get ranked response strategies for current state."""
    return {
        "strategies": [s.dict() for s in engine.strategies],
        "recommended_id": engine.recommended_strategy_id,
    }


@app.get("/api/graph")
async def get_graph():
    """Get city graph nodes and edges for visualization."""
    return {
        "nodes": [n.dict() for n in engine.graph_nodes.values()],
        "edges": [e.dict() for e in engine.graph_edges],
        "summary": {
            "total_nodes": len(engine.graph_nodes),
            "total_edges": len(engine.graph_edges),
            "blocked_edges": sum(1 for e in engine.graph_edges if e.blocked),
        },
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        try:
            state = engine.get_state()
            dump = state.dict()
            await websocket.send_json(dump)
        except Exception as e:
            print(f"WS get_state sending error: {e}")
            
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "trigger":
                    event = DisasterEvent(**msg.get("payload", {}))
                    global simulation_task
                    engine.start(event)
                    if simulation_task and not simulation_task.done():
                        simulation_task.cancel()
                    simulation_task = asyncio.create_task(simulation_loop())
            except Exception as e:
                print(f"WS message parsing error: {e}")
                
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
    except Exception as e:
        print(f"WS unexpected error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
