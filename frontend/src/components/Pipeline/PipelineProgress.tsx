import { usePipelineStore } from '../../store/usePipelineStore';

const STAGE_LABELS: Record<string, string> = {
  stage_1_generation: 'Draft Report',
  evidence_verify: 'Evidence Verification',
  stage_2_critical_review: 'Critical Review',
  stage_3_deep_reasoning: 'Deep Reasoning',
  stage_4_consistency: 'Consistency Check',
  final_assembly: 'Final Assembly',
};

export default function PipelineProgress() {
  const { status, progress, stages, currentStage, error, report, runId, reset } =
    usePipelineStore();

  if (status === 'idle') return null;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {status === 'running' && (
            <div className="w-3 h-3 bg-[var(--accent-gold)] rounded-full animate-pulse" />
          )}
          {status === 'completed' && (
            <div className="w-3 h-3 bg-green-500 rounded-full" />
          )}
          {status === 'failed' && (
            <div className="w-3 h-3 bg-red-500 rounded-full" />
          )}
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {status === 'starting' && 'Starting Investigation...'}
            {status === 'running' && 'Pipeline Running'}
            {status === 'completed' && 'Investigation Complete'}
            {status === 'failed' && 'Investigation Failed'}
          </h3>
        </div>
        {runId && (
          <span className="text-[10px] text-[var(--text-muted)] font-mono">{runId}</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1.5 mb-5">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            width: `${progress * 100}%`,
            backgroundColor:
              status === 'failed'
                ? 'var(--status-error)'
                : status === 'completed'
                ? 'var(--status-safe)'
                : 'var(--accent-gold)',
          }}
        />
      </div>

      {/* Stage list */}
      <div className="space-y-2">
        {stages.map((stage) => {
          const label = STAGE_LABELS[stage.id] || stage.id;
          const isActive = currentStage === stage.id || currentStage.startsWith(stage.id.split('_').slice(0, 2).join('_'));

          return (
            <div
              key={stage.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/30'
                  : 'bg-[var(--bg-tertiary)]'
              }`}
            >
              {/* Status indicator */}
              <div className="flex-shrink-0">
                {stage.status === 'completed' && (
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {stage.status === 'running' && (
                  <div className="w-4 h-4 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
                )}
                {stage.status === 'error' && (
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {stage.status === 'pending' && (
                  <div className="w-4 h-4 rounded-full border border-[var(--border-secondary)]" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-xs ${
                  stage.status === 'completed'
                    ? 'text-[var(--text-secondary)]'
                    : isActive
                    ? 'text-[var(--text-primary)] font-medium'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {label}
              </span>

              {/* Percentage */}
              {stage.status === 'completed' && (
                <span className="ml-auto text-[10px] text-[var(--text-muted)]">100%</span>
              )}
              {isActive && (
                <span className="ml-auto text-[10px] text-[var(--accent-gold)]">
                  {Math.round(progress * 100)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Report summary (when complete) */}
      {status === 'completed' && report && (
        <div className="mt-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-primary)]">Summary</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {report.processing_time_ms.toFixed(0)}ms
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-3">
            {report.executive_summary}
          </p>
          <div className="flex gap-3 mt-2">
            <span className="text-[10px] text-green-400">
              {report.claims.total_verified} verified
            </span>
            <span className="text-[10px] text-yellow-400">
              {report.claims.unverified.length} unverified
            </span>
            {report.claims.contradicted.length > 0 && (
              <span className="text-[10px] text-red-400">
                {report.claims.contradicted.length} contradicted
              </span>
            )}
          </div>
        </div>
      )}

      {/* Reset button */}
      {(status === 'completed' || status === 'failed') && (
        <button
          onClick={reset}
          className="mt-3 w-full py-1.5 text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--bg-primary)] transition-colors"
        >
          New Investigation
        </button>
      )}
    </div>
  );
}
