import { X, RotateCcw } from 'lucide-react';
import type { GraphFilters, NodeType, EdgeType } from '@/types/network';
import { NODE_TYPE_STYLES, EDGE_TYPE_STYLES, DEFAULT_FILTERS } from '@/types/network';

interface FilterPanelProps {
  filters: GraphFilters;
  onChange: (filters: GraphFilters) => void;
  onClose: () => void;
}

export function FilterPanel({ filters, onChange, onClose }: FilterPanelProps) {
  const nodeEntries = Object.entries(NODE_TYPE_STYLES) as [NodeType, typeof NODE_TYPE_STYLES[NodeType]][];
  const edgeEntries = Object.entries(EDGE_TYPE_STYLES) as [EdgeType, typeof EDGE_TYPE_STYLES[EdgeType]][];

  const toggleNodeType = (type: NodeType) => {
    const exists = filters.nodeTypes.includes(type);
    const updated = exists
      ? filters.nodeTypes.filter((t) => t !== type)
      : [...filters.nodeTypes, type];
    onChange({ ...filters, nodeTypes: updated.length === 0 ? [type] : updated });
  };

  const toggleEdgeType = (type: EdgeType) => {
    const exists = filters.edgeTypes.includes(type);
    const updated = exists
      ? filters.edgeTypes.filter((t) => t !== type)
      : [...filters.edgeTypes, type];
    onChange({ ...filters, edgeTypes: updated.length === 0 ? [type] : updated });
  };

  const reset = () => onChange(DEFAULT_FILTERS);

  return (
    <div
      className="absolute top-16 left-4 z-20 overflow-hidden"
      style={{
        width: 260,
        borderRadius: '12px',
        background: 'rgba(11, 17, 32, 0.94)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-[12px] font-semibold" style={{ color: '#E8EAED' }}>Filters</span>
        <div className="flex items-center gap-1">
          <button onClick={reset} className="p-1 rounded hover:bg-white/10 transition-colors" title="Reset filters">
            <RotateCcw className="w-3.5 h-3.5" style={{ color: '#5C6573' }} />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors">
            <X className="w-3.5 h-3.5" style={{ color: '#5C6573' }} />
          </button>
        </div>
      </div>

      <div className="px-3 py-2.5 max-h-80 overflow-y-auto space-y-4" style={{ scrollbarWidth: 'thin' }}>
        {/* ── Risk score range ────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#5C6573' }}>
            Risk Score: {filters.minRisk}–{filters.maxRisk}
          </p>
          <div className="flex gap-2 items-center">
            <input
              type="range"
              min={0}
              max={100}
              value={filters.minRisk}
              onChange={(e) => {
                const v = Math.min(Number(e.target.value), filters.maxRisk);
                onChange({ ...filters, minRisk: v });
              }}
              className="w-full h-1 rounded appearance-none cursor-pointer"
              style={{ accentColor: '#FF3366', background: 'rgba(255,255,255,0.1)' }}
            />
          </div>
          <div className="flex gap-2 items-center mt-1">
            <input
              type="range"
              min={0}
              max={100}
              value={filters.maxRisk}
              onChange={(e) => {
                const v = Math.max(Number(e.target.value), filters.minRisk);
                onChange({ ...filters, maxRisk: v });
              }}
              className="w-full h-1 rounded appearance-none cursor-pointer"
              style={{ accentColor: '#FF3366', background: 'rgba(255,255,255,0.1)' }}
            />
          </div>
        </div>

        {/* ── Min connections ─────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#5C6573' }}>
            Min Connections: {filters.minConnections}
          </p>
          <input
            type="range"
            min={0}
            max={20}
            value={filters.minConnections}
            onChange={(e) => onChange({ ...filters, minConnections: Number(e.target.value) })}
            className="w-full h-1 rounded appearance-none cursor-pointer"
            style={{ accentColor: '#F59E0B', background: 'rgba(255,255,255,0.1)' }}
          />
        </div>

        {/* ── Node type filter ─────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#5C6573' }}>Entity Types</p>
          <div className="flex flex-wrap gap-1.5">
            {nodeEntries.map(([type, style]) => {
              const active = filters.nodeTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleNodeType(type)}
                  className="px-2 py-1 rounded-full text-[10px] font-medium transition-all duration-150"
                  style={{
                    background: active ? `${style.color}20` : 'rgba(255,255,255,0.04)',
                    color: active ? style.color : '#5C6573',
                    border: `1px solid ${active ? style.color + '40' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {style.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Edge type filter ─────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#5C6573' }}>Relationship Types</p>
          <div className="flex flex-wrap gap-1.5">
            {edgeEntries.map(([type, style]) => {
              const active = filters.edgeTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleEdgeType(type)}
                  className="px-2 py-1 rounded-full text-[10px] font-medium transition-all duration-150"
                  style={{
                    background: active ? `${style.color}20` : 'rgba(255,255,255,0.04)',
                    color: active ? style.color : '#5C6573',
                    border: `1px solid ${active ? style.color + '40' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {style.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
