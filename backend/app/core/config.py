from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Protexi API"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str

    # JWT Auth
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Credentials / defaults that must be private
    DEFAULT_EMPLOYEE_PASSWORD: str
    MOCK_SEED_PASSWORD: str

    # Mock auth (flag) — when True, accept X-Mock-User-Email (+ optional X-Mock-User-Role) instead of Bearer for dev
    MOCK_AUTH: bool = False
    # Default user email when mock auth is used and no X-Mock-User-Email header is sent (optional)
    MOCK_USER_EMAIL: str | None = None
    PLATFORM_OWNER_EMAIL: str = "owner@protexi.com"
    PLATFORM_OWNER_PASSWORD: str | None = None
    PLATFORM_OWNER_NAME: str = "Platform Owner"

    # File uploads
    UPLOAD_DIR: str = "./uploads"
    STORAGE_PROVIDER: str = "local"  # local | s3
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    AWS_REGION: str | None = None
    S3_BUCKET: str | None = None
    S3_PREFIX: str = "uploads/"
    # Employee portal document controls
    PORTAL_DISABLE_DOWNLOAD: bool = True
    # inline | wrapped (wrapped returns base64 payload envelope)
    PORTAL_VIEW_MODE: str = "inline"

    # Multi-tenant / billing
    APP_BASE_URL: str | None = None
    FRONTEND_BASE_URL: str | None = None
    # Public app URL for invite links (defaults to local Next.js if unset)
    # e.g. https://app.protexi.com or http://127.0.0.1:3000

    # Tenant invite emails — off until you set True and configure SMTP.
    ENABLE_TENANT_INVITE_EMAIL: bool = False

    # Transactional email (tenant admin invites). If SMTP_HOST is unset, emails are skipped (logged).
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM: str | None = None  # e.g. "Protexi <noreply@yourdomain.com>"
    SMTP_USE_TLS: bool = True  # STARTTLS on 587
    SMTP_USE_SSL: bool = False  # SMTPS on 465 (set SMTP_USE_TLS False when True)
    API_BASE_URL: str | None = None
    PAYMENT_PROVIDER: str = "manual"
    STRIPE_SECRET_KEY: str | None = None
    STRIPE_WEBHOOK_SECRET: str | None = None
    STRIPE_PRICE_STARTER_MONTHLY: str | None = None
    STRIPE_PRICE_GROWTH_MONTHLY: str | None = None


@lru_cache()
def get_settings() -> Settings:
    return Settings()
