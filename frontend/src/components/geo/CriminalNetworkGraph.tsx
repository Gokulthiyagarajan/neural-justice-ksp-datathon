import { X, Users, AlertTriangle } from 'lucide-react';
import type { Hotspot } from '@/types/geo';

interface CriminalNetworkGraphProps {
  hotspot: Hotspot;
  onClose: () => void;
}

export function CriminalNetworkGraph({ hotspot, onClose }: CriminalNetworkGraphProps) {
  const associates =
    hotspot.related_criminals && hotspot.related_criminals.length > 0
      ? hotspot.related_criminals
      : Array.from({ length: Math.min(hotspot.fir_count, 6) }, (_, i) => `Associate ${i + 1}`);

  const center = { x: 200, y: 160 };
  const radius = 110;
  const nodes = associates.map((name, i) => {
    const angle = (i / Math.max(associates.length, 1)) * Math.PI * 2;
    return {
      id: i,
      name,
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-bg-card rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: '#8B5CF6' }} />
            <h3 className="text-base font-semibold text-text-primary">Criminal Network</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-hover-bg">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="bg-bg-tertiary rounded-lg p-2 text-center mb-3">
            <p className="text-xs text-text-tertiary">
              {hotspot.crime_category} · {hotspot.fir_count} related FIRs
            </p>
          </div>

          <svg viewBox="0 0 400 320" className="w-full h-64 bg-bg-tertiary rounded-lg">
            {nodes.map((n) => (
              <line
                key={`e-${n.id}`}
                x1={center.x}
                y1={center.y}
                x2={n.x}
                y2={n.y}
                stroke="#C4B5FD"
                strokeWidth={1.5}
              />
            ))}
            {nodes.map((n) => (
              <g key={`n-${n.id}`}>
                <circle cx={n.x} cy={n.y} r={14} fill="#8B5CF6" />
                <text x={n.x} y={n.y + 3} textAnchor="middle" fontSize={10} fill="#fff" fontWeight="bold">
                  {(n.name || '?').toString().charAt(0)}
                </text>
                <text x={n.x} y={n.y + 26} textAnchor="middle" fontSize={9} fill="var(--text-tertiary)">
                  {n.name}
                </text>
              </g>
            ))}
            <circle cx={center.x} cy={center.y} r={20} fill="var(--alert-red)" />
            <text x={center.x} y={center.y + 4} textAnchor="middle" fontSize={10} fill="#fff" fontWeight="bold">
              H
            </text>
          </svg>

          <div className="flex items-center gap-2 mt-3 text-xs text-text-tertiary">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Network graph is indicative and requires analyst verification.
          </div>
        </div>
      </div>
    </div>
  );
}
