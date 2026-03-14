from agents.base_agent import BaseAgent
from models import AgentRecommendation, UrgencyLevel


class CommandAgent(BaseAgent):
    name = "Command Agent"

    def __init__(self):
        super().__init__()
        self.state = {"action_plan": [], "conflicts_resolved": 0}

    def analyze(self, zones, infrastructure, roads, disaster, other_agent_data=None):
        recommendations = []
        if not disaster:
            return recommendations

        all_recs = []
        if other_agent_data:
            for agent_name, data in other_agent_data.items():
                if "recommendations" in data:
                    for rec in data["recommendations"]:
                        if isinstance(rec, dict):
                            try:
                                all_recs.append(AgentRecommendation(**rec))
                            except Exception:
                                pass
                        else:
                            all_recs.append(rec)

        if not all_recs:
            return recommendations

        conflict_count = 0
        seen_targets = {}
        resolved_recs = []

        for rec in all_recs:
            key = rec.target or rec.action[:40]
            if key in seen_targets:
                existing = seen_targets[key]
                if rec.priority < existing.priority or (rec.priority == existing.priority and rec.confidence > existing.confidence):
                    resolved_recs.remove(existing)
                    resolved_recs.append(rec)
                    seen_targets[key] = rec
                    conflict_count += 1
            else:
                resolved_recs.append(rec)
                seen_targets[key] = rec

        self.state["conflicts_resolved"] = conflict_count
        if conflict_count > 0:
            self.log(f"🤝 Resolved {conflict_count} inter-agent conflict(s)")

        # Rank by urgency first, then priority, then confidence
        urgency_order = {UrgencyLevel.CRITICAL: 0, UrgencyLevel.HIGH: 1, UrgencyLevel.MEDIUM: 2, UrgencyLevel.LOW: 3}
        resolved_recs.sort(key=lambda r: (urgency_order.get(r.urgency, 4), r.priority, -r.confidence))
        top_actions = resolved_recs[:8]
        self.state["action_plan"] = [r.dict() for r in top_actions]

        overall_risk = sum(z.risk_score for z in zones) / max(len(zones), 1)
        avg_confidence = sum(r.confidence for r in top_actions) / max(len(top_actions), 1)
        critical_count = sum(1 for r in top_actions if r.urgency == UrgencyLevel.CRITICAL)

        recommendations.append(AgentRecommendation(
            agent=self.name,
            action=f"Crisis Action Plan Active — {len(top_actions)} directives issued",
            reason=f"Multi-agent analysis complete. City risk at {overall_risk:.0f}%. "
                   f"{critical_count} CRITICAL directives require immediate command authorization.",
            affected_zone="Mumbai Metropolitan Region",
            confidence=avg_confidence,
            urgency=UrgencyLevel.CRITICAL if critical_count > 0 else UrgencyLevel.HIGH,
            expected_impact=f"Coordinated execution of {len(top_actions)} directives reduces overall city risk by est. {min(35, critical_count * 8 + 10):.0f}%.",
            priority=1,
        ))

        for i, action in enumerate(top_actions):
            recommendations.append(AgentRecommendation(
                agent=self.name,
                action=f"[P{i+1}] {action.action}",
                reason=action.reason,
                affected_zone=action.affected_zone,
                confidence=action.confidence,
                urgency=action.urgency,
                expected_impact=action.expected_impact,
                priority=action.priority,
                target=action.target,
            ))

        self.log(f"📋 Crisis plan updated: {len(top_actions)} priority actions, risk {overall_risk:.0f}%")
        return recommendations
