import { useState } from 'react';
import { Search, X, Search as SearchIcon } from 'lucide-react';
import type { FIRFilters, FIRFilterOptions } from '@/types/fir.types';
import { C } from '../theme';
import { FIRSelect, type SelectOption } from './FIRSelect';

interface Props {
  filters: FIRFilters;
  options: FIRFilterOptions;
  onUpdate: (key: keyof FIRFilters, value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  loading?: boolean;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: C.muted,
  marginBottom: 6,
};

export function FIRFilterPanel({
  filters,
  options,
  onUpdate,
  onSearch,
  onClear,
  loading,
}: Props) {
  const [searchText, setSearchText] = useState(filters.search);

  const districtOpts: SelectOption[] = [
    { value: 'all', label: 'All Districts' },
    ...options.districts.map((d) => ({ value: d, label: d })),
  ];
  const stationOpts: SelectOption[] = [
    { value: 'all', label: 'All Stations' },
    ...options.stations.map((s) => ({ value: s, label: s })),
  ];
  const crimeOpts: SelectOption[] = [
    { value: 'all', label: 'All Crime Types' },
    ...options.crime_types.map((c) => ({ value: c, label: c })),
  ];
  const statusOpts: SelectOption[] = [
    { value: 'all', label: 'All Statuses' },
    ...options.statuses.map((s) => ({
      value: s,
      label: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    })),
  ];
  const severityOpts: SelectOption[] = [
    { value: 'all', label: 'All Severities' },
    ...options.severities.map((s) => ({
      value: s,
      label: s.charAt(0).toUpperCase() + s.slice(1),
    })),
  ];

  const handleSearchClick = () => {
    onUpdate('search', searchText);
    onSearch();
  };

  return (
    <div
      style={{
        background: C.navyMid,
        border: `1px solid ${C.navyLight}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: '1 1 200px', minWidth: 180 }}>
          <label style={labelStyle}>Search</label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: C.navyMid,
              border: `1px solid ${C.navyLight}`,
              borderRadius: 8,
              padding: '0 12px',
              transition: 'border-color 0.15s',
            }}
            onFocusCapture={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = C.amber;
            }}
            onBlurCapture={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = C.navyLight;
            }}
          >
            <SearchIcon size={16} color={C.muted} />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchClick();
              }}
              placeholder="FIR no, accused, victim…"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: C.white,
                fontSize: 13,
                padding: '8px 0',
              }}
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div>
          <label style={labelStyle}>District</label>
          <FIRSelect value={filters.district} options={districtOpts} onChange={(v) => onUpdate('district', v)} />
        </div>
        <div>
          <label style={labelStyle}>Station</label>
          <FIRSelect value={filters.station} options={stationOpts} onChange={(v) => onUpdate('station', v)} />
        </div>
        <div>
          <label style={labelStyle}>Crime Type</label>
          <FIRSelect value={filters.crime_type} options={crimeOpts} onChange={(v) => onUpdate('crime_type', v)} />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <FIRSelect value={filters.status} options={statusOpts} onChange={(v) => onUpdate('status', v)} />
        </div>
        <div>
          <label style={labelStyle}>Severity</label>
          <FIRSelect value={filters.severity} options={severityOpts} onChange={(v) => onUpdate('severity', v)} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={handleSearchClick}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: C.amber,
              color: C.navy,
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: 13,
              cursor: loading ? 'wait' : 'pointer',
              filter: loading ? 'brightness(0.9)' : 'none',
            }}
          >
            {loading ? (
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: `2px solid ${C.navy}`,
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'fir-spin 0.8s linear infinite',
                }}
              />
            ) : (
              <Search size={14} />
            )}
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchText('');
              onClear();
            }}
            style={{
              background: 'transparent',
              border: `1px solid ${C.navyLight}`,
              color: C.muted,
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <style>{`@keyframes fir-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
