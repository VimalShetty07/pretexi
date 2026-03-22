# Per-tenant document checklist

Each **organisation (client)** has its own checklist **template**: ordered rows with a description and optional **category** (used to group items on the worker Checklist tab).

## Backend

- Models and routes live under `backend/app/` (`checklist.py` router, SQLAlchemy models).
- **Important:** The Next app proxies **all** `/api/*` to `API_PROXY_TARGET`. Either:
  - merge these routes into your main Protexi API deployment, **or**
  - run a single backend that implements both your existing endpoints and this checklist module.

### Endpoints (prefix `/api`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/organisations/{organisation_id}/checklist-template` | List template rows |
| PUT | `/organisations/{organisation_id}/checklist-template` | Replace template (`{ "items": [ { "description", "category?", "sort_order" } ] }`) |
| GET | `/workers/{worker_id}/checklist?organisation_id=` | Merged template + per-worker state |
| POST | `/workers/.../checklist/{item_id}/upload` | Multipart `file` |
| POST | `.../verify`, `.../reject`, `.../mark-na` | State transitions |
| GET | `.../download/{doc_id}` | File download |

`platform_owner` must pass `organisation_id` on worker checklist and upload/verify/download URLs. Tenant users may omit it; if present it must match the JWT organisation.

### JWT

Decode uses `SECRET_KEY` and `ALGORITHM` (same as your login issuer). Claims: `organisation_id` (or `org_id`), `role`, optional nested `user` object.

## Frontend

- **Organisation** page: configure template for the logged-in tenant.
- **Super admin → Client** detail: configure template for that client (`platform_owner` only for save).
- **Worker** detail: checklist GET includes `organisation_id` when known (`worker.organisation_id` or current user). All checklist actions append the same query for platform users.

Ensure `GET /workers/:id` returns `organisation_id` for cross-tenant (platform) views when possible.
