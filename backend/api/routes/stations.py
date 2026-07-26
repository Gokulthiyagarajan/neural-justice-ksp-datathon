"""Stations module — police station management with synthetic data."""

from __future__ import annotations

import logging
import random
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger("nj.api.routes.stations")

router = APIRouter(prefix="/api/stations", tags=["Stations"])

# ── Synthetic data ───────────────────────────────────────────────────────────

STATIONS: list[dict[str, Any]] = [
    {
        "id": i + 1,
        "name": name,
        "code": f"PS{100 + i:03d}",
        "district": district,
        "division": division,
        "type": random.choice(["Urban", "Rural", "Traffic", "Women"]),
        "officer_count": random.randint(15, 120),
        "active_cases": random.randint(10, 300),
        "solved_rate": round(random.uniform(40, 92), 1),
        "lat": 12.9 + random.uniform(-0.5, 0.5),
        "lng": 77.5 + random.uniform(-0.5, 0.5),
        "phone": f"080-{random.randint(22000000, 22999999)}",
        "incharge": random.choice([
            "Inspector Rajesh Kumar", "Inspector Kavya Sharma",
            "Inspector Prakash Rao", "Inspector Meena Devi",
        ]),
        "status": random.choice(["active", "active", "active", "active", "reorganizing"]),
        "created_at": datetime.now().isoformat(),
    }
    for i, (name, district, division) in enumerate([
        ("Vijayanagar PS", "Bengaluru Urban", "Bengaluru"),
        ("Jayanagar PS", "Bengaluru Urban", "Bengaluru"),
        ("Malleshwaram PS", "Bengaluru Urban", "Bengaluru"),
        ("Whitefield PS", "Bengaluru Urban", "Bengaluru"),
        ("Kengeri PS", "Bengaluru Rural", "Bengaluru"),
        ("Nelamangala PS", "Bengaluru Rural", "Bengaluru"),
        ("Devanahalli PS", "Bengaluru Rural", "Bengaluru"),
        ("Mysuru North PS", "Mysuru", "Mysuru"),
        ("Mysuru South PS", "Mysuru", "Mysuru"),
        ("Mandya Town PS", "Mandya", "Mysuru"),
        ("Hassan Town PS", "Hassan", "Mysuru"),
        ("Mangaluru Central PS", "Dakshina Kannada", "Mangaluru"),
        ("Udupi Town PS", "Udupi", "Mangaluru"),
        ("Belagavi City PS", "Belagavi", "Belagavi"),
        ("Hubballi PS", "Dharwad", "Belagavi"),
        ("Kalaburagi City PS", "Kalaburagi", "Kalaburagi"),
        ("Ballari Town PS", "Ballari", "Kalaburagi"),
        ("Shivamogga Town PS", "Shivamogga", "Shivamogga"),
        ("Davangere PS", "Davangere", "Shivamogga"),
        ("Chitradurga PS", "Chitradurga", "Shivamogga"),
    ])
]

# Sort by name
STATIONS.sort(key=lambda s: s["name"])


# ── Routes ───────────────────────────────────────────────────────────────────


@router.get("", summary="List all police stations")
async def list_stations(
    district: str | None = Query(None, description="Filter by district"),
    status: str | None = Query(None, description="Filter by status"),
    search: str | None = Query(None, description="Search by name or code"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """List police stations with optional filters."""
    results = STATIONS.copy()

    if district:
        results = [s for s in results if s["district"].lower() == district.lower()]
    if status:
        results = [s for s in results if s["status"] == status]
    if search:
        q = search.lower()
        results = [s for s in results if q in s["name"].lower() or q in s["code"].lower()]

    total = len(results)
    start = (page - 1) * per_page
    items = results[start:start + per_page]

    return {
        "success": True,
        "data": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.get("/{station_id}", summary="Get station details")
async def get_station(station_id: int):
    for s in STATIONS:
        if s["id"] == station_id:
            return {"success": True, "data": s}
    raise HTTPException(status_code=404, detail="Station not found")


@router.get("/{station_id}/stats", summary="Get station statistics")
async def get_station_stats(station_id: int):
    """Per-station crime statistics and officer deployment."""
    station = None
    for s in STATIONS:
        if s["id"] == station_id:
            station = s
            break
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    return {
        "success": True,
        "data": {
            "station_id": station_id,
            "monthly_firs": [random.randint(30, 200) for _ in range(12)],
            "clearance_rate": station["solved_rate"],
            "active_officers": station["officer_count"],
            "pending_investigations": random.randint(5, 50),
            "avg_response_time_mins": round(random.uniform(8, 25), 1),
            "top_crime_types": [
                {"type": "Theft", "count": random.randint(20, 80)},
                {"type": "Assault", "count": random.randint(10, 50)},
                {"type": "Burglary", "count": random.randint(10, 40)},
            ],
        },
    }
