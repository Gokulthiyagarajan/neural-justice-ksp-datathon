/**
 * CPNetworks — Criminal Network Intelligence
 *
 * Commissioner of Police command center page.
 * Interactive force-directed graph visualization of criminal networks,
 * showing syndicates, individuals, assets, and their connections.
 *
 * Gated to SUPER_ADMIN role via RoleRoute in App.tsx.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Network, RefreshCw, AlertTriangle, Shield, Eye, Search, ZoomIn, ZoomOut,
  RotateCcw, ChevronDown, ChevronRight, Users, Link2,
} from 'lucide-react'
import { isDemoMode, authHeaders } from '@/services/demoData'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'

// ─── Types ──────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string
  label: string
  type: 'organization' | 'accused' | 'suspect' | 'victim' | 'associate' | 'phone' | 'vehicle'
  risk: 'critical' | 'high' | 'medium' | 'low'
  details?: string
  district?: string
  cases?: number
  x?: number
  y?: number
  vx?: number
  vy?: number
}

interface GraphEdge {
  source: string
  target: string
  type: string
  weight: number
  evidence?: string
}

interface NetworkInsight {
  id: string
  type: string
  message: string
  confidence: number
  severity: string
}

interface NetworkData {
  summary: {
    active_syndicates: number
    known_associates: number
    tracked_organizations: number
    high_risk_individuals: number
    active_investigations: number
    cross_district_links: number
  }
  nodes: GraphNode[]
  edges: GraphEdge[]
  insights: NetworkInsight[]
  last_updated: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  organization: '#8B5CF6',
  accused: '#EF4444',
  suspect: '#F97316',
  victim: '#22C55E',
  associate: '#6B7280',
  phone: '#3B82F6',
  vehicle: '#06B6D4',
}

const RISK_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
}

const NODE_ICONS: Record<string, string> = {
  organization: '🏢',
  accused: '🔴',
  suspect: '🟠',
  victim: '🟢',
  associate: '⚪',
  phone: '📱',
  vehicle: '🚗',
}

const EDGE_COLORS: Record<string, string> = {
  member_of: '#8B5CF6',
  associate: '#F97316',
  owns_phone: '#3B82F6',
  uses_phone: '#3B82F6',
  owns_vehicle: '#06B6D4',
  uses_vehicle: '#06B6D4',
  linked_to: '#EF4444',
}

const NODE_RADIUS: Record<string, number> = {
  organization: 28,
  accused: 18,
  suspect: 15,
  victim: 12,
  associate: 10,
  phone: 10,
  vehicle: 10,
}

// ─── Demo data ────────────────────────────────────────────────────────────────

function demoNetworkData(): NetworkData {
  const now = new Date()
  const nodes: GraphNode[] = [
    { id: 'org-1', label: 'Kumar Chain Snatching Network', type: 'organization', risk: 'critical', details: 'Operates across Bengaluru Urban, Mysuru, and Tumakuru. Specializes in two-wheeler mounted chain snatching.', district: 'Bengaluru Urban', cases: 18 },
    { id: 'org-2', label: 'Coastal Drug Cartel', type: 'organization', risk: 'high', details: 'Drug trafficking network operating via Mangaluru coast with links to interior districts.', district: 'Dakshina Kannada', cases: 12 },
    { id: 'acc-1', label: 'Ravi Kumar', type: 'accused', risk: 'critical', details: 'Kingpin of Kumar Network. 8 active cases, previously convicted for robbery.', district: 'Bengaluru Urban', cases: 8 },
    { id: 'acc-2', label: 'Suresh Gowda', type: 'accused', risk: 'high', details: 'Lieutenant in Kumar Network. Handles logistics and vehicle arrangements.', district: 'Bengaluru Urban', cases: 5 },
    { id: 'acc-3', label: 'Venkatesh M', type: 'accused', risk: 'high', details: 'Point of contact for stolen jewelry disposal network.', district: 'Mysuru', cases: 4 },
    { id: 'acc-4', label: 'Abdul Karim', type: 'accused', risk: 'critical', details: 'Coastal cartel kingpin. Suspected of coordinating sea route drug shipments.', district: 'Dakshina Kannada', cases: 7 },
    { id: 'sus-1', label: 'Prakash Shetty', type: 'suspect', risk: 'medium', details: 'Suspected middleman between Kumar Network and jewelry shops.', district: 'Bengaluru Urban', cases: 2 },
    { id: 'assoc-1', label: 'Mohan Das', type: 'associate', risk: 'medium', details: 'Known associate providing safe houses for network members.', district: 'Mysuru', cases: 1 },
    { id: 'phone-1', label: '+91-9876543210', type: 'phone', risk: 'low', details: 'Primary contact number used by Kumar Network for coordination.', district: 'Bengaluru Urban' },
    { id: 'phone-2', label: '+91-8765432109', type: 'phone', risk: 'low', details: 'Encrypted messaging number linked to coastal cartel operations.', district: 'Dakshina Kannada' },
    { id: 'vehicle-1', label: 'KA-01-MX-4521', type: 'vehicle', risk: 'low', details: 'White Honda Activa used in chain snatching incidents. Reported stolen.', district: 'Bengaluru Urban' },
  ]
  return {
    summary: {
      active_syndicates: 2,
      known_associates: 12,
      tracked_organizations: 2,
      high_risk_individuals: 4,
      active_investigations: 6,
      cross_district_links: 8,
    },
    nodes,
    edges: [
      { source: 'org-1', target: 'acc-1', type: 'member_of', weight: 1, evidence: 'Confession statement by accused Ravi Kumar' },
      { source: 'org-1', target: 'acc-2', type: 'member_of', weight: 0.8, evidence: 'Call detail records show daily communication' },
      { source: 'org-1', target: 'acc-3', type: 'member_of', weight: 0.7, evidence: 'Mysuru cell identified through surveillance' },
      { source: 'org-1', target: 'sus-1', type: 'associate', weight: 0.5, evidence: 'Financial transactions flagged by FIU' },
      { source: 'org-1', target: 'assoc-1', type: 'associate', weight: 0.4, evidence: 'Property records show safe house ownership' },
      { source: 'acc-1', target: 'acc-2', type: 'linked_to', weight: 0.9, evidence: 'Multiple joint FIRs and co-accused in 5 cases' },
      { source: 'acc-1', target: 'sus-1', type: 'linked_to', weight: 0.5, evidence: 'Phone tower location overlap during incidents' },
      { source: 'acc-1', target: 'phone-1', type: 'uses_phone', weight: 0.8, evidence: 'Primary contact in CDR analysis' },
      { source: 'acc-2', target: 'vehicle-1', type: 'uses_vehicle', weight: 0.7, evidence: 'CCTV footage captures accused riding this vehicle' },
      { source: 'acc-1', target: 'vehicle-1', type: 'linked_to', weight: 0.6, evidence: 'DNA evidence recovered from vehicle' },
      { source: 'org-2', target: 'acc-4', type: 'member_of', weight: 1, evidence: 'Identified as cartel head through HUMINT' },
      { source: 'acc-4', target: 'phone-2', type: 'uses_phone', weight: 0.8, evidence: 'Encrypted communication channel monitored by Cyber Cell' },
      { source: 'acc-3', target: 'phone-1', type: 'linked_to', weight: 0.3, evidence: 'Single contact found in CDR records' },
    ],
    insights: [
      { id: 'ins-1', type: 'network_growth', message: 'Kumar Network expanding into Mysuru district — 3 new associates identified in last 30 days.', confidence: 0.82, severity: 'high' },
      { id: 'ins-2', type: 'link_detection', message: 'Phone +91-9876543210 appears in both Kumar Network and Coastal Cartel CDR records — possible cross-syndicate communication.', confidence: 0.65, severity: 'medium' },
      { id: 'ins-3', type: 'pattern', message: 'Vehicle KA-01-MX-4521 linked to 4 separate chain snatching incidents across a 6km radius — organized pattern confirmed.', confidence: 0.9, severity: 'critical' },
    ],
    last_updated: now.toISOString(),
  }
}

// ─── Force-Directed Layout ──────────────────────────────────────────────────

function forceDirectedLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  iterations = 200,
): GraphNode[] {
  const n = nodes.map(nd => ({ ...nd }))
  const nodeMap = new Map(n.map(nd => [nd.id, nd]))

  // Initialize positions randomly within the viewport
  n.forEach(nd => {
    nd.x = width / 2 + (Math.random() - 0.5) * width * 0.6
    nd.y = height / 2 + (Math.random() - 0.5) * height * 0.6
    nd.vx = 0
    nd.vy = 0
  })

  const repulsionStrength = 8000
  const attractionStrength = 0.005
  const centeringStrength = 0.01
  const damping = 0.9
  const minDist = 50

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations

    // Repulsion between all pairs
    for (let i = 0; i < n.length; i++) {
      for (let j = i + 1; j < n.length; j++) {
        const a = n[i]
        const b = n[j]
        const dx = (b.x || 0) - (a.x || 0)
        const dy = (b.y || 0) - (a.y || 0)
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), minDist)
        const force = (repulsionStrength * alpha) / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx = (a.vx || 0) - fx
        a.vy = (a.vy || 0) - fy
        b.vx = (b.vx || 0) + fx
        b.vy = (b.vy || 0) + fy
      }
    }

    // Attraction along edges
    edges.forEach(e => {
      const a = nodeMap.get(e.source)
      const b = nodeMap.get(e.target)
      if (!a || !b) return
      const dx = (b.x || 0) - (a.x || 0)
      const dy = (b.y || 0) - (a.y || 0)
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
      const force = dist * attractionStrength * e.weight * alpha
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx = (a.vx || 0) + fx
      a.vy = (a.vy || 0) + fy
      b.vx = (b.vx || 0) - fx
      b.vy = (b.vy || 0) - fy
    })

    // Centering force
    n.forEach(nd => {
      nd.vx = (nd.vx || 0) + (width / 2 - (nd.x || 0)) * centeringStrength * alpha
      nd.vy = (nd.vy || 0) + (height / 2 - (nd.y || 0)) * centeringStrength * alpha
    })

    // Update positions with damping
    n.forEach(nd => {
      nd.vx = (nd.vx || 0) * damping
      nd.vy = (nd.vy || 0) * damping
      nd.x = (nd.x || 0) + (nd.vx || 0)
      nd.y = (nd.y || 0) + (nd.vy || 0)
      // Keep within bounds with padding
      const pad = 40
      nd.x = Math.max(pad, Math.min(width - pad, nd.x || 0))
      nd.y = Math.max(pad, Math.min(height - pad, nd.y || 0))
    })
  }

  return n
}

// ─── Node Tooltip ───────────────────────────────────────────────────────────

function NodeTooltip({ node, x, y }: { node: GraphNode; x: number; y: number }) {
  return (
    <div
      className="absolute z-50 pointer-events-none bg-slate-900/98 backdrop-blur-md rounded-xl border border-white/15 px-4 py-3 shadow-2xl max-w-[260px]"
      style={{ left: x + 16, top: y - 10 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{NODE_ICONS[node.type]}</span>
        <div>
          <div className="text-xs font-bold text-white/90">{node.label}</div>
          <div className="text-[10px] text-white/40 capitalize">{node.type.replace('_', ' ')}</div>
        </div>
      </div>
      {node.details && (
        <p className="text-[10px] text-white/50 leading-relaxed mb-2">{node.details}</p>
      )}
      <div className="flex items-center gap-3 text-[10px]">
        <span
          className="px-1.5 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: `${RISK_COLORS[node.risk]}20`, color: RISK_COLORS[node.risk] }}
        >
          {node.risk.toUpperCase()}
        </span>
        {node.district && <span className="text-white/40">{node.district}</span>}
        {node.cases !== undefined && node.cases > 0 && (
          <span className="text-white/40">{node.cases} cases</span>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CPNetworks() {
  const jur = useJurisdiction()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<NetworkData | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [filterType, setFilterType] = useState<string>('all')
  const [insightsCollapsed, setInsightsCollapsed] = useState(false)
  const [legendCollapsed, setLegendCollapsed] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const [layoutNodes, setLayoutNodes] = useState<GraphNode[]>([])
  const graphContainerRef = useRef<HTMLDivElement>(null)
  const [graphDimensions, setGraphDimensions] = useState({ width: 900, height: 600 })

  // ── Fetch data ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      if (isDemoMode()) {
        const demo = demoNetworkData()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
        return
      }
      setRefreshing(true)
      const res = await fetch('/api/cp/networks', { headers: authHeaders() })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date(json.last_updated).toLocaleTimeString())
      } else {
        const demo = demoNetworkData()
        setData(demo)
        setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
      }
    } catch {
      console.error('[CPNetworks] Failed to fetch network data')
      const demo = demoNetworkData()
      setData(demo)
      setLastUpdated(new Date(demo.last_updated).toLocaleTimeString())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const iv = setInterval(fetchData, 60000)
    return () => clearInterval(iv)
  }, [fetchData])

  // ── Measure graph container ──────────────────────────────────────────────

  useEffect(() => {
    if (!graphContainerRef.current) return
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setGraphDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    obs.observe(graphContainerRef.current)
    return () => obs.disconnect()
  }, [])

  // ── Compute force layout when data or dimensions change ───────────────────

  const filteredEdges = useMemo(() => {
    if (!data) return []
    if (filterType === 'all') return data.edges
    return data.edges.filter(e => {
      const src = data.nodes.find(n => n.id === e.source)
      const tgt = data.nodes.find(n => n.id === e.target)
      return src?.type === filterType || tgt?.type === filterType
    })
  }, [data, filterType])

  const filteredNodes = useMemo(() => {
    if (!data) return []
    if (filterType === 'all') return data.nodes
    const connectedIds = new Set<string>()
    filteredEdges.forEach(e => { connectedIds.add(e.source); connectedIds.add(e.target) })
    return data.nodes.filter(n => n.type === filterType || connectedIds.has(n.id))
  }, [data, filterType, filteredEdges])

  useEffect(() => {
    if (filteredNodes.length === 0) { setLayoutNodes([]); return }
    const result = forceDirectedLayout(filteredNodes, filteredEdges, graphDimensions.width, graphDimensions.height, 180)
    setLayoutNodes(result)
  }, [filteredNodes, filteredEdges, graphDimensions])

  // ── Build node map for edge rendering ────────────────────────────────────

  const nodeMap = useMemo(() => {
    return new Map(layoutNodes.map(n => [n.id, n]))
  }, [layoutNodes])

  // ── Pan & Zoom handlers ──────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    isPanning.current = true
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
  }, [])

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z * 1.2, 3)), [])
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z / 1.2, 0.3)), [])
  const handleReset = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.min(3, Math.max(0.3, z * delta)))
  }, [])

  // ── Click node ──────────────────────────────────────────────────────────

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  if (!jur.isStateWide) {
    return <Unauthorized message="This page requires Commissioner (Super Admin) access." />
  }

  const summary = data?.summary
  const connectedEdges = selectedNode
    ? data?.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id) || []
    : []

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Network size={16} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-purple-400">Criminal Network Intelligence</h1>
            <p className="text-[10px] text-white/40">Force-directed graph · Syndicate mapping · Link analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-[10px] text-white/30">Updated: {lastUpdated}</span>}
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <JurisdictionBanner scope={jur} />
        </div>
      </div>

      {/* ─── KPI Strip ───────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-6 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          {[
            { label: 'Syndicates', value: summary.active_syndicates, icon: <Shield size={12} />, color: 'text-purple-400' },
            { label: 'Associates', value: summary.known_associates, icon: <Users size={12} />, color: 'text-blue-400' },
            { label: 'Organizations', value: summary.tracked_organizations, icon: <Network size={12} />, color: 'text-violet-400' },
            { label: 'High Risk', value: summary.high_risk_individuals, icon: <AlertTriangle size={12} />, color: 'text-red-400' },
            { label: 'Investigations', value: summary.active_investigations, icon: <Eye size={12} />, color: 'text-amber-400' },
            { label: 'Cross-District', value: summary.cross_district_links, icon: <Link2 size={12} />, color: 'text-cyan-400' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={kpi.color}>{kpi.icon}</span>
                <span className="text-[10px] text-white/40">{kpi.label}</span>
              </div>
              <div className={`text-base font-bold ${kpi.color}`}>{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Main Content ────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Graph Area ───────────────────────────────────────── */}
        <div className="flex-1 relative" ref={graphContainerRef}>
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80">
              <div className="text-center">
                <RefreshCw size={32} className="animate-spin text-purple-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">Loading network graph…</p>
              </div>
            </div>
          )}

          {/* Zoom controls */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
            <button onClick={handleZoomIn} className="w-8 h-8 rounded-lg bg-slate-900/95 border border-white/10 text-white/60 hover:bg-white/10 flex items-center justify-center transition-colors">
              <ZoomIn size={14} />
            </button>
            <button onClick={handleZoomOut} className="w-8 h-8 rounded-lg bg-slate-900/95 border border-white/10 text-white/60 hover:bg-white/10 flex items-center justify-center transition-colors">
              <ZoomOut size={14} />
            </button>
            <button onClick={handleReset} className="w-8 h-8 rounded-lg bg-slate-900/95 border border-white/10 text-white/60 hover:bg-white/10 flex items-center justify-center transition-colors">
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Filter chips */}
          <div className="absolute top-3 left-16 z-10 flex items-center gap-1.5">
            {['all', 'organization', 'accused', 'suspect', 'phone', 'vehicle'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all border ${
                  filterType === type
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : 'bg-slate-900/95 border-white/10 text-white/50 hover:bg-white/5'
                }`}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* SVG Graph */}
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="bg-slate-950/60 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <marker id="arrow" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto">
                <path d="M0,0 L10,3 L0,6 Z" fill="rgba(255,255,255,0.2)" />
              </marker>
            </defs>

            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {filteredEdges.map((edge, i) => {
                const src = nodeMap.get(edge.source)
                const tgt = nodeMap.get(edge.target)
                if (!src || !tgt) return null
                const color = EDGE_COLORS[edge.type] || '#6B7280'
                const isSelected = selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id)
                const opacity = selectedNode ? (isSelected ? 0.9 : 0.15) : 0.4
                return (
                  <line
                    key={`edge-${i}`}
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={color}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeOpacity={opacity}
                    strokeDasharray={edge.type === 'linked_to' ? '6,3' : undefined}
                  />
                )
              })}

              {/* Nodes */}
              {layoutNodes.map(node => {
                const radius = NODE_RADIUS[node.type] || 12
                const color = NODE_COLORS[node.type] || '#6B7280'
                const riskColor = RISK_COLORS[node.risk]
                const isHovered = hoveredNode?.id === node.id
                const isSelected = selectedNode?.id === node.id
                const isConnected = selectedNode && data?.edges.some(
                  e => (e.source === selectedNode.id && e.target === node.id) ||
                       (e.target === selectedNode.id && e.source === node.id)
                )
                const dimmed = selectedNode && !isSelected && !isConnected
                const displayRadius = isHovered ? radius * 1.15 : radius

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x},${node.y})`}
                    onClick={() => handleNodeClick(node)}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: 'pointer', opacity: dimmed ? 0.2 : 1, transition: 'opacity 0.2s' }}
                  >
                    {/* Risk ring */}
                    <circle
                      r={displayRadius + 4}
                      fill="none"
                      stroke={riskColor}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      strokeOpacity={isSelected || isHovered ? 0.8 : 0.3}
                      filter={isSelected ? 'url(#glow)' : undefined}
                    />
                    {/* Main circle */}
                    <circle
                      r={displayRadius}
                      fill={`${color}30`}
                      stroke={color}
                      strokeWidth={2}
                    />
                    {/* Icon text */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={node.type === 'organization' ? 16 : 12}
                      style={{ pointerEvents: 'none' }}
                    >
                      {NODE_ICONS[node.type]}
                    </text>
                    {/* Label */}
                    <text
                      y={displayRadius + 14}
                      textAnchor="middle"
                      fontSize={9}
                      fill="rgba(255,255,255,0.6)"
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.label.length > 20 ? node.label.slice(0, 18) + '…' : node.label}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>

          {/* Tooltip */}
          {hoveredNode && hoveredNode.x !== undefined && (
            <NodeTooltip
              node={hoveredNode}
              x={((hoveredNode.x ?? 0) * zoom) + pan.x}
              y={((hoveredNode.y ?? 0) * zoom) + pan.y}
            />
          )}

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-10">
            {!legendCollapsed ? (
              <div className="relative bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/10 px-3 py-2">
                <button
                  onClick={() => setLegendCollapsed(true)}
                  className="absolute -top-1 -right-1 z-10 w-4 h-4 rounded-full bg-slate-800 border border-white/20 text-white/50 flex items-center justify-center text-[10px] hover:bg-slate-700"
                >×</button>
                <div className="text-[10px] text-white/50 mb-1.5 font-medium">Node Types</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(NODE_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${color}40`, border: `2px solid ${color}` }} />
                      <span className="text-[10px] text-white/50 capitalize">{type.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-white/50 mt-2 mb-1 font-medium">Edge Types</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(EDGE_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1.5">
                      <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[10px] text-white/50">{type.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-white/50 mt-2 mb-1 font-medium">Risk Level</div>
                <div className="flex items-center gap-3">
                  {Object.entries(RISK_COLORS).map(([risk, color]) => (
                    <div key={risk} className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[10px] text-white/50 capitalize">{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setLegendCollapsed(false)}
                className="bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5 transition-colors"
              >
                <Network size={12} className="inline mr-1" />
                Legend
              </button>
            )}
          </div>

          {/* Graph stats */}
          <div className="absolute bottom-3 right-3 z-10 bg-slate-900/95 backdrop-blur-md rounded-lg border border-white/10 px-3 py-2 text-[10px] text-white/40">
            {layoutNodes.length} nodes · {filteredEdges.length} edges · Zoom {(zoom * 100).toFixed(0)}%
          </div>
        </div>

        {/* ─── Side Panel ──────────────────────────────────────── */}
        <div className="w-72 border-l border-white/10 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex-shrink-0">
          {/* Selected node detail */}
          {selectedNode ? (
            <div className="p-3 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-white/80">Node Detail</h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-[10px] text-white/40 hover:text-white/60"
                >
                  ✕
                </button>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{NODE_ICONS[selectedNode.type]}</span>
                  <div>
                    <div className="text-sm font-bold text-white/90">{selectedNode.label}</div>
                    <div className="text-[10px] text-white/40 capitalize">{selectedNode.type.replace('_', ' ')}</div>
                  </div>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed mb-2">{selectedNode.details}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ backgroundColor: `${RISK_COLORS[selectedNode.risk]}20`, color: RISK_COLORS[selectedNode.risk] }}
                  >
                    {selectedNode.risk.toUpperCase()} RISK
                  </span>
                  {selectedNode.district && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] text-white/50 bg-white/5">
                      {selectedNode.district}
                    </span>
                  )}
                  {selectedNode.cases !== undefined && selectedNode.cases > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] text-white/50 bg-white/5">
                      {selectedNode.cases} cases
                    </span>
                  )}
                </div>
              </div>
              {/* Connected edges */}
              <div className="mt-3">
                <h4 className="text-[10px] font-medium text-white/50 mb-1.5">Connections ({connectedEdges.length})</h4>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {connectedEdges.map((edge, i) => {
                    const otherId = edge.source === selectedNode.id ? edge.target : edge.source
                    const other = data?.nodes.find(n => n.id === otherId)
                    if (!other) return null
                    return (
                      <div
                        key={i}
                        className="bg-white/[0.03] rounded-lg px-2.5 py-2 border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-colors"
                        onClick={() => setSelectedNode(other)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{NODE_ICONS[other.type]}</span>
                          <span className="text-[10px] text-white/70 font-medium flex-1 truncate">{other.label}</span>
                          <span className="text-[9px] px-1 py-0.5 rounded bg-white/5" style={{ color: EDGE_COLORS[edge.type] }}>
                            {edge.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {edge.evidence && (
                          <p className="text-[9px] text-white/30 mt-1 truncate">{edge.evidence}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 border-b border-white/10">
              <h3 className="text-xs font-bold text-white/80 mb-2">Node Detail</h3>
              <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5 text-center">
                <Search size={20} className="mx-auto mb-2 text-white/20" />
                <p className="text-[10px] text-white/30">Click a node to inspect its connections and evidence.</p>
              </div>
            </div>
          )}

          {/* AI Insights */}
          <div className="p-3 border-b border-white/10">
            <button
              onClick={() => setInsightsCollapsed(!insightsCollapsed)}
              className="flex items-center justify-between w-full text-xs font-bold text-white/80 mb-2"
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-amber-400" />
                AI Insights ({data?.insights.length || 0})
              </span>
              {insightsCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
            {!insightsCollapsed && data?.insights.map(insight => (
              <div
                key={insight.id}
                className="bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5 mb-1.5"
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${RISK_COLORS[insight.severity] || '#6B7280'}20`,
                      color: RISK_COLORS[insight.severity] || '#6B7280',
                    }}
                  >
                    {insight.severity.toUpperCase()}
                  </span>
                  <span className="text-[9px] text-white/30">{(insight.confidence * 100).toFixed(0)}% conf.</span>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed">{insight.message}</p>
              </div>
            ))}
          </div>

          {/* Syndicate summary */}
          <div className="p-3">
            <h3 className="text-xs font-bold text-white/80 mb-2">Active Syndicates</h3>
            <div className="space-y-1.5">
              {data?.nodes.filter(n => n.type === 'organization').map(org => {
                const memberCount = data.edges.filter(e => e.type === 'member_of' && e.target === org.id).length
                return (
                  <div
                    key={org.id}
                    className="bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-colors"
                    onClick={() => setSelectedNode(org)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/70 font-medium">{org.label}</span>
                      <span
                        className="text-[9px] px-1 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${RISK_COLORS[org.risk]}20`, color: RISK_COLORS[org.risk] }}
                      >
                        {org.risk}
                      </span>
                    </div>
                    <div className="text-[9px] text-white/40">{memberCount} members · {org.cases} cases · {org.district}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
