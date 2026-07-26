import { useState } from 'react';
import { X, Send } from 'lucide-react';
import type { Hotspot } from '@/types/geo';

interface NotifyOfficerModalProps {
  hotspot: Hotspot;
  onClose: () => void;
}

export function NotifyOfficerModal({ hotspot, onClose }: NotifyOfficerModalProps) {
  const [message, setMessage] = useState(
    `Attention: elevated crime hotspot detected near ${hotspot.lat.toFixed(4)}, ${hotspot.lng.toFixed(
      4
    )} (${hotspot.crime_category}, risk ${hotspot.risk_score}). Please review and deploy patrol.`
  );
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    setSent(true);
    window.setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-bg-card rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
          <h3 className="text-base font-semibold text-text-primary">Notify Officer</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-hover-bg">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-text-tertiary">
            Dispatch an alert to the responsible officer for this hotspot.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,212,255,0.4)]"
          />
          {sent && (
            <p className="text-xs" style={{ color: 'var(--alert-green)' }}>Notification dispatched to on-duty officers.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border-primary bg-bg-tertiary rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-hover-bg rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sent}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[rgba(0,212,255,0.15)] text-white rounded-lg hover:bg-[rgba(0,212,255,0.25)] disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" /> {sent ? 'Sent' : 'Send Notification'}
          </button>
        </div>
      </div>
    </div>
  );
}
