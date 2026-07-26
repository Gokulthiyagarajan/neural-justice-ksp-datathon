import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { InsightItem, EarlyWarning } from '@/types';
import { AIOutputBlock } from '@/design-system/components/AIOutputBlock';
import { Skeleton } from '@/design-system/components/Skeleton';
import { useTranslation } from 'react-i18next';

interface ExecutiveBriefProps {
  insights: InsightItem[];
  warnings: EarlyWarning[];
  isLoading: boolean;
}

export default function ExecutiveBrief({ insights, warnings, isLoading }: ExecutiveBriefProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="panel-card p-5 space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    );
  }

  const highWarnings = warnings.filter(
    (w) => w.severity?.toUpperCase() === 'CRITICAL' || w.severity?.toUpperCase() === 'HIGH',
  );
  const summaryItems = insights.filter((i) => i.severity !== 'info').slice(0, 4);

  return (
    <div className={`panel-card overflow-hidden border-service-blue/20 ${collapsed ? '' : ''}`}>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-hover-bg transition-colors duration-fast"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md flex items-center justify-center bg-service-blue/15">
            <Brain className="w-3.5 h-3.5 text-service-blue" aria-hidden />
          </div>
          <span className="text-sm font-semibold text-text-primary font-display">
            {t('dashboard.executiveBrief', { defaultValue: 'AI Executive Brief' })}
          </span>
          <span className="hidden sm:inline-flex badge-live">{t('status.live')}</span>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-text-tertiary" aria-hidden />
        ) : (
          <ChevronUp className="w-4 h-4 text-text-tertiary" aria-hidden />
        )}
      </button>

      {!collapsed && (
        <div className="px-5 pb-4 space-y-3 animate-panel-enter motion-reduce:animate-none">
          {summaryItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {summaryItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-bg-tertiary/60 border border-border-secondary">
                  <div
                    className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                      item.severity === 'critical'
                        ? 'bg-alert-red'
                        : item.severity === 'high'
                          ? 'bg-signal-amber'
                          : 'bg-verified-green'
                    }`}
                    aria-hidden
                  />
                  <div>
                    <p className="text-xs font-medium text-text-primary">{item.title}</p>
                    <p className="text-[10px] text-text-tertiary">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {highWarnings.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-console mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-signal-amber" aria-hidden />
                {t('dashboard.aiRecommendations')}
              </h4>
              <div className="space-y-2">
                {highWarnings.slice(0, 3).map((w) => (
                  <AIOutputBlock
                    key={w.warning_id}
                    message={w.message}
                    detail={w.recommended_action}
                    confidence={87}
                    actionHref={`/firs?q=${encodeURIComponent(w.entity_name || '')}`}
                    disclaimer={t('dashboard.aiReviewNote')}
                  />
                ))}
              </div>
            </div>
          )}

          {summaryItems.length === 0 && highWarnings.length === 0 && (
            <div className="flex items-center gap-2 py-2 text-text-tertiary">
              <Brain className="w-4 h-4" aria-hidden />
              <span className="text-xs">{t('dashboard.briefEmpty')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
