import { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2, Sparkles } from 'lucide-react';
import type { CopilotState, Message } from './types/copilot.types';
import { COPILOT_TEXT } from './constants/i18n';
import { RANK_CONFIG } from '@/config/navConfig';
import { useAuth } from '@/hooks/useAuth';
import CopilotMessage from './CopilotMessage';
import CopilotInput from './CopilotInput';
import CopilotSuggestions from './CopilotSuggestions';
import { ROLE_WELCOME } from './constants/suggestedQueries';

interface CopilotPanelProps {
  state: CopilotState;
  onStateChange: (s: CopilotState) => void;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  input: string;
  onInputChange: (v: string) => void;
  suggestions: string[];
  lang: 'en' | 'kn';
  onLangChange: (l: 'en' | 'kn') => void;
  onSendMessage: (text: string) => void;
  /** If true, renders inline (for /ai page) instead of as a fixed overlay portal. */
  inline?: boolean;
}

export default function CopilotPanel({
  state,
  onStateChange,
  messages,
  isLoading,
  error,
  input,
  onInputChange,
  suggestions,
  lang,
  onLangChange,
  onSendMessage,
  inline = false,
}: CopilotPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getPrimaryRole } = useAuth();
  const userRole = getPrimaryRole();
  const roleLabel = RANK_CONFIG[userRole]?.label ?? 'Investigator';
  const roleWelcome = useMemo(
    () => ROLE_WELCOME[userRole]?.[lang] ?? ROLE_WELCOME.OFFICER[lang],
    [userRole, lang],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (state === 'expanded') {
      setTimeout(() => window.dispatchEvent(new CustomEvent('copilot-focus-input')), 100);
    }
  }, [state]);

  const handleSend = (text: string) => {
    onSendMessage(text);
    onInputChange('');
  };

  const close = () => onStateChange('collapsed');

  // ── Inline mode (for /ai page) ──────────────────────────────────
  if (inline) {
    return (
      <div
        className="flex flex-col h-full overflow-hidden"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
        }}
      >
        <ChatContextBar lang={lang} />        <MessageArea
            messages={messages}
            isLoading={isLoading}
            error={error}
            suggestions={suggestions}
            lang={lang}
            messagesEndRef={messagesEndRef}
            onSendMessage={handleSend}
            roleWelcome={roleWelcome}
          />
        <CopilotInput
          value={input}
          onChange={onInputChange}
          onSend={handleSend}
          disabled={isLoading}
          lang={lang}
        />
      </div>
    );
  }

  // ── Floating overlay mode (default) ─────────────────────────────
  return (
    <AnimatePresence>
      {state !== 'collapsed' && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed z-[9998] overflow-hidden"
          style={{
            bottom: 84,
            right: 24,
            width: 420,
            height: '75vh',
            maxHeight: 700,
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ChatHeader
            roleLabel={roleLabel}
            lang={lang}
            onLangChange={onLangChange}
            onClose={close}
          />
          <ChatContextBar lang={lang} />
          <MessageArea
            messages={messages}
            isLoading={isLoading}
            error={error}
            suggestions={suggestions}
            lang={lang}
            messagesEndRef={messagesEndRef}
            onSendMessage={handleSend}
            roleWelcome={roleWelcome}
          />
          <CopilotInput
            value={input}
            onChange={onInputChange}
            onSend={handleSend}
            disabled={isLoading}
            lang={lang}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChatHeader({ roleLabel, lang, onLangChange, onClose }: {
  roleLabel: string; lang: 'en' | 'kn'; onLangChange: (l: 'en' | 'kn') => void; onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 shrink-0 h-14 border-b border-border">
      <div className="flex items-center gap-2 flex-1">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
        </span>
        <span className="text-16px font-medium text-foreground">AI Copilot</span>
      </div>
      <span className="text-12px font-medium px-2 py-0.5 rounded-full text-primary bg-primary-10 border border-primary-20">
        {roleLabel}
      </span>
      <button onClick={() => onLangChange(lang === 'en' ? 'kn' : 'en')}
        className="text-12px font-semibold font-mono px-1.5 py-0.5 rounded transition-colors text-muted-foreground hover:text-foreground">
        {lang === 'en' ? 'EN' : 'ಕನ್ನಡ'}
      </button>
      <button onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded transition-colors text-muted-foreground hover:bg-muted">
        <Minimize2 className="w-3.5 h-3.5" />
      </button>
      <button onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded transition-colors text-muted-foreground hover:bg-muted hover:text-destructive">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ChatContextBar({ lang }: { lang: 'en' | 'kn' }) {
  return (
    <div className="text-12px px-4 py-2 shrink-0 font-mono text-muted-foreground border-b border-border">
      {COPILOT_TEXT[lang].analysing}
    </div>
  );
}

function MessageArea({ messages, isLoading, error, suggestions, lang, messagesEndRef, onSendMessage, roleWelcome, input }: {
  messages: Message[]; isLoading: boolean; error: string | null;
  suggestions: string[]; lang: 'en' | 'kn';
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSendMessage: (text: string) => void;
  /** Current input value for retry button */
  input?: string;
  roleWelcome?: { title: string; subtext: string };
}) {
  const t = COPILOT_TEXT[lang];
  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth: 'thin' }}>
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <Sparkles className="w-8 h-8 mb-3 text-muted-foreground" />
          <p className="text-14px font-medium text-foreground mb-1">
            {roleWelcome?.title ?? t.askAnything}
          </p>
          <p className="text-13.3333px text-muted-foreground">
            {roleWelcome?.subtext ?? t.askSubtext}
          </p>
          <div className="mt-4 w-full">
            <CopilotSuggestions suggestions={suggestions} lang={lang} onSelect={onSendMessage} />
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <CopilotMessage key={msg.id} message={msg} />
      ))}

      {isLoading && (
        <CopilotMessage
          message={{ id: 'typing', role: 'assistant', content: '', timestamp: new Date(), streaming: true }}
        />
      )}

      {error && (
        <div className="px-3.5 py-2.5 rounded-lg text-13.3333px bg-destructive-10 border border-destructive-25 text-destructive">
          <p>Unable to reach AI service. Check your connection.</p>
          <button onClick={() => { if (input) onSendMessage(input); }} className="mt-1.5 text-12px underline underline-offset-2 hover:no-underline text-destructive">Try again</button>
        </div>
      )}

      {messages.length > 0 && !isLoading && (
        <div className="pt-2">
          <CopilotSuggestions suggestions={suggestions} lang={lang} onSelect={onSendMessage} />
        </div>
      )}

      <div ref={messagesEndRef as React.Ref<HTMLDivElement>} />
    </div>
  );
}
