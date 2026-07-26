import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users, ExternalLink, FileText, AlertTriangle, Phone, Car,
  CreditCard, Clock, Shield, Target, ChevronDown, ChevronRight,
} from 'lucide-react';
import type { NetworkNode } from '@/types/network';
import { NODE_TYPE_STYLES } from '@/types/network';
import { api } from '@/api/client';

interface NodeInspectorProps {
  node: NetworkNode;
  connectedCount: number;
  typeBreakdown?: Record<string, number>;
}

interface NodeDetailData {
  id: string;
  label: string;
  type: string;
  risk_score?: number;
  known_associates: { name: string; shared_cases: string }[];
  connected_firs: { crime_no: string; status: string; date: string; crime_head: string; station?: string }[];
  evidence: { type: string; detail: string; case: string }[];
  known_vehicles: string[];
  known_phones: string[];
  known_properties: string[];
  financial_links: { account: string; type: string }[];
  timeline: { date: string; event: string; type: string }[];
  ai_summary?: string;
  recommendations: string[];
  metadata: Record<string, string>;
}

export function NodeInspector({ node, connectedCount, typeBreakdown }: NodeInspectorProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const initial = (node.label || '?').charAt(0).toUpperCase();
  const style = NODE_TYPE_STYLES[node.type];
  const color = style?.color || '#5F6368';
  const riskScore = node.risk_score ?? 0;
  const riskLevel = riskScore > 0.7 ? 'Critical' : riskScore > 0.4 ? 'Medium' : 'Low';

  const [detail, setDetail] = useState<NodeDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('firs');

  // Fetch node details from API
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const encodedId = encodeURIComponent(node.id);
    api.get<NodeDetailData>(`/intelligence/v1/networks/node-details/${encodedId}`)
      .then((d) => { if (!cancelled) setDetail(d as unknown as NodeDetailData); })
      .catch(() => { if (!cancelled) setDetail(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [node.id]);

  const toggleSection = (s: string) => setExpandedSection((prev) => prev === s ? '' : s);

  const rs = detail?.risk_score ?? riskScore;

  return (
    <div className="flex flex-col gap-4 text-[13px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0"
          style={{ background: `${color}20`, color, border: `2px solid ${color}` }}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {detail?.label || node.label}
          </p>
          <span
            className="badge mt-1"
            style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
          >
            {style?.label || node.type.replace('_', ' ')}
          </span>
        </div>
        {/* Risk badge */}
        <span
          className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0"
          style={{
            background: rs > 0.7 ? 'rgba(255,51,102,0.15)' : rs > 0.4 ? 'rgba(245,158,11,0.15)' : 'rgba(0,230,118,0.15)',
            color: rs > 0.7 ? '#FF3366' : rs > 0.4 ? '#F59E0B' : '#00E676',
            border: `1px solid ${rs > 0.7 ? '#FF336640' : rs > 0.4 ? '#F59E0B40' : '#00E67640'}`,
          }}
        >
          {riskLevel} · {(rs * 100).toFixed(0)}
        </span>
      </div>

      {/* Risk bar */}
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${(rs * 100).toFixed(0)}%`,
            background: rs > 0.7 ? '#FF3366' : rs > 0.4 ? '#F59E0B' : '#00E676',
          }}
        />
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat icon={<FileText className="w-3.5 h-3.5" />} label="FIRs" value={detail?.connected_firs?.length ?? node.fir_count ?? 0} color="#2B7FFF" />
        <MiniStat icon={<Users className="w-3.5 h-3.5" />} label="Associates" value={detail?.known_associates?.length ?? connectedCount} color="#8B5CF6" />
        <MiniStat icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Evidence" value={detail?.evidence?.length ?? node.evidence_count ?? 0} color="#FB923C" />
      </div>

      {/* AI Summary */}
      {detail?.ai_summary && (
        <div className="px-3 py-2.5 rounded-lg" style={{ background: 'rgba(43,127,255,0.08)', border: '1px solid rgba(43,127,255,0.15)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className="w-3.5 h-3.5" style={{ color: '#2B7FFF' }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#2B7FFF' }}>AI Intelligence</span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: '#94A3B8' }}>{detail.ai_summary}</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-3 text-[11px]" style={{ color: '#5C6573' }}>Loading details...</div>
      )}

      {/* Connected FIRs */}
      {detail?.connected_firs && detail.connected_firs.length > 0 && (
        <CollapsibleSection
          title="Connected FIRs"
          icon={<FileText className="w-3.5 h-3.5" />}
          count={detail.connected_firs.length}
          color="#2B7FFF"
          expanded={expandedSection === 'firs'}
          onToggle={() => toggleSection('firs')}
        >
          {detail.connected_firs.map((f, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5 text-[11px]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#2B7FFF' }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" style={{ color: '#E8EAED' }}>{f.crime_no}</p>
                <p style={{ color: '#5C6573' }}>{f.crime_head} · {f.date}</p>
                <p style={{ color: '#5C6573' }}>{f.station}{f.status ? ` · ${f.status}` : ''}</p>
              </div>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Known Associates */}
      {detail?.known_associates && detail.known_associates.length > 0 && (
        <CollapsibleSection
          title="Known Associates"
          icon={<Users className="w-3.5 h-3.5" />}
          count={detail.known_associates.length}
          color="#8B5CF6"
          expanded={expandedSection === 'associates'}
          onToggle={() => toggleSection('associates')}
        >
          {detail.known_associates.map((a, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-[11px]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: '#E8EAED' }}>{a.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>{a.shared_cases} shared</span>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Phones & Vehicles */}
      {(detail?.known_phones?.length || detail?.known_vehicles?.length) ? (
        <div className="grid grid-cols-2 gap-2">
          {detail?.known_phones?.length ? (
            <div className="px-2.5 py-2 rounded-lg" style={{ background: 'rgba(43,127,255,0.06)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Phone className="w-3 h-3" style={{ color: '#2B7FFF' }} />
                <span className="text-[9px] font-semibold uppercase" style={{ color: '#2B7FFF' }}>Phones</span>
              </div>
              {detail.known_phones.map((p, i) => (
                <p key={i} className="text-[11px] font-mono" style={{ color: '#94A3B8' }}>{p}</p>
              ))}
            </div>
          ) : null}
          {detail?.known_vehicles?.length ? (
            <div className="px-2.5 py-2 rounded-lg" style={{ background: 'rgba(0,212,255,0.06)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Car className="w-3 h-3" style={{ color: '#00D4FF' }} />
                <span className="text-[9px] font-semibold uppercase" style={{ color: '#00D4FF' }}>Vehicles</span>
              </div>
              {detail.known_vehicles.map((v, i) => (
                <p key={i} className="text-[11px] font-mono" style={{ color: '#94A3B8' }}>{v}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Financial Links */}
      {detail?.financial_links && detail.financial_links.length > 0 && (
        <div className="px-2.5 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.06)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <CreditCard className="w-3 h-3" style={{ color: '#F59E0B' }} />
            <span className="text-[9px] font-semibold uppercase" style={{ color: '#F59E0B' }}>Financial Links</span>
          </div>
          {detail.financial_links.map((f, i) => (
            <p key={i} className="text-[11px] font-mono" style={{ color: '#94A3B8' }}>{f.account} <span className="text-[9px]" style={{ color: '#5C6573' }}>({f.type})</span></p>
          ))}
        </div>
      )}

      {/* Connected entity type breakdown */}
      {typeBreakdown && Object.keys(typeBreakdown).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#5C6573' }}>Connected Types</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(typeBreakdown).map(([type, count]) => {
              const ts = NODE_TYPE_STYLES[type as keyof typeof NODE_TYPE_STYLES];
              return (
                <span
                  key={type}
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    background: `${ts?.color || '#5F6368'}15`,
                    color: ts?.color || '#5F6368',
                    border: `1px solid ${ts?.color || '#5F6368'}30`,
                  }}
                >
                  {count} {ts?.label || type}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {detail?.recommendations && detail.recommendations.length > 0 && (
        <div className="px-2.5 py-2 rounded-lg" style={{ background: 'rgba(255,51,102,0.06)', border: '1px solid rgba(255,51,102,0.1)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield className="w-3.5 h-3.5" style={{ color: '#FF3366' }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#FF3366' }}>Recommendations</span>
          </div>
          {detail.recommendations.map((r, i) => (
            <p key={i} className="text-[11px] py-0.5" style={{ color: '#94A3B8' }}>• {r}</p>
          ))}
        </div>
      )}

      {/* Timeline */}
      {detail?.timeline && detail.timeline.length > 0 && (
        <CollapsibleSection
          title="Timeline"
          icon={<Clock className="w-3.5 h-3.5" />}
          count={detail.timeline.length}
          color="#A78BFA"
          expanded={expandedSection === 'timeline'}
          onToggle={() => toggleSection('timeline')}
        >
          {detail.timeline.map((t, i) => (
            <div key={i} className="flex items-start gap-2 py-1 text-[11px]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#A78BFA' }} />
              <div>
                <p style={{ color: '#E8EAED' }}>{t.event}</p>
                <p className="text-[10px]" style={{ color: '#5C6573' }}>{t.date}</p>
              </div>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Metadata */}
      {detail?.metadata && Object.keys(detail.metadata).length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#5C6573' }}>Metadata</p>
          {Object.entries(detail.metadata).map(([key, val]) => (
            <div key={key} className="flex justify-between text-[11px]">
              <span style={{ color: '#5C6573' }}>{key}</span>
              <span className="font-medium" style={{ color: '#94A3B8' }}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action button */}
      <button
        onClick={() => {
          const base = location.pathname.startsWith('/pi') ? '/pi/cases' : '/firs';
          navigate(`${base}?search=${node.id}`);
        }}
        className="btn-primary w-full flex items-center justify-center gap-2 mt-1"
      >
        <ExternalLink className="w-4 h-4" />
        View Related FIRs
      </button>
    </div>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────────────

function CollapsibleSection({ title, icon, count, color, expanded, onToggle, children }: {
  title: string; icon: React.ReactNode; count: number; color: string;
  expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 w-full text-left py-1"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" style={{ color }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color }} />}
        {icon}
        <span className="text-[11px] font-semibold" style={{ color }}>{title}</span>
        <span className="text-[9px] ml-auto px-1.5 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>{count}</span>
      </button>
      {expanded && (
        <div className="mt-1 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: `${color}08` }}>
      <div style={{ color }}>{icon}</div>
      <div>
        <p className="text-[12px] font-bold font-mono" style={{ color }}>{value}</p>
        <p className="text-[9px]" style={{ color: '#5C6573' }}>{label}</p>
      </div>
    </div>
  );
}
