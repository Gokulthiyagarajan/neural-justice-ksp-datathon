const API_BASE = '/api/v1';

export interface InvestigateRequest {
  query: string;
  mode?: 'fast' | 'deep';
  case_id?: string;
  context?: Record<string, unknown>;
}

export interface InvestigateResponse {
  run_id: string;
  status: string;
  message: string;
}

export interface RunStatusResponse {
  run_id: string;
  status: string;
  current_stage: string;
  stages_completed: string[];
  processing_time_ms: number;
  error: string | null;
}

export async function startInvestigation(req: InvestigateRequest): Promise<InvestigateResponse> {
  const res = await fetch(`${API_BASE}/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function getRunStatus(runId: string): Promise<RunStatusResponse> {
  const res = await fetch(`${API_BASE}/investigate/${runId}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export function createSSEConnection(
  runId: string,
  onEvent: (event: Record<string, unknown>) => void,
  onError?: (error: Event) => void
): EventSource {
  const es = new EventSource(`${API_BASE}/investigate/stream/${runId}`);

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch {
      // Ignore parse errors
    }
  };

  es.onerror = (e) => {
    if (onError) onError(e);
  };

  return es;
}
