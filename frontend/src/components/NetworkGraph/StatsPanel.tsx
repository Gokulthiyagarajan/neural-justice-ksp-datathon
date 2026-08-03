import { X } from 'lucide-react';
import type { NetworkData, NetworkNode } from '@/types/network';
import { NODE_TYPE_STYLES } from '@/types/network';

interface StatsPanelProps {
  data: NetworkData;
  onClose: () => void;
  onNodeClick?: (node: NetworkNode) => void;
}

export function StatsPanel({ data, onClose, onNodeClick }: StatsPanelProps) {
  const { nodes, edges } = data;
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
  const density = maxPossibleEdges > 0 ? (edgeCount / maxPossibleEdges) : 0;

  // Count by type
  const typeCounts = new Map<string, number>();
  nodes.forEach((n) => {
    typeCounts.set(n.type, (typeCounts.get(n.type) || 0) + 1);
  });

  // Nodes involved in multiple FIRs (factual involvement, not risk scoring)
  const multiFir = nodes.filter((n) => (n.fir_count ?? 0) >= 2);

  // Top-degree nodes (top 5 by fir_count or just first 5 if no counts)
  const topNodes = [...nodes]
    .sort((a, b) => ((b.fir_count ?? b.evidence_count ?? 0) - (a.fir_count ?? a.evidence_count ?? 0)))
    .slice(0, 5);

  return (
    <div
      className="absolute top-16 right-4 z-20 overflow-hidden"
      style={{
        width: 240,
        borderRadius: '12px',
        background: 'rgba(11, 17, 32, 0.94)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-[12px] font-semibold" style={{ color: '#E8EAED' }}>Statistics</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors">
          <X className="w-3.5 h-3.5" style={{ color: '#5C6573' }} />
        </button>
      </div>

      <div className="px-3 py-2.5 max-h-72 overflow-y-auto space-y-3" style={{ scrollbarWidth: 'thin' }}>
        {/* Network overview */}
        <div className="grid grid-cols-3 gap-2">
          <MetricBox label="Nodes" value={nodeCount.toString()} color="#2B7FFF" />
          <MetricBox label="Edges" value={edgeCount.toString()} color="#8B5CF6" />
          <MetricBox label="Density" value={`${(density * 100).toFixed(1)}%`} color="#F59E0B" />
        </div>

        {multiFir.length > 0 && (
          <div className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg" style={{ background: 'rgba(43,127,255,0.1)', color: '#2B7FFF' }}>
            <span className="w-2 h-2 rounded-full bg-[#2B7FFF]" />
            {multiFir.length} multi-FIR entit{multiFir.length === 1 ? 'y' : 'ies'}
          </div>
        )}

        {/* Type breakdown */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#5C6573' }}>By Type</p>
          <div className="space-y-1">
            {[...typeCounts.entries()]
              .sort(([, a], [, b]) => b - a)
              .slice(0, 9)
              .map(([type, count]) => {
                const style = NODE_TYPE_STYLES[type as keyof typeof NODE_TYPE_STYLES];
                return (
                  <div key={type} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: style?.color || '#5F6368', opacity: 0.8 }} />
                      <span style={{ color: '#94A3B8' }}>{style?.label || type}</span>
                    </div>
                    <span style={{ color: '#E8EAED' }}>{count}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Top entities */}
        {topNodes.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#5C6573' }}>Top Connected</p>
            <div className="space-y-1">
              {topNodes.map((n) => {
                const style = NODE_TYPE_STYLES[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => onNodeClick?.(n)}
                    className="flex items-center gap-1.5 w-full text-left text-[11px] px-1.5 py-1 rounded hover:bg-white/10 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: style?.color || '#5F6368', opacity: 0.8 }} />
                    <span className="truncate flex-1" style={{ color: '#94A3B8' }}>{n.label}</span>
                    <span style={{ color: '#5C6573' }}>{n.fir_count ?? ''}{n.evidence_count ? `·${n.evidence_count}` : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center px-1 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <p className="text-[16px] font-bold font-mono" style={{ color }}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: '#5C6573' }}>{label}</p>
    </div>
  );
}
