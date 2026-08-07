import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCopilotStore } from '@/store';
import type { Intent } from '@/store';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';
import { Bot, MessageSquare, Brain, MapPin, UserCheck, AlertTriangle, Archive } from 'lucide-react';

interface IntentIconProps {
  intent: Intent;
  className?: string;
}

function IntentIcon({ intent, className = "w-4 h-4" }: IntentIconProps) {
  const intentConfig = {
    ['risk_score_denied']: { icon: AlertTriangle, color: "text-destructive" },
    ['crime_trends']: { icon: Archive, color: "text-primary" },
    ['hotspot']: { icon: MapPin, color: "text-success" },
    ['suspect_lookup']: { icon: UserCheck, color: "text-brand-300" },
    ['victim_stats']: { icon: MessageSquare, color: "text-warning" },
    ['station_performance']: { icon: Bot, color: "text-brand-400" },
    ['officer_assignment']: { icon: Brain, color: "text-brand-500" },
    ['general_query']: { icon: Brain, color: "text-muted-foreground" },
  };

  const config = intentConfig[intent] || intentConfig['general_query'];
  const Icon = config.icon;

  return <Icon className={`${className} ${config.color}`} />;
}

export function CopilotPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preloadedQuery = searchParams.get('query');

  const jurisdiction = useJurisdiction();
  const {
    currentSession,
    sessions,
    messages,
    isLoading,
    error,
    selectedIntent,
    intentConfidence,
    sendMessage,
    fetchSession,
    fetchSessions,
    clearMessages,
    setSelectedIntent,
    setIntentConfidence,
  } = useCopilotStore();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize on component mount
  useEffect(() => {
    fetchSessions();

    // If there's a preloaded query from URL params, use it
    if (preloadedQuery && !messages.length) {
      setTimeout(() => {
        sendMessage(preloadedQuery);
      }, 100);
    }
  }, [fetchSessions, preloadedQuery, messages.length, sendMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    try {
      await sendMessage(inputValue.trim(), currentSession?.session_id);
      setInputValue('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleNewChat = () => {
    clearMessages();
    setSelectedIntent(null);
    setIntentConfidence(0);
  };

  const handleSessionSelect = async (sessionId: string) => {
    try {
      await fetchSession(sessionId);
      navigate('/pi/copilot', { replace: true }); // Clean URL
    } catch (err) {
      console.error('Failed to fetch session:', err);
    }
  };

  const getIntentColor = (intent: Intent | null) => {
    if (!intent) return 'text-muted-foreground';

    const colors = {
      ['risk_score_denied']: 'text-destructive',
      ['crime_trends']: 'text-primary',
      ['hotspot']: 'text-success',
      ['suspect_lookup']: 'text-brand-300',
      ['victim_stats']: 'text-warning',
      ['station_performance']: 'text-brand-400',
      ['officer_assignment']: 'text-brand-500',
      ['general_query']: 'text-muted-foreground',
    };

    return colors[intent] || 'text-muted-foreground';
  };

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(0)}%`;
  };

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Left Sidebar - Sessions */}
      <div className="w-80 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-18px font-semibold text-foreground">Conversations</h2>
            <button
              onClick={handleNewChat}
              className="p-2 rounded-lg bg-primary-10 text-primary hover:bg-primary-20 transition-colors"
              title="New conversation"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
          <JurisdictionBanner scope={jurisdiction} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.session_id}
              onClick={() => handleSessionSelect(session.session_id)}
              className={`p-3 border-b border-border cursor-pointer hover:bg-muted transition-colors           ${currentSession?.session_id === session.session_id ? 'bg-primary-10 border-primary-30' : ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-3 h-3 text-primary" />
                  <span className="text-14px font-medium text-foreground truncate max-w-[160px]">
                    {session.title || `Conversation ${new Date(session.created_at).toLocaleDateString()}`}
                  </span>
                </div>
                <span className="text-12px text-muted-foreground">
                  {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-12px text-muted-foreground">
                <Archive className="w-3 h-3" />
                <span>{session.message_count} messages</span>
              </div>
              {session.session_type && (
                <div className="mt-2">
                  <span className="px-2 py-0.5 rounded-full text-12px bg-muted text-muted-foreground">
                    {session.session_type}
                  </span>
                </div>
              )}
            </div>
          ))}

          {sessions.length === 0 && !isLoading && (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-14px">No conversations yet</p>
              <p className="text-12px mt-1">Start a new chat to begin</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-20px font-semibold text-foreground">Drishti Copilot</h1>
                <p className="text-14px text-muted-foreground">AI-powered investigation assistant</p>
              </div>
            </div>

            {selectedIntent && (
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-muted border ${getIntentColor(selectedIntent)}`}>
                  <IntentIcon intent={selectedIntent} className="w-3 h-3" />
                  <span className="text-12px font-medium capitalize">
                    {selectedIntent.replace('_', ' ')}
                  </span>
                  <span className="text-12px text-muted-foreground">
                    {formatConfidence(intentConfidence)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <JurisdictionBanner scope={jurisdiction} />
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive-10 border border-destructive-20 text-destructive text-14px">
              {error}
            </div>
          )}

          {messages.length === 0 && !isLoading && !preloadedQuery && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-full bg-primary-10 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-24px font-semibold text-foreground mb-2">Welcome to Drishti Copilot</h2>
              <p className="text-muted-foreground mb-6 max-w-md text-14px">
                I can help you analyze crime trends, identify suspects, and explore station performance.
                Ask me anything about your investigations.
              </p>

              {preloadedQuery && (
                <div className="mb-4 p-3 rounded-lg bg-primary-10 border border-primary-30 max-w-md">
                  <p className="text-14px text-primary">Pre-loaded query: "{preloadedQuery}"</p>
                </div>
              )}
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] ${message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-4'
                    : 'bg-card border border-border rounded-2xl rounded-tl-sm p-4'
                  }`
                }
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                    <IntentIcon intent={message.intent as Intent || 'general_query'} className="w-3 h-3" />
                    <span className="text-12px font-medium text-muted-foreground capitalize">
                      {message.intent ? message.intent.replace('_', ' ') : 'General Response'}
                    </span>
                  </div>
                )}

                <div className="text-14px whitespace-pre-wrap break-words text-foreground">
                  {message.content}
                </div>

                <div className="text-12px mt-2 opacity-70 text-muted-foreground">
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="mb-4 flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-card">
          <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto">
            <button
              type="button"
              onClick={handleNewChat}
              className="p-3 rounded-xl bg-background border border-border text-muted-foreground hover:text-primary hover:border-primary-30 transition-colors"
              title="New chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about crime trends, suspects, or station performance..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary-50 focus:bg-card resize-none min-h-[48px] max-h-32 text-14px"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary-80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-14px"
            >
              Send
            </button>
          </form>

          <div className="text-12px text-muted-foreground text-center mt-2">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>

      {/* Right Sidebar - Session Info */}
      <div className="w-80 border-l border-border flex flex-col bg-card overflow-hidden">
        {currentSession ? (
          <>
            <div className="p-4 border-b border-border">
              <h3 className="text-18px font-semibold text-foreground mb-2">Session Details</h3>
              <div className="space-y-2 text-14px">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session ID:</span>
                  <span className="font-mono text-12px text-foreground">
                    {currentSession.session_id.substring(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="text-foreground">{currentSession.session_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Messages:</span>
                  <span className="text-foreground">{currentSession.message_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="text-foreground">
                    {new Date(currentSession.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4">
              <h4 className="text-16px font-semibold text-foreground mb-3">Intent Analysis</h4>

              {selectedIntent ? (
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 p-3 rounded-lg border ${getIntentColor(selectedIntent)} bg-background`}>
                    <IntentIcon intent={selectedIntent} className="w-4 h-4" />
                    <span className="font-medium capitalize text-14px text-foreground">
                      {selectedIntent.replace('_', ' ')}
                    </span>
                    <span className="text-12px text-muted-foreground ml-auto">
                      {formatConfidence(intentConfidence)}
                    </span>
                  </div>

                  <div className="space-y-2 text-12px">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className="text-foreground">{formatConfidence(intentConfidence)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tier:</span>
                      <span className="text-foreground">-</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-14px">No intent detected yet</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border">
              <h4 className="text-16px font-semibold text-foreground mb-3">Session Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={handleNewChat}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-muted-foreground hover:bg-muted hover:text-primary transition-colors text-14px"
                >
                  New Conversation
                </button>
                <button
                  onClick={() => currentSession && console.log('Export session:', currentSession.session_id)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-muted-foreground hover:bg-muted transition-colors text-14px"
                >
                  Export Transcript
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground text-14px">Select a session or start a new chat</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
