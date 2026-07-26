import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import CytoscapeCanvas from '@/components/NetworkGraph/CytoscapeCanvas';
import type { CytoscapeCanvasHandle } from '@/components/NetworkGraph/CytoscapeCanvas';
import { ControlPanel } from '@/components/NetworkGraph/ControlPanel';
import { NodeSearch } from '@/components/NetworkGraph/NodeSearch';
import { NodeInspector } from '@/components/NetworkGraph/NodeInspector';
import { NetworkLegend } from '@/components/NetworkGraph/NetworkLegend';
import { FilterPanel } from '@/components/NetworkGraph/FilterPanel';
import { StatsPanel } from '@/components/NetworkGraph/StatsPanel';
import { IntelligencePanel } from '@/components/NetworkGraph/IntelligencePanel';
import { SyndicatesPanel } from '@/components/NetworkGraph/SyndicatesPanel';
import { Minimap } from '@/components/NetworkGraph/Minimap';
import { LoadingSpinner } from '@/components/Common/LoadingSpinner';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';
import { useRightDrawer } from '@/store/rightDrawerStore';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import { api } from '@/api/client';
import type { NetworkData, NetworkNode, NetworkEdge, GraphFilters } from '@/types/network';
import { DEFAULT_FILTERS } from '@/types/network';
import { useTranslation } from 'react-i18next';

export function NetworkAnalysisPage() {
  const { t } = useTranslation();
  const jurisdiction = useJurisdiction();
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentLayout, setCurrentLayout] = useState('cose');
  const [legendOpen, setLegendOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const [syndicatesOpen, setSyndicatesOpen] = useState(false);
  const [mainCy, setMainCy] = useState<any>(null);
  const [filters, setFilters] = useState<GraphFilters>(DEFAULT_FILTERS);
  const cyRef = useRef<CytoscapeCanvasHandle>(null);
  const { open: openDrawer } = useRightDrawer();

  // ── Fetch network data ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.get<NetworkData>('/intelligence/v1/networks', { scope: 'all', depth: 2 })
      .then((data: NetworkData) => {
        if (!cancelled) {
          // Assign synthetic community IDs for demo (connected components)
          if (data.nodes.length > 0) {
            const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));
            const edgeMap = new Map<string, string[]>();
            data.nodes.forEach((n) => edgeMap.set(n.id, []));
            data.edges.forEach((e) => {
              edgeMap.get(e.source)?.push(e.target);
              edgeMap.get(e.target)?.push(e.source);
            });
            let communityId = 1;
            const visited = new Set<string>();
            for (const node of data.nodes) {
              if (visited.has(node.id)) continue;
              // BFS to find connected component
              const queue = [node.id];
              visited.add(node.id);
              while (queue.length > 0) {
                const current = queue.shift()!;
                const n = nodeMap.get(current);
                if (n) n.community_id = `community-${communityId}`;
                const neighbours = edgeMap.get(current) || [];
                for (const nb of neighbours) {
                  if (!visited.has(nb)) {
                    visited.add(nb);
                    queue.push(nb);
                  }
                }
              }
              communityId++;
            }
          }
          setNetworkData(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────
  const handleNodeClick = useCallback(
    (node: NetworkNode) => {
      if (!networkData) return;
      const connectedEdges = networkData.edges.filter(
        (e) => e.source === node.id || e.target === node.id
      );
      const connectedNodeIds = new Set<string>();
      const typeBreakdown: Record<string, number> = {};
      connectedEdges.forEach((e) => {
        [e.source, e.target].forEach((id) => {
          if (id !== node.id && !connectedNodeIds.has(id)) {
            connectedNodeIds.add(id);
            const n = networkData.nodes.find((nd) => nd.id === id);
            if (n) {
              typeBreakdown[n.type] = (typeBreakdown[n.type] || 0) + 1;
            }
          }
        });
      });
      const connectedCount = connectedNodeIds.size;

      openDrawer({
        title: node.label,
        content: <NodeInspector node={node} connectedCount={connectedCount} typeBreakdown={typeBreakdown} />,
      });
    },
    [networkData, openDrawer]
  );

  const handleEdgeClick = useCallback(
    (edge: NetworkEdge) => {
      if (!networkData) return;
      const sourceNode = networkData.nodes.find((n) => n.id === edge.source);
      const targetNode = networkData.nodes.find((n) => n.id === edge.target);
      openDrawer({
        title: `${sourceNode?.label || edge.source} ↔ ${targetNode?.label || edge.target}`,
        content: (
          <div className="flex flex-col gap-3 text-[13px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} />
              <span style={{ color: '#94A3B8' }}>Relationship: <strong style={{ color: '#E8EAED' }}>{edge.type.replace(/_/g, ' ')}</strong></span>
            </div>
            {edge.label && (
              <div className="flex items-center gap-2">
                <span style={{ color: '#94A3B8' }}>Label: <strong style={{ color: '#E8EAED' }}>{edge.label}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span style={{ color: '#94A3B8' }}>Weight: <strong style={{ color: '#E8EAED' }}>{edge.weight}</strong></span>
            </div>
            {edge.count && (
              <div className="flex items-center gap-2">
                <span style={{ color: '#94A3B8' }}>Evidence count: <strong style={{ color: '#E8EAED' }}>{edge.count}</strong></span>
              </div>
            )}
            {edge.last_activity && (
              <div className="flex items-center gap-2">
                <span style={{ color: '#94A3B8' }}>Last activity: <strong style={{ color: '#E8EAED' }}>{edge.last_activity}</strong></span>
              </div>
            )}
          </div>
        ),
      });
    },
    [networkData, openDrawer]
  );

  const handleLayoutChange = useCallback((name: string) => {
    setCurrentLayout(name);
    cyRef.current?.setLayout(name);
  }, []);

  // ── Apply filters whenever they change ──────────────────────────────
  useEffect(() => {
    cyRef.current?.applyFilters(filters);
  }, [filters]);

  // ── Search with highlight ─────────────────────────────────────────────
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    cyRef.current?.highlightNodes(query);
  }, []);

  // ── Expose cytoscape instance for minimap (MUST be before early returns) ─
  useEffect(() => {
    const timer = setTimeout(() => {
      setMainCy(cyRef.current?.getCy() || null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [networkData]);

  // ── Loading state ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 56px - 32px)' }}>
        <LoadingSpinner message={t('networks.loading')} />
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 56px - 32px)' }}>
        <div className="alert-error absolute top-4 left-1/2 -translate-x-1/2 z-20" role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{t('networks.unavailable')}</p>
            <p className="text-xs mt-0.5" style={{ opacity: 0.8 }}>Please try again. If the issue persists, contact support.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────
  if (!networkData || networkData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 56px - 32px)' }}>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('networks.noData')}</p>
      </div>
    );
  }

  // ── Search result count ─────────────────────────────────────────────
  const searchResults = searchQuery.trim()
    ? networkData.nodes.filter(
        (n) =>
          n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.id.toLowerCase().includes(searchQuery.toLowerCase())
      ).length
    : undefined;

  return (
    <div className="relative" style={{ height: 'calc(100vh - 56px - 32px)' }}>
      {/* Jurisdiction banner */}
      <div className="absolute top-3 left-3 z-20">
        <JurisdictionBanner scope={jurisdiction} />
      </div>

      {/* Graph canvas */}
      <CytoscapeCanvas
        ref={cyRef}
        data={networkData}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
      />

      {/* Control panel */}
      <ControlPanel
        onZoomIn={() => cyRef.current?.zoomIn()}
        onZoomOut={() => cyRef.current?.zoomOut()}
        onFit={() => cyRef.current?.fit()}
        onLayoutChange={handleLayoutChange}
        currentLayout={currentLayout}
        legendOpen={legendOpen}
        onLegendToggle={() => setLegendOpen((p) => !p)}
        filterOpen={filterOpen}
        onFilterToggle={() => setFilterOpen((p) => !p)}
        statsOpen={statsOpen}
        onStatsToggle={() => setStatsOpen((p) => !p)}
        intelligenceOpen={intelligenceOpen}
        onIntelligenceToggle={() => setIntelligenceOpen((p) => !p)}
        syndicatesOpen={syndicatesOpen}
        onSyndicatesToggle={() => setSyndicatesOpen((p) => !p)}
      />

      {/* Search */}
      <NodeSearch
        value={searchQuery}
        onChange={handleSearchChange}
        resultCount={searchResults}
      />

      {/* Legend overlay */}
      {legendOpen && <NetworkLegend onClose={() => setLegendOpen(false)} />}

      {/* Filter panel */}
      {filterOpen && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {/* Stats panel */}
      {statsOpen && (
        <StatsPanel
          data={networkData}
          onClose={() => setStatsOpen(false)}
          onNodeClick={handleNodeClick}
        />
      )}

      {/* AI Intelligence panel */}
      {intelligenceOpen && <IntelligencePanel onClose={() => setIntelligenceOpen(false)} />}

      {/* Active Syndicates panel */}
      {syndicatesOpen && <SyndicatesPanel onClose={() => setSyndicatesOpen(false)} />}

      {/* Minimap */}
      <div className="absolute bottom-4 right-4 z-20">
        <Minimap data={networkData} mainCy={mainCy} />
      </div>
    </div>
  );
}
