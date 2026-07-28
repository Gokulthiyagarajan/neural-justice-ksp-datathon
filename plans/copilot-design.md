# Drishti Copilot — Design Document

## Status: SUPERSEDED by GOD MASTER PROMPT

This design doc was created during the brainstorming phase. The user then provided the
definitive GOD MASTER PROMPT (final, corrected architecture) which supersedes this document.

The GOD MASTER PROMPT is the authoritative spec. See the implementation plan for execution details.

## Key Decisions (from brainstorming)

1. **Data Layer:** SQLite-based (user decision) — **CORRECTED** by GOD PROMPT to ZCQL-only
2. **Implementation Path:** Hybrid (new backend endpoint + reuse existing frontend components)
3. **Intent Classification:** Two-tier (rule-based + QuickML fallback)
4. **Session Storage:** SQLite sessions table — **CORRECTED** by GOD PROMPT to Catalyst DataStore/Cache
5. **Voice & PDF:** Reuse existing hooks and PDF engine

## Corrections from GOD MASTER PROMPT

- **NO sqlite3 anywhere** — ZCQL only against real Catalyst DataStore
- **NO local database** — session persistence via Catalyst DataStore/Cache
- **Existing ZCQL client wrapper** already used by FIR endpoints — must find and reuse
- **8 specific intents** with exact ZCQL patterns defined
- **general_query** must be bounded, not open-ended LLM free response
- **10 mandatory tests** with results reporting
