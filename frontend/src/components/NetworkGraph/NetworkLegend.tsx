import { X } from 'lucide-react';
import type { NodeType, EdgeType } from '@/types/network';
import { NODE_TYPE_STYLES, EDGE_TYPE_STYLES } from '@/types/network';

interface NetworkLegendProps {
  onClose: () => void;
}

export function NetworkLegend({ onClose }: NetworkLegendProps) {
  const nodeEntries = Object.entries(NODE_TYPE_STYLES) as [NodeType, typeof NODE_TYPE_STYLES[NodeType]][];
  const edgeEntries = Object.entries(EDGE_TYPE_STYLES) as [EdgeType, typeof EDGE_TYPE_STYLES[EdgeType]][];

  return (
    <div
      className="absolute bottom-4 right-4 z-20 overflow-hidden"
      style={{
        width: 220,
        borderRadius: '12px',
        background: 'rgba(11, 17, 32, 0.92)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-[12px] font-semibold" style={{ color: '#E8EAED' }}>Legend</span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-white/10 transition-colors">
          <X className="w-3.5 h-3.5" style={{ color: '#5C6573' }} />
        </button>
      </div>

      <div className="px-3 py-2.5 max-h-60 overflow-y-auto space-y-3" style={{ scrollbarWidth: 'thin' }}>
        {/* Node types */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#5C6573' }}>Entities</p>
          <div className="space-y-1">
            {nodeEntries.map(([type, style]) => (
              <div key={type} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0 border"
                  style={{
                    background: style.color,
                    borderColor: style.color,
                    opacity: 0.85,
                  }}
                />
                <span className="text-[11px]" style={{ color: '#94A3B8' }}>{style.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Edge types */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#5C6573' }}>Relationships</p>
          <div className="space-y-1">
            {edgeEntries.map(([type, style]) => (
              <div key={type} className="flex items-center gap-2">
                <div className="flex items-center w-5 shrink-0">
                  <div
                    className="h-0.5 w-full"
                    style={{
                      background: style.color,
                      borderTop: style.dash ? `1px dashed ${style.color}` : undefined,
                      height: style.dash ? 0 : 2,
                    }}
                  />
                </div>
                <span className="text-[11px]" style={{ color: '#94A3B8' }}>{style.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
