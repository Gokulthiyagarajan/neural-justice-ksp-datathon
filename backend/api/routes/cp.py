"""CP (Commissioner of Police) API endpoints.

All /api/cp/* routes for the CP role dashboard pages.
"""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Query

logger = logging.getLogger("nj.api.routes.cp")

router = APIRouter(prefix="/api/cp", tags=["CP"])


# ── CP Stations ──────────────────────────────────────────────────────────────


@router.get("/stations")
async def get_cp_stations():
    """Get all police stations across the state for CP view."""
    all_stations = {
        "Bengaluru Urban": [
            {"name": "Cubbon Park PS", "type": "urban", "capacity": 150, "current_strength": 138, "condition_score": 8.5, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Barracks", "Vehicles", "Radio", "Evidence_Lab", "Visitor_Room", "Parking", "Drone_Bay"], "last_inspection": "2026-03-15"},
            {"name": "Koramangala PS", "type": "urban", "capacity": 120, "current_strength": 112, "condition_score": 7.8, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Barracks", "Vehicles", "Radio", "Visitor_Room", "Parking"], "last_inspection": "2026-04-02"},
            {"name": "MG Road PS", "type": "metro", "capacity": 200, "current_strength": 185, "condition_score": 9.2, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Barracks", "Vehicles", "Radio", "Evidence_Lab", "Visitor_Room", "Parking", "Drone_Bay"], "last_inspection": "2026-02-20"},
            {"name": "Whitefield PS", "type": "urban", "capacity": 100, "current_strength": 95, "condition_score": 6.5, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Vehicles", "Radio", "Parking"], "last_inspection": "2026-05-10"},
            {"name": "Yeshwanthpur PS", "type": "urban", "capacity": 80, "current_strength": 76, "condition_score": 5.2, "facilities": ["WiFi", "CCTV", "Filing", "Vehicles", "Radio"], "last_inspection": "2026-01-18"},
        ],
        "Mysuru": [
            {"name": "Krishnaraja Boulevard PS", "type": "urban", "capacity": 90, "current_strength": 82, "condition_score": 7.6, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Vehicles", "Radio", "Parking"], "last_inspection": "2026-03-22"},
            {"name": "Mysuru Palace PS", "type": "metro", "capacity": 110, "current_strength": 105, "condition_score": 8.8, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Barracks", "Vehicles", "Radio", "Evidence_Lab", "Visitor_Room", "Parking"], "last_inspection": "2026-04-15"},
            {"name": "Nanjangud PS", "type": "rural", "capacity": 45, "current_strength": 40, "condition_score": 6.1, "facilities": ["WiFi", "CCTV", "Filing", "Vehicles", "Radio"], "last_inspection": "2026-02-08"},
        ],
        "Belagavi": [
            {"name": "Belagavi City PS", "type": "urban", "capacity": 85, "current_strength": 78, "condition_score": 7.0, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Vehicles", "Radio", "Parking"], "last_inspection": "2026-01-30"},
            {"name": "Gokak PS", "type": "rural", "capacity": 35, "current_strength": 32, "condition_score": 4.5, "facilities": ["WiFi", "Filing", "Vehicles", "Radio"], "last_inspection": "2025-11-12"},
            {"name": "Khanapur PS", "type": "rural", "capacity": 30, "current_strength": 25, "condition_score": 3.8, "facilities": ["WiFi", "Filing", "Radio"], "last_inspection": "2025-10-05"},
        ],
        "Mangaluru (Dakshina Kannada)": [
            {"name": "Mangaluru City PS", "type": "urban", "capacity": 100, "current_strength": 94, "condition_score": 8.2, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Barracks", "Vehicles", "Radio", "Evidence_Lab", "Parking", "Drone_Bay"], "last_inspection": "2026-04-28"},
            {"name": "Surathkal PS", "type": "urban", "capacity": 60, "current_strength": 55, "condition_score": 6.9, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Vehicles", "Radio", "Parking"], "last_inspection": "2026-03-01"},
            {"name": "Coastal Patrol PS", "type": "rural", "capacity": 40, "current_strength": 38, "condition_score": 7.5, "facilities": ["WiFi", "CCTV", "Vehicles", "Radio", "Armory"], "last_inspection": "2026-05-05"},
        ],
        "Kalaburagi": [
            {"name": "Kalaburagi City PS", "type": "urban", "capacity": 75, "current_strength": 70, "condition_score": 5.8, "facilities": ["WiFi", "CCTV", "Generator", "Filing", "Vehicles", "Radio", "Parking"], "last_inspection": "2026-02-14"},
            {"name": "Sedam PS", "type": "rural", "capacity": 25, "current_strength": 22, "condition_score": 3.2, "facilities": ["WiFi", "Filing", "Radio"], "last_inspection": "2025-09-20"},
        ],
        "Ballari": [
            {"name": "Ballari City PS", "type": "urban", "capacity": 80, "current_strength": 73, "condition_score": 6.0, "facilities": ["WiFi", "CCTV", "Filing", "Armory", "Vehicles", "Radio", "Parking"], "last_inspection": "2026-01-10"},
            {"name": "Hospet PS", "type": "urban", "capacity": 55, "current_strength": 52, "condition_score": 5.5, "facilities": ["WiFi", "CCTV", "Filing", "Vehicles", "Radio"], "last_inspection": "2025-12-15"},
        ],
    }

    by_district = [{"district": d, "stations": s} for d, s in all_stations.items()]
    all_station_list = [st for stations in all_stations.values() for st in stations]
    total = len(all_station_list)

    types = {}
    for s in all_station_list:
        t = s["type"]
        types[t] = types.get(t, 0) + 1

    avg_condition = sum(s["condition_score"] for s in all_station_list) / total if total else 0
    critical_count = sum(1 for s in all_station_list if s["condition_score"] < 4)

    condition_dist: dict[str, int] = {}
    for s in all_station_list:
        if s["condition_score"] >= 8:
            key = "excellent"
        elif s["condition_score"] >= 6:
            key = "good"
        elif s["condition_score"] >= 4:
            key = "fair"
        elif s["condition_score"] >= 2:
            key = "poor"
        else:
            key = "critical"
        condition_dist[key] = condition_dist.get(key, 0) + 1

    facility_gaps = [
        {
            "station": s["name"],
            "missing_facilities": [
                f for f in ["WiFi", "CCTV", "Generator", "Filing", "Armory", "Barracks", "Vehicles", "Radio", "Evidence_Lab", "Visitor_Room", "Parking", "Drone_Bay"]
                if f not in s["facilities"]
            ][:4],
            "priority": "high" if s["condition_score"] < 5 else "medium" if s["condition_score"] < 7 else "low",
        }
        for s in all_station_list
        if len(s["facilities"]) < 8
    ]

    alerts = [
        {
            "station": s["name"],
            "issue": f"Critical infrastructure decay (score {s['condition_score']})" if s["condition_score"] < 3 else f"Below-standard condition ({s['condition_score']}/10) requires upgrade",
            "severity": "critical" if s["condition_score"] < 3 else "high",
            "since": s["last_inspection"],
        }
        for s in all_station_list
        if s["condition_score"] < 5
    ]

    return {
        "summary": {
            "total": total,
            "urban": types.get("urban", 0),
            "rural": types.get("rural", 0),
            "metro": types.get("metro", 0),
            "avg_condition": round(avg_condition * 10) / 10,
            "critical_count": critical_count,
        },
        "by_district": by_district,
        "condition_distribution": condition_dist,
        "facility_gaps": facility_gaps,
        "infrastructure_alerts": alerts,
        "last_updated": datetime.now().isoformat(),
    }


# ── CP Districts ─────────────────────────────────────────────────────────────


@router.get("/districts")
async def get_cp_districts():
    """Get all districts for CP view."""
    districts = [
        {"name": "Bengaluru Urban", "population": 9621000, "area_sqkm": 2196, "crime_rate_per_100k": 485, "stations_count": 86, "officers_per_100k": 142, "literacy_rate": 91.2, "urban_pct": 98, "division": "Bengaluru", "headquarters": "Bengaluru", "border_districts": ["Bengaluru Rural", "Ramanagara", "Kolar"], "key_issues": ["Cybercrime surge", "Traffic violations", "Chain snatching"]},
        {"name": "Bengaluru Rural", "population": 987000, "area_sqkm": 2298, "crime_rate_per_100k": 215, "stations_count": 28, "officers_per_100k": 78, "literacy_rate": 82.1, "urban_pct": 35, "division": "Bengaluru", "headquarters": "Bengaluru", "border_districts": ["Bengaluru Urban", "Ramanagara", "Tumakuru", "Kolar"], "key_issues": ["Inter-district vehicle theft", "Land disputes"]},
        {"name": "Mysuru", "population": 3065000, "area_sqkm": 6354, "crime_rate_per_100k": 310, "stations_count": 45, "officers_per_100k": 105, "literacy_rate": 72.8, "urban_pct": 55, "division": "Mysuru", "headquarters": "Mysuru", "border_districts": ["Mandya", "Chamarajanagar", "Wayanad (KL)", "Kodagu"], "key_issues": ["Tourist-targeted theft", "Drug trafficking"]},
        {"name": "Belagavi", "population": 4779000, "area_sqkm": 13415, "crime_rate_per_100k": 265, "stations_count": 52, "officers_per_100k": 88, "literacy_rate": 73.5, "urban_pct": 32, "division": "Belagavi", "headquarters": "Belagavi", "border_districts": ["Dharwad", "Bagalkote", "Vijayapura", "Maharashtra (Kolhapur)"], "key_issues": ["Border smuggling", "Communal tensions"]},
        {"name": "Dharwad", "population": 1847000, "area_sqkm": 4260, "crime_rate_per_100k": 290, "stations_count": 30, "officers_per_100k": 95, "literacy_rate": 80.1, "urban_pct": 48, "division": "Belagavi", "headquarters": "Dharwad", "border_districts": ["Belagavi", "Uttara Kannada", "Haveri", "Gadag"], "key_issues": ["Naxal influence in forest areas", "Vehicle theft"]},
        {"name": "Mangaluru (Dakshina Kannada)", "population": 2089000, "area_sqkm": 4860, "crime_rate_per_100k": 345, "stations_count": 38, "officers_per_100k": 112, "literacy_rate": 88.6, "urban_pct": 52, "division": "Mangaluru", "headquarters": "Mangaluru", "border_districts": ["Udupi", "Chikkamagaluru", "Hassan", "Kasaragod (KL)"], "key_issues": ["Coastal smuggling", "Drug peddling", "Cybercrime"]},
        {"name": "Tumakuru", "population": 2678000, "area_sqkm": 10598, "crime_rate_per_100k": 195, "stations_count": 35, "officers_per_100k": 72, "literacy_rate": 75.2, "urban_pct": 28, "division": "Bengaluru", "headquarters": "Tumakuru", "border_districts": ["Bengaluru Rural", "Chitradurga", "Hassan", "Mandya", "Chikkaballapura"], "key_issues": ["Gold smuggling route", "Cattle theft"]},
        {"name": "Kalaburagi", "population": 2566000, "area_sqkm": 10951, "crime_rate_per_100k": 420, "stations_count": 40, "officers_per_100k": 68, "literacy_rate": 64.8, "urban_pct": 30, "division": "Kalaburagi", "headquarters": "Kalaburagi", "border_districts": ["Bidar", "Vijayapura", "Yadgir", "Telangana (Medak)"], "key_issues": ["Communal violence", "Illegal mining", "Land grabbing"]},
        {"name": "Shivamogga", "population": 1752000, "area_sqkm": 8477, "crime_rate_per_100k": 230, "stations_count": 28, "officers_per_100k": 82, "literacy_rate": 80.5, "urban_pct": 35, "division": "Shivamogga", "headquarters": "Shivamogga", "border_districts": ["Davangere", "Udupi", "Chikkamagaluru", "Haveri", "Uttara Kannada"], "key_issues": ["Forest crime", "Wildlife poaching"]},
        {"name": "Ballari", "population": 2460000, "area_sqkm": 8447, "crime_rate_per_100k": 510, "stations_count": 36, "officers_per_100k": 62, "literacy_rate": 67.4, "urban_pct": 38, "division": "Ballari", "headquarters": "Ballari", "border_districts": ["Vijayanagara", "Chitradurga", "Davangere", "Andhra Pradesh (Kurnool)"], "key_issues": ["Mining mafia", "Political violence", "Illegal arms"]},
        {"name": "Udupi", "population": 1177000, "area_sqkm": 3580, "crime_rate_per_100k": 175, "stations_count": 22, "officers_per_100k": 90, "literacy_rate": 86.2, "urban_pct": 42, "division": "Mangaluru", "headquarters": "Udupi", "border_districts": ["Dakshina Kannada", "Shivamogga", "Chikkamagaluru", "Uttara Kannada"], "key_issues": ["Coastal security", "Tourist safety"]},
        {"name": "Hassan", "population": 1776000, "area_sqkm": 6814, "crime_rate_per_100k": 200, "stations_count": 26, "officers_per_100k": 76, "literacy_rate": 78.4, "urban_pct": 25, "division": "Mysuru", "headquarters": "Hassan", "border_districts": ["Mysuru", "Tumakuru", "Chikkamagaluru", "Dakshina Kannada", "Mandya"], "key_issues": ["Coffee estate crime", "Road accidents"]},
    ]

    total_pop = sum(d["population"] for d in districts)
    total_area = sum(d["area_sqkm"] for d in districts)
    total_crime = sum(d["crime_rate_per_100k"] for d in districts)

    crime_dist: dict[str, int] = {}
    for d in districts:
        if d["crime_rate_per_100k"] < 200:
            bucket = "low"
        elif d["crime_rate_per_100k"] < 400:
            bucket = "medium"
        elif d["crime_rate_per_100k"] < 600:
            bucket = "high"
        else:
            bucket = "critical"
        crime_dist[bucket] = crime_dist.get(bucket, 0) + 1

    divisions: dict[str, dict[str, Any]] = {}
    for d in districts:
        div = d["division"]
        if div not in divisions:
            divisions[div] = {"districts": 0, "population": 0, "crime_rate": 0}
        divisions[div]["districts"] += 1
        divisions[div]["population"] += d["population"]
        n = divisions[div]["districts"]
        divisions[div]["crime_rate"] = round(
            (divisions[div]["crime_rate"] * (n - 1) + d["crime_rate_per_100k"]) / n
        )

    return {
        "summary": {
            "total_districts": len(districts),
            "total_population": total_pop,
            "total_area_sqkm": total_area,
            "avg_crime_rate": round(total_crime / len(districts)),
        },
        "districts": districts,
        "crime_rate_distribution": crime_dist,
        "division_breakdown": divisions,
        "last_updated": datetime.now().isoformat(),
    }


# ── CP Warnings ──────────────────────────────────────────────────────────────


@router.get("/warnings")
async def get_cp_warnings():
    """Get state-wide warnings for CP."""
    now = datetime.now()
    return {
        "warnings": [
            {"id": 1, "type": "crime_spike", "severity": "critical", "message": "Chain snatching incidents up 42% in Bengaluru Urban over past 7 days", "district": "Bengaluru Urban", "generated_at": (now - timedelta(hours=2)).isoformat(), "status": "active"},
            {"id": 2, "type": "station_overload", "severity": "high", "message": "Koramangala PS handling 3x average FIR load — resource reallocation needed", "district": "Bengaluru Urban", "generated_at": (now - timedelta(hours=5)).isoformat(), "status": "active"},
            {"id": 3, "type": "pattern_shift", "severity": "high", "message": "Emerging vehicle theft pattern across Mysuru division — 18 incidents in 5 days", "district": "Mysuru", "generated_at": (now - timedelta(hours=8)).isoformat(), "status": "active"},
            {"id": 4, "type": "seasonal", "severity": "medium", "message": "Festival season预测: 25% increase in pickpocketing expected at MG Road", "district": "Bengaluru Urban", "generated_at": (now - timedelta(hours=12)).isoformat(), "status": "active"},
            {"id": 5, "type": "infrastructure", "severity": "medium", "message": "Sedam PS condition score dropped to 3.2 — immediate inspection recommended", "district": "Kalaburagi", "generated_at": (now - timedelta(days=1)).isoformat(), "status": "active"},
        ],
        "total": 5,
        "critical": 1,
        "high": 2,
        "medium": 2,
        "last_updated": now.isoformat(),
    }


# ── CP Cases ─────────────────────────────────────────────────────────────────


@router.get("/cases")
async def get_cp_cases():
    """Get state-wide case summary for CP.

    Contract matches what the frontend CPCases page renders: summary
    (total/active/under_investigation/solved_rate), cases (CaseItem[]),
    districts (string[]), crime_types (string[]), last_updated.
    """
    now = datetime.now()
    districts = ["Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Hubballi", "Mangaluru", "Belagavi",
                 "Kalaburagi", "Shivamogga", "Dakshina Kannada", "Tumakuru", "Ballari", "Udupi"]
    types = ["Theft", "Robbery", "Assault", "Burglary", "Cyber Fraud", "Chain Snatching", "Vehicle Theft", "Murder"]
    statuses = ["registered", "under_investigation", "closed", "chargesheeted", "critical"]
    accused = ["Ravi Kumar", "Suresh Patel", "Mohan Reddy", "Unknown", "Anil Kumar", "Priya Singh", "Karthik S", "Venkat Rao"]

    cases = []
    for i in range(14):
        cases.append({
            "crime_no": f"KSP-2026-{str(200 - i).zfill(3)}",
            "district": districts[i % len(districts)],
            "station_name": f"{districts[i % len(districts)]} PS",
            "crime_type": types[i % len(types)],
            "status": statuses[i % len(statuses)],
            "days_open": (i * 7) % 60 + 1,
            "occurrence_date": (now - timedelta(days=(i * 3) % 30)).date().isoformat(),
            "accused_name": accused[i % len(accused)],
        })

    active = [c for c in cases if c["status"] not in ("closed", "resolved")]
    return {
        "summary": {
            "total": len(cases),
            "active": len(active),
            "under_investigation": len([c for c in cases if c["status"] == "under_investigation"]),
            "solved_rate": 38.2,
        },
        "cases": cases,
        "districts": districts,
        "crime_types": types,
        "last_updated": now.isoformat(),
    }


# ── CP Audit ─────────────────────────────────────────────────────────────────


@router.get("/audit")
async def get_cp_audit():
    """Get state-wide audit data for CP."""
    now = datetime.now()
    return {
        "audits": [
            {"audit": "Annual Operational Review — Mysuru", "severity": "medium", "category": "Operational", "description": "Vehicle log maintenance found inadequate across 4 stations", "status": "resolved", "due_date": "2026-05-01"},
            {"audit": "Financial Audit — Bengaluru Urban", "severity": "high", "category": "Financial", "description": "Petty cash discrepancies in 3 stations", "status": "in_progress", "due_date": "2026-08-15"},
            {"audit": "Infrastructure Review — Kalaburagi", "severity": "critical", "category": "Infrastructure", "description": "2 stations below minimum condition threshold", "status": "pending", "due_date": "2026-07-30"},
            {"audit": "Compliance Check — State-wide", "severity": "medium", "category": "Compliance", "description": "Quarterly compliance review for all divisions", "status": "scheduled", "due_date": "2026-09-01"},
        ],
        "summary": {
            "total_audits": 4,
            "pending": 2,
            "in_progress": 1,
            "resolved": 1,
        },
        "last_updated": now.isoformat(),
    }


# ── CP AI Situation ──────────────────────────────────────────────────────────


@router.get("/ai-situation")
async def get_cp_ai_situation():
    """Get AI-generated situation report for CP."""
    now = datetime.now()
    return {
        "situation": {
            "risk_level": "elevated",
            "crime_index": 72.4,
            "trend": "increasing",
            "key_findings": [
                "Chain snatching incidents concentrated in Bengaluru Urban commercial corridors",
                "Vehicle theft pattern emerging across Mysuru division",
                "Seasonal increase in housebreaking predicted for next 2 weeks",
            ],
            "recommended_actions": [
                "Deploy additional patrol units to MG Road and Brigade Road areas",
                "Coordinate cross-division task force for vehicle theft pattern",
                "Issue advisory to all SPs regarding seasonal crime increase",
            ],
            "confidence_score": 0.87,
            "model_version": "v2.3.1",
        },
        "alerts": [
            {"type": "crime_hotspot", "severity": "high", "area": "MG Road, Bengaluru", "crime_type": "Chain Snatching", "confidence": 0.92},
            {"type": "emerging_pattern", "severity": "medium", "area": "Mysuru Division", "crime_type": "Vehicle Theft", "confidence": 0.78},
        ],
        "last_updated": now.isoformat(),
    }


# ── CP Activity ──────────────────────────────────────────────────────────────


@router.get("/activity")
async def get_cp_activity():
    """Get state-wide activity feed for CP.

    Contract matches the frontend CPActivity page: summary
    (total/today/arrests/fir_registrations/alerts), activities
    (ActivityEntry[]), districts (string[]), action_types (string[]),
    last_updated.
    """
    now = datetime.now()
    districts = ["Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Hubballi", "Mangaluru", "Belagavi",
                 "Kalaburagi", "Shivamogga"]
    users = [("SI Sharma", "SI"), ("HC Kumar", "HC"), ("SI Meena", "SI"), ("ASI Gopal", "ASI"), ("PC Ramesh", "PC")]

    def entry(i: int) -> dict:
        template = [
            ("fir_registration", "FIR", "registered at", "Armed Robbery", "high"),
            ("resolution", "case", "chargesheeted at", "Murder", "info"),
            ("patrol", "Night patrol", "completed in", "0 incidents", "low"),
            ("alert", "AI warning issued", "spike detected in", "Chain snatching", "critical"),
            ("arrest", "arrest", "effected in", "Organized crime", "medium"),
        ][i % 5]
        action, resource, verb, detail, severity = template
        user, role = users[i % len(users)]
        return {
            "id": str(i + 1),
            "user": user,
            "user_role": role,
            "action": action,
            "resource": resource,
            "details": f"{resource} {verb} {detail}",
            "district": districts[i % len(districts)],
            "timestamp": (now - timedelta(minutes=15 * (i + 1))).isoformat(),
            "severity": severity,
        }

    activities = [entry(i) for i in range(10)]
    today = sum(1 for a in activities if a["timestamp"][:10] == now.date().isoformat())
    return {
        "summary": {
            "total": len(activities),
            "today": today,
            "arrests": len([a for a in activities if a["action"] == "arrest"]),
            "fir_registrations": len([a for a in activities if a["action"] == "fir_registration"]),
            "alerts": len([a for a in activities if a["action"] == "alert"]),
        },
        "activities": activities,
        "districts": districts,
        "action_types": ["fir_registration", "arrest", "alert", "patrol", "resolution"],
        "last_updated": now.isoformat(),
    }


# ── CP Notifications ─────────────────────────────────────────────────────────


@router.get("/notifications")
async def get_cp_notifications():
    """Get notifications for CP.

    Contract matches the frontend CPNotifications page: summary
    (total/unread/critical/today), notifications (NotificationItem[]
    with category in alert|intelligence|admin|system, critical, source,
    actionable), last_updated.
    """
    now = datetime.now()
    notifications = [
        {"id": "N-1", "title": "Critical Alert: Chain Snatching Spike", "message": "42% increase detected in Bengaluru Urban", "category": "alert", "read": False, "critical": True, "timestamp": (now - timedelta(hours=2)).isoformat(), "source": "AI Analytics", "actionable": True},
        {"id": "N-2", "title": "Weekly Report Ready", "message": "State-wide weekly crime report is available", "category": "system", "read": False, "critical": False, "timestamp": (now - timedelta(hours=6)).isoformat(), "source": "Reports", "actionable": True},
        {"id": "N-3", "title": "Infrastructure Alert", "message": "Sedam PS condition score critical (3.2)", "category": "admin", "read": True, "critical": False, "timestamp": (now - timedelta(hours=12)).isoformat(), "source": "Infrastructure Wing", "actionable": False},
        {"id": "N-4", "title": "Intelligence Input: Vehicle Theft Ring", "message": "Emerging pattern across Mysuru division", "category": "intelligence", "read": False, "critical": True, "timestamp": (now - timedelta(hours=26)).isoformat(), "source": "Crime Intelligence", "actionable": True},
        {"id": "N-5", "title": "System Maintenance", "message": "Scheduled maintenance of Command Centre systems", "category": "system", "read": True, "critical": False, "timestamp": (now - timedelta(hours=40)).isoformat(), "source": "IT Wing", "actionable": False},
    ]
    unread = len([n for n in notifications if not n["read"]])
    critical = len([n for n in notifications if n["critical"]])
    today = len([n for n in notifications if n["timestamp"][:10] == now.date().isoformat()])
    return {
        "summary": {
            "total": len(notifications),
            "unread": unread,
            "critical": critical,
            "today": today,
        },
        "notifications": notifications,
        "last_updated": now.isoformat(),
    }


# ── CP Networks ──────────────────────────────────────────────────────────────


@router.get("/networks")
async def get_cp_networks():
    """Get criminal network analysis for CP."""
    return {
        "networks": [
            {"id": "net-1", "name": "Bengaluru Theft Ring", "member_count": 8, "crime_types": ["Theft", "Burglary", "Chain Snatching"], "risk_score": 85, "districts": ["Bengaluru Urban", "Bengaluru Rural"]},
            {"id": "net-2", "name": "Mysuru Vehicle Theft Gang", "member_count": 5, "crime_types": ["Vehicle Theft"], "risk_score": 72, "districts": ["Mysuru", "Mandya"]},
            {"id": "net-3", "name": "Kalaburagi Mining Mafia", "member_count": 12, "crime_types": ["Illegal Mining", "Land Grabbing"], "risk_score": 68, "districts": ["Kalaburagi", "Bidar"]},
        ],
        "total_networks": 3,
        "total_members": 25,
        "last_updated": datetime.now().isoformat(),
    }


# ── CP Timeline ──────────────────────────────────────────────────────────────


@router.get("/timeline")
async def get_cp_timeline(hours: int = Query(24)):
    """Get state-wide timeline for CP.

    Returns the rich operational-feed contract (events / summary /
    timeline_markers) that the CPTimeline page renders, plus the legacy
    hourly-aggregate ``timeline`` buckets for backward compatibility.
    """
    now = datetime.now()
    # Legacy hourly aggregates (kept for backward compatibility)
    timeline = []
    for i in range(min(hours, 24)):
        dt = now - timedelta(hours=i)
        timeline.append({
            "time": dt.strftime("%H:00"),
            "firs_filed": random.randint(2, 15),
            "cases_solved": random.randint(0, 5),
            "patrols_active": random.randint(50, 120),
            "alerts_generated": random.randint(0, 3),
        })
    # Rich operational feed — the native contract the page renders
    events = [
        {"id": "tl-001", "type": "fir_registration", "title": "FIR Registered — Chain Snatching", "district": "Bengaluru Urban", "station": "Koramangala PS", "timestamp": (now - timedelta(minutes=10)).isoformat(), "severity": "high", "officer": "SI Meena K.", "details": "Victim reported chain snatching near Market Area at 19:30. CCTV footage being reviewed. Accused description obtained."},
        {"id": "tl-002", "type": "emergency", "title": "Emergency Response — Road Accident", "district": "Mysuru", "station": "MG Road PS", "timestamp": (now - timedelta(minutes=30)).isoformat(), "severity": "critical", "officer": "PI Ramesh", "details": "Multi-vehicle collision on Ring Road. 3 injured, traffic diverted. Ambulance dispatched. Investigation underway."},
        {"id": "tl-003", "type": "patrol", "title": "Patrol Deployment — Market Sector", "district": "Bengaluru Urban", "station": "BTM Layout PS", "timestamp": (now - timedelta(hours=1)).isoformat(), "severity": "info", "officer": "ASI Gopal", "details": "Routine patrol deployed to Market Sector. Focus on theft prevention during evening peak hours."},
        {"id": "tl-004", "type": "ai_alert", "title": "AI Alert — Crime Pattern Detected", "district": "Belagavi", "station": "Belagavi City PS", "timestamp": (now - timedelta(hours=2)).isoformat(), "severity": "medium", "officer": "System", "details": "ML model detected uptick in vehicle thefts along NH-4 corridor. 40% increase over baseline. Recommend increased patrol on highway stretch."},
        {"id": "tl-005", "type": "warning", "title": "Escalation Warning — Overdue Investigation", "district": "Kalaburagi", "station": "Kalaburagi PS", "timestamp": (now - timedelta(hours=4)).isoformat(), "severity": "high", "officer": "PI Shetty", "details": "FIR KSP-2026-035 (Burglary) overdue by 12 days. No case diary filed in 8 days. Escalated to ACP for review."},
        {"id": "tl-006", "type": "arrest", "title": "Arrest Made — Repeat Offender", "district": "Bengaluru Urban", "station": "Indiranagar PS", "timestamp": (now - timedelta(hours=6)).isoformat(), "severity": "high", "officer": "SI Venkatesh", "details": "Repeat offender Ravi Kumar apprehended in connection with 3 chain snatching cases. Weapon recovered. Remanded to judicial custody."},
        {"id": "tl-007", "type": "inter_agency", "title": "Inter-Agency Coordination — Narcotics Raid", "district": "Bengaluru Urban", "station": "Whitefield PS", "timestamp": (now - timedelta(hours=8)).isoformat(), "severity": "medium", "officer": "DCP Sharma", "details": "Joint operation with NCB and local task force. Raided 2 locations in Whitefield. 5 kg contraband seized. 4 suspects in custody."},
        {"id": "tl-008", "type": "resource_movement", "title": "Resource Movement — Forensic Van Deployed", "district": "Mysuru", "station": "Kuvempunagar PS", "timestamp": (now - timedelta(hours=12)).isoformat(), "severity": "info", "officer": "SI Priya", "details": "Mobile forensic van dispatched to Kuvempunagar crime scene. Expected to arrive within 30 mins. Evidence collection pending."},
        {"id": "tl-009", "type": "fir_registration", "title": "FIR Registered — Cyber Fraud", "district": "Bengaluru Urban", "station": "Electronic City PS", "timestamp": (now - timedelta(hours=15)).isoformat(), "severity": "medium", "officer": "SI Nagesh", "details": "Victim lost ₹2.3L to phishing scam. Bank account frozen. Cybercrime team notified for digital forensics."},
        {"id": "tl-010", "type": "patrol", "title": "Patrol Deployment — Night Beat", "district": "Belagavi", "station": "Belagavi City PS", "timestamp": (now - timedelta(hours=18)).isoformat(), "severity": "info", "officer": "ASI Kumar", "details": "Night beat patrol deployed to high-risk zones. 2 constables on foot patrol in Market Area. 1 PCR van on standby."},
    ]
    return {
        "total_events": len(events),
        "summary": {"fir_registrations": 2, "emergency_responses": 1, "patrol_deployments": 2, "ai_alerts": 1, "warning_escalations": 1, "resource_movements": 1, "inter_agency": 1, "arrests": 1},
        "events": events,
        "timeline_markers": [
            {"time": "00:00 – 04:00", "events": 2, "peak_type": "patrol"},
            {"time": "04:00 – 08:00", "events": 1, "peak_type": "fir_registration"},
            {"time": "08:00 – 12:00", "events": 1, "peak_type": "inter_agency"},
            {"time": "12:00 – 16:00", "events": 2, "peak_type": "arrest"},
            {"time": "16:00 – 20:00", "events": 2, "peak_type": "emergency"},
            {"time": "20:00 – 00:00", "events": 2, "peak_type": "ai_alert"},
        ],
        "period_hours": hours,
        "timeline": timeline,
        "hours": hours,
        "last_updated": now.isoformat(),
    }


# ── CP Media ─────────────────────────────────────────────────────────────────


@router.get("/media")
async def get_cp_media():
    """Get media reports and press coverage for CP."""
    now = datetime.now()
    return {
        "reports": [
            {"id": 1, "title": "Karnataka Police AI System Reduces Crime Rate", "source": "The Hindu", "date": (now - timedelta(days=2)).strftime("%Y-%m-%d"), "sentiment": "positive", "url": "#"},
            {"id": 2, "title": "Chain Snatching Cases Rise in Bengaluru", "source": "Deccan Herald", "date": (now - timedelta(days=1)).strftime("%Y-%m-%d"), "sentiment": "negative", "url": "#"},
            {"id": 3, "title": "Police Commissioner Reviews Infrastructure", "source": "Bangalore Mirror", "date": now.strftime("%Y-%m-%d"), "sentiment": "neutral", "url": "#"},
        ],
        "summary": {"positive": 1, "negative": 1, "neutral": 1},
        "last_updated": now.isoformat(),
    }


# ── CP Intelligence ──────────────────────────────────────────────────────────


@router.get("/intelligence")
async def get_cp_intelligence():
    """Get intelligence summary for CP."""
    now = datetime.now()
    return {
        "threats": [
            {"id": 1, "type": "organized_crime", "severity": "high", "description": "Interstate theft ring active in Bengaluru", "confidence": 0.89, "recommended_action": "Coordinate with neighboring states"},
            {"id": 2, "type": "cyber_fraud", "severity": "medium", "description": "Spike in online fraud reports from urban districts", "confidence": 0.82, "recommended_action": "Public awareness campaign"},
            {"id": 3, "type": "drug_trafficking", "severity": "high", "description": "Coastal route smuggling detected in Dakshina Kannada", "confidence": 0.78, "recommended_action": "Enhance coastal patrol"},
        ],
        "active_operations": 5,
        "informant_network": {"active_informants": 23, "reports_this_week": 12},
        "last_updated": now.isoformat(),
    }


# ── CP Risk ──────────────────────────────────────────────────────────────────


@router.get("/risk")
async def get_cp_risk():
    """Get state-wide risk assessment for CP."""
    return {
        "state_risk": {
            "overall_score": 72,
            "level": "elevated",
            "trend": "increasing",
        },
        "district_risks": [
            {"district": "Bengaluru Urban", "risk_score": 85, "level": "high", "top_crime": "Chain Snatching"},
            {"district": "Kalaburagi", "risk_score": 78, "level": "high", "top_crime": "Illegal Mining"},
            {"district": "Mysuru", "risk_score": 62, "level": "medium", "top_crime": "Vehicle Theft"},
            {"district": "Belagavi", "risk_score": 58, "level": "medium", "top_crime": "Border Smuggling"},
        ],
        "risk_factors": [
            {"factor": "Seasonal Crime Increase", "impact": 15, "trend": "increasing"},
            {"factor": "Resource Allocation Gaps", "impact": 12, "trend": "stable"},
            {"factor": "Cross-border Activity", "impact": 10, "trend": "increasing"},
        ],
        "last_updated": datetime.now().isoformat(),
    }


# ── CP GIS Data ──────────────────────────────────────────────────────────────


@router.get("/gis-data")
async def get_cp_gis_data():
    """Get GIS/map data for CP view."""
    return {
        "hotspots": [
            {"id": "hs-1", "lat": 12.9716, "lng": 77.5946, "crime_type": "Chain Snatching", "risk_score": 85, "area": "MG Road"},
            {"id": "hs-2", "lat": 12.9352, "lng": 77.6245, "crime_type": "Theft", "risk_score": 78, "area": "Koramangala"},
            {"id": "hs-3", "lat": 12.2958, "lng": 76.6394, "crime_type": "Vehicle Theft", "risk_score": 72, "area": "Mysuru"},
        ],
        "stations": [
            {"id": 1, "name": "Cubbon Park PS", "lat": 12.9768, "lng": 77.5929, "officers": 45, "fir_count": 124},
            {"id": 2, "name": "Koramangala PS", "lat": 12.9352, "lng": 77.6245, "officers": 38, "fir_count": 98},
            {"id": 3, "name": "MG Road PS", "lat": 12.9758, "lng": 77.6085, "officers": 42, "fir_count": 87},
        ],
        "districts": [
            {"name": "Bengaluru Urban", "center": [12.9716, 77.5946], "risk_level": "high"},
            {"name": "Mysuru", "center": [12.2958, 76.6394], "risk_level": "medium"},
        ],
        "last_updated": datetime.now().isoformat(),
    }


# ── CP Reports ───────────────────────────────────────────────────────────────


@router.get("/reports")
async def get_cp_reports():
    """Get state-wide reports for CP."""
    now = datetime.now()
    return {
        "summary": {
            "total_firs": 12483,
            "solved_rate": 72.4,
            "avg_response_time": 14.2,
            "officer_utilization": 78.5,
        },
        "top_districts": [
            {"name": "Bengaluru Urban", "fir_count": 2847, "solved_rate": 75.2},
            {"name": "Mysuru", "fir_count": 1123, "solved_rate": 78.5},
            {"name": "Belagavi", "fir_count": 876, "solved_rate": 71.8},
        ],
        "top_stations": [
            {"name": "Cubbon Park PS", "fir_count": 124, "solved_rate": 85.5},
            {"name": "Koramangala PS", "fir_count": 98, "solved_rate": 88.2},
            {"name": "MG Road PS", "fir_count": 87, "solved_rate": 82.3},
        ],
        "crime_trends": [
            {"crime_type": "Theft", "count": 3842, "pct_change": 5.2},
            {"crime_type": "Burglary", "count": 1256, "pct_change": -3.1},
            {"crime_type": "Assault", "count": 987, "pct_change": 2.8},
        ],
        "last_updated": now.isoformat(),
    }


# ── CP Forecast ──────────────────────────────────────────────────────────────


@router.get("/forecast")
async def get_cp_forecast():
    """Get crime forecast for CP."""
    now = datetime.now()
    forecasts = []
    for i in range(30):
        dt = now + timedelta(days=i + 1)
        base = 100 + random.randint(-20, 20)
        forecasts.append({
            "date": dt.strftime("%Y-%m-%d"),
            "predicted": base,
            "lower": int(base * 0.8),
            "upper": int(base * 1.2),
        })
    return {
        "forecasts": forecasts,
        "model": "holtwinters_triple",
        "confidence": 0.85,
        "total_predicted": sum(f["predicted"] for f in forecasts),
        "last_updated": now.isoformat(),
    }


# ── CP Patterns ──────────────────────────────────────────────────────────────


@router.get("/patterns")
async def get_cp_patterns():
    """Get crime patterns for CP."""
    return {
        "seasonal": {
            "peak_hour": 20,
            "peak_day": "Saturday",
            "peak_month": "August",
        },
        "emerging": [
            {"pattern_type": "Chain Snatching", "description": "Spike in evening incidents near commercial corridors", "severity": "high"},
            {"pattern_type": "Vehicle Theft", "description": "Two-wheelers targeted in residential areas", "severity": "medium"},
        ],
        "clusters": [
            {"area": "MG Road Corridor", "crime_count": 45, "dominant_crime_type": "Chain Snatching", "density": "high"},
            {"area": "Koramangala Residential", "crime_count": 32, "dominant_crime_type": "Theft", "density": "medium"},
        ],
        "last_updated": datetime.now().isoformat(),
    }


# ── CP Finance ───────────────────────────────────────────────────────────────


@router.get("/finance")
async def get_cp_finance():
    """Get financial alerts for CP."""
    now = datetime.now()
    return {
        "alerts": [
            {"id": 1, "anomaly_type": "structuring", "station_name": "Koramangala PS", "amount": 450000, "entity_name": "SK Enterprises", "flagged_at": (now - timedelta(days=1)).isoformat()},
            {"id": 2, "anomaly_type": "fan_in", "station_name": "MG Road PS", "amount": 1250000, "entity_name": "Multiple accounts → Singh Holdings", "flagged_at": (now - timedelta(days=2)).isoformat()},
            {"id": 3, "anomaly_type": "velocity", "station_name": "Whitefield PS", "amount": 89000, "entity_name": "Rapid transactions in 1hr", "flagged_at": (now - timedelta(days=3)).isoformat()},
        ],
        "summary": {"total_alerts": 3, "total_amount": 1789000, "high_priority": 1},
        "last_updated": now.isoformat(),
    }


# ── CP Patrol ────────────────────────────────────────────────────────────────


@router.get("/patrol")
async def get_cp_patrol():
    """Get patrol data for CP.

    Contract matches what the frontend CPPatrol page renders: summary
    (active_patrols/vehicles_deployed/officers_on_patrol/coverage_pct/
    shifts_active/districts_covered), patrols (PatrolEntry[]), districts,
    last_updated.
    """
    now = datetime.now()
    districts = ["Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Hubballi", "Mangaluru", "Belagavi"]
    vehicles = ["Gypsy", "Bolero", "Scorpio", "Tavera", "Motorcycle"]
    zones = ["A Sector", "B Sector", "C Sector", "D Sector", "E Sector", "F Sector"]
    statuses = ["active", "on_break", "completed", "standby"]
    officer_pool = ["SI Sharma", "HC Kumar", "PC Venkatesh", "SI Meena", "PC Ramesh", "ASI Gopal", "SI Priya", "PC Suresh"]

    patrols = []
    for i in range(14):
        officers = min(3, (i % 3) + 1)
        selected = [officer_pool[(i + j) % len(officer_pool)] for j in range(officers)]
        patrols.append({
            "id": f"PT-{str(i + 1).zfill(3)}",
            "district": districts[i % len(districts)],
            "zone": zones[i % len(zones)],
            "vehicle": vehicles[i % len(vehicles)],
            "officers": officers,
            "officer_names": selected,
            "status": statuses[i % len(statuses)],
            "started_at": (now - timedelta(hours=(i * 37) % 8 + 1)).isoformat(),
            "coverage_hours": (i % 8) + 4,
            "beat": f"Beat {chr(65 + (i % 6))}-{i // 6 + 1}",
        })

    active = [p for p in patrols if p["status"] == "active"]
    return {
        "summary": {
            "active_patrols": len(active),
            "vehicles_deployed": len([p for p in patrols if p["status"] != "standby"]),
            "officers_on_patrol": sum(p["officers"] for p in active),
            "coverage_pct": round(len(active) / len(patrols) * 100),
            "shifts_active": 3,
            "districts_covered": len(set(p["district"] for p in patrols)),
        },
        "patrols": patrols,
        "districts": districts,
        "last_updated": now.isoformat(),
    }


# ── CP Officers ──────────────────────────────────────────────────────────────


@router.get("/officers")
async def get_cp_officers():
    """Get officer/personnel data for CP.

    Contract matches what the frontend CPOfficers page renders:
    summary (total_sanctioned/total_deployed/vacancy_rate_pct/by_rank object),
    by_district (with sanctioned/deployed/vacancies/vacancy_rate_pct/by_rank),
    recruitment_pipeline, vacancy_alerts, last_updated.
    """
    districts = [
        {"name": "Bengaluru Urban", "population": 9621000, "officers_per_100k": 142},
        {"name": "Bengaluru Rural", "population": 987000, "officers_per_100k": 78},
        {"name": "Mysuru", "population": 3065000, "officers_per_100k": 105},
        {"name": "Belagavi", "population": 4779000, "officers_per_100k": 88},
        {"name": "Dharwad", "population": 1847000, "officers_per_100k": 95},
        {"name": "Mangaluru (Dakshina Kannada)", "population": 2089000, "officers_per_100k": 112},
        {"name": "Tumakuru", "population": 2678000, "officers_per_100k": 72},
        {"name": "Kalaburagi", "population": 2566000, "officers_per_100k": 68},
        {"name": "Shivamogga", "population": 1752000, "officers_per_100k": 82},
        {"name": "Ballari", "population": 2460000, "officers_per_100k": 62},
        {"name": "Udupi", "population": 1177000, "officers_per_100k": 90},
        {"name": "Hassan", "population": 1776000, "officers_per_100k": 76},
    ]

    # Rank distribution weights (share of a district's deployed strength).
    RANK_WEIGHTS: list[tuple[str, float]] = [
        ("DGP", 0.0004), ("ADGP", 0.001), ("IGP", 0.002), ("DIG", 0.004),
        ("SP", 0.01), ("Addl_SP", 0.02), ("DySP", 0.03), ("PI", 0.08),
        ("PSI", 0.16), ("ASI", 0.22), ("HC", 0.30), ("PC", 0.1726),
    ]

    def distribute_ranks(deployed: int) -> list[dict[str, Any]]:
        counts: list[dict[str, Any]] = []
        remaining = deployed
        for rank, weight in RANK_WEIGHTS:
            if remaining <= 0:
                counts.append({"rank": rank, "count": 0})
                continue
            if rank == "PC":
                # PC absorbs the remainder so the sum matches deployed exactly.
                counts.append({"rank": rank, "count": remaining})
                remaining = 0
            else:
                n = int(round(deployed * weight))
                n = min(n, remaining)
                counts.append({"rank": rank, "count": n})
                remaining -= n
        return counts

    by_district: list[dict[str, Any]] = []
    summary_by_rank: dict[str, int] = {}
    total_sanctioned = 0
    total_deployed = 0

    for i, d in enumerate(districts):
        sanctioned = int(round(d["population"] * d["officers_per_100k"] / 100_000 * 1.15))
        # Deterministic per-district vacancy rate (roughly 8-22%, varies by index).
        vacancy_rate_pct = round(8.0 + ((d["population"] // 97_000) % 15), 1)
        deployed = int(round(sanctioned * (1 - vacancy_rate_pct / 100)))
        vacancies = sanctioned - deployed
        total_sanctioned += sanctioned
        total_deployed += deployed

        rank_counts = distribute_ranks(deployed)
        for rc in rank_counts:
            summary_by_rank[rc["rank"]] = summary_by_rank.get(rc["rank"], 0) + rc["count"]

        by_district.append({
            "district": d["name"],
            "sanctioned": sanctioned,
            "deployed": deployed,
            "vacancies": vacancies,
            "vacancy_rate_pct": vacancy_rate_pct,
            "by_rank": rank_counts,
        })

    total_vacancies = total_sanctioned - total_deployed
    overall_rate = round(total_vacancies / total_sanctioned * 100, 1) if total_sanctioned else 0

    vacancy_alerts = []
    for dist in sorted(by_district, key=lambda x: x["vacancy_rate_pct"], reverse=True):
        if dist["vacancy_rate_pct"] < 12:
            continue
        worst_rank = max(dist["by_rank"], key=lambda r: r["count"] * 0.2 + r["count"])
        rank_label = worst_rank["rank"] if worst_rank["count"] else "PC"
        vacancy_alerts.append({
            "district": dist["district"],
            "rank": rank_label,
            "vacancies": dist["vacancies"],
            "priority": "critical" if dist["vacancy_rate_pct"] >= 20 else "high" if dist["vacancy_rate_pct"] >= 15 else "medium",
        })

    return {
        "summary": {
            "total_sanctioned": total_sanctioned,
            "total_deployed": total_deployed,
            "vacancy_rate_pct": overall_rate,
            "by_rank": summary_by_rank,
        },
        "by_district": by_district,
        "recruitment_pipeline": [
            {"stage": "Written Exam (PSI)", "count": 12500, "eta": "2026-08"},
            {"stage": "Physical Endurance Test", "count": 8400, "eta": "2026-09"},
            {"stage": "Interview Round", "count": 3200, "eta": "2026-10"},
            {"stage": "Medical Verification", "count": 1800, "eta": "2026-11"},
            {"stage": "Training Academy (PC)", "count": 2500, "eta": "2026-12"},
        ],
        "vacancy_alerts": vacancy_alerts[:8],
        "last_updated": datetime.now().isoformat(),
    }


# ── CP Orders ────────────────────────────────────────────────────────────────


@router.get("/orders")
async def get_cp_orders():
    """Get orders/circulars for CP."""
    now = datetime.now()
    return {
        "orders": [
            {"id": "ORD-2026-001", "title": "Strengthen Night Patrols in Bengaluru Urban", "description": "Increase night patrol frequency across all stations to counter rising chain snatching incidents", "issued_to": "All DCPs, Bengaluru Urban", "priority": "critical", "status": "active", "date": (now - timedelta(days=1)).strftime("%Y-%m-%d"), "due_date": (now + timedelta(days=7)).strftime("%Y-%m-%d"), "category": "Operations"},
            {"id": "ORD-2026-003", "title": "Quarterly Firearms Inspection", "description": "All stations to complete quarterly firearms inspection and submit reports", "issued_to": "All District SPs", "priority": "high", "status": "active", "date": (now - timedelta(days=3)).strftime("%Y-%m-%d"), "due_date": (now + timedelta(days=14)).strftime("%Y-%m-%d"), "category": "Administration"},
            {"id": "ORD-2026-008", "title": "Women Safety Audit", "description": "Conduct safety audit of all police stations for women-friendly infrastructure", "issued_to": "All District SPs, W&J Wing", "priority": "medium", "status": "completed", "date": (now - timedelta(days=60)).strftime("%Y-%m-%d"), "due_date": (now - timedelta(days=15)).strftime("%Y-%m-%d"), "category": "Administration"},
        ],
        "summary": {"total": 3, "active": 2, "completed": 1, "overdue": 0},
        "last_updated": now.isoformat(),
    }


# ── CP Coordination ──────────────────────────────────────────────────────────


@router.get("/coordination")
async def get_cp_coordination():
    """Get inter-district coordination data for CP."""
    return {
        "active_coordination": [
            {"id": 1, "type": "joint_operation", "districts": ["Bengaluru Urban", "Bengaluru Rural"], "purpose": "Vehicle theft ring investigation", "status": "active", "start_date": "2026-07-20"},
            {"id": 2, "type": "border_patrol", "districts": ["Belagavi", "Maharashtra"], "purpose": "Cross-border smuggling prevention", "status": "active", "start_date": "2026-07-15"},
        ],
        "pending_requests": [
            {"from": "Kalaburagi SP", "to": "Bidar SP", "purpose": "Mining mafia coordination", "requested_date": "2026-07-25"},
        ],
        "last_updated": datetime.now().isoformat(),
    }


# ── CP Settings ──────────────────────────────────────────────────────────────


@router.get("/settings")
async def get_cp_settings():
    """Get CP system settings."""
    return {
        "notifications": {"email": True, "sms": True, "push": True},
        "auto_refresh_interval": 60,
        "default_view": "dashboard",
        "alerts_enabled": True,
        "last_updated": datetime.now().isoformat(),
    }
