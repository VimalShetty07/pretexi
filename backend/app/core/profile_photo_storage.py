"""Store worker profile photos in S3 (or DB blob when STORAGE_PROVIDER is not s3)."""

from __future__ import annotations

import boto3
from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

settings = get_settings()

MAX_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_MIME = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    }
)

MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def s3_enabled() -> bool:
    return settings.STORAGE_PROVIDER == "s3" and bool(settings.S3_BUCKET and settings.AWS_REGION)


def _s3_client():
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


def build_s3_key(organisation_id: str, worker_id: str, ext: str) -> str:
    prefix = (settings.S3_PREFIX or "uploads/").strip("/")
    ext = ext if ext.startswith(".") else f".{ext}"
    return f"{prefix}/workers/{organisation_id}/{worker_id}/profile{ext}"


async def read_and_validate_upload(file: UploadFile) -> tuple[bytes, str]:
    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image must be 5 MB or smaller")
    mime = (file.content_type or "").split(";")[0].strip().lower()
    if mime not in ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, WebP, or GIF images are allowed",
        )
    return raw, mime


def store_worker_profile_photo(
    *,
    organisation_id: str,
    worker_id: str,
    file_bytes: bytes,
    mime: str,
) -> tuple[str | None, bytes | None]:
    """Returns (s3_key_or_none, blob_or_none)."""
    if s3_enabled():
        ext = MIME_TO_EXT.get(mime, ".jpg")
        key = build_s3_key(organisation_id, worker_id, ext)
        extra = {"ContentType": mime, "CacheControl": "max-age=86400"}
        _s3_client().put_object(Bucket=settings.S3_BUCKET, Key=key, Body=file_bytes, **extra)
        return key, None
    return None, file_bytes


def delete_stored_object(s3_key: str | None) -> None:
    if not s3_key or not s3_enabled():
        return
    try:
        _s3_client().delete_object(Bucket=settings.S3_BUCKET, Key=s3_key)
    except Exception:
        pass


def presigned_get_url(s3_key: str | None, expires: int = 3600) -> str | None:
    if not s3_key or not s3_enabled():
        return None
    return _s3_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET, "Key": s3_key},
        ExpiresIn=expires,
    )


def load_profile_photo_bytes(worker) -> tuple[bytes, str] | None:
    """Load image bytes and mime from Worker. Returns None if no photo."""
    mime = worker.profile_photo_mime or "image/jpeg"
    if worker.profile_photo_s3_key and s3_enabled():
        obj = _s3_client().get_object(Bucket=settings.S3_BUCKET, Key=worker.profile_photo_s3_key)
        return obj["Body"].read(), mime
    if worker.profile_photo_data:
        return worker.profile_photo_data, mime
    return None
