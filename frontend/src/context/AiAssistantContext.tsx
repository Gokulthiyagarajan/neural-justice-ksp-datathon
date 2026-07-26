import { createContext, useContext, type ReactNode } from 'react';
import { useCopilot } from '@/copilot/hooks/useCopilot';
import type { Message, CopilotState } from '@/copilot/types/copilot.types';

interface AiAssistantContextValue {
  state: CopilotState;
  setState: (s: CopilotState) => void;
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  suggestions: string[];
  isLoading: boolean;
  error: string | null;
  lang: 'en' | 'kn';
  setLang: (l: 'en' | 'kn') => void;
  sendMessage: (text: string) => Promise<void>;
  toggle: () => void;
  /** Clear all messages and start a fresh conversation */
  clearMessages: () => void;
}

const AiAssistantContext = createContext<AiAssistantContextValue | null>(null);

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const copilot = useCopilot();

  return (
    <AiAssistantContext.Provider value={{ ...copilot, clearMessages: () => copilot.setMessages([]) }}>
      {children}
    </AiAssistantContext.Provider>
  );
}

export function useAiAssistant(): AiAssistantContextValue {
  const ctx = useContext(AiAssistantContext);
  if (!ctx) {
    throw new Error('useAiAssistant must be used within AiAssistantProvider');
  }
  return ctx;
}
