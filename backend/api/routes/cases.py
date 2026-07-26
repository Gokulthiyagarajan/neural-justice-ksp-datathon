"""Cases module — FIR case management with synthetic data."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger("nj.api.routes.cases")

router = APIRouter(prefix="/api/cases", tags=["Cases"])

# ── Synthetic data ───────────────────────────────────────────────────────────

CRIME_TYPES = [
    "Theft", "Burglary", "Assault", "Robbery", "Murder", "Attempt to Murder",
    "Rape", "Kidnapping", "Cyber Fraud", "Domestic Violence", "Chain Snatching",
    "Vehicle Theft", "Drug Offence", "Arson", "Dacoity", "Extortion",
    "Criminal Trespass", "Cheating", "Forgery", "Hurt/Grevious Hurt",
]
STATUSES = ["registered", "under_investigation", "chargesheeted", "closed", "convicted"]
STATIONS = [
    "Vijayanagar PS", "Jayanagar PS", "Malleshwaram PS", "Whitefield PS",
    "Mysuru North PS", "Mysuru South PS", "Mangaluru Central PS", "Belagavi City PS",
]

CASES: list[dict[str, Any]] = []
for i in range(60):
    base = datetime.now() - timedelta(days=random.randint(1, 180))
    crime_type = random.choice(CRIME_TYPES)
    status = random.choice(STATUSES)
    case: dict[str, Any] = {
        "id": i + 1,
        "crime_no": f"FIR-{100 + i}-2026",
        "crime_type": crime_type,
        "status": status,
        "station": random.choice(STATIONS),
        "district": random.choice(["Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Mandya", "Dakshina Kannada", "Belagavi"]),
        "occurrence_date": base.strftime("%Y-%m-%d"),
        "occurrence_time": f"{random.randint(0, 23):02d}:{random.randint(0, 59):02d}",
        "filing_date": (base + timedelta(hours=random.randint(1, 24))).strftime("%Y-%m-%d"),
        "brief_facts": random.choice([
            "Complainant reported theft of valuables from residence.",
            "Victim assaulted by unknown persons during a road rage incident.",
            "House broken into by forcing open the rear window.",
            "Vehicle stolen from parking area overnight.",
            "Victim defrauded through an online phishing scam.",
            "Gold chain snatched by two persons on a motorcycle.",
            "Domestic dispute escalated to physical assault.",
        ]),
        "victim_name": random.choice([
            "Anita Sharma", "Ravi Kumar", "Meena Devi", "Prakash Rao",
            "Lakshmi Narayan", "Suresh Gowda", "Kavya Bhat",
        ]),
        "accused_name": random.choice([
            "Under Investigation", "Manoj Kumar", "Suresh Patil",
            "Ramesh Shetty", "Arun Reddy", "Kiran Naik",
        ]),
        "officer_assigned": random.choice([
            "Inspector Rajesh Kumar", "SI Meena", "Inspector Kavya Sharma",
            "SI Naveen", "Inspector Deshpande", "ASI Prakash",
        ]),
        "severity": random.choice(["low", "medium", "medium", "high", "critical"]),
        "is_repeat_offender": random.choice([True, False, False, False]),
        "days_open": random.randint(1, 180),
        "lat": 12.9 + random.uniform(-0.8, 0.8),
        "lng": 77.5 + random.uniform(-0.8, 0.8),
        "created_at": (datetime.now() - timedelta(days=random.randint(1, 180))).isoformat(),
        "updated_at": datetime.now().isoformat(),
    }
    CASES.append(case)


# Sort by newest first
CASES.sort(key=lambda c: c["created_at"], reverse=True)


# ── Routes ───────────────────────────────────────────────────────────────────


@router.get("", summary="List cases")
async def list_cases(
    status: str | None = Query(None),
    crime_type: str | None = Query(None),
    station: str | None = Query(None),
    district: str | None = Query(None),
    search: str | None = Query(None),
    severity: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    results = CASES.copy()
    if status:
        results = [c for c in results if c["status"] == status]
    if crime_type:
        results = [c for c in results if c["crime_type"].lower() == crime_type.lower()]
    if station:
        results = [c for c in results if station.lower() in c["station"].lower()]
    if district:
        results = [c for c in results if c["district"].lower() == district.lower()]
    if severity:
        results = [c for c in results if c["severity"] == severity]
    if search:
        q = search.lower()
        results = [c for c in results if q in c["crime_no"].lower() or q in c["brief_facts"].lower()]

    total = len(results)
    start = (page - 1) * per_page
    items = results[start:start + per_page]
    return {"success": True, "data": items, "total": total, "page": page, "per_page": per_page}


@router.get("/{case_id}", summary="Get case details")
async def get_case(case_id: int):
    for c in CASES:
        if c["id"] == case_id:
            return {"success": True, "data": c}
    raise HTTPException(404, "Case not found")


@router.get("/summary/stats", summary="Case statistics summary")
async def case_stats():
    total = len(CASES)
    open_cases = len([c for c in CASES if c["status"] in ("registered", "under_investigation")])
    closed = total - open_cases
    return {
        "success": True,
        "data": {
            "total_cases": total,
            "open_cases": open_cases,
            "closed_cases": closed,
            "solved_rate": round((closed / total * 100) if total else 0, 1),
            "by_severity": {
                "low": len([c for c in CASES if c["severity"] == "low"]),
                "medium": len([c for c in CASES if c["severity"] == "medium"]),
                "high": len([c for c in CASES if c["severity"] == "high"]),
                "critical": len([c for c in CASES if c["severity"] == "critical"]),
            },
            "by_status": {s: len([c for c in CASES if c["status"] == s]) for s in set(c["status"] for c in CASES)},
            "top_crime_types": sorted(
                [(t, len([c for c in CASES if c["crime_type"] == t])) for t in set(c["crime_type"] for c in CASES)],
                key=lambda x: x[1], reverse=True,
            )[:5],
        },
    }
