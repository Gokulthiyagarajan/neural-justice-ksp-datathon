import { useNavigate } from 'react-router-dom';
import { useAiAssistant } from '@/context/AiAssistantContext';
import { COPILOT_TEXT } from './constants/i18n';

/**
 * Floating AI Assistant shortcut button.
 * Renders a small dock button at the bottom-right that navigates to /ai.
 * The assistant state (messages, history) is shared via AiAssistantContext.
 */
export default function CopilotDock() {
  const navigate = useNavigate();
  const { state, lang } = useAiAssistant();

  const isThinking = state === 'thinking';
  const isSpeaking = state === 'speaking';
  const t = COPILOT_TEXT[lang];

  return (
    <button
      onClick={() => navigate('/')}
      className="fixed z-[9999] flex items-center gap-2.5 transition-all duration-200 cursor-pointer bg-card-95 backdrop-blur-md border border-border hover:border-primary hover:shadow-lg rounded-full"
      style={{
        bottom: 24, right: 24, width: 200, height: 48,
        padding: '0 16px',
      }}
    >
      {/* Status indicator */}
      {isThinking ? (
        <div className="flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      ) : isSpeaking ? (
        <div className="flex items-end gap-[2px] h-4">
          {[8, 12, 6, 14].map((h, i) => (
            <div key={i} className="w-[3px] rounded-full bg-primary animate-pulse"
              style={{ height: h, animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      ) : (
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
        </span>
      )}

      <span className="text-13.3333px font-medium flex-1 text-left text-foreground">
        {isThinking ? t.thinking : isSpeaking ? t.listening : t.dockLabel.split('·').pop()?.trim() || t.askAnything}
      </span>

      <span className="text-12px font-mono px-1.5 py-0.5 rounded text-muted-foreground bg-muted">
        ⌘K
      </span>
    </button>
  );
}
