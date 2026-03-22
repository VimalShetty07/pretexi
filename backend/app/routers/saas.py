import hashlib
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import hash_password
from app.models.models import (
    Organisation,
    Subscription,
    SubscriptionEvent,
    SubscriptionStatus,
    TenantInvitation,
    User,
    UserRole,
)
from app.schemas.schemas import (
    BillingWebhookRequest,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    PortalBootstrapRequest,
    PublicPlanOut,
)

router = APIRouter(tags=["saas"])

settings = get_settings()

PREMIUM_ADDONS: dict[str, dict[str, float | str]] = {
    "bg_verification": {
        "name": "Background Verification",
        "amount": 49.0,
    },
    "leave_approval": {
        "name": "Leave Approval Workflow",
        "amount": 29.0,
    },
}

PLANS: dict[str, PublicPlanOut] = {
    "starter_monthly": PublicPlanOut(
        code="starter_monthly",
        name="Starter",
        amount=99,
        currency="GBP",
        billing_interval="month",
        features=["Core compliance dashboard", "Document tracking", "Calendar and reminders"],
        included_users=25,
        extra_user_price=2.0,
        premium_features=["bg_verification", "leave_approval"],
    ),
    "growth_monthly": PublicPlanOut(
        code="growth_monthly",
        name="Growth",
        amount=249,
        currency="GBP",
        billing_interval="month",
        features=["Advanced reporting", "Risk and alerts", "Role-based workflows"],
        included_users=100,
        extra_user_price=1.5,
        premium_features=["bg_verification", "leave_approval"],
    ),
    "enterprise_monthly": PublicPlanOut(
        code="enterprise_monthly",
        name="Enterprise",
        amount=599,
        currency="GBP",
        billing_interval="month",
        features=["Unlimited users", "Priority support", "Custom onboarding"],
        included_users=None,
        extra_user_price=0,
        premium_features=["bg_verification", "leave_approval"],
    ),
}


def _slugify(value: str) -> str:
    slug = value.strip().lower().replace(" ", "-")
    return "".join(ch for ch in slug if ch.isalnum() or ch == "-")


def _status_to_org_active(status: str) -> bool:
    return status in {"active", "trialing"}


def _calculate_quote(plan: PublicPlanOut, user_count: int, addon_codes: list[str]) -> tuple[float, float, float]:
    safe_user_count = max(1, user_count)
    included = plan.included_users if plan.included_users is not None else safe_user_count
    per_user = float(plan.extra_user_price or 0)
    overage_users = max(0, safe_user_count - included)
    user_overage_amount = overage_users * per_user

    addons_total = 0.0
    for code in addon_codes:
        addon = PREMIUM_ADDONS.get(code)
        if addon:
            addons_total += float(addon["amount"])

    base_amount = float(plan.amount)
    return base_amount, user_overage_amount, addons_total


@router.get("/public/plans", response_model=list[PublicPlanOut])
def get_public_plans():
    return list(PLANS.values())


@router.post("/billing/checkout-session", response_model=CheckoutSessionResponse)
def create_checkout_session(payload: CheckoutSessionRequest):
    plan = PLANS.get(payload.plan_code)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan_code")

    invalid_addons = [code for code in payload.addon_codes if code not in PREMIUM_ADDONS]
    if invalid_addons:
        raise HTTPException(status_code=400, detail=f"Invalid addon_codes: {', '.join(invalid_addons)}")

    base_amount, user_overage_amount, addons_amount = _calculate_quote(
        plan=plan,
        user_count=payload.user_count,
        addon_codes=payload.addon_codes,
    )
    total_amount = base_amount + user_overage_amount + addons_amount

    session_id = f"manual_{secrets.token_hex(10)}"
    base_url = settings.APP_BASE_URL or "http://127.0.0.1:3000"
    checkout_url = (
        f"{base_url}/checkout/success"
        f"?session_id={session_id}"
        f"&plan={plan.code}"
        f"&company={_slugify(payload.company_name)}"
        f"&users={max(1, payload.user_count)}"
        f"&addons={','.join(payload.addon_codes)}"
        f"&total={total_amount}"
    )
    return CheckoutSessionResponse(
        checkout_url=checkout_url,
        session_id=session_id,
        base_amount=base_amount,
        user_overage_amount=user_overage_amount,
        addons_amount=addons_amount,
        total_amount=total_amount,
        currency=plan.currency,
    )


@router.post("/billing/webhook")
def billing_webhook(
    payload: BillingWebhookRequest,
    db: Session = Depends(get_db),
    x_webhook_secret: str | None = Header(default=None),
):
    if settings.STRIPE_WEBHOOK_SECRET:
        if x_webhook_secret != settings.STRIPE_WEBHOOK_SECRET:
            raise HTTPException(status_code=401, detail="Invalid webhook secret")

    existing = (
        db.query(SubscriptionEvent)
        .filter(SubscriptionEvent.provider_event_id == payload.provider_event_id)
        .first()
    )
    if existing:
        return {"status": "ok", "idempotent": True}

    slug = _slugify(payload.company_slug or payload.company_name)
    if not slug:
        raise HTTPException(status_code=400, detail="Invalid company slug")

    org = db.query(Organisation).filter(Organisation.slug == slug).first()
    if not org:
        org = Organisation(
            name=payload.company_name.strip(),
            slug=slug,
            licence_number=f"TENANT-{slug[:32].upper()}",
            portal_plan=payload.plan_code,
            is_active=_status_to_org_active(payload.status),
            portal_expires_at=payload.current_period_end,
        )
        db.add(org)
        db.flush()

    admin = db.query(User).filter(User.email == payload.admin_email.lower().strip()).first()
    if not admin:
        temp_password = secrets.token_urlsafe(12)
        admin = User(
            organisation_id=org.id,
            email=payload.admin_email.lower().strip(),
            full_name=payload.admin_name.strip(),
            role=UserRole.TENANT_ADMIN,
            hashed_password=hash_password(temp_password),
            must_reset_password=True,
            is_active=True,
        )
        db.add(admin)
        db.flush()

    subscription = None
    if payload.provider_subscription_id:
        subscription = (
            db.query(Subscription)
            .filter(Subscription.provider_subscription_id == payload.provider_subscription_id)
            .first()
        )
    if not subscription:
        subscription = (
            db.query(Subscription)
            .filter(Subscription.organisation_id == org.id)
            .order_by(Subscription.created_at.desc())
            .first()
        )

    try:
        status_enum = SubscriptionStatus(payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid subscription status") from exc

    if not subscription:
        subscription = Subscription(
            organisation_id=org.id,
            provider=settings.PAYMENT_PROVIDER or "stripe",
            plan_code=payload.plan_code,
            status=status_enum,
            billing_interval=payload.billing_interval,
            amount=payload.amount,
            currency=payload.currency,
            provider_customer_id=payload.provider_customer_id,
            provider_subscription_id=payload.provider_subscription_id,
            current_period_start=datetime.now(timezone.utc),
            current_period_end=payload.current_period_end,
        )
        db.add(subscription)
        db.flush()
    else:
        subscription.plan_code = payload.plan_code
        subscription.status = status_enum
        subscription.billing_interval = payload.billing_interval
        subscription.amount = payload.amount
        subscription.currency = payload.currency
        subscription.provider_customer_id = payload.provider_customer_id
        subscription.provider_subscription_id = payload.provider_subscription_id
        subscription.current_period_end = payload.current_period_end

    org.portal_plan = payload.plan_code
    org.portal_expires_at = payload.current_period_end
    org.is_active = _status_to_org_active(payload.status)

    event = SubscriptionEvent(
        subscription_id=subscription.id,
        provider_event_id=payload.provider_event_id,
        event_type=payload.event_type,
        payload_json=payload.model_dump(),
        status="processed",
        processed_at=datetime.now(timezone.utc),
    )
    db.add(event)
    db.commit()
    return {"status": "ok", "idempotent": False, "organisation_id": org.id}


@router.post("/portal/bootstrap")
def portal_bootstrap(payload: PortalBootstrapRequest, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(payload.token.encode("utf-8")).hexdigest()
    invitation = (
        db.query(TenantInvitation)
        .filter(
            TenantInvitation.token_hash == token_hash,
            TenantInvitation.email == payload.email.lower().strip(),
        )
        .first()
    )
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invitation.accepted_at is not None:
        raise HTTPException(status_code=400, detail="Invitation already used")
    if invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation expired")

    user = (
        db.query(User)
        .filter(
            User.organisation_id == invitation.organisation_id,
            User.email == invitation.email,
            User.role == UserRole.TENANT_ADMIN,
        )
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Tenant admin user not found")

    user.hashed_password = hash_password(payload.password)
    user.must_reset_password = False
    user.is_active = True
    if payload.full_name:
        user.full_name = payload.full_name.strip()

    invitation.accepted_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok", "message": "Portal bootstrap completed"}
