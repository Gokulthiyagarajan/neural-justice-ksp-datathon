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
