import { FileText, Search, Archive, Gavel, FileCheck, CheckCircle2, type LucideIcon } from 'lucide-react';
import type { FirCase } from '@/types';
import { useTranslation } from 'react-i18next';

interface StageConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

const stageLabels: Record<string, string> = {
  registered: 'pipeline.registered',
  investigation: 'pipeline.investigation',
  evidence: 'pipeline.evidence',
  arrest: 'pipeline.arrest',
  chargesheet: 'pipeline.chargesheet',
  court: 'pipeline.court',
  closed: 'pipeline.closed',
};

const stages: StageConfig[] = [
  { key: 'registered', label: 'Registered', icon: FileText, color: 'var(--accent-cyan)' },
  { key: 'investigation', label: 'Investigation', icon: Search, color: '#8b5cf6' },
  { key: 'evidence', label: 'Evidence', icon: Archive, color: '#06b6d4' },
  { key: 'arrest', label: 'Arrest', icon: Gavel, color: 'var(--alert-amber)' },
  { key: 'chargesheet', label: 'Charge Sheet', icon: FileCheck, color: '#f97316' },
  { key: 'court', label: 'Court', icon: Gavel, color: 'var(--alert-red)' },
  { key: 'closed', label: 'Closed', icon: CheckCircle2, color: 'var(--alert-green)' },
];

const statusToStage: Record<string, number> = {
  registered: 0,
  under_investigation: 1,
  investigation: 1,
  evidence_collection: 2,
  evidence: 2,
  arrest: 3,
  chargesheet_filed: 4,
  chargesheet: 4,
  pending_trial: 5,
  court: 5,
  judgement: 6,
  closed: 6,
  acquitted: 6,
  convicted: 6,
};

interface CasePipelineProps {
  cases: FirCase[];
  isLoading?: boolean;
}

export default function CasePipeline({ cases, isLoading }: CasePipelineProps) {
  const { t } = useTranslation();
  const stageCounts = stages.map(s => {
    const count = cases.filter(c => {
      const stageIdx = statusToStage[c.status?.toLowerCase().replace(/\s+/g, '_')] ?? 0;
      return stageIdx === stages.indexOf(s);
    }).length;
    return { ...s, count };
  });

  const totalCases = cases.length || 1;

  if (isLoading) {
    return (
      <div className="bg-bg-card border border-border-primary rounded-xl p-4 animate-pulse">
        <div className="h-4 w-32 bg-bg-tertiary rounded mb-4" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="flex-1 h-20 bg-bg-tertiary rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-accent-cyan" />
        <span className="text-xs font-semibold text-text-primary">{t('pipeline.title')}</span>
        <span className="text-[10px] text-text-tertiary ml-auto">{t('pipeline.totalCases', { count: cases.length })}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {stageCounts.map((stage) => {
          const pct = (stage.count / totalCases) * 100;
          return (
            <div
              key={stage.key}
              className="flex-1 min-w-[80px] bg-bg-secondary rounded-lg p-3 border border-border-secondary
                hover:border-accent-blue/30 hover:bg-accent-blue/5 transition-colors cursor-pointer group"
              onClick={() => {
                const params = new URLSearchParams();
                const statusMap: Record<string, string> = {
                  registered: 'registered', investigation: 'under_investigation',
                  evidence: 'evidence_collection', arrest: 'arrest',
                  chargesheet: 'chargesheet_filed', court: 'pending_trial', closed: 'closed',
                };
                params.set('status', statusMap[stage.key] || stage.key);
                window.location.href = `/firs?${params.toString()}`;
              }}
            >
              <stage.icon className="w-4 h-4 mb-1.5" style={{ color: stage.color }} />
               <p className="text-[10px] font-medium text-text-primary">{t(stageLabels[stage.key])}</p>
              <p className="text-lg font-bold text-text-primary tabular-nums">{stage.count}</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: stage.color }}
                />
              </div>
              <p className="text-[10px] text-text-tertiary mt-0.5">{Math.round(pct)}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
