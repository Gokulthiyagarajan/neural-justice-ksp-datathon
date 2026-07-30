"""
Parameterized SQL templates for each intent.

Each template is a dict with: sql, source_table, params
The executor applies jurisdiction_scope filters before execution.

VERIFIED table/column names against seed_catalyst_db.py schema.
"""
from backend.api.copilot.models import Intent

TEMPLATES = {
    Intent.CRIME_TRENDS: {
        "sql": """
            SELECT crime_type, COUNT(*) as count
            FROM cases
            WHERE 1=1 {jurisdiction_filter}
            GROUP BY crime_type
            ORDER BY count DESC
        """,
        "source_table": "cases",
        "params": {},
    },
    Intent.HOTSPOT: {
        "sql": """
            SELECT station, district, COUNT(*) as case_count
            FROM cases
            WHERE 1=1 {jurisdiction_filter}
            GROUP BY station, district
            ORDER BY case_count DESC
            LIMIT 10
        """,
        "source_table": "cases",
        "params": {},
    },
    Intent.SUSPECT_LOOKUP: {
        "sql": """
            SELECT name, age, gender, case_count, risk_score, modus_operandi, crime_type
            FROM criminal_profiles
            WHERE name LIKE ? {jurisdiction_filter}
            ORDER BY case_count DESC
            LIMIT 10
        """,
        "source_table": "criminal_profiles",
        "params": {"name": "%{name}%"},
    },
    Intent.VICTIM_STATS: {
        "sql": """
            SELECT victim_name, crime_type, station, district
            FROM cases
            WHERE victim_name != '' AND victim_name IS NOT NULL {jurisdiction_filter}
        """,
        "source_table": "cases",
        "params": {},
    },
    Intent.STATION_PERFORMANCE: {
        "sql": """
            SELECT name, code, district, active_cases, solved_rate, officer_count, status
            FROM stations
            WHERE name LIKE ? {jurisdiction_filter}
            LIMIT 5
        """,
        "source_table": "stations",
        "params": {"station": "%{station}%"},
    },
    Intent.OFFICER_ASSIGNMENT: {
        "sql": """
            SELECT crime_no, crime_type, station, district, status, accused_names
            FROM cases
            WHERE crime_no LIKE ? {jurisdiction_filter}
            LIMIT 5
        """,
        "source_table": "cases",
        "params": {"case_id": "%{case_id}%"},
    },
    Intent.RISK_SCORE: {
        "sql": """
            SELECT name, age, gender, case_count, risk_score, modus_operandi, crime_type
            FROM criminal_profiles
            WHERE name LIKE ? {jurisdiction_filter}
            LIMIT 5
        """,
        "source_table": "criminal_profiles",
        "params": {"name": "%{name}%"},
    },
    Intent.PREDICTIVE: {
        "sql": """
            SELECT crime_type, COUNT(*) as count
            FROM cases
            WHERE crime_type IS NOT NULL AND crime_type != '' {jurisdiction_filter}
            GROUP BY crime_type
            ORDER BY count DESC
        """,
        "source_table": "cases",
        "params": {},
    },
    Intent.POLICY_RECOMMENDATIONS: {
        "sql": """
            SELECT crime_type, COUNT(*) as count
            FROM cases
            WHERE crime_type IS NOT NULL AND crime_type != '' {jurisdiction_filter}
            GROUP BY crime_type
            ORDER BY count DESC
        """,
        "source_table": "cases",
        "params": {},
    },
}
