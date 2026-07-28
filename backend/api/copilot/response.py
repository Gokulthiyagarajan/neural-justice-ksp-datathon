"""
Response generator — builds natural language answers from query results.
Every grounded response cites its data source. general_query is bounded.
"""
from typing import Any
from backend.api.copilot.models import Intent, QueryEvidence

SUGGESTED_QUERIES = [
    "Show crime trends in Bengaluru",
    "Where are the crime hotspots?",
    "Find suspect John Doe",
    "What is the risk score for accused X?",
    "How is Station Y performing?",
    "Victim demographics in Karnataka",
    "Who is assigned to case Z?",
]


def generate_response(
    intent: Intent,
    rows: list[dict[str, Any]],
    evidence: list[QueryEvidence],
    language: str,
    history: list[dict],
    user_message: str = "",
    llm_response: str = "",
) -> str:
    """Generate a natural language response from query results."""

    if intent == Intent.GENERAL_CHAT:
        # Use LLM response if available, otherwise fallback
        if llm_response:
            return llm_response
        return _general_chat_fallback(user_message, language)

    if intent == Intent.GENERAL_QUERY:
        return _general_query_response(language)

    if not rows:
        return _empty_response(intent, language)

    builders = {
        Intent.CRIME_TRENDS: _crime_trends_response,
        Intent.HOTSPOT: _hotspot_response,
        Intent.SUSPECT_LOOKUP: _suspect_response,
        Intent.VICTIM_STATS: _victim_stats_response,
        Intent.STATION_PERFORMANCE: _station_performance_response,
        Intent.OFFICER_ASSIGNMENT: _officer_assignment_response,
        Intent.RISK_SCORE: _risk_score_response,
    }

    builder = builders.get(intent, _generic_response)
    return builder(rows, evidence, language)


def _crime_trends_response(rows, evidence, lang):
    lines = ["Based on the FIR records, here are the crime trends:\n"]
    for r in rows[:8]:
        lines.append(f"- **{r.get('crime_type', 'Unknown')}**: {r.get('count', 0)} cases")
    lines.append(f"\n_Source: {evidence[0].source_table} ({evidence[0].row_count} aggregated groups)_")
    return "\n".join(lines)


def _hotspot_response(rows, evidence, lang):
    lines = ["Based on FIR records, here are the top crime hotspots:\n"]
    for i, r in enumerate(rows[:10], 1):
        lines.append(f"{i}. **{r.get('station', 'Unknown')}** ({r.get('district', '')}): {r.get('case_count', 0)} cases")
    lines.append(f"\n_Source: {evidence[0].source_table} ({evidence[0].row_count} locations)_")
    return "\n".join(lines)


def _suspect_response(rows, evidence, lang):
    lines = [f"Found {len(rows)} matching record(s):\n"]
    for r in rows[:5]:
        lines.append(f"- **{r.get('name', 'Unknown')}** — Age: {r.get('age', 'N/A')}, Gender: {r.get('gender', 'N/A')}, Cases: {r.get('case_count', 0)}, Risk: {r.get('risk_score', 0):.0%}")
        if r.get("modus_operandi"):
            lines.append(f"  MO: {r['modus_operandi']}")
    lines.append(f"\n_Source: {evidence[0].source_table} ({evidence[0].row_count} records)_")
    return "\n".join(lines)


def _victim_stats_response(rows, evidence, lang):
    lines = [f"Victim information from {len(rows)} record(s):\n"]
    by_type = {}
    for r in rows:
        ct = r.get("crime_type", "Unknown")
        by_type[ct] = by_type.get(ct, 0) + 1
    for ct, count in sorted(by_type.items(), key=lambda x: -x[1])[:10]:
        lines.append(f"- **{ct}**: {count} victim(s)")
    lines.append(f"\n_Source: {evidence[0].source_table} ({evidence[0].row_count} records)_")
    return "\n".join(lines)


def _station_performance_response(rows, evidence, lang):
    lines = ["Station performance data:\n"]
    for r in rows[:5]:
        lines.append(f"- **{r.get('name', 'Unknown')}** ({r.get('district', '')}):")
        lines.append(f"  Active cases: {r.get('active_cases', 0)}, Solved rate: {r.get('solved_rate', 0):.1f}%, Officers: {r.get('officer_count', 0)}")
    lines.append(f"\n_Source: {evidence[0].source_table} ({evidence[0].row_count} stations)_")
    return "\n".join(lines)


def _officer_assignment_response(rows, evidence, lang):
    lines = ["Case assignment details:\n"]
    for r in rows[:5]:
        accused = r.get("accused_names", "[]")
        lines.append(f"- **Case {r.get('crime_no', 'Unknown')}**: {r.get('crime_type', '')} at {r.get('station', '')}")
        lines.append(f"  Status: {r.get('status', '')}, Accused: {accused}")
    lines.append(f"\n_Source: {evidence[0].source_table} ({evidence[0].row_count} records)_")
    return "\n".join(lines)


def _risk_score_response(rows, evidence, lang):
    """Risk score MUST include factor breakdown, never a bare number."""
    lines = ["Risk assessment:\n"]
    for r in rows[:3]:
        score = r.get("risk_score", 0)
        lines.append(f"- **{r.get('name', 'Unknown')}** — Risk Score: {score:.0%}")
        lines.append(f"  Age: {r.get('age', 'N/A')}, Gender: {r.get('gender', 'N/A')}, Prior cases: {r.get('case_count', 0)}")
        if r.get("modus_operandi"):
            lines.append(f"  Modus Operandi: {r['modus_operandi']}")
        if score >= 0.7:
            lines.append("  Warning: High risk — repeat offender pattern detected")
        elif score >= 0.4:
            lines.append("  Medium risk — monitor recommended")
        else:
            lines.append("  Low risk")
    lines.append(f"\n_Source: {evidence[0].source_table} ({evidence[0].row_count} records)_")
    return "\n".join(lines)


def _general_query_response(lang):
    """Bounded fallback — no free LLM generation."""
    suggestions = "\n".join(f"- {q}" for q in SUGGESTED_QUERIES[:5])
    return (
        "I can only answer questions grounded in the platform's FIR and case data. "
        "I cannot provide general crime policy commentary or information outside this dataset.\n\n"
        "**Here are some things I can help with:**\n"
        f"{suggestions}\n\n"
        "_Tip: Try rephrasing your question to focus on specific FIR records, stations, accused persons, or crime statistics._"
    )


def _empty_response(intent, lang):
    intent_labels = {
        Intent.CRIME_TRENDS: "crime trend",
        Intent.HOTSPOT: "crime hotspot",
        Intent.SUSPECT_LOOKUP: "suspect",
        Intent.VICTIM_STATS: "victim",
        Intent.STATION_PERFORMANCE: "station",
        Intent.OFFICER_ASSIGNMENT: "case assignment",
        Intent.RISK_SCORE: "risk score",
    }
    label = intent_labels.get(intent, "data")
    return f"No matching {label} records found in the current dataset. Try refining your search or check if the data exists in the system."


def _generic_response(rows, evidence, lang):
    return f"Found {len(rows)} record(s). Please see the data above."


def _general_chat_fallback(user_message: str, lang: str) -> str:
    """Rule-based fallback for general chat when LLM is unavailable."""
    lower_msg = user_message.lower()
    
    # Greetings
    if any(word in lower_msg for word in ["hello", "hi", "hey", "namaskara", "ನಮಸ್ಕಾರ"]):
        return (
            "Hello! I'm Drishti, your AI assistant for the police intelligence platform. "
            "I can help you analyze crime data, find suspects, check station performance, "
            "and more. What would you like to do?"
        )
    
    # Help
    if any(word in lower_msg for word in ["help", "what can you do", "capabilities"]):
        return (
            "I can help you with:\n\n"
            "- **Crime Trends**: Show patterns and statistics\n"
            "- **Suspect Lookup**: Find accused persons\n"
            "- **Hotspots**: Identify high-crime areas\n"
            "- **Station Performance**: Check police station metrics\n"
            "- **Risk Assessment**: Evaluate suspect risk levels\n\n"
            "Try asking something like 'Show crime trends in Bengaluru' or 'Find suspect John Doe'."
        )
    
    # Thanks
    if any(word in lower_msg for word in ["thank", "thanks", "ಧನ್ಯವಾದ"]):
        return "You're welcome! Feel free to ask if you need any help with crime analysis."
    
    # Default
    return (
        "I'm Drishti, your AI assistant for the Bengaluru police intelligence platform. "
        "I can help you analyze crime data, find suspects, and understand crime patterns. "
        "What would you like to know about?"
    )
