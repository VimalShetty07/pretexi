"""Default org-wide dropdown lists (departments, work locations, onboarding stages)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.models import Organisation

DEFAULT_DEPARTMENTS = ["Operations", "People", "Finance", "Engineering", "Care"]
DEFAULT_WORK_LOCATIONS = ["London HQ", "Manchester Office", "Remote", "Hybrid — UK"]
DEFAULT_ONBOARDING_STAGES = [
    "Recruitment",
    "CoS assignment",
    "Pre-start",
    "Active sponsorship",
]

# Master list for "Right to work category" — employer-facing labels; tenants may customise in Organisation settings.
DEFAULT_RTW_CATEGORIES = [
    "British Citizen",
    "Irish Citizen",
    "ILR / Settled Status",
    "Pre-settled Status",
    "Visa – Sponsored Worker",
    "Visa – Non-Sponsored Worker",
]


def _effective_list(org: Organisation | None, raw_attr: str, defaults: list[str]) -> list[str]:
    if org is None:
        return list(defaults)
    raw = getattr(org, raw_attr, None)
    if not raw or not isinstance(raw, list):
        return list(defaults)
    out: list[str] = []
    seen: set[str] = set()
    for x in raw:
        if isinstance(x, str):
            s = x.strip()
            if s and s not in seen:
                seen.add(s)
                out.append(s)
    return out if out else list(defaults)


def effective_department_options(org: Organisation | None) -> list[str]:
    return _effective_list(org, "department_options", DEFAULT_DEPARTMENTS)


def effective_work_location_options(org: Organisation | None) -> list[str]:
    return _effective_list(org, "work_location_options", DEFAULT_WORK_LOCATIONS)


def effective_onboarding_stage_options(org: Organisation | None) -> list[str]:
    return _effective_list(org, "onboarding_stage_options", DEFAULT_ONBOARDING_STAGES)


def effective_rtw_category_options(org: Organisation | None) -> list[str]:
    return _effective_list(org, "rtw_category_options", DEFAULT_RTW_CATEGORIES)


def normalise_option_list(items: list[str]) -> list[str]:
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


def value_in_org_list(org: Organisation | None, value: str | None, getter) -> bool:
    if not value:
        return True
    return value.strip() in set(getter(org))
