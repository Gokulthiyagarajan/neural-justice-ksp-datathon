"""Crime Patterns module — pattern detection, trend analysis, seasonal patterns, and synthetic data."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger("nj.api.routes.crime_patterns")

router = APIRouter(prefix="/api/crime-patterns", tags=["Crime Patterns"])

# ── Data generators ─────────────────────────────────────────────────────────

CRIME_TYPES = ["Theft", "Burglary", "Assault", "Robbery", "Cyber Fraud",
               "Chain Snatching", "Vehicle Theft", "Drug Offence", "Murder", "Kidnapping"]

PATTERN_TYPES = ["seasonal", "emerging", "cyclical", "geospatial", "temporal", "modus_operandi"]

def _gen_patterns() -> list[dict[str, Any]]:
    return [
        {
            "id": i + 1,
            "type": random.choice(PATTERN_TYPES),
            "crime_type": random.choice(CRIME_TYPES),
            "title": title,
            "confidence": round(random.uniform(65, 96), 1),
            "districts_affected": random.sample([
                "Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Mandya",
                "Mangaluru", "Belagavi", "Kalaburagi", "Shivamogga",
            ], random.randint(1, 4)),
            "period": random.choice(["Last 7 days", "Last 30 days", "Last 90 days", "Year-over-year"]),
            "change_pct": round(random.uniform(-15, 45), 1),
            "incident_count": random.randint(20, 500),
            "description": desc,
            "recommended_action": random.choice([
                "Increase patrol presence during evening hours",
                "Deploy plainclothes officers in affected areas",
                "Launch public awareness campaign",
                "Coordinate with neighbouring districts",
                "Establish special investigation team",
                "Enhance surveillance camera coverage",
            ]),
            "detected_at": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            "status": random.choice(["active", "active", "active", "investigating", "monitoring"]),
        }
        for i, (title, desc) in enumerate([
            ("Festival Season Pickpocketing Surge", "Pickpocketing incidents increase 40% during festival months around crowded market areas and temple precincts."),
            ("Night-time Vehicle Theft Ring", "Coordinated vehicle thefts occurring between 11 PM - 3 AM in residential areas. Suspects target specific vehicle models."),
            ("Cyber Fraud Targeting Senior Citizens", "Phishing calls impersonating bank officials targeting elderly victims. Loss amounts typically Rs. 50,000 - 2,00,000."),
            ("Chain Snatching Hotspot Migration", "Chain snatching incidents shifting from City Centre to suburban areas following increased police presence downtown."),
            ("Weekend Assault Pattern near Entertainment Zones", "Assaults and affray incidents concentrated around pubs and clubs during weekend nights (Fri-Sat, 10 PM - 2 AM)."),
            ("Drug Peddling Near Educational Institutions", "Small-quantity drug sales detected near three colleges. Suspects use student intermediaries."),
            ("House Break-in Pattern: Afternoon Window Entry", "Burglaries occurring between 1-4 PM weekdays when homes are unoccupied. Entry through rear windows using crowbar."),
            ("Inter-state Vehicle Theft Network", "Stolen vehicles from Karnataka being re-registered in neighbouring states with forged documents. Network spans 4 states."),
        ])
    ]


@router.get("/patterns", summary="Detected crime patterns")
async def list_patterns(
    crime_type: str | None = Query(None),
    pattern_type: str | None = Query(None),
    min_confidence: float | None = Query(None, ge=0, le=100),
):
    results = _gen_patterns()
    if crime_type:
        results = [p for p in results if p["crime_type"].lower() == crime_type.lower()]
    if pattern_type:
        results = [p for p in results if p["type"] == pattern_type]
    if min_confidence is not None:
        results = [p for p in results if p["confidence"] >= min_confidence]
    return {"success": True, "data": results}


@router.get("/trends", summary="Crime trends over time")
async def crime_trends(
    period: str = Query("12m", regex="^(30d|90d|12m|yoy)$"),
    crime_type: str | None = Query(None),
):
    months = {"30d": 30, "90d": 90, "12m": 365, "yoy": 730}[period]
    points = min(months // 7, 52)
    return {
        "success": True,
        "data": [
            {
                "date": (datetime.now() - timedelta(days=d)).strftime("%Y-%m-%d"),
                "count": random.randint(50, 400),
                "moving_avg": round(random.uniform(100, 300), 1),
                "forecast": None if d < 14 else round(random.uniform(80, 350), 1),
            }
            for d in range(0, months, max(months // points, 1))
        ],
    }


@router.get("/seasonal", summary="Seasonal crime patterns")
async def seasonal_patterns():
    """Patterns by month / season across all crime types."""
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return {
        "success": True,
        "data": {
            "months": months,
            "datasets": [
                {
                    "crime_type": ct,
                    "values": [random.randint(20, 200) for _ in range(12)],
                    "peak_month": months[random.randint(0, 11)],
                    "peak_value": random.randint(150, 300),
                }
                for ct in random.sample(CRIME_TYPES, 5)
            ],
        },
    }


@router.get("/heatmap", summary="Crime heatmap data")
async def crime_heatmap(
    crime_type: str | None = Query(None),
    district: str | None = Query(None),
):
    districts = ["Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Mandya", "Mangaluru", "Belagavi", "Kalaburagi", "Shivamogga"]
    if district:
        districts = [d for d in districts if d.lower() == district.lower()]

    return {
        "success": True,
        "data": [
            {
                "district": d,
                "lat": 12.9 + random.uniform(-1.5, 1.5),
                "lng": 77.0 + random.uniform(-1.5, 1.5),
                "intensity": round(random.uniform(0.1, 1.0), 2),
                "crime_count": random.randint(20, 500),
                "dominant_crime": random.choice(CRIME_TYPES),
            }
            for d in districts
        ],
    }
