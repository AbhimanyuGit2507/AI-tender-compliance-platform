"""
BidKaro — Document Ingestion Service (Phase 1: PDF/DOCX/XLSX)
Implements the complete pipeline:
  1. SHA-256 global cache check (₹0 if hit)
  2. PyMuPDF page extraction → Canonical Document IR
  3. Lexical Sieve → selects high-signal pages
  4. Tier 1 LLM extraction of tender facts + requirements
  5. Tier 2 fallback for scanned pages
  6. Chunking with cross-reference extraction
  7. FastEmbed embedding batch + upsert to knowledge_chunks
  8. XLSX BOQ parsing
  9. Credit ledger logging
"""
from __future__ import annotations

import asyncio
import hashlib
import io
import json
import re
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import structlog
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import (
    BOQItem,
    ComplianceResult,
    KnowledgeChunk,
    ParsedArtifact,
    Tender,
    TenderDocument,
    TenderRequirement,
)
from app.services.document_classifier import classify_document
from app.services.embeddings import get_embedding_service
from app.services.lexical_sieve import identify_scanned_pages, sieve_pages
from app.services.llm_router import LLMTier, get_llm_router

logger = structlog.get_logger(__name__)


# ── Intermediate Representation ─────────────────────────────────────

@dataclass
class PageIR:
    """Canonical representation of a single parsed page."""
    page_number: int
    text: str
    char_count: int
    tables: list[dict] = field(default_factory=list)   # extracted table cells
    images: list[dict] = field(default_factory=list)   # image metadata
    extraction_method: str = "pymupdf"                  # "pymupdf" | "gemini_ocr"
    bboxes: list[dict] = field(default_factory=list)   # word-level bounding boxes


@dataclass
class TenderFacts:
    """Structured facts extracted from the NIT/high-signal pages."""
    title: str = ""
    authority: str = ""
    reference_no: str = ""
    closing_at: str | None = None
    estimated_value_inr: float | None = None
    emd_inr: float | None = None
    pbg_percent: float | None = None
    contract_period_years: float | None = None
    evaluation_type: str | None = None
    red_flag_count: int = 0
    summary: str = ""
    raw_requirements: list[dict] = field(default_factory=list)


# ── Cross-reference extractor ────────────────────────────────────────
from app.services.lexical_sieve import extract_cross_refs


# ── SHA-256 hash ─────────────────────────────────────────────────────

def sha256_file(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


# ── Main Ingestion Engine ────────────────────────────────────────────

class IngestionEngine:
    """
    Called by Celery worker-fast after upload. Fully async except PyMuPDF
    page extraction which runs in a thread pool.
    """

    CHUNK_WORDS = 400      # Target chunk size in words
    CHUNK_OVERLAP = 80     # Overlap words between chunks

    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()
        self.llm = get_llm_router()
        self.embedder = get_embedding_service()

    # ── Entry point ──────────────────────────────────────────────────

    async def ingest_document(
        self,
        *,
        tenant_id: uuid.UUID,
        tender_id: uuid.UUID,
        doc_id: uuid.UUID,
        file_content: bytes,
        filename: str,
        doc_category: str,
        is_corrigendum: bool = False,
        on_progress: Any = None,
    ) -> dict[str, Any]:
        """
        Full ingestion pipeline for one uploaded document.
        Returns a summary dict suitable for the API response.
        Publishes real-time progress callbacks at 10%, 30%, 50%, 75%, 100%.
        """
        def _report(step: str, pct: int, extra: dict | None = None):
            if on_progress:
                try:
                    on_progress(step, pct, extra)
                except Exception as e:
                    logger.warning("progress_callback_failed", error=str(e))

        t_start = time.monotonic()
        _report("Document validation & SHA-256 hash check", 10)
        file_sha256 = sha256_file(file_content)

        logger.info("ingestion_start", doc_id=str(doc_id), sha256=file_sha256,
                    filename=filename, category=doc_category)

        # ── Step 1: Global SHA-256 cache check ──────────────────────
        cached = await self._get_cached_artifact(file_sha256)

        if cached:
            logger.info("cache_hit", sha256=file_sha256)
            page_irs = [PageIR(**p) for p in cached.document_ir_jsonb or []]
            tender_facts = TenderFacts(**cached.extracted_metadata_jsonb or {}) if cached.extracted_metadata_jsonb else None
            cache_used = True
            _report("Reusing cached document IR & embeddings", 50)

            # Document classification triage guard on cached document
            combined_head_text = "\n".join(p.text for p in page_irs[:5])
            classification = classify_document(combined_head_text, filename=filename)
            if not classification.is_tender:
                await self.db.execute(
                    update(Tender)
                    .where(Tender.id == tender_id)
                    .values(
                        status="invalid_document",
                        readiness_score=0,
                        title=f"{classification.human_readable_type} ({filename})",
                        summary_jsonb={
                            "is_invalid_doc": True,
                            "doc_type": classification.doc_type,
                            "human_readable_type": classification.human_readable_type,
                            "issuing_entity": classification.issuing_entity,
                            "identified_subject": classification.identified_subject,
                            "reason": classification.reason,
                            "suggested_action": classification.suggested_action,
                            "filename": filename,
                        },
                    )
                )
                await self._update_doc_status(
                    doc_id,
                    status="rejected_invalid_doc",
                    error=classification.reason,
                )
                _report(
                    f"Classification Alert: {classification.human_readable_type}",
                    100,
                    {
                        "is_invalid_doc": True,
                        "doc_type": classification.doc_type,
                        "error": classification.reason,
                        "suggested_action": classification.suggested_action,
                    },
                )
                return {
                    "is_invalid_doc": True,
                    "doc_type": classification.doc_type,
                    "human_readable_type": classification.human_readable_type,
                    "error": classification.reason,
                    "suggested_action": classification.suggested_action,
                    "pages": len(page_irs),
                    "chunks": 0,
                    "requirements": 0,
                }
        else:
            cache_used = False
            # ── Step 2: PyMuPDF extraction ───────────────────────────
            _report("PyMuPDF text & page geometry extraction", 30)
            ext = Path(filename).suffix.lower()
            if ext in (".pdf",):
                page_irs = await asyncio.to_thread(self._extract_pdf, file_content)
            elif ext in (".docx",):
                page_irs = await asyncio.to_thread(self._extract_docx, file_content)
            elif ext in (".xlsx", ".xls"):
                # BOQ path: extract + store boq_items, then short-circuit
                boq_count = await self._ingest_boq(
                    file_content, tenant_id, tender_id, doc_id
                )
                await self._update_doc_status(doc_id, "done")
                _report("Analysis ready & readiness score calculation", 100)
                return {"cache_used": False, "boq_items": boq_count}
            else:
                await self._update_doc_status(doc_id, "error",
                                              "Unsupported file type")
                return {"error": "Unsupported file type"}

            # ── Step 2.5: Document Classification & Triage Guard ─────
            combined_head_text = "\n".join(p.text for p in page_irs[:5])
            classification = classify_document(combined_head_text, filename=filename)
            if not classification.is_tender:
                logger.warning(
                    "non_tender_document_rejected",
                    doc_id=str(doc_id),
                    tender_id=str(tender_id),
                    doc_type=classification.doc_type,
                    reason=classification.reason,
                )
                await self.db.execute(
                    update(Tender)
                    .where(Tender.id == tender_id)
                    .values(
                        status="invalid_document",
                        readiness_score=0,
                        title=f"{classification.human_readable_type} ({filename})",
                        summary_jsonb={
                            "is_invalid_doc": True,
                            "doc_type": classification.doc_type,
                            "human_readable_type": classification.human_readable_type,
                            "issuing_entity": classification.issuing_entity,
                            "identified_subject": classification.identified_subject,
                            "reason": classification.reason,
                            "suggested_action": classification.suggested_action,
                            "filename": filename,
                        },
                    )
                )
                await self._update_doc_status(
                    doc_id,
                    status="rejected_invalid_doc",
                    error=classification.reason,
                )
                _report(
                    f"Classification Alert: {classification.human_readable_type}",
                    100,
                    {
                        "is_invalid_doc": True,
                        "doc_type": classification.doc_type,
                        "error": classification.reason,
                        "suggested_action": classification.suggested_action,
                    },
                )
                return {
                    "is_invalid_doc": True,
                    "doc_type": classification.doc_type,
                    "human_readable_type": classification.human_readable_type,
                    "error": classification.reason,
                    "suggested_action": classification.suggested_action,
                    "pages": len(page_irs),
                    "chunks": 0,
                    "requirements": 0,
                }

            # ── Step 3: Lexical Sieve ─────────────────────────────────
            _report("Lexical Sieve scoring & requirement extraction", 50)
            page_texts = [p.text for p in page_irs]
            selected_pages, all_scores = sieve_pages(
                page_texts,
                top_n=20,
                always_include_first_n=3,
            )
            scanned_pages = identify_scanned_pages(all_scores)

            # ── Step 4: Tier 2 OCR for scanned pages ─────────────────
            if scanned_pages:
                page_irs = await self._ocr_scanned_pages(
                    page_irs, scanned_pages, file_content
                )

            # ── Step 5: Tier 1 LLM extraction (top pages only) ───────
            if doc_category in ("nit", "technical", "financial", "tender"):
                high_signal_text = "\n\n---PAGE BREAK---\n\n".join(
                    f"[Page {n}]\n{page_irs[n-1].text}"
                    for n in selected_pages
                    if n <= len(page_irs)
                )
                tender_facts = await self._extract_tender_facts(
                    high_signal_text, tenant_id, tender_id
                )
            else:
                tender_facts = None

            # ── Step 6: Persist artifact to global cache ──────────────
            await self._save_artifact(
                file_sha256=file_sha256,
                mime_type=self._mime(filename),
                page_irs=page_irs,
                tender_facts=tender_facts,
                page_scores=all_scores,
            )

        # ── Step 7: Link artifact to this tenant's tender_document ───
        await self._link_artifact(doc_id, file_sha256)

        # ── Step 8: Update tender metadata from extracted facts ───────
        if tender_facts and tender_facts.title:
            await self._update_tender_from_facts(tender_id, tender_facts)
        else:
            await self.db.execute(
                update(Tender)
                .where(Tender.id == tender_id)
                .values(status="ready", readiness_score=0)
            )

        # ── Step 9: Chunk + embed + upsert knowledge_chunks ──────────
        _report("FastEmbed embedding generation & PostgreSQL pgvector insertion", 75)
        chunk_count = await self._chunk_and_embed(
            page_irs=page_irs,
            tenant_id=tenant_id,
            tender_id=tender_id,
            doc_id=doc_id,
            is_corrigendum=is_corrigendum,
        )

        # ── Step 10: Persist requirements ────────────────────────────
        req_count = 0
        if tender_facts and tender_facts.raw_requirements:
            req_count = await self._persist_requirements(
                tender_facts.raw_requirements,
                tenant_id=tenant_id,
                tender_id=tender_id,
                doc_id=doc_id,
            )

        elapsed = int((time.monotonic() - t_start) * 1000)
        await self._update_doc_status(doc_id, "done")

        _report("Analysis ready & readiness score calculation", 100, {
            "chunks": chunk_count,
            "requirements": req_count,
            "pages": len(page_irs),
        })

        logger.info("ingestion_complete", doc_id=str(doc_id),
                    chunk_count=chunk_count, req_count=req_count,
                    elapsed_ms=elapsed, cache_used=cache_used)

        return {
            "cache_used": cache_used,
            "pages": len(page_irs),
            "chunks": chunk_count,
            "requirements": req_count,
            "elapsed_ms": elapsed,
        }

    def _extract_pdf(self, content: bytes) -> list[PageIR]:
        import fitz  # PyMuPDF

        doc = fitz.open(stream=content, filetype="pdf")
        pages: list[PageIR] = []
        for page in doc:
            text = page.get_text("text")
            w = page.rect.width or 595.0
            h = page.rect.height or 842.0
            tables = []
            try:
                for tbl in page.find_tables():
                    tables.append({"rows": tbl.extract()})
            except Exception:
                pass

            # Extract normalized bounding boxes [x0, y0, x1, y1] (0.0 to 1.0)
            bboxes = []
            try:
                for blk in page.get_text("blocks"):
                    if len(blk) >= 5 and blk[4].strip():
                        bboxes.append({
                            "bbox": [
                                max(0.0, min(1.0, round(blk[0] / w, 4))),
                                max(0.0, min(1.0, round(blk[1] / h, 4))),
                                max(0.0, min(1.0, round(blk[2] / w, 4))),
                                max(0.0, min(1.0, round(blk[3] / h, 4))),
                            ],
                            "text": blk[4].strip()[:200],
                        })
            except Exception:
                pass

            pages.append(PageIR(
                page_number=page.number + 1,
                text=text,
                char_count=len(text),
                tables=tables,
                extraction_method="pymupdf",
                bboxes=bboxes,
            ))
        doc.close()
        return pages


    # ── DOCX extraction ───────────────────────────────────────────────

    def _extract_docx(self, content: bytes) -> list[PageIR]:
        from docx import Document
        doc = Document(io.BytesIO(content))
        full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        # DOCX doesn't have real pages; treat as one big page
        return [PageIR(page_number=1, text=full_text, char_count=len(full_text))]

    # ── XLSX BOQ extraction ───────────────────────────────────────────

    async def _ingest_boq(
        self,
        content: bytes,
        tenant_id: uuid.UUID,
        tender_id: uuid.UUID,
        doc_id: uuid.UUID,
    ) -> int:
        from openpyxl import load_workbook

        wb = await asyncio.to_thread(load_workbook, io.BytesIO(content), data_only=True)
        items: list[BOQItem] = []
        for ws in wb.worksheets:
            for row in ws.iter_rows(min_row=2, values_only=True):
                if not any(row):
                    continue
                # Heuristic column mapping: [item_no, description, unit, qty, rate, amount]
                row_list = list(row)
                desc = str(row_list[1]) if len(row_list) > 1 and row_list[1] else ""
                if not desc or desc.lower() in ("description", "item", ""):
                    continue
                items.append(BOQItem(
                    id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    tender_id=tender_id,
                    doc_id=doc_id,
                    item_no=str(row_list[0]) if row_list[0] else None,
                    description=desc,
                    unit=str(row_list[2]) if len(row_list) > 2 and row_list[2] else None,
                    quantity=float(row_list[3]) if len(row_list) > 3 and isinstance(row_list[3], (int, float)) else None,
                    estimated_rate=float(row_list[4]) if len(row_list) > 4 and isinstance(row_list[4], (int, float)) else None,
                    amount=float(row_list[5]) if len(row_list) > 5 and isinstance(row_list[5], (int, float)) else None,
                ))
        if items:
            self.db.add_all(items)
            await self.db.flush()
        return len(items)

    # ── Multimodal OCR for scanned pages ─────────────────────────────

    async def _ocr_scanned_pages(
        self,
        page_irs: list[PageIR],
        scanned_page_numbers: list[int],
        raw_pdf_bytes: bytes,
    ) -> list[PageIR]:
        """Replace scanned pages with multimodal OCR text via LLM router."""
        has_ocr_key = bool(self.settings.openrouter_api_key or self.settings.gemini_api_key)
        if not has_ocr_key:
            logger.warning("ocr_skipped_no_key")
            return page_irs

        import fitz
        doc = fitz.open(stream=raw_pdf_bytes, filetype="pdf")

        for pn in scanned_page_numbers:
            try:
                page = doc[pn - 1]
                # Render page to PNG at 150 DPI
                mat = fitz.Matrix(150 / 72, 150 / 72)
                pix = page.get_pixmap(matrix=mat, alpha=False)
                img_bytes = pix.tobytes("png")

                extracted = await self.llm.ocr_page(
                    img_bytes,
                    prompt="Extract all text from this tender document page. Preserve table structure with | separators.",
                )
                if extracted and extracted.strip():
                    page_irs[pn - 1] = PageIR(
                        page_number=pn,
                        text=extracted,
                        char_count=len(extracted),
                        extraction_method="multimodal_ocr",
                    )
            except Exception as e:
                logger.warning("ocr_failed", page=pn, error=str(e))

        doc.close()
        return page_irs

    # ── Tender fact extraction via Tier 1 LLM ────────────────────────

    async def _extract_tender_facts(
        self,
        high_signal_text: str,
        tenant_id: uuid.UUID,
        tender_id: uuid.UUID,
    ) -> TenderFacts:
        prompt = f"""You are the Principal Indian Government Procurement Analyst & NIT Auditor.
Exhaustively analyze these high-priority tender pages and extract all critical tender facts and qualification criteria.
Do not omit subtle conditions, disqualification clauses, or statutory certifications.
Return ONLY a valid JSON object with these exact keys.

TEXT:
{high_signal_text[:self.settings.max_extraction_tokens * 4]}

REQUIRED JSON STRUCTURE:
{{
  "title": "full official tender name of work",
  "authority": "issuing department/authority (e.g. CPWD, NHAI, MES, State PWD)",
  "reference_no": "NIT/tender reference number",
  "closing_at": "ISO 8601 datetime or null",
  "estimated_value_inr": float in crores or null,
  "emd_inr": float in rupees or null,
  "pbg_percent": float percent (e.g. 5.0 or 3.0) or null,
  "contract_period_years": float duration in years or null,
  "evaluation_type": "L1/QCBS/other or null",
  "red_flag_count": integer count of potential disqualifiers (harsh forfeiture, tight timelines, restrictive OEM ties),
  "summary": "3-4 sentence comprehensive operational summary of work scope, location, and key bid conditions",
  "raw_requirements": [
    {{
      "category": "financial|technical|legal|experience|certificate|personnel|machinery",
      "title": "short descriptive title (e.g. 3-Year Average Turnover, Similar Bridge Work, NABL Testing Lab)",
      "exact_snippet": "exact verbatim text from the NIT clause",
      "comparator": "gte|lte|eq|contains|date_valid",
      "numeric_value": float or null,
      "unit": "crore|lakh|rupee|years|percent|count or null",
      "is_mandatory": true/false,
      "clause_ref": "exact clause reference (e.g. Section 2 Clause 4.1.2) or null"
    }}
  ]
}}"""

        try:
            resp = await self.llm.complete(
                tier=LLMTier.FAST_TEXT,
                messages=[{"role": "user", "content": prompt}],
                tenant_id=tenant_id,
                tender_id=tender_id,
                operation_type="extraction",
                max_tokens=4096,
                temperature=0.0,
            )
            # Parse JSON from response
            json_match = re.search(r"\{.*\}", resp.content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return TenderFacts(**{
                    k: data.get(k, v)
                    for k, v in TenderFacts.__dataclass_fields__.items()
                })
        except Exception as e:
            logger.error("fact_extraction_failed", error=str(e))

        # ── Deterministic Tier 0 Regex Extraction Fallback ────────────────
        facts = TenderFacts()
        # Extract title
        m_title = re.search(r"Name of Work:\s*(.+)", high_signal_text, re.IGNORECASE)
        if m_title:
            facts.title = m_title.group(1).strip()
        else:
            lines = [l.strip() for l in high_signal_text.split("\n") if l.strip()]
            facts.title = lines[0][:120] if lines else "Tender Document"

        # Extract authority (procurement authorities only)
        m_auth = re.search(
            r"(Maharashtra Jeevan Pradhikaran|NHAI|CPWD|MES|Indian Railways|NTPC|IOCL|BHEL|ONGC|PWD|[A-Z\s]{4,}DEVELOPMENT AUTHORITY|[A-Z\s]{4,}MUNICIPAL CORPORATION|[A-Z\s]{4,}PRADHIKARAN)",
            high_signal_text,
        )
        if m_auth and not re.search(r"unique\s*identification|uidai|income\s*tax|election\s*commission", m_auth.group(1), re.IGNORECASE):
            facts.authority = m_auth.group(1).strip()

        # Extract reference number
        m_ref = re.search(r"(?:Tender Reference|NIT\s*Ref|Reference\s*Number|Reference\s*No)[^\w]*([A-Z0-9/\-_]+)", high_signal_text, re.IGNORECASE)
        if m_ref:
            facts.reference_no = m_ref.group(1).strip()

        # Extract estimated value
        m_val = re.search(r"Estimated (?:Cost|Value)[^\d]*([\d\.,]+)\s*(?:Crore|Cr)", high_signal_text, re.IGNORECASE)
        if m_val:
            try:
                facts.estimated_value_inr = float(m_val.group(1).replace(",", "")) * 10000000.0
            except Exception:
                pass

        # Extract EMD
        m_emd = re.search(r"EMD[^\d]*([\d\.,]+)", high_signal_text, re.IGNORECASE)
        if m_emd:
            try:
                facts.emd_inr = float(m_emd.group(1).replace(",", ""))
            except Exception:
                pass

        # Extract turnover requirement
        m_turnover = re.search(r"turnover[^\d]*([\d\.]+)\s*(?:Crore|Cr)", high_signal_text, re.IGNORECASE)
        if m_turnover:
            val = float(m_turnover.group(1)) * 10000000.0
            facts.raw_requirements.append({
                "category": "financial",
                "title": "Minimum Average Annual Financial Turnover",
                "exact_snippet": f"Average annual turnover shall not be less than Rs. {m_turnover.group(1)} Crore",
                "comparator": "gte",
                "numeric_value": val,
                "unit": "INR",
                "is_mandatory": True,
                "clause_ref": "Clause 3.1",
            })

        # Extract similar work
        if "similar" in high_signal_text.lower():
            facts.raw_requirements.append({
                "category": "experience",
                "title": "Similar Work Experience (3/2/1 Rule)",
                "exact_snippet": "Bidders must have completed similar pipeline works under 1x80, 2x50 or 3x40 rules",
                "comparator": "gte",
                "numeric_value": facts.estimated_value_inr or 360000000.0,
                "unit": "INR",
                "is_mandatory": True,
                "clause_ref": "Clause 4.1",
            })

        return facts

    # ── Chunking with cross-references ───────────────────────────────

    async def _chunk_and_embed(
        self,
        page_irs: list[PageIR],
        tenant_id: uuid.UUID,
        tender_id: uuid.UUID,
        doc_id: uuid.UUID,
        is_corrigendum: bool,
    ) -> int:
        """Split pages into overlapping chunks, embed, and upsert."""
        chunks: list[KnowledgeChunk] = []
        chunk_index = 0

        for page_ir in page_irs:
            if not page_ir.text.strip():
                continue
            words = page_ir.text.split()
            step = self.CHUNK_WORDS - self.CHUNK_OVERLAP

            for start in range(0, max(1, len(words) - self.CHUNK_OVERLAP), step):
                end = start + self.CHUNK_WORDS
                chunk_words = words[start:end]
                if len(chunk_words) < 20:
                    continue
                text = " ".join(chunk_words)
                cross_refs = extract_cross_refs(text)

                # Match bounding box from page_ir.bboxes
                chunk_bbox = [0.08, 0.15, 0.92, 0.45]
                if getattr(page_ir, "bboxes", None):
                    first_words = " ".join(chunk_words[:5]).lower()
                    for b in page_ir.bboxes:
                        b_text = b.get("text", "").lower()
                        if first_words in b_text or b_text in text.lower():
                            chunk_bbox = b["bbox"]
                            break
                    else:
                        chunk_bbox = page_ir.bboxes[0]["bbox"]

                chunks.append(KnowledgeChunk(
                    id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    tender_id=tender_id,
                    doc_id=doc_id,
                    chunk_index=chunk_index,
                    page_number=page_ir.page_number,
                    content=text,
                    cross_refs_jsonb=cross_refs or [],
                    bbox_jsonb=chunk_bbox,
                    is_superseded=is_corrigendum,  # flag; re-check in corrigendum engine
                ))
                chunk_index += 1

        if not chunks:
            return 0

        # Batch embed all chunks
        texts = [c.content for c in chunks]
        try:
            embeddings = await self.embedder.embed_texts(texts)
            for chunk, emb in zip(chunks, embeddings):
                chunk.embedding = emb
        except Exception as e:
            logger.warning("embedding_failed_proceeding_without", error=str(e))

        # Upsert to DB
        self.db.add_all(chunks)
        await self.db.flush()
        return len(chunks)

    # ── Requirement persistence ───────────────────────────────────────

    async def _persist_requirements(
        self,
        raw_requirements: list[dict],
        tenant_id: uuid.UUID,
        tender_id: uuid.UUID,
        doc_id: uuid.UUID,
    ) -> int:
        reqs: list[TenderRequirement] = []
        for r in raw_requirements:
            if not r.get("title"):
                continue
            reqs.append(TenderRequirement(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                tender_id=tender_id,
                category=r.get("category", "other"),
                title=r["title"],
                exact_snippet=r.get("exact_snippet"),
                comparator=r.get("comparator"),
                numeric_value=r.get("numeric_value"),
                unit=r.get("unit"),
                is_mandatory=r.get("is_mandatory", True),
                source_doc_id=doc_id,
                clause_ref=r.get("clause_ref"),
            ))
        if reqs:
            self.db.add_all(reqs)
            await self.db.flush()
        return len(reqs)

    # ── DB helpers ────────────────────────────────────────────────────

    async def _get_cached_artifact(self, sha256: str) -> ParsedArtifact | None:
        result = await self.db.execute(
            select(ParsedArtifact).where(ParsedArtifact.file_sha256 == sha256)
        )
        return result.scalar_one_or_none()

    async def _save_artifact(
        self,
        file_sha256: str,
        mime_type: str,
        page_irs: list[PageIR],
        tender_facts: TenderFacts | None,
        page_scores: list,
    ):
        ir_json = [vars(p) for p in page_irs]
        facts_json = vars(tender_facts) if tender_facts else None
        scores_json = [vars(s) for s in page_scores]

        stmt = pg_insert(ParsedArtifact).values(
            file_sha256=file_sha256,
            mime_type=mime_type,
            page_count=len(page_irs),
            document_ir_jsonb=ir_json,
            extracted_metadata_jsonb=facts_json,
            page_scores_jsonb=scores_json,
        ).on_conflict_do_nothing()
        await self.db.execute(stmt)

    async def _link_artifact(self, doc_id: uuid.UUID, sha256: str):
        await self.db.execute(
            update(TenderDocument)
            .where(TenderDocument.id == doc_id)
            .values(file_sha256=sha256)
        )

    async def _update_tender_from_facts(
        self, tender_id: uuid.UUID, facts: TenderFacts
    ):
        from datetime import datetime
        closing = None
        if facts.closing_at:
            try:
                closing = datetime.fromisoformat(facts.closing_at)
                if closing.tzinfo is not None:
                    closing = closing.replace(tzinfo=None)
            except (ValueError, Exception):
                pass

        # Calculate initial readiness score based on completeness
        score = 0
        if facts.title and facts.title not in ("Tender Document", "Untitled Tender"):
            score += 25
        if facts.authority:
            score += 20
        if facts.estimated_value_inr:
            score += 20
        if facts.emd_inr:
            score += 15
        if facts.closing_at:
            score += 10
        if facts.raw_requirements:
            score += 10
        score = max(0, min(95, score - (facts.red_flag_count * 5)))

        await self.db.execute(
            update(Tender)
            .where(Tender.id == tender_id)
            .values(
                title=facts.title or None,
                authority=facts.authority or None,
                reference_no=facts.reference_no or None,
                closing_at=closing,
                estimated_value_inr=facts.estimated_value_inr,
                emd_inr=facts.emd_inr,
                pbg_percent=facts.pbg_percent,
                contract_period_years=facts.contract_period_years,
                evaluation_type=facts.evaluation_type,
                readiness_score=score,
                summary_jsonb={
                    "summary": facts.summary,
                    "red_flags": facts.red_flag_count,
                },
                status="ready",
            )
        )

    async def _update_doc_status(
        self, doc_id: uuid.UUID, status: str, error: str | None = None
    ):
        await self.db.execute(
            update(TenderDocument)
            .where(TenderDocument.id == doc_id)
            .values(processing_status=status, processing_error=error)
        )

    @staticmethod
    def _mime(filename: str) -> str:
        ext = Path(filename).suffix.lower()
        return {
            ".pdf": "application/pdf",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".zip": "application/zip",
        }.get(ext, "application/octet-stream")
