"""
Idempotent seed: one tenant org, tenant admin + HR, and 20 varied dummy employees with portal users.

Run on the server from the backend app root (with DATABASE_URL in env), e.g.:
  docker compose exec api python seed_production_vimal_demo.py

Uses MOCK_SEED_PASSWORD from settings for all seeded user passwords (set in .env).
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.models import (
    Organisation,
    User,
    UserRole,
    Worker,
    WorkerStage,
    WorkerStatus,
    RiskLevel,
)

settings = get_settings()

ORG_NAME = "Vimal Demo Ltd"
ORG_LICENCE = "PROD-VIMAL-001"
ORG_SLUG = "vimal-demo"

ADMIN_EMAIL = "vimal@vimal.com"
ADMIN_NAME = "Vimal Admin"
HR_EMAIL = "vimalhr@vimal.com"
HR_NAME = "Vimal HR"

PASSWORD = settings.MOCK_SEED_PASSWORD

FIRST_NAMES = (
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen",
)
LAST_NAMES = (
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
    "Taylor", "Moore", "Jackson", "Martin",
)
DEPARTMENTS = (
    "Engineering",
    "Engineering",
    "Product",
    "Design",
    "Finance",
    "HR",
    "Sales",
    "Operations",
    "Legal",
    "Compliance",
    "Engineering",
    "Data",
    "Customer Success",
    "Marketing",
    "Support",
    "Engineering",
    "Finance",
    "HR",
    "Sales",
    "Operations",
)
TITLES = (
    "Software Engineer",
    "Senior Engineer",
    "Product Manager",
    "UX Designer",
    "Financial Analyst",
    "HR Advisor",
    "Account Executive",
    "Operations Manager",
    "Paralegal",
    "Compliance Officer",
    "DevOps Engineer",
    "Data Analyst",
    "CS Manager",
    "Marketing Executive",
    "Support Engineer",
    "QA Engineer",
    "Payroll Specialist",
    "Recruiter",
    "Sales Executive",
    "Business Analyst",
)
STAGES = (
    WorkerStage.RECRUITMENT,
    WorkerStage.COS_ASSIGNMENT,
    WorkerStage.PRE_START,
    WorkerStage.ACTIVE_SPONSORSHIP,
    WorkerStage.ACTIVE_SPONSORSHIP,
    WorkerStage.ACTIVE_SPONSORSHIP,
    WorkerStage.ACTIVE_SPONSORSHIP,
    WorkerStage.ACTIVE_SPONSORSHIP,
    WorkerStage.ACTIVE_SPONSORSHIP,
    WorkerStage.ACTIVE_SPONSORSHIP,
    WorkerStage.PRE_START,
    WorkerStage.COS_ASSIGNMENT,
    WorkerStage.RECRUITMENT,
    WorkerStage.ACTIVE_SPONSORSHIP,
    WorkerStage.ACTIVE_SPONSORSHIP,
    WorkerStage.ACTIVE_SPONSORSHIP,
    WorkerStage.ACTIVE_SPONSORSHIP,
    WorkerStage.ACTIVE_SPONSORSHIP,
    WorkerStage.ACTIVE_SPONSORSHIP,
    WorkerStage.TERMINATED,
)
STATUSES = (
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.SUSPENDED,
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.ACTIVE,
    WorkerStatus.TERMINATED,
)
RISKS = (
    RiskLevel.LOW,
    RiskLevel.LOW,
    RiskLevel.MEDIUM,
    RiskLevel.LOW,
    RiskLevel.MEDIUM,
    RiskLevel.HIGH,
    RiskLevel.LOW,
    RiskLevel.MEDIUM,
    RiskLevel.CRITICAL,
    RiskLevel.LOW,
    RiskLevel.MEDIUM,
    RiskLevel.LOW,
    RiskLevel.HIGH,
    RiskLevel.MEDIUM,
    RiskLevel.LOW,
    RiskLevel.MEDIUM,
    RiskLevel.LOW,
    RiskLevel.MEDIUM,
    RiskLevel.LOW,
    RiskLevel.LOW,
)
EMPLOYMENT_STATUSES = (
    "Active",
    "Active",
    "Probation",
    "Active",
    "Active",
    "Inactive",
    "Active",
    "Active",
    "Active",
    "Active",
    "Active",
    "Active",
    "Active",
    "Active",
    "Active",
    "Active",
    "Active",
    "Active",
    "Active",
    "Finished",
)
RTW_CATEGORIES = (
    "Skilled Worker",
    "Skilled Worker",
    "Graduate",
    "Skilled Worker",
    "Skilled Worker",
    "Skilled Worker",
    "Skilled Worker",
    "Student",
    "Skilled Worker",
    "Skilled Worker",
    "Skilled Worker",
    "Skilled Worker",
    "Skilled Worker",
    "Skilled Worker",
    "Skilled Worker",
    "Skilled Worker",
    "Skilled Worker",
    "Skilled Worker",
    "Skilled Worker",
    "Skilled Worker",
)


def _ensure_org(db) -> Organisation:
    org = db.query(Organisation).filter(Organisation.licence_number == ORG_LICENCE).first()
    if org:
        print(f"Using organisation: {org.name} ({org.licence_number})")
    else:
        org = Organisation(
            name=ORG_NAME,
            licence_number=ORG_LICENCE,
            slug=ORG_SLUG,
            portal_plan="enterprise_monthly",
            is_active=True,
        )
        db.add(org)
        db.flush()
        print(f"Created organisation: {org.name} ({org.licence_number})")

    org.employment_status_options = [
        "Active",
        "Inactive",
        "Probation",
        "Notice period",
        "Finished",
    ]
    org.department_options = sorted(
        set(DEPARTMENTS)
        | {
            "Engineering",
            "Product",
            "People",
        }
    )
    org.work_location_options = ["London HQ", "Manchester", "Birmingham", "Remote", "Hybrid"]
    org.rtw_category_options = [
        "British / Irish",
        "EU settled",
        "Skilled Worker",
        "Graduate",
        "Student",
        "Other",
    ]
    return org


def _ensure_staff_user(
    db,
    *,
    organisation_id: str,
    email: str,
    full_name: str,
    role: UserRole,
    password: str,
) -> User:
    existing = db.query(User).filter(User.email == email).first()
    hashed = hash_password(password)
    if existing:
        existing.organisation_id = organisation_id
        existing.full_name = full_name
        existing.role = role
        existing.hashed_password = hashed
        existing.worker_id = None
        existing.is_active = True
        existing.must_reset_password = False
        print(f"  Updated user: {email} ({role.value})")
        return existing

    user = User(
        organisation_id=organisation_id,
        email=email,
        full_name=full_name,
        role=role,
        hashed_password=hashed,
        is_active=True,
        must_reset_password=False,
    )
    db.add(user)
    print(f"  Created user: {email} ({role.value})")
    return user


def _ensure_employee_user(db, *, organisation_id: str, worker: Worker, password: str) -> None:
    email = worker.email
    if not email:
        return
    existing = db.query(User).filter(User.email == email).first()
    hashed = hash_password(password)
    display = f"{worker.first_name or ''} {worker.last_name or worker.name}".strip()
    if existing:
        existing.organisation_id = organisation_id
        existing.full_name = display or existing.full_name
        existing.role = UserRole.EMPLOYEE
        existing.worker_id = worker.id
        existing.hashed_password = hashed
        existing.is_active = True
        return
    db.add(
        User(
            organisation_id=organisation_id,
            email=email,
            full_name=display or worker.name,
            role=UserRole.EMPLOYEE,
            worker_id=worker.id,
            hashed_password=hashed,
            is_active=True,
            must_reset_password=False,
        )
    )


def main() -> None:
    db = SessionLocal()
    try:
        org = _ensure_org(db)
        db.flush()

        _ensure_staff_user(
            db,
            organisation_id=org.id,
            email=ADMIN_EMAIL,
            full_name=ADMIN_NAME,
            role=UserRole.TENANT_ADMIN,
            password=PASSWORD,
        )
        _ensure_staff_user(
            db,
            organisation_id=org.id,
            email=HR_EMAIL,
            full_name=HR_NAME,
            role=UserRole.HR_OFFICER,
            password=PASSWORD,
        )

        today = datetime.now(timezone.utc).date()
        for i in range(20):
            idx = i + 1
            email = f"emp{idx:02d}@vimal.com"
            fn = FIRST_NAMES[i]
            ln = LAST_NAMES[i]
            name = f"{fn} {ln}"

            existing_w = (
                db.query(Worker)
                .filter(Worker.organisation_id == org.id, Worker.email == email)
                .first()
            )
            start = datetime(today.year - 1, (idx % 12) + 1, min(idx, 28), tzinfo=timezone.utc)
            visa_exp = datetime(today.year + 2, (idx % 12) + 1, min(idx, 28), tzinfo=timezone.utc)
            passport_exp = datetime(today.year + 5, (idx % 12) + 1, min(idx, 28), tzinfo=timezone.utc)

            if existing_w:
                w = existing_w
                w.name = name
                w.first_name = fn
                w.last_name = ln
                w.job_title = TITLES[i]
                w.department = DEPARTMENTS[i]
                w.soc_code = "2136" if "Engineer" in TITLES[i] else "2425"
                w.salary = float(35000 + (idx * 1500))
                w.route = "Skilled Worker"
                w.work_location = "London HQ" if idx % 2 == 0 else "Manchester"
                w.is_hybrid = idx % 3 == 0
                w.is_remote = idx % 7 == 0
                w.status = STATUSES[i]
                w.stage = STAGES[i]
                w.risk_level = RISKS[i]
                w.employment_status = EMPLOYMENT_STATUSES[i]
                w.right_to_work_category = RTW_CATEGORIES[i]
                w.nationality = "British" if idx % 5 == 0 else "Indian"
                w.start_date = start
                w.visa_expiry = visa_exp if w.status != WorkerStatus.TERMINATED else visa_exp
                w.passport_expiry = passport_exp
                w.brp_expiry = visa_exp
                w.phone = f"+44 7700 {100000 + idx}"
                w.employee_id = f"EMP-VIMAL-{idx:03d}"
                if w.status == WorkerStatus.TERMINATED:
                    w.termination_date = datetime(today.year, 1, 15, tzinfo=timezone.utc)
                else:
                    w.termination_date = None
                print(f"  Updated worker: {name} ({email})")
            else:
                w = Worker(
                    organisation_id=org.id,
                    name=name,
                    first_name=fn,
                    last_name=ln,
                    email=email,
                    phone=f"+44 7700 {100000 + idx}",
                    nationality="British" if idx % 5 == 0 else "Indian",
                    job_title=TITLES[i],
                    department=DEPARTMENTS[i],
                    soc_code="2136" if "Engineer" in TITLES[i] else "2425",
                    salary=float(35000 + (idx * 1500)),
                    route="Skilled Worker",
                    work_location="London HQ" if idx % 2 == 0 else "Manchester",
                    is_hybrid=idx % 3 == 0,
                    is_remote=idx % 7 == 0,
                    start_date=start,
                    visa_expiry=visa_exp,
                    passport_expiry=passport_exp,
                    brp_expiry=visa_exp,
                    status=STATUSES[i],
                    stage=STAGES[i],
                    risk_level=RISKS[i],
                    employment_status=EMPLOYMENT_STATUSES[i],
                    right_to_work_category=RTW_CATEGORIES[i],
                    employee_id=f"EMP-VIMAL-{idx:03d}",
                    employee_type="migrant",
                )
                if STATUSES[i] == WorkerStatus.TERMINATED:
                    w.termination_date = datetime(today.year, 1, 15, tzinfo=timezone.utc)
                db.add(w)
                db.flush()
                print(f"  Created worker: {name} ({email})")

            _ensure_employee_user(db, organisation_id=org.id, worker=w, password=PASSWORD)

        db.commit()

        n_workers = db.query(Worker).filter(Worker.organisation_id == org.id).count()
        n_emp_users = (
            db.query(User)
            .filter(User.organisation_id == org.id, User.role == UserRole.EMPLOYEE)
            .count()
        )
        print(
            "\nDone.\n"
            f"  Organisation: {ORG_NAME} — licence {ORG_LICENCE}\n"
            f"  Admin: {ADMIN_EMAIL} | HR: {HR_EMAIL}\n"
            f"  Password for all seeded accounts: (MOCK_SEED_PASSWORD from env)\n"
            f"  Workers in org: {n_workers} | Employee portal users: {n_emp_users}"
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
