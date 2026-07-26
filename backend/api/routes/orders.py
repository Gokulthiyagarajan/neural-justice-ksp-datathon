"""Orders module — departmental orders, notices, and circulars with synthetic data."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger("nj.api.routes.orders")

router = APIRouter(prefix="/api/orders", tags=["Orders"])

# ── Synthetic data ───────────────────────────────────────────────────────────

ORDER_TYPES = ["Circular", "Standing Order", "Directive", "Notification", "Memorandum", "Special Order"]
PRIORITIES = ["routine", "routine", "medium", "high", "urgent"]
DEPARTMENTS = ["Operations", "Intelligence", "Traffic", "Cyber Crime", "Special Branch", "Administration", "Legal"]

ORDERS: list[dict[str, Any]] = []
for i in range(30):
    d = datetime.now() - timedelta(days=random.randint(0, 180))
    order: dict[str, Any] = {
        "id": i + 1,
        "order_no": f"KSP/ORD/{2026}/{100 + i:04d}",
        "title": random.choice([
            "Strengthening night patrol protocols",
            "Revised guidelines for FIR registration",
            "Anti-chain snatching squad deployment",
            "Traffic management during festival season",
            "Cyber crime awareness campaign directive",
            "Special drive against drug peddling",
            "Witness protection program implementation",
            "Body camera usage mandate for field officers",
            "Emergency response protocol update",
            "Inter-state coordination for vehicle theft cases",
            "Temporary transfer of officers for election duty",
            "New SOP for evidence collection at crime scenes",
            "Drunk driving checkpost deployment schedule",
        ]),
        "type": random.choice(ORDER_TYPES),
        "priority": random.choice(PRIORITIES),
        "department": random.choice(DEPARTMENTS),
        "issued_by": random.choice([
            "Commissioner of Police", "Additional CP (Operations)",
            "DCP (Intelligence)", "Joint CP (Admin)",
            "Inspector General (Law & Order)",
        ]),
        "issued_date": d.strftime("%Y-%m-%d"),
        "effective_date": (d + timedelta(days=random.randint(1, 7))).strftime("%Y-%m-%d"),
        "expiry_date": (d + timedelta(days=random.randint(30, 365))).strftime("%Y-%m-%d"),
        "summary": random.choice([
            "All SHOs to ensure night patrolling is conducted in two shifts.",
            "Updated guidelines for e-FIR registration with new categories.",
            "Deploy 5 dedicated personnel per division for anti-snatching operations.",
            "Traffic diversions and parking restrictions for upcoming festivals.",
            "Coordinate with banks and telecom providers for cyber fraud awareness.",
            "Intensify checking at identified drug hotspots in the district.",
            "Ensure confidentiality of witness identities in sensitive cases.",
        ]),
        "jurisdiction": random.choice(["State-wide", "Bengaluru Division", "Mysuru Division", "Belagavi Division", "Kalaburagi Division"]),
        "attachments": random.randint(0, 3),
        "status": random.choice(["active", "active", "active", "superseded", "expired"]),
        "created_at": d.isoformat(),
        "updated_at": datetime.now().isoformat(),
    }
    ORDERS.append(order)

ORDERS.sort(key=lambda o: o["issued_date"], reverse=True)


@router.get("", summary="List orders")
async def list_orders(
    priority: str | None = Query(None),
    department: str | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    results = ORDERS.copy()
    if priority:
        results = [o for o in results if o["priority"] == priority]
    if department:
        results = [o for o in results if o["department"].lower() == department.lower()]
    if status:
        results = [o for o in results if o["status"] == status]
    if search:
        q = search.lower()
        results = [o for o in results if q in o["title"].lower() or q in o["order_no"].lower()]

    total = len(results)
    start = (page - 1) * per_page
    items = results[start:start + per_page]
    return {"success": True, "data": items, "total": total, "page": page, "per_page": per_page}


@router.get("/{order_id}", summary="Get order details")
async def get_order(order_id: int):
    for o in ORDERS:
        if o["id"] == order_id:
            return {"success": True, "data": o}
    raise HTTPException(404, "Order not found")


@router.get("/stats/active", summary="Active orders summary")
async def active_order_stats():
    active = [o for o in ORDERS if o["status"] == "active"]
    return {
        "success": True,
        "data": {
            "total_active": len(active),
            "by_priority": {p: len([o for o in active if o["priority"] == p]) for p in set(o["priority"] for o in active)},
            "by_department": {d: len([o for o in active if o["department"] == d]) for d in set(o["department"] for o in active)},
        },
    }
