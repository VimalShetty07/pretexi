from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import Base, engine
from app.models import models as _models  # noqa: F401 - ensure SQLAlchemy models are imported
from app.routers import (
    alerts,
    auth,
    bgverify,
    calendar,
    dashboard,
    documents,
    leave,
    platform,
    portal,
    reports,
    saas,
    workers,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


settings = get_settings()

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Main app routers
app.include_router(auth.router, prefix="/api")
app.include_router(workers.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(calendar.router, prefix="/api")
app.include_router(bgverify.router, prefix="/api")
app.include_router(leave.router, prefix="/api")
app.include_router(portal.router, prefix="/api")
app.include_router(platform.router, prefix="/api")
app.include_router(saas.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "protexi-api"}
