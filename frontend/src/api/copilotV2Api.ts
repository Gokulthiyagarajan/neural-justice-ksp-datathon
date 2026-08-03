import { api } from './client';

// Request/response types that match the new /api/copilot/chat endpoint
export interface ChatRequest {
  message: string;
  session_id?: string;
  language?: string;
}

export interface QueryEvidence {
  relevant_entities: string[];
  data_sources: string[];
  jurisdiction_applied: string[];
  confidence_score: number;
  metadata?: Record<string, any>;
}

export interface ChatResponse {
  session_id: string;
  reply_text: string;
  reply_language: string;
  intent_detected: Intent | null;
  classification_confidence: number;
  classification_tier?: string;
  query_evidence: QueryEvidence;
  clarification_needed: boolean;
  clarification_prompt?: string;
}

export enum Intent {
  RISK_SCORE_DENIED = 'risk_score_denied',
  CRIME_TRENDS = 'crime_trends',
  HOTSPOT = 'hotspot',
  SUSPECT_LOOKUP = 'suspect_lookup',
  VICTIM_STATS = 'victim_stats',
  STATION_PERFORMANCE = 'station_performance',
  OFFICER_ASSIGNMENT = 'officer_assignment',
  GENERAL_QUERY = 'general_query',
}

export interface SessionInfo {
  session_id: string;
  session_type: string;
  title: string;
  created_at: string;
  message_count: number;
}

export interface CopilotMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  intent?: string;
}

// API client methods
export async function chat(
  message: string,
  sessionId?: string,
  language: string = 'en'
): Promise<ChatResponse> {
  const payload: ChatRequest = { message };
  if (sessionId) payload.session_id = sessionId;
  if (language && language !== 'en') payload.language = language;
  
  return api.post<ChatResponse>('/copilot/chat', payload);
}

export async function getSession(sessionId: string): Promise<SessionInfo> {
  return api.get<SessionInfo>(`/copilot/sessions/${sessionId}`);
}

export async function createSession(language: string = 'en'): Promise<SessionInfo> {
  const payload: Partial<ChatRequest> = { language };
  return api.post<SessionInfo>('/copilot/chat', payload);
}

export async function getSessions(): Promise<SessionInfo[]> {
  return api.get<SessionInfo[]>('/copilot/sessions');
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    await api.delete(`/copilot/sessions/${sessionId}`);
    return true;
  } catch {
    return false;
  }
}

export async function exportTranscript(sessionId: string): Promise<Blob> {
  const response = await api.get<Blob>(`/copilot/export/${sessionId}`, {
    responseType: 'blob' as const,
  });
  return response as unknown as Blob;
}

export async function classifyIntent(message: string, language: string = 'en'): Promise<{ intent: Intent; confidence: number; tier: string; entities: string[] }> {
  const payload: { message: string; language?: string } = { message };
  if (language && language !== 'en') payload.language = language;
  
  return api.post<{ intent: Intent; confidence: number; tier: string; entities: string[] }>('/copilot/classify', payload);
}

export async function translateText(text: string, fromLanguage: string, toLanguage: string): Promise<{ translated_text: string }> {
  return api.post<{ translated_text: string }>('/copilot/translate', {
    text,
    from_language: fromLanguage,
    to_language: toLanguage,
  });
}