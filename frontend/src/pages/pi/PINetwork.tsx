import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Network, Award, X, Circle, Search } from 'lucide-react';
import CytoscapeCanvas from '@/components/NetworkGraph/CytoscapeCanvas';
import { NodeInspector } from '@/components/NetworkGraph/NodeInspector';
import { authHeaders } from '@/utils/authHeaders';
import { PIPageSkeleton } from '@/components/pi/PIPageSkeleton';
import { isDemoMode, demoNetworkData, demoCrimeRings } from '@/services/demoData';
import type { NetworkNode as NetworkNodeType } from '@/types/network';

interface NetworkNode extends NetworkNodeType {
  degree?: number;
}

interface NetworkData {
  nodes: NetworkNode[];
  edges: any[];
}

interface CrimeRing {
  member_count: number;
  crime_types?: string[];
}

export function PINetwork() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [networkData, setNetworkData] = useState<NetworkData | null>(null)
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [rings, setRings] = useState<CrimeRing[]>([])
  const [loading, setLoading] = useState(true)
  const [kingpin, setKingpin] = useState<string | null>(null)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        if (isDemoMode()) {
          setNetworkData(demoNetworkData() as any)
          setRings(demoCrimeRings())
          setLoading(false)
          return
        }
        const [net, ringsData] = await Promise.all([
          fetch(`/api/intelligence/v1/networks?station_id=${user?.station_id}&limit=100`,
            { headers: authHeaders() }).then(r => r.json()),
          fetch(`/api/intelligence/v1/networks/rings?station_id=${user?.station_id}`,
            { headers: authHeaders() }).then(r => r.json()),
        ])
        setNetworkData(net)
        setRings(ringsData?.rings ?? [])
      } catch (e) {
        console.warn('[PINetwork] fetch error, using demo data:', e)
        setNetworkData(demoNetworkData() as any)
        setRings(demoCrimeRings())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.station_id])

  const findKingpin = () => {
    if (!networkData?.nodes) return
    // Simple degree centrality — node with most connections
    const nodeDegrees = networkData.edges.reduce((acc: Record<string, number>, edge: any) => {
      const source = edge?.source || edge?.data?.source;
      const target = edge?.target || edge?.data?.target;
      acc[source] = (acc[source] ?? 0) + 1
      acc[target] = (acc[target] ?? 0) + 1
      return acc
    }, {})
    const topNodeId = Object.entries(nodeDegrees).sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0]
    setKingpin(topNodeId ?? null)
  }

  const allTypes = useMemo(() => {
    if (!networkData?.nodes) return []
    return [...new Set(networkData.nodes.map((n: any) => n.type))] as string[]
  }, [networkData])

  const filteredData = useMemo(() => {
    if (!networkData) return null
    let nodes = networkData.nodes
    if (hiddenTypes.size > 0) {
      nodes = nodes.filter((n: any) => !hiddenTypes.has(n.type))
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      nodes = nodes.filter((n: any) =>
        n.label?.toLowerCase().includes(q) || n.id?.toLowerCase().includes(q)
      )
    }
    const filteredIds = new Set(nodes.map((n: any) => n.id))
    const edges = networkData.edges.filter((e: any) => {
      const src = e?.source || e?.data?.source
      const tgt = e?.target || e?.data?.target
      return filteredIds.has(src) && filteredIds.has(tgt)
    })
    return { nodes, edges }
  }, [networkData, hiddenTypes, searchQuery])

  const connectedCount = selectedNode
    ? (networkData?.edges?.filter((e: any) => {
        const src = e?.source || e?.data?.source
        const tgt = e?.target || e?.data?.target
        return src === selectedNode.id || tgt === selectedNode.id
      }).length ?? 0)
    : 0

  if (loading) return <PIPageSkeleton />

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Network className="w-6 h-6 text-service-blue" />
          <div>
            <h1 className="text-base font-semibold text-service-blue">Criminal Network Analysis</h1>
            <p className="text-xs text-text-secondary">
              {networkData?.nodes?.length ?? 0} nodes · {networkData?.edges?.length ?? 0} connections
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={findKingpin}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                       bg-red-500/20 text-red-300 border border-red-500/30
                       hover:bg-red-500/30 transition-colors">
            <Award className="w-3.5 h-3.5" /> Find Kingpin
          </button>
        </div>
      </div>

      {kingpin && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg
                        bg-red-500/10 border border-red-500/20">
          <Award className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-300">
            Kingpin identified: <strong>{
              networkData?.nodes?.find((n: any) => (n.id || n.data?.id) === kingpin)?.label ?? kingpin
            }</strong> — highest network centrality
          </span>
          <button onClick={() => setKingpin(null)}
            className="ml-auto text-xs text-text-tertiary hover:text-text-primary"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input type="text" placeholder="Search nodes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-52 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-border-primary bg-bg-card text-text-primary placeholder:text-text-tertiary outline-none focus:border-service-blue" />
        </div>
        {allTypes.map(type => (
          <label key={type} className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer select-none">
            <input type="checkbox"
              checked={!hiddenTypes.has(type)}
              onChange={() => {
                const next = new Set(hiddenTypes)
                if (hiddenTypes.has(type)) next.delete(type); else next.add(type)
                setHiddenTypes(next)
              }}
              className="rounded border-border-primary" />
            {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
          </label>
        ))}
      </div>

      {/* Graph + Inspector */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 rounded-xl border border-border-primary overflow-hidden bg-[#111]"
             style={{ height: 480 }}>
          {!networkData?.nodes?.length ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-xs text-text-tertiary">No network data for this station</p>
            </div>
          ) : (
            <CytoscapeCanvas
              data={{
                  nodes: (filteredData?.nodes ?? []).map((n: any) => ({
                    ...n,
                    color: (n.id || n.data?.id) === kingpin ? '#EF4444' :
                           n.type === 'accused' ? '#EF4444' :
                           n.type === 'victim' ? '#3B82F6' : '#8B5CF6',
                    size: (n.id || n.data?.id) === kingpin ? 40 : 20,
                  })),
                  edges: filteredData?.edges ?? []
              }}
              onNodeClick={(node: any) => setSelectedNode(node)}
            />
          )}
        </div>

        <div className="col-span-2">
          {selectedNode ? (
            <div className="flex flex-col gap-3">
              <NodeInspector
                node={selectedNode}
                connectedCount={connectedCount}
              />
              <button onClick={() => navigate(`/pi/cases?search=${selectedNode.id}`)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-service-blue/30 text-service-blue bg-service-blue/10 hover:bg-service-blue/20 transition-colors">
                View in PI
              </button>
            </div>
          ) : (
            <div className="h-full rounded-xl border border-border-primary bg-bg-card
                            flex flex-col items-center justify-center gap-2 p-6">
              <Circle className="w-8 h-8 text-text-tertiary/20" />
              <p className="text-xs text-text-tertiary text-center">
                Click any node to inspect their details, FIRs, and connections
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Crime rings */}
      {rings.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <h3 className="text-xs font-medium text-red-400 mb-3">
            <Circle className="w-3.5 h-3.5 fill-red-400 text-red-400" /> Crime Rings Detected — {rings.length} ring{rings.length > 1 ? 's' : ''}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {rings.map((ring, i) => (
              <div key={i} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs font-medium text-text-primary mb-1">Ring {i + 1}</p>
                <p className="text-[10px] text-text-secondary">{ring.member_count} members</p>
                <p className="text-[10px] text-text-secondary">{ring.crime_types?.join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top connected suspects */}
      <div className="rounded-xl border border-border-primary bg-bg-card p-4">
        <h3 className="text-xs font-medium text-text-primary mb-3">Top Connected Suspects</h3>
        <table className="w-full text-xs">
          <thead className="border-b border-border-primary">
             <tr className="text-text-tertiary text-[10px]">
               <th className="text-left py-2">Name</th>
               <th className="text-right py-2">Connections</th>
               <th className="text-right py-2">FIRs</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-border-secondary">
             {(networkData?.nodes ?? [])
               .sort((a: any, b: any) => (b.degree ?? 0) - (a.degree ?? 0))
               .slice(0, 10)
               .map((node: any, i: number) => (
                 <tr key={i} className="hover:bg-hover-bg cursor-pointer"
                     onClick={() => setSelectedNode(node)}>
                   <td className="py-2 text-text-primary">{node.label}</td>
                   <td className="py-2 text-right text-text-secondary tabular-nums">{node.degree ?? '—'}</td>
                   <td className="py-2 text-right text-text-secondary tabular-nums">{node.fir_count ?? '—'}</td>
                 </tr>
               ))}
           </tbody>
        </table>
      </div>
    </div>
  )
}
