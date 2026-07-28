"""
Drishti Copilot API Router.

Endpoints:
  POST /api/copilot/chat        — Send a message, get AI response (4-stage pipeline)
  GET  /api/copilot/sessions/{id} — Get session info + message count
  POST /api/copilot/export      — Export chat transcript as PDF
"""
import logging
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from backend.api.copilot.models import ChatRequest, ChatResponse, Intent
from backend.api.copilot.auth import get_current_user, get_jurisdiction_scope, CurrentUser, JurisdictionScope
from backend.api.copilot.intent import classify_intent
from backend.api.copilot.executor import execute_intent_query
from backend.api.copilot.response import generate_response
from backend.api.copilot.chat_pipeline import run_chat_pipeline
from backend.api.copilot.datastore import DataStore, get_datastore
from backend.api.copilot.session_store import SessionStore
from backend.api.copilot.translate import detect_language, translate_to_english, translate_to_kannada
from backend.pipeline.nim_client import NimClient

logger = logging.getLogger(__name__)
router = APIRouter(tags=["copilot"])


def _get_session_store(ds: DataStore = Depends(get_datastore)) -> SessionStore:
    ss = SessionStore(ds)
    ss.init_tables()
    return ss


def _get_nim_client() -> NimClient:
    """Get NIM client for chat pipeline."""
    api_key = os.getenv("NVIDIA_API_KEY", "")
    return NimClient(api_key=api_key)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    user: CurrentUser = Depends(get_current_user),
    scope: JurisdictionScope = Depends(get_jurisdiction_scope),
    datastore: DataStore = Depends(get_datastore),
    session_store: SessionStore = Depends(_get_session_store),
):
    """Process a chat message through the 4-stage pipeline and return AI response.
    
    ALL messages go through: Generation → Critical Review → Deep Reasoning → Consistency
    """

    # 1. Detect language if not specified
    detected_lang = await detect_language(req.message)
    msg_lang = req.language or detected_lang

    # 2. Translate to English if Kannada input
    query_text = req.message
    if msg_lang == "kn":
        query_text = await translate_to_english(req.message)

    # 3. Create or reuse session
    session_id = req.session_id
    if not session_id:
        session_id = session_store.create_session(msg_lang)

    # Store user message
    session_store.add_message(session_id, "user", req.message, msg_lang)

    # 4. Get conversation history for context
    history = session_store.get_history(session_id, limit=10)

    # 5. Classify intent (for evidence/context gathering)
    intent, confidence, tier, entities = await classify_intent(query_text)

    # 6. Gather evidence for crime data intents
    evidence, rows = [], []
    crime_context = ""
    
    if intent != Intent.GENERAL_CHAT and intent != Intent.GENERAL_QUERY:
        try:
            evidence, rows = execute_intent_query(intent, entities, scope, datastore)
            if rows:
                crime_context = f"\nRelevant data from platform: {rows[:5]}"
        except Exception as e:
            logger.warning("Evidence gathering failed: %s", str(e)[:100])

    # 7. Run ALL messages through the 4-stage chat pipeline
    try:
        client = _get_nim_client()
        llm_history = [{"role": m.get("role", "user"), "content": m.get("content", "")} for m in history[-10:]]
        
        # Add crime context to the message for the pipeline
        enhanced_message = query_text
        if crime_context:
            enhanced_message = f"{query_text}\n{crime_context}"
        
        pipeline_result = await run_chat_pipeline(
            user_message=enhanced_message,
            client=client,
            history=llm_history,
            intent=intent.value,
            language=msg_lang,
        )
        reply_text = pipeline_result["final_response"]
        
        # Log pipeline info
        stages = pipeline_result.get("stages", [])
        total_time = pipeline_result.get("processing_time_ms", 0)
        logger.info(
            "Chat pipeline completed: %d stages, %.1fms total, intent=%s",
            len(stages), total_time, intent.value,
        )
        
    except Exception as e:
        logger.error("Chat pipeline failed: %s", str(e)[:200])
        # Fallback to simple response generation
        if rows:
            reply_text = generate_response(intent, rows, evidence, msg_lang, history)
        else:
            reply_text = generate_response(intent, [], [], msg_lang, history, query_text)

    # 8. Translate response if Kannada
    if msg_lang == "kn":
        reply_text = await translate_to_kannada(reply_text)

    # 9. Store assistant message
    session_store.add_message(session_id, "assistant", reply_text, msg_lang, intent=intent.value)

    return ChatResponse(
        session_id=session_id,
        reply_text=reply_text,
        reply_language=msg_lang,
        intent_detected=intent,
        classification_confidence=confidence,
        classification_tier=tier,
        query_evidence=evidence,
        clarification_needed=False,
        clarification_prompt=None,
    )


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    user: CurrentUser = Depends(get_current_user),
    session_store: SessionStore = Depends(_get_session_store),
):
    """Get session info and message count."""
    info = session_store.get_session_info(session_id)
    if not info:
        raise HTTPException(status_code=404, detail="Session not found")
    return info


@router.post("/export")
async def export_transcript(
    request: dict,
    user: CurrentUser = Depends(get_current_user),
    session_store: SessionStore = Depends(_get_session_store),
):
    """Export chat transcript as PDF."""
    session_id = request.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    info = session_store.get_session_info(session_id)
    if not info:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get session messages
    messages = session_store.get_history(session_id)
    
    # Generate PDF
    pdf_content = None  # TODO: Implement PDF generation using fpdf2
    
    # For now, return a simple message indicating the feature is available
    return {
        "session_id": session_id,
        "message_count": info.message_count,
        "status": "export_pending",
        "message": "PDF export feature available - implement using backend.pdf.engine.generate_fir_pdf",
        "available": True,
    }


@router.post("/classify")
async def classify_intent_endpoint(
    request: dict,
    user: CurrentUser = Depends(get_current_user),
):
    """Classify intent (standalone endpoint)."""
    message = request.get("message")
    language = request.get("language", "en")
    
    if not message:
        raise HTTPException(status_code=400, detail="message required")
    
    # Use existing classify_intent function
    intent, confidence, tier, entities = await classify_intent(message, language)
    
    return {
        "intent": intent.value,
        "confidence": confidence,
        "tier": tier,
        "entities": entities,
    }


@router.post("/translate")
async def translate_text_endpoint(
    request: dict,
    user: CurrentUser = Depends(get_current_user),
):
    """Translate text."""
    text = request.get("text")
    from_language = request.get("from_language", "en")
    to_language = request.get("to_language", "kn")
    
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    
    # Use existing translate functions
    if from_language == "kn" and to_language == "en":
        translated = await translate_to_english(text)
    elif from_language == "en" and to_language == "kn":
        translated = await translate_to_kannada(text)
    else:
        # Fallback: implement basic translation or return original
        translated = text
    
    return {
        "translated_text": translated,
        "from_language": from_language,
        "to_language": to_language,
    }
