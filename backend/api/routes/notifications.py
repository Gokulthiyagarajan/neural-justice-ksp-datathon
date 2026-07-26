"""Notifications module — real-time alerts, push notifications, oper alerts."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger("nj.api.routes.notifications")

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# ── Synthetic data ───────────────────────────────────────────────────────────

TYPES = ["alert", "alert", "alert", "warning", "info", "info", "operational"]
CATEGORIES = ["crime_alert", "weather", "traffic", "operational", "system", "intelligence"]
SEVERITIES = ["low", "medium", "medium", "high", "critical"]

NOTIFICATIONS: list[dict[str, Any]] = []
for i in range(50):
    d = datetime.now() - timedelta(hours=random.randint(0, 720))
    ntype = random.choice(TYPES)
    cat = random.choice(CATEGORIES)
    notif: dict[str, Any] = {
        "id": i + 1,
        "type": ntype,
        "category": cat,
        "severity": random.choice(SEVERITIES),
        "title": random.choice([
            "Suspicious activity reported near City Market",
            "Weather alert: Heavy rainfall expected",
            "Traffic diversion on MG Road",
            "New FIR registered in jurisdiction",
            "Warrant issued for absconding accused",
            "Missing person report filed",
            "Vehicle theft hotspot alert",
            "Inter-state alert: Suspect may be in neighbouring district",
            "Forensic report ready for case FIR-2026-104",
            "Patrol route deviation detected",
            "Unusual activity pattern in zone B",
            "Court summons received for witness testimony",
            "Ammunition recovery reported",
        ]),
        "message": random.choice([
            "Multiple unknown persons loitering near jewellery stores. Increased patrol recommended.",
            "IMD forecasts heavy rain in Coastal Karnataka. Deploy rescue teams on standby.",
            "MG Road closed for repairs 10 PM to 5 AM. Plan alternate routes.",
            "A new FIR has been registered at your station. Review and assign investigating officer.",
            "Non-bailable warrant issued for accused in FIR-2026-108. Execute immediately.",
            "A minor has been reported missing from school premises. Initiate search protocol.",
            "Three vehicle thefts reported in Sector 4 this week. Increase surveillance.",
            "Suspect may have crossed district border. Coordinate with neighbouring units.",
        ]),
        "source": random.choice(["Automatic", "Duty Officer", "CP Office", "Intelligence Bureau", "Forensic Lab", "Court"]),
        "station": random.choice(["Vijayanagar PS", "Jayanagar PS", "Mysuru North PS", "All Stations"]),
        "jurisdiction": random.choice(["State-wide", "Bengaluru", "Mysuru", "Mangaluru", "Belagavi"]),
        "is_read": random.choice([True, False, False, False]),
        "requires_acknowledgment": random.choice([True, False, False]),
        "acknowledged_by": None,
        "acknowledged_at": None,
        "created_at": d.isoformat(),
    }

    if notif["requires_acknowledgment"] and random.random() > 0.3:
        notif["acknowledged_by"] = random.choice([
            "Insp. Rajesh Kumar", "DCP Operations", "SI Meena",
        ])
        notif["acknowledged_at"] = (d + timedelta(minutes=random.randint(1, 120))).isoformat()

    NOTIFICATIONS.append(notif)

NOTIFICATIONS.sort(key=lambda n: n["created_at"], reverse=True)


@router.get("", summary="List notifications")
async def list_notifications(
    notification_type: str | None = Query(None, alias="type"),
    severity: str | None = Query(None),
    is_read: bool | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    results = NOTIFICATIONS.copy()
    if notification_type:
        results = [n for n in results if n["type"] == notification_type]
    if severity:
        results = [n for n in results if n["severity"] == severity]
    if is_read is not None:
        results = [n for n in results if n["is_read"] == is_read]

    total = len(results)
    start = (page - 1) * per_page
    items = results[start:start + per_page]
    return {"success": True, "data": items, "total": total, "page": page, "per_page": per_page}


@router.get("/unread/count", summary="Unread notification count")
async def unread_count():
    unread = len([n for n in NOTIFICATIONS if not n["is_read"]])
    critical = len([n for n in NOTIFICATIONS if n["severity"] == "critical" and not n["is_read"]])
    return {"success": True, "data": {"unread": unread, "critical_unread": critical}}


@router.post("/{notif_id}/read", summary="Mark notification as read")
async def mark_read(notif_id: int):
    for n in NOTIFICATIONS:
        if n["id"] == notif_id:
            n["is_read"] = True
            return {"success": True, "data": n}
    raise HTTPException(404, "Notification not found")


@router.post("/{notif_id}/acknowledge", summary="Acknowledge notification")
async def acknowledge_notification(notif_id: int):
    for n in NOTIFICATIONS:
        if n["id"] == notif_id:
            n["is_read"] = True
            n["acknowledged_by"] = "DCP Operations"
            n["acknowledged_at"] = datetime.now().isoformat()
            return {"success": True, "data": n}
    raise HTTPException(404, "Notification not found")


@router.post("/mark-all-read", summary="Mark all notifications as read")
async def mark_all_read():
    for n in NOTIFICATIONS:
        n["is_read"] = True
    return {"success": True, "message": "All notifications marked as read"}
