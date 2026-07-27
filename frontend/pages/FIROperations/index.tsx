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
      <main style={{ flex: 1, padding: 24, minWidth: 0 }}>
        <style>{`
          .fir-tip-wrap:hover .fir-tip { opacity: 1 !important; }
          @media (max-width: 768px) {
            .fir-page-main { padding: 12px !important; }
          }
        `}</style>

        {/* Page heading */}
        <div style={{ marginBottom: 16 }} className="fir-page-main">
          <h1 style={{ fontSize: 20, fontWeight: 600, color: C.white, margin: 0 }}>
            FIR Operations
          </h1>
          <p style={{ color: C.muted, fontSize: 13, margin: '4px 0 0' }}>
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

        {/* Bulk action bar */}
        {selection.selectedCount > 0 && (
          <FIRBulkActionBar count={selection.selectedCount} onClear={selection.clearSelection} />
        )}
      </main>
    </div>
  );
}

export default FIROperations;
