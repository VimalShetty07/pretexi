# Protexi Multi-Tenant SaaS Implementation Blueprint

This document defines the concrete schema and API design for the use case:

- Public company display pages with plans/payment
- Auto-provision company portal after payment
- Super admin panel to manage all client companies and subscription expiry
- Single purchased domain (`protexi.com`)

---

## 1) URL and Domain Strategy (Single Domain)

Use one root domain and route by path:

- `https://protexi.com/` -> marketing display
- `https://protexi.com/pricing` -> plans and checkout
- `https://protexi.com/portal` -> tenant login
- `https://protexi.com/app/*` -> tenant portal app
- `https://protexi.com/super-admin/*` -> platform admin app

Recommended API endpoint host:

- `https://api.protexi.com` (same purchased domain, subdomain via DNS)

Alternative:

- `https://protexi.com/api` via frontend rewrite/proxy.

---

## 2) Roles and Access Model

Add/standardize roles:

- `platform_owner` (internal master admin)
- `tenant_admin` (main admin for one client company)
- `tenant_staff` (optional future)
- `tenant_employee` (optional future)

Rules:

- `platform_owner` can read all organisations and subscriptions.
- Non-platform roles can only access their own `organisation_id`.
- All tenant business tables must be filtered by `organisation_id`.

---

## 3) Database Schema Additions

## 3.1 `organisations` (already exists, extend where needed)

Add fields (if missing):

- `slug` (unique, human-readable tenant key)
- `is_active` (bool)
- `portal_plan` (enum/text: `free`, `starter`, `growth`, `enterprise`)
- `portal_expires_at` (timestamp)

## 3.2 `subscriptions` (new)

Purpose: source of truth for plan/payment state.

Columns:

- `id` (uuid pk)
- `organisation_id` (fk -> organisations.id, indexed)
- `provider` (`stripe` for now)
- `provider_customer_id` (nullable)
- `provider_subscription_id` (nullable)
- `plan_code` (`starter_monthly`, etc.)
- `status` (`trialing`, `active`, `past_due`, `canceled`, `expired`)
- `billing_interval` (`month`, `year`)
- `amount` (decimal)
- `currency` (`GBP`, etc.)
- `current_period_start` (timestamp)
- `current_period_end` (timestamp)
- `cancel_at_period_end` (bool default false)
- `created_at`, `updated_at`

## 3.3 `subscription_events` (new)

Purpose: webhook audit trail and recoverability.

Columns:

- `id` (uuid pk)
- `subscription_id` (fk nullable)
- `provider_event_id` (unique)
- `event_type`
- `payload_json` (jsonb)
- `processed_at`
- `status` (`received`, `processed`, `failed`)
- `error_message` (nullable)

## 3.4 `tenant_invitations` (new)

Purpose: manual client creation by super admin.

Columns:

- `id` (uuid pk)
- `organisation_id` (fk)
- `email`
- `role` (default `tenant_admin`)
- `token_hash`
- `expires_at`
- `accepted_at` (nullable)
- `created_by_user_id`
- `created_at`

## 3.5 `users` (extend)

- Keep existing `organisation_id`.
- Add `must_reset_password` (bool default true for invited admins).
- Ensure email unique globally (or enforce per-tenant based on policy).

---

## 4) API Endpoints to Implement

All endpoints below are in addition to existing app endpoints.

## 4.1 Public / marketing

- `GET /api/public/plans`
  - Returns visible plans and features.

## 4.2 Checkout and webhook

- `POST /api/billing/checkout-session`
  - Input: `plan_code`, `company_name`, `admin_email`, `admin_name`
  - Output: checkout URL/session id

- `POST /api/billing/webhook`
  - Verifies provider signature.
  - On successful payment/subscription:
    - create or upsert `organisation`
    - create `tenant_admin` user if not present
    - create/update `subscriptions`

## 4.3 Portal bootstrap

- `POST /api/portal/bootstrap`
  - Completes initial setup after payment (set password/profile).

## 4.4 Super admin panel

- `GET /api/platform/organisations`
  - List all tenant companies with plan/status/expiry.

- `GET /api/platform/organisations/{id}`
  - Full organisation details + subscription + key users.

- `POST /api/platform/organisations`
  - Manual add client:
    - creates organisation
    - creates tenant_admin
    - creates invitation/reset token

- `PATCH /api/platform/organisations/{id}`
  - Activate/suspend tenant, update plan metadata.

- `GET /api/platform/subscriptions/expiring`
  - Filter by days (default 30), status.

- `POST /api/platform/organisations/{id}/resend-invite`

## 4.5 Tenant admin

- Existing tenant endpoints remain, but enforce `organisation_id` scoping.

---

## 5) Auth and Middleware Rules

Add helper guards:

- `require_platform_owner`
- `require_tenant_admin`

Global access checks:

- If role is not `platform_owner`, deny access to `/api/platform/*`
- For tenant routes, always filter records by `current_user.organisation_id`

Subscription gate:

- Middleware or dependency checks subscription status for tenant routes:
  - allow: `active`, `trialing`
  - block/readonly: `past_due`, `expired`, `canceled` based on policy

---

## 6) Payment Lifecycle Behavior

On webhook `subscription.created`/`checkout.session.completed`:

1. Ensure idempotency by `provider_event_id`.
2. Create organisation if missing.
3. Create tenant admin user if missing.
4. Create/update subscription row.
5. Set organisation plan and expiry projection.

On `invoice.payment_failed` or `subscription.updated`:

- Mark subscription status and set grace policy.

On `subscription.deleted`:

- Set status `canceled` and optionally disable tenant access.

---

## 7) Frontend Pages to Add

## 7.1 Public

- `/` marketing display
- `/pricing` plans and CTA
- `/checkout/success`, `/checkout/cancel`

## 7.2 Super admin app

- `/super-admin/dashboard`
- `/super-admin/clients`
- `/super-admin/clients/[id]`
- `/super-admin/subscriptions`

UI columns for client list:

- Company
- Tenant admin email
- Plan
- Status
- Renewal/Expiry date
- Actions (view, suspend, resend invite)

---

## 8) Migration Plan

Apply in phases:

1. Alembic migration: new tables + enum updates.
2. Seed one `platform_owner` user.
3. Add backend guards and platform endpoints.
4. Add checkout + webhook handling.
5. Add super admin UI pages.
6. Add invitation/password setup flow.
7. Add subscription gate logic.

---

## 9) Environment Variables

Backend:

- `APP_BASE_URL=https://protexi.com`
- `FRONTEND_BASE_URL=https://protexi.com`
- `API_BASE_URL=https://api.protexi.com`
- `PAYMENT_PROVIDER=stripe`
- `STRIPE_SECRET_KEY=...`
- `STRIPE_WEBHOOK_SECRET=...`
- `STRIPE_PRICE_STARTER_MONTHLY=...`
- `STRIPE_PRICE_GROWTH_MONTHLY=...`

Frontend:

- `NEXT_PUBLIC_API_URL=https://api.protexi.com/api`
- `NEXT_PUBLIC_APP_URL=https://protexi.com`

---

## 10) Security and Operations

- Webhooks must validate signatures.
- Use idempotency keys for billing events.
- Never trust client-side payment success; rely on webhook.
- Keep strict tenant isolation in all SQL filters.
- Add audit log entries for platform actions (tenant created/suspended/etc.).

---

## 11) Minimal First Release (MVP)

If implementing quickly, ship this first:

1. `platform_owner` role and `/api/platform/organisations`.
2. Manual client creation endpoint (no payment yet).
3. Tenant admin invitation/reset flow.
4. Super admin UI list with expiry + status.
5. Add Stripe checkout + webhook in phase 2.

This gives immediate operational value while payment automation is added safely.

