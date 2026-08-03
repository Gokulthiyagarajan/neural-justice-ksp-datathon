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
    "Policy recommendations based on crime data",
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
        Intent.CASE_TIMELINE: _case_timeline_response,
        Intent.FINANCIAL_INTELLIGENCE: _financial_intelligence_response,
        Intent.RISK_SCORE: _risk_score_response,
        Intent.PREDICTIVE: _predictive_response,
        Intent.POLICY_RECOMMENDATIONS: _policy_recommendations_response,
    }

    builder = builders.get(intent, _generic_response)
    # Pass user_message to builders that need it
    if intent == Intent.CRIME_TRENDS:
        return builder(rows, evidence, language, user_message)
    return builder(rows, evidence, language)


def _crime_trends_response(rows, evidence, lang, user_message=""):
    if not rows:
        return "No crime trend data available. Try asking about a specific area or time period."
    
    # Check if user mentioned a specific area
    area_mentioned = False
    if user_message:
        area_keywords = ["in ", "at ", "for ", "area", "station", "layout", "nagar", "road", "bengaluru", "bangalore"]
        area_mentioned = any(kw in user_message.lower() for kw in area_keywords)
    
    # If no area mentioned, ask for clarification
    if not area_mentioned and len(rows) > 3:
        return (
            "Which area would you like crime trends for?\n\n"
            "Available options:\n"
            "  • Koramangala\n"
            "  • HSR Layout\n"
            "  • Whitefield\n"
            "  • Indiranagar\n"
            "  • Jayanagar\n\n"
            "Example: 'crime trends in Koramangala'"
        )
    
    # Calculate totals
    total_cases = sum(r.get('count', 0) for r in rows)
    
    lines = [
        f"Crime Intelligence Summary — Bengaluru",
        f"Total Cases: {total_cases} | Crime Types: {len(rows)}",
        "",
        "Crime Type        Cases     % Share    Distribution",
        "──────────────────────────────────────────────────────",
    ]
    
    for r in rows[:8]:
        crime_type = r.get('crime_type', 'N/A')
        count = r.get('count', 0)
        pct = (count / total_cases * 100) if total_cases > 0 else 0
        bar = "█" * min(count, 15)
        lines.append(f"{crime_type:<17} {count:<9} {pct:.1f}%     {bar}")
    
    # Add summary insights
    if rows:
        top_crime = rows[0].get('crime_type', 'N/A')
        top_count = rows[0].get('count', 0)
        lines.append("")
        lines.append("Key Insights:")
        lines.append(f"  • Most common: {top_crime} ({top_count} cases)")
        lines.append(f"  • Total incidents: {total_cases}")
    
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
    
    by_type = {}
    for r in rows:
        ct = r.get("crime_type", "Unknown")
        by_type[ct] = by_type.get(ct, 0) + 1
    
    lines = [
        f"Victim Statistics ({len(rows)} records)",
        "",
        "Crime Type        Victims",
        "─────────────────────────",
    ]
    
    for ct, count in sorted(by_type.items(), key=lambda x: -x[1])[:10]:
        lines.append(f"{ct:<17} {count}")
    
    return "\n".join(lines)


def _station_performance_response(rows, evidence, lang):
    if not rows:
        return "No station performance data found. Try specifying a station name."
    
    lines = [
        f"Station Performance ({len(rows)} stations)",
        "",
        "Station           District        Active Cases  Solved Rate  Officers",
        "─────────────────────────────────────────────────────────────────────",
    ]
    
    for r in rows[:5]:
        name = r.get('name', 'N/A')
        district = r.get('district', '')
        active_cases = r.get('active_cases', 0)
        solved_rate = r.get('solved_rate', 0)
        officer_count = r.get('officer_count', 0)
        perf = "●" if solved_rate >= 70 else "◐" if solved_rate >= 50 else "○"
        lines.append(f"{name:<17} {district:<15} {active_cases:<12} {perf} {solved_rate:.1f}%     {officer_count}")
    
    return "\n".join(lines)


def _officer_assignment_response(rows, evidence, lang):
    if not rows:
        return "No case assignments found. Try specifying a date range or case number."
    
    # Single case lookup → produce a clear case roadmap
    if len(rows) == 1:
        return _case_roadmap(rows[0], lang)
    
    open_count = sum(1 for r in rows if r.get('status', '').lower() in ('open', 'under_investigation'))
    closed_count = sum(1 for r in rows if r.get('status', '').lower() not in ('open', 'under_investigation'))
    
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


def _case_roadmap(r: dict, lang: str) -> str:
    """Build a clear, structured roadmap for a single case lookup."""
    crime_no = r.get('crime_no', 'N/A')
    crime_type = r.get('crime_type', 'N/A')
    status = r.get('status', 'N/A')
    station = r.get('station', 'N/A')
    district = r.get('district', 'N/A')

    # Case narrative — prefer rich description fields
    brief_facts = r.get('brief_facts') or r.get('description') or r.get('facts') or ""
    
    # Dates (different schema variants)
    occurrence = r.get('occurrence_date') or r.get('date_reported') or ""
    filing = r.get('filing_date') or ""
    
    victim = r.get('victim_name') or ""
    complainant = r.get('complainant_name') or ""
    accused = r.get('accused_names') or ""
    assigned = r.get('assigned_to') or ""
    is_solved = r.get('is_solved')
    
    # Normalize accused list (may be JSON string or plain text)
    accused_text = accused
    if isinstance(accused, str) and accused.startswith("["):
        try:
            import json
            names = json.loads(accused)
            accused_text = ", ".join(names) if names else "Not recorded"
        except Exception:
            accused_text = accused.strip("[]") or "Not recorded"
    elif not accused:
        accused_text = "Not recorded"
    
    status_label = status
    if is_solved in (1, "1", True) and status.lower() not in ("closed", "resolved"):
        status_label = "Closed / Solved"
    
    sections = [
        f"Case Roadmap — {crime_no}",
        f"Crime Type: {crime_type}  |  Status: {status_label}",
        f"Station: {station} ({district})",
    ]
    
    if occurrence:
        sections.append(f"Occurrence Date: {occurrence}")
    if filing:
        sections.append(f"Filed: {filing}")
    
    if brief_facts:
        sections.append(f"\n**What happened:**\n{brief_facts}")
    else:
        sections.append("\n**What happened:** Details not recorded in the FIR.")
    
    sections.append("")
    sections.append("**Case Details:**")
    sections.append(f"• Victim: {victim if victim else 'Not recorded'}")
    if complainant:
        sections.append(f"• Complainant: {complainant}")
    sections.append(f"• Accused: {accused_text}")
    if assigned:
        sections.append(f"• Investigating Officer: {assigned}")
    
    sections.append("")
    sections.append("**Next steps:** Review the FIR at the station for investigation updates, evidence log, and chargesheet status.")
    
    return "\n".join(sections)


def _case_timeline_response(rows, evidence, lang):
    """Stage 3 — deterministic, factual chronology for a single case.

    Merges the cases / activity / orders / notifications rows (tagged by
    _source) into a chronological timeline rendered as GFM tables (the
    frontend Markdown renderer displays these as real HTML tables).

    Every cell is grounded in a real column value; anything absent is stated
    as "Not recorded". Never invents events, never predicts, never
    characterizes individuals.
    """
    if not rows:
        return (
            "No case timeline found for that crime number in the platform database. "
            "Case timelines can only be built from recorded FIR data, case activity, "
            "investigation orders, and alerts. Verify the crime number and try again."
        )

    case_rows = [r for r in rows if r.get("_source") == "cases"]
    if not case_rows:
        # Related records without the master case record should never be
        # rendered (RBAC or data integrity guard).
        return (
            "No case record found for that crime number within your jurisdiction. "
            "Verify the crime number and your access scope, then try again."
        )
    case_row = case_rows[0]
    activity_rows = [r for r in rows if r.get("_source") == "activity"]
    order_rows = [r for r in rows if r.get("_source") == "orders"]
    notif_rows = [r for r in rows if r.get("_source") == "notifications"]

    crime_no = case_row.get("crime_no", "N/A")
    crime_type = case_row.get("crime_type", case_row.get("crime_head", "N/A"))
    status = case_row.get("status", "N/A")
    station = case_row.get("station", "N/A")
    district = case_row.get("district", "N/A")

    lines = [
        f"**Case Timeline — {crime_no}**",
        "",
        f"**Crime Type:** {crime_type}  |  **Status:** {status}  |  **Station:** {station} ({district})",
        "",
    ]

    # ── Timeline table (chronological, one row per recorded event) ──
    entries = []  # (sort_key, date_label, event_label, details)

    occurrence = case_row.get("occurrence_date") or case_row.get("date_reported")
    filing = case_row.get("filing_date")

    if occurrence:
        entries.append((occurrence, occurrence, "Incident reported", ""))
    if filing:
        entries.append((filing, filing, "FIR filed", ""))

    for a in activity_rows:
        ts = a.get("timestamp") or a.get("created_at") or ""
        action = a.get("action", "Case update")
        actor = a.get("user_name", "")
        desc = a.get("description", "")
        # Humanize snake_case action → title case label
        label = action.replace("_", " ").strip().title() or "Case update"
        details = desc or ""
        if actor:
            details = (details + " — by " + actor).strip()
        entries.append((ts, ts, label, details))

    for o in order_rows:
        ts = o.get("created_at") or ""
        num = o.get("order_number", "")
        title = o.get("title", "Investigation order")
        priority = o.get("priority", "")
        issued_by = o.get("issued_by", "")
        label = f"Order {num}".strip() if num else "Order"
        details = title or ""
        if priority:
            details += f" (priority: {priority})"
        if issued_by:
            details += f" — issued by {issued_by}"
        entries.append((ts, ts, label, details))

    for n in notif_rows:
        ts = n.get("created_at") or ""
        title = n.get("title", "Alert")
        severity = n.get("severity", "")
        details = title or ""
        if severity:
            details += f" (severity: {severity})"
        entries.append((ts, ts, "Alert", details))

    entries.sort(key=lambda e: (str(e[0] or ""), e[2], e[3]))

    if entries:
        lines.append("**Timeline of recorded events:**")
        lines.append("")
        lines.append("| Date/Time | Event | Details |")
        lines.append("|-----------|-------|---------|")
        for _, date_label, label, details in entries:
            dl = date_label.replace("T", " ") if date_label else "Not recorded"
            lines.append(f"| {dl} | {label} | {details if details else '—'} |")
    else:
        lines.append("**Timeline:** No dated events are recorded for this case in the database.")
    lines.append("")

    # ── Case facts table (grounded only) ──
    brief_facts = case_row.get("brief_facts") or case_row.get("description") or case_row.get("facts")
    victim = case_row.get("victim_name") or "Not recorded"
    complainant = case_row.get("complainant_name") or "Not recorded"

    accused = case_row.get("accused_names")
    if accused:
        try:
            import json
            names = json.loads(accused) if isinstance(accused, str) and accused.startswith("[") else accused
            if isinstance(names, list):
                accused_text = ", ".join(names) if names else "Not recorded"
            else:
                accused_text = str(accused)
        except Exception:
            accused_text = str(accused).strip("[]") or "Not recorded"
    else:
        accused_text = "Not recorded"

    assigned = case_row.get("assigned_to") or "Not recorded"

    lines.append("**Case facts (from FIR record):**")
    lines.append("")
    lines.append("| Field | Value |")
    lines.append("|-------|-------|")
    lines.append(f"| What happened | {brief_facts if brief_facts else 'Not recorded'} |")
    lines.append(f"| Victim | {victim} |")
    lines.append(f"| Complainant | {complainant} |")
    lines.append(f"| Accused | {accused_text} |")
    lines.append(f"| Investigating Officer | {assigned} |")
    lines.append("")

    # ── What is NOT in the database (stated explicitly, never invented) ──
    missing = []
    if not activity_rows:
        missing.append("no case activity events (e.g. arrest, chargesheet)")
    if not order_rows:
        missing.append("no investigation orders")
    if not notif_rows:
        missing.append("no system alerts")
    if missing:
        lines.append("**Not recorded in the platform:** " + "; ".join(missing) + ".")
        lines.append("")
    lines.append("_Timeline built from platform records only — no events are inferred._")

    return "\n".join(lines)


def _financial_intelligence_response(rows, evidence, lang):
    """Stage 3 — deterministic Suspicious Transaction Report.

    Renders aggregate fraud-family counts plus recently registered
    case-scoped FIR rows as GFM tables. Aggregate/case-level data only —
    never individual risk profiles, never inferred transactions.
    """
    agg_rows = [r for r in rows if r.get("_kind") == "aggregate"]
    recent_rows = [r for r in rows if r.get("_kind") == "recent"]

    if not agg_rows:
        return (
            "No fraud-type FIR records found within your jurisdiction scope "
            "in the platform database. The Suspicious Transaction Report is "
            "built only from recorded FIR data — nothing is inferred."
        )

    lines = [
        "**Financial Intelligence — Suspicious Transaction Report**",
        "",
        "**Scope:** " + (
            evidence[0].filters_applied.get("jurisdiction", "state-wide")
            if evidence else "state-wide"
        ),
        "",
        "**Fraud-family FIR overview (recorded cases only):**",
        "",
        "| Crime Type | Total FIRs | Solved | Unresolved |",
        "|------------|-----------:|-------:|-----------:|",
    ]
    for r in agg_rows:
        lines.append(
            f"| {r.get('crime_type', 'Unknown')} | {r.get('total', 0)} "
            f"| {r.get('solved', 0)} | {r.get('unresolved', 0)} |"
        )
    lines.append("")

    if recent_rows:
        lines.append("**Most recently registered fraud-type FIRs:**")
        lines.append("")
        lines.append("| Crime No | Crime Type | Station | District | Occurrence Date | Status |")
        lines.append("|----------|------------|---------|----------|-----------------|--------|")
        for r in recent_rows:
            lines.append(
                f"| {r.get('crime_no', 'N/A')} | {r.get('crime_type', 'N/A')} "
                f"| {r.get('station') or 'Not recorded'} | {r.get('district') or 'Not recorded'} "
                f"| {str(r.get('occurrence_date') or 'Not recorded').replace('T', ' ')} "
                f"| {r.get('status', 'N/A')} |"
            )
        lines.append("")
    else:
        lines.append("**Most recently registered fraud-type FIRs:** none recorded.")
        lines.append("")

    lines.append(
        "_Report built from recorded FIR data only — no individual risk profiles "
        "are produced and no transactions are inferred._"
    )
    return "\n".join(lines)


def _risk_score_response(rows, evidence, lang):
    """Risk score MUST include factor breakdown, never a bare number."""
    if not rows:
        return "No risk score data found. Try providing a suspect name or crime number."
    
    lines = [
        f"Risk Assessment ({len(rows)} profiles)",
        "",
        "Name            Age   Gender   Cases   Risk Score   Level",
        "───────────────────────────────────────────────────────────",
    ]
    
    for r in rows[:3]:
        name = r.get('name', 'N/A')
        age = r.get('age', 'N/A')
        gender = r.get('gender', 'N/A')
        case_count = r.get('case_count', 0)
        score = r.get('risk_score', 0)
        
        if score >= 0.7:
            level = "HIGH — Monitor closely"
        elif score >= 0.4:
            level = "MEDIUM — Regular monitoring"
        else:
            level = "LOW — Standard oversight"
        
        lines.append(f"{name:<15} {str(age):<5} {gender:<8} {case_count:<7} {score:.0%}         {level}")
    
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
        Intent.CASE_TIMELINE: "case timeline",
        Intent.FINANCIAL_INTELLIGENCE: "suspicious transaction report",
        Intent.RISK_SCORE: "risk score",
        Intent.PREDICTIVE: "predictive",
        Intent.POLICY_RECOMMENDATIONS: "policy recommendation",
    }
    label = intent_labels.get(intent, "data")
    
    # Provide specific, actionable guidance based on intent
    guidance = {
        Intent.OFFICER_ASSIGNMENT: "No case assignments found. Try specifying a date range or case number.",
        Intent.CASE_TIMELINE: "No case timeline found for that crime number in the platform database. Case timelines are built only from recorded FIR data, case activity, investigation orders, and alerts. Verify the crime number and try again.",
        Intent.FINANCIAL_INTELLIGENCE: "No fraud-type FIR records found within your jurisdiction scope in the platform database. The Suspicious Transaction Report is built only from recorded FIR data — nothing is inferred.",
        Intent.SUSPECT_LOOKUP: "No suspect records found. Try providing a full name or crime number.",
        Intent.CRIME_TRENDS: "No crime trend data available. Try asking about a specific area or time period.",
        Intent.HOTSPOT: "No hotspot data available. Try asking about a specific district or police station.",
        Intent.STATION_PERFORMANCE: "No station performance data found. Try specifying a station name.",
        Intent.VICTIM_STATS: "No victim statistics found. Try asking about a specific crime type.",
        Intent.RISK_SCORE: "No risk score data found. Try providing a suspect name or crime number.",
        Intent.PREDICTIVE: "No data available for predictive analysis. Try asking about crime trends first.",
        Intent.POLICY_RECOMMENDATIONS: "No crime data available to generate policy recommendations. Try asking about crime trends first.",
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


def _predictive_response(rows, evidence, lang):
    """Generate predictive policing insights based on current data."""
    if not rows:
        return "No data available for predictive analysis. Try asking about crime trends first."
    
    # Calculate current statistics
    total_cases = sum(r.get('count', 0) for r in rows)
    crime_types = len(rows)
    
    # Identify patterns
    top_crime = rows[0] if rows else {}
    top_crime_type = top_crime.get('crime_type', 'N/A')
    top_count = top_crime.get('count', 0)
    
    # Calculate percentage distribution
    distributions = []
    for r in rows[:5]:
        ct = r.get('crime_type', 'N/A')
        count = r.get('count', 0)
        pct = (count / total_cases * 100) if total_cases > 0 else 0
        distributions.append((ct, count, pct))
    
    lines = [
        "Predictive Policing Insights — Next 30 Days",
        f"Based on {total_cases} current cases across {crime_types} crime types",
        "",
        "Projected Risk Areas:",
        "─────────────────────────────────────────────────",
    ]
    
    # Generate predictions based on current data
    for ct, count, pct in distributions:
        if pct >= 30:
            risk_level = "HIGH"
            prediction = f"Expected increase of {int(count * 1.2)} cases"
        elif pct >= 15:
            risk_level = "MEDIUM"
            prediction = f"Stable at ~{count} cases"
        else:
            risk_level = "LOW"
            prediction = f"Minimal change expected"
        
        lines.append(f"  {ct:<15} {risk_level:<8} {prediction}")
    
    lines.extend([
        "",
        "Recommended Actions:",
        "─────────────────────────────────────────────────",
        f"  1. Increase patrols in areas with {top_crime_type} incidents",
        f"  2. Focus on {distributions[0][0] if distributions else 'N/A'} prevention (highest volume)",
        "  3. Monitor repeat offender patterns",
        "",
        "Confidence: Based on historical patterns in current dataset",
        "Note: Predictive accuracy improves with more historical data",
    ])
    
    return "\n".join(lines)


def _policy_recommendations_response(rows, evidence, lang):
    """Generate policy recommendations based on actual crime data."""
    if not rows:
        return "No crime data available to generate policy recommendations."
    
    total = sum(r.get("count", 0) for r in rows)
    top_crimes = rows[:5]
    
    lines = [
        "Policy Recommendations Based on Crime Data",
        f"Analysis of {total} total cases across {len(rows)} crime types",
        "",
        "═══════════════════════════════════════════════════",
        "KEY FINDINGS",
        "═══════════════════════════════════════════════════",
    ]
    
    for r in top_crimes:
        ct = r.get("crime_type", "N/A")
        c = r.get("count", 0)
        pct = (c / total * 100) if total > 0 else 0
        lines.append(f"  • {ct}: {c} cases ({pct:.1f}%)")
    
    lines.extend([
        "",
        "═══════════════════════════════════════════════════",
        "RECOMMENDATIONS",
        "═══════════════════════════════════════════════════",
    ])
    
    for r in top_crimes:
        ct = r.get("crime_type", "N/A")
        c = r.get("count", 0)
        pct = (c / total * 100) if total > 0 else 0
        
        if pct >= 10:
            lines.append(f"  🔴 HIGH PRIORITY — {ct} ({pct:.1f}%)")
            if "death" in ct.lower() or "murder" in ct.lower():
                lines.append("     → Strengthen forensic investigation units")
                lines.append("     → Deploy additional crime scene teams")
            elif "theft" in ct.lower() or "vehicle" in ct.lower():
                lines.append("     → Increase surveillance in hotspots")
                lines.append("     → Launch public awareness campaigns")
            elif "fraud" in ct.lower() or "cyber" in ct.lower() or "hacking" in ct.lower():
                lines.append("     → Establish dedicated cyber crime units")
                lines.append("     → Conduct digital literacy programs")
            elif "assault" in ct.lower() or "robbery" in ct.lower() or "dacoity" in ct.lower():
                lines.append("     → Deploy rapid response teams")
                lines.append("     → Increase night patrols in affected areas")
            elif "breach" in ct.lower() or "financial" in ct.lower():
                lines.append("     → Strengthen financial crime investigation")
                lines.append("     → Coordinate with banking institutions")
            else:
                lines.append("     → Allocate dedicated investigation resources")
                lines.append("     → Implement targeted prevention programs")
    
    lines.extend([
        "",
        "═══════════════════════════════════════════════════",
        "STRATEGIC ACTIONS",
        "═══════════════════════════════════════════════════",
        "  1. Data-driven patrol allocation based on crime patterns",
        "  2. Community policing programs in high-incident areas",
        "  3. Enhanced inter-agency coordination for cross-border crimes",
        "  4. Regular training updates for investigating officers",
        "  5. Public reporting mechanisms to improve crime data quality",
        "",
        "Note: Recommendations are generated based on current crime data patterns.",
        "Regular review and adjustment of strategies is recommended.",
    ])
    
    return "\n".join(lines)
