"""Activity module — user activity feed, audit log, operational timeline."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger("nj.api.routes.activity")

router = APIRouter(prefix="/api/activity", tags=["Activity"])

# ── Synthetic data ───────────────────────────────────────────────────────────

ACTIONS = [
    "FIR Registered", "FIR Updated", "Case Assigned", "Evidence Added",
    "Witness Statement Recorded", "Accused Arrested", "Charge Sheet Filed",
    "Case Diary Entry Added", "Report Generated", "Suspect Identified",
    "Search Warrant Issued", "CCTV Footage Requested", "Forensic Report Received",
    "Transfer Requested", "Case Closed", "Patrol Route Modified",
    "Alert Acknowledged", "Intelligence Input Added",
]

ACTIVITIES: list[dict[str, Any]] = []
for i in range(100):
    d = datetime.now() - timedelta(hours=random.randint(1, 720))
    ACTIVITIES.append({
        "id": i + 1,
        "action": random.choice(ACTIONS),
        "user": random.choice([
            "Insp. Rajesh Kumar", "SI Meena", "Insp. Kavya Sharma",
            "SI Naveen", "ASI Prakash", "Insp. Deshpande", "SI Anitha",
            "CP Admin", "DCP Operations", "IO Ramesh",
        ]),
        "role": random.choice(["INVESTIGATOR", "SUPERVISOR", "OFFICER", "ADMIN"]),
        "target_type": random.choice(["FIR", "Case", "Profile", "Report", "Alert", "Evidence"]),
        "target_id": f"FIR-{random.randint(100, 999)}-2026",
        "station": random.choice([
            "Vijayanagar PS", "Jayanagar PS", "Mysuru North PS",
            "Mangaluru Central PS", "Whitefield PS",
        ]),
        "details": random.choice([
            "New FIR registered for theft at commercial establishment",
            "Evidence log updated with forensic photographs",
            "Witness statement recorded under Section 161 CrPC",
            "Case diary entry added for day's investigation",
            "Accused identified through CCTV footage analysis",
            "Charge sheet filed in court for IPC 379/411",
            "Arrest warrant executed for absconding accused",
        ]),
        "ip_address": f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NJ-App/1.0",
        "timestamp": d.isoformat(),
    })

ACTIVITIES.sort(key=lambda a: a["timestamp"], reverse=True)


@router.get("/feed", summary="Recent activity feed")
async def activity_feed(
    limit: int = Query(20, ge=1, le=100),
    action: str | None = Query(None),
    user: str | None = Query(None),
):
    results = ACTIVITIES.copy()
    if action:
        results = [a for a in results if a["action"].lower() == action.lower()]
    if user:
        q = user.lower()
        results = [a for a in results if q in a["user"].lower()]

    return {"success": True, "data": results[:limit], "total": len(results)}


@router.get("/stats", summary="Activity statistics")
async def activity_stats():
    return {
        "success": True,
        "data": {
            "total_actions_24h": len([a for a in ACTIVITIES if datetime.fromisoformat(a["timestamp"]) > datetime.now() - timedelta(hours=24)]),
            "total_actions_7d": len(ACTIVITIES),
            "by_action": {act: len([a for a in ACTIVITIES if a["action"] == act]) for act in set(a["action"] for a in ACTIVITIES)},
            "by_user": sorted(
                [(u, len([a for a in ACTIVITIES if a["user"] == u])) for u in set(a["user"] for a in ACTIVITIES)],
                key=lambda x: x[1], reverse=True,
            )[:5],
            "peak_hour": random.choice(range(8, 11)),
        },
    }


@router.get("/export", summary="Export activity log")
async def export_activity(
    from_date: str | None = Query(None),
    to_date: str | None = Query(None),
    format: str = Query("json", regex="^(json|csv)$"),
):
    results = ACTIVITIES.copy()
    if from_date:
        results = [a for a in results if a["timestamp"] >= from_date]
    if to_date:
        results = [a for a in results if a["timestamp"] <= to_date]

    return {"success": True, "data": results, "total": len(results), "format": format}
