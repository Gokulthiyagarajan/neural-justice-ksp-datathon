"""
EN↔KN translation via QuickML.
Preserves proper nouns (names, station names, crime numbers).
"""
import re
import logging

logger = logging.getLogger(__name__)

# Proper noun patterns to preserve during translation
PROPER_NOUN_PATTERNS = [
    r'\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b',  # Full names: "John Doe"
    r'\b[A-Z][a-z]+(?:\s(?:PS|Station))\b',  # Station names: "Koramangala PS"
    r'\b[A-Z]{2}-\d{4}-\d+\b',               # Crime numbers: "KL-2024-001"
    r'\b(?:Bengaluru|Mumbai|Delhi|Karnataka|India)\b',  # Place names
]


def _extract_proper_nouns(text: str) -> tuple[str, list[tuple[str, str]]]:
    """Replace proper nouns with placeholders, return (modified_text, replacements)."""
    replacements = []
    modified = text
    for i, pattern in enumerate(PROPER_NOUN_PATTERNS):
        for match in re.finditer(pattern, text):
            placeholder = f"__PN{i}_{len(replacements)}__"
            replacements.append((placeholder, match.group(0)))
            modified = modified.replace(match.group(0), placeholder, 1)
    return modified, replacements


def _restore_proper_nouns(text: str, replacements: list[tuple[str, str]]) -> str:
    """Restore proper nouns from placeholders."""
    for placeholder, original in replacements:
        text = text.replace(placeholder, original)
    return text


async def translate_to_kannada(text: str) -> str:
    """Translate English text to Kannada, preserving proper nouns."""
    modified, replacements = _extract_proper_nouns(text)
    # Placeholder: in production, call QuickML translation endpoint
    translated = _restore_proper_nouns(modified, replacements)
    return translated


async def translate_to_english(text: str) -> str:
    """Translate Kannada text to English, preserving proper nouns."""
    modified, replacements = _extract_proper_nouns(text)
    # Placeholder: in production, call QuickML translation endpoint
    translated = _restore_proper_nouns(modified, replacements)
    return translated


async def detect_language(text: str) -> str:
    """Simple Kannada detection via Unicode range."""
    kannada_chars = sum(1 for c in text if '\u0C80' <= c <= '\u0CFF')
    total_alpha = sum(1 for c in text if c.isalpha())
    if total_alpha > 0 and kannada_chars / total_alpha > 0.3:
        return "kn"
    return "en"
