# Protexi Backend Push + Render Deployment (Single Guide)

This document covers everything in one place:
- Push only backend code to GitHub
- Deploy backend on Render
- Add all required environment variables
- Connect frontend to deployed backend

---

## 1) Push only backend to GitHub

Use these commands from the backend folder:

```bash
cd /Users/vimalshetty/Projects/protexi/backend
```

If backend repo is not initialized yet:

```bash
git init
git add .
git commit -m "initial backend commit"
git branch -M main
git remote add origin https://github.com/<your-username>/pretexi_backend.git
git push -u origin main
```

If repo is already initialized and remote exists:

```bash
git add .
git commit -m "update backend"
git push
```

If push fails with `403 permission denied`, login with the correct GitHub account and retry.

---

## 2) Create backend service on Render

1. Open Render Dashboard -> **New** -> **Web Service**  
2. Connect GitHub repo: `pretexi_backend`  
3. Configure:
   - **Runtime**: Python 3
   - **Build Command**:  
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**:  
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
4. Create service and wait for first deploy.

Health check URL after deploy:

```text
https://<your-render-service>.onrender.com/api/health
```

---

## 3) Create Render Postgres and set `DATABASE_URL`

1. Render Dashboard -> **New** -> **PostgreSQL**  
2. Create DB instance  
3. Copy connection string  
4. In backend Web Service -> **Environment** add `DATABASE_URL`

Important format for this project:

```text
DATABASE_URL=postgresql+psycopg://<user>:<password>@<host>:5432/<db_name>
```

If Render gives `postgres://` or `postgresql://`, convert it to `postgresql+psycopg://` for SQLAlchemy + psycopg.

---

## 4) Required environment variables on Render

Add these in Render Web Service -> **Environment**:

```env
APP_NAME=Protexi API
DEBUG=false
DATABASE_URL=postgresql+psycopg://<db_user>:<db_password>@<db_host>:5432/<db_name>
SECRET_KEY=<very-long-random-secret>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
UPLOAD_DIR=./uploads
DEFAULT_EMPLOYEE_PASSWORD=<default-password-for-auto-created-employee-users>
MOCK_SEED_PASSWORD=<seed-password-if-you-run-seed-script>
MOCK_AUTH=false
MOCK_USER_EMAIL=
```

Generate a secure secret key (example):

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

---

## 5) Run DB migrations on Render

After env vars are set, run migrations:

```bash
alembic upgrade head
```

You can run this using Render Shell for the service, or configure it as a pre-deploy command.

---

## 6) Frontend connection (Vercel/local) to Render backend

Set frontend env to deployed Render API:

```env
NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com/api
```

Restart frontend after env change.

---

## 7) CORS update (important)

Current backend CORS allowlist is in `backend/app/main.py`.  
Make sure your frontend domain is present there (for example Vercel production URL).

Example:

```python
allow_origins=[
    "http://localhost:3000",
    "https://protexi.vercel.app",
    "https://<your-frontend-domain>",
]
```

Then commit + push backend so Render redeploys.

---

## 8) Quick verification checklist

- `https://<render-service>/api/health` returns `{"status":"ok",...}`
- Login API works from frontend
- No CORS error in browser console
- Workers/Dashboard APIs load successfully
- Render logs show successful startup (no DB connection errors)

---

## 9) Common issues

- **403 on git push**: wrong GitHub account/token permissions  
- **DB connection error**: wrong `DATABASE_URL` format or credentials  
- **CORS blocked**: frontend domain missing in `allow_origins`  
- **500 after deploy**: migrations not run (`alembic upgrade head`)  
- **Auth issues**: missing/weak `SECRET_KEY` or mismatched env values
