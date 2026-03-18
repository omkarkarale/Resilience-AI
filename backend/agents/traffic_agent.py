"""Traffic Agent – Computes safest routes, detects road blockages, reroutes vehicles."""

import random
from agents.base_agent import BaseAgent
from models import AgentRecommendation, InfraStatus, UrgencyLevel


class TrafficAgent(BaseAgent):
    name = "Traffic Agent"

    def __init__(self):
        super().__init__()
        self.state = {"blocked_roads": [], "rerouted_vehicles": 0}

    def analyze(self, zones, infrastructure, roads, disaster, other_agent_data=None):
        recommendations = []
        if not disaster:
            return recommendations

        self.state["blocked_roads"] = []
        blocked_count = 0
        blocked_names = []

        for road in roads:
            road_risk = 0
            for point in road.points:
                for zone in zones:
                    dist = ((point[0] - zone.center[0])**2 + (point[1] - zone.center[1])**2)**0.5
                    if dist < zone.radius / 111000:
                        road_risk = max(road_risk, zone.hazard_intensity)

            if road_risk > 50:
                damage = min(100, road_risk * 0.8 + random.uniform(0, 15))
                road.damage = damage
                if damage > 65:
                    road.blocked = True
                    road.status = InfraStatus.FAILED
                    blocked_count += 1
                    self.state["blocked_roads"].append(road.id)
                    blocked_names.append(road.name)
                    self.log(f"🚧 Road {road.name} BLOCKED (damage: {damage:.0f}%)")
                elif damage > 35:
                    road.status = InfraStatus.DEGRADED
                    self.log(f"⚠️ Road {road.name} degraded (damage: {damage:.0f}%)")
            else:
                road.damage = max(0, road.damage - 5)
                if road.damage < 20:
                    road.blocked = False
                    road.status = InfraStatus.OPERATIONAL

        if blocked_count > 0:
            affected_zone = ", ".join(sorted(list(set(z.name for z in zones if z.hazard_intensity > 50)))[:3]) or "Mumbai"
            recommendations.append(AgentRecommendation(
                agent=self.name,
                action=f"Reroute traffic via alternate corridors — {blocked_count} road(s) closed",
                reason=f"{blocked_count} critical road(s) severely damaged: {', '.join(blocked_names[:3])}. "
                       f"Disaster-level road damage prevents emergency vehicle passage.",
                affected_zone=affected_zone,
                confidence=88,
                urgency=UrgencyLevel.HIGH if blocked_count > 3 else UrgencyLevel.MEDIUM,
                expected_impact=f"Alternate routing reduces emergency response delay by ~12 minutes across {blocked_count} blocked corridors.",
                priority=2,
            ))

        # Check hospital access
        hospitals = [i for i in infrastructure if i.type.value == "hospital"]
        compromised_hospitals = []
        for hosp in hospitals:
            nearby_blocked = sum(
                1 for road in roads if road.blocked
                for point in road.points
                if ((point[0] - hosp.lat)**2 + (point[1] - hosp.lng)**2)**0.5 < 0.012
            )
            if nearby_blocked > 0:
                compromised_hospitals.append((hosp, nearby_blocked))

        if compromised_hospitals:
            compromised_hospitals.sort(key=lambda x: x[1], reverse=True)
            hosp_names_list = [h.name for h, nb in compromised_hospitals[:2]]
            hosp_names = " and ".join(hosp_names_list)
            
            total_compromised = len(compromised_hospitals)
            if total_compromised > 2:
                hosp_names += f" and {total_compromised - 2} others"
            
            total_blocked = sum(nb for h, nb in compromised_hospitals)
            
            recommendations.append(AgentRecommendation(
                agent=self.name,
                action=f"Open emergency lanes to {hosp_names} — access compromised",
                reason=f"{total_blocked} access road(s) blocked near {total_compromised} hospital(s). Ambulances cannot reach facilities.",
                affected_zone="Hospital Access Zones",
                confidence=93,
                urgency=UrgencyLevel.CRITICAL,
                expected_impact=f"Emergency lane restoration reduces ambulance wait time by est. 18 minutes for {total_compromised} facilities.",
                priority=1,
            ))
            for hosp, nb in compromised_hospitals:
                self.log(f"🚑 Access to {hosp.name} compromised! ({nb} roads blocked)")

        return recommendations
