"""
Query executor — runs parameterized queries via the DataStore abstraction,
applies jurisdiction scoping, returns structured results with evidence.
"""
import logging
from typing import Any
from backend.api.copilot.models import Intent, QueryEvidence
from backend.api.copilot.query_templates import TEMPLATES
from backend.api.copilot.datastore import DataStore
from backend.api.copilot.auth import JurisdictionScope

logger = logging.getLogger(__name__)


def _build_jurisdiction_filter(scope: JurisdictionScope) -> str:
    """Build SQL WHERE clause fragment for jurisdiction scoping."""
    if scope.station_id:
        return f" AND station IN (SELECT name FROM stations WHERE id = {int(scope.station_id)})"
    if scope.district_id:
        return f" AND district IN (SELECT name FROM districts WHERE id = {int(scope.district_id)})"
    return ""


def execute_intent_query(
    intent: Intent,
    entities: dict[str, str],
    scope: JurisdictionScope,
    datastore: DataStore,
) -> tuple[list[QueryEvidence], list[dict[str, Any]]]:
    """Execute the query template for the given intent.

    Returns: (evidence_list, result_rows)
    """
    if intent == Intent.GENERAL_QUERY:
        return [], []

    template = TEMPLATES.get(intent)
    if not template:
        logger.warning("No template for intent: %s", intent.value)
        return [], []

    jurisdiction_filter = _build_jurisdiction_filter(scope)
    sql = template["sql"].replace("{jurisdiction_filter}", jurisdiction_filter)

    params = []
    param_defs = template["params"]
    for key, pattern in param_defs.items():
        value = entities.get(key, "")
        if value:
            params.append(pattern.replace(f"{{{key}}}", value))
        else:
            if "%" in pattern:
                params.append("%")
            else:
                params.append("")

    source_table = template["source_table"]
    try:
        rows = datastore.query(sql, tuple(params))
        evidence = [QueryEvidence(
            source_table=source_table,
            filters_applied={
                "jurisdiction": scope.jurisdiction_type,
                **{k: v for k, v in entities.items() if v},
            },
            row_count=len(rows),
        )]
        logger.info("Query executed: %s → %d rows", intent.value, len(rows))
        return evidence, rows
    except Exception as e:
        logger.error("Query failed for intent %s: %s", intent.value, e)
        return [QueryEvidence(
            source_table=source_table,
            filters_applied={"error": str(e)},
            row_count=0,
        )], []


def _table_columns(datastore: DataStore, table: str) -> list[str]:
    """Schema verification: return column names for a table (empty if missing)."""
    try:
        rows = datastore.query(f"PRAGMA table_info({table})")
        return [r["name"] for r in rows]
    except Exception as e:
        logger.warning("Schema check failed for %s: %s", table, str(e)[:100])
        return []


def execute_case_timeline_query(
    entities: dict[str, str],
    scope: JurisdictionScope,
    datastore: DataStore,
) -> tuple[list[QueryEvidence], list[dict[str, Any]]]:
    """Stage 2 — multi-source joined fetch for the case timeline intent.

    Verifies schema before use (master-prompt rule), then pulls:
      - cases row        (master record for the crime number)
      - activity rows    (case events: registered / updated / arrest / chargesheet …)
      - orders rows      (investigation orders referencing the case)
      - notifications    (alerts referencing the case)

    Returns (evidence, rows) where rows are tagged with their source table
    so the Stage 3 response builder can render a factual chronology.
    """
    case_id = (entities.get("case_id") or "").strip().upper()
    evidence: list[QueryEvidence] = []
    merged: list[dict[str, Any]] = []

    # Schema verification before use
    cases_cols = _table_columns(datastore, "cases")
    if not cases_cols or "crime_no" not in cases_cols:
        evidence.append(QueryEvidence(
            source_table="cases",
            filters_applied={"error": "cases.crime_no column missing"},
            row_count=0,
        ))
        return evidence, []

    jurisdiction_filter = _build_jurisdiction_filter(scope)

    # 1. Master case record (crime_no may be full or partial)
    like = f"%{case_id}%"
    case_rows = datastore.query(
        f"SELECT * FROM cases WHERE crime_no LIKE ?{jurisdiction_filter}",
        (like,),
    )
    evidence.append(QueryEvidence(
        source_table="cases",
        filters_applied={"crime_no_like": like, "jurisdiction": scope.jurisdiction_type},
        row_count=len(case_rows),
    ))
    for r in case_rows:
        r["_source"] = "cases"
        merged.append(r)

    # RBAC gate: for station/district-scoped users, the case itself must be
    # in scope before ANY related records are returned. Orders/notifications/
    # activity reference the crime number but are NOT reliably scoped by
    # station column, so we never leak them for out-of-scope cases.
    scope_restricted = bool(scope.station_id or scope.district_id)
    if scope_restricted and not case_rows:
        logger.info(
            "RBAC gate: case %s out of %s scope → refusing related records",
            case_id, scope.jurisdiction_type,
        )
        evidence.append(QueryEvidence(
            source_table="activity",
            filters_applied={"blocked_by_jurisdiction": scope.jurisdiction_type},
            row_count=0,
        ))
        return evidence, merged

    # 2. Activity events for this case
    activity_cols = _table_columns(datastore, "activity")
    if activity_cols and "entity_id" in activity_cols:
        try:
            act_rows = datastore.query(
                "SELECT * FROM activity WHERE entity_id LIKE ?",
                (like,),
            )
        except Exception as e:
            logger.warning("activity fetch failed: %s", str(e)[:100])
            act_rows = []
        evidence.append(QueryEvidence(
            source_table="activity",
            filters_applied={"entity_id_like": like},
            row_count=len(act_rows),
        ))
        for r in act_rows:
            r["_source"] = "activity"
            merged.append(r)
    else:
        evidence.append(QueryEvidence(
            source_table="activity",
            filters_applied={"error": "activity.entity_id column missing"},
            row_count=0,
        ))

    # 3. Orders referencing the case (title/description text match)
    orders_cols = _table_columns(datastore, "orders")
    if orders_cols and "title" in orders_cols:
        try:
            ord_rows = datastore.query(
                "SELECT * FROM orders WHERE title LIKE ? OR description LIKE ?",
                (like, like),
            )
        except Exception as e:
            logger.warning("orders fetch failed: %s", str(e)[:100])
            ord_rows = []
        evidence.append(QueryEvidence(
            source_table="orders",
            filters_applied={"title_or_description_like": like},
            row_count=len(ord_rows),
        ))
        for r in ord_rows:
            r["_source"] = "orders"
            merged.append(r)
    else:
        evidence.append(QueryEvidence(
            source_table="orders",
            filters_applied={"error": "orders table missing"},
            row_count=0,
        ))

    # 4. Notifications referencing the case
    notif_cols = _table_columns(datastore, "notifications")
    if notif_cols and "title" in notif_cols:
        try:
            n_rows = datastore.query(
                "SELECT * FROM notifications WHERE title LIKE ? OR message LIKE ?",
                (like, like),
            )
        except Exception as e:
            logger.warning("notifications fetch failed: %s", str(e)[:100])
            n_rows = []
        evidence.append(QueryEvidence(
            source_table="notifications",
            filters_applied={"title_or_message_like": like},
            row_count=len(n_rows),
        ))
        for r in n_rows:
            r["_source"] = "notifications"
            merged.append(r)
    else:
        evidence.append(QueryEvidence(
            source_table="notifications",
            filters_applied={"error": "notifications table missing"},
            row_count=0,
        ))

    logger.info("Timeline query for %s → %d merged rows", case_id, len(merged))
    return evidence, merged


# Fraud-family crime types that constitute the Suspicious Transaction Report.
# Confirmed against the deployed database's cases.crime_type values.
_FRAUD_FAMILY_TYPES = [
    "Criminal Breach of Trust (Financial)",
    "Cheating & Fraud",
    "Online Financial Fraud",
    "Identity Theft",
    "Criminal Breach of Trust",
    "Cyber Fraud",
    "Cheating",
    "Fraud",
]


def execute_financial_intelligence_query(
    scope: JurisdictionScope,
    datastore: DataStore,
) -> tuple[list[QueryEvidence], list[dict[str, Any]]]:
    """Stage 2 — fraud-family FIR aggregates for the Suspicious Transaction Report.

    Jurisdiction-scoped via the standard station/district filter. Returns
    (evidence, rows) where aggregate rows are tagged _kind="aggregate" and
    recent case-scoped rows are tagged _kind="recent". Aggregate/case-level
    data only — no individual risk profiles, no inferred transactions.
    """
    evidence: list[QueryEvidence] = []
    rows: list[dict[str, Any]] = []

    # Schema verification before use
    cases_cols = _table_columns(datastore, "cases")
    if not cases_cols or "crime_type" not in cases_cols:
        evidence.append(QueryEvidence(
            source_table="cases",
            filters_applied={"error": "cases.crime_type column missing"},
            row_count=0,
        ))
        return evidence, []

    jurisdiction_filter = _build_jurisdiction_filter(scope)
    placeholders = ", ".join("?" * len(_FRAUD_FAMILY_TYPES))
    base_where = f"crime_type IN ({placeholders})"

    # Schema-adaptive: deployed DB uses is_solved + occurrence_date/filing_date;
    # older local DBs use status + date_reported. Never query a missing column.
    has_is_solved = "is_solved" in cases_cols
    if has_is_solved:
        solved_expr = "COALESCE(SUM(CASE WHEN is_solved = 1 THEN 1 ELSE 0 END), 0)"
    else:
        solved_expr = "COALESCE(SUM(CASE WHEN status LIKE '%closed%' OR status LIKE '%solved%' THEN 1 ELSE 0 END), 0)"
    if "occurrence_date" in cases_cols and "filing_date" in cases_cols:
        order_expr = "COALESCE(occurrence_date, filing_date)"
        date_cols = "occurrence_date, filing_date"
    elif "date_reported" in cases_cols:
        order_expr = "date_reported"
        date_cols = "date_reported"
    else:
        order_expr = "id"
        date_cols = ""

    try:
        agg_rows = datastore.query(
            "SELECT crime_type, COUNT(*) AS total, "
            f"{solved_expr} AS solved "
            f"FROM cases WHERE {base_where}{jurisdiction_filter} "
            "GROUP BY crime_type ORDER BY total DESC",
            tuple(_FRAUD_FAMILY_TYPES),
        )
    except Exception as e:
        logger.error("Financial aggregates query failed: %s", str(e)[:200])
        evidence.append(QueryEvidence(
            source_table="cases",
            filters_applied={"error": str(e)[:200]},
            row_count=0,
        ))
        return evidence, []

    for r in agg_rows:
        r["unresolved"] = max(int(r.get("total", 0)) - int(r.get("solved", 0)), 0)

    evidence.append(QueryEvidence(
        source_table="cases",
        filters_applied={
            "crime_types": ", ".join(_FRAUD_FAMILY_TYPES),
            "jurisdiction": scope.jurisdiction_type,
        },
        row_count=sum(int(r.get("total", 0)) for r in agg_rows),
    ))
    for r in agg_rows:
        r["_kind"] = "aggregate"
        rows.append(r)

    # Recently registered fraud-type FIRs (case-scoped rows only)
    try:
        recent_rows = datastore.query(
            "SELECT crime_no, crime_type, station, district, status"
            f"{', ' + date_cols if date_cols else ''} "
            f"FROM cases WHERE {base_where}{jurisdiction_filter} "
            f"ORDER BY {order_expr} DESC LIMIT 8",
            tuple(_FRAUD_FAMILY_TYPES),
        )
    except Exception as e:
        logger.warning("Financial recent-FIRs query failed: %s", str(e)[:100])
        recent_rows = []
    for r in recent_rows:
        r["_kind"] = "recent"
        rows.append(r)

    logger.info("Financial intelligence query → %d aggregate, %d recent rows",
                len(agg_rows), len(recent_rows))
    return evidence, rows
