import { useState, useMemo } from 'react';
import { Layers, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { LAYER_REGISTRY, getLayersByCategory } from './layerRegistry';
import type { LayerCategory } from '@/types/geo';

interface LayerPanelProps {
  visibleLayers: Record<string, boolean>;
  onLayerToggle: (layerId: string, visible: boolean) => void;
}

const categories: LayerCategory[] = [
  'Base Map', 'Crime Data', 'Analysis', 'Hotspots', 'Alerts', 'Response', 'Replay',
];

export function LayerPanel({ visibleLayers, onLayerToggle }: LayerPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Base Map': true,
    'Crime Data': true,
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const visibleCount = useMemo(
    () => LAYER_REGISTRY.filter((l) => visibleLayers[l.id] ?? l.visibleByDefault).length,
    [visibleLayers]
  );
  const totalCount = LAYER_REGISTRY.length;

  const handleShowAll = () => {
    LAYER_REGISTRY.forEach((l) => {
      if (!visibleLayers[l.id]) onLayerToggle(l.id, true);
    });
  };

  const handleHideAll = () => {
    LAYER_REGISTRY.forEach((l) => {
      if (visibleLayers[l.id]) onLayerToggle(l.id, false);
    });
  };

  return (
    <div className="glass rounded-xl shadow-lg w-64 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-border-secondary shrink-0"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
          <span className="text-sm font-semibold text-text-primary">Layers</span>
          <span className="text-xs text-text-tertiary font-normal">
            {visibleCount}/{totalCount}
          </span>
        </div>
        {collapsed ? <ChevronRight className="w-4 h-4 text-text-tertiary" /> : <ChevronDown className="w-4 h-4 text-text-tertiary" />}
      </button>

      {!collapsed && (
        <div className="p-2 space-y-1 overflow-y-auto flex-1">
          <div className="flex gap-2 px-2 pb-2 border-b border-border-secondary shrink-0">
            <button
              onClick={handleShowAll}
              className="flex-1 text-xs px-2 py-1 rounded bg-[rgba(0,212,255,0.15)] text-white hover:bg-[rgba(0,212,255,0.25)] transition-colors"
            >
              Show All
            </button>
            <button
              onClick={handleHideAll}
              className="flex-1 text-xs px-2 py-1 rounded bg-bg-tertiary text-text-secondary hover:bg-hover-bg transition-colors"
            >
              Hide All
            </button>
          </div>

          {categories.map((cat) => {
            const layers = getLayersByCategory(cat);
            const catVisible = layers.filter((l) => visibleLayers[l.id]).length;
            const isExpanded = expandedCategories[cat];

            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-hover-bg text-xs"
                >
                  <div className="flex items-center gap-1">
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-text-tertiary" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-text-tertiary" />
                    )}
                    <span className="font-medium text-text-primary">{cat}</span>
                    <span className="text-text-tertiary ml-1">({catVisible})</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="ml-3 space-y-0.5">
                    {layers.map((layer) => {
                      const isVisible = visibleLayers[layer.id] ?? layer.visibleByDefault;
                      return (
                        <label
                          key={layer.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-hover-bg cursor-pointer"
                        >
                          <button
                            onClick={() => onLayerToggle(layer.id, !isVisible)}
                            className={`p-0.5 rounded transition-colors ${
                              isVisible ? 'text-[var(--accent-cyan)]' : 'text-text-secondary'
                            }`}
                          >
                            {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <span className="text-xs text-text-secondary select-none">{layer.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
