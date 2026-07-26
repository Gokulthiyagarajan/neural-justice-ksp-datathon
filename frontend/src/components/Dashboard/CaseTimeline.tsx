import { FileText, Search, FileCheck, Gavel, CheckCircle2, XCircle } from 'lucide-react';

const stages = [
  { key: 'registered', label: 'Registered', icon: FileText },
  { key: 'investigation', label: 'Investigation', icon: Search },
  { key: 'charge_sheet', label: 'Charge Sheet', icon: FileCheck },
  { key: 'court', label: 'Court', icon: Gavel },
  { key: 'judgement', label: 'Judgement', icon: CheckCircle2 },
  { key: 'closed', label: 'Closed', icon: XCircle },
];

const caseStages: Record<string, number> = {
  registered: 0,
  under_investigation: 1,
  charge_sheet_filed: 2,
  pending_trial: 2.5,
  court: 3,
  judgement: 4,
  closed: 5,
  acquitted: 5,
  convicted: 5,
};

interface CaseTimelineProps {
  currentStatus?: string;
}

export function CaseTimeline({ currentStatus = 'under_investigation' }: CaseTimelineProps) {
  const currentStage = caseStages[currentStatus.toLowerCase().replace(/\s+/g, '_')] ?? 0;

  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5">
      <h3 className="font-semibold text-text-primary mb-4">Case Lifecycle</h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-bg-tertiary" />
        <div className="space-y-0">
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            const isActive = idx <= Math.floor(currentStage);
            const isCurrent = idx === Math.floor(currentStage);

            return (
              <div key={stage.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isCurrent
                      ? 'border-[var(--accent-cyan)] bg-[rgba(0,212,255,0.15)] text-white'
                      : isActive
                      ? 'border-[var(--accent-cyan)] bg-[rgba(0,212,255,0.08)] text-[var(--accent-cyan)]'
                      : 'border-border-primary bg-bg-card text-text-tertiary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 pt-1">
                  <p className={`text-sm font-medium ${isActive ? 'text-text-primary' : 'text-text-tertiary'}`}>
                    {stage.label}
                    {isCurrent && (
                      <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: 'rgba(0, 212, 255, 0.12)', color: 'var(--accent-cyan)' }}>
                        Current
                      </span>
                    )}
                  </p>
                  {isCurrent && currentStatus && (
                    <p className="text-xs text-text-tertiary mt-0.5 capitalize">{currentStatus.replace(/_/g, ' ')}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
