"""BidKaro — Heavy task stubs (bid document compilation)."""
from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.tasks_generation.compile_bid_document", bind=True)
def compile_bid_document_task(self, *, tenant_id: str, tender_id: str, doc_type: str):
    """Placeholder — full implementation in Phase 3 (Bid Compiler)."""
    pass
