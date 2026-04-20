"""Organisation checklist template: GET/PUT /organisations/{id}/checklist-template."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routers.deps import get_current_user
from app.models.models import Organisation, OrganisationChecklistTemplateItem, User, UserRole
from app.schemas.schemas import ChecklistTemplateItemOut, ChecklistTemplatePut
from app.routers.documents import provision_missing_worker_checklist_rows

router = APIRouter(prefix="/organisations", tags=["organisations"])

# Tenant admin can edit their org template; compliance / super / platform as before.
TEMPLATE_EDIT_ROLES = frozenset(
    {
        UserRole.TENANT_ADMIN,
        UserRole.SUPER_ADMIN,
        UserRole.COMPLIANCE_MANAGER,
        UserRole.PLATFORM_OWNER,
    }
)


def _get_organisation_or_404(db: Session, organisation_id: str) -> Organisation:
    org = db.query(Organisation).filter(Organisation.id == organisation_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organisation not found")
    return org


def _ensure_can_view_template(user: User, organisation_id: str) -> None:
    if user.role == UserRole.PLATFORM_OWNER:
        return
    if user.role == UserRole.EMPLOYEE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    if user.organisation_id != organisation_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")


def _ensure_can_edit_template(user: User, organisation_id: str) -> None:
    if user.role not in TEMPLATE_EDIT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    if user.role == UserRole.PLATFORM_OWNER:
        return
    if user.organisation_id != organisation_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")


@router.get("/{organisation_id}/checklist-template", response_model=list[ChecklistTemplateItemOut])
def get_checklist_template(
    organisation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_can_view_template(current_user, organisation_id)
    _get_organisation_or_404(db, organisation_id)
    rows = (
        db.query(OrganisationChecklistTemplateItem)
        .filter(OrganisationChecklistTemplateItem.organisation_id == organisation_id)
        .order_by(
            OrganisationChecklistTemplateItem.is_active.desc(),
            OrganisationChecklistTemplateItem.sort_order.asc(),
            OrganisationChecklistTemplateItem.id.asc(),
        )
        .all()
    )
    return rows


@router.put("/{organisation_id}/checklist-template", response_model=list[ChecklistTemplateItemOut])
def put_checklist_template(
    organisation_id: str,
    payload: ChecklistTemplatePut,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_can_edit_template(current_user, organisation_id)
    _get_organisation_or_404(db, organisation_id)

    if not payload.items:
        raise HTTPException(status_code=400, detail="Add at least one checklist item")

    existing = (
        db.query(OrganisationChecklistTemplateItem)
        .filter(OrganisationChecklistTemplateItem.organisation_id == organisation_id)
        .all()
    )
    incoming_ids = {it.id for it in payload.items if it.id}

    for row in existing:
        if row.id not in incoming_ids:
            row.is_active = False

    for i, item in enumerate(payload.items):
        desc = (item.description or "").strip()
        if not desc:
            if item.id:
                raise HTTPException(status_code=400, detail="Description is required for each saved template row")
            continue
        cat = (item.category or "").strip() or None
        sort = item.sort_order if item.sort_order != 0 else i
        active = bool(getattr(item, "is_active", True))

        if item.id:
            ent = db.get(OrganisationChecklistTemplateItem, item.id)
            if not ent or ent.organisation_id != organisation_id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template row not found")
            ent.description = desc
            ent.category = cat
            ent.sort_order = sort
            ent.is_active = active
        else:
            db.add(
                OrganisationChecklistTemplateItem(
                    organisation_id=organisation_id,
                    description=desc,
                    category=cat,
                    sort_order=sort,
                    is_active=active,
                )
            )

    db.flush()

    any_active = (
        db.query(OrganisationChecklistTemplateItem.id)
        .filter(
            OrganisationChecklistTemplateItem.organisation_id == organisation_id,
            OrganisationChecklistTemplateItem.is_active.is_(True),
        )
        .first()
    )
    if not any_active:
        raise HTTPException(status_code=400, detail="At least one checklist item must remain active")

    provision_missing_worker_checklist_rows(db, organisation_id)
    db.commit()

    rows = (
        db.query(OrganisationChecklistTemplateItem)
        .filter(OrganisationChecklistTemplateItem.organisation_id == organisation_id)
        .order_by(
            OrganisationChecklistTemplateItem.is_active.desc(),
            OrganisationChecklistTemplateItem.sort_order.asc(),
            OrganisationChecklistTemplateItem.id.asc(),
        )
        .all()
    )
    if not rows:
        raise HTTPException(status_code=400, detail="Add at least one checklist item")
    return rows
