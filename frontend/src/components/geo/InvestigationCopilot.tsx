import { useState, useRef, useEffect } from 'react';
import type { Hotspot } from '@/types/geo';

interface CopilotProps {
  hotspot: Hotspot;
  onClose: () => void;
}

interface Message {
  role: 'assistant' | 'user';
  text: string;
}

function generateInitialMessage(hotspot: Hotspot): string {
  return `I've analyzed the ${hotspot.crime_category} hotspot at (${hotspot.lat.toFixed(4)}, ${hotspot.lng.toFixed(4)}) with a risk score of ${hotspot.risk_score}. This is a ${hotspot.hotspot_type} hotspot with ${hotspot.fir_count} supporting FIRs. How can I help with the investigation?`;
}

function generateResponse(userMessage: string, hotspot: Hotspot): string {
  const lower = userMessage.toLowerCase();
  if (lower.includes('pattern') || lower.includes('trend') || lower.includes('time')) {
    const timePatterns: Record<string, string> = {
      theft: 'Theft cases at this hotspot peak between 20:00 and 02:00, with a 34% increase over the last 14 days.',
      assault: 'Assault cases are most frequent between 22:00 and 01:00, particularly on weekends.',
      murder: 'Homicide cases show no strong temporal pattern but are often preceded by domestic disturbance calls.',
      robbery: 'Robbery incidents concentrate around ATM locations and occur most frequently between 21:00 and 04:00.',
    };
    return timePatterns[hotspot.crime_category] || 'Cases at this location show a moderate clustering in evening hours (18:00-22:00). Would you like me to generate a detailed time-series analysis?';
  }
  if (lower.includes('suspect') || lower.includes('person') || lower.includes('description')) {
    return 'Based on witness reports from FIRs in this area, descriptions are being cross-referenced with the criminal database. I can flag common modus operandi patterns if you\'d like to narrow down the suspect pool.';
  }
  if (lower.includes('evidence') || lower.includes('forensic') || lower.includes('scene')) {
    return 'Forensic leads from nearby FIRs include: (1) CCTV footage requested from 3 establishments within 200m, (2) Fingerprint analysis pending for 2 cases, (3) Mobile tower dump data available for the time window. Would you like me to prioritize any of these?';
  }
  if (lower.includes('prevent') || lower.includes('patrol') || lower.includes('deploy')) {
    return `Given the risk score of ${hotspot.risk_score}, I recommend proactive patrol deployment. Suggest deploying ${hotspot.risk_score >= 80 ? '3-4' : '2'} officers to this area during peak hours. Shall I draft a patrol order?`;
  }
  return `I've noted your query about "${userMessage}". I can help with: pattern analysis, suspect profiling, evidence tracking, patrol planning, or generating a case brief. What specific aspect would you like to explore?`;
}

export function InvestigationCopilot({ hotspot, onClose }: CopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: generateInitialMessage(hotspot) },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant' as const, text: generateResponse(trimmed, hotspot) },
      ]);
    }, 400);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-bg-card rounded-xl shadow-2xl border border-border-primary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">&#x1F916;</span>
          <div>
            <p className="text-xs font-semibold">Investigation Copilot</p>
            <p className="text-[10px]" style={{ color: 'var(--accent-cyan)' }}>{hotspot.crime_category} hotspot</p>
          </div>
        </div>
        <button onClick={onClose} className="text-sm hover:text-[var(--text-primary)]" style={{ color: 'var(--accent-cyan)' }}>&times;</button>
      </div>

      {/* Messages */}
      <div className="h-72 overflow-y-auto px-4 py-3 space-y-3 bg-bg-tertiary">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[rgba(0,212,255,0.15)] text-[var(--text-primary)] rounded-br-sm'
                  : 'bg-bg-card text-text-primary border border-border-primary rounded-bl-sm shadow-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border-primary px-3 py-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about patterns, suspects, evidence..."
          className="flex-1 text-xs border border-border-primary rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--accent-cyan)]"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="text-xs px-3 py-2 bg-[rgba(0,212,255,0.15)] hover:bg-[rgba(0,212,255,0.25)] text-white rounded-lg disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
