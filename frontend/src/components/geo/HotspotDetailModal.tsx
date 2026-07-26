import { X, Navigation, FileText, MapPin } from 'lucide-react';
import type { Hotspot } from '@/types/geo';

interface HotspotDetailModalProps {
  hotspot: Hotspot | null;
  onClose: () => void;
  onNavigate: (hotspot: Hotspot) => void;
  onGenerateReport: (hotspot: Hotspot) => void;
}

function riskColor(score: number): string {
  if (score < 40) return 'var(--alert-green)';
  if (score < 60) return 'var(--alert-amber)';
  if (score < 80) return 'var(--alert-amber)';
  return 'var(--alert-red)';
}

export function HotspotDetailModal({ hotspot, onClose, onNavigate, onGenerateReport }: HotspotDetailModalProps) {
  if (!hotspot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-bg-card rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" style={{ color: 'var(--alert-red)' }} />
            <h3 className="text-base font-semibold text-text-primary">Hotspot Detail</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-hover-bg">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-bg-tertiary rounded-lg p-2.5">
              <span className="text-text-tertiary block mb-0.5">Crime Category</span>
              <span className="font-medium text-text-primary">{hotspot.crime_category}</span>
            </div>
            <div className="bg-bg-tertiary rounded-lg p-2.5">
              <span className="text-text-tertiary block mb-0.5">FIR Count</span>
              <span className="font-medium text-text-primary">{hotspot.fir_count}</span>
            </div>
            <div className="bg-bg-tertiary rounded-lg p-2.5">
              <span className="text-text-tertiary block mb-0.5">Risk Score</span>
              <span className="font-medium" style={{ color: riskColor(hotspot.risk_score) }}>
                {hotspot.risk_score}
              </span>
            </div>
            <div className="bg-bg-tertiary rounded-lg p-2.5">
              <span className="text-text-tertiary block mb-0.5">Confidence</span>
              <span className="font-medium text-text-primary">{hotspot.confidence}%</span>
            </div>
          </div>

          <div className="bg-bg-tertiary rounded-lg p-2.5 text-center">
            <p className="text-xs text-text-tertiary font-mono">
              {hotspot.lat.toFixed(6)}, {hotspot.lng.toFixed(6)}
            </p>
          </div>

          {hotspot.ai_explanation && (
            <div className="border rounded-lg p-3" style={{ background: 'rgba(0, 212, 255, 0.05)', borderColor: 'rgba(0, 212, 255, 0.15)' }}>
              <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--accent-cyan)' }}>
                AI Explanation
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>{hotspot.ai_explanation}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-t border-border-primary bg-bg-tertiary rounded-b-xl">
          <button
            onClick={() => onNavigate(hotspot)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[rgba(0,212,255,0.15)] text-white rounded-lg hover:bg-[rgba(0,212,255,0.25)]"
          >
            <Navigation className="w-3.5 h-3.5" /> Navigate
          </button>
          <button
            onClick={() => onGenerateReport(hotspot)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-bg-tertiary text-text-primary rounded-lg hover:bg-hover-bg"
          >
            <FileText className="w-3.5 h-3.5" /> Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}
