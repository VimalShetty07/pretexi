"""Org-wide employment status labels (HR) — separate from Worker.status (compliance lifecycle)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.models import Organisation

DEFAULT_EMPLOYMENT_STATUSES = ["Active", "Inactive", "Finished"]


def effective_employment_status_options(org: Organisation | None) -> list[str]:
    """Return ordered dropdown options: org JSON list, or defaults."""
    if org is None:
        return list(DEFAULT_EMPLOYMENT_STATUSES)
    raw = org.employment_status_options
    if not raw or not isinstance(raw, list):
        return list(DEFAULT_EMPLOYMENT_STATUSES)
    out: list[str] = []
    seen: set[str] = set()
    for x in raw:
        if isinstance(x, str):
            s = x.strip()
            if s and s not in seen:
                seen.add(s)
                out.append(s)
    return out if out else list(DEFAULT_EMPLOYMENT_STATUSES)


def normalise_status_options_payload(items: list[str]) -> list[str]:
    """Dedupe, strip, drop empties; preserve order."""
    out: list[str] = []
    seen: set[str] = set()
    for x in items:
        if not isinstance(x, str):
            continue
        s = x.strip()
        if not s or len(s) > 100:
            continue
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out


def employment_status_allowed(db: Session, organisation_id: str, value: str) -> bool:
    org = db.query(Organisation).filter(Organisation.id == organisation_id).first()
    return value in set(effective_employment_status_options(org))
