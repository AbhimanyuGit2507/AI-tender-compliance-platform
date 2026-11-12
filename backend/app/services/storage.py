"""
BidKaro — Storage Backend
Supports local filesystem (dev) and Cloudflare R2 / S3-compatible (prod).
Configured via STORAGE_BACKEND env var.
"""
from __future__ import annotations

import os
import uuid
from pathlib import Path

import structlog

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class LocalStorageBackend:
    """Dev-friendly local filesystem storage."""

    def __init__(self, base_path: str):
        p = Path(base_path)
        if not p.is_absolute():
            repo_uploads = Path(__file__).resolve().parent.parent.parent.parent / base_path.lstrip("./")
            backend_uploads = Path(__file__).resolve().parent.parent.parent / base_path.lstrip("./")
            if repo_uploads.exists():
                p = repo_uploads
            elif backend_uploads.exists():
                p = backend_uploads
            else:
                p = repo_uploads
        self.base = p
        self.base.mkdir(parents=True, exist_ok=True)

    async def put(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        dest = self.base / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        logger.info("storage_put_local", key=key, size=len(data))
        return key

    async def get(self, key: str) -> bytes:
        return (self.base / key).read_bytes()

    async def presigned_url(self, key: str, expires_seconds: int = 3600) -> str:
        # For local dev, return a relative URL (served by FastAPI static files)
        return f"/storage/{key}"

    async def delete(self, key: str):
        path = self.base / key
        if path.exists():
            path.unlink()


class R2StorageBackend:
    """Cloudflare R2 via boto3 S3-compatible client."""

    def __init__(self):
        import boto3
        settings = get_settings()
        self._s3 = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",
        )
        self._bucket = settings.r2_bucket_name

    async def put(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        import asyncio
        await asyncio.to_thread(
            self._s3.put_object,
            Bucket=self._bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        return key

    async def get(self, key: str) -> bytes:
        import asyncio
        resp = await asyncio.to_thread(
            self._s3.get_object, Bucket=self._bucket, Key=key
        )
        return resp["Body"].read()

    async def presigned_url(self, key: str, expires_seconds: int = 3600) -> str:
        import asyncio
        return await asyncio.to_thread(
            self._s3.generate_presigned_url,
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=expires_seconds,
        )

    async def delete(self, key: str):
        import asyncio
        await asyncio.to_thread(
            self._s3.delete_object, Bucket=self._bucket, Key=key
        )


def make_storage_key(tenant_id: uuid.UUID, tender_id: uuid.UUID, filename: str) -> str:
    """Generate a deterministic, path-safe storage key."""
    import re
    safe_name = re.sub(r"[^\w.\-]", "_", filename)[:100]
    return f"{tenant_id}/{tender_id}/{uuid.uuid4().hex[:8]}_{safe_name}"


_storage_instance = None


def get_storage_backend():
    global _storage_instance
    if _storage_instance is None:
        settings = get_settings()
        if settings.storage_backend == "local":
            _storage_instance = LocalStorageBackend(settings.storage_local_path)
        elif settings.storage_backend in ("r2", "s3"):
            _storage_instance = R2StorageBackend()
        else:
            raise ValueError(f"Unknown storage backend: {settings.storage_backend}")
    return _storage_instance
