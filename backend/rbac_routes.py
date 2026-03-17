"""RBAC API routes — authentication, users, announcements, field reports, audit logs."""

from fastapi import APIRouter, Depends, HTTPException, status

from auth import (
    verify_password, create_token, require_auth, require_role,
)
from rbac_models import (
    UserRole, LoginRequest, LoginResponse, UserOut, UserCreate, UserUpdate,
    AnnouncementCreate, AnnouncementOut,
    FieldReportCreate, FieldReportOut,
    AuditLogEntry, UserInDB,
)
import seed_store as store

router = APIRouter(prefix="/api")


# ═══════════════════════════════════════════
#  AUTH
# ═══════════════════════════════════════════

@router.post("/auth/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    user = store.get_user_by_email(req.email)
    if not user or not verify_password(req.password, user.hashed_password):
        store.add_audit_log(
            user_id=None, user_name=req.email, role="unknown",
            department=None, action="login",
            success=False, detail="Invalid credentials",
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        store.add_audit_log(
            user_id=user.id, user_name=user.name, role=user.role.value,
            department=user.department.value if user.department else None,
            action="login", success=False, detail="Account deactivated",
        )
        raise HTTPException(status_code=403, detail="Account deactivated")

    token = create_token(user.id, user.role.value,
                          user.department.value if user.department else None)

    store.add_audit_log(
        user_id=user.id, user_name=user.name, role=user.role.value,
        department=user.department.value if user.department else None,
        action="login", success=True,
    )

    return LoginResponse(
        token=token,
        user=UserOut(
            id=user.id, name=user.name, email=user.email,
            role=user.role, department=user.department,
            is_active=user.is_active, created_at=user.created_at,
        ),
    )


@router.get("/auth/me", response_model=UserOut)
async def get_me(user: UserInDB = Depends(require_auth)):
    return UserOut(
        id=user.id, name=user.name, email=user.email,
        role=user.role, department=user.department,
        is_active=user.is_active, created_at=user.created_at,
    )


@router.post("/auth/logout")
async def logout(user: UserInDB = Depends(require_auth)):
    store.add_audit_log(
        user_id=user.id, user_name=user.name, role=user.role.value,
        department=user.department.value if user.department else None,
        action="logout", success=True,
    )
    return {"status": "logged_out"}


# ═══════════════════════════════════════════
#  USER MANAGEMENT (Admin only)
# ═══════════════════════════════════════════

@router.get("/users", response_model=list[UserOut])
async def list_users(user: UserInDB = Depends(require_role(UserRole.ADMIN))):
    return store.list_users()


@router.post("/users", response_model=UserOut)
async def create_user(req: UserCreate, user: UserInDB = Depends(require_role(UserRole.ADMIN))):
    try:
        new_user = store.create_user(
            name=req.name, email=req.email, password=req.password,
            role=req.role, department=req.department,
        )
        store.add_audit_log(
            user_id=user.id, user_name=user.name, role=user.role.value,
            department=user.department.value if user.department else None,
            action="create_user", target=req.email, success=True,
        )
        return new_user
    except ValueError as e:
        store.add_audit_log(
            user_id=user.id, user_name=user.name, role=user.role.value,
            department=user.department.value if user.department else None,
            action="create_user", target=req.email,
            success=False, detail=str(e),
        )
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(user_id: str, req: UserUpdate,
                       user: UserInDB = Depends(require_role(UserRole.ADMIN))):
    updated = store.update_user(user_id, **req.dict(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    store.add_audit_log(
        user_id=user.id, user_name=user.name, role=user.role.value,
        department=user.department.value if user.department else None,
        action="update_user", target=user_id, success=True,
        detail=str(req.dict(exclude_none=True)),
    )
    return updated


# ═══════════════════════════════════════════
#  ANNOUNCEMENTS
# ═══════════════════════════════════════════

@router.get("/announcements", response_model=list[AnnouncementOut])
async def list_announcements(role: str = "public"):
    """Public endpoint — returns announcements filtered by caller's role."""
    role_enum = UserRole.PUBLIC
    if role in ("admin", "operator"):
        role_enum = UserRole(role)
    return store.list_announcements(role_enum)


@router.post("/announcements", response_model=AnnouncementOut)
async def create_announcement(req: AnnouncementCreate,
                                user: UserInDB = Depends(require_role(UserRole.ADMIN))):
    ann = store.create_announcement(
        title=req.title, body=req.body, visibility=req.visibility,
        user_id=user.id, user_name=user.name,
    )
    store.add_audit_log(
        user_id=user.id, user_name=user.name, role=user.role.value,
        department=user.department.value if user.department else None,
        action="publish_announcement", target=req.title, success=True,
    )
    return ann


# ═══════════════════════════════════════════
#  FIELD REPORTS
# ═══════════════════════════════════════════

@router.get("/field-reports", response_model=list[FieldReportOut])
async def list_field_reports(user: UserInDB = Depends(require_auth)):
    is_admin = user.role == UserRole.ADMIN
    return store.list_field_reports(user_id=user.id, is_admin=is_admin)


@router.post("/field-reports", response_model=FieldReportOut)
async def create_field_report(req: FieldReportCreate,
                                user: UserInDB = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR))):
    report = store.create_field_report(
        user_id=user.id, user_name=user.name,
        department=user.department.value if user.department else None,
        zone=req.zone, report_type=req.report_type,
        description=req.description,
    )
    store.add_audit_log(
        user_id=user.id, user_name=user.name, role=user.role.value,
        department=user.department.value if user.department else None,
        action="submit_field_report", target=req.zone, success=True,
    )
    return report


# ═══════════════════════════════════════════
#  AUDIT LOGS (Admin only)
# ═══════════════════════════════════════════

@router.get("/audit-logs", response_model=list[AuditLogEntry])
async def list_audit_logs(user: UserInDB = Depends(require_role(UserRole.ADMIN))):
    return store.list_audit_logs(limit=200)
