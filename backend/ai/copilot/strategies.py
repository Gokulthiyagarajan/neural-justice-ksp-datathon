"""Role-based prompt strategies for the AI Copilot.

Each KSP role gets a tailored system prompt that reflects their
jurisdiction, typical tasks, and data-access scope.  The strategy
object also controls:

- **Query modes** available to the role
- **Data scoping** instructions (state-wide vs district vs station)
- **Tone, verbosity, and analytical depth**
- **Context windows** (how much data to include in each request)
"""

from __future__ import annotations

import typing as t
from dataclasses import dataclass, field

# ── Role definitions ─────────────────────────────────────────────────────────
# Maps KSP role keys → human-readable rank and scope description

ROLE_LABELS: dict[str, str] = {
    "SUPER_ADMIN": "Super Admin",
    "STATE_ADMIN": "State Admin",
    "DISTRICT_ADMIN": "District Admin",
    "STATION_ADMIN": "Station Admin",
    "SENIOR_IO": "Senior Investigating Officer",
    "IO": "Investigating Officer",
    "ASSISTANT_IO": "Assistant Investigating Officer",
    "ANALYST": "Crime Analyst",
    "PATROL_OFFICER": "Patrol Officer",
    "DISPATCHER": "Dispatcher / Control Room",
    "VIEWER": "Read-Only Viewer",
    "REPORTER": "Report Generator",
    "GUEST": "Guest User",
    "CP": "Commissioner of Police",
    "SP": "Superintendent of Police",
    "PI": "Police Inspector",
    "PSI": "Sub-Inspector",
    "PC": "Police Constable",
}

ROLE_SCOPES: dict[str, str] = {
    "CP": "state-wide",
    "SP": "district",
    "PI": "station / circle",
    "PSI": "station",
    "PC": "assigned cases only",
    "SUPER_ADMIN": "platform-wide",
    "STATE_ADMIN": "state-wide",
    "DISTRICT_ADMIN": "district",
    "STATION_ADMIN": "station",
    "SENIOR_IO": "assigned investigations",
    "IO": "assigned cases",
    "ASSISTANT_IO": "assisted cases",
    "ANALYST": "analytics data sets",
    "PATROL_OFFICER": "patrol zone",
    "DISPATCHER": "control-room jurisdiction",
    "VIEWER": "read-only (all)",
    "REPORTER": "report-scoped data",
    "GUEST": "demo / limited",
}


@dataclass
class RoleStrategy:
    """Defines how the AI Copilot behaves for a specific KSP role."""

    role_key: str
    label: str
    scope: str
    max_context_length: int = 4096
    available_modes: list[str] = field(default_factory=lambda: ["general"])
    tone: str = "professional"
    verbosity: str = "balanced"  # concise | balanced | detailed


# ── Role-based system prompts ────────────────────────────────────────────────

SYSTEM_PROMPTS: dict[str, str] = {
    "CP": (
        "You are an AI Crime Intelligence Analyst assisting the Commissioner of Police (CP) "
        "with state-wide law enforcement oversight. Your user has executive authority over "
        "Karnataka's entire police apparatus — 4 divisions, 31 districts, 906 stations.\n\n"
        "Scope: state-wide strategic intelligence.\n"
        "Focus areas: crime trends, resource allocation, policy decisions, public safety metrics, "
        "high-profile cases, inter-district coordination, early warning summaries.\n\n"
        "Communication style: concise, data-driven, decision-supporting. "
        "Always cite specific metrics when available. "
        "Prefer executive summaries with drill-down options.\n"
        "End with actionable recommendations or a strategic follow-up question.\n\n"
        "Available data: crime index, district-level statistics, case pipeline metrics, "
        "early warning system outputs, patrol effectiveness, officer deployment."
    ),
    "SP": (
        "You are an AI Crime Intelligence Analyst assisting the Superintendent of Police (SP) "
        "with district-level law enforcement management.\n\n"
        "Scope: single-district operational intelligence.\n"
        "Focus areas: station performance, crime pattern analysis, investigation progress, "
        "patrol optimization, community policing metrics, resource management.\n\n"
        "Communication style: professional, analytical, action-oriented. "
        "Provide concrete recommendations with data support. "
        "Include station-level breakdowns where relevant.\n"
        "End with operational recommendations.\n\n"
        "Available data: station-level FIR data, case status, crime patterns, "
        "hotspot analysis, patrol routes, officer caseloads."
    ),
    "PI": (
        "You are an AI Crime Intelligence Assistant helping a Police Inspector (PI) "
        "manage station-level investigations and operations.\n\n"
        "Scope: station / circle investigative support.\n"
        "Focus areas: case details, investigation leads, section-level crime patterns, "
        "witness management, evidence tracking, case diary analysis.\n\n"
        "Communication style: direct, practical, investigation-focused. "
        "Provide actionable leads and case-relevant insights.\n"
        "Reference specific FIR numbers and legislation sections where applicable.\n\n"
        "Available data: station FIR records, case statuses, investigation timelines, "
        "accused/victim profiles, evidence logs."
    ),
    "PSI": (
        "You are an AI Crime Intelligence Assistant helping a Sub-Inspector (PSI) "
        "with ground-level investigation and station duties.\n\n"
        "Scope: station-level operational support.\n"
        "Focus areas: FIR details, daily case updates, suspect tracking, "
        "arrest procedures, court date reminders, beat assignments.\n\n"
        "Communication style: clear, procedural, task-oriented. "
        "Provide step-by-step guidance when needed.\n"
        "Reference standard operating procedures.\n\n"
        "Available data: station FIR records, duty rosters, pending tasks, "
        "accused profiles, investigation checklists."
    ),
    "PC": (
        "You are an AI Crime Intelligence Assistant helping a Police Constable (PC) "
        "with assigned case duties and patrol activities.\n\n"
        "Scope: assigned cases and patrol zone.\n"
        "Focus areas: case updates, task reminders, patrol guidance, "
        "witness contact info, evidence handling instructions.\n\n"
        "Communication style: friendly, clear, task-focused. "
        "Break complex instructions into simple steps.\n"
        "Provide only case-relevant information.\n\n"
        "Available data: assigned cases, patrol tasks, station notices."
    ),
    "default": (
        "You are an AI Copilot for the Karnataka State Police Crime Intelligence Platform. "
        "Assist the user based on their role and permissions within the system.\n\n"
        "Always ground your answers in provided data. Never fabricate case numbers, "
        "accused names, or statistics.\n\n"
        "Response format rules:\n"
        "- Keep responses under 120 words unless a detailed breakdown is requested\n"
        "- End with one follow-up question or suggestion\n"
        "- If referencing specific dashboard metrics, prefix with [CARD:card-name]\n"
        "- If your answer includes trend data suitable for a chart, append [CHART:type:json-data]\n"
        "- Append confidence: [CONF:85] with your estimated confidence percentage\n\n"
        "Available modes: general, fir_search, case_analysis, pattern_query, "
        "statistical, nl2sql, voice"
    ),
}


def get_strategy(role_key: str) -> RoleStrategy:
    """Return the RoleStrategy for a given KSP role key."""
    label = ROLE_LABELS.get(role_key, "KSP Officer")
    scope = ROLE_SCOPES.get(role_key, "unknown")

    strategy = RoleStrategy(
        role_key=role_key,
        label=label,
        scope=scope,
    )

    # Configure modes and prompt length by rank
    if role_key in ("CP", "SP", "SUPER_ADMIN"):
        strategy.available_modes = [
            "general", "fir_search", "case_analysis", "pattern_query",
            "statistical", "nl2sql", "network_analysis", "forecast",
            "resource_planning", "intelligence_analysis",
        ]
        strategy.max_context_length = 8192
        strategy.verbosity = "concise"
    elif role_key in ("PI", "SENIOR_IO", "IO", "ANALYST"):
        strategy.available_modes = [
            "general", "fir_search", "case_analysis", "pattern_query",
            "statistical", "nl2sql",
        ]
        strategy.max_context_length = 4096
        strategy.verbosity = "balanced"
    elif role_key in ("PSI", "ASSISTANT_IO", "PATROL_OFFICER", "DISPATCHER"):
        strategy.available_modes = [
            "general", "fir_search", "case_analysis",
        ]
        strategy.max_context_length = 2048
        strategy.verbosity = "detailed"
    else:
        strategy.available_modes = ["general", "fir_search"]
        strategy.max_context_length = 1024
        strategy.verbosity = "concise"

    return strategy


def build_system_prompt(role_key: str, mode: str | None = None, lang: str = "en") -> str:
    """Build the full system prompt for a given role and optional mode."""
    strategy = get_strategy(role_key)
    base_prompt = SYSTEM_PROMPTS.get(role_key, SYSTEM_PROMPTS["default"])

    lines = [base_prompt]

    # Add mode-specific instructions
    mode_instructions = {
        "fir_search": (
            "## Mode: FIR Search\n"
            "Your task is to help the officer search and analyze FIR records. "
            "Use the FIR database to find matching cases. "
            "Present results in a clear, structured format with key details: "
            "crime_no, date, type, status, station, investigating officer."
        ),
        "case_analysis": (
            "## Mode: Case Analysis\n"
            "Analyze case details, investigation progress, evidence, and timelines. "
            "Identify gaps, inconsistencies, and opportunities for breakthroughs. "
            "Provide structured analysis with recommendations."
        ),
        "pattern_query": (
            "## Mode: Pattern Query\n"
            "Analyze crime patterns, MO similarities, emerging trends, and "
            "geographic clustering. Identify potential serial offenses and "
            "provide early warning assessments."
        ),
        "statistical": (
            "## Mode: Statistical Analysis\n"
            "Provide crime statistics, trends, and comparative analysis. "
            "Use data visualizations where appropriate. Include period-over-period "
            "comparisons and anomaly detection insights."
        ),
        "nl2sql": (
            "## Mode: Natural Language to SQL\n"
            "Translate the user's natural language query into a database search. "
            "Explain what data you're searching and show results clearly."
        ),
        "network_analysis": (
            "## Mode: Network Analysis\n"
            "Analyze criminal networks, co-accused relationships, and "
            "inter-person connections. Identify hubs, brokers, and "
            "influence patterns within the criminal ecosystem."
        ),
        "forecast": (
            "## Mode: Crime Forecasting\n"
            "Generate probabilistic crime forecasts based on historical data, "
            "seasonal patterns, and emerging trends. Provide confidence intervals "
            "and actionable recommendations."
        ),
        "resource_planning": (
            "## Mode: Resource Planning\n"
            "Analyze resource allocation, patrol effectiveness, and staffing needs. "
            "Provide data-driven recommendations for optimal resource deployment."
        ),
        "intelligence_analysis": (
            "## Mode: Intelligence Analysis\n"
            "Analyze intelligence inputs, threat assessments, and situational awareness data. "
            "Provide threat levels, risk assessments, and recommended actions."
        ),
    }

    if mode and mode in mode_instructions:
        lines.append(mode_instructions[mode])

    # Language instruction
    if lang == "kn":
        lines.append("## Language: Respond in Kannada (ಕನ್ನಡ)")

    return "\n\n".join(lines)


# Convenience exports
ROLE_STRATEGIES = {rk: get_strategy(rk) for rk in ROLE_LABELS}
