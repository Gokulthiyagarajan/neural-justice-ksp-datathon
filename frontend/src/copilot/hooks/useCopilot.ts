import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message, CopilotState, ConversationSession } from '../types/copilot.types';
import { getRandomRoleSuggestions, parseCopilotResponse } from '../constants/suggestedQueries';
import { authHeaders } from '@/utils/authHeaders';
import type { Language } from '../constants/i18n';
import type { KSPRole } from '@/config/navConfig';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardHighlight } from './useDashboardHighlight';

const MAX_HISTORY = 20;
const COPILOT_API = '/api/ai/copilot/chat';

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

    // Save as session
    if (sessions.length === 0) {
      setSessions([{
        id: `session-${Date.now()}`,
        title: query.slice(0, 40),
        messageCount: 1,
        timestamp: new Date(),
      }]);
    }

    try {
      const history = messages.slice(-MAX_HISTORY).map((m) => ({
        role: m.role,
        content: lang === 'kn' && m.role === 'user'
          ? `Respond in Kannada (ಕನ್ನಡ). ${m.content}`
          : m.content,
      }));

      // Include the new query in the history sent to the backend
      const messagesPayload = [
        ...history,
        { role: 'user', content: lang === 'kn' ? `Respond in Kannada (ಕನ್ನಡ). ${query}` : query },
      ];

      const response = await fetch(COPILOT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          messages: messagesPayload,
          language: lang,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.response || '';
      const parsed = parseCopilotResponse(rawText);
      let chartDataParsed = null;
      if (parsed.chartData) {
        try {
          chartDataParsed = {
            type: parsed.chartData.type as 'line' | 'bar' | 'pie',
            ...JSON.parse(parsed.chartData.json),
          };
        } catch { /* ignore parse errors */ }
      }

      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: parsed.cleanText,
        timestamp: new Date(),
        citedCards: parsed.citedCards,
        chartData: chartDataParsed as any,
        confidence: data.confidence ?? parsed.confidence ?? undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Highlight cited cards
      if (parsed.citedCards.length > 0) {
        highlight(parsed.citedCards);
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
  }, [isLoading, messages, sessions, highlight]);

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
