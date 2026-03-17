"""In-memory seed data store for demo purposes.

This is NOT a production database. All data lives in-memory and resets on restart.
Replace with a real database layer when moving to production.
"""

import uuid
from datetime import datetime
from typing import Optional

from auth import hash_password
from rbac_models import (
    UserInDB, UserOut, UserRole, Department,
    AnnouncementOut, AnnouncementVisibility,
    FieldReportOut, ReportType,
    AuditLogEntry,
)

# ─── In-Memory Collections ───
_users: dict[str, UserInDB] = {}
_announcements: list[AnnouncementOut] = []
_field_reports: list[FieldReportOut] = []
_audit_logs: list[AuditLogEntry] = []


def _uid() -> str:
    return uuid.uuid4().hex[:12]


def _now() -> str:
    return datetime.utcnow().isoformat() + "Z"


# ─── Seed Users ───
def _seed():
    seeds = [
        ("Dr. Aris (Instructor)", "admin@resilience.ai", "admin123", UserRole.ADMIN, None),
        ("Anya Sharma (Medical Learner)", "medical@resilience.ai", "operator123", UserRole.OPERATOR, Department.MEDICAL),
        ("Vikram Singh (Traffic Learner)", "traffic@resilience.ai", "operator123", UserRole.OPERATOR, Department.TRAFFIC),
        ("Rohan Das (Fire Learner)", "fire@resilience.ai", "operator123", UserRole.OPERATOR, Department.FIRE),
        ("Isha Gupta (Power Learner)", "power@resilience.ai", "operator123", UserRole.OPERATOR, Department.POWER),
    ]
    for name, email, pwd, role, dept in seeds:
        uid = _uid()
        _users[uid] = UserInDB(
            id=uid,
            name=name,
            email=email,
            hashed_password=hash_password(pwd),
            role=role,
            department=dept,
            is_active=True,
            created_at=_now(),
        )

    # Seed a welcome announcement
    _announcements.append(AnnouncementOut(
        id=_uid(),
        title="Welcome to Resilience AI",
        body="The educational simulation platform is now online. Learners, please select your scenario module to begin.",
        visibility=AnnouncementVisibility.PUBLIC,
        created_by="system",
        created_by_name="System",
        created_at=_now(),
    ))


_seed()


# ─── User Helpers ───

def get_user(user_id: str) -> Optional[UserInDB]:
    return _users.get(user_id)


def get_user_by_email(email: str) -> Optional[UserInDB]:
    for u in _users.values():
        if u.email == email:
            return u
    return None


def list_users() -> list[UserOut]:
    return [
        UserOut(
            id=u.id, name=u.name, email=u.email,
            role=u.role, department=u.department,
            is_active=u.is_active, created_at=u.created_at,
        )
        for u in _users.values()
    ]


def create_user(name: str, email: str, password: str, role: UserRole,
                 department: Optional[Department] = None) -> UserOut:
    if get_user_by_email(email):
        raise ValueError("Email already exists")
    uid = _uid()
    user = UserInDB(
        id=uid, name=name, email=email,
        hashed_password=hash_password(password),
        role=role, department=department,
        is_active=True, created_at=_now(),
    )
    _users[uid] = user
    return UserOut(
        id=uid, name=name, email=email,
        role=role, department=department,
        is_active=True, created_at=user.created_at,
    )


def update_user(user_id: str, **kwargs) -> Optional[UserOut]:
    user = _users.get(user_id)
    if not user:
        return None
    data = user.dict()
    for k, v in kwargs.items():
        if v is not None and k in data:
            data[k] = v
    _users[user_id] = UserInDB(**data)
    u = _users[user_id]
    return UserOut(
        id=u.id, name=u.name, email=u.email,
        role=u.role, department=u.department,
        is_active=u.is_active, created_at=u.created_at,
    )


# ─── Announcement Helpers ───

def list_announcements(role: Optional[UserRole] = None) -> list[AnnouncementOut]:
    if role == UserRole.PUBLIC or role is None:
        return [a for a in _announcements if a.visibility == AnnouncementVisibility.PUBLIC]
    return list(_announcements)  # admin + operator see all


def create_announcement(title: str, body: str, visibility: AnnouncementVisibility,
                         user_id: str, user_name: str) -> AnnouncementOut:
    ann = AnnouncementOut(
        id=_uid(), title=title, body=body,
        visibility=visibility,
        created_by=user_id, created_by_name=user_name,
        created_at=_now(),
    )
    _announcements.insert(0, ann)
    return ann


# ─── Field Report Helpers ───

def list_field_reports(user_id: Optional[str] = None, is_admin: bool = False) -> list[FieldReportOut]:
    if is_admin:
        return list(_field_reports)
    if user_id:
        return [r for r in _field_reports if r.user_id == user_id]
    return []


def create_field_report(user_id: str, user_name: str, department: Optional[str],
                         zone: str, report_type: ReportType,
                         description: str) -> FieldReportOut:
    report = FieldReportOut(
        id=_uid(), user_id=user_id, user_name=user_name,
        department=department, zone=zone,
        report_type=report_type, description=description,
        created_at=_now(),
    )
    _field_reports.insert(0, report)
    return report


# ─── Audit Log Helpers ───

def add_audit_log(user_id: Optional[str], user_name: str, role: str,
                   department: Optional[str], action: str,
                   target: Optional[str] = None, success: bool = True,
                   detail: Optional[str] = None):
    entry = AuditLogEntry(
        id=_uid(),
        user_id=user_id,
        user_name=user_name,
        role=role,
        department=department,
        action=action,
        target=target,
        success=success,
        detail=detail,
        timestamp=_now(),
    )
    _audit_logs.insert(0, entry)
    return entry


def list_audit_logs(limit: int = 100) -> list[AuditLogEntry]:
    return _audit_logs[:limit]
