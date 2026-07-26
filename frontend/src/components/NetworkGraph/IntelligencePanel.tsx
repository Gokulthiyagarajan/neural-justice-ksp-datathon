import { useState, useEffect } from 'react';
import { X, Brain, Crown, Users, AlertTriangle, TrendingUp, Lightbulb, Shield } from 'lucide-react';
import { api } from '@/api/client';

interface IntelligenceInsight {
  type: string;
  title: string;
  description: string;
  severity: string;
  entities: string[];
  confidence: number;
  recommendation?: string;
}

interface IntelligenceReport {
  risk_assessment: IntelligenceInsight[];
  kingpin_analysis: IntelligenceInsight[];
  community_detection: IntelligenceInsight[];
  suspicious_patterns: IntelligenceInsight[];
  money_flow: IntelligenceInsight[];
  investigation_suggestions: IntelligenceInsight[];
  summary: string;
  total_nodes: number;
  total_edges: number;
  total_communities: number;
  highest_risk_entities: { name: string; risk: number; firs: number }[];
}

interface IntelligencePanelProps {
  onClose: () => void;
}

const SECTION_CONFIG = [
  { key: 'risk_assessment', label: 'Risk Assessment', icon: AlertTriangle, color: '#FF3366' },
  { key: 'kingpin_analysis', label: 'Key Players', icon: Crown, color: '#F59E0B' },
  { key: 'community_detection', label: 'Clusters', icon: Users, color: '#8B5CF6' },
  { key: 'suspicious_patterns', label: 'Patterns', icon: TrendingUp, color: '#00D4FF' },
  { key: 'money_flow', label: 'Money Flow', icon: TrendingUp, color: '#00E676' },
  { key: 'investigation_suggestions', label: 'Investigation', icon: Lightbulb, color: '#2B7FFF' },
] as const;

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#FF3366',
  high: '#F59E0B',
  medium: '#00D4FF',
  low: '#00E676',
  info: '#94A3B8',
};

export function IntelligencePanel({ onClose }: IntelligencePanelProps) {
  const [data, setData] = useState<IntelligenceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('risk_assessment');

  useEffect(() => {
    let cancelled = false;
    api.get<IntelligenceReport>('/intelligence/v1/networks/intelligence')
      .then((d) => { if (!cancelled) setData(d as unknown as IntelligenceReport); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const currentInsights = data ? (data as any)[activeTab] as IntelligenceInsight[] : [];

  return (
    <div
      className="absolute top-16 left-4 z-30 flex flex-col overflow-hidden"
      style={{
        width: 340,
        maxHeight: 'calc(100vh - 100px)',
        borderRadius: '14px',
        background: 'rgba(11, 17, 32, 0.96)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4" style={{ color: '#2B7FFF' }} />
          <span className="text-[13px] font-semibold" style={{ color: '#E8EAED' }}>AI Intelligence</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors">
          <X className="w-3.5 h-3.5" style={{ color: '#5C6573' }} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-[12px]" style={{ color: '#5C6573' }}>Analyzing network...</div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 m-3 rounded-lg" style={{ background: 'rgba(255,51,102,0.1)', color: '#FF3366' }}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-[11px]">{error}</span>
        </div>
      )}

      {data && (
        <>
          {/* Summary */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-[11px] leading-relaxed" style={{ color: '#94A3B8' }}>{data.summary}</p>
            <div className="flex gap-3 mt-2">
              <MiniMetric label="Nodes" value={data.total_nodes} color="#2B7FFF" />
              <MiniMetric label="Edges" value={data.total_edges} color="#8B5CF6" />
              <MiniMetric label="Clusters" value={data.total_communities} color="#F59E0B" />
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex overflow-x-auto px-2 py-2 gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', scrollbarWidth: 'none' }}>
            {SECTION_CONFIG.map((s) => {
              const items = (data as any)[s.key] as IntelligenceInsight[];
              const isActive = activeTab === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setActiveTab(s.key)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors shrink-0"
                  style={{
                    background: isActive ? `${s.color}15` : 'transparent',
                    color: isActive ? s.color : '#5C6573',
                    border: `1px solid ${isActive ? `${s.color}30` : 'transparent'}`,
                  }}
                >
                  <s.icon className="w-3 h-3" />
                  {s.label}
                  {items?.length > 0 && (
                    <span className="ml-0.5 text-[9px] px-1 rounded-full" style={{ background: `${s.color}20` }}>{items.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Insights */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ maxHeight: 400, scrollbarWidth: 'thin' }}>
            {currentInsights.length === 0 && (
              <p className="text-[11px] text-center py-4" style={{ color: '#5C6573' }}>No insights in this category</p>
            )}
            {currentInsights.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>

          {/* Top Risk Entities */}
          {data.highest_risk_entities.length > 0 && (
            <div className="px-3 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Shield className="w-3.5 h-3.5" style={{ color: '#FF3366' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#FF3366' }}>Highest Risk</span>
              </div>
              <div className="space-y-1">
                {data.highest_risk_entities.slice(0, 5).map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono w-4" style={{ color: '#5C6573' }}>#{i + 1}</span>
                      <span className="truncate max-w-[140px]" style={{ color: '#E8EAED' }}>{e.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]" style={{ color: '#5C6573' }}>{e.firs} FIRs</span>
                      <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${e.risk * 100}%`, background: '#FF3366' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: IntelligenceInsight }) {
  const [expanded, setExpanded] = useState(false);
  const sevColor = SEVERITY_COLORS[insight.severity] || '#94A3B8';

  return (
    <div
      className="rounded-lg px-3 py-2 cursor-pointer transition-colors hover:bg-white/5"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
      onClick={() => setExpanded((p) => !p)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium" style={{ color: '#E8EAED' }}>{insight.title}</p>
        <span
          className="text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
          style={{ background: `${sevColor}15`, color: sevColor, border: `1px solid ${sevColor}30` }}
        >
          {insight.severity}
        </span>
      </div>
      <p className="text-[11px] mt-1 leading-relaxed" style={{ color: '#5C6573' }}>
        {expanded ? insight.description : insight.description.slice(0, 100) + (insight.description.length > 100 ? '...' : '')}
      </p>
      {expanded && insight.recommendation && (
        <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 rounded" style={{ background: 'rgba(43,127,255,0.06)' }}>
          <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" style={{ color: '#2B7FFF' }} />
          <p className="text-[10px]" style={{ color: '#2B7FFF' }}>{insight.recommendation}</p>
        </div>
      )}
      {expanded && insight.entities.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {insight.entities.slice(0, 5).map((e, i) => (
            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#94A3B8' }}>{e}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[9px]" style={{ color: '#5C6573' }}>
          Confidence: {(insight.confidence * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[13px] font-bold font-mono" style={{ color }}>{value}</span>
      <span className="text-[9px] uppercase" style={{ color: '#5C6573' }}>{label}</span>
    </div>
  );
}
