import { useState, useEffect } from 'react';
import { getOfficerAlerts } from '@/api/EarlyWarning';
import type { OfficerAlertSummary } from '@/types/EarlyWarning';

interface OfficerResponsePanelProps {
  officerId: string;
  districtId: string;
}

export function OfficerResponsePanel({ officerId, districtId }: OfficerResponsePanelProps) {
  const [alerts, setAlerts] = useState<OfficerAlertSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOfficerAlerts(officerId, districtId)
      .then((data) => { setAlerts(data.alerts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [officerId, districtId]);

  const assigned = alerts.filter((a) => a.status === 'active' || a.status === 'acknowledged');
  const resolved = alerts.filter((a) => a.status === 'resolved');

  if (loading) return <div className="p-3 text-xs text-text-tertiary">Loading alerts...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">My Alerts</h3>
        <span className="text-[10px] text-text-tertiary bg-bg-tertiary px-2 py-0.5 rounded">{assigned.length} active</span>
      </div>

      {assigned.length === 0 ? (
        <p className="text-xs text-text-tertiary text-center py-4">No assigned alerts</p>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {assigned.map((a) => (
            <div key={a.alert_id} className="flex items-center justify-between bg-bg-card border border-border-secondary rounded-lg p-2 hover:shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <SeverityDot severity={a.severity} />
                  <h4 className="text-xs font-medium text-text-primary truncate">{a.title}</h4>
                </div>
                <p className="text-[10px] text-text-tertiary mt-0.5">
                  {a.type.replace(/_/g, ' ')} • {new Date(a.created_at).toLocaleString()}
                  {a.status === 'acknowledged' && <span className="text-green-500 ml-1">• Acknowledged</span>}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {a.status === 'active' && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Active" />
                )}
                {a.response_time_min && (
                  <span className="text-[10px] text-text-tertiary">{a.response_time_min}m</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <p className="text-[10px] text-text-tertiary mb-1">Resolved ({resolved.length})</p>
          <div className="space-y-0.5">
            {resolved.slice(0, 3).map((a) => (
              <div key={a.alert_id} className="text-[10px] text-text-tertiary truncate">
                {a.title} <span className="text-green-400">✓</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    Critical: 'bg-red-500', High: 'bg-orange-500', Medium: 'bg-yellow-500', Low: 'bg-blue-500',
  };
  return <span className={`w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 ${colors[severity] || 'bg-bg-tertiary'}`} />;
}
