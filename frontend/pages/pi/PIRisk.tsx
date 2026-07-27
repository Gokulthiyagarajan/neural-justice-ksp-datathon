import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { AlertTriangle, ChevronDown, ChevronRight, ExternalLink, User } from 'lucide-react';
import { authHeaders } from '@/utils/authHeaders';
import { PIPageSkeleton } from '@/components/pi/PIPageSkeleton';
import { isDemoMode, demoRiskData } from '@/services/demoData';

interface RiskAccused {
  id: string;
  name: string;
  risk_score: number;
  review_status: string;
  fir_count?: number;
  crime_type?: string;
  shap_features?: { feature: string; impact: number }[];
}

interface RiskData {
  accused: RiskAccused[];
  station: any;
}

function RiskTable({ accused, title }: { accused: RiskAccused[]; title: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const limit = showAll ? accused.length : 10

  if (accused.length === 0) return null

  return (
    <div className="rounded-xl border border-border-primary bg-bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-text-primary">{title} ({accused.length})</h3>
        {accused.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[10px] text-service-blue hover:underline"
          >
            {showAll ? 'Show Less' : 'Show All'}
          </button>
        )}
      </div>
      <table className="w-full text-xs">
        <thead className="border-b border-border-primary">
          <tr className="text-text-tertiary text-[10px]">
            <th className="text-left py-2">Score</th>
            <th className="text-left py-2">Name</th>
            <th className="text-left py-2">Crime Type</th>
            <th className="text-right py-2">FIRs</th>
            <th className="text-center py-2">Review</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {accused.slice(0, limit).map((a: any) => (
            <>
              <tr key={a.id} className="hover:bg-hover-bg cursor-pointer transition-colors" onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>
                <td className="py-2">
                  <span className="font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">{a.risk_score}</span>
                </td>
                <td className="py-2 text-text-primary">{a.name}</td>
                <td className="py-2 text-text-secondary">{a.crime_type || 'Unknown'}</td>
                <td className="py-2 text-right text-text-secondary tabular-nums">{a.fir_count || 1}</td>
                <td className="py-2 text-center text-text-tertiary">{a.review_status || 'Pending'}</td>
              </tr>
              {expandedId === a.id && (
                <tr key={`${a.id}-detail`}>
                  <td colSpan={5} className="p-4 bg-bg-secondary/50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Risk Factors</h4>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px]"><span className="text-text-secondary">Recidivism Risk</span><span className="text-text-primary font-medium">{a.risk_score}/100</span></div>
                          <div className="flex justify-between text-[11px]"><span className="text-text-secondary">Review Status</span><span className="text-text-primary font-medium">{a.review_status || 'Pending'}</span></div>
                          <div className="flex justify-between text-[11px]"><span className="text-text-secondary">Total FIRs</span><span className="text-text-primary font-medium">{a.fir_count || 1}</span></div>
                          <div className="flex justify-between text-[11px]"><span className="text-text-secondary">Primary Crime</span><span className="text-text-primary font-medium">{a.crime_type || 'Unknown'}</span></div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">SHAP Feature Importance</h4>
                        {a.shap_features && a.shap_features.length > 0 ? (
                          <div className="space-y-1">
                            {a.shap_features.map((sf: { feature: string; impact: number }, i: number) => {
                              const absMax = Math.max(...a.shap_features.map((s: { impact: number }) => Math.abs(s.impact)), 0.01)
                              const barWidth = Math.abs(sf.impact) / absMax * 100
                              const isPositive = sf.impact >= 0
                              return (
                                <div key={i} className="flex items-center gap-2 text-[10px]">
                                  <span className="w-24 text-right text-text-tertiary truncate">{sf.feature}</span>
                                  <div className="flex-1 h-3 bg-bg-card rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${isPositive ? 'bg-red-500/60' : 'bg-blue-500/60'}`}
                                      style={{ width: `${barWidth}%` }}
                                    />
                                  </div>
                                  <span className={`w-8 text-right tabular-nums ${isPositive ? 'text-red-400' : 'text-blue-400'}`}>
                                    {sf.impact.toFixed(3)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-text-tertiary italic">No SHAP data available</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <a
                        href={`/pi/case/${a.id}`}
                        className="text-[10px] text-service-blue hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> View FIRs
                      </a>
                      <a
                        href={`/pi/profiles`}
                        className="text-[10px] text-service-blue hover:underline flex items-center gap-1"
                      >
                        <User className="w-3 h-3" /> View Full Profile
                      </a>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
          {accused.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-text-tertiary">No accused found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function PIRisk() {
  const { user } = useAuthStore()
  const [riskData, setRiskData] = useState<RiskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    medRisk: true,
    unreviewed: true,
  })

  useEffect(() => {
    const load = async () => {
      try {
        if (isDemoMode()) {
          setRiskData(demoRiskData() as any)
          setLoading(false)
          return
        }
        const [accused, station] = await Promise.all([
          fetch(`/api/intelligence/v1/risk/accused?station_id=${user?.station_id}&limit=50`,
            { headers: authHeaders() }).then(r => r.json()),
          fetch(`/api/intelligence/v1/risk/station/${user?.station_id}`,
            { headers: authHeaders() }).then(r => r.json()),
        ])
        setRiskData({ accused: accused?.accused ?? accused ?? [], station })
      } catch (e) {
        console.warn('[PIRisk] fetch error, using demo data:', e)
        setRiskData(demoRiskData() as any)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.station_id])

  if (loading) return <PIPageSkeleton />

  const accused = riskData?.accused ?? []
  const highRisk = accused.filter((a: any) => (a.risk_score ?? 0) >= 75)
  const medRisk = accused.filter((a: any) => (a.risk_score ?? 0) >= 50 && (a.risk_score ?? 0) < 75)
  const unreviewed = accused.filter((a: any) => a.review_status === 'unreviewed')
  const avgScore = accused.length > 0 
    ? Math.round(accused.reduce((sum, a) => sum + (a.risk_score ?? 0), 0) / accused.length)
    : 0

  const buckets = [
    { label: '0–24', count: accused.filter((a: any) => (a.risk_score ?? 0) < 25).length, color: 'bg-green-500' },
    { label: '25–49', count: accused.filter((a: any) => (a.risk_score ?? 0) >= 25 && (a.risk_score ?? 0) < 50).length, color: 'bg-blue-500' },
    { label: '50–74', count: accused.filter((a: any) => (a.risk_score ?? 0) >= 50 && (a.risk_score ?? 0) < 75).length, color: 'bg-amber-500' },
    { label: '75–89', count: accused.filter((a: any) => (a.risk_score ?? 0) >= 75 && (a.risk_score ?? 0) < 90).length, color: 'bg-orange-500' },
    { label: '90–100', count: accused.filter((a: any) => (a.risk_score ?? 0) >= 90).length, color: 'bg-red-500' },
  ]
  const maxBucket = Math.max(...buckets.map(b => b.count), 1)

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-alert-red" />
          <div>
            <h1 className="text-base font-semibold text-service-blue">Risk Intelligence</h1>
            <p className="text-xs text-text-tertiary">{user?.station_name} · GradientBoosting model</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 text-center">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-lg font-bold text-red-400 tabular-nums">{highRisk.length}</p>
          <p className="text-[10px] text-text-tertiary mt-0.5">High Risk</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-lg font-bold text-amber-400 tabular-nums">{medRisk.length}</p>
          <p className="text-[10px] text-text-tertiary mt-0.5">Medium Risk</p>
        </div>
        <div className="rounded-xl border border-border-primary bg-bg-card p-3">
          <p className="text-lg font-bold text-text-primary tabular-nums">{unreviewed.length}</p>
          <p className="text-[10px] text-text-tertiary mt-0.5">Unreviewed</p>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
          <p className="text-lg font-bold text-service-blue tabular-nums">{avgScore}</p>
          <p className="text-[10px] text-text-tertiary mt-0.5">Avg Score</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 flex flex-col gap-4">
          <RiskTable accused={highRisk} title="High-Risk Accused" />

          {medRisk.length > 0 && (
            <div className="rounded-xl border border-border-primary bg-bg-card">
              <button
                onClick={() => toggleSection('medRisk')}
                className="w-full flex items-center justify-between p-4 text-xs font-medium text-text-primary hover:bg-hover-bg transition-colors"
              >
                Medium-Risk Accused ({medRisk.length})
                {collapsedSections.medRisk ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {!collapsedSections.medRisk && (
                <div className="px-4 pb-4">
                  <RiskTable accused={medRisk} title="" />
                </div>
              )}
            </div>
          )}

          {unreviewed.length > 0 && (
            <div className="rounded-xl border border-border-primary bg-bg-card">
              <button
                onClick={() => toggleSection('unreviewed')}
                className="w-full flex items-center justify-between p-4 text-xs font-medium text-text-primary hover:bg-hover-bg transition-colors"
              >
                Unreviewed Accused ({unreviewed.length})
                {collapsedSections.unreviewed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {!collapsedSections.unreviewed && (
                <div className="px-4 pb-4">
                  <RiskTable accused={unreviewed} title="" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="col-span-2 flex flex-col gap-4">
          <div className="rounded-xl border border-border-primary bg-bg-card p-4">
            <h3 className="text-xs font-medium text-text-primary mb-3">Risk Score Distribution</h3>
            <div className="space-y-2">
              {buckets.map(b => (
                <div key={b.label} className="flex items-center gap-2 text-xs">
                  <span className="w-12 text-[10px] text-text-tertiary text-right">{b.label}</span>
                  <div className="flex-1 h-3 bg-bg-card rounded-full overflow-hidden">
                    <div className={`h-full ${b.color} transition-all duration-700`} style={{ width: `${(b.count / maxBucket) * 100}%` }} />
                  </div>
                  <span className="w-8 text-[10px] text-text-secondary tabular-nums">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="rounded-xl border border-border-primary bg-bg-card p-4">
            <h3 className="text-xs font-medium text-text-primary mb-3">Model Disclaimer</h3>
            <p className="text-[10px] text-text-tertiary leading-relaxed">
              Risk scores are generated using an AI GradientBoosting model trained on historical data. These scores are strictly for investigational triage and should not be used as the sole basis for legal or operational decisions. Always corroborate with physical evidence and officer judgment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
