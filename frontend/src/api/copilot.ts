import { api } from './client';
import type { CopilotQueryResponse, CopilotSession, CopilotMessage } from '@/types';

export async function queryCopilot(
  query: string,
  mode: string = 'general',
  sessionId?: string,
  context?: Record<string, unknown>
): Promise<CopilotQueryResponse> {
  return api.post('/ai/query', { query, mode, session_id: sessionId, context });
}

export async function getSessions(): Promise<CopilotSession[]> {
  return api.get('/ai/sessions');
}

export async function createSession(
  sessionType: string = 'general',
  title?: string
): Promise<CopilotSession> {
  return api.post('/copilot/sessions', { session_type: sessionType, title });
}

export async function getSessionMessages(sessionId: string): Promise<{
  session_id: string;
  messages: CopilotMessage[];
}> {
  return api.get(`/ai/sessions/${sessionId}/messages`);
}

export async function addSessionMessage(
  sessionId: string,
  role: string,
  content: string
): Promise<CopilotMessage> {
  return api.post(`/ai/sessions/${sessionId}/messages`, { role, content });
}
