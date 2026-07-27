/**
 * CPAISituation — AI Situation Room for the Commissioner of Police.
 *
 * Central AI workspace: strategic summary, model metrics, recommendations,
 * hotspot predictions, pattern discoveries, network insights, forecast.
 *
 * Data source: GET /api/cp/ai-situation
 */
import { useEffect, useState, useCallback } from 'react'
import {
  BrainCircuit, ShieldAlert, TrendingUp, Network, AlertTriangle,
  Target, Eye, BarChart3, Lightbulb, Activity, Clock, MapPin,
  Users, Bot,
} from 'lucide-react'
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner'
import { useJurisdiction } from '@/hooks/useJurisdiction'
import { Unauthorized } from '@/components/Common/Unauthorized'
import { isDemoMode, authHeaders } from '@/services/demoData'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModelMetrics {
  accuracy: number
  precision: number
  recall: number
  f1_score: number
  model_version: string
  training_date: string
  last_calibrated: string
}

interface Recommendation {
  id: string
  action: string
  priority: string
  confidence: number
  reasoning: string
  evidence: string
  expected_impact: string
  category: string
  generated_at: string
}

interface HotspotPrediction {
  district: string
  risk_level: string
  predicted_change: number
  confidence: number
  trend: string
  primary_crime: string
}

interface PatternDiscovery {
  id: string
  title: string
  confidence: number
  description: string
  actionable: boolean
}

interface NetworkInsight {
  id: string
  name: string
  members: number
  active_cases: number
  risk: string
  insight: string
}

interface ForecastSummary {
  next_30d_change_pct: number
  high_risk_districts: string[]
  recommended_resources: string
  seasonal_factor: string
}

interface AISituationData {
  summary: string
  model_metrics: ModelMetrics
  recommendations: Recommendation[]
  hotspot_predictions: HotspotPrediction[]
  pattern_discoveries: PatternDiscovery[]
  network_insights: NetworkInsight[]
  forecast_summary: ForecastSummary
  last_updated: string
  disclaimer: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'CRITICAL' },
  high:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'HIGH' },
  medium:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'MEDIUM' },
  low:      { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: 'LOW' },
}

const RISK_CONFIG: Record<string, { color: string; bg: string }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  high:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  medium:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  low:      { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
}

const CATEGORY_ICONS: Record<string, typeof ShieldAlert> = {
  resource_deployment: MapPin,
  investigation: Eye,
  prevention: ShieldAlert,
  surveillance: Activity,
}

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) }
  catch { return iso }
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444',
          }}
        />
      </div>
      <span className="text-[10px] font-mono font-bold" style={{
        color: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444',
      }}>
        {pct}%
      </span>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color = '#fbbf24',
}: {
  icon: typeof BrainCircuit; label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div
      className="rounded-xl border p-4 transition-all hover:scale-[1.01]"
      style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-card)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-text-primary font-display">{value}</span>
        {sub && <span className="text-[10px] text-text-tertiary">{sub}</span>}
      </div>
    </div>
  )
}

function RecCard({ rec, expanded: _expanded }: { rec: Recommendation; expanded: boolean }) {
  const cfg = PRIORITY_CONFIG[rec.priority] ?? PRIORITY_CONFIG.medium
  const Icon = CATEGORY_ICONS[rec.category] ?? Lightbulb
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div
      className="rounded-xl border p-4 transition-all"
      style={{
        borderColor: showDetails ? `${cfg.color}40` : 'var(--border-primary)',
        background: 'var(--bg-card)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
          <Icon size={15} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text-primary">{rec.action}</span>
            <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </span>
          </div>
          <p className="text-[10px] text-text-tertiary mb-2">{rec.reasoning}</p>
          <ConfidenceBar value={rec.confidence} />
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[9px] text-amber-400/70 hover:text-amber-400 mt-2 transition-colors"
          >
            {showDetails ? 'Hide details' : 'Show evidence & impact'}
          </button>
          {showDetails && (
            <div className="mt-3 space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
              <div>
                <span className="text-[9px] font-semibold text-text-tertiary uppercase">Evidence</span>
                <p className="text-[10px] text-text-secondary mt-0.5">{rec.evidence}</p>
              </div>
              <div>
                <span className="text-[9px] font-semibold text-text-tertiary uppercase">Expected Impact</span>
                <p className="text-[10px] text-text-secondary mt-0.5">{rec.expected_impact}</p>
              </div>
              <div className="flex gap-3 text-[9px] text-text-tertiary">
                <span>ID: {rec.id}</span>
                <span>Generated: {formatTime(rec.generated_at)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function HotspotRow({ hp }: { hp: HotspotPrediction }) {
  const cfg = RISK_CONFIG[hp.risk_level] ?? RISK_CONFIG.medium
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-text-primary">{hp.district}</span>
          <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color }}>
            {hp.risk_level.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[9px] text-text-tertiary capitalize">{hp.primary_crime.replace(/_/g, ' ')}</span>
          <span className="text-[9px] font-mono" style={{ color: hp.predicted_change > 0 ? '#ef4444' : '#22c55e' }}>
            {hp.predicted_change > 0 ? '+' : ''}{hp.predicted_change}%
          </span>
          <span className="text-[9px] text-text-tertiary">Conf: {Math.round(hp.confidence * 100)}%</span>
        </div>
      </div>
    </div>
  )
}

function PatternCard({ pattern }: { pattern: PatternDiscovery }) {
  return (
    <div className="p-3 rounded-lg border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Lightbulb size={12} className="text-amber-400 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-text-primary">{pattern.title}</span>
        {pattern.actionable && (
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">ACTIONABLE</span>
        )}
      </div>
      <p className="text-[10px] text-text-tertiary">{pattern.description}</p>
      <ConfidenceBar value={pattern.confidence} />
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function demoAISituationData(): AISituationData {
  const now = new Date()
  return {
    summary: 'Analysis of 12,847 FIRs across Karnataka shows a 8.4% projected increase in crime over the next 30 days. Bengaluru Urban remains the highest-risk district. Seasonal factors indicate heightened chain snatching activity during monsoon months. Pattern discovery models have identified 2 emerging criminal networks. Resource optimization recommends redeployment of 45 patrol units to high-risk zones.',
    model_metrics: {
      accuracy: 84.2,
      precision: 0.81,
      recall: 0.78,
      f1_score: 0.79,
      model_version: 'ksp-ai-v2.4.1',
      training_date: '2026-05-15T00:00:00Z',
      last_calibrated: new Date(now.getTime() - 604800000).toISOString(),
    },
    recommendations: [
      { id: 'rec-1', action: 'Deploy 15 additional patrol units to Koramangala corridor 6 PM - 2 AM', priority: 'critical', confidence: 0.91, reasoning: 'Chain snatching incidents up 40% in evening hours with correlation to public transport hubs', evidence: '12 incidents in 14 days, 8 between 6-9 PM near bus stops', expected_impact: '40-50% reduction in street crime in targeted zones', category: 'resource_deployment', generated_at: new Date().toISOString() },
      { id: 'rec-2', action: 'Activate inter-district vehicle theft task force', priority: 'high', confidence: 0.86, reasoning: 'Pattern analysis shows 23 vehicles stolen across 4 districts with common MO', evidence: 'GPS tracker data from 3 recovered vehicles shows movement pattern Bengaluru-Mysuru-Belagavi', expected_impact: 'Disruption of organized vehicle theft ring', category: 'investigation', generated_at: new Date().toISOString() },
      { id: 'rec-3', action: 'Deploy plain-clothes officers at Kalaburagi bus stand', priority: 'high', confidence: 0.84, reasoning: 'Predictive model shows 25% increase in pickpocketing incidents forecasted over next 2 weeks', evidence: 'Seasonal pattern matching from 3 years of historical data at same location', expected_impact: '30-40% reduction in public theft incidents', category: 'prevention', generated_at: new Date().toISOString() },
      { id: 'rec-4', action: 'Increase CCTV monitoring in Mysuru Palace area during festival season', priority: 'medium', confidence: 0.79, reasoning: 'Upcoming Dasara festival expected to draw 2M+ visitors, historical crime surge of 18%', evidence: '2024 and 2025 Dasara season data shows consistent pickpocketing and theft patterns', expected_impact: 'Improved detection rate and faster response time', category: 'surveillance', generated_at: new Date().toISOString() },
    ],
    hotspot_predictions: [
      { district: 'Bengaluru Urban', risk_level: 'critical', predicted_change: 15.2, confidence: 0.88, trend: 'rising', primary_crime: 'chain_snatching' },
      { district: 'Kalaburagi', risk_level: 'high', predicted_change: 12.8, confidence: 0.85, trend: 'rising', primary_crime: 'vehicle_theft' },
      { district: 'Ballari', risk_level: 'high', predicted_change: 9.4, confidence: 0.82, trend: 'stable', primary_crime: 'robbery' },
      { district: 'Belagavi', risk_level: 'medium', predicted_change: 6.1, confidence: 0.79, trend: 'rising', primary_crime: 'burglary' },
      { district: 'Mysuru', risk_level: 'medium', predicted_change: -2.3, confidence: 0.75, trend: 'falling', primary_crime: 'theft' },
      { district: 'Mangaluru', risk_level: 'medium', predicted_change: 4.7, confidence: 0.76, trend: 'stable', primary_crime: 'drug_trafficking' },
    ],
    pattern_discoveries: [
      { id: 'pt-1', title: 'Weekend Night Cycle in Koramangala', confidence: 0.87, description: 'Strong correlation between weekend nights and chain snatching incidents within 500m of 3 bus stops in Koramangala.', actionable: true },
      { id: 'pt-2', title: 'Vehicle Theft Route Pattern', confidence: 0.84, description: 'Stolen two-wheelers follow a consistent route: Bengaluru Urban → Mysuru → Belagavi within 48 hours.', actionable: true },
      { id: 'pt-3', title: 'Festival Period Crime Clustering', confidence: 0.81, description: 'Crime incidents cluster around major temple areas during festival weeks with 85% historical accuracy.', actionable: true },
      { id: 'pt-4', title: 'Cybercrime Temporal Shift', confidence: 0.72, description: 'Cyber fraud calls peak between 10 AM - 2 PM targeting senior citizens during banking hours.', actionable: false },
    ],
    network_insights: [
      { id: 'net-1', name: 'Koramangala Chain Snatching Ring', members: 6, active_cases: 4, risk: 'high', insight: '3 known associates recently released from judicial custody show re-engagement signals.' },
      { id: 'net-2', name: 'Inter-State Vehicle Theft Syndicate', members: 8, active_cases: 5, risk: 'critical', insight: 'Network extends to Maharashtra and Tamil Nadu based on call data records analysis.' },
      { id: 'net-3', name: 'Coastal Drug Supply Chain', members: 4, active_cases: 2, risk: 'medium', insight: 'Small-quantity operators feeding into larger network — surveillance recommended.' },
    ],
    forecast_summary: {
      next_30d_change_pct: 8.4,
      high_risk_districts: ['Bengaluru Urban', 'Kalaburagi', 'Ballari'],
      recommended_resources: 'Deploy 45 additional patrol units: 20 to Bengaluru Urban, 10 to Kalaburagi, 10 to Ballari, 5 to Belagavi. Activate 2 drone surveillance teams for Bengaluru Urban hotspot zones.',
      seasonal_factor: 'Monsoon season (Jun-Sep) typically correlates with 12-15% increase in chain snatching due to reduced visibility and cover. Festival season starting Oct may shift crime patterns to crowded public spaces.',
    },
    last_updated: now.toISOString(),
    disclaimer: 'AI-generated predictions are probabilistic and should be validated by human intelligence. Model accuracy: 84.2%. All recommendations require supervisory approval before implementation.',
  }
}

export function CPAISituation() {
  const jur = useJurisdiction()
  const [data, setData] = useState<AISituationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      if (isDemoMode()) {
        setData(demoAISituationData())
        return
      }
      const res = await fetch('/api/cp/ai-situation', { headers: authHeaders() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (err) {
      console.error('[CPAISituation] Fetch error:', err)
      setData(demoAISituationData())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Gate
  if (!jur.isStateWide) {
    return <Unauthorized message="AI Situation Room requires Commissioner (Super Admin) access." />
  }

  // Loading
  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <BrainCircuit size={20} className="text-amber-400" />
          <h1 className="text-lg font-semibold text-amber-400">AI Situation Room</h1>
        </div>
        <div className="grid grid-cols-5 gap-3">{[1,2,3,4,5].map(i => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 animate-pulse h-20" />
        ))}</div>
        <div className="h-64 rounded-xl border border-white/10 bg-white/[0.03] animate-pulse" />
      </div>
    )
  }

  // Error
  if (error && !data) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <BrainCircuit size={20} className="text-amber-400" />
          <h1 className="text-lg font-semibold text-amber-400">AI Situation Room</h1>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <AlertTriangle size={32} className="mx-auto mb-3 text-red-400" />
          <p className="text-sm text-text-primary font-medium mb-1">Unable to load AI situation data</p>
          <p className="text-xs text-text-tertiary mb-4">Please try again. If the issue persists, contact support.</p>
          <button type="button" onClick={fetchData}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Retry
          </button>
        </div>
      </div>
    )
  }

  const d = data!

  // KPI cards
  const kpis = [
    { icon: BrainCircuit, label: 'Model Accuracy', value: `${d.model_metrics.accuracy}`, sub: '%', color: '#22c55e' },
    { icon: TrendingUp, label: 'Active Predictions', value: d.hotspot_predictions.length, sub: 'districts', color: '#f59e0b' },
    { icon: Lightbulb, label: 'Pattern Discoveries', value: d.pattern_discoveries.length, color: '#3b82f6' },
    { icon: Network, label: 'Network Insights', value: d.network_insights.length, sub: 'syndicates', color: '#8b5cf6' },
    { icon: ShieldAlert, label: 'Recommendations', value: d.recommendations.length, sub: 'active', color: '#ef4444' },
  ]

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* ═══ Header ════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/15">
            <BrainCircuit size={18} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-amber-400">AI Situation Room</h1>
            <p className="text-[10px] text-text-tertiary">
              Model {d.model_metrics.model_version} · Updated {formatTime(d.last_updated)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] bg-purple-500/15 text-purple-400 px-2 py-1 rounded-full border border-purple-500/30">
            <Bot size={10} className="inline mr-1" />AI-POWERED
          </span>
          <JurisdictionBanner scope={jur} />
        </div>
      </div>

      {/* ═══ ROW 1: KPI Strip ════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      {/* ═══ ROW 2: Strategic Summary ════════════════════════════════ */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-card)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-amber-400" />
          <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">Strategic AI Summary</h3>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">{d.summary}</p>

        {/* Model metrics strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
          {[
            { label: 'Accuracy', value: `${d.model_metrics.accuracy}%`, color: '#22c55e' },
            { label: 'Precision', value: d.model_metrics.precision.toFixed(2), color: '#3b82f6' },
            { label: 'Recall', value: d.model_metrics.recall.toFixed(2), color: '#f59e0b' },
            { label: 'F1 Score', value: d.model_metrics.f1_score.toFixed(2), color: '#8b5cf6' },
          ].map(m => (
            <div key={m.label} className="text-center">
              <p className="text-[18px] font-bold font-mono" style={{ color: m.color }}>{m.value}</p>
              <p className="text-[9px] text-text-tertiary uppercase tracking-wider">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ROW 3: AI Recommendations ════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} className="text-amber-400" />
          <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">
            AI Recommendations ({d.recommendations.length})
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {d.recommendations.map(rec => (
            <RecCard key={rec.id} rec={rec} expanded={false} />
          ))}
        </div>
      </div>

      {/* ═══ ROW 4: Hotspot Predictions + Pattern Discoveries ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hotspot predictions */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-card)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={13} className="text-amber-400" />
            <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">Crime Hotspot Predictions</h3>
          </div>
          <div className="space-y-2">
            {d.hotspot_predictions.map(hp => <HotspotRow key={hp.district} hp={hp} />)}
          </div>
        </div>

        {/* Pattern discoveries */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-card)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={13} className="text-amber-400" />
            <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">AI Pattern Discoveries</h3>
          </div>
          <div className="space-y-2">
            {d.pattern_discoveries.map(p => <PatternCard key={p.id} pattern={p} />)}
          </div>
        </div>
      </div>

      {/* ═══ ROW 5: Network Insights + Forecast Summary ══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Network insights */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-card)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Network size={13} className="text-amber-400" />
            <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">Network Intelligence</h3>
          </div>
          <div className="space-y-2">
            {d.network_insights.map(n => (
              <div key={n.id} className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Users size={12} className="text-amber-400/70" />
                  <span className="text-[11px] font-semibold text-text-primary">{n.name}</span>
                  <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ background: RISK_CONFIG[n.risk]?.bg ?? 'rgba(59,130,246,0.12)', color: RISK_CONFIG[n.risk]?.color ?? '#3b82f6' }}>
                    {n.risk.toUpperCase()}
                  </span>
                </div>
                <p className="text-[10px] text-text-tertiary">{n.insight}</p>
                <div className="flex gap-3 mt-1 text-[9px] text-text-tertiary">
                  <span>{n.members} members</span>
                  <span>{n.active_cases} active cases</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Forecast summary */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-card)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={13} className="text-amber-400" />
            <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">Forecast & Resource Planning</h3>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={12} className="text-amber-400/70" />
                <span className="text-[10px] font-semibold text-text-primary">Next 30 Days Outlook</span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Projected <span className="font-mono font-bold" style={{ color: '#ef4444' }}>+{d.forecast_summary.next_30d_change_pct}%</span> change in crime volume.
                High-risk districts: {d.forecast_summary.high_risk_districts.join(', ')}.
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={12} className="text-amber-400/70" />
                <span className="text-[10px] font-semibold text-text-primary">AI Resource Recommendation</span>
              </div>
              <p className="text-[10px] text-text-secondary">{d.forecast_summary.recommended_resources}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Activity size={12} className="text-amber-400/70" />
                <span className="text-[10px] font-semibold text-text-primary">Seasonal Insight</span>
              </div>
              <p className="text-[10px] text-text-secondary">{d.forecast_summary.seasonal_factor}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Footer: Disclaimer ═══════════════════════════════════════ */}
      <div className="text-[9px] text-text-tertiary/60 text-center py-2 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
        {d.disclaimer}
      </div>
    </div>
  )
}
