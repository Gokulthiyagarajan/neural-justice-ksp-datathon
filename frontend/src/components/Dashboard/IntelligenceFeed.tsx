import { useRef } from 'react';
import { Activity, Shield, MapPin, Users, FileText, Bell, type LucideIcon } from 'lucide-react';
import type { EarlyWarning } from '@/types';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/Common/StatusBadge';

interface FeedEvent {
  id: string;
  type: string;
  severity: string;
  title: string;
  district: string;
  timestamp: string;
  status?: string;
}

const eventIcons: Record<string, LucideIcon> = {
  hotspot: MapPin,
  prediction: Activity,
  repeat_offender: Users,
  linked_fir: FileText,
  network_expanded: Shield,
  officer_assigned: Bell,
  chargesheet: FileText,
  cluster: Activity,
};

function mapWarningToEvent(w: EarlyWarning, idx: number): FeedEvent {
  return {
    id: w.warning_id || `w-${idx}-${w.message?.slice(0, 10)}`,
    type: w.type || 'prediction',
    severity: (w.severity || 'medium').toLowerCase(),
    title: w.message,
    district: w.entity_name || 'Unknown',
    timestamp: w.generated_at || new Date().toISOString(),
    status: w.status,
  };
}

interface IntelligenceFeedProps {
  warnings: EarlyWarning[];
  isLoading?: boolean;
  divisionCount?: number;
  districtCount?: number;
  stationCount?: number;
}

export default function IntelligenceFeed({
  warnings,
  isLoading,
  divisionCount = 4,
  districtCount = 31,
  stationCount = 906,
}: IntelligenceFeedProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const events: FeedEvent[] = warnings.map((w, i) => mapWarningToEvent(w, i));

  const severityColors: Record<string, string> = {
    critical: 'text-alert-red',
    high: 'text-signal-amber',
    medium: 'text-service-blue',
    low: 'text-text-tertiary',
  };
  const severityBorders: Record<string, string> = {
    critical: 'border-l-alert-red',
    high: 'border-l-signal-amber',
    medium: 'border-l-service-blue',
    low: 'border-l-text-tertiary',
  };

  if (isLoading) {
    return (
      <div className="panel-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-primary">
          <div className="h-4 w-32 bg-bg-tertiary rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-7 h-7 rounded-lg bg-bg-tertiary" />
              <div className="flex-1">
                <div className="h-3 w-3/4 bg-bg-tertiary rounded mb-1.5" />
                <div className="h-2 w-1/2 bg-bg-tertiary rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="panel-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border-primary flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-service-blue" aria-hidden />
          <span className="text-xs font-semibold text-text-primary font-display">{t('feed.title')}</span>
          {events.length > 0 && (
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-service-blue/10 text-service-blue">
              {events.length}
            </span>
          )}
        </div>
        {events.length === 0 && (
          <span className="text-[10px] text-text-tertiary italic">{t('feed.analyzing')}</span>
        )}
      </div>

      <div ref={containerRef} className="overflow-y-auto max-h-[340px]">
        {events.length === 0 ? (
          <div className="p-6 text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-text-tertiary/50" aria-hidden />
            <p className="text-xs text-text-tertiary">
              {t('feed.emptyLine1', { divisions: divisionCount, districts: districtCount, stations: stationCount })}
            </p>
            <p className="text-[10px] text-text-tertiary/60 mt-1">{t('feed.emptyLine2')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border-secondary">
            {events.map((event) => {
              const Icon = eventIcons[event.type] || Activity;
              const sev = event.severity.toLowerCase();
              return (
                <div
                  key={event.id}
                  className={`flex items-start gap-3 px-4 py-2.5 border-l-2
                    ${severityBorders[sev] || severityBorders.medium}
                    hover:bg-bg-tertiary/50 transition-colors cursor-default
                    animate-feed-enter motion-reduce:animate-none`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                    ${severityColors[sev] || 'text-text-tertiary'} bg-current/10`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{event.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-text-tertiary">{event.district}</span>
                      <span className="text-[10px] text-text-tertiary" aria-hidden>·</span>
                      <span className="text-[10px] font-mono text-text-tertiary">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      {event.status && (
                        <>
                          <span className="text-[10px] text-text-tertiary" aria-hidden>·</span>
                          <StatusBadge status={event.status} size="sm" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
