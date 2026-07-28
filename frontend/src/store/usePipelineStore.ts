import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PipelineClaim {
  text: string;
  confidence: number;
  type: string;
  source_hint: string;
  source_stage?: string;
  evidence_source?: string;
  evidence_detail?: string;
  contradicted_reason?: string;
}

export interface PipelineEntity {
  name: string;
  type: string;
  relevance: string;
}

export interface PipelineReport {
  report_id: string;
  query: string;
  mode: string;
  generated_at: string;
  processing_time_ms: number;
  executive_summary: string;
  hypothesis: string;
  claims: {
    verified: PipelineClaim[];
    unverified: PipelineClaim[];
    contradicted: PipelineClaim[];
    total_generated: number;
    total_verified: number;
    pass_rate: number;
  };
  entities: PipelineEntity[];
  evidence_summary: Record<string, unknown>;
  consistency: {
    score: number;
    cross_references: unknown[];
  };
  recommendations: string[];
  stages_completed: string[];
}

export interface PipelineStageEvent {
  type: string;
  timestamp: string;
  run_id: string;
  stage?: string;
  progress?: number;
  data?: Record<string, unknown>;
}

export type PipelineStatus = 'idle' | 'starting' | 'running' | 'completed' | 'failed';

export interface PipelineStage {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
}

// ── Module-level SSE reference (not in store) ──────────────────────────────

let _activeEventSource: EventSource | null = null;

// ── Store ──────────────────────────────────────────────────────────────────

interface PipelineState {
  // Run state
  runId: string | null;
  status: PipelineStatus;
  mode: 'fast' | 'deep';

  // Progress
  progress: number;
  stages: PipelineStage[];
  currentStage: string;

  // Results
  report: PipelineReport | null;
  error: string | null;

  // History
  recentRuns: { runId: string; query: string; status: string; timestamp: string }[];

  // Actions
  startInvestigation: (
    query: string,
    mode?: 'fast' | 'deep',
    caseId?: string,
    context?: Record<string, unknown>
  ) => Promise<string>;
  connectSSE: (runId: string) => void;
  disconnectSSE: () => void;
  reset: () => void;
  setMode: (mode: 'fast' | 'deep') => void;
}

const DEFAULT_STAGES: PipelineStage[] = [
  { id: 'stage_1_generation', label: 'Draft Report (GPT-OSS-120B)', status: 'pending', progress: 0 },
  { id: 'evidence_verify', label: 'Evidence Verification', status: 'pending', progress: 0 },
  { id: 'stage_4_consistency', label: 'Consistency Check (Nemotron Mini)', status: 'pending', progress: 0 },
  { id: 'final_assembly', label: 'Final Report Assembly', status: 'pending', progress: 0 },
];

export const usePipelineStore = create<PipelineState>((set, get) => ({
  // State
  runId: null,
  status: 'idle',
  mode: 'fast',
  progress: 0,
  stages: DEFAULT_STAGES.map((s) => ({ ...s })),
  currentStage: '',
  report: null,
  error: null,
  recentRuns: [],

  setMode: (mode) => set({ mode }),

  startInvestigation: async (query, mode = 'fast', caseId, context) => {
    set({
      status: 'starting',
      progress: 0,
      stages: DEFAULT_STAGES.map((s) => ({ ...s })),
      report: null,
      error: null,
    });

    try {
      const res = await fetch('/api/v1/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mode, case_id: caseId, context: context || {} }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const runId = data.run_id;

      set((s) => ({
        runId,
        status: 'running',
        recentRuns: [
          { runId, query, status: 'running', timestamp: new Date().toISOString() },
          ...s.recentRuns.slice(0, 9),
        ],
      }));

      // Connect to SSE stream
      get().connectSSE(runId);

      return runId;
    } catch (e) {
      set({ status: 'failed', error: (e as Error).message });
      throw e;
    }
  },

  connectSSE: (runId) => {
    // Disconnect existing connection
    get().disconnectSSE();

    const es = new EventSource(`/api/v1/investigate/stream/${runId}`);
    _activeEventSource = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as PipelineStageEvent;
        handlePipelineEvent(data, set, get);
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      // SSE connection closed or errored — check final status
      const { status } = get();
      if (status === 'running') {
        // Try to get final status via REST
        fetch(`/api/v1/investigate/${runId}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.status === 'completed' && data.final_report) {
              set({ status: 'completed', report: data.final_report, progress: 1.0 });
            } else if (data.status === 'failed') {
              set({ status: 'failed', error: data.error || 'Pipeline failed' });
            }
          })
          .catch(() => {});
      }
      es.close();
      _activeEventSource = null;
    };
  },

  disconnectSSE: () => {
    if (_activeEventSource) {
      _activeEventSource.close();
      _activeEventSource = null;
    }
  },

  reset: () => {
    get().disconnectSSE();
    set({
      runId: null,
      status: 'idle',
      progress: 0,
      stages: DEFAULT_STAGES.map((s) => ({ ...s })),
      currentStage: '',
      report: null,
      error: null,
    });
  },
}));

// ── Event handler ──────────────────────────────────────────────────────────

function handlePipelineEvent(
  event: PipelineStageEvent,
  set: (partial: Partial<PipelineState> | ((s: PipelineState) => Partial<PipelineState>)) => void,
  get: () => PipelineState
) {
  const { type } = event;

  switch (type) {
    case 'pipeline_start':
      set({ status: 'running', progress: 0 });
      break;

    case 'stage_start':
      if (event.stage) {
        const stageId = event.stage;
        set((s) => ({
          currentStage: stageId,
          stages: s.stages.map((st) =>
            st.id === stageId || st.id.startsWith(stageId.split('_').slice(0, 2).join('_'))
              ? { ...st, status: 'running' as const }
              : st
          ),
        }));
      }
      break;

    case 'stage_complete':
      if (event.stage && event.progress !== undefined) {
        const stageId = event.stage;
        const prog = event.progress;
        set((s) => ({
          progress: prog,
          stages: s.stages.map((st) =>
            st.id === stageId || st.id.startsWith(stageId.split('_').slice(0, 2).join('_'))
              ? { ...st, status: 'completed' as const, progress: 1.0 }
              : st
          ),
        }));
      }
      break;

    case 'pipeline_complete':
      if (event.data) {
        set({
          status: 'completed',
          report: event.data as unknown as PipelineReport,
          progress: 1.0,
          stages: get().stages.map((s) => ({ ...s, status: 'completed' as const, progress: 1.0 })),
        });
      }
      break;

    case 'pipeline_error':
      set({
        status: 'failed',
        error: (event.data as Record<string, unknown>)?.error as string || 'Unknown error',
      });
      break;

    case 'run_state': {
      const runData = event.data as Record<string, unknown>;
      if (runData?.status === 'completed' && runData?.final_report) {
        set({
          status: 'completed',
          report: runData.final_report as PipelineReport,
          progress: 1.0,
        });
      } else if (runData?.status === 'failed') {
        set({
          status: 'failed',
          error: (runData?.error as string) || 'Pipeline failed',
        });
      }
      break;
    }
  }
}
