"""Logistics Agent – Allocates supplies and optimizes delivery routes."""

import random
from agents.base_agent import BaseAgent
from models import AgentRecommendation, InfraStatus, UrgencyLevel


class LogisticsAgent(BaseAgent):
    name = "Logistics Agent"

    def __init__(self):
        super().__init__()
        self.state = {
            "supplies": {"water": 1000, "food": 800, "medical_kits": 200, "blankets": 500},
            "allocated": {},
            "deliveries_pending": 0
        }

    def analyze(self, zones, infrastructure, roads, disaster, other_agent_data=None):
        recommendations = []
        if not disaster:
            return recommendations

        shelters = [i for i in infrastructure if i.type.value == "shelter"]
        high_risk_zones = [z for z in zones if z.risk_score > 40]
        blocked_roads = []

        if other_agent_data and "traffic" in other_agent_data:
            blocked_roads = other_agent_data["traffic"].get("blocked_roads", [])

        for shelter in shelters:
            if shelter.status == InfraStatus.FAILED:
                continue

            nearby_population = 0
            for zone in high_risk_zones:
                dist = ((shelter.lat - zone.center[0])**2 + (shelter.lng - zone.center[1])**2)**0.5
                if dist < 0.025:
                    nearby_population += int(zone.population * zone.risk_score / 100 * 0.3)

            if nearby_population > 0:
                shelter.current_load = min(shelter.capacity + 200, shelter.current_load + nearby_population // 5)
                self.state["supplies"]["water"] = max(0, self.state["supplies"]["water"] - int(nearby_population * 0.2))
                self.state["supplies"]["food"] = max(0, self.state["supplies"]["food"] - int(nearby_population * 0.15))
                self.state["deliveries_pending"] += 1

                # Simulate people leaving the shelter (10-20% per tick)
                departure_rate = random.uniform(0.10, 0.20)
                shelter.current_load = max(0, shelter.current_load - int(shelter.current_load * departure_rate))

                if shelter.current_load > shelter.capacity:
                    shelter.status = InfraStatus.DEGRADED
                    self.log(f"📦 Shelter {shelter.name} OVERLOADED at {(shelter.current_load/shelter.capacity)*100:.0f}% capacity")
                else:
                    shelter.status = InfraStatus.OPERATIONAL
                    if shelter.current_load > shelter.capacity * 0.8:
                        self.log(f"📦 Shelter {shelter.name} at {(shelter.current_load/shelter.capacity)*100:.0f}% capacity")

        for item, qty in self.state["supplies"].items():
            if qty < 100:
                item_label = item.replace("_", " ").title()
                high_zone_names = ", ".join(z.name for z in high_risk_zones[:3]) if high_risk_zones else "Mumbai"
                recommendations.append(AgentRecommendation(
                    agent=self.name,
                    action=f"Emergency resupply of {item_label} — critically low",
                    reason=f"{item_label} stockpile at {qty} units, below safe threshold for ongoing disaster operations. "
                           f"High demand from {len(high_risk_zones)} active zones.",
                    affected_zone=high_zone_names,
                    confidence=93,
                    urgency=UrgencyLevel.CRITICAL,
                    expected_impact=f"Restoring {item_label} to 500+ units ensures 72-hour shelter sustainability for displaced population.",
                    priority=2,
                ))
                self.log(f"📉 {item} supply critically low: {qty} units")

        if blocked_roads and self.state["deliveries_pending"] > 0:
            zone_names = ", ".join(z.name for z in high_risk_zones[:3]) if high_risk_zones else "Mumbai"
            recommendations.append(AgentRecommendation(
                agent=self.name,
                action=f"Reroute {self.state['deliveries_pending']} supply convoys via unblocked corridors",
                reason=f"{len(blocked_roads)} road(s) blocked. Supply deliveries to {self.state['deliveries_pending']} shelters are delayed.",
                affected_zone=zone_names,
                confidence=84,
                urgency=UrgencyLevel.HIGH,
                expected_impact="Alternate routing adds 15 min per delivery but prevents complete supply chain disruption.",
                priority=2,
            ))
            self.log(f"🚛 Rerouting {self.state['deliveries_pending']} deliveries")

        if high_risk_zones:
            zone_names = ", ".join(z.name for z in high_risk_zones[:3]) if high_risk_zones else "Mumbai"
            recommendations.append(AgentRecommendation(
                agent=self.name,
                action=f"Pre-position emergency supply caches across {len(shelters)} active shelters",
                reason=f"{len(high_risk_zones)} high-risk zones are generating displaced population requiring immediate shelter and supplies.",
                affected_zone=zone_names,
                confidence=86,
                urgency=UrgencyLevel.MEDIUM,
                expected_impact=f"Pre-positioning reduces supply response time by 40%. Shelters will serve est. {len(shelters) * 500:,} residents.",
                priority=3,
            ))

        return recommendations
