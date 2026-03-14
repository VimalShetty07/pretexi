# Protexi EC2 + RDS Deployment README

This guide documents the exact flow used to deploy Protexi backend on AWS EC2 with PostgreSQL on AWS RDS, and frontend on Vercel.

It is written so a fresh Cursor session can continue without missing context.

---

## 1) Current Architecture

- Frontend: Vercel (`pretexi` repo)
- Backend API: EC2 (Dockerized FastAPI)
- Database: AWS RDS PostgreSQL (`pretexi-db`)

Recommended API URL shape after domain setup:

- `https://api.<your-domain>/api`

Temporary API URL shape (without domain):

- `http://<ec2-public-ip>/api`

---

## 2) Repositories

- Frontend repo: `https://github.com/VimalShetty07/pretexi`
- Backend repo: `https://github.com/VimalShetty07/pretexi_backend`

Backend fix already pushed:

- Commit includes `openpyxl` in `requirements.txt` to avoid startup crash in container.

---

## 3) EC2 Setup (Completed Pattern)

### 3.1 Create EC2

- Ubuntu 22.04 LTS
- Instance type: `t3.small` (preferred) or `t3.micro` (budget)
- Storage: 20GB+ gp3
- Elastic IP attached (stable public IP)
- Key file created: `pretexi-key.pem`

### 3.2 Security group rules

Inbound:

- SSH 22 (from My IP)
- HTTP 80 (0.0.0.0/0)
- HTTPS 443 (0.0.0.0/0)

### 3.3 SSH command

```bash
chmod 400 "/Users/<you>/Projects/protexi/confedential/pretexi-key.pem"
ssh -i "/Users/<you>/Projects/protexi/confedential/pretexi-key.pem" ubuntu@<EC2_PUBLIC_IP>
```

---

## 4) Base Server Provisioning

Run on EC2:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ca-certificates gnupg lsb-release ufw
```

Firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
sudo ufw status
```

Docker + Compose plugin:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
newgrp docker

docker --version
docker compose version
```

---

## 5) Backend App Deployment on EC2

### 5.1 Clone repo

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/VimalShetty07/pretexi_backend.git
cd pretexi_backend
```

### 5.2 Create environment file

```bash
cp .env.example .env
nano .env
```

Set real values in `.env`:

- `DATABASE_URL`
- `SECRET_KEY`
- `DEBUG=false`
- `DEFAULT_EMPLOYEE_PASSWORD`
- `MOCK_SEED_PASSWORD`

### 5.3 Add container files (if missing)

`Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

`docker-compose.yml`:

```yaml
services:
  api:
    build: .
    container_name: pretexi_api
    env_file:
      - .env
    ports:
      - "8000:8000"
    restart: unless-stopped
```

### 5.4 Build and run

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f --tail=100
```

Health check:

```bash
curl http://127.0.0.1:8000/api/health
```

---

## 6) AWS RDS PostgreSQL Setup

Create RDS:

- Engine: PostgreSQL
- DB identifier: `pretexi-db`
- DB name: `protexi`
- Port: `5432`
- Public access: `No`
- VPC: same as EC2

Security groups:

- Add DB SG rule to allow PostgreSQL 5432 from EC2 SG.

Use RDS URL in backend `.env`:

```env
DATABASE_URL=postgresql+psycopg://<user>:<password>@<rds-endpoint>:5432/protexi
```

If using external/non-AWS DB that requires SSL:

```env
DATABASE_URL=postgresql+psycopg://<user>:<password>@<host>:5432/protexi?sslmode=require
```

---

## 7) Run Migrations and Seed

After DB URL is set:

```bash
docker compose down
docker compose up -d --build
docker compose exec api alembic upgrade head
```

Optional seed:

```bash
docker compose exec api python seed_mock_users.py
docker compose exec api python seed_workers.py
```

---

## 8) Nginx Reverse Proxy

Install:

```bash
sudo apt install -y nginx
```

Create config:

```bash
sudo nano /etc/nginx/sites-available/pretexi_api
```

Example config:

```nginx
server {
    listen 80;
    server_name <EC2_PUBLIC_IP_OR_DOMAIN>;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/pretexi_api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Test:

```bash
curl http://127.0.0.1/api/health
curl http://<EC2_PUBLIC_IP>/api/health
```

---

## 9) Frontend Vercel Config

Set in Vercel project env:

```env
NEXT_PUBLIC_API_URL=https://<api-domain>/api
```

Temporary (before domain/SSL):

```env
NEXT_PUBLIC_API_URL=http://<EC2_PUBLIC_IP>/api
```

Redeploy frontend after changing env values.

---

## 10) Known Issues and Fixes

### A) Backend container restart loop: `No module named openpyxl`

Cause:

- `openpyxl` missing from `requirements.txt`.

Fix:

- Add `openpyxl` to `requirements.txt`.
- Rebuild container: `docker compose up -d --build`.

### B) Alembic migration error: `connection refused localhost:5432`

Cause:

- `.env` uses local PostgreSQL URL but no local Postgres server is running in EC2.

Fix:

- Point `DATABASE_URL` to RDS endpoint.
- Restart container and run migration again.

### C) `git pull` blocked by local changes on EC2 deployment copy

Fix:

```bash
git reset --hard
git pull origin main
```

Use only on deployment clone where local edits are disposable.

### D) Reboot and IP

- Reboot does not change IP.
- Stop/start can change IP unless Elastic IP is attached.

---

## 11) Security Checklist

- Never commit `.env`.
- Never commit `.pem` key files.
- Keep key files under ignored path (example: `/confedential/`).
- Use strong `SECRET_KEY`.
- Keep DB private (no public access).
- Open only required inbound ports (22, 80, 443).

---

## 12) Useful Runtime Commands

```bash
# Service status
docker compose ps

# Follow logs
docker compose logs -f --tail=100

# Restart
docker compose restart api

# Rebuild and restart
docker compose down
docker compose up -d --build

# Health
curl http://127.0.0.1:8000/api/health

# Migrations
docker compose exec api alembic upgrade head
```

---

## 13) Next Recommended Upgrade

- Add `systemd` unit for Compose auto-start on boot.
- Add CloudWatch/uptime monitoring.
- Add HTTPS with domain + Certbot.
- Add CI/CD (GitHub Actions) for automatic EC2 deploys.

