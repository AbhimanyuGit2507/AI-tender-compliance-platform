"""
BidKaro — Application Configuration
All config loaded from environment variables via Pydantic Settings v2.
Never import this at module level outside app startup; always use get_settings().
"""
from functools import lru_cache
from typing import Literal
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ───────────────────────────────────────────────────
    app_env: Literal["development", "staging", "production"] = "development"
    app_secret_key: str = Field(default="bidkaro-dev-secret-key-32-chars-long-minimum!", min_length=32)
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_debug: bool = False

    # ── Database ──────────────────────────────────────────────────────
    database_url: str = Field(
        default="postgresql+asyncpg://bidkaro:bidkaro@localhost:5432/bidkaro"
    )
    database_url_sync: str = Field(
        default="postgresql+psycopg2://bidkaro:bidkaro@localhost:5432/bidkaro"
    )
    db_pool_size: int = 10
    db_max_overflow: int = 20

    # ── Redis / Celery ────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # ── Object Storage ────────────────────────────────────────────────
    storage_backend: Literal["local", "r2", "s3"] = "local"
    storage_local_path: str = "./uploads"
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "bidkaro-documents"
    r2_public_url: str = ""

    # ── LLM Architecture Mode (Option A: Unified OpenRouter Hub) ─────
    llm_provider: Literal["openrouter", "multi_direct", "ollama"] = "openrouter"

    # ── OpenRouter Unified Provider (Tiers 1, 2 & 3 via 1 wallet) ────
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    # Tier 1: Frontier Extraction & RAG (Gemini 2.0 Flash 1M context, state-of-the-art JSON)
    openrouter_model_fast_text: str = "google/gemini-2.0-flash-001"
    # Tier 2: Multimodal OCR (Gemini 2.0 Flash Vision for scanned pages and tables)
    openrouter_model_ocr: str = "google/gemini-2.0-flash-001"
    # Tier 3: Gold Standard Technical Methodology (Claude 3.5 Sonnet — #1 model in the world for engineering prose)
    openrouter_model_reasoning: str = "anthropic/claude-3.5-sonnet"
    # Tier 4: Forensic Pre-Flight Submission Audit (OpenAI o3-mini / Claude 3.5 Sonnet / DeepSeek-R1)
    openrouter_model_audit: str = "openai/o3-mini"

    # ── Direct Multi-Provider Keys (Option B / Fallbacks) ────────────
    model_fast_text: str = "llama-3.1-8b-instant"
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"

    model_multimodal_ocr: str = "gemini-2.0-flash"
    gemini_api_key: str = ""

    model_reasoning: str = "llama-3.3-70b-versatile"
    model_reasoning_provider: Literal["groq", "gemini", "openrouter", "ollama"] = "openrouter"

    # ── Local / Free LLM Options (Ollama) ───────────────────────────
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_model: str = "llama3.1:8b"

    # ── Embeddings & Cross-Encoder Reranker (10/10 RAG) ──────────────
    embedding_provider: Literal["fastembed", "gemini", "openai"] = "fastembed"
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384
    openai_api_key: str = ""

    reranker_enabled: bool = True
    reranker_model: str = "ms-marco-TinyBERT-L-2-v2"
    reranker_top_k: int = 6

    # ── Token / Cost Budget Controls ──────────────────────────────────
    max_extraction_tokens: int = 32_000
    cost_tier1_input_inr: float = 8.30   # Gemini 2.0 Flash (~$0.10/1M)
    cost_tier1_output_inr: float = 33.20 # Gemini 2.0 Flash (~$0.40/1M)
    cost_tier2_input_inr: float = 8.30   # Gemini 2.0 Flash Vision
    cost_tier2_output_inr: float = 33.20
    cost_tier3_input_inr: float = 11.62  # DeepSeek-V3 671B (~$0.14/1M)
    cost_tier3_output_inr: float = 23.24 # DeepSeek-V3 671B (~$0.28/1M)

    # ── Credit System ─────────────────────────────────────────────────
    free_trial_credits: int = 25
    credits_per_tender: int = 100
    anon_max_cost_inr: float = 0.15

    # ── Razorpay Payment Gateway ──────────────────────────────────────
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    # ── Google OAuth2 SSO ─────────────────────────────────────────────
    google_client_id: str = ""
    google_client_secret: str = ""

    # ── Rate Limiting & Usage Shield ──────────────────────────────────
    rate_limit_per_minute: int = 120
    auth_rate_limit_per_minute: int = 20
    trial_rate_limit_per_day: int = 1

    # ── Email Service (Brevo / Sendinblue Transactional & Opt-In) ─────
    brevo_api_key: str = ""
    brevo_sender_email: str = "noreply@bidkaro.com"
    brevo_sender_name: str = "BidKaro Procurement AI"
    brevo_list_id: int | None = None
    frontend_url: str = "http://localhost:5173"
    otp_expire_seconds: int = 300  # 5 minutes

    # ── Admin Authorization ───────────────────────────────────────────
    admin_emails: str = "admin@bidkaro.com,director@shivalikinfra.in,director@larsen-infra.in"

    # ── CORS ──────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v: str) -> str:
        return v  # kept as str; split at usage

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton. Use via Depends(get_settings) in routes."""
    return Settings()
