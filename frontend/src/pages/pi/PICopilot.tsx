import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Bot, Search } from 'lucide-react';
import { authHeaders } from '@/utils/authHeaders';
import { Markdown } from '@/components/AI/Markdown';

interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  confidence?: number;
  requires_review?: boolean;
  mode?: string;
}

export function PICopilot() {
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('query') ?? ''

  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [input, setInput] = useState(initialQuery)
  const [mode, setMode] = useState<string>('fir_search')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const QUERY_MODES = [
    { id: 'fir_search', label: 'FIR Search' },
    { id: 'case_analysis', label: 'Case Analysis' },
    { id: 'pattern_query', label: 'Pattern Query' },
    { id: 'legal_reference', label: 'Legal Reference' },
    { id: 'statistical', label: 'Statistical' },
    { id: 'emergency', label: '🚨 Emergency' },
  ]

  const QUICK_PROMPTS = [
    `Show repeat offenders at ${user?.station_name ?? 'this station'}`,
    'FIRs filed this week',
    'Highest risk accused in my station',
    'Pending cases older than 30 days',
    'Most common crime type this month',
    'Co-accused network for recent theft cases',
  ]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (initialQuery) handleSend(initialQuery)
  }, [])

  const handleSend = async (queryOverride?: string) => {
    const query = queryOverride ?? input.trim()
    if (!query || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: query }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          mode,
          station_id: user?.station_id,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        sources: data.sources ?? [],
        confidence: data.confidence,
        requires_review: data.requires_review,
        mode: data.mode,
      }])
    } catch (e) {
      console.warn('[PICopilot] API error:', e);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden p-6 gap-4">
      {/* Left sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-4">
        {/* Mode selector */}
        <div className="rounded-xl border border-border-primary bg-bg-card p-3">
          <p className="text-[10px] text-text-tertiary uppercase tracking-widest mb-2">Query Mode</p>
          <div className="space-y-1">
            {QUERY_MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  mode === m.id
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-hover-bg'
                }`}>{m.label}</button>
            ))}
          </div>
        </div>

        {/* Quick prompts */}
        <div className="rounded-xl border border-border-primary bg-bg-card p-3 flex-1 overflow-y-auto">
          <p className="text-[10px] text-text-tertiary uppercase tracking-widest mb-2">Quick Prompts</p>
          <div className="space-y-1.5">
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => setInput(p)}
                className="w-full text-left text-[10px] px-2.5 py-2 rounded-lg
                           border border-border-secondary text-text-tertiary hover:text-text-secondary
                           hover:border-cyan-500/20 hover:bg-cyan-500/5 transition-all">
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* New chat */}
        <button onClick={() => setMessages([])}
          className="text-xs px-3 py-2 rounded-xl border border-border-primary
                     text-text-tertiary hover:border-cyan-500/30 hover:text-cyan-400
                     transition-colors">
          + New Chat
        </button>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col rounded-xl border border-border-primary
                      bg-bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            <h1 className="text-sm font-medium text-cyan-400">AI Investigation Copilot</h1>
          </div>
          <span className="text-[10px] text-text-tertiary">
            {user?.station_name} · Station-scoped
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <Search className="w-10 h-10 opacity-20" />
              <p className="text-sm text-text-tertiary">
                Ask me about FIRs, suspects, crime patterns, or legal sections
              </p>
              <p className="text-xs text-white/20">
                All queries are scoped to {user?.station_name}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cyan-500/20 text-cyan-100 rounded-tr-sm'
                    : 'bg-bg-card text-text-primary rounded-tl-sm'
                }`}>
                  <Markdown content={msg.content} />
                </div>

                {/* Evidence trail (AI responses only) */}
                {msg.role === 'assistant' && (
                  <div className="mt-2 space-y-1.5">
                    {msg.requires_review && (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-400/70">
                        <span>⚠</span>
                        <span>AI-assisted — verify with case records</span>
                      </div>
                    )}
                    {msg.confidence && (
                      <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                        <span>Confidence: {Math.round(msg.confidence * 100)}%</span>
                        {msg.mode && <span>· Mode: {msg.mode}</span>}
                      </div>
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <details className="text-[10px] text-text-tertiary">
                        <summary className="cursor-pointer hover:text-text-secondary">
                          {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''} used
                        </summary>
                        <div className="mt-1 pl-2 space-y-0.5">
                          {msg.sources.slice(0, 3).map((s: any, si: number) => (
                            <p key={si} className="text-[9px]">{s.crime_no ?? s.id ?? s}</p>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[75%]">
                <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed bg-bg-card text-text-primary rounded-tl-sm">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="px-4 py-3 border-t border-border-primary">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask about cases, suspects, patterns, legal sections... (Enter to send)"
              rows={2}
              className="flex-1 text-sm bg-bg-card border border-border-primary rounded-xl
                         px-4 py-2.5 text-text-primary placeholder-white/20
                         focus:outline-none focus:border-cyan-500/40 resize-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300
                         border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium">
              Send
            </button>
          </div>
          <p className="text-[9px] text-white/20 mt-1.5 text-center">
            Shift+Enter for new line · All queries logged in audit trail
          </p>
        </div>
      </div>
    </div>
  )
}
