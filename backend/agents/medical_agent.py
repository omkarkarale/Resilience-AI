"""Medical Agent – Tracks casualties, hospital load, and medical resource allocation."""

import random
from agents.base_agent import BaseAgent
from models import AgentRecommendation, InfraStatus, UrgencyLevel


class MedicalAgent(BaseAgent):
    name = "Medical Agent"

    def __init__(self):
        super().__init__()
        self.state = {"total_injured": 0, "triaged": 0, "overloaded_hospitals": []}

    def analyze(self, zones, infrastructure, roads, disaster, other_agent_data=None):
        recommendations = []
        if not disaster:
            return recommendations

        hospitals = [i for i in infrastructure if i.type.value == "hospital"]
        self.state["overloaded_hospitals"] = []

        total_injured = 0
        for zone in zones:
            if zone.risk_score > 30:
                injured = int(zone.population * (zone.risk_score / 100) * 0.15 + random.uniform(0, 10))
                total_injured += injured

        self.state["total_injured"] = total_injured
        self.state["triaged"] = int(total_injured * 0.7)

        if total_injured > 0 and hospitals:
            per_hospital = total_injured // max(len(hospitals), 1)
            for hosp in hospitals:
                if hosp.status == InfraStatus.FAILED:
                    hosp.current_load = 0
                    continue

                incoming = per_hospital + random.randint(-5, 10)
                
                # Simulate patient treatment/discharge (15-25% of load per tick)
                discharge_rate = random.uniform(0.15, 0.25)
                hosp.current_load = max(0, hosp.current_load - int(hosp.current_load * discharge_rate))
                
                hosp.current_load = min(hosp.capacity * 2, hosp.current_load + max(0, incoming))
                load_pct = (hosp.current_load / hosp.capacity) * 100

                if load_pct > 100:
                    hosp.status = InfraStatus.DEGRADED
                    self.state["overloaded_hospitals"].append(hosp.id)
                    hosp.damage = min(100, hosp.damage + 5)
                    self.log(f"🏥 {hosp.name} OVERLOADED at {load_pct:.0f}% capacity")
                elif load_pct <= 100 and hosp.damage < 40:
                    # Recover status if load drops and damage is manageable
                    hosp.status = InfraStatus.OPERATIONAL
                    hosp.damage = max(0, hosp.damage - 2)

                    recommendations.append(AgentRecommendation(
                        agent=self.name,
                        action=f"Divert patients from {hosp.name} to secondary facilities",
                        reason=f"Hospital at {load_pct:.0f}% capacity ({hosp.current_load}/{hosp.capacity} beds). "
                               f"Continued intake risks patient mortality and staff collapse.",
                        affected_zone="Mumbai Metro",
                        confidence=92,
                        urgency=UrgencyLevel.CRITICAL,
                        expected_impact=f"Redirecting ~{hosp.current_load - hosp.capacity} patients reduces mortality risk by est. 22%.",
                        priority=1,
                        target=hosp.id,
                    ))
                elif load_pct > 70:
                    self.log(f"⚠️ {hosp.name} approaching capacity ({load_pct:.0f}%)")

        if total_injured > 100:
            high_risk_zones = [z.name for z in zones if z.risk_score > 50]
            zone_str = ", ".join(high_risk_zones[:3]) if high_risk_zones else "multiple districts"
            recommendations.append(AgentRecommendation(
                agent=self.name,
                action=f"Deploy {max(3, total_injured // 200)} mobile field medical units",
                reason=f"{total_injured:,} estimated casualties across {len(high_risk_zones)} affected districts. "
                       f"Hospital system approaching saturation.",
                affected_zone=zone_str,
                confidence=87,
                urgency=UrgencyLevel.HIGH,
                expected_impact=f"Each field unit handles ~150 patients on-site, reducing hospital transfer load by est. 35%.",
                priority=1,
            ))
            self.log(f"🚨 {total_injured} estimated casualties across affected zones")

        if other_agent_data and "traffic" in other_agent_data:
            blocked = other_agent_data["traffic"].get("blocked_roads", [])
            if blocked:
                recommendations.append(AgentRecommendation(
                    agent=self.name,
                    action="Request 4 NDRF helicopters for medical air evacuation",
                    reason=f"{len(blocked)} road(s) blocked, preventing ground ambulance access to critical zones.",
                    affected_zone="All blocked corridors",
                    confidence=81,
                    urgency=UrgencyLevel.HIGH,
                    expected_impact="Air evacuation bypasses all ground blockages. Estimated 25-min reduction in critical patient response time.",
                    priority=2,
                ))

        return recommendations
