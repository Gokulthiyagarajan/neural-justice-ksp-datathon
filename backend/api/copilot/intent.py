"""
Two-tier intent classifier:
1. Rule-based keyword/regex matching (fast, deterministic)
2. QuickML LLM fallback (handles ambiguity)

Confidence threshold: 0.6
Ambiguity margin: 0.15 (if top-2 scores within this, route to LLM fallback)
"""
import re
import logging
from backend.api.copilot.models import Intent

logger = logging.getLogger(__name__)

CONFIDENCE_THRESHOLD = 0.6
AMBIGUITY_MARGIN = 0.15

# ── Rule-based patterns ──
# Each pattern: (compiled_regex, intent, base_confidence, entity_extractors)

PATTERNS = [
    # risk_score — must be specific to avoid matching "about" in general text
    (re.compile(r"risk\s*score|risk\s*rating|risk\s*level|ಅಪಾಯ.*ಸ್ಕೋರ್", re.I),
     Intent.RISK_SCORE, 0.85, {}),
    (re.compile(r"accused.*risk|risk.*accused|accused.*danger", re.I),
     Intent.RISK_SCORE, 0.80, {}),
    (re.compile(r"(?:what\s+is|show|get|check)\s+(?:the\s+)?risk\s+(?:score|rating|level)\s+(?:for|of|of\s+the)\s+(.+?)(?:\?|$)", re.I),
     Intent.RISK_SCORE, 0.80, {"name": 1}),

    # crime_trends
    (re.compile(r"crime\s*trend|crime\s*pattern|trend.*crime|ಅಪರಾಧ|ಪ್ರವೃತ್ತಿ|ಘಟನೆ", re.I),
     Intent.CRIME_TRENDS, 0.90, {}),
    (re.compile(r"(?:show|display|list).*trend", re.I),
     Intent.CRIME_TRENDS, 0.80, {}),
    (re.compile(r"(?:how\s+many|number\s+of)\s+(?:cases?|crimes?|fir)", re.I),
     Intent.CRIME_TRENDS, 0.75, {}),
    (re.compile(r"(?:city|bengaluru|bangalore).*(?:summary|overview|intelligence|crime)", re.I),
     Intent.CRIME_TRENDS, 0.85, {}),
     (re.compile(r"(?:summary|overview|intelligence).*(?:crime|city|bengaluru)", re.I),
     Intent.CRIME_TRENDS, 0.85, {}),

    # policy_recommendations
    (re.compile(r"policy\s*recommend|recommendation.*crime|crime.*recommend|policy.*crime|recommend.*action|strateg|suggest.*(?:crime|action|measure|initiative)", re.I),
     Intent.POLICY_RECOMMENDATIONS, 0.90, {}),
    (re.compile(r"what\s*(?:are\s+)?(?:some\s+)?recommend", re.I),
     Intent.POLICY_RECOMMENDATIONS, 0.85, {}),

    # hotspot
    (re.compile(r"hot\s*spot| hotspot | hotspot$|^hotspot|ಹಾಟ್\u200cಸ್ಪಾಟ್", re.I),
     Intent.HOTSPOT, 0.90, {}),
    (re.compile(r"where.*(?:most|high|cluster|concentration)", re.I),
     Intent.HOTSPOT, 0.80, {}),
    (re.compile(r"(?:top|high)\s+(?:crime|incident)\s+(?:areas?|locations?|zones?)", re.I),
     Intent.HOTSPOT, 0.85, {}),
    (re.compile(r"(?:bengaluru|bangalore|city).*(?:data|stats|statistics|crime)", re.I),
     Intent.CRIME_TRENDS, 0.80, {}),
    (re.compile(r"i\s+need.*(?:bengaluru|bangalore)", re.I),
     Intent.CRIME_TRENDS, 0.75, {}),

    # predictive
    (re.compile(r"predict|forecast|future|next\s+\d+\s+days|prediction", re.I),
     Intent.PREDICTIVE, 0.90, {}),
    (re.compile(r"predictive\s+policing|crime\s+forecast|risk\s+forecast", re.I),
     Intent.PREDICTIVE, 0.95, {}),
    (re.compile(r"what\s+will\s+happen|what\s+to\s+expect", re.I),
     Intent.PREDICTIVE, 0.80, {}),

    # suspect_lookup
    (re.compile(r"suspect\s+([A-Z][\w\s]{1,30})", re.I),
     Intent.SUSPECT_LOOKUP, 0.85, {"name": 1}),
    (re.compile(r"suspect|accused|ಆರೋಪಿ|ಖತೀಬ|shakki|sandiga", re.I),
     Intent.SUSPECT_LOOKUP, 0.85, {}),
    (re.compile(r"find.*(?:person|man|woman|individual)", re.I),
     Intent.SUSPECT_LOOKUP, 0.70, {}),
    (re.compile(r"(?:search|look\s*up|find)\s+([A-Z][\w\s]{1,30})", re.I),
     Intent.SUSPECT_LOOKUP, 0.75, {"name": 1}),
    (re.compile(r"ಹುಡುಕು|ಹುಡುಕಿ|shakki\s+helu", re.I),
     Intent.SUSPECT_LOOKUP, 0.80, {}),

    # victim_stats
    (re.compile(r"victim|ಸಂತ್ರಸ್ತ|受害", re.I),
     Intent.VICTIM_STATS, 0.85, {}),
    (re.compile(r"(?:victim|受害).*(?:demo|stat|count|number)", re.I),
     Intent.VICTIM_STATS, 0.90, {}),
    (re.compile(r"(?:age|gender|demographic).*(?:victim|受害)", re.I),
     Intent.VICTIM_STATS, 0.85, {}),

    # station_performance
    (re.compile(r"station\s*performance|station.*(?:doing|status|report)|ಪೊಲೀಸ್\s*ಸ್ಟೇಷನ್", re.I),
     Intent.STATION_PERFORMANCE, 0.90, {}),
    (re.compile(r"(?:how\s+is|status\s+of)\s+(?:station|ps)\s+(\w[\w\s]{0,20})", re.I),
     Intent.STATION_PERFORMANCE, 0.80, {"station": 1}),
    (re.compile(r"(?:how\s+is|status\s+of)\s+(\w[\w\s]{0,20})\s+station", re.I),
     Intent.STATION_PERFORMANCE, 0.80, {"station": 1}),
    (re.compile(r"station\s+(\w[\w\s]{0,20})", re.I),
     Intent.STATION_PERFORMANCE, 0.70, {"station": 1}),
    (re.compile(r"(\w[\w\s]{0,20})\s+station\s*(?:performance|status|doing)", re.I),
     Intent.STATION_PERFORMANCE, 0.85, {"station": 1}),

    # case_timeline — roadmap / timeline / what happened / history of a case
    # (EN + KN). These must outrank officer_assignment for timeline phrasings,
    # and MUST capture the case_id entity so the handler knows which case.
    (re.compile(r"road\s*map|roadmap", re.I),
     Intent.CASE_TIMELINE, 0.93, {}),
    (re.compile(r"timeline|history\s+of\s+this\s+case|case\s+history|ಕಾಲರೇಖೆ|ಇತಿಹಾಸ|ಟೈಮ್ಲಾಯಿನ್|ಟೈಮ್\s*ಲೈನ್", re.I),
     Intent.CASE_TIMELINE, 0.92, {}),
    (re.compile(r"what\s+(?:was\s+)?happened|what\s+happened|what\s+went\s+down|ಏನಾಯಿತು|ಏನು\s+ಆಯ್ತು", re.I),
     Intent.CASE_TIMELINE, 0.90, {}),
    (re.compile(r"case\s*(?:timeline|roadmap|history|events|sequence|chronology)", re.I),
     Intent.CASE_TIMELINE, 0.92, {}),
    # Timeline keyword near a case ID — capture the ID (single capture group 1).
    # Lazy .{0,40}? so the ID is not truncated by greedy backtracking.
    (re.compile(r"(?:roadmap|timeline|what\s+happened|history|events?|summary|status|details|ಕಾಲರೇಖೆ|ಇತಿಹಾಸ|ಟೈಮ್ಲಾಯಿನ್).{0,40}?([A-Z]{1,4}[-/]?\d{4}[-/]?\d{1,10}|[0-9]{10,20})", re.I),
     Intent.CASE_TIMELINE, 0.91, {"case_id": 1}),
    # Case ID first, timeline keyword after — capture the ID (group 1)
    (re.compile(r"([A-Z]{1,4}[-/]?\d{4}[-/]?\d{1,10}|[0-9]{10,20}).{0,40}?(?:roadmap|timeline|what\s+happened|history|events?|summary|details|ಕಾಲರೇಖೆ|ಇತಿಹಾಸ|ಟೈಮ್ಲಾಯಿನ್)", re.I),
     Intent.CASE_TIMELINE, 0.91, {"case_id": 1}),
    (re.compile(r"(?:roadmap|timeline|what\s+happened|history|events?|summary).{0,40}?(?:case|fir|crime|ಕೇಸ್)", re.I),
     Intent.CASE_TIMELINE, 0.88, {}),

    # financial_intelligence — suspicious transaction report (EN + KN).
    # Bounded, data-only intent: never reaches the LLM / MOCK_AI guard.
    (re.compile(r"financial\s*intelligence|suspicious\s*transaction|money\s*trail|anomalous\s*transaction|ಹಣಕಾಸು\s*ಗುಪ್ತಚರ|ಅನುಮಾನಾಸ್ಪದ\s*ವಹಿವಾಟು|ವಹಿವಾಟು\s*ವರದಿ", re.I),
     Intent.FINANCIAL_INTELLIGENCE, 0.92, {}),

    # officer_assignment / case lookup
    (re.compile(r"officer\s*assignment|who.*assigned|assigned\s*officer|ನೇಮಕ", re.I),
     Intent.OFFICER_ASSIGNMENT, 0.85, {}),
    (re.compile(r"(?:which|who)\s+officer.*(?:case|fir)", re.I),
     Intent.OFFICER_ASSIGNMENT, 0.80, {}),
    (re.compile(r"(?:case|fir)\s*(?:no|number|#)?\s*(\d[\w-]{3,20})", re.I),
     Intent.OFFICER_ASSIGNMENT, 0.70, {"case_id": 1}),
    (re.compile(r"assigned\s*cases?|cases?\s*assigned|my\s*cases?|my\s*assigned", re.I),
     Intent.OFFICER_ASSIGNMENT, 0.85, {}),
    (re.compile(r"what.*cases?.*(?:for\s+me|assigned\s+to)", re.I),
     Intent.OFFICER_ASSIGNMENT, 0.80, {}),
    (re.compile(r"cases?.*(?:yesterday|today|this\s*week|last\s*week)", re.I),
     Intent.OFFICER_ASSIGNMENT, 0.75, {}),
    # Case IDs in CR-YYYY-NNNNN / 400090023202400001 format — match anywhere
    # (user often leads with the case number, e.g. "CR-2026-49637 give me the roadmap")
    (re.compile(r"\b([A-Z]{1,4}[-/]?\d{4}[-/]?\d{1,10}|[0-9]{10,20})\b", re.I),
     Intent.OFFICER_ASSIGNMENT, 0.85, {"case_id": 1}),
    (re.compile(r"(?:case|fir)\s*(?:roadmap|summary|status|details|what|timeline)", re.I),
     Intent.OFFICER_ASSIGNMENT, 0.80, {}),
    (re.compile(r"(?:roadmap|summary|status|details|timeline).*(?:case|fir)", re.I),
     Intent.OFFICER_ASSIGNMENT, 0.80, {}),
]


def _rule_based_classify(text: str) -> tuple[Intent, float, str, dict]:
    """Rule-based intent classification. Returns (intent, confidence, tier, entities)."""
    text_clean = text.strip()
    if not text_clean:
        return Intent.GENERAL_QUERY, 0.0, "rule_based", {}

    scores: dict[Intent, tuple[float, dict]] = {}

    for pattern, intent, base_conf, extractors in PATTERNS:
        match = pattern.search(text_clean)
        if match:
            match_ratio = len(match.group(0)) / max(len(text_clean), 1)
            conf = min(base_conf + match_ratio * 0.1, 1.0)

            # Extract entities from the match's groups
            entities = {}
            for entity_name, group_idx in extractors.items():
                if group_idx <= len(match.groups()):
                    val = match.group(group_idx)
                    if val:
                        entities[entity_name] = val.strip()

            if intent not in scores or conf > scores[intent][0]:
                scores[intent] = (conf, entities)

    if not scores:
        return Intent.GENERAL_CHAT, 0.3, "rule_based", {}

    ranked = sorted(scores.items(), key=lambda x: x[1][0], reverse=True)
    top_intent, (top_conf, top_entities) = ranked[0]

    # Check for ambiguity
    if len(ranked) >= 2:
        second_conf = ranked[1][1][0]
        if top_conf - second_conf < AMBIGUITY_MARGIN and top_conf < 0.9:
            return Intent.GENERAL_CHAT, top_conf * 0.8, "rule_based", {}

    return top_intent, top_conf, "rule_based", top_entities


async def classify_intent(text: str) -> tuple[Intent, float, str, dict]:
    """Classify user intent. Two-tier: rules first, QuickML fallback.

    Returns: (intent, confidence, tier, entities)
    """
    intent, conf, tier, entities = _rule_based_classify(text)

    if conf >= CONFIDENCE_THRESHOLD:
        logger.info("Intent classified (rule_based): %s (conf=%.2f)", intent.value, conf)
        return intent, conf, tier, entities

    # Tier 2: QuickML fallback (placeholder — will be implemented later)
    logger.info("Intent low confidence (%.2f), QuickML fallback not yet implemented", conf)
    return intent, conf, tier, entities
