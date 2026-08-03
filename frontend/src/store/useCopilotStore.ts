import { create } from 'zustand';
import { api } from '@/api/client';

// ── Types matching backend models ─────────────────────────────────────────
export type Intent =
  | 'risk_score_denied'
  | 'crime_trends'
  | 'hotspot'
  | 'suspect_lookup'
  | 'victim_stats'
  | 'station_performance'
  | 'officer_assignment'
  | 'general_query';

export interface CopilotMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  intent?: string;
}

export interface SessionInfo {
  session_id: string;
  session_type?: string;
  title?: string;
  created_at: string;
  message_count: number;
  language?: string;
}

export interface ChatResponse {
  session_id: string;
  reply_text: string;
  reply_language: string;
  intent_detected: Intent | null;
  classification_confidence: number;
  classification_tier?: string;
  query_evidence?: Record<string, unknown>;
  clarification_needed: boolean;
  clarification_prompt?: string;
}

// ── Store ─────────────────────────────────────────────────────────────────
interface CopilotState {
  currentSession: SessionInfo | null;
  sessions: SessionInfo[];
  messages: CopilotMessage[];
  isLoading: boolean;
  error: string | null;
  selectedIntent: Intent | null;
  intentConfidence: number;
  language: string;

  setCurrentSession: (s: SessionInfo | null) => void;
  setSelectedIntent: (i: Intent | null) => void;
  setIntentConfidence: (c: number) => void;
  setLanguage: (l: string) => void;
  clearMessages: () => void;
  clearError: () => void;

  sendMessage: (message: string, sessionId?: string, language?: string) => Promise<ChatResponse>;
  fetchSession: (sessionId: string) => Promise<SessionInfo>;
  fetchSessions: () => Promise<SessionInfo[]>;
  exportTranscript: (sessionId: string) => Promise<Blob>;
}

let _msgId = 0;
const nextId = () => ++_msgId;

export const useCopilotStore = create<CopilotState>((set, get) => ({
  currentSession: null,
  sessions: [],
  messages: [],
  isLoading: false,
  error: null,
  selectedIntent: null,
  intentConfidence: 0,
  language: 'en',

  setCurrentSession: (s) => set({ currentSession: s }),
  setSelectedIntent: (i) => set({ selectedIntent: i }),
  setIntentConfidence: (c) => set({ intentConfidence: c }),
  setLanguage: (l) => set({ language: l }),
  clearMessages: () => set({ messages: [], currentSession: null, selectedIntent: null, intentConfidence: 0 }),
  clearError: () => set({ error: null }),

  sendMessage: async (message, sessionId, language) => {
    const lang = language ?? get().language;
    set({ isLoading: true, error: null });

    try {
      const response = await api.post<ChatResponse>('/copilot/chat', {
        message,
        session_id: sessionId,
        language: lang,
      });

      const userMsg: CopilotMessage = {
        id: nextId(),
        session_id: response.session_id,
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
      };

      const assistantMsg: CopilotMessage = {
        id: nextId(),
        session_id: response.session_id,
        role: 'assistant',
        content: response.reply_text,
        intent: response.intent_detected ?? undefined,
        created_at: new Date().toISOString(),
      };

      // Build or update session info from response
      const prevSession = get().currentSession;
      const sessionInfo: SessionInfo = {
        session_id: response.session_id,
        session_type: prevSession?.session_type ?? 'general',
        title: prevSession?.title ?? message.slice(0, 60),
        created_at: prevSession?.created_at ?? new Date().toISOString(),
        message_count: (prevSession?.message_count ?? 0) + 2,
        language: response.reply_language,
      };

      set({
        messages: [...get().messages, userMsg, assistantMsg],
        currentSession: sessionInfo,
        selectedIntent: response.intent_detected ?? null,
        intentConfidence: response.classification_confidence,
      });

      return response;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      set({ error: msg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const info = await api.get<SessionInfo>(`/copilot/sessions/${sessionId}`);
      set({ currentSession: info });
      return info;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch session';
      set({ error: msg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSessions: async () => {
    // Backend doesn't have a list-sessions endpoint yet; gracefully degrade
    try {
      const data = await api.get<SessionInfo[]>('/copilot/sessions');
      set({ sessions: data });
      return data;
    } catch {
      // If the endpoint doesn't exist, just use local state
      return get().sessions;
    }
  },

  exportTranscript: async (sessionId) => {
    await api.post<{ pdf_url?: string; status: string }>(
      '/copilot/export',
      { session_id: sessionId },
    );
    // For now return empty blob; full implementation when backend generates PDF
    return new Blob(['Export pending'], { type: 'text/plain' });
  },
}));
