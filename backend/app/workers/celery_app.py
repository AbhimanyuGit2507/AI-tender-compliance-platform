"""
BidKaro — Celery Application
Two queues:
  - fast: I/O-bound tasks (ingestion, embedding, LLM calls), concurrency=4
  - heavy: CPU-bound doc compilation, concurrency=1
"""
from celery import Celery

from app.core.config import get_settings

_settings = get_settings()

celery_app = Celery(
    "bidkaro",
    broker=_settings.celery_broker_url,
    backend=_settings.celery_result_backend,
    include=[
        "app.workers.tasks_ingestion",
        "app.workers.tasks_generation",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,           # re-queue on worker crash
    worker_prefetch_multiplier=1,  # fair dispatch
    task_routes={
        "app.workers.tasks_ingestion.*": {"queue": "fast"},
        "app.workers.tasks_generation.*": {"queue": "heavy"},
    },
    task_default_queue="fast",
)
