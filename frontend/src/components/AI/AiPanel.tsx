import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, X, Minus, Maximize2, Minimize2, MessageSquarePlus,
  Trash2, Sparkles, Send,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAiAssistant } from '@/context/AiAssistantContext';
import CopilotMessage from '@/copilot/CopilotMessage';
import CopilotSuggestions from '@/copilot/CopilotSuggestions';
import { COPILOT_TEXT } from '@/copilot/constants/i18n';
import { ROLE_WELCOME } from '@/copilot/constants/suggestedQueries';
import { RANK_CONFIG } from '@/config/navConfig';
import { useAuth } from '@/hooks/useAuth';
import type { Language } from '@/copilot/constants/i18n';
import type { Message } from '@/copilot/types/copilot.types';

// ─── Panel state type ─────────────────────────────────────────────────────
type AiPanelMode = 'closed' | 'open' | 'maximized';

// ─── Breakpoints ──────────────────────────────────────────────────────────
const BP = { MOBILE: 768, TABLET: 1024 };
const MOBILE_HEIGHT_RATIO = 0.85;

// ─── Hook: responsive breakpoint ─────────────────────────────────────────
function useViewport() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    let rafId: number;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
    };
  }, []);
  return {
    isMobile: width < BP.MOBILE,
    isTablet: width >= BP.MOBILE && width < BP.TABLET,
    isDesktop: width >= BP.TABLET,
    width,
  };
}

// ─── Keyboard shortcut hook ───────────────────────────────────────────────
function useAiKeyboard(
  mode: AiPanelMode,
  setMode: (m: AiPanelMode) => void,
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setMode(mode === 'closed' ? 'open' : 'closed');
        return;
      }
      if (e.key === 'Escape') {
        if (mode === 'maximized') {
          e.preventDefault();
          setMode('open');
        } else if (mode !== 'closed') {
          e.preventDefault();
          setMode('closed');
        }
        return;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mode, setMode]);
}

// ─── Props ────────────────────────────────────────────────────────────────
interface AiPanelProps {
  visible: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function AiPanel({ visible }: AiPanelProps) {
  // ── ALL hooks MUST come before any early return ────────────────
  const [mode, setMode] = useState<AiPanelMode>('closed');

  const {
    messages, isLoading, error, lang, setLang,
    sendMessage, input, setInput, suggestions,
    clearMessages,
  } = useAiAssistant();

  const { getPrimaryRole } = useAuth();
  const userRole = getPrimaryRole();
  const roleLabel = RANK_CONFIG[userRole]?.label ?? 'Investigator';
  const roleWelcome = ROLE_WELCOME[userRole]?.[lang] ?? ROLE_WELCOME.OFFICER[lang];

  useAiKeyboard(mode, setMode);
  const viewport = useViewport(); // moved BEFORE early return

  const handleCommand = useCallback((cmd: 'close' | 'minimize' | 'maximize' | 'restore' | 'new' | 'clear') => {
    switch (cmd) {
      case 'close':
      case 'minimize':
        setMode('closed');
        break;
      case 'maximize':
        setMode('maximized');
        break;
      case 'restore':
        setMode('open');
        break;
      case 'new':
      case 'clear':
        clearMessages();
        setInput('');
        break;
    }
  }, [clearMessages, setInput]);

  // Sync with parent visibility — only reacts to `visible` prop changes.
  // When the parent opens AI (visible→true): set mode to open.
  // When the parent hides AI (visible→false): set mode to closed.
  // Does NOT react to internal `mode` changes (e.g. user clicking X),
  // which avoids immediately re-opening when the close button is pressed.
  useEffect(() => {
    if (visible) {
      setMode('open');
    } else {
      setMode('closed');
    }
  }, [visible]);

  if (!visible && mode === 'closed') return null;

  const renderAs = viewport.isMobile ? 'bottomSheet' : viewport.isTablet ? 'overlay' : 'modal';

  const header = (
    <HeaderBar
      lang={lang}
      roleLabel={roleLabel}
      onLangChange={setLang}
      onClose={() => handleCommand('close')}
      onMinimize={() => handleCommand('minimize')}
      onMaximize={() => handleCommand(mode === 'maximized' ? 'restore' : 'maximize')}
      isMaximized={mode === 'maximized'}
      onNewChat={() => handleCommand('new')}
      onClear={() => handleCommand('clear')}
    />
  );

  const sharedBody = (
    <>
      {header}
      <ChatContextBar lang={lang} />
      <MessageArea
        messages={messages}
        isLoading={isLoading}
        error={error}
        suggestions={suggestions}
        lang={lang}
        roleWelcome={roleWelcome}
        input={input}
        onSendMessage={(text) => { sendMessage(text); setInput(''); }}
      />
      <InputArea
        value={input}
        onChange={setInput}
        onSend={(text) => { sendMessage(text); setInput(''); }}
        disabled={isLoading}
        lang={lang}
      />
    </>
  );

  // ── Desktop: centered modal ─────────────────────────────────────────
  if (renderAs === 'modal') {
    const isMax = mode === 'maximized';
    const modalWidth = isMax ? 'min(92vw, 1400px)' : 'min(75vw, 960px)';
    const modalHeight = isMax ? 'min(92vh, 1200px)' : 'min(80vh, 800px)';

    return (
      <AnimatePresence>
        {(mode === 'open' || mode === 'maximized') && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-foreground-40 backdrop-blur-sm z-40"
              onClick={() => setMode('closed')}
              aria-hidden
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30, mass: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4"
            >
              <div
                className="flex flex-col overflow-hidden rounded-2xl shadow-2xl pointer-events-auto bg-card-97 backdrop-blur-md border border-border"
                style={{
                  width: modalWidth,
                  maxWidth: modalWidth,
                  height: modalHeight,
                  maxHeight: modalHeight,
                }}
                role="dialog"
                aria-modal="true"
                aria-label="AI Assistant"
              >
                {sharedBody}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // ── Tablet overlay ───────────────────────────────────────────────────
  if (renderAs === 'overlay') {
    return (
      <AnimatePresence>
        {(mode === 'open' || mode === 'maximized') && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground-40 z-40"
              onClick={() => setMode('closed')}
              aria-hidden
            />
            <motion.aside
              key="overlay"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 z-50 flex flex-col border-l border-border bg-card shadow-2xl"
              style={{ width: Math.min(400, window.innerWidth * 0.8) }}
              role="dialog"
              aria-modal="true"
              aria-label="AI Assistant"
            >
              {sharedBody}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  // ── Mobile bottom sheet ──────────────────────────────────────────────
  return (
    <AnimatePresence>
      {(mode === 'open' || mode === 'maximized') && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground-40 z-40"
            onClick={() => setMode('closed')}
            aria-hidden
          />
          <motion.div
            key="bottomsheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.7 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-card border-t border-border rounded-t-2xl shadow-2xl"
            style={{
              height: `calc(min(100vh * ${MOBILE_HEIGHT_RATIO}, 100vh - 40px))`,
              maxHeight: '85vh',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="AI Assistant"
          >
            <div className="flex justify-center pt-2 pb-1 shrink-0">
              <div className="w-8 h-1 rounded-full bg-border-40" />
            </div>
            {sharedBody}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════════════════════════════════
function HeaderBar({
  lang, roleLabel, onLangChange,
  onClose, onMinimize, onMaximize, isMaximized,
  onNewChat, onClear,
}: {
  lang: Language; roleLabel: string;
  onLangChange: (l: Language) => void;
  onClose: () => void; onMinimize: () => void;
  onMaximize: () => void; isMaximized: boolean;
  onNewChat: () => void; onClear: () => void;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 shrink-0"
      style={{ height: 52, borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-primary-10"
        >
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-14px font-semibold text-foreground truncate">AI Assistant</span>
            <span
              className="text-10px font-medium px-1.5 py-0.5 rounded-full shrink-0 hidden sm:inline text-primary bg-primary-10 border border-primary-20"
            >
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onLangChange(lang === 'en' ? 'kn' : 'en')}
          className="text-10px font-semibold font-mono px-1.5 py-1 rounded transition-colors text-muted-foreground hover:text-foreground"
          aria-label={`Switch language to ${lang === 'en' ? 'Kannada' : 'English'}`}
        >
          {lang === 'en' ? 'EN' : 'ಕನ್ನಡ'}
        </button>

        <div className="w-px h-4 mx-0.5 bg-border" />

        <HeaderButton icon={MessageSquarePlus} label="New chat" onClick={onNewChat} />
        <HeaderButton icon={Trash2} label="Clear conversation" onClick={onClear} />
        <HeaderButton icon={Minus} label="Minimize" onClick={onMinimize} />
        <HeaderButton
          icon={isMaximized ? Minimize2 : Maximize2}
          label={isMaximized ? 'Restore' : 'Maximize'}
          onClick={onMaximize}
        />
        <button
          onClick={onClose}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-destructive"
          aria-label="Close AI Assistant"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function HeaderButton({ icon: Icon, label, onClick }: {
  icon: LucideIcon;
  label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={label}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAT CONTEXT BAR
// ═══════════════════════════════════════════════════════════════════════════
function ChatContextBar({ lang }: { lang: Language }) {
  return (    <div className="text-12px px-4 py-1.5 shrink-0 font-mono truncate text-muted-foreground border-b border-border">
      {COPILOT_TEXT[lang].analysing}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE AREA
// ═══════════════════════════════════════════════════════════════════════════
function MessageArea({ messages, isLoading, error, suggestions, lang, roleWelcome, input, onSendMessage }: {
  messages: Message[]; isLoading: boolean; error: string | null;
  suggestions: string[]; lang: Language;
  roleWelcome?: { title: string; subtext: string };
  input: string; onSendMessage: (text: string) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div
      className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}
    >
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-primary-10"
          >
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <p className="text-16px font-semibold text-foreground mb-1">
            {roleWelcome?.title}
          </p>
          <p className="text-13.3333px text-muted-foreground">
            {roleWelcome?.subtext}
          </p>
          <div className="mt-5 w-full max-w-sm">
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
        <ErrorBanner message={error} onRetry={() => onSendMessage(input)} />
      )}

      {messages.length > 0 && !isLoading && (
        <div className="pt-2">
          <CopilotSuggestions suggestions={suggestions} lang={lang} onSelect={onSendMessage} />
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

// ── Error banner ───────────────────────────────────────────────────────────
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const friendlyMsg =
    message.includes('timeout') || message.includes('network') || message.includes('fetch')
      ? 'Network timeout. Check your connection and try again.'
      : message.includes('401') || message.includes('403') || message.includes('Authentication')
      ? 'Your session may have expired. Try refreshing the page.'
      : message.includes('500') || message.includes('server')
      ? 'Server error. Please try again in a moment.'
      : `AI service unavailable: ${message}.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-3.5 py-3 rounded-xl text-13.3333px bg-destructive-8 border border-destructive-20"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-destructive-15">
          <X className="w-3 h-3 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-14px text-destructive">Unable to reach AI service</p>
          <p className="mt-0.5 text-12px text-destructive">{friendlyMsg}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            className="mt-2 text-12px font-medium inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors bg-destructive-12 text-destructive border border-destructive-20 hover:bg-destructive-20"
          >
            <Send className="w-3 h-3" />
            Try again
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT AREA
// ═══════════════════════════════════════════════════════════════════════════
function InputArea({ value, onChange, onSend, disabled, lang }: {
  value: string; onChange: (v: string) => void;
  onSend: (text: string) => void; disabled?: boolean; lang: Language;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const t = COPILOT_TEXT[lang];

  useEffect(() => {
    const handler = () => inputRef.current?.focus();
    window.addEventListener('copilot-focus-input', handler);
    return () => window.removeEventListener('copilot-focus-input', handler);
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSend(value.trim());
    }
  };

  return (
    <div
      className="shrink-0 px-3 py-2.5 border-t border-border"
    >
      <div
        className="flex items-end gap-2 rounded-xl transition-all duration-200"
        style={{
          background: isFocused ? 'var(--card)' : 'var(--background)',
          border: `1px solid ${isFocused ? 'var(--ring)' : 'var(--input)'}`,
          padding: '4px 4px 4px 12px',
        }}
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={t.placeholder}
          rows={1}
          className="flex-1 bg-transparent text-14px text-foreground placeholder:text-muted-foreground resize-none outline-none py-2 leading-relaxed"
          style={{ scrollbarWidth: 'thin', maxHeight: 120 }}
          disabled={disabled}
          aria-label="AI chat input"
        />
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => { if (value.trim() && !disabled) onSend(value.trim()); }}
            disabled={!value.trim() || disabled}
            className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${
              value.trim() ? 'bg-primary text-primary-foreground hover:bg-primary-80' : 'text-muted-foreground bg-transparent'
            }`}
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-10px text-center mt-1.5 font-mono text-muted-foreground">
        Shift+Enter for new line · Esc to close
      </p>
    </div>
  );
}
