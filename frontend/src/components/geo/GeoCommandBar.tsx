import { useState } from 'react';
import { Search, RefreshCw, Download, Brain, LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GeoCommandBarProps {
  onSearch: (query: string) => void;
  onDistrictChange: (district: string) => void;
  onDateRangeChange: (range: string) => void;
  onCrimeFilterChange: (filter: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  onAIAnalysis: () => void;
  district: string;
  dateRange: string;
  crimeFilter: string;
}

const districts = [
  'BENGALURU_URBAN',
  'BENGALURU_RURAL',
  'MYSORE',
  'MANGALORE',
  'HUBLI_DHARWAD',
  'DAVANGERE',
  'BELGAUM',
  'GULBARGA',
  'SHIMOGA',
  'UDUPI',
];

const dateRanges = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

const crimeFilters = [
  { value: 'all', label: 'All Crimes' },
  { value: 'theft', label: 'Theft' },
  { value: 'assault', label: 'Assault' },
  { value: 'fraud', label: 'Fraud' },
  { value: 'robbery', label: 'Robbery' },
  { value: 'other', label: 'Other' },
];

export function GeoCommandBar(props: GeoCommandBarProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    props.onSearch(searchQuery);
  };

  return (
    <div className="flex items-center gap-3 mb-4">
      {/* District Selector */}
      <div className="relative">
        <select
          value={props.district}
          onChange={(e) => props.onDistrictChange(e.target.value)}
          className="px-4 py-2 rounded-lg bg-bg-card border border-border-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-nj-info/40"
        >
          {districts.map((district) => (
            <option key={district} value={district}>
              {district.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Date Range Selector */}
      <div className="relative">
        <select
          value={props.dateRange}
          onChange={(e) => props.onDateRangeChange(e.target.value)}
          className="px-4 py-2 rounded-lg bg-bg-card border border-border-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-nj-info/40"
        >
          {dateRanges.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </div>

      {/* Crime Filter Selector */}
      <div className="relative">
        <select
          value={props.crimeFilter}
          onChange={(e) => props.onCrimeFilterChange(e.target.value)}
          className="px-4 py-2 rounded-lg bg-bg-card border border-border-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-nj-info/40"
        >
          {crimeFilters.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          type="text"
          placeholder={t('geo.search_placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-bg-card border border-border-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-nj-info/40"
        />
      </form>

      {/* Action Buttons */}
      <button
        onClick={props.onRefresh}
        className="p-2 rounded-lg bg-bg-card border border-border-primary hover:bg-hover-bg transition-colors"
        title={t('geo.refresh')}
      >
        <RefreshCw size={16} className="text-text-primary" />
      </button>

      <button
        onClick={props.onExport}
        className="p-2 rounded-lg bg-bg-card border border-border-primary hover:bg-hover-bg transition-colors"
        title={t('geo.export')}
      >
        <Download size={16} className="text-text-primary" />
      </button>

      <button
        onClick={props.onAIAnalysis}
        className="p-2 rounded-lg bg-bg-card border border-border-primary hover:bg-hover-bg transition-colors"
        title={t('geo.ai_analysis')}
      >
        <Brain size={16} className="text-nj-info" />
      </button>

      {/* Toggle Panel Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="p-2 rounded-lg bg-bg-card border border-border-primary hover:bg-hover-bg transition-colors"
        title={expanded ? t('geo.collapse') : t('geo.expand')}
      >
        <LayoutGrid size={16} className={expanded ? 'text-nj-info' : 'text-text-primary'} />
      </button>
    </div>
  );
}