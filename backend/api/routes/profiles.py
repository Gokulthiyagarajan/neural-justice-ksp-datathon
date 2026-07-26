"""Criminal Profiles module — offender records, repeat offenders, gang associations."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger("nj.api.routes.profiles")

router = APIRouter(prefix="/api/profiles", tags=["Criminal Profiles"])

# ── Synthetic data ───────────────────────────────────────────────────────────

FIRST_NAMES = ["Ravi", "Suresh", "Manoj", "Venkatesh", "Arun", "Kiran", "Dinesh",
               "Prakash", "Ganesh", "Mahesh", "Sanjay", "Anil", "Vijay", "Kumar",
               "Satish", "Ramesh", "Siddharth", "Naveen", "Pavan", "Harsha"]
LAST_NAMES = ["Kumar", "Sharma", "Rao", "Patel", "Reddy", "Naik", "Shetty",
              "Acharya", "Hegde", "Poojari", "Gowda", "Murthy", "Iyer", "Joshi"]
CRIMES = ["Theft", "Burglary", "Assault", "Robbery", "Criminal Trespass",
          "Cheating", "Forgery", "Drug Possession", "Chain Snatching",
          "Vehicle Theft", "House Breaking", "Extortion"]

PROFILES: list[dict[str, Any]] = []
for i in range(40):
    fname = random.choice(FIRST_NAMES)
    lname = random.choice(LAST_NAMES)
    birth = datetime.now() - timedelta(days=random.randint(6570, 21900))
    first_offence = birth + timedelta(days=random.randint(6570, 15000))
    offences = random.randint(1, 12)
    profile: dict[str, Any] = {
        "id": i + 1,
        "name": f"{fname} {lname}",
        "aliases": [f"{fname}"],
        "gender": random.choice(["Male", "Male", "Male", "Female"]),
        "age": random.randint(18, 65),
        "date_of_birth": birth.strftime("%Y-%m-%d"),
        "address": f"{random.randint(1, 999)}, {random.choice(['Main Road', 'Cross Road', 'Temple Street', 'Market Road', 'Industrial Area'])}, {random.choice(['Bengaluru', 'Mysuru', 'Mandya', 'Hassan', 'Mangaluru'])}",
        "phone": f"+91-{random.randint(7000000000, 9999999999)}",
        "id_marks": random.choice([
            "Mole on left cheek", "Scar on right forearm",
            "Tattoo on left hand", "None",
            "Birthmark on neck", "Missing upper front tooth",
        ]),
        "offence_count": offences,
        "active_warrants": random.randint(0, min(3, offences)),
        "is_repeat_offender": offences >= 3,
        "risk_score": round(random.uniform(10, 95), 1),
        "gang_affiliation": random.choice([None, None, None, "D-Company", "Local Rowdy Gang", "Bike Thieves Ring", "Drug Cartel"]),
        "status": random.choice(["active", "active", "active", "under_surveillance", "incarcerated", "released"]),
        "last_known_location": f"{random.choice(['Bengaluru', 'Mysuru', 'Mandya', 'Hassan', 'Mangaluru', 'Belagavi'])} {random.choice(['Urban', 'Rural', 'Central', 'East', 'West', 'North', 'South'])}",
        "crime_types": random.sample(CRIMES, random.randint(1, 4)),
        "modus_operandi": random.choice([
            "Targets jewellery shops during closing hours",
            "Breaks into houses through rear windows",
            "Snatches chains from women walking alone",
            "Uses fake identities for bank fraud",
            "Operates in teams of 2-3 on motorcycles",
            "Targets parked vehicles in residential areas",
        ]),
        "associated_profiles": random.sample(range(1, 41), random.randint(0, 5)),
        "created_at": (datetime.now() - timedelta(days=random.randint(1, 365))).isoformat(),
        "updated_at": datetime.now().isoformat(),
    }
    PROFILES.append(profile)


# ── Routes ───────────────────────────────────────────────────────────────────


@router.get("", summary="List criminal profiles")
async def list_profiles(
    status: str | None = Query(None),
    search: str | None = Query(None),
    min_risk: float | None = Query(None, ge=0, le=100),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    results = PROFILES.copy()
    if status:
        results = [p for p in results if p["status"] == status]
    if search:
        q = search.lower()
        results = [p for p in results if q in p["name"].lower()]
    if min_risk is not None:
        results = [p for p in results if p["risk_score"] >= min_risk]

    total = len(results)
    start = (page - 1) * per_page
    items = results[start:start + per_page]
    return {"success": True, "data": items, "total": total, "page": page, "per_page": per_page}


@router.get("/{profile_id}", summary="Get profile details")
async def get_profile(profile_id: int):
    for p in PROFILES:
        if p["id"] == profile_id:
            return {"success": True, "data": p}
    raise HTTPException(404, "Profile not found")


@router.get("/{profile_id}/timeline", summary="Get offender timeline")
async def get_profile_timeline(profile_id: int):
    if not any(p["id"] == profile_id for p in PROFILES):
        raise HTTPException(404, "Profile not found")

    events = []
    for i in range(random.randint(2, 8)):
        d = datetime.now() - timedelta(days=random.randint(1, 365 * 3))
        events.append({
            "date": d.strftime("%Y-%m-%d"),
            "event": random.choice([
                "Arrested", "Arrested", "Chargesheet filed", "Released on bail",
                "Court appearance", "Parole granted", "FIR registered",
                "Surveillance initiated", "Warrant issued",
            ]),
            "station": random.choice(["Vijayanagar PS", "Jayanagar PS", "Mysuru North PS", "Mangaluru Central PS"]),
            "crime_no": f"FIR-{random.randint(100, 999)}-2026",
        })
    events.sort(key=lambda e: e["date"], reverse=True)
    return {"success": True, "data": events}
