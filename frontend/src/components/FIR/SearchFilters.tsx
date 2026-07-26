import { Search, SlidersHorizontal } from 'lucide-react';
import type { FilterState } from '@/types/dashboard';
import { useTranslation } from 'react-i18next';

interface SearchFiltersProps {
  filters: FilterState;
  onChange: (filters: Partial<FilterState>) => void;
  onApply: () => void;
  onClear: () => void;
}

export function SearchFilters({ filters, onChange, onApply, onClear }: SearchFiltersProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm font-medium text-text-primary">{t('fir.filters')}</span>
        </div>
        <button onClick={onClear} className="text-xs hover:underline" style={{ color: 'var(--accent-cyan)' }}>
          {t('common.clear')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-tertiary mb-1">{t('fir.dateFrom')}</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ dateFrom: e.target.value })}
            className="w-full px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-tertiary mb-1">{t('fir.dateTo')}</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ dateTo: e.target.value })}
            className="w-full px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-tertiary mb-1">{t('fir.district')}</label>
          <select
            value={filters.district}
            onChange={(e) => onChange({ district: e.target.value })}
            className="w-full px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent bg-bg-card"
          >
            <option value="">{t('fir.allDistricts')}</option>
            <option value="BENGALURU_URBAN">{t('fir.districtBengaluruUrban')}</option>
            <option value="MYSURU">{t('fir.districtMysuru')}</option>
            <option value="BELAGAVI">{t('fir.districtBelagavi')}</option>
            <option value="HUBLI">{t('fir.districtHubli')}</option>
            <option value="MANGALURU">{t('fir.districtMangaluru')}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-tertiary mb-1">{t('fir.station')}</label>
          <select
            value={filters.station}
            onChange={(e) => onChange({ station: e.target.value })}
            className="w-full px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent bg-bg-card"
          >
            <option value="">{t('fir.allStations')}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-tertiary mb-1">{t('fir.crimeType')}</label>
          <select
            value={filters.crimeType}
            onChange={(e) => onChange({ crimeType: e.target.value })}
            className="w-full px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent bg-bg-card"
          >
            <option value="">{t('fir.allTypes')}</option>
            <option value="robbery">{t('fir.robbery')}</option>
            <option value="theft">{t('fir.theft')}</option>
            <option value="assault">{t('fir.assault')}</option>
            <option value="burglary">{t('fir.burglary')}</option>
            <option value="murder">{t('fir.murder')}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-tertiary mb-1">{t('fir.status')}</label>
          <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value })}
            className="w-full px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent bg-bg-card"
          >
            <option value="">{t('fir.allStatus')}</option>
            <option value="registered">{t('fir.registered')}</option>
            <option value="under_investigation">{t('fir.underInvestigation')}</option>
            <option value="charge_sheet_filed">{t('fir.chargeSheetFiled')}</option>
            <option value="closed">{t('fir.closed')}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-tertiary mb-1">{t('fir.severity')}</label>
          <select
            value={filters.severity}
            onChange={(e) => onChange({ severity: e.target.value })}
            className="w-full px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent bg-bg-card"
          >
            <option value="">{t('fir.allSeverity')}</option>
            <option value="critical">{t('status.critical')}</option>
            <option value="high">{t('status.high')}</option>
            <option value="medium">{t('status.medium')}</option>
            <option value="low">{t('status.low')}</option>
          </select>
        </div>
        <div className="relative">
          <label className="block text-xs font-medium text-text-tertiary mb-1">{t('fir.search')}</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => onChange({ searchQuery: e.target.value })}
              placeholder={t('fir.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onApply}
          className="px-4 py-2 bg-[rgba(0,212,255,0.15)] text-white text-sm font-medium rounded-lg hover:bg-[rgba(0,212,255,0.08)] transition-colors"
        >
          {t('common.search')}
        </button>
      </div>
    </div>
  );
}
