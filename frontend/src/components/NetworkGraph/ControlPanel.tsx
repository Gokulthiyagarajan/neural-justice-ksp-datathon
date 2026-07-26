import { ZoomIn, ZoomOut, Maximize2, LayoutGrid, Layers, Filter, BarChart3, Brain, Shield } from 'lucide-react';
import { useRef } from 'react';
import type { LayoutName } from '@/types/network';

interface ControlPanelProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onLayoutChange: (name: string) => void;
  currentLayout?: string;
  /** Toggle legend overlay visibility */
  legendOpen: boolean;
  onLegendToggle: () => void;
  /** Toggle filter panel visibility */
  filterOpen: boolean;
  onFilterToggle: () => void;
  /** Toggle stats panel visibility */
  statsOpen: boolean;
  onStatsToggle: () => void;
  intelligenceOpen: boolean;
  onIntelligenceToggle: () => void;
  syndicatesOpen: boolean;
  onSyndicatesToggle: () => void;
}

const LAYOUT_OPTIONS: { value: LayoutName; label: string; icon: string }[] = [
  { value: 'cose', label: 'Force-Directed', icon: '⟐' },
  { value: 'cose-bilkent', label: 'Bilkent', icon: '⟐' },
  { value: 'circle', label: 'Circular', icon: '◯' },
  { value: 'concentric', label: 'Concentric', icon: '◎' },
  { value: 'breadthfirst', label: 'Hierarchical', icon: '⬇' },
  { value: 'grid', label: 'Grid', icon: '⊞' },
  { value: 'spread', label: 'Spread', icon: '⤢' },
];

export function ControlPanel({
  onZoomIn, onZoomOut, onFit, onLayoutChange, currentLayout = 'cose',
  legendOpen, onLegendToggle, filterOpen, onFilterToggle, statsOpen, onStatsToggle,
  intelligenceOpen, onIntelligenceToggle, syndicatesOpen, onSyndicatesToggle,
}: ControlPanelProps) {
  const selectRef = useRef<HTMLSelectElement>(null);

  const btnClass =
    'w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150 cursor-pointer hover:bg-white/10 active:scale-95';

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1.5 absolute top-4 left-4 z-20"
      style={{
        borderRadius: '12px',
        background: 'rgba(11, 17, 32, 0.88)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* ── Zoom controls ──────────────────────────────────────────────── */}
      <button onClick={onZoomIn} className={btnClass} title="Zoom In" aria-label="Zoom In">
        <ZoomIn className="w-4 h-4" style={{ color: '#94A3B8' }} />
      </button>
      <button onClick={onZoomOut} className={btnClass} title="Zoom Out" aria-label="Zoom Out">
        <ZoomOut className="w-4 h-4" style={{ color: '#94A3B8' }} />
      </button>
      <button onClick={onFit} className={btnClass} title="Fit to Screen" aria-label="Fit to Screen">
        <Maximize2 className="w-4 h-4" style={{ color: '#94A3B8' }} />
      </button>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="w-px h-6 mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} />

      {/* ── Layout switcher ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-1">
        <LayoutGrid className="w-3.5 h-3.5 shrink-0" style={{ color: '#5C6573' }} />
        <select
          ref={selectRef}
          value={currentLayout}
          onChange={(e) => onLayoutChange(e.target.value)}
          className="text-[11px] bg-transparent border-none outline-none cursor-pointer py-1 rounded appearance-none"
          style={{ color: '#94A3B8', paddingRight: 12, backgroundImage: 'none' }}
          aria-label="Graph Layout"
        >
          {LAYOUT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ background: '#0B1120', color: '#E8EAED' }}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="w-px h-6 mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} />

      {/* ── Panel toggles ───────────────────────────────────────────────── */}
      <button
        onClick={onLegendToggle}
        className={`${btnClass} ${legendOpen ? 'bg-white/15' : ''}`}
        title="Legend"
        aria-label="Toggle Legend"
      >
        <Layers className={`w-4 h-4 ${legendOpen ? 'text-[#F59E0B]' : ''}`} style={{ color: legendOpen ? undefined : '#94A3B8' }} />
      </button>
      <button
        onClick={onFilterToggle}
        className={`${btnClass} ${filterOpen ? 'bg-white/15' : ''}`}
        title="Filters"
        aria-label="Toggle Filters"
      >
        <Filter className={`w-4 h-4 ${filterOpen ? 'text-[#F59E0B]' : ''}`} style={{ color: filterOpen ? undefined : '#94A3B8' }} />
      </button>
      <button
        onClick={onStatsToggle}
        className={`${btnClass} ${statsOpen ? 'bg-white/15' : ''}`}
        title="Statistics"
        aria-label="Toggle Statistics"
      >
        <BarChart3 className={`w-4 h-4 ${statsOpen ? 'text-[#F59E0B]' : ''}`} style={{ color: statsOpen ? undefined : '#94A3B8' }} />
      </button>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="w-px h-6 mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} />

      {/* ── Intelligence panels ──────────────────────────────────────────── */}
      <button
        onClick={onIntelligenceToggle}
        className={`${btnClass} ${intelligenceOpen ? 'bg-white/15' : ''}`}
        title="AI Intelligence"
        aria-label="Toggle AI Intelligence"
      >
        <Brain className={`w-4 h-4 ${intelligenceOpen ? 'text-[#2B7FFF]' : ''}`} style={{ color: intelligenceOpen ? undefined : '#94A3B8' }} />
      </button>
      <button
        onClick={onSyndicatesToggle}
        className={`${btnClass} ${syndicatesOpen ? 'bg-white/15' : ''}`}
        title="Active Syndicates"
        aria-label="Toggle Active Syndicates"
      >
        <Shield className={`w-4 h-4 ${syndicatesOpen ? 'text-[#FF3366]' : ''}`} style={{ color: syndicatesOpen ? undefined : '#94A3B8' }} />
      </button>
    </div>
  );
}
