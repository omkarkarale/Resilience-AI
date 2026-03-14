"""Weather Agent – Predicts hazard spread and generates risk heatmap."""

import random
from agents.base_agent import BaseAgent
from models import AgentRecommendation, DisasterType, UrgencyLevel


class WeatherAgent(BaseAgent):
    name = "Weather Agent"

    def __init__(self):
        super().__init__()
        self.state = {"wind_speed": 0, "rainfall": 0, "seismic_activity": 0}

    def analyze(self, zones, infrastructure, roads, disaster, other_agent_data=None):
        recommendations = []
        if not disaster:
            return recommendations

        if disaster.type == DisasterType.FLOOD:
            self.state["rainfall"] = disaster.intensity * 0.8 + random.uniform(-5, 10)
            self.state["wind_speed"] = random.uniform(20, 80)
        elif disaster.type == DisasterType.CYCLONE:
            self.state["wind_speed"] = disaster.intensity * 1.2 + random.uniform(10, 30)
            self.state["rainfall"] = disaster.intensity * 0.6 + random.uniform(5, 20)
        else:
            self.state["seismic_activity"] = disaster.intensity * 0.9 + random.uniform(-5, 5)

        epicenter = next((z for z in zones if z.id == disaster.epicenter_zone), None)

        if epicenter:
            for zone in zones:
                dist = ((zone.center[0] - epicenter.center[0])**2 + (zone.center[1] - epicenter.center[1])**2)**0.5
                spread_factor = max(0, 1 - dist / 0.08)
                base_intensity = disaster.intensity * spread_factor

                if disaster.type in (DisasterType.FLOOD, DisasterType.CYCLONE) and zone.flood_prone:
                    base_intensity *= 1.4

                zone.hazard_intensity = min(100, base_intensity + random.uniform(-3, 5))
                zone.risk_score = min(100, zone.hazard_intensity * 0.7 + zone.population / 10000)

            # Affect other infrastructure types based on their zone's hazard intensity
            for infra in infrastructure:
                if infra.type.value in ["fire_station", "police_station", "metro_station", "communications", "water_pump"]:
                    infra_zone = next((z for z in zones if ((infra.lat - z.center[0])**2 + (infra.lng - z.center[1])**2)**0.5 < 0.02), None)
                    if infra_zone:
                        if infra_zone.hazard_intensity > 60:
                            infra.damage = min(100, infra.damage + infra_zone.hazard_intensity * 0.1 + random.uniform(0, 5))
                        elif infra_zone.hazard_intensity < 30:
                            # Natural recovery
                            infra.damage = max(0, infra.damage - 2)

                        if infra.damage > 70:
                            infra.status = "failed"
                        elif infra.damage > 40:
                            infra.status = "degraded"
                        else:
                            infra.status = "operational"

            high_risk = sorted([z for z in zones if z.risk_score > 55], key=lambda z: -z.risk_score)
            if high_risk:
                worst = high_risk[0]
                recommendations.append(AgentRecommendation(
                    agent=self.name,
                    action=f"Initiate mandatory evacuation of {worst.name}",
                    reason=f"Risk score at {worst.risk_score:.0f}% with hazard intensity {worst.hazard_intensity:.0f}. "
                           f"{'Coastal flooding imminent.' if worst.flood_prone else 'Structural collapse risk high.'}",
                    affected_zone=worst.name,
                    confidence=min(95, worst.risk_score + 10),
                    urgency=UrgencyLevel.CRITICAL,
                    expected_impact=f"Estimated {int(worst.population * 0.3):,} residents evacuated before escalation window closes.",
                    priority=1,
                    target=worst.id,
                ))
                self.log(f"🌧️ Critical risk in {worst.name} (score: {worst.risk_score:.0f})")

            if len(high_risk) > 2:
                zone_names = ", ".join(z.name for z in high_risk[:4])
                recommendations.append(AgentRecommendation(
                    agent=self.name,
                    action=f"Issue city-wide hazard alert for {len(high_risk)} districts",
                    reason=f"Multi-zone hazard cascade detected. Affected districts: {zone_names}. "
                           f"{disaster.type.value.title()} intensity at {disaster.intensity:.0f}%.",
                    affected_zone=zone_names,
                    confidence=88,
                    urgency=UrgencyLevel.HIGH,
                    expected_impact="Activates emergency response protocols across all agencies. Estimated 18-min response improvement.",
                    priority=2,
                ))
                self.log(f"⚠️ {len(high_risk)} zones above critical risk")

        return recommendations
