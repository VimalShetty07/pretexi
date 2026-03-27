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
from app.models.models import Organisation, User, UserRole
from app.schemas.schemas import OrganisationSettingsOut, OrganisationSettingsPatch

router = APIRouter(prefix="/organisation", tags=["organisation"])

SETTINGS_EDIT_ROLES = frozenset(
    {
        UserRole.SUPER_ADMIN,
        UserRole.TENANT_ADMIN,
        UserRole.COMPLIANCE_MANAGER,
    }
)


def _build_settings_out(org: Organisation) -> OrganisationSettingsOut:
    return OrganisationSettingsOut(
        employment_status_options=effective_employment_status_options(org),
        department_options=effective_department_options(org),
        work_location_options=effective_work_location_options(org),
        onboarding_stage_options=effective_onboarding_stage_options(org),
        rtw_category_options=effective_rtw_category_options(org),
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
            detail="Only organisation admins can change these options",
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

    db.commit()
    db.refresh(org)
    return _build_settings_out(org)
