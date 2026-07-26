"""AI Situation Room — real-time command center data with synthetic intelligence feeds."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger("nj.api.routes.situation_room")

router = APIRouter(prefix="/api/situation-room", tags=["AI Situation Room"])

# ── Data generators ─────────────────────────────────────────────────────────

def _gen_overview() -> dict[str, Any]:
    return {
        "active_cases": random.randint(2000, 3500),
        "officers_on_duty": random.randint(8000, 12000),
        "pending_alerts": random.randint(12, 45),
        "response_time_avg_mins": round(random.uniform(6.5, 15.0), 1),
        "day_change_pct": round(random.uniform(-5, 8), 1),
        "week_change_pct": round(random.uniform(-3, 6), 1),
        "last_updated": datetime.now().isoformat(),
    }

def _gen_hotspots() -> list[dict[str, Any]]:
    names = ["Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Mangaluru",
             "Belagavi", "Kalaburagi", "Hubballi", "Shivamogga"]
    return [
        {"district": n, "incidents_24h": random.randint(5, 45),
         "trend": random.choice(["rising", "rising", "stable", "stable", "declining"]),
         "risk_score": round(random.uniform(20, 95), 1),
         "lat": 12.9 + random.uniform(-0.5, 0.5),
         "lng": 77.5 + random.uniform(-0.5, 0.5),
         "recommended_action": random.choice([
             "Increase patrol density", "Deploy additional checkpoints",
             "Community outreach required", "Maintain current posture",
         ])}
        for n in sorted(names, key=lambda _: random.random())[:5]
    ]

def _gen_ai_insights() -> list[dict[str, Any]]:
    return [
        {
            "id": 1,
            "type": "prediction",
            "title": "30-Day Crime Forecast",
            "summary": "Model predicts +8.2% increase in property crimes across Bengaluru Urban, with peak expected during festival season.",
            "confidence": round(random.uniform(72, 92), 1),
            "actionable": True,
        },
        {
            "id": 2,
            "type": "pattern",
            "title": "Emerging Pattern: Vehicle Theft Ring",
            "summary": "ML clustering detected unusual co-occurrence of vehicle thefts in Sector 4, 7, and 12. Likely organized ring operation.",
            "confidence": round(random.uniform(78, 95), 1),
            "actionable": True,
        },
        {
            "id": 3,
            "type": "anomaly",
            "title": "Anomaly: Night-time Incident Spike",
            "summary": "Incidents between 11 PM - 3 AM increased 34% this week compared to 4-week baseline. Recommend night patrol review.",
            "confidence": round(random.uniform(75, 90), 1),
            "actionable": True,
        },
        {
            "id": 4,
            "type": "recommendation",
            "title": "Resource Reallocation Proposal",
            "summary": "AI recommends moving 12 patrol units from low-activity zones (Chitradurga, Hassan) to Bengaluru Urban and Kalaburagi.",
            "confidence": round(random.uniform(65, 85), 1),
            "actionable": True,
        },
    ]


# ── Routes ───────────────────────────────────────────────────────────────────


@router.get("/overview", summary="Situation overview metrics")
async def situation_overview():
    return {"success": True, "data": _gen_overview()}


@router.get("/hotspots", summary="Active hotspots")
async def situation_hotspots():
    return {"success": True, "data": _gen_hotspots()}


@router.get("/insights", summary="AI-generated insights")
async def situation_insights():
    return {"success": True, "data": _gen_ai_insights()}


@router.get("/dashboard", summary="Full situation room dashboard")
async def full_dashboard():
    return {
        "success": True,
        "data": {
            "overview": _gen_overview(),
            "hotspots": _gen_hotspots(),
            "insights": _gen_ai_insights(),
            "timeline": [
                {
                    "hour": h,
                    "incidents": random.randint(3, 30),
                    "patrols_active": random.randint(40, 120),
                }
                for h in range(24)
            ],
            "district_comparison": {
                "labels": ["Bengaluru Urban", "Mysuru", "Mangaluru", "Belagavi", "Kalaburagi", "Hubballi"],
                "this_week": [random.randint(50, 300) for _ in range(6)],
                "last_week": [random.randint(40, 280) for _ in range(6)],
            },
        },
    }
