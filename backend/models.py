"""Pydantic data models for the Resilience AI simulation."""

from pydantic import BaseModel
from typing import Optional
from enum import Enum


class DisasterType(str, Enum):
    FLOOD = "flood"
    EARTHQUAKE = "earthquake"
    CYCLONE = "cyclone"
    GRID_FAILURE = "grid_failure"


class InfrastructureType(str, Enum):
    HOSPITAL = "hospital"
    POWER_STATION = "power_station"
    SHELTER = "shelter"
    ROAD = "road"
    FIRE_STATION = "fire_station"
    POLICE_STATION = "police_station"
    METRO_STATION = "metro_station"
    COMMUNICATIONS = "communications"
    WATER_PUMP = "water_pump"


class InfraStatus(str, Enum):
    OPERATIONAL = "operational"
    DEGRADED = "degraded"
    FAILED = "failed"


class Infrastructure(BaseModel):
    id: str
    name: str
    type: InfrastructureType
    lat: float
    lng: float
    status: InfraStatus = InfraStatus.OPERATIONAL
    capacity: int = 100
    current_load: int = 0
    damage: float = 0.0  # 0-100


class Road(BaseModel):
    id: str
    name: str
    points: list[list[float]]  # [[lat, lng], ...]
    status: InfraStatus = InfraStatus.OPERATIONAL
    blocked: bool = False
    damage: float = 0.0


class Zone(BaseModel):
    id: str
    name: str
    center: list[float]  # [lat, lng]
    radius: float  # meters
    polygon: list[list[float]]  # [[lat, lng], ...]
    risk_score: float = 0.0  # 0-100
    population: int = 0
    flood_prone: bool = False
    hazard_intensity: float = 0.0


class DisasterEvent(BaseModel):
    type: DisasterType
    epicenter_zone: str  # zone id
    intensity: float = 70.0  # 0-100
    lat: Optional[float] = None
    lng: Optional[float] = None


class UrgencyLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AgentRecommendation(BaseModel):
    agent: str
    action: str
    reason: str
    affected_zone: Optional[str] = None
    confidence: float = 75.0
    urgency: UrgencyLevel = UrgencyLevel.MEDIUM
    expected_impact: Optional[str] = None
    priority: int = 2
    target: Optional[str] = None


class CascadingEvent(BaseModel):
    step: int
    source: str
    target: str
    description: str
    icon: str = "⚠️"


class WhatIfIntervention(BaseModel):
    action: str
    target_zone: Optional[str] = None
    amount: int = 1


# ─── New Models for Decision-Support System ───


class GraphNode(BaseModel):
    """Node in the city graph (zone centroid or infrastructure)."""
    id: str
    label: str
    node_type: str  # "zone", "hospital", "shelter", "power_station", etc.
    lat: float
    lng: float
    zone_id: Optional[str] = None
    capacity: int = 0
    current_load: int = 0
    status: str = "operational"


class GraphEdge(BaseModel):
    """Edge in the city graph (road/connection between nodes)."""
    source: str
    target: str
    weight: float = 1.0  # travel time in minutes
    distance_km: float = 0.0
    hazard_risk: float = 0.0
    congestion: float = 0.0
    blocked: bool = False


class PopulationMetrics(BaseModel):
    """Population impact metrics per zone."""
    zone_id: str
    zone_name: str
    total_population: int = 0
    exposed: int = 0
    evacuating: int = 0
    sheltered: int = 0
    est_evac_time_min: float = 0.0
    shelter_pressure_pct: float = 0.0
    casualties_est: int = 0


class ResourceAllocation(BaseModel):
    """A single resource allocation decision."""
    resource_type: str  # "ambulance", "generator", "shelter_route", "supply"
    source_id: str
    target_id: str
    target_name: str
    amount: int = 1
    priority_score: float = 0.0
    route_cost: float = 0.0  # travel time in minutes


class Strategy(BaseModel):
    """A ranked response strategy."""
    id: str
    name: str
    description: str
    actions: list[str] = []
    impact_score: float = 0.0       # 0-100, composite
    risk_reduction: float = 0.0     # absolute % reduction
    time_saved_min: float = 0.0     # minutes saved on avg
    survival_improvement: float = 0.0  # % improvement
    confidence: float = 0.0         # 0-100
    resource_cost: float = 0.0      # normalized cost 0-100


class SimulationState(BaseModel):
    tick: int = 0
    running: bool = False
    disaster: Optional[DisasterEvent] = None
    zones: list[Zone] = []
    infrastructure: list[Infrastructure] = []
    roads: list[Road] = []
    recommendations: list[AgentRecommendation] = []
    cascading_events: list[CascadingEvent] = []
    agent_logs: list[dict] = []
    overall_risk: float = 0.0
    timestamp: str = ""
    # Decision-support fields
    population_metrics: list[PopulationMetrics] = []
    resource_allocations: list[ResourceAllocation] = []
    strategies: list[Strategy] = []
    recommended_strategy_id: Optional[str] = None
    city_summary: dict = {}
