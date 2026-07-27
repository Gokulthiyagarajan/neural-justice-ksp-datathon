import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/Common/Toast';
import { useFIRData } from '@/hooks/useFIRData';
import { useFIRSelection } from '@/hooks/useFIRSelection';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import type { FIR, FIRFilters } from '@/types/fir.types';
import { C } from './theme';
import { FIRFilterPanel } from './components/FIRFilterPanel';
import { FIRActiveFilters } from './components/FIRActiveFilters';
import { FIRResultsBar } from './components/FIRResultsBar';
import { FIRTable } from './components/FIRTable';
import { FIRTableSkeleton } from './components/FIRTableSkeleton';
import { FIREmptyState } from './components/FIREmptyState';
import { FIRBulkActionBar } from './components/FIRBulkActionBar';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';
import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function FIROperations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const jurisdiction = useJurisdiction();
  const {
    firs,
    total,
    summary,
    loading,
    filters,
    filterOptions,
    updateFilter,
    clearFilters,
    refetch,
    page,
    setPage,
    hasMore,
    totalPages,
  } = useFIRData();

  // Apply jurisdiction district filter on mount for non-state-wide roles
  useEffect(() => {
    if (jurisdiction.district_id && !jurisdiction.isStateWide) {
      updateFilter('district', jurisdiction.district_id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The jurisdiction filter is auto-applied — hide the district chip since the
  // user didn't toggle it. Only show chips for filters the user actually changed.
  // Don't count an auto-applied jurisdiction district as a user-activated filter
  const isAutoDistrict = !!(
    jurisdiction.district_id &&
    !jurisdiction.isStateWide &&
    filters.district === jurisdiction.district_id
  );
  const showUserFilters = Object.entries(filters).some(([key, v]) => {
    if (key === 'district' && isAutoDistrict) return false;
    return v !== '' && v !== 'all';
  });

  const selection = useFIRSelection(firs);

  const handleRowClick = useCallback((fir: FIR) => {
    navigate(`/firs/${fir.fir_number}`, { state: { fir } });
  }, [navigate]);

  const handleFlag = (fir: FIR) => {
    toast('warning', `Flagged ${fir.fir_number} for supervisor review`);
  };

  const handleAssign = (fir: FIR) => {
    toast('info', `Assign investigator to ${fir.fir_number}`);
  };

  const clearDistrict = () => updateFilter('district', 'all');

  return (
    <div style={{ minHeight: '100%' }}>
      <main className="flex-1 p-4 sm:p-6 min-w-0">
        <style>{`
          .fir-tip-wrap:hover .fir-tip { opacity: 1 !important; }
        `}</style>

        {/* Page heading */}
        <div className="mb-4">
          <h1 className="text-xl font-semibold" style={{ color: C.white, margin: 0 }}>
            FIR Operations
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: C.muted, margin: '4px 0 0' }}>
            {total} records · 4 divisions · 31 districts
          </p>
          <div style={{ marginTop: 8 }}>
            <JurisdictionBanner scope={jurisdiction} />
          </div>
        </div>

        {/* Filter panel */}
        <FIRFilterPanel
          filters={filters}
          options={filterOptions}
          onUpdate={updateFilter}
          onSearch={refetch}
          onClear={clearFilters}
          loading={loading}
        />

        {/* Active filter chips */}
        {showUserFilters && (
          <FIRActiveFilters
            filters={filters}
            onRemove={(key: keyof FIRFilters) => updateFilter(key, 'all')}
            onClearAll={clearFilters}
            skipAutoDistrict={isAutoDistrict}
          />
        )}

        {/* Results summary bar */}
        {!loading && firs.length > 0 && (
          <FIRResultsBar
            shown={firs.length}
            total={total}
            summary={summary}
            onRefresh={refetch}
          />
        )}

        {/* Table / skeleton / empty */}
        {loading ? (
          <FIRTableSkeleton />
        ) : firs.length === 0 ? (
          <FIREmptyState
            activeFilters={filters}
            onClearFilters={clearFilters}
            onClearDistrict={clearDistrict}
          />
        ) : (
          <FIRTable
            firs={firs}
            selection={selection}
            onRowClick={handleRowClick}
            onFlag={handleFlag}
            onAssign={handleAssign}
          />
        )}

        {/* Pagination */}
        {!loading && firs.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
              padding: '8px 16px',
              background: C.navyMid,
              border: `1px solid ${C.navyLight}`,
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 13, color: C.muted }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 14px',
                  background: page > 1 ? C.amber : C.navyLight,
                  color: page > 1 ? C.navy : C.muted,
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: page > 1 ? 'pointer' : 'not-allowed',
                  opacity: page > 1 ? 1 : 0.5,
                }}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                type="button"
                disabled={!hasMore || loading}
                onClick={() => setPage(page + 1)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 14px',
                  background: hasMore ? C.amber : C.navyLight,
                  color: hasMore ? C.navy : C.muted,
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: hasMore ? 'pointer' : 'not-allowed',
                  opacity: hasMore ? 1 : 0.5,
                }}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Bulk action bar */}
        {selection.selectedCount > 0 && (
          <FIRBulkActionBar count={selection.selectedCount} onClear={selection.clearSelection} />
        )}
      </main>
    </div>
  );
}

export default FIROperations;
