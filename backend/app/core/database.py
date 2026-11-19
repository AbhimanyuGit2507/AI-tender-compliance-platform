"""
BidKaro — Async Database Engine & Session Management (SQLAlchemy 2.x)
"""
import os
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import AsyncAdaptedQueuePool, NullPool

from app.core.config import get_settings


class Base(DeclarativeBase):
    """Declarative base for all 14 BidKaro models."""
    pass


_engine = None
_async_session_factory = None


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        is_worker = os.environ.get("CELERY_WORKER", "").lower() in ("1", "true", "yes")
        is_testing = "pytest" in sys.modules or settings.app_env == "test"

        # Prepare connect_args for SSL if on remote cloud database (Render / Neon / Supabase)
        connect_args = {}
        if "render.com" in settings.database_url or "oregon-postgres" in settings.database_url or "dpg-" in settings.database_url:
            import ssl
            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE
            connect_args["ssl"] = ssl_ctx

        if is_worker or is_testing:
            _engine = create_async_engine(
                settings.database_url,
                poolclass=NullPool,
                echo=settings.app_debug,
                future=True,
                connect_args=connect_args,
            )
        else:
            _engine = create_async_engine(
                settings.database_url,
                poolclass=AsyncAdaptedQueuePool,
                pool_size=settings.db_pool_size,
                max_overflow=settings.db_max_overflow,
                pool_pre_ping=True,
                pool_recycle=1800,
                echo=settings.app_debug,
                future=True,
                connect_args=connect_args,
            )
    return _engine


def get_session_factory():
    global _async_session_factory
    if _async_session_factory is None:
        _async_session_factory = async_sessionmaker(
            bind=get_engine(),
            expire_on_commit=False,
            class_=AsyncSession,
        )
    return _async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: yields an async DB session per request."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Async context manager for use outside request handlers (e.g., Celery)."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
