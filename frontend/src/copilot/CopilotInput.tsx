import { useRef, useEffect, useState } from 'react';
import { Mic, Send } from 'lucide-react';
import { useVoiceInput } from './hooks/useVoiceInput';

interface CopilotInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
  lang: 'en' | 'kn';
}

export default function CopilotInput({ value, onChange, onSend, disabled, lang }: CopilotInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: voiceSupported,
  } = useVoiceInput({
    lang: lang === 'kn' ? 'kn-IN' : 'en-IN',
    onResult: (finalText) => {
      onChange(finalText);
      // Auto-submit after 600ms pause
      setTimeout(() => {
        if (finalText.trim()) onSend(finalText.trim());
      }, 600);
    },
  });

  // Focus input when copilot opens
  useEffect(() => {
    const handler = () => inputRef.current?.focus();
    window.addEventListener('copilot-focus-input', handler);
    return () => window.removeEventListener('copilot-focus-input', handler);
  }, []);

  useEffect(() => {
    if (!isListening) return;
    onChange(transcript);
  }, [transcript, isListening, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSend(value.trim());
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-border-primary">
      {/* Microphone button */}
      {voiceSupported && (
        <button
          onClick={isListening ? stopListening : startListening}
          className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
            isListening ? 'bg-signal-amber/15 text-signal-amber' : 'text-text-tertiary hover:bg-hover-bg'
          }`}
          title={isListening ? 'Stop listening' : 'Voice input'}
        >
          {isListening ? <Mic className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
        </button>
      )}

      {/* Text input */}
      <div
        className={`flex-1 relative rounded-lg transition-all duration-200 ${
          isFocused ? 'border-signal-amber/50' : 'border-border-primary'
        }`}
        style={{
          background: isFocused ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
          border: `1px solid ${isFocused ? 'var(--color-signal-amber)' : 'var(--border-primary)'}`,
        }}
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={lang === 'kn' ? 'ಎಫ್ಐಆರ್, ಜಿಲ್ಲೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ...' : 'Ask about FIRs, districts, patterns...'}
          rows={1}
          className="w-full bg-transparent text-[14px] text-text-primary placeholder-text-tertiary resize-none outline-none px-3 py-2.5 font-sans"
          style={{ scrollbarWidth: 'thin' }}
          disabled={disabled}
        />
      </div>

      {/* Send button */}
      <button
        onClick={() => {
          if (value.trim()) onSend(value.trim());
        }}
        disabled={!value.trim() || disabled}
        className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
          value.trim() && !disabled ? 'bg-signal-amber/15 text-signal-amber hover:bg-signal-amber/25' : 'text-text-tertiary'
        } disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
