from models import DisasterEvent
from simulation import SimulationEngine
import traceback

def run_test():
    engine = SimulationEngine()
    event = DisasterEvent(type="flood", epicenter_zone="z1", intensity=70.0)
    engine.start(event)
    
    for i in range(5):
        try:
            state = engine.step()
            print(f"Step {i+1} Success! Tick: {state.tick}, Cascading Events: {len(state.cascading_events)}")
        except Exception as e:
            traceback.print_exc()
            break

if __name__ == "__main__":
    run_test()
