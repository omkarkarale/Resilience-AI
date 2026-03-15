# pyre-ignore-all-errors
"""Medical Agent – Tracks casualties, hospital load, and medical resource allocation."""

import random
from typing import Any
from agents.base_agent import BaseAgent  # pyre-ignore[21]
from models import AgentRecommendation, InfraStatus, UrgencyLevel  # pyre-ignore[21]


class MedicalAgent(BaseAgent):
    name = "Medical Agent"

    def __init__(self):
        super().__init__()
        self.state: dict[str, Any] = {"total_injured": 0, "triaged": 0, "overloaded_hospitals": []}

    def analyze(self, zones, infrastructure, roads, disaster, other_agent_data=None):
        recommendations = []
        if not disaster:
            return recommendations

        hospitals = [i for i in infrastructure if i.type.value == "hospital"]
        self.state["overloaded_hospitals"] = []

        total_injured = 0
        for zone in zones:
            if zone.risk_score > 30:
                # Realistic per-tick casualty incidence (0.05% of at-risk pop per tick)
                # This prevents hospitals from being battered by 100,000+ patients in a single tick
                incidence_rate = 0.0005
                if disaster.type.value == "earthquake":
                    incidence_rate = 0.0015  # Quakes have higher sudden trauma rates
                injured = int(zone.population * (zone.risk_score / 100) * incidence_rate + random.uniform(0, 5))
                total_injured += injured  # pyre-ignore

        self.state["total_injured"] = total_injured
        self.state["triaged"] = int(total_injured * 0.7)  # pyre-ignore

        if total_injured > 0 and hospitals:
            per_hospital = total_injured // max(len(hospitals), 1)  # pyre-ignore
            for hosp in hospitals:
                if hosp.status == InfraStatus.FAILED:
                    hosp.current_load = 0
                    continue

                incoming = per_hospital + random.randint(0, int(per_hospital * 0.2) + 2)
                
                # Simulate patient treatment/discharge (5-10% of capacity per tick)
                discharge_rate = random.uniform(0.05, 0.10)
                hosp.current_load = max(0, hosp.current_load - int(hosp.capacity * discharge_rate))
                
                hosp.current_load = min(hosp.capacity * 2, hosp.current_load + incoming)  # pyre-ignore
                load_pct = (hosp.current_load / hosp.capacity) * 100

                if hosp.damage >= 100:
                    hosp.status = InfraStatus.FAILED
                    hosp.current_load = 0
                    self.log(f"🚨 {hosp.name} FAILED due to critical damage.")
                elif load_pct > 100:
                    hosp.status = InfraStatus.DEGRADED
                    self.state["overloaded_hospitals"].append(hosp.id)  # pyre-ignore[16]
                    hosp.damage = min(100, hosp.damage + 2)
                    self.log(f"🏥 {hosp.name} OVERLOADED at {load_pct:.0f}% capacity")
                elif load_pct <= 90 and hosp.damage < 40:
                    # Recover status if load drops gracefully and damage is managed
                    hosp.status = InfraStatus.OPERATIONAL
                    hosp.damage = max(0, hosp.damage - 1)

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
