import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message, CopilotState, ConversationSession } from '../types/copilot.types';
import { getRandomRoleSuggestions, parseCopilotResponse } from '../constants/suggestedQueries';
import { authHeaders } from '@/utils/authHeaders';
import type { Language } from '../constants/i18n';
import type { KSPRole } from '@/config/navConfig';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardHighlight } from './useDashboardHighlight';

const COPILOT_API = '/api/copilot/chat';

export function useCopilot() {
  const [state, setState] = useState<CopilotState>('collapsed');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [lang, setLang] = useState<Language>('en');
  const { getPrimaryRole } = useAuth();
  const userRole: KSPRole = getPrimaryRole();
  const [suggestions, setSuggestions] = useState<string[]>(() => getRandomRoleSuggestions(4, 'en', userRole));
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputHistoryRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const { highlight } = useDashboardHighlight();

  // Toggle open/close
  const toggle = useCallback(() => {
    setState((prev) => (prev === 'collapsed' ? 'expanded' : 'collapsed'));
    setError(null);
  }, []);

  // Refresh suggestion chips when language or role changes
  useEffect(() => {
    setSuggestions(getRandomRoleSuggestions(4, lang, userRole));
  }, [lang, userRole]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
        return;
      }
      if (e.key === 'Escape' && state !== 'collapsed') {
        setState('collapsed');
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/' && state === 'expanded') {
        e.preventDefault();
        // Focus the input — handled in component
        window.dispatchEvent(new CustomEvent('copilot-focus-input'));
        return;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state, toggle]);

  // Send a message
  const sendMessage = useCallback(async (text: string) => {
    const query = text.trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    const assistantId = `ai-${Date.now()}`;
    setMessages((prev) => [...prev, userMsg]);
    setState('thinking');
    setIsLoading(true);
    setError(null);

    // Add to input history
    inputHistoryRef.current = [query, ...inputHistoryRef.current].slice(5);
    historyIdxRef.current = -1;

    try {
      const response = await fetch(COPILOT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          message: query,
          language: lang,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      // New copilot API response: { session_id, reply_text, intent_detected, classification_confidence, evidence, ... }
      const rawText = data.reply_text || data.content || '';
      const sessionId: string | undefined = data.session_id;

      // Parse structured markers from the response content
      const parsed = parseCopilotResponse(rawText);

      // Use intent detection info from the new API
      const classificationConfidence: number | undefined = data.classification_confidence;

      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: parsed.cleanText || rawText,
        timestamp: new Date(),
        citedCards: parsed.citedCards as any,
        chartData: parsed.chartData ? {
          type: parsed.chartData.type as 'line' | 'bar' | 'pie',
          ...JSON.parse(parsed.chartData.json),
        } : undefined,
        confidence: classificationConfidence ?? parsed.confidence ?? undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Update session tracking from server-provided session_id
      if (sessionId) {
        const existingSessionIdx = sessions.findIndex((s) => s.id === sessionId);
        if (existingSessionIdx >= 0) {
          setSessions((prev) => prev.map((s, i) =>
            i === existingSessionIdx
              ? { ...s, messageCount: s.messageCount + 1, timestamp: new Date() }
              : s,
          ));
        } else {
          setSessions((prev) => [{
            id: sessionId,
            title: query.slice(0, 40),
            messageCount: 1,
            timestamp: new Date(),
          }, ...prev]);
        }
      } else if (sessions.length === 0) {
        // Fallback: create local session
        setSessions([{
          id: `session-${Date.now()}`,
          title: query.slice(0, 40),
          messageCount: 1,
          timestamp: new Date(),
        }]);
      }

      // Reshuffle suggestions
      setSuggestions(getRandomRoleSuggestions(4, lang, userRole));
      setState('expanded');
    } catch (err) {
      setError((err as Error).message);
      setState('expanded');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, sessions, highlight, lang, userRole]);

  // Listen for external open-with-query events (from navigation links)
  useEffect(() => {
    const handler = (e: CustomEvent<{ query: string }>) => {
      const query = e.detail?.query;
      if (query) {
        setInput(query);
        setState('expanded');
        // Auto-send after a short delay
        setTimeout(() => sendMessage(query), 300);
      }
    };
    window.addEventListener('copilot-open-with-query' as any, handler);
    return () => window.removeEventListener('copilot-open-with-query' as any, handler);
  }, [sendMessage]);

  return {
    state, setState,
    messages, setMessages,
    input, setInput,
    suggestions, setSuggestions,
    sessions,
    isLoading,
    error,
    lang, setLang,
    sendMessage,
    toggle,
    highlight,
  };
}
