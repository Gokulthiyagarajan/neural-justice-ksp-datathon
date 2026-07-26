import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, MapPin } from 'lucide-react';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { DataTable, type Column } from '@/design-system/components/Table';
import type { FirCase } from '@/types';
import { useTranslation } from 'react-i18next';

interface FIRExplorerProps {
  firs: FirCase[];
  isLoading: boolean;
}

type SortDir = 'asc' | 'desc';

export function FIRExplorer({ firs, isLoading }: FIRExplorerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sortColumn, setSortColumn] = useState<string>('occurrence_date');
  const [sortDirection, setSortDirection] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const sorted = useMemo(() => {
    const rows = [...firs];
    rows.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortColumn];
      const bv = (b as unknown as Record<string, unknown>)[sortColumn];
      const as_ = av == null ? '' : String(av);
      const bs = bv == null ? '' : String(bv);
      const cmp = as_.localeCompare(bs, undefined, { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [firs, sortColumn, sortDirection]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const columns: Column<FirCase>[] = [
    {
      key: 'crime_no',
      header: t('fir.firNumber'),
      sortable: true,
      accessor: (row) => row.crime_no,
      render: (value) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0, 212, 255, 0.08)' }}>
            <FileText className="w-4 h-4" aria-hidden="true" style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <span className="font-medium text-sm text-text-primary">{value}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('fir.status'),
      sortable: true,
      accessor: (row) => row.status,
      render: (value) => <StatusBadge status={String(value)} size="sm" />,
    },
    {
      key: 'crime_head_name',
      header: t('fir.crimeType'),
      sortable: true,
      accessor: (row) => row.crime_head_name || 'Unknown',
      render: (value) => <span className="text-sm text-text-secondary">{value}</span>,
    },
    {
      key: 'occurrence_date',
      header: t('fir.dateFrom'),
      sortable: true,
      accessor: (row) => row.occurrence_date,
      render: (value) => (
        <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
          {value}
        </span>
      ),
    },
    {
      key: 'station_name',
      header: t('fir.station'),
      sortable: true,
      accessor: (row) => row.station_name || `Station #${row.station_id}`,
      render: (value) => (
        <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
          {value}
        </span>
      ),
    },
  ];

  return (
    <DataTable<FirCase>
      columns={columns}
      data={paged}
      keyAccessor={(row) => row.crime_no}
      loading={isLoading}
      emptyMessage={t('fir.noResults')}
      emptyIcon={<FileText className="w-6 h-6" aria-hidden="true" />}
      onRowClick={(row) => navigate(`/firs/${row.crime_no}`)}
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
  );
}
