import React from 'react';

interface Turn {
  id: string;
  role: 'user' | 'ai';
  text: string;
  language: string;
  timestamp: string;
}

interface Props { turns: Turn[]; }

const ConversationTimeline: React.FC<Props> = ({ turns }) => (
  <div style={{ maxHeight: 400, overflowY: 'auto', padding: '12px 0' }}>
    {turns.length === 0 && (
      <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 40 }}>
        Speak a query to begin your investigation.
      </p>
    )}
    {turns.map((turn) => (
      <div key={turn.id} style={{
        display: 'flex', marginBottom: 12,
        flexDirection: turn.role === 'user' ? 'row-reverse' : 'row',
      }}>
        <div style={{
          maxWidth: '75%', padding: '10px 14px', borderRadius: 12,
          background: turn.role === 'user' ? 'rgba(0, 212, 255, 0.1)' : 'rgba(0, 230, 118, 0.1)',
          border: `1px solid ${turn.role === 'user' ? 'var(--accent-cyan)' : 'var(--alert-green)'}`,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>
            {turn.role === 'user' ? 'Officer' : 'Neural Justice AI'} · {turn.language === 'kn' ? 'ಕನ್ನಡ' : 'English'}
          </div>
          <div style={{ fontSize: 14 }}>{turn.text}</div>
        </div>
      </div>
    ))}
  </div>
);

export default ConversationTimeline;
