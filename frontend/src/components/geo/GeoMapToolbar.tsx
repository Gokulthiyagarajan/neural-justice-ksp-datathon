import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Ruler, PenTool, LocateFixed, Layers, Flame, BarChart3 } from 'lucide-react';

interface GeoMapToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFullscreen: () => void;
  onMeasure: () => void;
  onDraw: () => void;
  onLocate: () => void;
  onLayers: () => void;
  onHeatmapToggle: () => void;
  heatmapActive: boolean;
}

export function GeoMapToolbar(props: GeoMapToolbarProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  return (
    <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
      {/* Map Controls */}
      <div className="flex flex-col gap-1 bg-bg-card/90 backdrop-blur-sm rounded-xl p-2 border border-border-primary/50 shadow-lg">
        <button
          onClick={props.onZoomIn}
          className="p-2 rounded-lg hover:bg-hover-bg transition-colors text-text-primary"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={props.onZoomOut}
          className="p-2 rounded-lg hover:bg-hover-bg transition-colors text-text-primary"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={props.onFullscreen}
          className="p-2 rounded-lg hover:bg-hover-bg transition-colors text-text-primary"
          title="Fullscreen"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {/* Measurement Tools */}
      <div className="flex flex-col gap-1 bg-bg-card/90 backdrop-blur-sm rounded-xl p-2 border border-border-primary/50 shadow-lg">
        <button
          onClick={() => {
            props.onMeasure();
            setActiveTool(activeTool === 'measure' ? null : 'measure');
          }}
          className={`p-2 rounded-lg hover:bg-hover-bg transition-colors ${activeTool === 'measure' ? 'bg-nj-info/20 text-nj-info' : 'text-text-primary'}`}
          title="Measure Distance"
        >
          <Ruler size={18} />
        </button>
        <button
          onClick={() => {
            props.onDraw();
            setActiveTool(activeTool === 'draw' ? null : 'draw');
          }}
          className={`p-2 rounded-lg hover:bg-hover-bg transition-colors ${activeTool === 'draw' ? 'bg-nj-info/20 text-nj-info' : 'text-text-primary'}`}
          title="Draw on Map"
        >
          <PenTool size={18} />
        </button>
      </div>

      {/* Location & Layers */}
      <div className="flex flex-col gap-1 bg-bg-card/90 backdrop-blur-sm rounded-xl p-2 border border-border-primary/50 shadow-lg">
        <button
          onClick={props.onLocate}
          className="p-2 rounded-lg hover:bg-hover-bg transition-colors text-text-primary"
          title="Locate Me"
        >
          <LocateFixed size={18} />
        </button>
        <button
          onClick={props.onLayers}
          className="p-2 rounded-lg hover:bg-hover-bg transition-colors text-text-primary"
          title="Layers"
        >
          <Layers size={18} />
        </button>
        <button
          onClick={props.onHeatmapToggle}
          className={`p-2 rounded-lg hover:bg-hover-bg transition-colors ${props.heatmapActive ? 'bg-nj-critical/20 text-nj-critical' : 'text-text-primary'}`}
          title="Heatmap"
        >
          <Flame size={18} />
        </button>
      </div>

      {/* Crime Stats */}
      <div className="flex flex-col gap-1 bg-bg-card/90 backdrop-blur-sm rounded-xl p-2 border border-border-primary/50 shadow-lg">
        <button
          className="p-2 rounded-lg hover:bg-hover-bg transition-colors text-text-primary"
          title="Crime Statistics"
        >
          <BarChart3 size={18} />
        </button>
      </div>
    </div>
  );
}