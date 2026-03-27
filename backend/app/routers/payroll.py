"""Payroll listings — HR team sees all; managers (tenant/compliance) are blocked; employees see own only."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routers.deps import get_current_user
from app.models.models import User, UserRole, Worker, PayrollEntry
from app.schemas.schemas import PayrollEntryOut

router = APIRouter(prefix="/payroll", tags=["payroll"])

# Full payroll register (all employees in org)
HR_PAYROLL_ROLES = frozenset(
    {
        UserRole.SUPER_ADMIN,
        UserRole.HR_OFFICER,
        UserRole.PAYROLL_OFFICER,
    }
)

# No access to payroll area / salary banking fields
MANAGER_BLOCKED_ROLES = frozenset(
    {
        UserRole.TENANT_ADMIN,
        UserRole.COMPLIANCE_MANAGER,
    }
)


def _entry_to_out(entry: PayrollEntry, worker: Worker) -> PayrollEntryOut:
    return PayrollEntryOut(
        id=entry.id,
        worker_id=entry.worker_id,
        worker_name=worker.name,
        job_title=worker.job_title,
        employee_id=worker.employee_id,
        pay_period=entry.pay_period,
        gross_pay=entry.gross_pay,
        income_tax=entry.income_tax,
        employee_ni=entry.employee_ni,
        pension_employee=entry.pension_employee,
        net_pay=entry.net_pay,
        payment_date=entry.payment_date,
    )


@router.get("", response_model=list[PayrollEntryOut])
def list_organisation_payroll(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All payroll rows for the tenant — HR / payroll / super admin only."""
    if current_user.role in MANAGER_BLOCKED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers do not have access to payroll records",
        )
    if current_user.role not in HR_PAYROLL_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Payroll is restricted to HR team",
        )

    rows = (
        db.query(PayrollEntry, Worker)
        .join(Worker, Worker.id == PayrollEntry.worker_id)
        .filter(PayrollEntry.organisation_id == current_user.organisation_id)
        .order_by(PayrollEntry.pay_period.desc(), Worker.name.asc())
        .all()
    )
    return [_entry_to_out(pe, w) for pe, w in rows]


@router.get("/me", response_model=list[PayrollEntryOut])
def list_my_payroll(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Signed-in employee — own payslip rows only."""
    if current_user.role != UserRole.EMPLOYEE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee portal only",
        )
    if not current_user.worker_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No worker linked to this account")

    worker = db.query(Worker).filter(Worker.id == current_user.worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    entries = (
        db.query(PayrollEntry)
        .filter(
            PayrollEntry.worker_id == current_user.worker_id,
            PayrollEntry.organisation_id == current_user.organisation_id,
        )
        .order_by(PayrollEntry.pay_period.desc())
        .all()
    )
    return [_entry_to_out(e, worker) for e in entries]
