import { useState } from 'react';
import type { Alert } from '@/types/EarlyWarning';

interface SmartAlertCardProps {
  alert: Alert;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onDispatch: (alert: Alert) => void;
  onViewMap: (alert: Alert) => void;
  onViewInvestigation: (alert: Alert) => void;
}

const SEVERITY_STYLES: Record<string, { border: string; badge: string; bg: string }> = {
  Critical: { border: 'border-[var(--alert-red)]', badge: 'bg-[var(--alert-red)] text-white', bg: 'bg-[rgba(255,51,102,0.1)]' },
  High: { border: 'border-[var(--alert-amber)]', badge: 'bg-[var(--alert-amber)] text-white', bg: 'bg-[rgba(245,158,11,0.1)]' },
  Medium: { border: 'border-[var(--alert-amber)]', badge: 'bg-[var(--alert-amber)] text-white', bg: 'bg-[rgba(245,158,11,0.1)]' },
  Low: { border: 'border-[var(--accent-cyan)]', badge: 'bg-[rgba(0,212,255,0.15)] text-white', bg: 'bg-[rgba(0,212,255,0.05)]' },
};

export function SmartAlertCard({ alert, onAcknowledge, onResolve, onDispatch, onViewMap, onViewInvestigation }: SmartAlertCardProps) {
  const [expanded, setExpanded] = useState(false);
  const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.Low;

  return (
    <div className={`border-l-4 ${style.border} bg-bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow`}>
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.badge}`}>{alert.severity}</span>
              <span className="text-[10px] text-text-tertiary uppercase">{alert.alert_type.replace(/_/g, ' ')}</span>
              <span className="text-[10px] text-text-tertiary">{alert.prediction_window}</span>
            </div>
            <h3 className="text-sm font-semibold text-text-primary truncate">{alert.title}</h3>
            <p className="text-xs text-text-tertiary mt-0.5">{alert.district_id} {alert.station_id ? `• ${alert.station_id}` : ''}</p>
          </div>
          <span className="text-xs font-mono font-bold text-text-primary ml-2">{Math.round(alert.confidence)}%</span>
        </div>

        <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
          <span>FIRs: {alert.supporting_fir_count}</span>
          <span>Confidence: {Math.round(alert.confidence)}%</span>
          {alert.estimated_response_time_min && <span>Response: ~{Math.round(alert.estimated_response_time_min)}m</span>}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)] mt-1"
        >
          {expanded ? 'Less' : 'More'} details
        </button>

        {expanded && (
          <div className="mt-2 pt-2 border-t border-border-secondary space-y-2">
            {alert.historical_trend && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-tertiary">Trend ({alert.historical_trend.period}):</span>
                <span className={`font-medium ${alert.historical_trend.direction === 'up' ? 'text-[var(--alert-red)]' : alert.historical_trend.direction === 'down' ? 'text-[var(--alert-green)]' : 'text-text-secondary'}`}>
                  {alert.historical_trend.percent_change > 0 ? '+' : ''}{alert.historical_trend.percent_change}% {alert.historical_trend.direction}
                </span>
              </div>
            )}

            <div className="bg-bg-tertiary rounded p-2">
              <p className="text-xs text-text-primary leading-relaxed">{alert.ai_explanation.summary}</p>
              {alert.ai_explanation.supporting_evidence.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {alert.ai_explanation.supporting_evidence.map((ev, i) => (
                    <li key={i} className="text-[10px] text-text-tertiary flex items-start gap-1">
                      <span className="text-text-secondary mt-0.5">•</span> {ev}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {alert.recommended_action && (
              <div className="text-xs text-text-primary">
                <span className="font-medium">Action:</span> {alert.recommended_action}
              </div>
            )}

            {alert.recommended_patrol && (
              <div className="text-xs text-text-primary">
                <span className="font-medium">Patrol:</span> {alert.recommended_patrol}
              </div>
            )}

            {alert.related_criminals.length > 0 && (
              <div className="text-xs">
                <span className="font-medium text-text-primary">Related:</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {alert.related_criminals.map((rc) => (
                    <span key={rc.criminal_id} className="bg-[rgba(139,92,246,0.1)] text-[#8B5CF6] text-[10px] px-1.5 py-0.5 rounded">
                      {rc.name} ({rc.priors} priors)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {alert.related_fir_numbers.length > 0 && (
              <div className="text-xs text-text-tertiary">
                FIRs: {alert.related_fir_numbers.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border-secondary px-3 py-2 flex flex-wrap gap-1.5">
        <button
          onClick={() => onAcknowledge(alert.alert_id)}
          disabled={alert.status !== 'active'}
          className="text-[10px] font-medium px-2.5 py-1 rounded bg-[rgba(0,230,118,0.1)] text-[var(--alert-green)] hover:bg-[rgba(0,230,118,0.2)] disabled:opacity-30 disabled:cursor-not-allowed btn-press-sm"
        >
          Acknowledge
        </button>
        <button
          onClick={() => onResolve(alert.alert_id)}
          disabled={alert.status === 'resolved'}
          className="text-[10px] font-medium px-2.5 py-1 rounded bg-bg-tertiary text-text-primary hover:bg-hover-bg disabled:opacity-30 btn-press-sm"
        >
          Resolve
        </button>
        <button onClick={() => onDispatch(alert)} className="text-[10px] font-medium px-2.5 py-1 rounded bg-[rgba(0,212,255,0.15)] text-white hover:bg-[rgba(0,212,255,0.25)] btn-press-sm">
          Dispatch
        </button>
        <button onClick={() => onViewMap(alert)} className="text-[10px] font-medium px-2.5 py-1 rounded bg-bg-tertiary text-text-primary hover:bg-hover-bg btn-press-sm">
          Map
        </button>
        <button onClick={() => onViewInvestigation(alert)} className="text-[10px] font-medium px-2.5 py-1 rounded bg-bg-tertiary text-text-primary hover:bg-hover-bg btn-press-sm">
          Investigate
        </button>
      </div>
    </div>
  );
}
