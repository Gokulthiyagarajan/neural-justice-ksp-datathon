import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import cytoscape from 'cytoscape';
import type { NetworkData, NetworkNode, NetworkEdge, NodeType, EdgeType } from '@/types/network';
import { NODE_TYPE_STYLES, EDGE_TYPE_STYLES } from '@/types/network';
import type { GraphFilters } from '@/types/network';

// ─── Theme-aware colors ────────────────────────────────────────────────────
const THEME_COLORS = {
  dark: {
    bg: '#0B1120',
    bgGrid: '#12182B',
    gridLine: 'rgba(255,255,255,0.03)',
    text: '#E8EAED',
    textSecondary: '#9AA0A6',
    border: '#1E293B',
    edgeDefault: '#5F6368',
    nodeDefault: '#5F6368',
    highlightGlow: '#00D4FF',
  },
  light: {
    bg: '#F8F9FA',
    bgGrid: '#FFFFFF',
    gridLine: 'rgba(0,0,0,0.04)',
    text: '#202124',
    textSecondary: '#5F6368',
    border: '#DADCE0',
    edgeDefault: '#9AA0A6',
    nodeDefault: '#9AA0A6',
    highlightGlow: '#1A73E8',
  },
};

function detectTheme(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

// ─── Layout presets with tuned parameters ──────────────────────────────────
const LAYOUT_PRESETS: Record<string, Record<string, unknown>> = {
  'cose': {
    name: 'cose',
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 50,
    nodeRepulsion: () => 280000,
    nodeOverlap: 800,
    idealEdgeLength: () => 100,
    edgeElasticity: () => 0.4,
    nestingFactor: 0.1,
    gravity: 0.3,
    numIter: 800,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
    randomize: true,
    componentSpacing: 60,
  },
  'cose-bilkent': {
    name: 'cose-bilkent',
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 50,
    nodeRepulsion: 6000,
    idealEdgeLength: 90,
    edgeElasticity: 0.35,
    nestingFactor: 0.1,
    gravity: 0.25,
    numIter: 600,
    tile: true,
    tilingPaddingVertical: 20,
    tilingPaddingHorizontal: 20,
    gravityRange: 3.8,
    gravityCompound: 1.0,
    gravityCompoundRange: 1.5,
    randomize: true,
  },
  'circle': {
    name: 'circle',
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 50,
    spacingFactor: 1.2,
    avoidOverlap: true,
  },
  'concentric': {
    name: 'concentric',
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 50,
    spacingFactor: 1.1,
    concentric: (node: cytoscape.NodeSingular) => {
      const rs = node.data('risk_score') as number ?? 0;
      return rs > 0.7 ? 1 : rs > 0.4 ? 2 : 3;
    },
    levelWidth: () => 1,
    avoidOverlap: true,
  },
  'breadthfirst': {
    name: 'breadthfirst',
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 50,
    directed: true,
    spacingFactor: 1.3,
    avoidOverlap: true,
  },
  'grid': {
    name: 'grid',
    animate: true,
    animationDuration: 300,
    fit: true,
    padding: 50,
    rows: undefined,
    avoidOverlap: true,
  },
  'spread': {
    name: 'spread',
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 50,
    minDist: 60,
    expandingFactor: -1.0,
    maxFruchtermanReingoldIterations: 0,
    maxNormaliseIterations: 2,
  },
};

// ─── Handle public API ─────────────────────────────────────────────────────

export interface CytoscapeCanvasHandle {
  fit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setLayout: (name: string) => void;
  /** Highlight nodes matching query (reset on empty string) */
  highlightNodes: (query: string) => void;
  /** Filter displayed elements */
  applyFilters: (filters: GraphFilters) => void;
  /** Get the underlying Cytoscape instance */
  getCy: () => cytoscape.Core | null;
}

interface CytoscapeCanvasProps {
  data: NetworkData;
  onNodeClick?: (node: NetworkNode) => void;
  onEdgeClick?: (edge: NetworkEdge) => void;
}

const CytoscapeCanvas = forwardRef<CytoscapeCanvasHandle, CytoscapeCanvasProps>(
  function CytoscapeCanvas({ data, onNodeClick, onEdgeClick }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<cytoscape.Core | null>(null);
    const layoutRef = useRef<cytoscape.Layouts | null>(null);
    const [theme, setTheme] = useState<'dark' | 'light'>(detectTheme);

    // Observe theme changes
    useEffect(() => {
      const observer = new MutationObserver(() => setTheme(detectTheme()));
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }, []);

    // ── Public API via ref ──────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      fit() {
        cyRef.current?.fit(undefined, 50);
      },
      zoomIn() {
        cyRef.current?.zoom(cyRef.current.zoom() * 1.4);
      },
      zoomOut() {
        cyRef.current?.zoom(cyRef.current.zoom() * 0.7);
      },
      setLayout(name: string) {
        if (!cyRef.current) return;
        const presets = LAYOUT_PRESETS[name];
        const options = presets ?? { name, animate: true, animationDuration: 400, fit: true, padding: 50, avoidOverlap: true };
        const lay = cyRef.current.layout(options as unknown as cytoscape.LayoutOptions);
        lay.run();
        layoutRef.current = lay;
      },
      highlightNodes(query: string) {
        const cy = cyRef.current;
        if (!cy) return;
        if (!query.trim()) {
          cy.elements().removeClass('node-highlighted node-dimmed');
          cy.elements().style('opacity', 1);
          return;
        }
        const q = query.toLowerCase();
        cy.nodes().forEach((n) => {
          const label = (n.data('label') as string || '').toLowerCase();
          const id = (n.data('id') as string || '').toLowerCase();
          const isMatch = label.includes(q) || id.includes(q);
          if (isMatch) {
            n.removeClass('node-dimmed').addClass('node-highlighted');
            n.connectedEdges().removeClass('node-dimmed');
            n.connectedEdges().connectedNodes().removeClass('node-dimmed');
          } else {
            n.removeClass('node-highlighted').addClass('node-dimmed');
          }
        });
        cy.edges().forEach((e) => {
          const src = e.source();
          const tgt = e.target();
          const hasHighlightedNeighbour = src.hasClass('node-highlighted') || tgt.hasClass('node-highlighted');
          e.style('opacity', hasHighlightedNeighbour ? 1 : 0.15);
        });
      },
      applyFilters(filters: GraphFilters) {
        const cy = cyRef.current;
        if (!cy) return;
        cy.nodes().forEach((n) => {
          const t = n.data('type') as NodeType;
          const rs = (n.data('risk_score') as number ?? 0) * 100;
          const deg = n.degree(false);
          const visible = filters.nodeTypes.includes(t)
            && rs >= filters.minRisk && rs <= filters.maxRisk
            && deg >= filters.minConnections;
          n.style('display', visible ? 'element' : 'none');
        });
        cy.edges().forEach((e) => {
          const t = e.data('type') as EdgeType;
          const srcVis = e.source().style('display') !== 'none';
          const tgtVis = e.target().style('display') !== 'none';
          e.style('display', filters.edgeTypes.includes(t) && srcVis && tgtVis ? 'element' : 'none');
        });
      },
      getCy() {
        return cyRef.current;
      },
    }));

    // ── Build cytoscape elements from props ─────────────────────────────
    const elements = [
      ...data.nodes.map((n) => ({
        group: 'nodes' as const,
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          subtype: n.subtype,
          risk_score: n.risk_score,
          fir_count: n.fir_count,
          evidence_count: n.evidence_count,
          community_id: n.community_id,
          pinned: n.pinned,
          metadata: n.metadata,
          // Derived
          degree: 0,
        },
      })),
      ...data.edges.map((e) => ({
        group: 'edges' as const,
        data: {
          id: `e-${e.source}-${e.target}-${e.type}`,
          source: e.source,
          target: e.target,
          label: e.label,
          type: e.type,
          weight: e.weight,
          count: e.count,
          last_activity: e.last_activity,
        },
      })),
    ];

    // ── Initialize cytoscape ────────────────────────────────────────────
    useEffect(() => {
      if (!containerRef.current) return;
      const tc = THEME_COLORS[theme];

      // Generate grid pattern SVG
      // Build dynamic node styles for each type
      const nodeStyles = (Object.entries(NODE_TYPE_STYLES) as [NodeType, typeof NODE_TYPE_STYLES[NodeType]][])
        .map(([type, style]) => ({
          selector: `node[type = "${type}"]`,
          style: {
            'background-color': style.color,
            'border-color': style.color,
            'border-width': 2,
            'border-opacity': 0.6,
            width: style.size,
            height: style.size,
            label: 'data(label)',
            'font-size': '11px',
            color: tc.text,
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 6,
            'text-max-width': '80px',
            'text-wrap': 'ellipsis',
            'background-opacity': 0.85,
            'min-zoomed-font-size': 8,
            'text-events': 'yes',
          } as any,
        }));

      // Build dynamic edge styles for each type
      const edgeStyles = (Object.entries(EDGE_TYPE_STYLES) as [EdgeType, typeof EDGE_TYPE_STYLES[EdgeType]][])
        .map(([type, style]) => ({
          selector: `edge[type = "${type}"]`,
          style: {
            width: 'mapData(weight, 0, 5, 0.5, 4)',
            'line-color': style.color,
            'target-arrow-color': style.color,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.1,
            'font-size': '9px',
            color: tc.textSecondary,
            label: 'data(label)',
            'text-background-color': tc.bg,
            'text-background-opacity': 0.85,
            'text-background-padding': 2,
            'line-style': style.dash ? 'dashed' : 'solid',
            'line-dash-pattern': style.dash ?? [1, 0],
            'line-opacity': 0.6,
            'source-distance-from-node': 4,
            'target-distance-from-node': 4,
          } as any,
        }));

      const cy = cytoscape({
        container: containerRef.current,
        style: [
          // Background grid as a pseudo-element
          {
            selector: '#grid-layer',
            style: {} as any,
          },
          // Default node
          {
            selector: 'node',
            style: {
              'background-color': tc.nodeDefault,
              label: 'data(label)',
              'font-size': '11px',
              color: tc.text,
              width: 28,
              height: 28,
              'border-width': 2,
              'border-color': tc.nodeDefault,
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 6,
              'text-max-width': '80px',
              'text-wrap': 'ellipsis',
            } as any,
          },
          // Type-specific node styles
          ...nodeStyles,
          // High-risk emphasis
          {
            selector: 'node[risk_score > 0.7]',
            style: {
              'border-width': 3,
              'border-color': '#FF3366',
              'border-opacity': 1,
            } as any,
          },
          // Selected node
          {
            selector: 'node:selected',
            style: {
              'border-width': 4,
              'border-color': tc.highlightGlow,
              'border-opacity': 1,
              'background-opacity': 1,
            } as any,
          },
          // Pinned node
          {
            selector: 'node[pinned = "true"]',
            style: {
              'border-width': 3,
              'border-color': '#F59E0B',
              'border-dash-pattern': [4, 3],
              'border-style': 'dashed',
            } as any,
          },
          // Default edge
          {
            selector: 'edge',
            style: {
              width: 1,
              'line-color': tc.edgeDefault,
              'target-arrow-color': tc.edgeDefault,
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'arrow-scale': 1,
              'font-size': '9px',
              color: tc.textSecondary,
              'text-background-color': tc.bg,
              'text-background-opacity': 0.85,
              'text-background-padding': 2,
              'line-opacity': 0.5,
            } as any,
          },
          // Type-specific edge styles
          ...edgeStyles,
          // Edge selected
          {
            selector: 'edge:selected',
            style: {
              width: 3,
              'line-opacity': 1,
              'line-color': '#F59E0B',
              'target-arrow-color': '#F59E0B',
            } as any,
          },
          // Highlight class (for search)
          {
            selector: '.node-highlighted',
            style: {
              'border-width': 4,
              'border-color': '#F59E0B',
              'border-opacity': 1,
              'background-opacity': 1,
            } as any,
          },
          // Dimmed class (non-matching search)
          {
            selector: '.node-dimmed',
            style: {
              opacity: 0.2,
            } as any,
          },
        ],
        elements,
        layout: LAYOUT_PRESETS['cose'] as unknown as cytoscape.LayoutOptions,
        wheelSensitivity: 0.25,
        minZoom: 0.15,
        maxZoom: 5,
        motionBlur: true,
        motionBlurOpacity: 0.2,
        pixelRatio: window.devicePixelRatio || 1,
        selectionType: 'single',
      });

      // ── Events ────────────────────────────────────────────────────────
      cy.on('tap', 'node', (evt) => {
        const el = evt.target;
        const node: NetworkNode = {
          id: el.data('id'),
          label: el.data('label'),
          type: el.data('type'),
          subtype: el.data('subtype'),
          risk_score: el.data('risk_score'),
          fir_count: el.data('fir_count'),
          evidence_count: el.data('evidence_count'),
          community_id: el.data('community_id'),
          pinned: el.data('pinned'),
          metadata: el.data('metadata'),
        };
        onNodeClick?.(node);
      });

      cy.on('tap', 'edge', (evt) => {
        const el = evt.target;
        const edge: NetworkEdge = {
          source: el.data('source'),
          target: el.data('target'),
          label: el.data('label'),
          type: el.data('type'),
          weight: el.data('weight'),
          count: el.data('count'),
          last_activity: el.data('last_activity'),
        };
        onEdgeClick?.(edge);
      });

      // ── Tooltip element ────────────────────────────────────────────────
      const tooltip = document.createElement('div');
      tooltip.style.cssText = `
        position: fixed; z-index: 9999; pointer-events: none;
        padding: 5px 10px; border-radius: 6px;
        background: rgba(11, 17, 32, 0.92);
        border: 1px solid rgba(255,255,255,0.1);
        color: #E8EAED; font-size: 12px;
        display: none; white-space: nowrap;
      `;
      containerRef.current?.appendChild(tooltip);

      cy.on('mouseover', 'node', (evt) => {
        const n = evt.target;
        const label = n.data('label') || '';
        const type = n.data('type') || '';
        const rs = n.data('risk_score') as number ?? 0;
        const deg = n.degree(false);
        tooltip.textContent = `${label} · ${type} · Risk: ${(rs * 100).toFixed(0)} · Deg: ${deg}`;
        tooltip.style.display = 'block';
        // Hover highlight: emphasize node border
        n.style({ 'border-width': 3, 'border-color': tc.highlightGlow, 'border-opacity': 1 });
      });

      cy.on('mousemove', 'node', (evt) => {
        const pos = evt.renderedPosition || { x: 0, y: 0 };
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          tooltip.style.left = `${rect.left + pos.x + 14}px`;
          tooltip.style.top = `${rect.top + pos.y - 8}px`;
        }
      });

      cy.on('mouseout', 'node', (evt) => {
        tooltip.style.display = 'none';
        // Reset border unless selected
        const n = evt.target;
        if (!n.selected()) {
          const rs = n.data('risk_score') as number ?? 0;
          n.style({ 'border-width': rs > 0.7 ? 3 : 2, 'border-color': rs > 0.7 ? '#FF3366' : (NODE_TYPE_STYLES[n.data('type') as NodeType]?.color || tc.nodeDefault), 'border-opacity': 0.6 });
        }
      });

      // ── Smart label management (LOD) ──────────────────────────────────
      const updateLabels = () => {
        const zoom = cy.zoom();
        cy.nodes().forEach((n) => {
          const isPinned = n.data('pinned') === true || n.data('pinned') === 'true';
          if (isPinned) {
            n.style('label', n.data('label'));
            return;
          }
          // Show labels only when zoomed in past threshold
          if (zoom > 1.2) {
            n.style('label', n.data('label'));
            n.style('font-size', Math.min(13, 9 + zoom * 2).toFixed(0) + 'px');
          } else if (zoom > 0.7) {
            // Show labels for important nodes (high risk, high degree)
            const rs = n.data('risk_score') as number ?? 0;
            const deg = n.degree(false);
            if (rs > 0.5 || deg > 3) {
              n.style('label', n.data('label'));
              n.style('font-size', '10px');
            } else {
              n.style('label', '');
            }
          } else {
            n.style('label', '');
          }
        });
        // Edge labels only at very high zoom
        cy.edges().forEach((e) => {
          if (zoom > 1.8) {
            e.style('label', e.data('label') || '');
            e.style('font-size', '9px');
          } else {
            e.style('label', '');
          }
        });
      };

      cy.on('zoom', updateLabels);
      // Initial label state
      setTimeout(updateLabels, 100);

      // ── Community detection via degree coloring ────────────────────────
      // Assign a subtle community hue based on connectivity patterns
      const maxDegree = Math.max(1, ...cy.nodes().map((n) => n.degree(false)));
      cy.nodes().forEach((n) => {
        const deg = n.degree(false);
        const ratio = maxDegree > 0 ? deg / maxDegree : 0;
        n.data('degree', deg);
        // Slightly larger nodes for higher degree
        const baseSize = parseInt(n.style('width')) || 28;
        const adjustedSize = baseSize + ratio * 12;
        n.style('width', adjustedSize);
        n.style('height', adjustedSize);
      });

      cyRef.current = cy;

      // ── ResizeObserver: fix container height 0px bug ──────────────────
      const resizeObserver = new ResizeObserver(() => {
        cy.resize();
        // Re-fit after resize if graph was already laid out
        if (cy.nodes().length > 0) {
          cy.fit(undefined, 50);
        }
      });
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
      // Also trigger a delayed resize to catch late layout shifts
      const resizeTimer = setTimeout(() => { cy.resize(); cy.fit(undefined, 50); }, 300);

      return () => {
        clearTimeout(resizeTimer);
        resizeObserver.disconnect();
        // Remove tooltip
        tooltip.remove();
        // Stop all animations before destroying to prevent isHeadless errors
        layoutRef.current?.stop();
        cy.stop();
        cy.removeAllListeners();
        cy.destroy();
        cyRef.current = null;
        layoutRef.current = null;
      };
    }, []); // Only mount once

    // ── Update elements when data changes ───────────────────────────────
    useEffect(() => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.elements().remove();
      cy.add(elements);
      // Stop any running layout, then re-run layout for new data
      layoutRef.current?.stop();
      const lay = cy.layout(LAYOUT_PRESETS['cose'] as unknown as cytoscape.LayoutOptions);
      lay.run();
      layoutRef.current = lay;
    }, [data]);

    // ── Update theme when it changes ────────────────────────────────────
    useEffect(() => {
      const cy = cyRef.current;
      if (!cy) return;
      const tc = THEME_COLORS[theme];
      cy.style()
        .selector('node')
        .style({ color: tc.text, 'border-color': tc.nodeDefault })
        .update();
      cy.style()
        .selector('edge')
        .style({ color: tc.textSecondary, 'text-background-color': tc.bg })
        .update();
    }, [theme]);

    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          background: THEME_COLORS[theme].bg,
          position: 'absolute',
          top: 0,
          left: 0,
          // CSS grid background via repeating pattern
          backgroundImage: `
            linear-gradient(${THEME_COLORS[theme].gridLine} 1px, transparent 1px),
            linear-gradient(90deg, ${THEME_COLORS[theme].gridLine} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
    );
  }
);

export default CytoscapeCanvas;
