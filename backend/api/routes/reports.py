"""FastAPI routes — FIR PDF report generation and download.

``GET /api/reports/fir/{crime_no}/pdf``
    Generate and download a PDF report for a specific FIR.
"""

from __future__ import annotations

import logging
import re
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from backend.pdf.engine import generate_fir_pdf

logger = logging.getLogger("nj.api.routes.reports")

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get(
    "/fir/{crime_no}/pdf",
    summary="Download FIR report as PDF",
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "PDF file generated successfully",
        },
        404: {"description": "FIR not found"},
        500: {"description": "PDF generation failed"},
    },
)
async def download_fir_pdf(crime_no: str):
    """Generate a PDF report for the specified FIR case."""
    try:
        # For demo purposes, create a sample FIR data payload.
        # In production, this data would come from the database.
        fir_data = {
            "crime_no": crime_no,
            "occurrence_date": "2026-03-15",
            "occurrence_time": "14:30",
            "crime_type": "Burglary",
            "station_name": "Vijayanagar Police Station",
            "district_name": "Bengaluru Urban",
            "status": "under_investigation",
            "officer_name": "Inspector Rajesh Kumar",
            "filing_date": "2026-03-15",
            "brief_facts": (
                "Complainant reported that unknown person(s) broke into "
                "the residence through the rear window lock using a metal "
                "bar. Items of value including jewellery and electronic "
                "devices were stolen. Estimated loss: approximately "
                "Rs. 5,00,000. CCTV footage from neighbouring premises "
                "is being analysed."
            ),
            "evidence_items": [
                {"id": "EV-001", "type": "Document", "description": "Written complaint statement", "seized_from": "Complainant", "status": "In Custody"},
                {"id": "EV-002", "type": "Photograph", "description": "Scene of crime photographs (12)", "seized_from": "Scene", "status": "In Custody"},
                {"id": "EV-003", "type": "Forensic", "description": "Fingerprint lifts from window frame", "seized_from": "Scene", "status": "Under Analysis"},
            ],
            "witnesses": [
                {"id": "WIT-001", "name": "Anita Sharma", "age": 42, "gender": "Female", "relation": "Neighbour", "status": "Examined"},
                {"id": "WIT-002", "name": "Ravi Kumar", "age": 55, "gender": "Male", "relation": "Eye Witness", "status": "Yet to Examine"},
            ],
            "case_diary": [
                {"date": "2026-03-15", "officer": "Inspector Rajesh Kumar", "entry": "FIR registered. Investigation initiated. Scene of crime visited and photographed."},
                {"date": "2026-03-16", "officer": "SI Meena", "entry": "Neighbourhood inquiry conducted. Three potential witnesses identified."},
                {"date": "2026-03-18", "officer": "Inspector Rajesh Kumar", "entry": "CCTV footage collected from 4 nearby premises. Suspect vehicle identified."},
            ],
            "investigation_timeline": [
                {"event": "FIR Registered", "date": "2026-03-15", "officer": "Inspector Rajesh Kumar"},
                {"event": "Investigation Assigned", "date": "2026-03-15", "officer": "Inspector Rajesh Kumar"},
                {"event": "Scene Examined", "date": "2026-03-15", "officer": "SI Meena"},
                {"event": "Witnesses Questioned", "date": "2026-03-16", "officer": "SI Meena"},
                {"event": "CCTV Footage Collected", "date": "2026-03-18", "officer": "Inspector Rajesh Kumar"},
            ],
        }

        pdf_bytes = generate_fir_pdf(fir_data)

        # SECURITY (F-025): crime_no comes from the URL path and was interpolated
        # verbatim into the Content-Disposition header, allowing header/attachment
        # spoofing. Restrict it to a safe charset.
        safe_crime_no = re.sub(r"[^A-Za-z0-9._-]", "", crime_no) or "report"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="FIR_{safe_crime_no}.pdf"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )

    except Exception as exc:
        logger.exception("Failed to generate PDF for FIR %s", crime_no)
        raise HTTPException(
            status_code=500,
            detail=f"PDF generation failed: {exc}",
        ) from exc
