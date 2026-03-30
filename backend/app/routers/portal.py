"""Employee Portal endpoints — accessible by EMPLOYEE role."""

from datetime import date, datetime, timezone
import hashlib
import base64
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import get_settings
from app.routers.deps import get_current_user
from app.models.models import (
    User, Worker, UserRole, Document, DocumentStatus, ContactDetailChange,
    ContactChangeStatus, WorkerRequest, Notification, AuditLog,
    DocumentChecklist, ChecklistStatus,
)
from app.schemas.schemas import (
    WorkerDetailOut,
    WorkerOut,
    DocumentOut,
    ContactChangeRequest,
    ContactChangeOut,
    PortalMeUpdate,
    WorkerRequestOut,
    NotificationOut,
)
from app.core.profile_photo_storage import (
    read_and_validate_upload,
    store_worker_profile_photo,
    delete_stored_object,
)
from app.routers.documents import create_checklist_for_worker
import boto3

router = APIRouter(prefix="/portal", tags=["employee-portal"])
settings = get_settings()


def _normalise_filename(value: str | None, default_ext: str = ".pdf") -> str:
    raw = (value or "document").strip()
    safe = "".join(ch if ch.isalnum() or ch in ("-", "_", ".") else "_" for ch in raw)
    if "." not in safe:
        safe += default_ext
    return safe


def _s3_enabled() -> bool:
    return settings.STORAGE_PROVIDER == "s3" and bool(settings.S3_BUCKET and settings.AWS_REGION)


def _s3_client():
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


def _build_checklist_s3_key(worker_id: str, item_number: int, file_name: str | None) -> str:
    clean = _normalise_filename(file_name)
    prefix = (settings.S3_PREFIX or "uploads/").strip("/")
    return f"{prefix}/portal/checklist/{worker_id}/item-{item_number}/{clean}"


def _store_file_for_doc(
    doc: Document,
    worker_id: str,
    item_number: int,
    file_name: str | None,
    file_mime: str | None,
    file_bytes: bytes,
):
    """Store file in S3 (preferred) or DB blob fallback."""
    if _s3_enabled():
        key = _build_checklist_s3_key(worker_id, item_number, file_name)
        extra_args = {"ContentType": file_mime or "application/octet-stream"}
        _s3_client().put_object(Bucket=settings.S3_BUCKET, Key=key, Body=file_bytes, **extra_args)
        doc.file_path = key
        doc.file_data = None
    else:
        doc.file_data = file_bytes
        doc.file_path = None


def _load_file_for_doc(doc: Document) -> bytes:
    if doc.file_data:
        return doc.file_data
    if doc.file_path and _s3_enabled():
        obj = _s3_client().get_object(Bucket=settings.S3_BUCKET, Key=doc.file_path)
        return obj["Body"].read()
    raise HTTPException(status_code=404, detail="Document binary not available")


def _get_latest_doc_for_item(db: Session, worker_id: str, item_id: str) -> Document | None:
    return (
        db.query(Document)
        .filter(Document.worker_id == worker_id, Document.checklist_item_id == item_id)
        .order_by(Document.updated_at.desc(), Document.created_at.desc())
        .first()
    )


def _get_employee_worker(current_user: User, db: Session) -> Worker:
    if current_user.role != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Portal is for employees only")
    if not current_user.worker_id:
        raise HTTPException(status_code=404, detail="No worker record linked to this account")

    worker = db.query(Worker).filter(Worker.id == current_user.worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker record not found")
    return worker


# ── My Profile ─────────────────────────────────────────────

def _age_years_from_dob(dob: date | datetime | None) -> int | None:
    if dob is None:
        return None
    d = dob.date() if isinstance(dob, datetime) else dob
    today = date.today()
    return today.year - d.year - ((today.month, today.day) < (d.month, d.day))


def _worker_detail_out(worker: Worker) -> WorkerDetailOut:
    out = WorkerDetailOut.model_validate(worker)
    has_photo = bool(worker.profile_photo_s3_key or worker.profile_photo_data)
    return out.model_copy(
        update={"has_profile_photo": has_photo, "age_years": _age_years_from_dob(worker.date_of_birth)}
    )


PORTAL_SELF_UPDATE_FIELDS = frozenset({
    "first_name",
    "last_name",
    "phone",
    "personal_email",
    "address",
    "postal_code",
    "emergency_contact_name",
    "emergency_contact_phone",
    "next_of_kin_name",
    "next_of_kin_phone",
})


def _rebuild_worker_display_name(worker: Worker) -> None:
    parts: list[str] = []
    for key in ("first_name", "second_name", "last_name"):
        v = getattr(worker, key, None)
        if v is not None and str(v).strip():
            parts.append(str(v).strip())
    if parts:
        worker.name = " ".join(parts)


@router.get("/me", response_model=WorkerDetailOut)
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    worker = _get_employee_worker(current_user, db)
    db.add(AuditLog(
        user_id=current_user.id, user_email=current_user.email, user_role="employee",
        action="VIEW", entity_type="worker", entity_id=worker.id,
        details="Worker viewed their sponsorship profile",
    ))
    db.commit()
    return _worker_detail_out(worker)


@router.patch("/me", response_model=WorkerDetailOut)
def patch_my_profile(
    payload: PortalMeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    worker = _get_employee_worker(current_user, db)
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return _worker_detail_out(worker)
    name_affecting = False
    for key, raw in data.items():
        if key not in PORTAL_SELF_UPDATE_FIELDS:
            continue
        val: str | None = raw
        if isinstance(val, str):
            val = val.strip() or None
        setattr(worker, key, val)
        if key in ("first_name", "last_name"):
            name_affecting = True
    if name_affecting:
        _rebuild_worker_display_name(worker)
    db.add(
        AuditLog(
            user_id=current_user.id,
            user_email=current_user.email,
            user_role="employee",
            action="UPDATE",
            entity_type="worker",
            entity_id=worker.id,
            details="Employee updated their profile details",
        )
    )
    db.commit()
    db.refresh(worker)
    return _worker_detail_out(worker)


@router.post("/me/profile-photo", response_model=WorkerOut)
async def upload_my_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    worker = _get_employee_worker(current_user, db)
    raw, mime = await read_and_validate_upload(file)
    delete_stored_object(worker.profile_photo_s3_key)
    s3_key, blob = store_worker_profile_photo(
        organisation_id=current_user.organisation_id,
        worker_id=worker.id,
        file_bytes=raw,
        mime=mime,
    )
    worker.profile_photo_s3_key = s3_key
    worker.profile_photo_mime = mime
    worker.profile_photo_data = blob
    db.add(
        AuditLog(
            user_id=current_user.id,
            user_email=current_user.email,
            user_role="employee",
            action="UPDATE",
            entity_type="worker",
            entity_id=worker.id,
            details="Employee uploaded their profile photo",
        )
    )
    db.commit()
    db.refresh(worker)
    return worker


@router.delete("/me/profile-photo", response_model=WorkerOut)
def delete_my_profile_photo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    worker = _get_employee_worker(current_user, db)
    delete_stored_object(worker.profile_photo_s3_key)
    worker.profile_photo_s3_key = None
    worker.profile_photo_mime = None
    worker.profile_photo_data = None
    db.add(
        AuditLog(
            user_id=current_user.id,
            user_email=current_user.email,
            user_role="employee",
            action="UPDATE",
            entity_type="worker",
            entity_id=worker.id,
            details="Employee removed their profile photo",
        )
    )
    db.commit()
    db.refresh(worker)
    return worker


# ── My Documents ───────────────────────────────────────────

@router.get("/documents", response_model=list[DocumentOut])
def get_my_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    worker = _get_employee_worker(current_user, db)
    return db.query(Document).filter(Document.worker_id == worker.id).order_by(Document.created_at.desc()).all()


# ── Contact Detail Change Requests ─────────────────────────

@router.get("/contact-changes", response_model=list[ContactChangeOut])
def list_my_contact_changes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    worker = _get_employee_worker(current_user, db)
    return db.query(ContactDetailChange).filter(
        ContactDetailChange.worker_id == worker.id
    ).order_by(ContactDetailChange.created_at.desc()).all()


@router.post("/contact-changes", response_model=ContactChangeOut, status_code=status.HTTP_201_CREATED)
def request_contact_change(
    payload: ContactChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    worker = _get_employee_worker(current_user, db)

    allowed_fields = {"address", "phone", "personal_email", "emergency_contact_name", "emergency_contact_phone"}
    if payload.field_name not in allowed_fields:
        raise HTTPException(status_code=400, detail=f"Cannot change field '{payload.field_name}'")

    old_value = getattr(worker, payload.field_name, None)

    change = ContactDetailChange(
        worker_id=worker.id,
        field_name=payload.field_name,
        old_value=str(old_value) if old_value else None,
        new_value=payload.new_value,
        worker_confirmed=True,
    )
    db.add(change)
    db.add(AuditLog(
        user_id=current_user.id, user_email=current_user.email, user_role="employee",
        action="UPDATE", entity_type="contact_detail_change", entity_id=change.id,
        details=f"Requested change: {payload.field_name}",
        before_value=str(old_value) if old_value else None,
        after_value=payload.new_value,
    ))
    db.commit()
    db.refresh(change)
    return change


# ── My Requests from HR ───────────────────────────────────

@router.get("/requests", response_model=list[WorkerRequestOut])
def list_my_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    worker = _get_employee_worker(current_user, db)
    return db.query(WorkerRequest).filter(
        WorkerRequest.worker_id == worker.id
    ).order_by(WorkerRequest.created_at.desc()).all()


# ── My Notifications ──────────────────────────────────────

@router.get("/notifications", response_model=list[NotificationOut])
def list_my_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    worker = _get_employee_worker(current_user, db)
    return db.query(Notification).filter(
        Notification.worker_id == worker.id
    ).order_by(Notification.created_at.desc()).limit(50).all()


@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    worker = _get_employee_worker(current_user, db)
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.worker_id == worker.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


# ── My Document Checklist ────────────────────────────────

@router.get("/checklist")
def get_my_checklist(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    worker = _get_employee_worker(current_user, db)

    items = (
        db.query(DocumentChecklist)
        .filter(DocumentChecklist.worker_id == worker.id)
        .order_by(DocumentChecklist.item_number)
        .all()
    )
    if not items:
        items = create_checklist_for_worker(db, worker.id)
        db.commit()

    result = []
    for item in items:
        docs = (
            db.query(Document)
            .filter(Document.checklist_item_id == item.id)
            .order_by(Document.created_at.desc())
            .limit(1)
            .all()
        )
        result.append({
            "id": item.id,
            "item_number": item.item_number,
            "description": item.description,
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
                    "notes": d.notes,
                }
                for d in docs
            ],
        })

    return result


@router.post("/checklist/{item_id}/upload")
async def portal_upload_document(
    item_id: str,
    file: UploadFile = File(...),
    notes: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    worker = _get_employee_worker(current_user, db)

    checklist_item = db.query(DocumentChecklist).filter(
        DocumentChecklist.id == item_id,
        DocumentChecklist.worker_id == worker.id,
    ).first()
    if not checklist_item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    file_bytes = await file.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # Re-upload policy: keep a single current record per checklist item.
    # In S3 mode, the same object key is overwritten and previous versions are preserved by bucket versioning.
    existing = (
        db.query(Document)
        .filter(Document.worker_id == worker.id, Document.checklist_item_id == item_id)
        .order_by(Document.updated_at.desc())
        .first()
    )

    if existing:
        doc = existing
        doc.version = (doc.version or 1) + 1
    else:
        doc = Document(
            worker_id=worker.id,
            checklist_item_id=item_id,
            doc_type=f"checklist_{checklist_item.item_number}",
            status=DocumentStatus.PENDING,
            is_mandatory=True,
            version=1,
        )
        db.add(doc)

    doc.file_name = file.filename
    doc.file_mime = file.content_type
    doc.file_hash = file_hash
    doc.upload_date = datetime.now(timezone.utc)
    doc.uploaded_by = current_user.full_name
    doc.uploaded_by_role = "employee"
    doc.notes = notes
    doc.verified_by = None
    doc.verified_date = None
    doc.rejection_reason = None

    _store_file_for_doc(
        doc=doc,
        worker_id=worker.id,
        item_number=checklist_item.item_number,
        file_name=file.filename,
        file_mime=file.content_type,
        file_bytes=file_bytes,
    )

    checklist_item.status = ChecklistStatus.UPLOADED
    checklist_item.rejection_reason = None

    db.commit()
    db.refresh(doc)

    return {"id": doc.id, "file_name": doc.file_name, "status": checklist_item.status.value, "version": doc.version}


@router.get("/checklist/{item_id}/view/{doc_id}")
def portal_view_document(
    item_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    worker = _get_employee_worker(current_user, db)

    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.checklist_item_id == item_id,
        Document.worker_id == worker.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    latest = _get_latest_doc_for_item(db, worker.id, item_id)
    if not latest or latest.id != doc.id:
        raise HTTPException(
            status_code=403,
            detail="Only the most recently uploaded document can be viewed in employee portal",
        )

    raw_bytes = _load_file_for_doc(doc)
    if settings.PORTAL_VIEW_MODE == "wrapped":
        # Optional hardening mode: return an envelope instead of direct file stream.
        # Frontend reconstructs blob for in-app viewing only.
        payload = base64.b64encode(raw_bytes).decode("utf-8")
        return {
            "mode": "wrapped",
            "mime": doc.file_mime or "application/octet-stream",
            "name": doc.file_name or "document",
            "payload_b64": payload,
            "watermark": f"{current_user.email} | {datetime.now(timezone.utc).isoformat()}",
        }

    return Response(
        content=raw_bytes,
        media_type=doc.file_mime or "application/pdf",
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "no-store, private",
            "Pragma": "no-cache",
            "X-Frame-Options": "SAMEORIGIN",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/checklist/{item_id}/download/{doc_id}")
def portal_download_document(
    item_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if settings.PORTAL_DISABLE_DOWNLOAD:
        _get_employee_worker(current_user, db)  # keep same auth check and audit path
        raise HTTPException(status_code=403, detail="Download is disabled for employee portal documents")
    return portal_view_document(item_id=item_id, doc_id=doc_id, db=db, current_user=current_user)
