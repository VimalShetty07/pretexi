# Protexi Production Readiness Checklist

Last reviewed: 2026-04-09
Reviewer: Cursor assistant

Status legend:
- `READY`: validated and acceptable for production.
- `PENDING`: must be completed before go-live.
- `RECOMMENDED`: not a hard blocker, but strongly advised.

## 1) Release Hygiene

- [ ] `PENDING` Clean working tree before release cut.
  - Evidence: multiple modified/untracked files in `git status`.
- [ ] `PENDING` Split current mixed changes into focused PRs (backend migration/auth/leave + frontend nav/hr/payroll/workers).
- [ ] `PENDING` Ensure demo seed files are excluded from production runbooks/deploy jobs:
  - `backend/seed_checklist_demo.py`
  - `backend/seed_compliance_demo.py`
- [ ] `PENDING` Create release tag and changelog entry for first production rollout.

## 2) Database & Migrations

- [x] `READY` Alembic schema is now on latest head.
  - Evidence: `alembic current` -> `d1e2f3a4b5c6 (head)`.
- [ ] `PENDING` Run migration test on staging snapshot (upgrade from current prod baseline to head).
- [ ] `PENDING` Take pre-deploy DB backup and document rollback steps.
- [ ] `PENDING` Confirm migration ordering policy to avoid future multi-head divergence.

## 3) Environment & Secrets

- [ ] `PENDING` Set production env with secure values (`SECRET_KEY`, `DATABASE_URL`, SMTP, Stripe, storage).
- [ ] `PENDING` Ensure production disables mock modes:
  - Frontend: `NEXT_PUBLIC_MOCK_AUTH=false`
  - Backend: `MOCK_AUTH=false`
- [ ] `PENDING` Confirm frontend API target uses production backend URL (`API_PROXY_TARGET`).
- [ ] `PENDING` Rotate all dev/default credentials before launch.

## 4) Backend Runtime Safety

- [ ] `PENDING` Remove hardcoded CORS list in `backend/app/main.py`; read allowed origins from environment.
- [ ] `PENDING` Stop using `Base.metadata.create_all(bind=engine)` during app startup in production.
  - Keep schema changes migration-only via Alembic.
- [x] `READY` Health endpoint exists: `GET /api/health`.
- [ ] `PENDING` Add structured logging + central log sink configuration.
- [ ] `PENDING` Add API rate limiting for auth and sensitive endpoints.

## 5) Frontend Build & Quality

- [x] `READY` `npm run build` passes and generates production bundle.
- [ ] `PENDING` `npm run lint` has warnings (12) that should be cleaned before go-live.
- [ ] `PENDING` Validate all critical user journeys on staging with real auth:
  - login/logout
  - dashboard overview
  - workers CRUD
  - leave request/approval
  - payroll views
  - document upload/verify

## 6) CI/CD & Deployment Process

- [ ] `PENDING` Add CI pipeline (none detected under `.github/workflows`).
  - Minimum gates: lint, build, migration check.
- [ ] `PENDING` Add deployment automation (no Dockerfile/workflow discovered in repo root paths checked).
- [ ] `PENDING` Define deployment strategy (blue/green, rolling, or maintenance window).
- [ ] `PENDING` Add post-deploy smoke test checklist and owner assignment.

## 7) Testing & Validation

- [ ] `PENDING` Add automated test suites (no test files detected for frontend/backend in scanned patterns).
- [ ] `PENDING` Add API contract tests for auth, workers, leave, and dashboard endpoints.
- [ ] `RECOMMENDED` Add load/performance smoke checks for dashboard and workers list.

## 8) Security & Compliance

- [ ] `PENDING` Add dependency vulnerability audit to release process:
  - frontend: `npm audit` (or SCA equivalent)
  - backend: pip advisory scanning (e.g., `pip-audit`)
- [x] `READY` Python dependency consistency check passes (`pip check`).
- [ ] `PENDING` Verify TLS, HSTS, secure headers, and cookie/token expiration policy in production environment.
- [ ] `PENDING` Confirm data retention/GDPR handling and audit log policy for PII.

## 9) Operations & Monitoring

- [ ] `PENDING` Add error monitoring (e.g., Sentry or equivalent).
- [ ] `PENDING` Add uptime, latency, and 5xx alerting.
- [ ] `PENDING` Define on-call response and incident runbook.

---

## Pre-Go-Live Minimum Gate (Must Be Green)

- [ ] Working tree clean + release branch created.
- [ ] Staging deploy successful.
- [ ] Staging DB migration upgrade tested from prod-like snapshot.
- [ ] Production env/secrets verified; mock auth disabled.
- [ ] CORS/env configuration fixed; no `create_all` startup schema mutation.
- [ ] CI checks green (lint/build/migration).
- [ ] Smoke test completed and signed off by owner.

