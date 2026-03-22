from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Protexi API"
    debug: bool = False

    # Must match the auth service that signs JWTs (see docs)
    secret_key: str = "change-me-in-production-use-openssl-rand"
    algorithm: str = "HS256"

    database_url: str = "sqlite:///./protexi.db"
    upload_dir: str = "./uploads"

    # CORS (comma-separated origins)
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
