"""
Seed checklist + documents data for demo workers.
Run from backend dir: python seed_checklist_demo.py
"""
from __future__ import annotations

import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import get_settings
from app.database import SessionLocal

MOCK_LICENCE = "DEMO-LICENCE-001"

CHECKLIST_ITEMS: list[tuple[int, str]] = [
    (1, "Passport copy (photo page)"),
    (2, "Right to Work evidence"),
    (3, "BRP / eVisa evidence"),
    (4, "Signed employment contract"),
    (5, "Proof of current UK address"),
    (6, "Emergency contact details confirmation"),
]


def _get_or_create_checklist_row(db, worker_id: str, item_number: int, description: str) -> tuple[str, bool]:
    existing = db.execute(
        text(
            """
            SELECT id
            FROM document_checklist
            WHERE worker_id = :worker_id AND item_number = :item_number
            LIMIT 1
            """
        ),
        {"worker_id": worker_id, "item_number": item_number},
    ).first()
    if existing:
        return existing.id, False

    checklist_id = str(uuid.uuid4())
    db.execute(
        text(
            """
            INSERT INTO document_checklist
            (id, worker_id, item_number, description, status, notes, verified_by, verified_at, rejection_reason, created_at, updated_at)
            VALUES (:id, :worker_id, :item_number, :description, :status, :notes, :verified_by, :verified_at, :rejection_reason, :created_at, :updated_at)
            """
        ),
        {
            "id": checklist_id,
            "worker_id": worker_id,
            "item_number": item_number,
            "description": description,
            "status": "NOT_STARTED",
            "notes": None,
            "verified_by": None,
            "verified_at": None,
            "rejection_reason": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
    )
    return checklist_id, True


def main():
    settings = get_settings()
    upload_root = Path(settings.upload_dir).resolve()
    upload_root.mkdir(parents=True, exist_ok=True)

    db = SessionLocal()
    try:
        org = db.execute(
            text("SELECT id, name FROM organisations WHERE licence_number = :lic LIMIT 1"),
            {"lic": MOCK_LICENCE},
        ).first()
        if not org:
            print("ERROR: Demo organisation not found. Run seed_mock_users.py first.")
            return

        org_id = org.id
        print(f"Seeding checklist + document data for: {org.name}")

        workers = db.execute(
            text(
                """
                SELECT id, name, email
                FROM workers
                WHERE organisation_id = :org_id
                ORDER BY created_at ASC
                LIMIT 8
                """
            ),
            {"org_id": org_id},
        ).fetchall()
        if not workers:
            print("ERROR: No workers found. Run seed_workers.py first.")
            return

        checklist_rows_created = 0
        docs_created = 0
        now = datetime.now(timezone.utc)

        for worker_idx, worker in enumerate(workers):
            for item_idx, (item_number, description) in enumerate(CHECKLIST_ITEMS):
                status_cycle = worker_idx % 5
                if status_cycle == 0:
                    checklist_status = "VERIFIED"
                elif status_cycle == 1:
                    checklist_status = "UPLOADED"
                elif status_cycle == 2:
                    checklist_status = "REJECTED"
                elif status_cycle == 3 and item_idx % 2 == 0:
                    checklist_status = "NOT_APPLICABLE"
                else:
                    checklist_status = "NOT_STARTED"

                checklist_id, created = _get_or_create_checklist_row(db, worker.id, item_number, description)
                if created:
                    checklist_rows_created += 1
                db.execute(
                    text(
                        """
                        UPDATE document_checklist
                        SET status = :status,
                            rejection_reason = :rejection_reason,
                            verified_by = :verified_by,
                            verified_at = :verified_at,
                            updated_at = :updated_at
                        WHERE id = :id
                        """
                    ),
                    {
                        "id": checklist_id,
                        "status": checklist_status,
                        "rejection_reason": (
                            "Please re-upload with clearer scan."
                            if checklist_status == "REJECTED"
                            else None
                        ),
                        "verified_by": "vimal@vimal.com" if checklist_status == "VERIFIED" else None,
                        "verified_at": now if checklist_status == "VERIFIED" else None,
                        "updated_at": now,
                    },
                )

                if checklist_status in {"UPLOADED", "VERIFIED", "REJECTED"}:
                    existing_doc = db.execute(
                        text(
                            """
                            SELECT id
                            FROM documents
                            WHERE worker_id = :worker_id AND checklist_item_id = :checklist_item_id
                            LIMIT 1
                            """
                        ),
                        {"worker_id": worker.id, "checklist_item_id": checklist_id},
                    ).first()
                    if existing_doc:
                        continue

                    worker_dir = upload_root / org_id / worker.id
                    worker_dir.mkdir(parents=True, exist_ok=True)
                    file_name = f"{item_number:02d}_{description.lower().replace(' ', '_').replace('/', '-')}.txt"
                    storage_path = worker_dir / f"{uuid.uuid4()}_{file_name}"
                    storage_path.write_text(
                        f"Demo checklist file\nworker={worker.name}\nemail={worker.email}\nitem={description}\n",
                        encoding="utf-8",
                    )

                    db.execute(
                        text(
                            """
                            INSERT INTO documents
                            (id, worker_id, doc_type, status, is_mandatory, file_path, file_name, file_hash, expiry_date,
                             upload_date, uploaded_by, uploaded_by_role, verified_by, verified_date, rejection_reason,
                             version, notes, created_at, updated_at, file_data, file_mime, checklist_item_id)
                            VALUES
                            (:id, :worker_id, :doc_type, :status, :is_mandatory, :file_path, :file_name, :file_hash, :expiry_date,
                             :upload_date, :uploaded_by, :uploaded_by_role, :verified_by, :verified_date, :rejection_reason,
                             :version, :notes, :created_at, :updated_at, :file_data, :file_mime, :checklist_item_id)
                            """
                        ),
                        {
                            "id": str(uuid.uuid4()),
                            "worker_id": worker.id,
                            "doc_type": f"checklist_item_{item_number}",
                            "file_name": file_name,
                            "file_path": str(storage_path),
                            "status": "VERIFIED" if checklist_status == "VERIFIED" else (
                                "REJECTED" if checklist_status == "REJECTED" else "PENDING"
                            ),
                            "is_mandatory": True,
                            "file_hash": None,
                            "expiry_date": None,
                            "upload_date": now,
                            "uploaded_by": "vimal@vimal.com",
                            "uploaded_by_role": "super_admin",
                            "verified_by": "vimal@vimal.com" if checklist_status == "VERIFIED" else None,
                            "verified_date": now if checklist_status == "VERIFIED" else None,
                            "rejection_reason": (
                                "Please re-upload with clearer scan."
                                if checklist_status == "REJECTED"
                                else None
                            ),
                            "version": 1,
                            "notes": "Demo seeded checklist document",
                            "created_at": now,
                            "updated_at": now,
                            "file_data": None,
                            "file_mime": "text/plain",
                            "checklist_item_id": checklist_id,
                        },
                    )
                    docs_created += 1

        db.commit()
        print(
            f"Done. workers={len(workers)} checklist_items={len(CHECKLIST_ITEMS)} "
            f"checklist_rows_created={checklist_rows_created} docs_created={docs_created}"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
