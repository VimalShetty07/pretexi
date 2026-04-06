"""Per-organisation checklist templates and worker checklist state."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth_deps import (
    effective_organisation_id,
    get_current_user,
    require_template_put,
    require_template_view,
)
from app.config import get_settings
from app.database import get_db
from app.models import ChecklistDocument, ChecklistItemState, ChecklistTemplateItem, ItemStatus
from app.checklist_schemas import (
    ChecklistItemOut,
    ChecklistTemplateItemOut,
    ChecklistTemplatePut,
    DocFileOut,
    TokenUser,
)

router = APIRouter(tags=["checklist"])

CHECKLIST_REVIEW_ROLES = frozenset(
    {"platform_owner", "super_admin", "tenant_admin", "compliance_manager", "hr_officer"}
)


def _require_checklist_review_role(user: TokenUser) -> None:
    if user.role not in CHECKLIST_REVIEW_ROLES:
        raise HTTPException(status_code=403, detail="Not allowed to verify or reject checklist files")


def _utc_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _ensure_upload_root() -> Path:
    root = Path(get_settings().upload_dir).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def _get_or_create_state(
    db: Session, *, worker_id: str, organisation_id: str, template_item_id: str
) -> ChecklistItemState:
    st = db.scalar(
        select(ChecklistItemState).where(
            ChecklistItemState.worker_id == worker_id,
            ChecklistItemState.template_item_id == template_item_id,
        )
    )
    if st:
        return st
    st = ChecklistItemState(
        worker_id=worker_id,
        organisation_id=organisation_id,
        template_item_id=template_item_id,
        status=ItemStatus.not_started.value,
    )
    db.add(st)
    db.commit()
    db.refresh(st)
    return st


@router.get("/organisations/{organisation_id}/checklist-template", response_model=list[ChecklistTemplateItemOut])
def get_checklist_template(
    organisation_id: str,
    db: Session = Depends(get_db),
    user: TokenUser = Depends(get_current_user),
):
    require_template_view(user, organisation_id)
    rows = db.scalars(
        select(ChecklistTemplateItem)
        .where(ChecklistTemplateItem.organisation_id == organisation_id)
        .order_by(ChecklistTemplateItem.sort_order, ChecklistTemplateItem.id)
    ).all()
    return [
        ChecklistTemplateItemOut(
            id=r.id, sort_order=r.sort_order, description=r.description, category=r.category
        )
        for r in rows
    ]


@router.put("/organisations/{organisation_id}/checklist-template", response_model=list[ChecklistTemplateItemOut])
def put_checklist_template(
    organisation_id: str,
    body: ChecklistTemplatePut,
    db: Session = Depends(get_db),
    user: TokenUser = Depends(get_current_user),
):
    require_template_put(user, organisation_id)

    existing = db.scalars(
        select(ChecklistTemplateItem).where(ChecklistTemplateItem.organisation_id == organisation_id)
    ).all()

    # Remove uploaded files for documents we are about to cascade-delete
    for ti in existing:
        db.refresh(ti, ["states"])
        for st in ti.states:
            db.refresh(st, ["documents"])
            for doc in st.documents:
                try:
                    Path(doc.storage_path).unlink(missing_ok=True)
                except OSError:
                    pass
        db.delete(ti)
    db.commit()

    out: list[ChecklistTemplateItem] = []
    for row in sorted(body.items, key=lambda x: (x.sort_order, x.description)):
        ti = ChecklistTemplateItem(
            organisation_id=organisation_id,
            sort_order=row.sort_order,
            description=row.description.strip(),
            category=(row.category.strip() if row.category else None) or None,
        )
        db.add(ti)
        out.append(ti)
    db.commit()
    for ti in out:
        db.refresh(ti)
    return [
        ChecklistTemplateItemOut(
            id=r.id, sort_order=r.sort_order, description=r.description, category=r.category
        )
        for r in out
    ]


@router.get("/workers/{worker_id}/checklist", response_model=list[ChecklistItemOut])
def get_worker_checklist(
    worker_id: str,
    db: Session = Depends(get_db),
    user: TokenUser = Depends(get_current_user),
    organisation_id: str | None = Query(None, description="Required for platform_owner"),
):
    org_id = effective_organisation_id(user, organisation_id)

    template_items = db.scalars(
        select(ChecklistTemplateItem)
        .where(ChecklistTemplateItem.organisation_id == org_id)
        .order_by(ChecklistTemplateItem.sort_order, ChecklistTemplateItem.id)
    ).all()

    if not template_items:
        return []

    result: list[ChecklistItemOut] = []
    for idx, ti in enumerate(template_items, start=1):
        st = _get_or_create_state(db, worker_id=worker_id, organisation_id=org_id, template_item_id=ti.id)
        db.refresh(st, ["documents"])
        docs = [
            DocFileOut(
                id=d.id,
                file_name=d.file_name,
                status=d.status,
                upload_date=_utc_iso(d.upload_date),
            )
            for d in st.documents
        ]
        result.append(
            ChecklistItemOut(
                id=ti.id,
                item_number=idx,
                description=ti.description,
                category=ti.category,
                status=st.status,
                rejection_reason=st.rejection_reason,
                documents=docs,
            )
        )
    return result


def _state_for_worker_item(
    db: Session, worker_id: str, organisation_id: str, item_id: str
) -> tuple[ChecklistTemplateItem, ChecklistItemState]:
    ti = db.get(ChecklistTemplateItem, item_id)
    if not ti or ti.organisation_id != organisation_id:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    st = _get_or_create_state(db, worker_id=worker_id, organisation_id=organisation_id, template_item_id=item_id)
    return ti, st


@router.post("/workers/{worker_id}/checklist/{item_id}/upload")
async def upload_checklist_document(
    worker_id: str,
    item_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: TokenUser = Depends(get_current_user),
    organisation_id: str | None = Query(None),
):
    org_id = effective_organisation_id(user, organisation_id)
    _, st = _state_for_worker_item(db, worker_id, org_id, item_id)

    raw_name = file.filename or "upload"
    safe_name = Path(raw_name).name
    if not safe_name or safe_name in (".", ".."):
        safe_name = "upload.bin"

    doc_id = str(uuid.uuid4())
    dest_dir = _ensure_upload_root() / org_id / worker_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    path = dest_dir / f"{doc_id}_{safe_name}"

    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")
    path.write_bytes(contents)

    doc = ChecklistDocument(
        id=doc_id,
        state_id=st.id,
        file_name=safe_name,
        storage_path=str(path),
        status="uploaded",
    )
    db.add(doc)
    if st.status == ItemStatus.rejected.value:
        st.status = ItemStatus.uploaded.value
        st.rejection_reason = None
    elif st.status == ItemStatus.not_started.value:
        st.status = ItemStatus.uploaded.value
    db.commit()
    return {"id": doc.id, "file_name": doc.file_name}


@router.post("/workers/{worker_id}/checklist/{item_id}/verify")
def verify_checklist_item(
    worker_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    user: TokenUser = Depends(get_current_user),
    organisation_id: str | None = Query(None),
):
    _require_checklist_review_role(user)
    org_id = effective_organisation_id(user, organisation_id)
    _, st = _state_for_worker_item(db, worker_id, org_id, item_id)
    db.refresh(st, ["documents"])
    if not st.documents:
        raise HTTPException(status_code=400, detail="No document to verify")
    st.status = ItemStatus.verified.value
    st.rejection_reason = None
    db.commit()
    return {"ok": True}


@router.post("/workers/{worker_id}/checklist/{item_id}/reject")
def reject_checklist_item(
    worker_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    user: TokenUser = Depends(get_current_user),
    organisation_id: str | None = Query(None),
    reason: str = Form("Please re-upload with corrections"),
):
    _require_checklist_review_role(user)
    org_id = effective_organisation_id(user, organisation_id)
    _, st = _state_for_worker_item(db, worker_id, org_id, item_id)
    db.refresh(st, ["documents"])
    if not st.documents:
        raise HTTPException(status_code=400, detail="No document to reject")
    st.status = ItemStatus.rejected.value
    st.rejection_reason = reason
    db.commit()
    return {"ok": True}


@router.post("/workers/{worker_id}/checklist/{item_id}/mark-na")
def mark_checklist_na(
    worker_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    user: TokenUser = Depends(get_current_user),
    organisation_id: str | None = Query(None),
):
    _require_checklist_review_role(user)
    org_id = effective_organisation_id(user, organisation_id)
    _, st = _state_for_worker_item(db, worker_id, org_id, item_id)
    st.status = ItemStatus.not_applicable.value
    st.rejection_reason = None
    db.commit()
    return {"ok": True}


@router.get("/workers/{worker_id}/checklist/{item_id}/download/{doc_id}")
def download_checklist_document(
    worker_id: str,
    item_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    user: TokenUser = Depends(get_current_user),
    organisation_id: str | None = Query(None),
):
    org_id = effective_organisation_id(user, organisation_id)
    _, st = _state_for_worker_item(db, worker_id, org_id, item_id)
    doc = db.get(ChecklistDocument, doc_id)
    if not doc or doc.state_id != st.id:
        raise HTTPException(status_code=404, detail="Document not found")
    path = Path(doc.storage_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File missing on server")
    return FileResponse(path, filename=doc.file_name, media_type="application/octet-stream")
