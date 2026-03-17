"""Pydantic models for the RBAC layer."""

from pydantic import BaseModel
from typing import Optional
from enum import Enum
from datetime import datetime


class UserRole(str, Enum):
    ADMIN = "admin"
    OPERATOR = "operator"
    PUBLIC = "public"


class Department(str, Enum):
    MEDICAL = "medical"
    TRAFFIC = "traffic"
    FIRE = "fire"
    POWER = "power"
    LOGISTICS = "logistics"


class AnnouncementVisibility(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"


class ReportType(str, Enum):
    ROAD_BLOCKED = "road_blocked"
    HOSPITAL_ISSUE = "hospital_issue"
    SHELTER_FULL = "shelter_full"
    POWER_OUTAGE = "power_outage"
    COMMS_DISRUPTION = "comms_disruption"
    FIRE_STATION_UNAVAILABLE = "fire_station_unavailable"
    EMERGENCY_INCIDENT = "emergency_incident"


# ─── User ───

class UserBase(BaseModel):
    name: str
    email: str
    role: UserRole
    department: Optional[Department] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    department: Optional[Department] = None
    is_active: Optional[bool] = None


class UserOut(UserBase):
    id: str
    created_at: str


class UserInDB(UserBase):
    id: str
    hashed_password: str
    created_at: str


# ─── Auth ───

class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: UserOut


# ─── Announcements ───

class AnnouncementCreate(BaseModel):
    title: str
    body: str
    visibility: AnnouncementVisibility = AnnouncementVisibility.PUBLIC


class AnnouncementOut(BaseModel):
    id: str
    title: str
    body: str
    visibility: AnnouncementVisibility
    created_by: str
    created_by_name: str
    created_at: str


# ─── Field Reports ───

class FieldReportCreate(BaseModel):
    zone: str
    report_type: ReportType
    description: str


class FieldReportOut(BaseModel):
    id: str
    user_id: str
    user_name: str
    department: Optional[str] = None
    zone: str
    report_type: ReportType
    description: str
    created_at: str


# ─── Audit Logs ───

class AuditLogEntry(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_name: str
    role: str
    department: Optional[str] = None
    action: str
    target: Optional[str] = None
    success: bool = True
    detail: Optional[str] = None
    timestamp: str
