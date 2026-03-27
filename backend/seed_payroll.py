"""
Seed monthly payroll rows for every worker in the demo org (last 3 months).
Run from backend dir: python seed_payroll.py
Requires: workers seeded (seed_workers.py).
"""
import sys
from calendar import monthrange
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.database import SessionLocal
from app.models.models import Organisation, Worker, PayrollEntry

MOCK_LICENCE = "DEMO-LICENCE-001"


def _periods_last_n_months(n: int) -> list[str]:
    out: list[str] = []
    now = datetime.now(timezone.utc)
    y, m = now.year, now.month
    for _ in range(n):
        out.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m < 1:
            m = 12
            y -= 1
    return list(reversed(out))


def _line_items_from_annual(annual: float) -> tuple[float, float, float, float, float]:
    """Illustrative UK-style monthly deductions (not tax advice)."""
    gross = round(annual / 12.0, 2)
    income_tax = round(gross * 0.20, 2)
    employee_ni = round(gross * 0.10, 2)
    pension = round(gross * 0.05, 2)
    net = round(gross - income_tax - employee_ni - pension, 2)
    return gross, income_tax, employee_ni, pension, net


def main():
    db = SessionLocal()
    try:
        org = db.query(Organisation).filter(Organisation.licence_number == MOCK_LICENCE).first()
        if not org:
            print("ERROR: Organisation not found. Run seed_mock_users.py first.")
            return

        workers = db.query(Worker).filter(Worker.organisation_id == org.id).all()
        if not workers:
            print("ERROR: No workers. Run seed_workers.py first.")
            return

        periods = _periods_last_n_months(3)
        created = 0

        for w in workers:
            annual = float(w.salary or 0)
            for pay_period in periods:
                exists = (
                    db.query(PayrollEntry)
                    .filter(
                        PayrollEntry.worker_id == w.id,
                        PayrollEntry.pay_period == pay_period,
                    )
                    .first()
                )
                if exists:
                    continue
                gross, tax, ni, pen, net = _line_items_from_annual(annual)
                y, m = int(pay_period[:4]), int(pay_period[5:7])
                last_day = monthrange(y, m)[1]
                payment_dt = datetime(y, m, last_day, 12, 0, 0, tzinfo=timezone.utc)
                row = PayrollEntry(
                    organisation_id=org.id,
                    worker_id=w.id,
                    pay_period=pay_period,
                    gross_pay=gross,
                    income_tax=tax,
                    employee_ni=ni,
                    pension_employee=pen,
                    net_pay=net,
                    payment_date=payment_dt,
                )
                db.add(row)
                created += 1

        db.commit()
        print(f"Done. Created {created} payroll rows for {len(workers)} workers (periods: {', '.join(periods)}).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
