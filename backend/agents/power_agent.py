# pyre-ignore-all-errors
"""Power Agent – Predicts grid failure, prioritizes critical facilities, suggests load shedding."""

import random
from typing import Any
from agents.base_agent import BaseAgent  # pyre-ignore[21]
from models import AgentRecommendation, InfraStatus, UrgencyLevel  # pyre-ignore[21]


class PowerAgent(BaseAgent):
    name = "Power Agent"

    def __init__(self):
        super().__init__()
        self.state: dict[str, Any] = {"grid_stress": 0, "failed_stations": [], "load_shedding_active": False}

    def analyze(self, zones, infrastructure, roads, disaster, other_agent_data=None):
        recommendations = []
        if not disaster:
            return recommendations

        power_stations = [i for i in infrastructure if i.type.value == "power_station"]
        hospitals = [i for i in infrastructure if i.type.value == "hospital"]
        self.state["failed_stations"] = []

        total_hazard = sum(z.hazard_intensity for z in zones)
        avg_hazard = total_hazard / max(len(zones), 1)
        self.state["grid_stress"] = min(100, avg_hazard * 1.2 + random.uniform(-5, 10))  # pyre-ignore

        for station in power_stations:
            if station.status == InfraStatus.FAILED:
                self.state["failed_stations"].append(station.id)  # pyre-ignore
                self.log(f"⚡ {station.name} FAILED (damage: {station.damage:.0f}%)")
            elif station.status == InfraStatus.DEGRADED:
                self.log(f"⚠️ {station.name} degraded (damage: {station.damage:.0f}%)")

        overloaded_hosps = []
        if other_agent_data and "medical" in other_agent_data:
            overloaded_hosps = other_agent_data["medical"].get("overloaded_hospitals", [])

        if self.state["failed_stations"]:
            self.state["load_shedding_active"] = True
            high_hazard = sorted([z for z in zones if z.hazard_intensity > 50], key=lambda z: -z.hazard_intensity)
            affected_zone = ", ".join(z.name for z in high_hazard[:3]) or "Mumbai Metro"
            
            dtype = disaster.type.value
            if dtype == "flood":
                cause = "substations flooded and offline"
            elif dtype == "earthquake":
                cause = "substations damaged by seismic activity"
            elif dtype == "cyclone":
                cause = "substations damaged by severe storm"
            else:
                cause = "power station(s) have failed"

            recommendations.append(AgentRecommendation(
                agent=self.name,
                action=f"Activate zone-based load shedding — {len(self.state['failed_stations'])} substation(s) failed",  # pyre-ignore
                reason=f"Grid stress at {self.state['grid_stress']:.0f}%. {len(self.state['failed_stations'])} {cause}, "  # pyre-ignore
                       f"causing cascading supply deficit across the network.",
                affected_zone=affected_zone,
                confidence=92,
                urgency=UrgencyLevel.CRITICAL,
                expected_impact="Load shedding reduces cascading grid failure risk by 60%. Ensures critical facilities remain powered.",
                priority=1,
            ))

            if hospitals:
                recommendations.append(AgentRecommendation(
                    agent=self.name,
                    action="Reroute priority power to hospitals, shelters, and comms towers",
                    reason="Power grid collapse threatens life-support systems in medical facilities across Mumbai.",
                    affected_zone="All active hospitals",
                    confidence=96,
                    urgency=UrgencyLevel.CRITICAL,
                    expected_impact="Prevents ventilator/ICU failures. Estimated 200+ lives protected from power-related medical collapse.",
                    priority=1,
                ))
                self.log("🔌 Prioritizing power to critical facilities")

        elif self.state["grid_stress"] > 70:  # pyre-ignore
            recommendations.append(AgentRecommendation(
                agent=self.name,
                action=f"Implement preemptive load reduction — grid under strain",
                reason=f"Grid stress at {self.state['grid_stress']:.0f}%, approaching failure threshold. "
                       f"Preventative action required before cascading failure occurs.",
                affected_zone="Metro-wide grid",
                confidence=80,
                urgency=UrgencyLevel.HIGH,
                expected_impact="Reducing load by 20% prevents full grid collapse. Buys 45+ minutes for station repairs.",
                priority=2,
            ))

        if overloaded_hosps:
            recommendations.append(AgentRecommendation(
                agent=self.name,
                action=f"Deploy backup diesel generators to {len(overloaded_hosps)} overloaded hospital(s)",
                reason=f"{len(overloaded_hosps)} hospital(s) are operating above capacity and cannot afford power interruption.",
                affected_zone="Overloaded hospitals",
                confidence=88,
                urgency=UrgencyLevel.HIGH,
                expected_impact="Each generator provides 72-hour backup supply, maintaining critical medical operations.",
                priority=1,
            ))
            self.log(f"🔋 Requesting generators for {len(overloaded_hosps)} hospitals")

        return recommendations
