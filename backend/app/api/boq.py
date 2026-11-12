"""
BidKaro — Bill of Quantities (BOQ) Router
GET /api/boq/{tender_id}        — View structured BOQ line items
GET /api/boq/{tender_id}/export — Download as formatted .xlsx file
"""
from __future__ import annotations

import io
import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models import BOQItem, Tender
from app.schemas.schemas import BOQItemRead, BOQSummaryResponse

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/boq", tags=["boq"])


@router.get("/{tender_id}", response_model=BOQSummaryResponse)
async def get_boq_items(
    tender_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Retrieve all structured BOQ items for a tender."""
    tender_res = await db.execute(
        select(Tender).where(Tender.id == tender_id, Tender.tenant_id == user.tenant_id)
    )
    if not tender_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Tender not found")

    res = await db.execute(
        select(BOQItem)
        .where(BOQItem.tender_id == tender_id, BOQItem.tenant_id == user.tenant_id)
        .order_by(BOQItem.item_no.asc())
    )
    items = res.scalars().all()

    total_amount = sum(float(it.amount or 0) for it in items)
    return BOQSummaryResponse(
        tender_id=tender_id,
        total_items=len(items),
        total_estimated_amount=round(total_amount, 2),
        items=[BOQItemRead.model_validate(it) for it in items],
    )


@router.get("/{tender_id}/export")
async def export_boq_xlsx(
    tender_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Export the tender BOQ to an Excel (.xlsx) file with professional formatting."""
    import openpyxl
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter

    tender_res = await db.execute(
        select(Tender).where(Tender.id == tender_id, Tender.tenant_id == user.tenant_id)
    )
    tender = tender_res.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    res = await db.execute(
        select(BOQItem)
        .where(BOQItem.tender_id == tender_id, BOQItem.tenant_id == user.tenant_id)
        .order_by(BOQItem.item_no.asc())
    )
    items = res.scalars().all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Schedule of Rates (BOQ)"

    # Header styling
    title_font = Font(name="Arial", size=14, bold=True, color="0B1F33")
    sub_font = Font(name="Arial", size=10, italic=True, color="64748B")
    hdr_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
    hdr_fill = PatternFill(start_color="0B1F33", end_color="0B1F33", fill_type="solid")
    corrigendum_fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")  # Light amber

    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )

    # Document Header
    ws.merge_cells("A1:G1")
    ws["A1"] = f"BILL OF QUANTITIES (BOQ) — {tender.title}"
    ws["A1"].font = title_font

    ws.merge_cells("A2:G2")
    ws["A2"] = f"Tender Ref: {tender.reference_no or 'N/A'} | Authority: {tender.authority or 'N/A'}"
    ws["A2"].font = sub_font

    headers = [
        "Item No.",
        "Description of Work / Item",
        "Unit",
        "Quantity",
        "Estimated Rate (INR)",
        "Estimated Amount (INR)",
        "Corrigendum / Remarks",
    ]

    ws.append([])  # blank row 3
    ws.append(headers)  # row 4

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=4, column=col_idx)
        cell.font = hdr_font
        cell.fill = hdr_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    start_row = 5
    for idx, item in enumerate(items, start=start_row):
        row_data = [
            item.item_no or str(idx - start_row + 1),
            item.description,
            item.unit or "Each",
            float(item.quantity) if item.quantity else 0.0,
            float(item.estimated_rate) if item.estimated_rate else 0.0,
            float(item.amount) if item.amount else 0.0,
            item.remarks or ("Modified by Corrigendum" if item.is_modified_by_corrigendum else ""),
        ]
        ws.append(row_data)

        # Style data cells
        for c_idx in range(1, 8):
            cell = ws.cell(row=idx, column=c_idx)
            cell.border = thin_border
            if item.is_modified_by_corrigendum:
                cell.fill = corrigendum_fill

            if c_idx in (4, 5, 6):
                cell.number_format = "#,##0.00"

    # Total row
    last_row = start_row + len(items)
    ws.cell(row=last_row, column=2, value="TOTAL ESTIMATED TENDER VALUE:").font = Font(bold=True)
    ws.cell(row=last_row, column=6, value=f"=SUM(F{start_row}:F{last_row - 1})")
    ws.cell(row=last_row, column=6).font = Font(bold=True)
    ws.cell(row=last_row, column=6).number_format = "₹#,##0.00"

    # Auto-adjust column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(min(max_len + 3, 50), 12)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"BOQ_{tender.reference_no or str(tender_id)[:8]}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
