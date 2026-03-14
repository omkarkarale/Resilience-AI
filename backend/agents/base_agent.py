from models import AgentRecommendation


class BaseAgent:
    """Base class for all simulation agents."""

    name: str = "BaseAgent"

    def __init__(self):
        self.state = {}
        self.logs = []

    def log(self, message: str):
        self.logs.append({"agent": self.name, "message": message})

    def get_logs(self):
        logs = list(self.logs)
        self.logs.clear()
        return logs

    def analyze(self, zones, infrastructure, roads, disaster, other_agent_data=None) -> list[AgentRecommendation]:
        """Override in subclasses. Returns list of recommendations."""
        raise NotImplementedError
