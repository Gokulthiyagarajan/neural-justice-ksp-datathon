import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GeoLegendProps {
  onFilterChange: (category: string, value: string) => void;
}

const crimeCategories = [
  {
    name: 'Theft',
    color: '#3b82f6',
    count: 42
  },
  {
    name: 'Assault',
    color: '#ef4444',
    count: 28
  },
  {
    name: 'Fraud',
    color: '#10b981',
    count: 35
  },
  {
    name: 'Robbery',
    color: '#f59e0b',
    count: 15
  },
  {
    name: 'Vandalism',
    color: '#8b5cf6',
    count: 22
  },
];

const severityLevels = [
  { name: 'Low', color: '#10b981', description: 'Minor incidents' },
  { name: 'Medium', color: '#f59e0b', description: 'Moderate incidents' },
  { name: 'High', color: '#ef4444', description: 'Serious incidents' },
  { name: 'Critical', color: '#7f1d1d', description: 'Emergency response required' },
];

export function GeoLegend({ onFilterChange }: GeoLegendProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCategories = crimeCategories.filter(cat => 
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`absolute bottom-4 right-4 z-50 bg-bg-card/90 backdrop-blur-sm rounded-xl p-4 border border-border-primary/50 shadow-lg max-w-xs transition-all duration-300 ${expanded ? 'max-h-[500px]' : 'max-h-12'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">
          {t('geo.legend')}
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-hover-bg transition-colors"
          aria-label={expanded ? 'Collapse legend' : 'Expand legend'}
        >
          <ChevronDown size={16} className={`text-text-primary transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded && (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder={t('geo.search_categories')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-bg-secondary border border-border-primary text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-nj-info/40"
            />
          </div>

          {/* Crime Categories */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              {t('geo.crime_categories')}
            </h4>
            <div className="space-y-2">
              {filteredCategories.map((category) => (
                <div
                  key={category.name}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-hover-bg/50 cursor-pointer transition-colors"
                  onClick={() => onFilterChange('crime', category.name.toLowerCase())}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="text-sm text-text-primary flex-1">{category.name}</span>
                  <span className="text-xs text-text-secondary">({category.count})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Severity Levels */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              {t('geo.severity_levels')}
            </h4>
            <div className="space-y-2">
              {severityLevels.map((level) => (
                <div
                  key={level.name}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-hover-bg/50 cursor-pointer transition-colors"
                  onClick={() => onFilterChange('severity', level.name.toLowerCase())}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: level.color }} />
                  <span className="text-sm text-text-primary flex-1">{level.name}</span>
                  <span className="text-xs text-text-secondary" title={level.description}>{level.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => onFilterChange('clear', '')}
            className="w-full py-2 text-sm text-nj-info hover:bg-nj-info/10 rounded-lg transition-colors"
          >
            {t('geo.clear_filters')}
          </button>
        </div>
      )}
    </div>
  );
}