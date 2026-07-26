import { useState } from 'react';
import { ChevronRight, ChevronDown, Eye, EyeOff, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LayerGroup {
  id: string;
  name: string;
  count: number;
  layers: Array<{
    id: string;
    name: string;
    visible: boolean;
    type: 'crime' | 'patrol' | 'hotspot' | 'boundary';
  }>;
}

interface GeoLayersDrawerProps {
  onLayerToggle: (layerId: string, visible: boolean) => void;
  onLayerSearch: (query: string) => void;
}

const layerGroups: LayerGroup[] = [
  {
    id: 'crime',
    name: 'Crime Data',
    count: 8,
    layers: [
      { id: 'theft', name: 'Theft Incidents', visible: true, type: 'crime' },
      { id: 'assault', name: 'Assault Incidents', visible: true, type: 'crime' },
      { id: 'fraud', name: 'Fraud Incidents', visible: false, type: 'crime' },
      { id: 'robbery', name: 'Robbery Incidents', visible: true, type: 'crime' },
      { id: 'vandalism', name: 'Vandalism Incidents', visible: false, type: 'crime' },
      { id: 'drugs', name: 'Drug Related', visible: false, type: 'crime' },
      { id: 'traffic', name: 'Traffic Violations', visible: true, type: 'crime' },
      { id: 'cyber', name: 'Cyber Crimes', visible: false, type: 'crime' },
    ],
  },
  {
    id: 'patrol',
    name: 'Patrol Routes',
    count: 4,
    layers: [
      { id: 'beat1', name: 'Beat 1 - Central', visible: true, type: 'patrol' },
      { id: 'beat2', name: 'Beat 2 - North', visible: false, type: 'patrol' },
      { id: 'beat3', name: 'Beat 3 - South', visible: true, type: 'patrol' },
      { id: 'beat4', name: 'Beat 4 - East', visible: false, type: 'patrol' },
    ],
  },
  {
    id: 'hotspot',
    name: 'Hotspot Analysis',
    count: 3,
    layers: [
      { id: 'daily', name: 'Daily Hotspots', visible: true, type: 'hotspot' },
      { id: 'weekly', name: 'Weekly Hotspots', visible: false, type: 'hotspot' },
      { id: 'monthly', name: 'Monthly Hotspots', visible: false, type: 'hotspot' },
    ],
  },
  {
    id: 'boundary',
    name: 'Administrative Boundaries',
    count: 2,
    layers: [
      { id: 'district', name: 'District Boundaries', visible: true, type: 'boundary' },
      { id: 'station', name: 'Station Boundaries', visible: false, type: 'boundary' },
    ],
  },
];

export function GeoLayersDrawer({ onLayerToggle, onLayerSearch }: GeoLayersDrawerProps) {
  const { t } = useTranslation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    crime: true,
    patrol: false,
    hotspot: false,
    boundary: false,
  });
  const [searchQuery, setSearchQuery] = useState('');

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const filteredGroups = layerGroups.map(group => ({
    ...group,
    layers: group.layers.filter(layer => 
      layer.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(group => group.layers.length > 0);

  return (
    <div className="w-64 bg-bg-card rounded-xl p-4 border border-border-primary/50 shadow-lg">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-primary">{t('geo.layers')}</h2>
        <p className="text-sm text-text-secondary">{t('geo.manage_layers')}</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          type="text"
          placeholder={t('geo.search_layers')}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            onLayerSearch(e.target.value);
          }}
          className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-bg-secondary border border-border-primary text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-nj-info/40"
        />
      </div>

      {/* Layer Groups */}
      <div className="space-y-2">
        {filteredGroups.map((group) => (
          <div key={group.id} className="space-y-2">
            {/* Group Header */}
            <div
              className="flex items-center justify-between p-2 rounded-lg hover:bg-hover-bg cursor-pointer transition-colors"
              onClick={() => toggleGroup(group.id)}
            >
              <div className="flex items-center gap-2">
                {expandedGroups[group.id] ? <ChevronDown size={16} className="text-text-primary" /> : <ChevronRight size={16} className="text-text-primary" />}
                <span className="font-medium text-text-primary">{group.name}</span>
              </div>
              <span className="text-xs text-text-secondary bg-bg-tertiary px-2 py-1 rounded-full">{group.count}</span>
            </div>

            {/* Group Layers */}
            {expandedGroups[group.id] && (
              <div className="space-y-1 ml-4">
                {group.layers.map((layer) => (
                  <div
                    key={layer.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-hover-bg/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onLayerToggle(layer.id, !layer.visible)}
                        className="p-1 rounded hover:bg-hover-bg transition-colors"
                        aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                      >
                        {layer.visible ? (
                          <Eye size={14} className="text-nj-info" />
                        ) : (
                          <EyeOff size={14} className="text-text-secondary" />
                        )}
                      </button>
                      <span className="text-sm text-text-primary">{layer.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${layer.type === 'crime' ? 'bg-nj-critical/20 text-nj-critical' : layer.type === 'patrol' ? 'bg-nj-info/20 text-nj-info' : layer.type === 'hotspot' ? 'bg-nj-warning/20 text-nj-warning' : 'bg-text-secondary/20 text-text-secondary'}`}>
                      {layer.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-border-primary/30 space-y-2">
        <button
          onClick={() => {
            layerGroups.forEach(group => {
              group.layers.forEach(layer => onLayerToggle(layer.id, true));
            });
          }}
          className="w-full py-2 text-sm text-nj-success hover:bg-nj-success/10 rounded-lg transition-colors"
        >
          {t('geo.show_all')}
        </button>
        <button
          onClick={() => {
            layerGroups.forEach(group => {
              group.layers.forEach(layer => onLayerToggle(layer.id, false));
            });
          }}
          className="w-full py-2 text-sm text-nj-critical hover:bg-nj-critical/10 rounded-lg transition-colors"
        >
          {t('geo.hide_all')}
        </button>
      </div>
    </div>
  );
}