import { useEffect, useState } from 'react';
import { authHeaders } from '@/utils/authHeaders';
import { CPPageSkeleton } from '@/components/cp/CPPageSkeleton';
import { ErrorState } from '@/design-system/components/ErrorState';
import { EmptyState } from '@/design-system/components/EmptyState';
import { isDemoMode } from '@/services/demoData';
import { TrendingUp, AlertTriangle, MapPin, RefreshCw } from 'lucide-react';

interface CrimePattern {
  id: string;
  type: string;
  title: string;
  description: string;
  district: string;
  station?: string;
  confidence: number;
  status: 'active' | 'monitoring' | 'emerging' | 'resolved';
  trend: 'increasing' | 'stable' | 'decreasing';
  crimes_count: number;
  first_detected: string;
  last_updated: string;
  recommendations?: string[];
}

export function CPPatterns() {
  const [patterns, setPatterns] = useState<CrimePattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const load = async () => {
    const getDemoPatterns = (): CrimePattern[] => [
        { id: 'CP-001', type: 'theft', title: 'Two-wheeler theft spike — East Bengaluru', description: '18% increase in two-wheeler thefts across Indiranagar, Whitefield, and KR Puram. Pattern suggests organized ring operating between 9PM-2AM.', district: 'Bengaluru Urban', station: 'Indiranagar PS', confidence: 88, status: 'active', trend: 'increasing', crimes_count: 47, first_detected: '2026-06-15', last_updated: '2026-07-22', recommendations: ['Increase night patrols in Indiranagar-Whitefield belt', 'Coordinate with traffic police for CCTV review', 'Deploy plainclothes officers at targeted parking areas'] },
        { id: 'CP-002', type: 'fraud', title: 'Digital arrest scam — State-wide', description: 'New variant of digital arrest scam reported across 12 districts. Victims lose avg ₹2.5L. Perpetrators pose as police/court officials.', district: 'Multi-district', confidence: 92, status: 'active', trend: 'increasing', crimes_count: 89, first_detected: '2026-07-01', last_updated: '2026-07-22', recommendations: ['Issue state-wide public advisory', 'Coordinate with cyber crime cells', 'Track payment endpoints'] },
        { id: 'CP-003', type: 'burglary', title: 'Commercial burglary pattern — Mysuru', description: 'Series of 12 burglaries targeting jewelry stores in Mysuru urban area. Similar MO — rear entry, alarm disabling.', district: 'Mysuru', station: 'Kuvempunagar PS', confidence: 85, status: 'active', trend: 'increasing', crimes_count: 12, first_detected: '2026-07-10', last_updated: '2026-07-21', recommendations: ['Deploy special surveillance', 'Alert jewelry association', 'Review CCTV network gaps'] },
        { id: 'CP-004', type: 'drug', title: 'Synthetic drug distribution — Coastal belt', description: 'Increased seizures of MDMA and methamphetamine in Mangaluru, Udupi, Karwar. Distribution linked to coastal shipping routes.', district: 'Dakshina Kannada', confidence: 78, status: 'active', trend: 'increasing', crimes_count: 23, first_detected: '2026-06-20', last_updated: '2026-07-20', recommendations: ['Coordinate with Coast Guard', 'Increase port surveillance', 'Track known distributors'] },
        { id: 'CP-005', type: 'cyber', title: 'Phishing campaign — Govt portals', description: 'Sophisticated phishing attack targeting Karnataka government service portals. Spoofed login pages for e-Governance sites.', district: 'Multi-district', confidence: 95, status: 'active', trend: 'stable', crimes_count: 156, first_detected: '2026-05-01', last_updated: '2026-07-22', recommendations: ['Alert all department IT teams', 'Takedown phishing domains', 'Force password reset for govt accounts'] },
        { id: 'CP-006', type: 'robbery', title: 'Highway robbery — NH4 corridor', description: 'Chain of 8 robberies targeting trucks on NH4 between Bengaluru and Tumakuru. Suspects pose as traffic police.', district: 'Tumakuru', confidence: 72, status: 'active', trend: 'decreasing', crimes_count: 8, first_detected: '2026-06-25', last_updated: '2026-07-18', recommendations: ['Deploy highway patrol units', 'Coordinate with RTO checkposts'] },
        { id: 'CP-007', type: 'domestic', title: 'Domestic violence uptick — North Karnataka', description: '15% increase in domestic violence reports in Kalaburagi, Vijayapura, Ballari. Correlated with economic stress indicators.', district: 'Kalaburagi', confidence: 65, status: 'monitoring', trend: 'increasing', crimes_count: 67, first_detected: '2026-07-05', last_updated: '2026-07-19', recommendations: ['Activate SHE teams', 'Coordinate with DCPO', 'Community outreach programs'] },
        { id: 'CP-008', type: 'property', title: 'Land grabbing syndicate — Bengaluru outskirts', description: 'Organized syndicate forging land documents in developing areas of North Bengaluru. 7 cases identified.', district: 'Bengaluru Urban', confidence: 82, status: 'active', trend: 'stable', crimes_count: 7, first_detected: '2026-06-10', last_updated: '2026-07-20', recommendations: ['Coordinate with revenue department', 'Verify land records', 'Task special investigation team'] },
        { id: 'CP-009', type: 'vehicle', title: 'Farm equipment theft — Rural districts', description: 'Rising theft of tractors and pump sets in Shivamogga, Chikkamagaluru, Hassan. Stolen equipment moved across district borders.', district: 'Shivamogga', confidence: 70, status: 'emerging', trend: 'increasing', crimes_count: 18, first_detected: '2026-07-15', last_updated: '2026-07-22', recommendations: ['Alert rural station house officers', 'Track second-hand farm equipment market'] },
        { id: 'CP-010', type: 'human_trafficking', title: 'Human trafficking — Interstate route', description: 'Trafficking ring moving women from North Karnataka to Maharashtra and Delhi. 5 victims rescued in joint operation.', district: 'Multi-district', confidence: 90, status: 'active', trend: 'stable', crimes_count: 15, first_detected: '2026-04-15', last_updated: '2026-07-20', recommendations: ['Coordinate with Maharashtra Police', 'Victim support and rehabilitation', 'Track known traffickers'] },
      ];

    try {
      setLoading(true);
      setError(null);

      if (isDemoMode()) {
        setPatterns(getDemoPatterns());
        setLoading(false);
        return;
      }

      const res = await fetch('/api/cp/patterns', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPatterns(data?.patterns ?? []);
      } else {
        setPatterns(getDemoPatterns());
      }
    } catch (err) {
      console.warn('[CPPatterns] Fetch failed:', err);
      setPatterns(getDemoPatterns());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? patterns : patterns.filter(p => p.status === filter);
  const activeCount = patterns.filter(p => p.status === 'active').length;
  const emergingCount = patterns.filter(p => p.status === 'emerging').length;
  const highConfidence = patterns.filter(p => p.confidence >= 80).length;
  const increasing = patterns.filter(p => p.trend === 'increasing').length;

  if (loading) return <CPPageSkeleton />;
  if (error) return <div className="p-6"><ErrorState title="Unable to load crime patterns" description={error} onRetry={load} retryLabel="Retry" /></div>;

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-blue-400">Crime Pattern Analysis</h1>
          <p className="text-xs text-white/40">Organization-wide crime pattern detection · {patterns.length} patterns</p>
        </div>
        <button onClick={load} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-blue-400 hover:border-blue-500/30 inline-flex items-center gap-1 transition-colors">
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Active Patterns', value: activeCount, color: 'text-red-400' },
          { label: 'Emerging Threats', value: emergingCount, color: 'text-amber-400' },
          { label: 'High Confidence (≥80%)', value: highConfidence, color: 'text-green-400' },
          { label: 'Increasing Trends', value: increasing, color: 'text-orange-400' },
          { label: 'Total Detected', value: patterns.length, color: 'text-blue-400' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <p className={`text-xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['all', 'active', 'monitoring', 'emerging', 'resolved'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors ${
              filter === s
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-white/40 border border-white/10 hover:text-white/60'
            }`}>{s} {s === 'all' ? `(${patterns.length})` : `(${patterns.filter(p => p.status === s).length})`}</button>
        ))}
      </div>

      {/* Pattern Cards */}
      {filtered.length === 0 ? (
        <EmptyState icon={<TrendingUp size={40} />} title="No patterns found" description="No crime patterns match the current filter" />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    p.status === 'active' ? 'bg-red-900/50 text-red-300' :
                    p.status === 'emerging' ? 'bg-amber-900/50 text-amber-300' :
                    p.status === 'monitoring' ? 'bg-blue-900/50 text-blue-300' :
                    'bg-green-900/50 text-green-300'
                  }`}>{p.status}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    p.trend === 'increasing' ? 'bg-red-900/30 text-red-400' :
                    p.trend === 'decreasing' ? 'bg-green-900/30 text-green-400' :
                    'bg-gray-700/50 text-gray-300'
                  }`}>{p.trend} ↑</span>
                </div>
                <span className="text-xs text-white/30 font-mono">{p.type}</span>
              </div>
              <h3 className="text-sm font-medium text-white mb-1">{p.title}</h3>
              <p className="text-xs text-white/50 mb-3">{p.description}</p>

              <div className="flex items-center gap-4 text-[10px] text-white/40 mb-3">
                <span className="flex items-center gap-1"><MapPin size={10} /> {p.district}</span>
                <span className="flex items-center gap-1"><AlertTriangle size={10} /> {p.confidence}% confidence</span>
                <span className="flex items-center gap-1">{p.crimes_count} incidents</span>
              </div>

              {p.recommendations && p.recommendations.length > 0 && (
                <div className="border-t border-white/5 pt-2 mt-1">
                  <p className="text-[10px] text-blue-400/60 mb-1">AI Recommendations:</p>
                  <ul className="space-y-0.5">
                    {p.recommendations.map((r, i) => (
                      <li key={i} className="text-[10px] text-white/30 flex items-start gap-1">
                        <span className="text-blue-400/60 mt-0.5">•</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
