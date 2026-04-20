import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.routers.deps import get_current_user, require_staff
from app.models.models import (
    User,
    Worker,
    UserRole,
    Organisation,
    OrganisationChecklistTemplateItem,
    Document,
    DocumentStatus,
    DocumentChecklist,
    ChecklistStatus,
)

router = APIRouter(prefix="/workers/{worker_id}/checklist", tags=["documents"])

# ──────────────────────────────────────────────────────────
# Default checklist when org has not saved a custom template (3 rows — same as Organisation UI defaults)
# ──────────────────────────────────────────────────────────

DEFAULT_FALLBACK_CHECKLIST: list[dict] = [
    {
        "n": 1,
        "desc": "Right to work evidence (share code, acceptable online check, or eligible visa)",
        "cat": "Right to work",
    },
    {
        "n": 2,
        "desc": "Passport or national ID — photo page",
        "cat": "Identity",
    },
    {
        "n": 3,
        "desc": "Current visa or BRP (if applicable)",
        "cat": "Immigration",
    },
]


def _detach_documents_for_checklist_row(
    db: Session,
    chk: DocumentChecklist,
    legacy_org_template_revision: int,
) -> None:
    """Keep file blobs; unlink from checklist row and snapshot line metadata for audit / discovery."""
    now = datetime.now(timezone.utc)
    for d in db.query(Document).filter(Document.checklist_item_id == chk.id).all():
        d.checklist_item_id = None
        d.legacy_org_template_revision = legacy_org_template_revision
        d.legacy_checklist_item_number = chk.item_number
        d.legacy_checklist_description = chk.description
        d.legacy_checklist_category = chk.category
        d.superseded_at = now


def _prune_worker_checklist_to_allowed(
    db: Session,
    worker_id: str,
    allowed_nums: set[int],
    legacy_org_template_revision: int,
) -> None:
    """Remove checklist rows not in the active definition; retain uploads as superseded documents."""
    rows = (
        db.query(DocumentChecklist)
        .filter(DocumentChecklist.worker_id == worker_id)
        .all()
    )
    for row in rows:
        if row.item_number not in allowed_nums:
            _detach_documents_for_checklist_row(db, row, legacy_org_template_revision)
            db.delete(row)
    db.flush()


def _next_worker_checklist_item_number(db: Session, worker_id: str) -> int:
    n = (
        db.query(func.max(DocumentChecklist.item_number))
        .filter(DocumentChecklist.worker_id == worker_id)
        .scalar()
    )
    return int(n or 0) + 1


def _purge_stale_fallback_rows_if_template_exists(db: Session, organisation_id: str) -> None:
    """Remove unused default (no template_item_id) rows once an org template exists — only when still empty."""
    has_template = (
        db.query(OrganisationChecklistTemplateItem.id)
        .filter(OrganisationChecklistTemplateItem.organisation_id == organisation_id)
        .first()
    )
    if not has_template:
        return
    worker_ids = [w.id for w in db.query(Worker).filter(Worker.organisation_id == organisation_id).all()]
    for wid in worker_ids:
        for row in (
            db.query(DocumentChecklist)
            .filter(
                DocumentChecklist.worker_id == wid,
                DocumentChecklist.template_item_id.is_(None),
            )
            .all()
        ):
            if row.status != ChecklistStatus.NOT_STARTED:
                continue
            has_doc = (
                db.query(Document.id)
                .filter(Document.checklist_item_id == row.id)
                .first()
            )
            if has_doc:
                continue
            db.delete(row)
    db.flush()


def provision_missing_worker_checklist_rows(db: Session, organisation_id: str) -> None:
    """Append new checklist rows for active template lines; never resets existing worker progress."""
    _purge_stale_fallback_rows_if_template_exists(db, organisation_id)
    active_templates = (
        db.query(OrganisationChecklistTemplateItem)
        .filter(
            OrganisationChecklistTemplateItem.organisation_id == organisation_id,
            OrganisationChecklistTemplateItem.is_active.is_(True),
        )
        .order_by(
            OrganisationChecklistTemplateItem.sort_order.asc(),
            OrganisationChecklistTemplateItem.id.asc(),
        )
        .all()
    )
    if not active_templates:
        return
    workers = db.query(Worker).filter(Worker.organisation_id == organisation_id).all()
    for w in workers:
        # Allocate item_numbers in memory: MAX() does not see unflushed rows, so calling
        # _next_worker_checklist_item_number in a tight loop would reuse the same number → 500 (unique violation).
        next_num = _next_worker_checklist_item_number(db, w.id)
        for tmpl in active_templates:
            exists = (
                db.query(DocumentChecklist)
                .filter(
                    DocumentChecklist.worker_id == w.id,
                    DocumentChecklist.template_item_id == tmpl.id,
                )
                .first()
            )
            if exists:
                continue
            db.add(
                DocumentChecklist(
                    worker_id=w.id,
                    template_item_id=tmpl.id,
                    item_number=next_num,
                    description=tmpl.description,
                    category=tmpl.category,
                    status=ChecklistStatus.NOT_STARTED,
                )
            )
            next_num += 1
    db.flush()


def _visible_checklist_rows(db: Session, worker_id: str, organisation_id: str) -> list[DocumentChecklist]:
    """Rows shown on the worker Checklist tab."""
    template_count = (
        db.query(OrganisationChecklistTemplateItem)
        .filter(OrganisationChecklistTemplateItem.organisation_id == organisation_id)
        .count()
    )
    rows = (
        db.query(DocumentChecklist)
        .filter(DocumentChecklist.worker_id == worker_id)
        .order_by(DocumentChecklist.item_number.asc(), DocumentChecklist.id.asc())
        .all()
    )
    if template_count == 0:
        return [r for r in rows if r.template_item_id is None]

    active_ids = {
        t.id
        for t in db.query(OrganisationChecklistTemplateItem)
        .filter(
            OrganisationChecklistTemplateItem.organisation_id == organisation_id,
            OrganisationChecklistTemplateItem.is_active.is_(True),
        )
        .all()
    }
    visible = [r for r in rows if r.template_item_id and r.template_item_id in active_ids]
    tmpl_sort = {
        t.id: (t.sort_order, t.id)
        for t in db.query(OrganisationChecklistTemplateItem)
        .filter(OrganisationChecklistTemplateItem.organisation_id == organisation_id)
        .all()
    }

    def sort_key(r: DocumentChecklist) -> tuple:
        if r.template_item_id and r.template_item_id in tmpl_sort:
            return (tmpl_sort[r.template_item_id][0], tmpl_sort[r.template_item_id][1])
        return (10**9, r.id)

    visible.sort(key=sort_key)
    return visible


def create_checklist_for_worker(db: Session, worker_id: str) -> list[DocumentChecklist]:
    """Default 3 rows when no org template; with a saved template, append rows per active template item (no wipe)."""
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise ValueError("Worker not found")
    org = db.query(Organisation).filter(Organisation.id == worker.organisation_id).first()
    if not org:
        raise ValueError("Organisation not found")

    template_rows = (
        db.query(OrganisationChecklistTemplateItem)
        .filter(OrganisationChecklistTemplateItem.organisation_id == org.id)
        .order_by(
            OrganisationChecklistTemplateItem.sort_order.asc(),
            OrganisationChecklistTemplateItem.id.asc(),
        )
        .all()
    )

    wr = int(worker.checklist_sync_revision or 0)
    orv = int(org.checklist_template_revision or 0)
    if wr != orv:
        worker.checklist_sync_revision = orv
        db.flush()

    if not template_rows:
        definitions = [(ci["n"], ci["desc"], ci.get("cat"), None) for ci in DEFAULT_FALLBACK_CHECKLIST]
        allowed_nums = {d[0] for d in definitions}
        _prune_worker_checklist_to_allowed(db, worker_id, allowed_nums, legacy_org_template_revision=orv)
        existing = {
            row.item_number: row
            for row in db.query(DocumentChecklist).filter(DocumentChecklist.worker_id == worker_id).all()
        }
        for item_number, desc, cat, _tmpl_id in definitions:
            if item_number not in existing:
                db.add(
                    DocumentChecklist(
                        worker_id=worker_id,
                        item_number=item_number,
                        description=desc,
                        category=cat,
                        template_item_id=None,
                    )
                )
            else:
                row = existing[item_number]
                if row.description != desc or row.category != cat:
                    row.description = desc
                    row.category = cat
        db.flush()
        return _visible_checklist_rows(db, worker_id, org.id)

    active_templates = [t for t in template_rows if t.is_active]
    next_num = _next_worker_checklist_item_number(db, worker_id)
    for tmpl in active_templates:
        existing_row = (
            db.query(DocumentChecklist)
            .filter(
                DocumentChecklist.worker_id == worker_id,
                DocumentChecklist.template_item_id == tmpl.id,
            )
            .first()
        )
        if existing_row:
            continue
        db.add(
            DocumentChecklist(
                worker_id=worker_id,
                template_item_id=tmpl.id,
                item_number=next_num,
                description=tmpl.description,
                category=tmpl.category,
                status=ChecklistStatus.NOT_STARTED,
            )
        )
        next_num += 1
    db.flush()
    return _visible_checklist_rows(db, worker_id, org.id)


# ──────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────

def resolve_worker_for_checklist(
    worker_id: str,
    db: Session,
    user: User,
    organisation_id: str | None,
) -> Worker:
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    if user.role == UserRole.EMPLOYEE:
        if user.worker_id != worker_id:
            raise HTTPException(status_code=403, detail="You can only access your own records")
        return worker

    if user.role == UserRole.PLATFORM_OWNER:
        if not organisation_id or organisation_id != worker.organisation_id:
            raise HTTPException(
                status_code=400,
                detail="organisation_id query parameter must match this worker's organisation",
            )
        return worker

    if user.organisation_id != worker.organisation_id:
        raise HTTPException(status_code=404, detail="Worker not found")

    if organisation_id and organisation_id != worker.organisation_id:
        raise HTTPException(status_code=400, detail="organisation_id does not match this worker")

    return worker


def _serialize_superseded_documents(db: Session, worker_id: str) -> list[dict]:
    rows = (
        db.query(Document)
        .filter(
            Document.worker_id == worker_id,
            Document.superseded_at.isnot(None),
        )
        .order_by(Document.superseded_at.desc())
        .all()
    )
    out: list[dict] = []
    for d in rows:
        out.append(
            {
                "id": d.id,
                "file_name": d.file_name,
                "file_mime": d.file_mime,
                "status": d.status.value,
                "upload_date": d.upload_date.isoformat() if d.upload_date else None,
                "uploaded_by": d.uploaded_by,
                "verified_by": d.verified_by,
                "verified_date": d.verified_date.isoformat() if d.verified_date else None,
                "legacy_org_template_revision": d.legacy_org_template_revision,
                "legacy_checklist_item_number": d.legacy_checklist_item_number,
                "legacy_checklist_description": d.legacy_checklist_description,
                "legacy_checklist_category": d.legacy_checklist_category,
                "superseded_at": d.superseded_at.isoformat() if d.superseded_at else None,
            }
        )
    return out


# ──────────────────────────────────────────────────────────
# GET  /workers/{worker_id}/checklist
# ──────────────────────────────────────────────────────────

@router.get("")
def list_checklist(
    worker_id: str,
    organisation_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resolve_worker_for_checklist(worker_id, db, current_user, organisation_id)

    items = create_checklist_for_worker(db, worker_id)
    if list(db.new) or list(db.dirty):
        db.commit()

    result = []
    for item in items:
        docs = (
            db.query(Document)
            .filter(Document.checklist_item_id == item.id)
            .order_by(Document.created_at.desc())
            .all()
        )
        result.append({
            "id": item.id,
            "item_number": item.item_number,
            "description": item.description,
            "category": item.category,
            "status": item.status.value,
            "notes": item.notes,
            "verified_by": item.verified_by,
            "verified_at": item.verified_at.isoformat() if item.verified_at else None,
            "rejection_reason": item.rejection_reason,
            "documents": [
                {
                    "id": d.id,
                    "file_name": d.file_name,
                    "file_mime": d.file_mime,
                    "status": d.status.value,
                    "uploaded_by": d.uploaded_by,
                    "uploaded_by_role": d.uploaded_by_role,
                    "upload_date": d.upload_date.isoformat() if d.upload_date else None,
                    "verified_by": d.verified_by,
                    "verified_date": d.verified_date.isoformat() if d.verified_date else None,
                    "rejection_reason": d.rejection_reason,
                    "notes": d.notes,
                }
                for d in docs
            ],
        })

    return {
        "items": result,
        "superseded_documents": _serialize_superseded_documents(db, worker_id),
    }


# ──────────────────────────────────────────────────────────
# GET /workers/{worker_id}/checklist/retained-document/{doc_id}/download
# ──────────────────────────────────────────────────────────


@router.get("/retained-document/{doc_id}/download")
def download_retained_document(
    worker_id: str,
    doc_id: str,
    organisation_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resolve_worker_for_checklist(worker_id, db, current_user, organisation_id)
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.worker_id == worker_id,
        Document.superseded_at.isnot(None),
    ).first()
    if not doc or not doc.file_data:
        raise HTTPException(status_code=404, detail="Document not found")
    return Response(
        content=doc.file_data,
        media_type=doc.file_mime or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{doc.file_name}"'},
    )


# ──────────────────────────────────────────────────────────
# DELETE /workers/{worker_id}/checklist/retained-document/{doc_id}
# ──────────────────────────────────────────────────────────


@router.delete("/retained-document/{doc_id}")
def delete_retained_document(
    worker_id: str,
    doc_id: str,
    organisation_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    resolve_worker_for_checklist(worker_id, db, current_user, organisation_id)
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.worker_id == worker_id,
        Document.superseded_at.isnot(None),
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return {"status": "deleted", "id": doc_id}


# ──────────────────────────────────────────────────────────
# POST  /workers/{worker_id}/checklist/{item_id}/upload
# ──────────────────────────────────────────────────────────

@router.post("/{item_id}/upload")
async def upload_document(
    worker_id: str,
    item_id: str,
    file: UploadFile = File(...),
    notes: str = Form(None),
    organisation_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resolve_worker_for_checklist(worker_id, db, current_user, organisation_id)

    checklist_item = db.query(DocumentChecklist).filter(
        DocumentChecklist.id == item_id,
        DocumentChecklist.worker_id == worker_id,
    ).first()
    if not checklist_item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    file_bytes = await file.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    doc = Document(
        worker_id=worker_id,
        checklist_item_id=item_id,
        doc_type=f"checklist_{checklist_item.item_number}",
        status=DocumentStatus.PENDING,
        is_mandatory=True,
        file_name=file.filename,
        file_data=file_bytes,
        file_mime=file.content_type,
        file_hash=file_hash,
        upload_date=datetime.now(timezone.utc),
        uploaded_by=current_user.full_name,
        uploaded_by_role="employee" if current_user.role == UserRole.EMPLOYEE else "hr",
        notes=notes,
    )
    db.add(doc)

    checklist_item.status = ChecklistStatus.UPLOADED
    checklist_item.rejection_reason = None

    db.commit()
    db.refresh(doc)

    return {
        "id": doc.id,
        "file_name": doc.file_name,
        "status": checklist_item.status.value,
        "message": "Document uploaded successfully",
    }


# ──────────────────────────────────────────────────────────
# GET  /workers/{worker_id}/checklist/{item_id}/download/{doc_id}
# ──────────────────────────────────────────────────────────

@router.get("/{item_id}/download/{doc_id}")
def download_document(
    worker_id: str,
    item_id: str,
    doc_id: str,
    organisation_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resolve_worker_for_checklist(worker_id, db, current_user, organisation_id)

    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.checklist_item_id == item_id,
        Document.worker_id == worker_id,
    ).first()
    if not doc or not doc.file_data:
        raise HTTPException(status_code=404, detail="Document not found")

    return Response(
        content=doc.file_data,
        media_type=doc.file_mime or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{doc.file_name}"'},
    )


# ──────────────────────────────────────────────────────────
# POST  /workers/{worker_id}/checklist/{item_id}/verify
# ──────────────────────────────────────────────────────────

@router.post("/{item_id}/verify")
def verify_checklist_item(
    worker_id: str,
    item_id: str,
    organisation_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    resolve_worker_for_checklist(worker_id, db, current_user, organisation_id)

    checklist_item = db.query(DocumentChecklist).filter(
        DocumentChecklist.id == item_id,
        DocumentChecklist.worker_id == worker_id,
    ).first()
    if not checklist_item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    checklist_item.status = ChecklistStatus.VERIFIED
    checklist_item.verified_by = current_user.full_name
    checklist_item.verified_at = datetime.now(timezone.utc)
    checklist_item.rejection_reason = None

    docs = db.query(Document).filter(Document.checklist_item_id == item_id).all()
    for d in docs:
        d.status = DocumentStatus.VERIFIED
        d.verified_by = current_user.full_name
        d.verified_date = datetime.now(timezone.utc)

    db.commit()

    return {"status": "verified", "message": "Item verified successfully"}


# ──────────────────────────────────────────────────────────
# POST  /workers/{worker_id}/checklist/{item_id}/reject
# ──────────────────────────────────────────────────────────

@router.post("/{item_id}/reject")
def reject_checklist_item(
    worker_id: str,
    item_id: str,
    reason: str = Form(""),
    organisation_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    resolve_worker_for_checklist(worker_id, db, current_user, organisation_id)

    checklist_item = db.query(DocumentChecklist).filter(
        DocumentChecklist.id == item_id,
        DocumentChecklist.worker_id == worker_id,
    ).first()
    if not checklist_item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    checklist_item.status = ChecklistStatus.REJECTED
    checklist_item.rejection_reason = reason or "Rejected by HR"
    checklist_item.verified_by = None
    checklist_item.verified_at = None

    docs = db.query(Document).filter(Document.checklist_item_id == item_id).all()
    for d in docs:
        d.status = DocumentStatus.REJECTED
        d.rejection_reason = reason or "Rejected by HR"

    db.commit()

    return {"status": "rejected", "message": "Item rejected"}


# ──────────────────────────────────────────────────────────
# POST  /workers/{worker_id}/checklist/{item_id}/mark-na
# ──────────────────────────────────────────────────────────

@router.post("/{item_id}/mark-na")
def mark_not_applicable(
    worker_id: str,
    item_id: str,
    organisation_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    resolve_worker_for_checklist(worker_id, db, current_user, organisation_id)

    checklist_item = db.query(DocumentChecklist).filter(
        DocumentChecklist.id == item_id,
        DocumentChecklist.worker_id == worker_id,
    ).first()
    if not checklist_item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    checklist_item.status = ChecklistStatus.NOT_APPLICABLE
    db.commit()

    return {"status": "not_applicable", "message": "Marked as not applicable"}


# ──────────────────────────────────────────────────────────
# POST  /workers/{worker_id}/checklist/{item_id}/notes
# ──────────────────────────────────────────────────────────

@router.post("/{item_id}/notes")
def update_notes(
    worker_id: str,
    item_id: str,
    notes: str = Form(""),
    organisation_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resolve_worker_for_checklist(worker_id, db, current_user, organisation_id)

    checklist_item = db.query(DocumentChecklist).filter(
        DocumentChecklist.id == item_id,
        DocumentChecklist.worker_id == worker_id,
    ).first()
    if not checklist_item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    checklist_item.notes = notes
    db.commit()

    return {"message": "Notes updated"}
