"""Context builder — enriches AI Copilot requests with crime-data context.

Gathers real-time dashboard metrics, recent FIR summaries, hotspot data,
and early-warning alerts to provide grounding context for the LLM.
"""

from __future__ import annotations

import logging
import typing as t
from datetime import datetime, timedelta

logger = logging.getLogger("nj.ai.copilot.context")


class ContextBuilder:
    """Builds contextual data blocks for AI Copilot prompts.

    The context block is injected as a system-level message so the LLM
    has fresh, relevant data to ground its responses.
    """

    def __init__(self) -> None:
        self._cache: dict[str, t.Any] = {}
        self._cache_ttl = timedelta(seconds=30)

    # ── Public API ───────────────────────────────────────────────────────────

    def build_context(
        self,
        role_key: str | None = None,
        scope: str | None = None,
        include_dashboard: bool = True,
        include_alerts: bool = True,
        include_hotspots: bool = False,
    ) -> str:
        """Assemble a multi-section context block for the AI prompt.

        Parameters
        ----------
        role_key : str, optional
            KSP role key for filtering context scope.
        scope : str, optional
            Jurisdiction scope override.
        include_dashboard : bool
            Include dashboard KPI summary.
        include_alerts : bool
            Include active early-warning alerts.
        include_hotspots : bool
            Include current crime hotspot data.

        Returns
        -------
        str
            Formatted context block ready for injection.
        """
        sections: list[str] = ["## Current Dashboard Context\n"]

        if include_dashboard:
            sections.append(self._build_dashboard_section())

        if include_alerts:
            sections.append(self._build_alerts_section())

        if include_hotspots:
            sections.append(self._build_hotspots_section())

        sections.append(self._build_time_context())

        return "\n\n".join(sections)

    def build_case_context(self, crime_no: str) -> str:
        """Build context block for a specific FIR / case."""
        # In a real implementation, this would query the database
        return (
            f"## Case Context: {crime_no}\n\n"
            f"Case {crime_no} information has been retrieved for analysis.\n"
            f"Refer to the case database for full details including accused, "
            f"victims, evidence, investigation timeline, and case status."
        )

    def build_query_context(self, query: str) -> str:
        """Build context relevant to a specific user query."""
        query_lower = query.lower()

        context_pieces: list[str] = []

        if any(word in query_lower for word in ["fir", "case", "crime_no", "complaint"]):
            context_pieces.append("FIR database access: Searchable by crime_no, date range, "
                                  "station, crime type, status, investigating officer.")

        if any(word in query_lower for word in ["trend", "statistic", "compare", "increase", "decrease"]):
            context_pieces.append("Crime analytics: Trend data available for 30/60/90/180-day "
                                  "windows. Comparison across districts and crime types supported.")

        if any(word in query_lower for word in ["hotspot", "map", "area", "location", "geographic"]):
            context_pieces.append("Geospatial data: Crime hotspot analysis, density heatmaps, "
                                  "and geographic clustering available.")

        if any(word in query_lower for word in ["pattern", "modus", "mo", "serial", "repeat"]):
            context_pieces.append("Pattern analysis: MO similarity detection, serial offense "
                                  "identification, and behavioral profiling available.")

        if any(word in query_lower for word in ["accused", "suspect", "criminal", "network", "gang"]):
            context_pieces.append("Criminal intelligence: Co-accused network analysis, repeat "
                                  "offender tracking, and criminal profile data available.")

        if any(word in query_lower for word in ["forecast", "predict", "future", "project"]):
            context_pieces.append("Forecasting: Probabilistic crime forecasts available by "
                                  "district and crime type. 7/30/90/180-day horizons supported.")

        if not context_pieces:
            context_pieces.append("General crime intelligence data available for analysis. "
                                  "Specify your area of interest for more targeted context.")

        return "## Query-Specific Context\n\n" + "\n".join(f"- {piece}" for piece in context_pieces)

    # ── Internal builders ────────────────────────────────────────────────────

    def _build_dashboard_section(self) -> str:
        """Mock dashboard KPIs — replace with real API data in production."""
        return (
            "### Key Metrics\n"
            "- Total FIRs (today): 47\n"
            "- Active investigations: 892\n"
            "- Cases solved this month: 1,234\n"
            "- Pending chargesheets: 456\n"
            "- Critical early warnings: 3\n"
            "- Average resolution time: 45 days\n"
            "- Conviction rate: 67%\n"
            "- Active patrol units: 234\n"
            "- Officer deployment: 1,892\n\n"
            "Note: Metrics are refreshed every 30 seconds. "
            "Some values may be approximate for demonstration."
        )

    def _build_alerts_section(self) -> str:
        """Mock active alerts — replace with real EarlyWarning data."""
        return (
            "### Active Early Warnings\n"
            "⚠️ CRITICAL: Crime spike detected — Bengaluru Urban (chain snatching, +40%)\n"
            "⚠️ HIGH: Weather alert — Coastal Karnataka (heavy rainfall expected)\n"
            "⚠️ MEDIUM: Social media chatter — Hubballi (potential law & order situation)\n"
            "ℹ️ INFO: Inter-state alert — Vehicle theft gang operating in northern districts\n"
        )

    def _build_hotspots_section(self) -> str:
        """Mock hotspot data — replace with real geo-analytics data."""
        return (
            "### Current Crime Hotspots\n"
            "1. Koramangala, Bengaluru — Chain snatching (confidence: high)\n"
            "2. MG Road, Bengaluru — Vehicle theft (confidence: high)\n"
            "3. City Market, Mysuru — Pickpocketing (confidence: medium)\n"
            "4. Mangaluru Coastal — Substance trafficking (confidence: medium)\n"
            "5. Hubballi Bus Stand — Theft (confidence: low)\n"
        )

    def _build_time_context(self) -> str:
        """Add temporal context for the AI."""
        now = datetime.now()
        return (
            f"## Temporal Context\n"
            f"- Current date: {now.strftime('%A, %d %B %Y')}\n"
            f"- Current time: {now.strftime('%H:%M')} IST\n"
            f"- Day of year: {now.timetuple().tm_yday}\n"
            f"- Quarter: Q{(now.month - 1) // 3 + 1} FY{now.year if now.month >= 4 else now.year - 1}-{now.year + 1 if now.month >= 4 else now.year}\n"
        )
