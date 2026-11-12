"""
BidKaro — Consolidated 14-Table SQLAlchemy 2.x Models
All tables use UUID PKs. Every user-data table carries tenant_id for isolation.
pgvector, tsvector, and GIN indexes are declared here and created via Alembic.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ── Helpers ─────────────────────────────────────────────────────────

def _uuid() -> uuid.UUID:
    return uuid.uuid4()


def _now() -> datetime:
    return datetime.utcnow()


# ════════════════════════════════════════════════════════════════════
# TABLE 1 — tenants
# ════════════════════════════════════════════════════════════════════

class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    plan_tier: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="free"
    )  # "free" | "starter" | "pro" | "enterprise"
    credit_balance: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    suspension_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    account_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # relationships
    users: Mapped[list[User]] = relationship("User", back_populates="tenant")
    tenders: Mapped[list[Tender]] = relationship("Tender", back_populates="tenant")


# ════════════════════════════════════════════════════════════════════
# TABLE 2 — users
# ════════════════════════════════════════════════════════════════════

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    email: Mapped[str | None] = mapped_column(String(320), unique=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="owner"
    )  # "owner" | "member" | "viewer"
    is_anonymous: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    # OAuth Google Subject / ID
    google_id: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True, index=True)
    # anonymous session_id for pre-signup session migration
    anon_session_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    # Onboarding wizard completion flag
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    # Display name / full name
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    tenant: Mapped[Tenant] = relationship("Tenant", back_populates="users")

    __table_args__ = (
        Index("ix_users_tenant", "tenant_id"),
    )


# ════════════════════════════════════════════════════════════════════
# TABLE 3 — parsed_artifacts  (GLOBAL SHA-256 deduplication cache)
# ════════════════════════════════════════════════════════════════════

class ParsedArtifact(Base):
    __tablename__ = "parsed_artifacts"

    file_sha256: Mapped[str] = mapped_column(String(64), primary_key=True)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Full Intermediate Representation: list of PageIR dicts
    document_ir_jsonb: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Extracted high-level metadata (title, authority, dates, etc.)
    extracted_metadata_jsonb: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Lexical sieve score per page (cached for reuse)
    page_scores_jsonb: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ════════════════════════════════════════════════════════════════════
# TABLE 4 — tenders
# ════════════════════════════════════════════════════════════════════

class Tender(Base):
    __tablename__ = "tenders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    reference_no: Mapped[str | None] = mapped_column(String(128), nullable=True)
    authority: Mapped[str | None] = mapped_column(String(255), nullable=True)
    closing_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    estimated_value_inr: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    emd_inr: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    pbg_percent: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    contract_period_years: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    evaluation_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    readiness_score: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    status: Mapped[str] = mapped_column(
        String(64), nullable=False, server_default="pending"
    )  # "pending" | "processing" | "ready" | "error"
    # Cached summary for the Tender Copilot Workspace top strip
    summary_jsonb: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    tenant: Mapped[Tenant] = relationship("Tenant", back_populates="tenders")
    documents: Mapped[list[TenderDocument]] = relationship(
        "TenderDocument", back_populates="tender"
    )
    requirements: Mapped[list[TenderRequirement]] = relationship(
        "TenderRequirement", back_populates="tender"
    )

    __table_args__ = (
        Index("ix_tenders_tenant", "tenant_id"),
        Index("ix_tenders_closing", "closing_at"),
    )


# ════════════════════════════════════════════════════════════════════
# TABLE 5 — tender_documents
# ════════════════════════════════════════════════════════════════════

class TenderDocument(Base):
    __tablename__ = "tender_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    tender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False
    )
    file_sha256: Mapped[str] = mapped_column(
        String(64), ForeignKey("parsed_artifacts.file_sha256"), nullable=True
    )
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    doc_category: Mapped[str] = mapped_column(
        String(64), nullable=False, server_default="tender"
    )  # "nit" | "technical" | "financial" | "boq" | "annexure" | "corrigendum" | "prebid" | "company"
    storage_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    version_num: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    is_corrigendum: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    processing_status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="queued"
    )  # "queued" | "processing" | "done" | "error"
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    tender: Mapped[Tender] = relationship("Tender", back_populates="documents")
    artifact: Mapped[ParsedArtifact | None] = relationship("ParsedArtifact")

    __table_args__ = (
        Index("ix_tender_docs_tender", "tender_id"),
    )


# ════════════════════════════════════════════════════════════════════
# TABLE 6 — tender_requirements
# ════════════════════════════════════════════════════════════════════

class TenderRequirement(Base):
    __tablename__ = "tender_requirements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    tender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # "financial" | "technical" | "legal" | "experience" | "certificate" | "other"
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    exact_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    # LLM-normalized version of the condition
    normalized_condition: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Comparator for deterministic checks: "gte" | "lte" | "eq" | "contains" | "date_valid"
    comparator: Mapped[str | None] = mapped_column(String(32), nullable=True)
    numeric_value: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    source_doc_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    clause_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Outgoing cross-references extracted during chunking
    cross_refs_jsonb: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    is_superseded: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    superseded_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    tender: Mapped[Tender] = relationship("Tender", back_populates="requirements")
    compliance_results: Mapped[list[ComplianceResult]] = relationship(
        "ComplianceResult", back_populates="requirement"
    )

    __table_args__ = (
        Index("ix_req_tender", "tender_id"),
        Index("ix_req_tenant", "tenant_id"),
        Index("ix_req_clause", "clause_ref", postgresql_using="gin",
              postgresql_ops={"clause_ref": "gin_trgm_ops"}),
    )


# ════════════════════════════════════════════════════════════════════
# TABLE 7 — corrigendum_changes
# ════════════════════════════════════════════════════════════════════

class CorrigendumChange(Base):
    __tablename__ = "corrigendum_changes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    tender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False
    )
    corrigendum_doc_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    target_req_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    field_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    original_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    impact_type: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )  # "deadline_change" | "requirement_relaxed" | "requirement_added" | "boq_change" | "other"
    impact_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (Index("ix_corrigendum_tender", "tender_id"),)


# ════════════════════════════════════════════════════════════════════
# TABLE 8 — boq_items
# ════════════════════════════════════════════════════════════════════

class BOQItem(Base):
    __tablename__ = "boq_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    tender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False
    )
    doc_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    item_no: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str | None] = mapped_column(String(64), nullable=True)
    quantity: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    estimated_rate: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    amount: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_modified_by_corrigendum: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (Index("ix_boq_tender", "tender_id"),)


# ════════════════════════════════════════════════════════════════════
# TABLE 9 — knowledge_chunks  (the RAG vector store)
# ════════════════════════════════════════════════════════════════════

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    tender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False
    )
    doc_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    section_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    clause_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # Populated via trigger or Alembic-generated computed column
    search_vector: Mapped[Any | None] = mapped_column(TSVECTOR, nullable=True)
    # pgvector embedding — dim set by EMBEDDING_DIM setting
    embedding: Mapped[Any | None] = mapped_column(Vector(384), nullable=True)
    # Outgoing cross-refs: list of clause_refs this chunk references
    cross_refs_jsonb: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # Normalized bounding box [x0, y0, x1, y1] (0.0 to 1.0)
    bbox_jsonb: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    is_superseded: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_chunks_tender", "tender_id"),
        Index("ix_chunks_tenant", "tenant_id"),
        # GIN index on tsvector for full-text search
        Index("ix_chunks_fts", "search_vector", postgresql_using="gin"),
        # HNSW index on embedding for fast ANN search
        Index(
            "ix_chunks_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        # pg_trgm index on clause_ref for fuzzy matching
        Index(
            "ix_chunks_clause_trgm",
            "clause_ref",
            postgresql_using="gin",
            postgresql_ops={"clause_ref": "gin_trgm_ops"},
        ),
    )


# ════════════════════════════════════════════════════════════════════
# TABLE 10 — company_facts
# ════════════════════════════════════════════════════════════════════

class CompanyFact(Base):
    __tablename__ = "company_facts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    fact_category: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # "turnover" | "net_worth" | "project" | "certificate" | "legal" | "contact"
    fact_key: Mapped[str] = mapped_column(String(128), nullable=False)
    raw_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    numeric_value: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    json_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    source_type: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )  # "manual" | "extracted" | "imported"
    source_doc_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    verification_status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="unverified"
    )  # "unverified" | "pending" | "verified" | "rejected"
    confidence: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_facts_tenant_category", "tenant_id", "fact_category"),
    )


# ════════════════════════════════════════════════════════════════════
# TABLE 11 — compliance_results
# ════════════════════════════════════════════════════════════════════

class ComplianceResult(Base):
    __tablename__ = "compliance_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    tender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False
    )
    requirement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tender_requirements.id", ondelete="CASCADE"), nullable=False
    )
    # 10 canonical compliance states
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="unverified"
    )
    # Human-readable display of the company's matching value
    company_value_display: Mapped[str | None] = mapped_column(Text, nullable=True)
    # UUIDs of company_facts records used to reach this conclusion
    matched_fact_ids_jsonb: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # True = computed deterministically by code; False = LLM judgment call
    deterministic_pass: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    pre_bid_query_draft: Mapped[str | None] = mapped_column(Text, nullable=True)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    requirement: Mapped[TenderRequirement] = relationship(
        "TenderRequirement", back_populates="compliance_results"
    )

    __table_args__ = (
        Index("ix_compliance_tender", "tender_id"),
        Index("ix_compliance_tenant_req", "tenant_id", "requirement_id"),
    )


# ════════════════════════════════════════════════════════════════════
# TABLE 12 — conversations_and_messages
# ════════════════════════════════════════════════════════════════════

class ConversationMessage(Base):
    __tablename__ = "conversations_and_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    tender_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    # "user" | "assistant" | "system"
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # Source citations: [{doc, page, clause, bbox}]
    citations_jsonb: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # Suggested action chips to display below the message
    suggested_actions_jsonb: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # Sliding window conversation summary (stored on assistant messages)
    rolling_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_messages_tenant_tender", "tenant_id", "tender_id"),
        Index("ix_messages_created", "created_at"),
    )


# ════════════════════════════════════════════════════════════════════
# TABLE 13 — generated_documents
# ════════════════════════════════════════════════════════════════════

class GeneratedDocument(Base):
    __tablename__ = "generated_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    tender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False
    )
    doc_type: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # "cover_letter" | "technical_proposal" | "boq" | "undertaking" | "full_bid"
    version_num: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    # {section_id: {title, content, status, action_required_placeholders}}
    sections_jsonb: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Storage key of the compiled .docx file
    docx_storage_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    # Two-layer audit findings
    audit_findings_jsonb: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="draft"
    )  # "draft" | "generating" | "ready" | "error"
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (Index("ix_gendocs_tender", "tender_id"),)


# ════════════════════════════════════════════════════════════════════
# TABLE 14 — credit_ledger_and_ai_runs
# ════════════════════════════════════════════════════════════════════

class CreditLedgerEntry(Base):
    __tablename__ = "credit_ledger_and_ai_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    tender_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    operation_type: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # "signup_bonus" | "plan_purchase" | "ingestion" | "rag_query" | "compliance" | "bid_generate" | "audit"
    # Negative = debit, Positive = credit
    credits_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    # Prevents duplicate charges on retry
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True)
    # AI run metadata (null for plan purchases / manual credits)
    model_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_inr: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Credit expiration date (null for consumed debits, timestamp for grants)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_ledger_tenant", "tenant_id"),
        Index("ix_ledger_created", "created_at"),
    )


# ════════════════════════════════════════════════════════════════════
# TABLE 15 — audit_logs  (Enterprise Security & SOC 2 Compliance Trail)
# ════════════════════════════════════════════════════════════════════

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    action: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # "auth.login", "auth.otp_verify", "auth.google_login", "tender.upload", "compliance.override", "credits.top_up", "vault.update"
    resource_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    details_jsonb: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_audit_tenant_created", "tenant_id", "created_at"),
        Index("ix_audit_action", "action"),
    )


# ════════════════════════════════════════════════════════════════════
# TABLE 16 — email_logs  (Transactional Email Delivery History)
# ════════════════════════════════════════════════════════════════════

class EmailLog(Base):
    __tablename__ = "email_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    recipient_email: Mapped[str] = mapped_column(String(320), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    template_type: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # "otp" | "welcome" | "low_credits" | "credit_expiry" | "tender_ready"
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="sent"
    )  # "sent" | "delivered" | "failed" | "dev_fallback"
    brevo_message_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_email_recipient", "recipient_email"),
        Index("ix_email_template", "template_type"),
        Index("ix_email_created", "created_at"),
    )


# ════════════════════════════════════════════════════════════════════
# TABLE 17 — system_settings (Dynamic Platform Parameters & Economics)
# ════════════════════════════════════════════════════════════════════

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str] = mapped_column(String(32), server_default="general")
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)


# ════════════════════════════════════════════════════════════════════
# TABLE 18 — subscription_plans (Live Outcome-Oriented Tender Packs)
# ════════════════════════════════════════════════════════════════════

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # "single_pack", "growth_pack", "pro_contractor"
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    badge: Mapped[str | None] = mapped_column(String(64), nullable=True)
    price_inr: Mapped[float] = mapped_column(Float, nullable=False)
    credits: Mapped[int] = mapped_column(Integer, nullable=False)
    effective_per_tender: Mapped[str | None] = mapped_column(String(64), nullable=True)
    features: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    is_popular: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

