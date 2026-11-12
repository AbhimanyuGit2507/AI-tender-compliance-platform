"""
BidKaro — Consolidated Pydantic v2 Schemas for APIs and LLM Structured Outputs
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ── Canonical Enums & Literals ───────────────────────────────────────

ComplianceStatus = Literal[
    "COMPLIANT",
    "NON_COMPLIANT",
    "MISSING",
    "NEEDS_REVIEW",
    "UNVERIFIED",
    "NOT_APPLICABLE",
    "EXEMPTION_AVAILABLE",
    "PREFERENCE_AVAILABLE",
    "SUPERSEDED",
    "CONFLICTING",
]

ContractCategory = Literal["Works", "Goods", "Services", "EPC"]

ImpactType = Literal["major", "minor", "deadline_extension", "scope_change", "financial_criteria"]


# ── Auth & Tenant Schemas ────────────────────────────────────────────

class TenantBase(BaseModel):
    name: str = "Default Tenant"
    plan_tier: str = "trial"


class TenantRead(TenantBase):
    id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    company_name: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    tenant_id: str
    email: str
    is_anonymous: bool


class UserRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    role: str
    is_anonymous: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Tender & Document Schemas ────────────────────────────────────────

class TenderDocumentRead(BaseModel):
    id: uuid.UUID
    filename: str
    doc_category: str
    storage_key: str
    is_corrigendum: bool
    processing_status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TenderCreate(BaseModel):
    title: str = Field(default="Untitled Tender", max_length=255)
    reference_no: str | None = None
    authority: str | None = None


class TenderSummary(BaseModel):
    title: str
    authority: str
    reference_no: str
    closing_at: str | None = None
    estimated_value_inr: float | None = None
    emd_inr: float | None = None
    pbg_percent: float | None = None
    contract_period_years: float | None = None
    evaluation_type: str | None = None
    red_flag_count: int = 0
    summary_text: str = ""


class TenderRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    title: str
    reference_no: str | None
    authority: str | None
    closing_at: datetime | None
    estimated_value_inr: float | None
    emd_inr: float | None
    pbg_percent: float | None
    contract_period_years: float | None
    evaluation_type: str | None
    readiness_score: int
    status: str
    summary_jsonb: dict[str, Any] | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TenderDetailResponse(TenderRead):
    documents: list[TenderDocumentRead] = []


# ── Requirement & Compliance Schemas ─────────────────────────────────

class TenderRequirementRead(BaseModel):
    id: uuid.UUID
    tender_id: uuid.UUID
    category: str
    title: str
    exact_snippet: str = ""
    normalized_condition: str | None = None
    comparator: str | None = None
    numeric_value: float | None = None
    unit: str | None = None
    is_mandatory: bool = True
    page_number: int | None = None
    clause_ref: str | None = None
    cross_refs: list[str] = Field(default_factory=list, alias="cross_refs_jsonb")
    is_superseded: bool = False
    superseded_by_id: uuid.UUID | None = None
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_validator("cross_refs", mode="before")
    @classmethod
    def set_cross_refs(cls, v):
        return v or []

    @field_validator("exact_snippet", mode="before")
    @classmethod
    def set_exact_snippet(cls, v):
        return v or ""


class PreBidQueryDraft(BaseModel):
    clause_ref: str
    existing_provision: str
    requested_relaxation: str
    justification: str


class ComplianceResultRead(BaseModel):
    id: uuid.UUID
    tender_id: uuid.UUID
    requirement_id: uuid.UUID
    status: ComplianceStatus
    company_value_display: str | None = None
    deterministic_pass: bool | None = None
    rationale: str | None = None
    pre_bid_query_draft: PreBidQueryDraft | None = None
    requirement: TenderRequirementRead | None = None
    model_config = ConfigDict(from_attributes=True)


class ComplianceMatrixResponse(BaseModel):
    tender_id: uuid.UUID
    readiness_score: int
    total_requirements: int
    compliant_count: int
    non_compliant_count: int
    missing_count: int
    disqualification_blockers: list[ComplianceResultRead]
    items: list[ComplianceResultRead]


# ── Corrigendum Schemas ──────────────────────────────────────────────

class CorrigendumChangeRead(BaseModel):
    id: uuid.UUID
    tender_id: uuid.UUID
    corrigendum_doc_id: uuid.UUID
    target_req_id: uuid.UUID | None = None
    field_name: str
    original_text: str
    updated_text: str
    impact_type: ImpactType
    impact_summary: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── BOQ Schemas ──────────────────────────────────────────────────────

class BOQItemRead(BaseModel):
    id: uuid.UUID
    tender_id: uuid.UUID
    item_no: str | None
    description: str
    unit: str | None
    quantity: float | None
    estimated_rate: float | None
    amount: float | None
    remarks: str | None
    is_modified_by_corrigendum: bool = False
    model_config = ConfigDict(from_attributes=True)


class BOQSummaryResponse(BaseModel):
    tender_id: uuid.UUID
    total_items: int
    total_estimated_amount: float
    items: list[BOQItemRead]


# ── RAG & Copilot Schemas ────────────────────────────────────────────

class Citation(BaseModel):
    id: str
    page_number: int | None
    clause_ref: str | None
    section_path: str | None
    doc_id: str | None
    rrf_score: float
    content_preview: str
    cross_refs: list[str] = []


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=2000)
    top_k: int = Field(default=6, ge=1, le=20)
    include_superseded: bool = False


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
    suggested_actions: list[str] = []
    model_id: str
    cost_inr: float
    latency_ms: int


class ChatMessageRead(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    citations: list[Citation] = []
    suggested_actions: list[str] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Company Fact & Profile Schemas ───────────────────────────────────

class CompanyFactBase(BaseModel):
    fact_category: str  # financial | experience | certification | registration | legal
    fact_key: str       # turnover_fy2023 | net_worth | similar_work_proj1 | iso_9001
    raw_value: str
    numeric_value: float | None = None
    json_payload: dict[str, Any] | None = None
    valid_from: datetime | None = None
    valid_until: datetime | None = None


class CompanyFactCreate(CompanyFactBase):
    pass


class CompanyFactRead(CompanyFactBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    source_type: str = "manual"
    source_doc_id: uuid.UUID | None = None
    verification_status: str = "unverified"
    confidence: float = 1.0
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Generation & Document Compilation Schemas ────────────────────────

class DocumentGenerateRequest(BaseModel):
    doc_type: str = Field(..., description="e.g. cover_letter, non_blacklisting, tech_methodology, qc_plan, hse_plan")
    selected_requirements: list[uuid.UUID] = []
    custom_instructions: str | None = None
    custom_fields: dict[str, str] = Field(default_factory=dict)


class AuditFinding(BaseModel):
    clause_ref: str
    issue: str
    severity: Literal["critical", "warning", "info"]
    resolution: str


class GeneratedDocumentRead(BaseModel):
    id: uuid.UUID
    tender_id: uuid.UUID
    doc_type: str
    version_num: int
    sections: dict[str, Any]
    docx_storage_key: str | None
    audit_findings: list[AuditFinding] = []
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Plans & Credit Ledger Schemas ────────────────────────────────────

class PlanTier(BaseModel):
    tier_id: str
    name: str
    price_inr: int
    tender_credits: int
    features: list[str]


class CreditBalanceResponse(BaseModel):
    tenant_id: uuid.UUID
    plan_tier: str
    available_credits: int
    total_ai_spend_inr: float
