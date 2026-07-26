import { ExternalLink, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/design-system/utils/cn';
import { ScoreGauge } from '@/design-system/components/ScoreGauge';

export interface AIOutputBlockProps {
  message: string;
  detail?: string;
  confidence?: number;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  disclaimer?: string;
  className?: string;
}

/** Consistent visual pattern for AI-generated recommendations */
export function AIOutputBlock({
  message,
  detail,
  confidence,
  actionLabel,
  onAction,
  actionHref,
  disclaimer,
  className,
}: AIOutputBlockProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'panel-card border border-signal-amber/20 bg-signal-amber/5 p-4',
        className,
      )}
    >
      <div className="flex gap-3">
        {confidence != null && (
          <ScoreGauge
            value={confidence}
            size="sm"
            label={t('aiOutput.confidence')}
            className="shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-signal-amber shrink-0" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-console text-signal-amber">
              {t('aiOutput.recommendation')}
            </span>
          </div>
          <p className="text-xs font-medium text-text-primary">{message}</p>
          {detail && <p className="text-[10px] text-text-tertiary mt-1">{detail}</p>}
          {(onAction || actionHref) && (
            actionHref ? (
              <a
                href={actionHref}
                className="inline-flex items-center gap-0.5 mt-2 text-[10px] font-medium text-service-blue hover:underline"
              >
                {actionLabel ?? t('aiOutput.openInvestigation')}{' '}
                <ExternalLink className="w-2.5 h-2.5" aria-hidden />
              </a>
            ) : (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center gap-0.5 mt-2 text-[10px] font-medium text-service-blue hover:underline"
              >
                {actionLabel ?? t('aiOutput.openInvestigation')}{' '}
                <ExternalLink className="w-2.5 h-2.5" aria-hidden />
              </button>
            )
          )}
          {disclaimer && (
            <p className="text-[10px] text-text-tertiary mt-2 pt-2 border-t border-border-secondary italic">
              {disclaimer}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
