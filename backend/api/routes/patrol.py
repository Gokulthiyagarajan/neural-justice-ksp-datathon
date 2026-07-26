"""Patrol module — patrol routes, recommendations, beat assignments, and synthetic data."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger("nj.api.routes.patrol")

router = APIRouter(prefix="/api/patrol", tags=["Patrol"])

# ── Synthetic data ───────────────────────────────────────────────────────────

BEATS = [
    "A1 - City Centre", "A2 - Market Area", "B1 - Industrial Zone", "B2 - Residential East",
    "C1 - Railway Station", "C2 - Bus Stand", "D1 - University Area", "D2 - Hospital Zone",
    "E1 - Coastal Belt", "E2 - Highway Strip", "F1 - Temple Precinct", "F2 - Lake Area",
]

PATROL_TYPES = ["foot", "foot", "mobile", "mobile", "mobile", "motorcycle", "special"]

PATROLS: list[dict[str, Any]] = []
for i in range(25):
    status = random.choice(["active", "active", "active", "completed", "scheduled", "break"])
    start = datetime.now() - timedelta(hours=random.randint(0, 24))
    duration_hours = random.choice([4, 6, 8, 12])
    patrol: dict[str, Any] = {
        "id": i + 1,
        "beat": random.choice(BEATS),
        "type": random.choice(PATROL_TYPES),
        "status": status,
        "officers": random.sample([
            "SI Meena", "ASI Prakash", "HC Naveen", "PC Ramesh",
            "SI Kavya", "ASI Suresh", "HC Dinesh", "PC Ganesh",
            "SI Anita", "ASI Venkatesh",
        ], random.randint(2, 4)),
        "vehicle": random.choice(["Gypsy KA-01-1234", "Gypsy KA-01-5678",
                                   "Motorcycle KA-01-AB1234", None]),
        "zone": random.choice(["North", "South", "East", "West", "Central"]),
        "district": random.choice(["Bengaluru Urban", "Mysuru", "Mangaluru", "Belagavi"]),
        "start_time": start.isoformat(),
        "end_time": (start + timedelta(hours=duration_hours)).isoformat(),
        "checkpoints_covered": random.randint(3, 12),
        "incidents_reported": random.randint(0, 5),
        "distance_covered_km": round(random.uniform(5, 35), 1),
        "created_at": (start - timedelta(hours=random.randint(1, 4))).isoformat(),
    }
    PATROLS.append(patrol)

PATROLS.sort(key=lambda p: p.get("start_time", ""), reverse=True)


@router.get("", summary="List patrols")
async def list_patrols(
    status: str | None = Query(None),
    zone: str | None = Query(None),
    type: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    results = PATROLS.copy()
    if status:
        results = [p for p in results if p["status"] == status]
    if zone:
        results = [p for p in results if p["zone"].lower() == zone.lower()]
    if type:
        results = [p for p in results if p["type"] == type]

    total = len(results)
    start = (page - 1) * per_page
    items = results[start:start + per_page]
    return {"success": True, "data": items, "total": total, "page": page, "per_page": per_page}


@router.get("/recommendations", summary="AI patrol recommendations")
async def patrol_recommendations():
    return {
        "success": True,
        "data": [
            {
                "zone": "Bengaluru Urban - East",
                "priority": "high",
                "reason": "34% increase in vehicle thefts this week",
                "recommended_patrols": 4,
                "current_patrols": 2,
                "time_sensitivity": "immediate",
            },
            {
                "zone": "Mysuru - City Centre",
                "priority": "medium",
                "reason": "Festival season crowd management",
                "recommended_patrols": 6,
                "current_patrols": 3,
                "time_sensitivity": "today",
            },
            {
                "zone": "Mangaluru - Coastal Belt",
                "priority": "medium",
                "reason": "Weather alert: heavy rainfall expected",
                "recommended_patrols": 3,
                "current_patrols": 1,
                "time_sensitivity": "today",
            },
            {
                "zone": "Belagavi - Highway",
                "priority": "low",
                "reason": "Routine highway patrol coverage",
                "recommended_patrols": 2,
                "current_patrols": 1,
                "time_sensitivity": "this_week",
            },
        ],
    }


@router.get("/stats", summary="Patrol statistics")
async def patrol_stats():
    active = [p for p in PATROLS if p["status"] == "active"]
    return {
        "success": True,
        "data": {
            "active_patrols": len(active),
            "total_officers_deployed": sum(len(p["officers"]) for p in active),
            "total_distance_km": round(sum(p["distance_covered_km"] for p in PATROLS), 1),
            "incidents_reported_today": sum(p["incidents_reported"] for p in active),
            "by_type": {t: len([p for p in PATROLS if p["type"] == t]) for t in set(p["type"] for p in PATROLS)},
            "coverage_pct": round(random.uniform(60, 95), 1),
        },
    }


@router.get("/hotspots", summary="Patrol hotspot zones")
async def patrol_hotspots():
    return {
        "success": True,
        "data": [
            {"zone": "Bengaluru Urban - Market Area", "risk_level": "critical", "incidents_24h": random.randint(10, 30), "lat": 12.97, "lng": 77.59},
            {"zone": "Mysuru - Bus Stand", "risk_level": "high", "incidents_24h": random.randint(5, 15), "lat": 12.30, "lng": 76.64},
            {"zone": "Mangaluru - Coastal Road", "risk_level": "medium", "incidents_24h": random.randint(3, 10), "lat": 12.87, "lng": 74.88},
            {"zone": "Belagavi - Highway", "risk_level": "medium", "incidents_24h": random.randint(3, 8), "lat": 15.85, "lng": 74.50},
            {"zone": "Kalaburagi - Industrial Area", "risk_level": "low", "incidents_24h": random.randint(1, 5), "lat": 17.33, "lng": 76.83},
        ],
    }
