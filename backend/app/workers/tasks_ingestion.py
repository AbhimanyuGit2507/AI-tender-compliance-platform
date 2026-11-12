"""
BidKaro — Celery Ingestion Tasks (fast queue)
"""
from __future__ import annotations

import asyncio
import uuid

import structlog

from app.core.database import db_session
from app.models import CreditLedgerEntry, Tender, TenderDocument
from app.services.ingestion import IngestionEngine
from app.services.redis_events import publish_tender_progress_sync
from app.workers.celery_app import celery_app
from sqlalchemy import update

logger = structlog.get_logger(__name__)


@celery_app.task(
    name="app.workers.tasks_ingestion.ingest_document",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def ingest_document_task(
    self,
    *,
    tenant_id: str,
    tender_id: str,
    doc_id: str,
    storage_key: str,
    filename: str,
    doc_category: str,
    is_corrigendum: bool = False,
):
    """
    Celery task: reads file from storage, runs ingestion pipeline.
    Publishes progress updates to Redis Pub/Sub at each stage.
    Runs in worker-fast (concurrency=4).
    """
    logger.info("task_start", task="ingest_document", doc_id=doc_id, tender_id=tender_id)

    def _progress_cb(step: str, percent: int, extra: dict | None = None):
        publish_tender_progress_sync(
            tender_id=tender_id,
            step=step,
            percent=percent,
            extra=extra,
        )

    async def _run():
        from app.services.storage import get_storage_backend
        storage = get_storage_backend()
        file_content = await storage.get(storage_key)

        async with db_session() as db:
            engine = IngestionEngine(db)
            result = await engine.ingest_document(
                tenant_id=uuid.UUID(tenant_id),
                tender_id=uuid.UUID(tender_id),
                doc_id=uuid.UUID(doc_id),
                file_content=file_content,
                filename=filename,
                doc_category=doc_category,
                is_corrigendum=is_corrigendum,
                on_progress=_progress_cb,
            )
        return result

    try:
        return asyncio.run(_run())
    except Exception as exc:
        logger.error("task_failed", task="ingest_document", doc_id=doc_id, error=str(exc))
        # 1. Publish error event to Redis Pub/Sub
        publish_tender_progress_sync(
            tender_id=tender_id,
            step="failed",
            percent=0,
            error=str(exc),
        )

        # 2. Update DB status to FAILED and record automatic credit RELEASE
        try:
            async def _cleanup():
                async with db_session() as db:
                    await db.execute(
                        update(Tender)
                        .where(Tender.id == uuid.UUID(tender_id))
                        .values(status="FAILED")
                    )
                    await db.execute(
                        update(TenderDocument)
                        .where(TenderDocument.id == uuid.UUID(doc_id))
                        .values(processing_status="error", processing_error=str(exc))
                    )
                    release_entry = CreditLedgerEntry(
                        id=uuid.uuid4(),
                        tenant_id=uuid.UUID(tenant_id),
                        tender_id=uuid.UUID(tender_id),
                        operation_type="RELEASE",
                        credits_delta=25,
                        idempotency_key=f"release:{tender_id}:{doc_id}",
                    )
                    db.add(release_entry)
                    await db.commit()

            asyncio.run(_cleanup())
        except Exception as clean_err:
            logger.error("cleanup_release_failed", error=str(clean_err))

        raise self.retry(exc=exc)

