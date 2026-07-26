import { useState, useEffect, useCallback } from 'react';
import {
  fetchDashboardMetrics,
  fetchCrimeTrend,
  DashboardApiError,
  type DashboardErrorKind,
  type DashboardMetrics,
  type TrendPoint,
} from '@/services/dashboardApi';

export function useDashboardData() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  // `degraded` means the live dashboard backend could not supply data, so we keep
  // showing sample/store data instead of breaking the UI. The UI is never left
  // in a broken state regardless of the failure reason.
  const [degraded, setDegraded] = useState(false);
  // `errorKind` captures *why* we degraded so the UI can label it honestly and
  // so the failure is diagnosable. Crucially, a real server fault (5xx) is kept
  // distinct from an expected demo-mode 401 or a backend outage — we never
  // silently hide a server error.
  const [errorKind, setErrorKind] = useState<DashboardErrorKind | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setDegraded(false);
      setErrorKind(null);

      const [metricsData, trendData] = await Promise.all([
        fetchDashboardMetrics(),
        fetchCrimeTrend(),
      ]);

      setMetrics(metricsData);
      setTrend(trendData);
      setLastRefresh(new Date());
    } catch (err) {
      // Degrade gracefully so the dashboard stays usable, but classify the
      // failure honestly:
      //  - network / auth(401/403): expected in local demo (sentinel token, no
      //    real JWT) or when the API isn't running — non-blocking note.
      //  - server (5xx) / client (4xx other than auth): a genuine fault. The UI
      //    still shows sample data (not broken), but we log at error level and
      //    surface an "error" note rather than pretending the backend is merely
      //    "unavailable". This satisfies both "UI must never appear broken" and
      //    "never hide errors".
      const kind = err instanceof DashboardApiError ? err.kind : 'unknown';
      setDegraded(true);
      setErrorKind(kind);
      setMetrics(null);
      setTrend([]);

      if (kind === 'server' || kind === 'client') {
        console.error('[Dashboard] Live metrics request failed:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadAll]);

  return { metrics, trend, loading, degraded, errorKind, refetch: loadAll, lastRefresh };
}
