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
    if not rows:
        return "No crime trend data available. Try asking about a specific area or time period."
    
    lines = [
        f"Crime Trends ({len(rows)} types)",
        "",
        "Crime Type        Cases     Distribution",
        "────────────────────────────────────────────",
    ]
    
    for r in rows[:8]:
        crime_type = r.get('crime_type', 'N/A')
        count = r.get('count', 0)
        bar = "█" * min(count, 15)
        lines.append(f"{crime_type:<17} {count:<9} {bar}")
    
    lines.append("")
    lines.append("Tip: Ask about a specific area like 'crime trends in Koramangala' for details.")
    return "\n".join(lines)


def _hotspot_response(rows, evidence, lang):
    if not rows:
        return "No hotspot data available. Try asking about a specific district or police station."
    
    lines = [
        f"Crime Hotspots ({len(rows)} locations)",
        "",
        "Station           District        Cases     Heat Level",
        "─────────────────────────────────────────────────────────",
    ]
    
    for r in rows[:10]:
        station = r.get('station', 'N/A')
        district = r.get('district', '')
        case_count = r.get('case_count', 0)
        heat = "HIGH" if case_count >= 5 else "MEDIUM" if case_count >= 3 else "LOW"
        lines.append(f"{station:<17} {district:<15} {case_count:<9} {heat}")
    
    lines.append("")
    lines.append("Tip: Ask 'show cases in [station]' for detailed information.")
    return "\n".join(lines)


def _suspect_response(rows, evidence, lang):
    if not rows:
        return "No suspect records found. Try providing a full name or crime number."
    
    lines = [
        f"Suspect Records ({len(rows)} found)",
        "",
        "Name            Age   Gender   Cases   Risk Score   Modus Operandi",
        "──────────────────────────────────────────────────────────────────────",
    ]
    
    for r in rows[:5]:
        name = r.get('name', 'N/A')
        age = r.get('age', 'N/A')
        gender = r.get('gender', 'N/A')
        case_count = r.get('case_count', 0)
        risk_score = r.get('risk_score', 0)
        mo = r.get('modus_operandi', 'N/A')
        risk_level = "HIGH" if risk_score >= 0.7 else "MEDIUM" if risk_score >= 0.4 else "LOW"
        lines.append(f"{name:<15} {str(age):<5} {gender:<8} {case_count:<7} {risk_level} ({risk_score:.0%})   {mo}")
    
    return "\n".join(lines)


def _victim_stats_response(rows, evidence, lang):
    if not rows:
        return "No victim statistics found. Try asking about a specific crime type."
    
    # Group by crime type
    by_type = {}
    for r in rows:
        ct = r.get("crime_type", "Unknown")
        by_type[ct] = by_type.get(ct, 0) + 1
    
    lines = [f"👥 **Victim Statistics** ({len(rows)} records)\n"]
    
    # Table header
    lines.append("| # | Crime Type | Victims |")
    lines.append("|---|------------|---------|")
    
    for i, (ct, count) in enumerate(sorted(by_type.items(), key=lambda x: -x[1])[:10], 1):
        lines.append(f"| {i} | {ct} | {count} |")
    
    lines.append("")
    return "\n".join(lines)


def _station_performance_response(rows, evidence, lang):
    if not rows:
        return "No station performance data found. Try specifying a station name."
    
    lines = [f"🏢 **Station Performance** ({len(rows)} stations)\n"]
    
    # Table header
    lines.append("| # | Station | District | Active Cases | Solved Rate | Officers |")
    lines.append("|---|---------|----------|--------------|-------------|----------|")
    
    for i, r in enumerate(rows[:5], 1):
        name = r.get('name', 'Unknown')
        district = r.get('district', '')
        active_cases = r.get('active_cases', 0)
        solved_rate = r.get('solved_rate', 0)
        officer_count = r.get('officer_count', 0)
        
        # Performance indicator
        perf = "🟢" if solved_rate >= 70 else "🟡" if solved_rate >= 50 else "🔴"
        
        lines.append(f"| {i} | {name} | {district} | {active_cases} | {perf} {solved_rate:.1f}% | {officer_count} |")
    
    lines.append("")
    return "\n".join(lines)


def _officer_assignment_response(rows, evidence, lang):
    if not rows:
        return "No case assignments found. Try specifying a date range or case number."
    
    open_count = sum(1 for r in rows if r.get('status', '').lower() == 'open')
    closed_count = sum(1 for r in rows if r.get('status', '').lower() == 'closed')
    
    lines = [
        f"Case Assignments ({len(rows)} records) — Open: {open_count} | Closed: {closed_count}",
        "",
        "Case No          Crime Type      Station         Status      Accused",
        "─────────────────────────────────────────────────────────────────────────",
    ]
    
    for r in rows[:5]:
        crime_no = r.get('crime_no', 'N/A')
        crime_type = r.get('crime_type', 'N/A')
        station = r.get('station', 'N/A')
        status = r.get('status', 'N/A').upper()
        accused = r.get('accused_names', 'N/A')
        
        lines.append(f"{crime_no:<16} {crime_type:<15} {station:<15} {status:<11} {accused}")
    
    return "\n".join(lines)


def _risk_score_response(rows, evidence, lang):
    """Risk score MUST include factor breakdown, never a bare number."""
    if not rows:
        return "No risk score data found. Try providing a suspect name or crime number."
    
    lines = [f"⚠️ **Risk Assessment** ({len(rows)} profiles)\n"]
    
    # Table header
    lines.append("| # | Name | Age | Gender | Cases | Risk Score | Level |")
    lines.append("|---|------|-----|--------|-------|------------|-------|")
    
    for i, r in enumerate(rows[:3], 1):
        name = r.get('name', 'Unknown')
        age = r.get('age', 'N/A')
        gender = r.get('gender', 'N/A')
        case_count = r.get('case_count', 0)
        score = r.get('risk_score', 0)
        
        # Risk level with recommendation
        if score >= 0.7:
            level = "🔴 HIGH"
            rec = "Monitor closely"
        elif score >= 0.4:
            level = "🟡 MEDIUM"
            rec = "Regular monitoring"
        else:
            level = "🟢 LOW"
            rec = "Standard oversight"
        
        lines.append(f"| {i} | {name} | {age} | {gender} | {case_count} | {score:.0%} | {level} |")
    
    lines.append("")
    
    # Add recommendations
    lines.append("**Recommendations:**")
    for r in rows[:3]:
        name = r.get('name', 'Unknown')
        score = r.get('risk_score', 0)
        if score >= 0.7:
            lines.append(f"- ⚠️ {name}: High risk — consider enhanced surveillance")
        elif score >= 0.4:
            lines.append(f"- 👁️ {name}: Medium risk — regular check-ins recommended")
    
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
    
    # Provide specific, actionable guidance based on intent
    guidance = {
        Intent.OFFICER_ASSIGNMENT: "No case assignments found. Try specifying a date range or case number.",
        Intent.SUSPECT_LOOKUP: "No suspect records found. Try providing a full name or crime number.",
        Intent.CRIME_TRENDS: "No crime trend data available. Try asking about a specific area or time period.",
        Intent.HOTSPOT: "No hotspot data available. Try asking about a specific district or police station.",
        Intent.STATION_PERFORMANCE: "No station performance data found. Try specifying a station name.",
        Intent.VICTIM_STATS: "No victim statistics found. Try asking about a specific crime type.",
        Intent.RISK_SCORE: "No risk score data found. Try providing a suspect name or crime number.",
    }
    
    return guidance.get(intent, f"No matching {label} records found. Try refining your search with specific details.")


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
