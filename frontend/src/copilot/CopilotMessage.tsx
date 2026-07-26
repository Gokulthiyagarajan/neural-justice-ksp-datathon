import { Bot, ExternalLink, Download, ArrowRight } from 'lucide-react';
import type { Message } from './types/copilot.types';

interface CopilotMessageProps {
  message: Message;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 85 ? '#10B981' :
    confidence >= 70 ? '#F59E0B' :
    '#EF4444';
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ml-auto"
      style={{
        background: `${color}15`,
        color,
        border: `1px solid ${color}25`,
      }}
    >
      {confidence}% AI
    </span>
  );
}

function CitedCards({ cardIds }: { cardIds: string[] }) {
  return (
    <div className="mt-2 pt-2 border-t border-border-primary">
      <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5 font-mono">
        REFERENCED FROM DASHBOARD
      </p>
      <div className="flex flex-wrap gap-1.5">
        {cardIds.map((id) => (
          <span
            key={id}
            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium font-mono text-text-tertiary bg-bg-tertiary/80"
          >
            {id.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </span>
        ))}
      </div>
    </div>
  );
}

function InlineChart({ data }: { data: any }) {
  const chartColors = data?.colors || ['#F59E0B', '#2B4C7E', '#10B981'];
  const maxVal = Math.max(...(data?.data || [1]), 1);
  const labels = data?.labels || [];
  const values = data?.data || [];

  if (data?.type === 'bar') {
    return (
      <div className="mt-3 mb-2">
        <div className="flex items-end gap-1" style={{ height: 80 }}>
          {values.map((v: number, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm transition-all duration-300"
                style={{
                  height: `${(v / maxVal) * 70}px`,
                  background: chartColors[i % chartColors.length],
                  opacity: 0.8,
                }}
              />
              <span className="text-[9px] text-text-tertiary font-mono truncate w-full text-center">
                {labels[i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data?.type === 'line') {
    const points = values.map((v: number, i: number) => {
      const x = (i / Math.max(values.length - 1, 1)) * 160;
      const y = 70 - (v / maxVal) * 60;
      return `${x},${y}`;
    });
    return (
      <div className="mt-3 mb-2">
        <svg width="100%" height="80" viewBox="0 0 160 80" preserveAspectRatio="none">
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  return null;
}

export default function CopilotMessage({ message }: CopilotMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in motion-reduce:animate-none`}>
      <div
        className="max-w-[85%]"
        style={isUser ? { maxWidth: '80%' } : { maxWidth: '90%' }}
      >
        {/* User bubble */}
        {isUser && (
          <div
            className="px-3.5 py-2.5 rounded-[12px_12px_2px_12px]"
            style={{
              background: 'var(--color-steel)',
            }}
          >
            <p className="text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        {/* Assistant bubble */}
        {!isUser && (
          <div
            className="px-3.5 py-3 rounded-[2px_12px_12px_12px] border-l-[3px_solid_var(--color-signal-amber)]"
            style={{
              background: 'var(--bg-tertiary)',
              borderLeftColor: 'var(--color-signal-amber)',
            }}
          >
            {/* Header row */}
            <div className="flex items-center gap-2 mb-1.5">
              <Bot className="w-4 h-4 text-signal-amber" />
              <span className="text-[13px] font-medium text-text-primary">AI Copilot</span>
              {message.confidence != null && <ConfidenceBadge confidence={message.confidence} />}
            </div>

            {/* Content */}
            {message.streaming ? (
              <div className="flex items-center gap-1 py-2">
                <span className="w-2 h-2 rounded-full bg-signal-amber animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-signal-amber animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-signal-amber animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <p className="text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap">{message.content}</p>
            )}

            {/* Cited cards */}
            {!message.streaming && message.citedCards && message.citedCards.length > 0 && (
              <CitedCards cardIds={message.citedCards} />
            )}

            {/* Inline chart */}
            {!message.streaming && message.chartData && (
              <InlineChart data={message.chartData} />
            )}

            {/* Action buttons */}
            {!message.streaming && message.content && (
              <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-border-primary">
                <button className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-signal-amber transition-colors">
                  <ExternalLink className="w-3 h-3" />
                  View full report →
                </button>
                <button className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-signal-amber transition-colors">
                  <Download className="w-3 h-3" />
                  Export insight
                </button>
                <button className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-signal-amber transition-colors ml-auto">
                  Ask follow-up
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[11px] mt-1 ml-1 font-mono text-text-tertiary">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
