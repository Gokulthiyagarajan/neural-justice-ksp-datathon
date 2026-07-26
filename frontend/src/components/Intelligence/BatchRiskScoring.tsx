import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Play, AlertTriangle } from 'lucide-react';
import { getRiskScore } from '@/api/intelligence';
import { DataTable, type Column } from '@/design-system/components/Table';
import { Badge } from '@/design-system/components/Badge';
import type { RiskScoreResponse } from '@/types';

const entityTypes = [
  { value: 'district', label: 'District' },
  { value: 'station', label: 'Police Station' },
  { value: 'accused', label: 'Accused' },
  { value: 'victim', label: 'Victim' },
  { value: 'area', label: 'Area' },
  { value: 'officer', label: 'Officer' },
  { value: 'case', label: 'Case' },
];

interface BatchRow {
  entity_id: string;
  entity_name: string;
  score: number;
  score_bucket: string;
  confidence_interval?: { lower: number; upper: number };
  review_status: string;
  error?: string;
}

type SortDir = 'asc' | 'desc';

function bucketVariant(bucket: string): 'critical' | 'high' | 'medium' | 'low' | 'draft' {
  switch ((bucket || '').toLowerCase()) {
    case 'critical': return 'critical';
    case 'high': return 'high';
    case 'medium': return 'medium';
    case 'low': return 'low';
    default: return 'draft';
  }
}

function scoreColor(score: number): string {
  if (score >= 75) return 'var(--alert-red)';
  if (score >= 50) return 'var(--alert-amber)';
  if (score >= 25) return 'var(--accent-cyan)';
  return 'var(--alert-green)';
}

export function BatchRiskScoring() {
  const { t } = useTranslation();
  const [entityType, setEntityType] = useState('accused');
  const [rawIds, setRawIds] = useState('');
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sortColumn, setSortColumn] = useState<string>('score');
  const [sortDirection, setSortDirection] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const parsedIds = useMemo(
    () =>
      Array.from(
        new Set(
          rawIds
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        )
      ),
    [rawIds]
  );

  const runBatch = async () => {
    if (parsedIds.length === 0) return;
    setIsLoading(true);
    setError(null);
    setRows([]);
    setPage(1);
    setProgress({ done: 0, total: parsedIds.length });

    const results: BatchRow[] = [];
    let done = 0;

    const CONCURRENCY = 5;
    const queue = [...parsedIds];

    async function worker() {
      while (queue.length > 0) {
        const id = queue.shift()!;
        try {
          const data: RiskScoreResponse = await getRiskScore(entityType, id, {
            includeExplanation: false,
          });
          results.push({
            entity_id: data.entity_id ?? id,
            entity_name: data.entity_name ?? '—',
            score: data.calibrated_score ?? data.score ?? 0,
            score_bucket: data.score_bucket ?? '',
            confidence_interval: data.confidence_interval,
            review_status: data.review_status ?? '',
          });
        } catch (err) {
          results.push({
            entity_id: id,
            entity_name: '—',
            score: -1,
            score_bucket: '',
            review_status: '',
            error: (err as Error).message,
          });
        } finally {
          done += 1;
          setProgress({ done, total: parsedIds.length });
        }
      }
    }

    try {
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, parsedIds.length) }, worker));
      setRows(results);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  const sorted = useMemo(() => {
    const data = [...rows];
    data.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortColumn];
      const bv = (b as unknown as Record<string, unknown>)[sortColumn];
      let cmp: number;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [rows, sortColumn, sortDirection]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const columns: Column<BatchRow>[] = [
    {
      key: 'entity_id',
      header: 'Entity ID',
      sortable: true,
      accessor: (row) => row.entity_id,
      render: (value) => <span className="font-medium text-sm text-text-primary">{value}</span>,
    },
    {
      key: 'entity_name',
      header: 'Name',
      sortable: true,
      accessor: (row) => row.entity_name,
      render: (value) => <span className="text-sm text-text-secondary">{value}</span>,
    },
    {
      key: 'score',
      header: 'Risk Score',
      sortable: true,
      align: 'right',
      accessor: (row) => row.score,
      render: (_value, row) =>
        row.error ? (
          <span className="flex items-center justify-end gap-1 text-xs" style={{ color: 'var(--alert-red)' }}>
            <AlertTriangle className="w-3.5 h-3.5" /> Failed
          </span>
        ) : (
          <span
            className="inline-flex items-center justify-center min-w-[3rem] px-2 py-0.5 rounded-md text-sm font-bold tabular-nums text-white"
            style={{ backgroundColor: scoreColor(row.score) }}
          >
            {Math.round(row.score)}
          </span>
        ),
    },
    {
      key: 'score_bucket',
      header: 'Level',
      sortable: true,
      accessor: (row) => row.score_bucket,
      render: (value, row) =>
        row.error ? (
          <span className="text-xs text-text-tertiary">{row.error}</span>
        ) : value ? (
          <Badge variant={bucketVariant(String(value))} size="sm">
            {String(value)}
          </Badge>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      key: 'confidence',
      header: 'Confidence Range',
      accessor: (row) =>
        row.confidence_interval
          ? `${Math.round(row.confidence_interval.lower)}–${Math.round(row.confidence_interval.upper)}`
          : '—',
      render: (value) => <span className="text-xs text-text-tertiary tabular-nums">{value}</span>,
    },
    {
      key: 'review_status',
      header: 'Review',
      sortable: true,
      accessor: (row) => row.review_status || '—',
      render: (value) => <span className="text-xs text-text-secondary">{value}</span>,
    },
  ];

  const failures = rows.filter((r) => r.error).length;

  return (
    <div className="space-y-4">
      <div className="bg-bg-card rounded-xl border border-border-primary p-5">
        <div className="flex items-center gap-3 mb-4">
          <Layers className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
          <h3 className="font-semibold text-text-primary">{t('risk.batchTitle')}</h3>
          <span className="text-xs text-text-tertiary">
            Score many entities at once, ranked by risk
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start gap-3">
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="px-3 py-2 border border-border-primary rounded-lg text-sm bg-bg-card"
            >
              {entityTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <textarea
              value={rawIds}
              onChange={(e) => setRawIds(e.target.value)}
              placeholder={t('risk.batchPlaceholder')}
              rows={3}
              className="flex-1 min-w-[240px] px-4 py-2 border border-border-primary rounded-lg text-sm bg-bg-card focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent resize-y"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={runBatch}
              disabled={parsedIds.length === 0 || isLoading}
              className="px-4 py-2 bg-[rgba(0,212,255,0.15)] text-white text-sm font-medium rounded-lg hover:bg-[rgba(0,212,255,0.08)] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Score {parsedIds.length > 0 ? `${parsedIds.length} ${parsedIds.length === 1 ? 'entity' : 'entities'}` : 'All'}
            </button>
            {progress && (
              <span className="text-xs text-text-secondary tabular-nums">
                Scoring… {progress.done}/{progress.total}
              </span>
            )}
            {!isLoading && rows.length > 0 && (
              <span className="text-xs text-text-tertiary">
                {rows.length - failures} scored{failures > 0 ? ` · ${failures} failed` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-error flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {(isLoading || rows.length > 0) && (
        <DataTable<BatchRow>
          columns={columns}
          data={paged}
          keyAccessor={(row) => row.entity_id}
          loading={isLoading && rows.length === 0}
          emptyMessage="No scores yet — enter IDs and run batch scoring"
          emptyIcon={<Layers className="w-6 h-6" aria-hidden="true" />}
          hoverable
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={(col, dir) => {
            setSortColumn(col);
            setSortDirection(dir);
            setPage(1);
          }}
          pagination={{
            page,
            pageSize,
            total: sorted.length,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
          }}
        />
      )}
    </div>
  );
}
