from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt

from app.config import get_settings
from app.checklist_schemas import TokenUser

PLATFORM_ROLES = frozenset({"platform_owner"})
# Who can read template (organisation settings UI)
TEMPLATE_VIEW_ROLES = frozenset(
    {"tenant_admin", "compliance_manager", "super_admin", "platform_owner", "hr_officer", "payroll_officer"}
)
# Who can replace the whole template (destructive)
TEMPLATE_PUT_ROLES = frozenset({"tenant_admin", "compliance_manager", "super_admin", "platform_owner"})


def decode_token(authorization: str | None) -> TokenUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(None, 1)[1].strip()
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Support flat claims or nested "user" object (common variants)
    org = payload.get("organisation_id") or payload.get("org_id")
    role = payload.get("role")
    sub = payload.get("sub")
    if isinstance(payload.get("user"), dict):
        u = payload["user"]
        org = org or u.get("organisation_id") or u.get("org_id")
        role = role or u.get("role")
        sub = sub or u.get("id") or u.get("sub")

    return TokenUser(sub=sub, organisation_id=org, role=role)


def get_current_user(authorization: str | None = Header(None)) -> TokenUser:
    return decode_token(authorization)


def effective_organisation_id(user: TokenUser, query_org: str | None) -> str:
    """Resolve which tenant's checklist template to use."""
    if user.role in PLATFORM_ROLES:
        if not query_org:
            raise HTTPException(
                status_code=400,
                detail="Query parameter organisation_id is required for platform users",
            )
        return query_org
    if not user.organisation_id:
        raise HTTPException(status_code=403, detail="No organisation context on token")
    if query_org and query_org != user.organisation_id:
        raise HTTPException(status_code=403, detail="organisation_id does not match your tenant")
    return user.organisation_id


def require_template_view(user: TokenUser, organisation_id: str) -> None:
    if user.role == "platform_owner":
        return
    if user.organisation_id != organisation_id:
        raise HTTPException(status_code=403, detail="Cannot view another organisation's template")
    if user.role not in TEMPLATE_VIEW_ROLES:
        raise HTTPException(status_code=403, detail="Not allowed to view checklist template")


def require_template_put(user: TokenUser, organisation_id: str) -> None:
    if user.role == "platform_owner":
        return
    if user.organisation_id != organisation_id:
        raise HTTPException(status_code=403, detail="Cannot manage another organisation's template")
    if user.role not in TEMPLATE_PUT_ROLES:
        raise HTTPException(status_code=403, detail="Not allowed to update checklist template")
