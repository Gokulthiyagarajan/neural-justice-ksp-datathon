import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { NetworkData } from '@/types/network';
import { NODE_TYPE_STYLES } from '@/types/network';

interface MinimapProps {
  data: NetworkData;
  /** Reference to the main Cytoscape instance for viewport sync */
  mainCy?: cytoscape.Core | null;
}

export function Minimap({ data, mainCy }: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const miniCyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements = [
      ...data.nodes.map((n) => ({
        group: 'nodes' as const,
        data: { id: n.id, type: n.type, risk_score: n.risk_score },
      })),
      ...data.edges.map((e) => ({
        group: 'edges' as const,
        data: { id: `e-${e.source}-${e.target}`, source: e.source, target: e.target },
      })),
    ];

    const miniCy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#5F6368',
            width: 4,
            height: 4,
            label: '',
            'border-width': 0,
          } as any,
        },
        ...Object.entries(NODE_TYPE_STYLES).map(([type, s]) => ({
          selector: `node[type = "${type}"]`,
          style: { 'background-color': s.color, 'background-opacity': 0.7 } as any,
        })),
        {
          selector: 'edge',
          style: {
            width: 0.5,
            'line-color': 'rgba(255,255,255,0.08)',
            'curve-style': 'straight',
          } as any,
        },
      ],
      layout: { name: 'preset' } as unknown as cytoscape.LayoutOptions,
      userZoomingEnabled: false,
      userPanningEnabled: false,
      boxSelectionEnabled: false,
      autoungrabify: true,
      autounselectify: true,
    });

    miniCy.fit(undefined, 5);
    miniCyRef.current = miniCy;

    // Sync viewport indicator
    const syncViewport = () => {
      if (!mainCy || !miniCy) return;
      // Remove old viewport indicator
      miniCy.$('.viewport-indicator').removeClass('viewport-indicator');
      // Highlight visible nodes
      const mainExtent = mainCy.extent();
      miniCy.nodes().forEach((n) => {
        const pos = n.position();
        const inView = pos.x >= mainExtent.x1 && pos.x <= mainExtent.x2
          && pos.y >= mainExtent.y1 && pos.y <= mainExtent.y2;
        if (inView) {
          n.addClass('viewport-indicator');
        } else {
          n.removeClass('viewport-indicator');
        }
      });
    };

    if (mainCy) {
      mainCy.on('pan zoom', syncViewport);
      setTimeout(syncViewport, 500);
    }

    return () => {
      if (mainCy) mainCy.off('pan zoom', syncViewport);
      miniCy.destroy();
      miniCyRef.current = null;
    };
  }, [data, mainCy]);

  return (
    <div
      ref={containerRef}
      style={{
        width: 160,
        height: 120,
        borderRadius: 8,
        background: 'rgba(11, 17, 32, 0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    />
  );
}
