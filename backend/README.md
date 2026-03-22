# Protexi backend (checklist module)

FastAPI service with **per-organisation document checklist templates** and worker upload/verify flows.

## Merge into your main API

If you already run a larger Protexi API on Render:

1. Copy `app/models.py` checklist tables + `app/routers/checklist.py` + `app/schemas.py` (checklist-related) + `app/auth_deps.py` helpers into your project.
2. Register the router with prefix `/api` (same paths the frontend calls).
3. Run migrations / `create_all` for the new tables.
4. Ensure `SECRET_KEY` / JWT signing matches your login service (`python-jose` decode).

## Local run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # edit SECRET_KEY to match frontend login issuer
uvicorn app.main:app --reload --port 8000
```

Point Next.js at this service:

```env
# protexi/.env.local
API_PROXY_TARGET=http://127.0.0.1:8000/api
```

**Note:** This build only exposes checklist + health. Your deployed app still needs auth, workers, dashboard, etc. on the same origin **or** you split traffic (not supported by the default Next rewrite).

## Environment

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | JWT HMAC secret (must match token issuer) |
| `ALGORITHM` | Default `HS256` |
| `DATABASE_URL` | `sqlite:///./protexi.db` or Postgres URL |
| `UPLOAD_DIR` | Where checklist files are stored |
| `CORS_ORIGINS` | Comma-separated origins |

## API

- `GET/PUT /api/organisations/{organisation_id}/checklist-template` — define which documents each client requires.
- `GET /api/workers/{worker_id}/checklist?organisation_id=` — merged template + state (platform users must pass `organisation_id`).
- `POST` upload / verify / reject / mark-na / download — same paths as the admin UI.

Replacing the template **deletes** existing template rows and **cascades** worker checklist state and DB rows; uploaded files on disk are removed when possible.
