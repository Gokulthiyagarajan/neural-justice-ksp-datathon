import { useState, useEffect } from 'react';
import { getCommandCenter } from '@/api/EarlyWarning';
import type { CommandCenterView, Alert } from '@/types/EarlyWarning';
import { SmartAlertCard } from './SmartAlertCard';

interface CommandCenterProps {
  districtId: string;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onDispatch: (alert: Alert) => void;
  onViewMap: (alert: Alert) => void;
  onViewInvestigation: (alert: Alert) => void;
}

export function CommandCenterDashboard({ districtId, onAcknowledge, onResolve, onDispatch, onViewMap, onViewInvestigation }: CommandCenterProps) {
  const [view, setView] = useState<CommandCenterView | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    getCommandCenter(districtId)
      .then((data) => { setView(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [districtId]);

  if (loading) {
    return <div className="p-4 text-center text-sm text-text-tertiary">Loading command center...</div>;
  }
  if (!view) {
    return <div className="p-4 text-center text-sm text-red-400">Unable to load command center data</div>;
  }

  const filteredAlerts = filter === 'all' ? view.live_alerts : view.live_alerts.filter((a) => a.severity === filter);

  return (
    <div className="space-y-4">
      {/* Top metrics bar */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Critical" value={view.critical_count} color="bg-red-500" />
        <MetricCard label="High" value={view.high_count} color="bg-orange-500" />
        <MetricCard label="Medium" value={view.medium_count} color="bg-yellow-500" />
        <MetricCard label="Low" value={view.low_count} color="bg-blue-500" />
      </div>

      {/* Officer status */}
      {view.officer_status && (
        <div className="flex items-center gap-4 text-xs text-text-tertiary bg-bg-tertiary rounded-lg px-3 py-2">
          <span>On duty: <strong>{view.officer_status.on_duty}</strong></span>
          <span>Available: <strong>{view.officer_status.available}</strong></span>
          <span>Deployed: <strong>{view.officer_status.deployed}</strong></span>
          <span className="ml-auto">Active hotspots: <strong>{view.active_hotspots}</strong></span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border-primary pb-1">
        {['all', 'Critical', 'High', 'Medium', 'Low'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1 rounded-t ${filter === s ? 'bg-[var(--bg-deep)] text-[var(--text-primary)]' : 'text-text-tertiary hover:text-text-primary'}`}
          >
            {s === 'all' ? 'All' : s} {s !== 'all' ? `(${view[`${s.toLowerCase()}_count` as keyof CommandCenterView] || 0})` : ''}
          </button>
        ))}
      </div>

      {/* AI Recommendations */}
      {view.recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-blue-800 mb-1">AI Recommendations</h4>
          <ul className="space-y-0.5">
            {view.recommendations.map((r, i) => (
              <li key={i} className="text-xs text-blue-700 flex items-start gap-1">
                <span className="mt-0.5">•</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alert cards */}
      <div className="space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <p className="text-xs text-text-tertiary text-center py-8">No alerts to display</p>
        ) : (
          filteredAlerts.map((alert) => (
            <SmartAlertCard
              key={alert.alert_id}
              alert={alert}
              onAcknowledge={onAcknowledge}
              onResolve={onResolve}
              onDispatch={onDispatch}
              onViewMap={onViewMap}
              onViewInvestigation={onViewInvestigation}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-bg-card rounded-lg border border-border-primary p-3 text-center">
      <div className={`w-2 h-2 rounded-full ${color} mx-auto mb-1`} />
      <div className="text-lg font-bold text-text-primary">{value}</div>
      <div className="text-[10px] text-text-tertiary">{label}</div>
    </div>
  );
}
