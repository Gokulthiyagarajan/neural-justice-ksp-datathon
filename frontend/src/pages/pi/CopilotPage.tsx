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
     ['risk_score_denied']: { icon: AlertTriangle, color: "text-red-400" },
    ['crime_trends']: { icon: Archive, color: "text-blue-400" },
    ['hotspot']: { icon: MapPin, color: "text-green-400" },
    ['suspect_lookup']: { icon: UserCheck, color: "text-purple-400" },
    ['victim_stats']: { icon: MessageSquare, color: "text-orange-400" },
    ['station_performance']: { icon: Bot, color: "text-cyan-400" },
    ['officer_assignment']: { icon: Brain, color: "text-yellow-400" },
    ['general_query']: { icon: Brain, color: "text-gray-400" },
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
    if (!intent) return 'text-text-tertiary';

    const colors = {
      ['risk_score_denied']: 'text-red-400',
      ['crime_trends']: 'text-blue-400',
      ['hotspot']: 'text-green-400',
      ['suspect_lookup']: 'text-purple-400',
      ['victim_stats']: 'text-orange-400',
      ['station_performance']: 'text-cyan-400',
      ['officer_assignment']: 'text-yellow-400',
      ['general_query']: 'text-gray-400',
    };

    return colors[intent] || 'text-text-tertiary';
  };

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(0)}%`;
  };

  return (
    <div className="flex h-full overflow-hidden bg-bg-primary">
      {/* Left Sidebar - Sessions */}
      <div className="w-80 border-r border-border-primary flex flex-col bg-bg-secondary">
        <div className="p-4 border-b border-border-primary">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-text-primary">Conversations</h2>
            <button
              onClick={handleNewChat}
              className="p-2 rounded-lg bg-signal-amber/10 text-signal-amber hover:bg-signal-amber/20 transition-colors"
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
              className={`p-3 border-b border-border-primary cursor-pointer hover:bg-hover-bg transition-colors ${currentSession?.session_id === session.session_id ? 'bg-signal-amber/10 border-signal-amber/30' : ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-3 h-3 text-signal-amber" />
                  <span className="text-sm font-medium text-text-primary truncate max-w-[160px]">
                    {session.title || `Conversation ${new Date(session.created_at).toLocaleDateString()}`}
                  </span>
                </div>
                <span className="text-xs text-text-tertiary">
                  {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <Archive className="w-3 h-3" />
                <span>{session.message_count} messages</span>
              </div>
              {session.session_type && (
                <div className="mt-2">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-bg-primary text-text-tertiary">
                    {session.session_type}
                  </span>
                </div>
              )}
            </div>
          ))}

          {sessions.length === 0 && !isLoading && (
            <div className="p-8 text-center text-text-tertiary">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-text-tertiary/50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border-primary bg-bg-secondary">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-signal-amber/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-signal-amber" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-text-primary">Drishti Copilot</h1>
                <p className="text-sm text-text-tertiary">AI-powered investigation assistant</p>
              </div>
            </div>

            {selectedIntent && (
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-bg-primary border ${getIntentColor(selectedIntent)}`}>
                  <IntentIcon intent={selectedIntent} className="w-3 h-3" />
                  <span className="text-xs font-medium capitalize">
                    {selectedIntent.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-text-tertiary">
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
            <div className="mb-4 p-3 rounded-lg bg-alert-red/10 border border-alert-red/20 text-alert-red text-sm">
              {error}
            </div>
          )}

          {messages.length === 0 && !isLoading && !preloadedQuery && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-full bg-signal-amber/10 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-signal-amber" />
              </div>
              <h2 className="text-2xl font-semibold text-text-primary mb-2">Welcome to Drishti Copilot</h2>
              <p className="text-text-secondary mb-6 max-w-md">
                I can help you analyze crime trends, identify suspects, and explore station performance.
                Ask me anything about your investigations.
              </p>

              {preloadedQuery && (
                <div className="mb-4 p-3 rounded-lg bg-signal-amber/10 border border-signal-amber/30 max-w-md">
                  <p className="text-sm text-signal-amber">Pre-loaded query: "{preloadedQuery}"</p>
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
                    ? 'bg-signal-amber text-white rounded-2xl rounded-tr-sm p-4'
                    : 'bg-bg-secondary border border-border-primary rounded-2xl rounded-tl-sm p-4'
                  }`
                }
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border-primary/50">
                    <IntentIcon intent={message.intent as Intent || 'general_query'} className="w-3 h-3" />
                    <span className="text-xs font-medium text-text-tertiary capitalize">
                      {message.intent ? message.intent.replace('_', ' ') : 'General Response'}
                    </span>
                  </div>
                )}

                <div className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </div>

                <div className="text-xs mt-2 opacity-70">
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="mb-4 flex justify-start">
              <div className="bg-bg-secondary border border-border-primary rounded-2xl rounded-tl-sm p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-signal-amber animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-signal-amber animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-signal-amber animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border-primary bg-bg-secondary">
          <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto">
            <button
              type="button"
              onClick={handleNewChat}
              className="p-3 rounded-xl bg-bg-primary border border-border-primary text-text-tertiary hover:text-signal-amber hover:border-signal-amber/30 transition-colors"
              title="New chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about crime trends, suspects, or station performance..."
                className="w-full px-4 py-3 rounded-xl border border-border-primary bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:border-signal-amber/50 focus:bg-bg-secondary resize-none min-h-[48px] max-h-32"
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
              className="px-6 py-3 rounded-xl bg-signal-amber text-white font-medium hover:bg-signal-amber/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </form>

          <div className="text-xs text-text-tertiary text-center mt-2">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>

      {/* Right Sidebar - Session Info */}
      <div className="w-80 border-l border-border-primary flex flex-col bg-bg-secondary overflow-hidden">
        {currentSession ? (
          <>
            <div className="p-4 border-b border-border-primary">
              <h3 className="text-lg font-semibold text-text-primary mb-2">Session Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Session ID:</span>
                  <span className="font-mono text-xs text-text-primary">
                    {currentSession.session_id.substring(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Type:</span>
                  <span className="text-text-primary">{currentSession.session_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Messages:</span>
                  <span className="text-text-primary">{currentSession.message_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Created:</span>
                  <span className="text-text-primary">
                    {new Date(currentSession.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4">
              <h4 className="text-md font-semibold text-text-primary mb-3">Intent Analysis</h4>

              {selectedIntent ? (
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 p-3 rounded-lg border ${getIntentColor(selectedIntent)} bg-bg-primary`}>
                    <IntentIcon intent={selectedIntent} className="w-4 h-4" />
                    <span className="font-medium capitalize text-sm">
                      {selectedIntent.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-text-tertiary ml-auto">
                      {formatConfidence(intentConfidence)}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Confidence:</span>
                      <span className="text-text-primary">{formatConfidence(intentConfidence)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Tier:</span>
                      <span className="text-text-primary">-</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-text-tertiary">
                  <Brain className="w-8 h-8 mx-auto mb-2 text-text-tertiary/50" />
                  <p className="text-sm">No intent detected yet</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border-primary">
              <h4 className="text-md font-semibold text-text-primary mb-3">Session Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={handleNewChat}
                  className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border-primary text-text-secondary hover:bg-hover-bg hover:text-signal-amber transition-colors text-sm"
                >
                  New Conversation
                </button>
                <button
                  onClick={() => currentSession && console.log('Export session:', currentSession.session_id)}
                  className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border-primary text-text-secondary hover:bg-hover-bg transition-colors text-sm"
                >
                  Export Transcript
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Brain className="w-12 h-12 mx-auto mb-3 text-text-tertiary/50" />
              <p className="text-text-tertiary">Select a session or start a new chat</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
