"""Tenant organisation settings (employment status options, etc.)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.employment_status import effective_employment_status_options, normalise_status_options_payload
from app.core.org_option_lists import (
    effective_department_options,
    effective_onboarding_stage_options,
    effective_rtw_category_options,
    effective_work_location_options,
    normalise_option_list,
)
from app.routers.deps import get_current_user
from app.models.models import DashboardAdminMessage, Organisation, User, UserRole
from app.schemas.schemas import (
    DashboardAdminMessageCreate,
    DashboardAdminMessageOut,
    DashboardFeaturesOut,
    DashboardFeaturesPatch,
    OrganisationSettingsOut,
    OrganisationSettingsPatch,
    WorkerTableColumnsOut,
    WorkerTableColumnsPatch,
)

router = APIRouter(prefix="/organisation", tags=["organisation"])

SETTINGS_EDIT_ROLES = frozenset(
    {
        UserRole.SUPER_ADMIN,
        UserRole.TENANT_ADMIN,
        UserRole.COMPLIANCE_MANAGER,
        UserRole.HR_OFFICER,
    }
)
CHAT_POST_ROLES = frozenset(
    {
        UserRole.SUPER_ADMIN,
        UserRole.TENANT_ADMIN,
        UserRole.COMPLIANCE_MANAGER,
        UserRole.HR_OFFICER,
    }
)
CHAT_VIEW_ROLES = frozenset(
    {
        UserRole.SUPER_ADMIN,
        UserRole.TENANT_ADMIN,
        UserRole.COMPLIANCE_MANAGER,
        UserRole.HR_OFFICER,
        UserRole.PAYROLL_OFFICER,
        UserRole.INSPECTOR,
    }
)
WORKER_COLUMNS_EDIT_ROLES = frozenset(
    {
        UserRole.SUPER_ADMIN,
        UserRole.TENANT_ADMIN,
        UserRole.COMPLIANCE_MANAGER,
        UserRole.HR_OFFICER,
    }
)
WORKER_COLUMNS_VIEW_ROLES = frozenset(
    {
        UserRole.SUPER_ADMIN,
        UserRole.TENANT_ADMIN,
        UserRole.COMPLIANCE_MANAGER,
        UserRole.HR_OFFICER,
        UserRole.PAYROLL_OFFICER,
        UserRole.INSPECTOR,
    }
)
WORKER_COLUMN_KEYS = frozenset({"name", "job_title", "employment", "status", "email", "docs"})
ROLE_KEYS = frozenset({"super_admin", "tenant_admin", "compliance_manager", "hr_officer", "payroll_officer", "inspector"})
DEFAULT_WORKER_COLUMNS = ["name", "job_title", "employment", "status", "email", "docs"]

DASHBOARD_FEATURE_KEYS = frozenset(
    {
        "admin_chat",
        "admin_notes",
        "stats",
        "cos",
        "charts",
        "visa_alerts",
        "quick_actions",
        "activity",
    }
)
# Default view is deliberately minimal (stats + HR notes box only).
# Other sections (CoS, charts, visa alerts, quick actions, activity, admin chat)
# can be re-enabled per org from Settings → Dashboard layout.
DEFAULT_DASHBOARD_FEATURES = [
    "stats",
    "admin_notes",
]


def _effective_dashboard_features(org: Organisation) -> list[str]:
    raw = org.dashboard_features
    if not raw or not isinstance(raw, list):
        return list(DEFAULT_DASHBOARD_FEATURES)
    out: list[str] = []
    seen: set[str] = set()
    for c in raw:
        if isinstance(c, str) and c in DASHBOARD_FEATURE_KEYS and c not in seen:
            out.append(c)
            seen.add(c)
    return out if out else list(DEFAULT_DASHBOARD_FEATURES)


def _build_settings_out(org: Organisation) -> OrganisationSettingsOut:
    return OrganisationSettingsOut(
        employment_status_options=effective_employment_status_options(org),
        department_options=effective_department_options(org),
        work_location_options=effective_work_location_options(org),
        onboarding_stage_options=effective_onboarding_stage_options(org),
        rtw_category_options=effective_rtw_category_options(org),
        dashboard_admin_note=org.dashboard_admin_note,
    )


@router.get("/settings", response_model=OrganisationSettingsOut)
def get_organisation_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organisation not found")
    return _build_settings_out(org)


@router.patch("/settings", response_model=OrganisationSettingsOut)
def patch_organisation_settings(
    payload: OrganisationSettingsPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in SETTINGS_EDIT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators or HR officers can change these organisation options",
        )
    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organisation not found")

    def apply_str_list(attr: str, raw: list[str] | None) -> None:
        if raw is None:
            setattr(org, attr, None)
            return
        normalised = normalise_option_list(raw)
        if len(normalised) > 50:
            raise HTTPException(status_code=400, detail=f"At most 50 entries allowed for {attr}")
        setattr(org, attr, normalised if normalised else None)

    if payload.employment_status_options is not None:
        if len(payload.employment_status_options) == 0:
            org.employment_status_options = None
        else:
            normalised = normalise_status_options_payload(payload.employment_status_options)
            if len(normalised) > 50:
                raise HTTPException(status_code=400, detail="At most 50 status labels allowed")
            org.employment_status_options = normalised if normalised else None

    if payload.department_options is not None:
        apply_str_list("department_options", payload.department_options)
    if payload.work_location_options is not None:
        apply_str_list("work_location_options", payload.work_location_options)
    if payload.onboarding_stage_options is not None:
        apply_str_list("onboarding_stage_options", payload.onboarding_stage_options)
    if payload.rtw_category_options is not None:
        apply_str_list("rtw_category_options", payload.rtw_category_options)
    if payload.dashboard_admin_note is not None:
        note = payload.dashboard_admin_note.strip()
        if len(note) > 2000:
            raise HTTPException(status_code=400, detail="Dashboard note must be at most 2000 characters")
        org.dashboard_admin_note = note or None

    db.commit()
    db.refresh(org)
    return _build_settings_out(org)


@router.get("/dashboard-chat", response_model=list[DashboardAdminMessageOut])
def get_dashboard_chat(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in CHAT_VIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    rows = (
        db.query(DashboardAdminMessage, User.full_name)
        .outerjoin(User, User.id == DashboardAdminMessage.created_by_user_id)
        .filter(DashboardAdminMessage.organisation_id == current_user.organisation_id)
        .order_by(DashboardAdminMessage.created_at.desc())
        .limit(100)
        .all()
    )
    out = [
        DashboardAdminMessageOut(
            id=msg.id,
            message=msg.message,
            created_at=msg.created_at,
            created_by_user_id=msg.created_by_user_id,
            created_by_name=full_name or "Unknown admin",
        )
        for msg, full_name in reversed(rows)
    ]
    return out


@router.post("/dashboard-chat", response_model=DashboardAdminMessageOut)
def create_dashboard_chat_message(
    payload: DashboardAdminMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in CHAT_POST_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to post")

    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(message) > 2000:
        raise HTTPException(status_code=400, detail="Message must be at most 2000 characters")

    item = DashboardAdminMessage(
        organisation_id=current_user.organisation_id,
        created_by_user_id=current_user.id,
        message=message,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return DashboardAdminMessageOut(
        id=item.id,
        message=item.message,
        created_at=item.created_at,
        created_by_user_id=item.created_by_user_id,
        created_by_name=current_user.full_name,
    )


@router.get("/workers-table-columns", response_model=WorkerTableColumnsOut)
def get_worker_table_columns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in WORKER_COLUMNS_VIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organisation not found")

    cfg = org.worker_table_columns_by_role or {}
    role_key = current_user.role.value
    raw = cfg.get(role_key)
    if not isinstance(raw, list):
        return WorkerTableColumnsOut(visible_columns=DEFAULT_WORKER_COLUMNS)
    cols = [c for c in raw if isinstance(c, str) and c in WORKER_COLUMN_KEYS]
    return WorkerTableColumnsOut(visible_columns=cols or DEFAULT_WORKER_COLUMNS)


@router.patch("/workers-table-columns", response_model=WorkerTableColumnsOut)
def patch_worker_table_columns(
    payload: WorkerTableColumnsPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in WORKER_COLUMNS_EDIT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only manager/HR roles can change columns")
    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organisation not found")

    cols: list[str] = []
    seen: set[str] = set()
    for c in payload.visible_columns:
        if c in WORKER_COLUMN_KEYS and c not in seen:
            cols.append(c)
            seen.add(c)
    if not cols:
        raise HTTPException(status_code=400, detail="At least one column is required")
    if len(cols) > len(WORKER_COLUMN_KEYS):
        raise HTTPException(status_code=400, detail="Too many columns selected")

    cfg = org.worker_table_columns_by_role or {}
    if not isinstance(cfg, dict):
        cfg = {}
    sanitized = {k: v for k, v in cfg.items() if k in ROLE_KEYS and isinstance(v, list)}
    sanitized[current_user.role.value] = cols
    org.worker_table_columns_by_role = sanitized
    db.commit()
    return WorkerTableColumnsOut(visible_columns=cols)


@router.get("/dashboard-features", response_model=DashboardFeaturesOut)
def get_dashboard_features(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in WORKER_COLUMNS_VIEW_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organisation not found")
    return DashboardFeaturesOut(features=_effective_dashboard_features(org))


@router.patch("/dashboard-features", response_model=DashboardFeaturesOut)
def patch_dashboard_features(
    payload: DashboardFeaturesPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in WORKER_COLUMNS_EDIT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager/HR roles can change dashboard sections",
        )
    org = db.query(Organisation).filter(Organisation.id == current_user.organisation_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organisation not found")

    feats: list[str] = []
    seen: set[str] = set()
    for c in payload.features:
        if c in DASHBOARD_FEATURE_KEYS and c not in seen:
            feats.append(c)
            seen.add(c)
    if not feats:
        raise HTTPException(status_code=400, detail="At least one dashboard section is required")
    if len(feats) > len(DASHBOARD_FEATURE_KEYS):
        raise HTTPException(status_code=400, detail="Invalid dashboard section list")

    org.dashboard_features = feats
    db.commit()
    db.refresh(org)
    return DashboardFeaturesOut(features=_effective_dashboard_features(org))
