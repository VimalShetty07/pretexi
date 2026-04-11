"""
Seed alerts, reports, and background verification demo data.
Run from backend dir: python seed_compliance_demo.py
"""
from __future__ import annotations

import hashlib
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.database import SessionLocal
from app.models.models import (
    Alert,
    AlertSeverity,
    AlertType,
    BgVerification,
    BgVerificationReference,
    BgVerificationStatus,
    Organisation,
    ReferenceStatus,
    Report,
    ReportDeadlineType,
    ReportStatus,
    Worker,
)

MOCK_LICENCE = "DEMO-LICENCE-001"


def _token(*parts: str) -> str:
    raw = "|".join(parts).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def main():
    db = SessionLocal()
    try:
        org = db.query(Organisation).filter(Organisation.licence_number == MOCK_LICENCE).first()
        if not org:
            print("ERROR: Demo organisation not found. Run seed_mock_users.py first.")
            return

        workers = (
            db.query(Worker)
            .filter(Worker.organisation_id == org.id)
            .order_by(Worker.created_at.asc())
            .limit(10)
            .all()
        )
        if not workers:
            print("ERROR: No workers found. Run seed_workers.py first.")
            return

        now = datetime.now(timezone.utc)
        alerts_created = 0
        reports_created = 0
        bg_created = 0
        refs_created = 0

        for idx, w in enumerate(workers):
            # Alerts
            alert_specs = [
                (
                    AlertType.VISA_EXPIRY,
                    AlertSeverity.WARNING,
                    f"Visa expiry for {w.name} is due in {14 + idx} days.",
                    now + timedelta(days=14 + idx),
                ),
                (
                    AlertType.MISSING_DOCUMENT,
                    AlertSeverity.INFO if idx % 2 == 0 else AlertSeverity.WARNING,
                    f"Missing Right to Work evidence for {w.name}.",
                    now + timedelta(days=7),
                ),
            ]
            if idx % 4 == 0:
                alert_specs.append(
                    (
                        AlertType.SALARY_RISK,
                        AlertSeverity.CRITICAL,
                        f"Potential salary threshold risk detected for {w.name}.",
                        now + timedelta(days=3),
                    )
                )

            for alert_type, severity, message, due_date in alert_specs:
                exists = (
                    db.query(Alert)
                    .filter(
                        Alert.worker_id == w.id,
                        Alert.alert_type == alert_type,
                        Alert.message == message,
                    )
                    .first()
                )
                if exists:
                    continue
                db.add(
                    Alert(
                        worker_id=w.id,
                        alert_type=alert_type,
                        severity=severity,
                        message=message,
                        due_date=due_date,
                        is_resolved=False,
                    )
                )
                alerts_created += 1

            # Reports
            report_specs = [
                (
                    "Address change report",
                    ReportDeadlineType.TEN_WORKING_DAYS,
                    now + timedelta(days=10 + idx),
                    ReportStatus.DUE_SOON if idx % 3 == 0 else ReportStatus.PENDING,
                    "Auto-seeded demo compliance report.",
                ),
                (
                    "Salary change notification",
                    ReportDeadlineType.TWENTY_WORKING_DAYS,
                    now + timedelta(days=20 + idx),
                    ReportStatus.PENDING,
                    "Pending Home Office update.",
                ),
            ]
            if idx % 5 == 0:
                report_specs.append(
                    (
                        "Missed contact event",
                        ReportDeadlineType.TEN_WORKING_DAYS,
                        now - timedelta(days=1),
                        ReportStatus.OVERDUE,
                        "Overdue demo event for escalation testing.",
                    )
                )

            for report_type, deadline_type, deadline, status, notes in report_specs:
                exists = (
                    db.query(Report)
                    .filter(
                        Report.worker_id == w.id,
                        Report.report_type == report_type,
                        Report.deadline == deadline,
                    )
                    .first()
                )
                if exists:
                    continue
                db.add(
                    Report(
                        worker_id=w.id,
                        report_type=report_type,
                        deadline_type=deadline_type,
                        status=status,
                        deadline=deadline,
                        notes=notes,
                    )
                )
                reports_created += 1

            # Background verification + references
            verification = db.query(BgVerification).filter(BgVerification.worker_id == w.id).first()
            if not verification:
                verification = BgVerification(
                    worker_id=w.id,
                    organisation_id=org.id,
                    status=(
                        BgVerificationStatus.COMPLETED
                        if idx % 3 == 0
                        else BgVerificationStatus.IN_PROGRESS
                    ),
                    notes="Demo seeded background verification.",
                    initiated_by="vimal@vimal.com",
                )
                db.add(verification)
                db.flush()
                bg_created += 1

            ref_pairs = [
                ("Line Manager", f"{w.name.split(' ')[0]} Manager", "manager"),
                ("Previous Employer", f"{w.name.split(' ')[0]} Referee", "former_employer"),
            ]
            for company, ref_name, relation in ref_pairs:
                ref_email = f"{w.name.lower().replace(' ', '.')}+{relation}@example.com"
                exists_ref = (
                    db.query(BgVerificationReference)
                    .filter(
                        BgVerificationReference.verification_id == verification.id,
                        BgVerificationReference.referee_email == ref_email,
                    )
                    .first()
                )
                if exists_ref:
                    continue
                db.add(
                    BgVerificationReference(
                        verification_id=verification.id,
                        referee_name=ref_name,
                        referee_email=ref_email,
                        referee_phone="+44 7700 555000",
                        referee_company=company,
                        referee_job_title="Supervisor",
                        relation_to_employee=relation,
                        employment_start=(now - timedelta(days=900)).date(),
                        employment_end=(now - timedelta(days=100)).date(),
                        token=_token(verification.id, ref_email),
                        status=ReferenceStatus.EMAIL_SENT if idx % 2 == 0 else ReferenceStatus.DRAFT,
                        email_sent_at=now if idx % 2 == 0 else None,
                    )
                )
                refs_created += 1

        db.commit()
        print(
            f"Done. workers={len(workers)} alerts_created={alerts_created} "
            f"reports_created={reports_created} bg_created={bg_created} references_created={refs_created}"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
