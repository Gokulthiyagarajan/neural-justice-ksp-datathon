import { useState, useEffect } from 'react';
import { X, Shield, Users, MapPin, AlertTriangle } from 'lucide-react';
import { api } from '@/api/client';

interface Syndicate {
  id: string;
  name: string;
  leader: string;
  member_count: number;
  members: string[];
  risk_score: number;
  crime_type: string;
  district?: string;
  linked_firs: string[];
  status: string;
  confidence: number;
}

interface SyndicateReport {
  syndicates: Syndicate[];
  total_active: number;
  total_networks: number;
}

interface SyndicatesPanelProps {
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#FF3366',
  dormant: '#F59E0B',
  under_investigation: '#2B7FFF',
  dismantled: '#00E676',
};

export function SyndicatesPanel({ onClose }: SyndicatesPanelProps) {
  const [data, setData] = useState<SyndicateReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<SyndicateReport>('/intelligence/v1/networks/syndicates')
      .then((d) => { if (!cancelled) setData(d as unknown as SyndicateReport); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      className="absolute top-16 right-4 z-30 flex flex-col overflow-hidden"
      style={{
        width: 320,
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
          <Shield className="w-4 h-4" style={{ color: '#FF3366' }} />
          <span className="text-[13px] font-semibold" style={{ color: '#E8EAED' }}>Active Syndicates</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors">
          <X className="w-3.5 h-3.5" style={{ color: '#5C6573' }} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-[12px]" style={{ color: '#5C6573' }}>Detecting syndicates...</div>
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
          {/* Summary bar */}
          <div className="flex gap-4 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: '#FF3366' }} />
              <span className="text-[11px]" style={{ color: '#94A3B8' }}>
                <strong style={{ color: '#FF3366' }}>{data.total_active}</strong> Active
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: '#8B5CF6' }} />
              <span className="text-[11px]" style={{ color: '#94A3B8' }}>
                <strong style={{ color: '#8B5CF6' }}>{data.total_networks}</strong> Total
              </span>
            </div>
          </div>

          {/* Syndicate list */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ maxHeight: 500, scrollbarWidth: 'thin' }}>
            {data.syndicates.length === 0 && (
              <p className="text-[11px] text-center py-4" style={{ color: '#5C6573' }}>No syndicates detected</p>
            )}
            {data.syndicates.map((s) => {
              const isExpanded = expandedId === s.id;
              const statusColor = STATUS_COLORS[s.status] || '#94A3B8';
              return (
                <div
                  key={s.id}
                  className="rounded-lg cursor-pointer transition-colors hover:bg-white/5"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                >
                  {/* Card header */}
                  <div className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium truncate" style={{ color: '#E8EAED' }}>{s.name}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#5C6573' }}>
                          Led by <span style={{ color: '#F59E0B' }}>{s.leader}</span>
                        </p>
                      </div>
                      <span
                        className="text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}
                      >
                        {s.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Quick stats */}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" style={{ color: '#8B5CF6' }} />
                        <span className="text-[10px]" style={{ color: '#94A3B8' }}>{s.member_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" style={{ color: '#FF3366' }} />
                        <span className="text-[10px]" style={{ color: '#94A3B8' }}>{(s.risk_score * 100).toFixed(0)}</span>
                      </div>
                      {s.district && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" style={{ color: '#0EA5E9' }} />
                          <span className="text-[10px] truncate max-w-[80px]" style={{ color: '#94A3B8' }}>{s.district}</span>
                        </div>
                      )}
                      <span className="text-[9px] ml-auto" style={{ color: '#5C6573' }}>
                        Conf: {(s.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    {/* Risk bar */}
                    <div className="w-full h-1 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${s.risk_score * 100}%`, background: statusColor }}
                      />
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      {/* Crime type */}
                      <div className="pt-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#5C6573' }}>Crime Type</span>
                        <p className="text-[11px] mt-0.5" style={{ color: '#E8EAED' }}>{s.crime_type}</p>
                      </div>

                      {/* Members */}
                      {s.members.length > 0 && (
                        <div>
                          <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#5C6573' }}>Members ({s.members.length})</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {s.members.slice(0, 10).map((m, i) => (
                              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>{m}</span>
                            ))}
                            {s.members.length > 10 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#5C6573' }}>+{s.members.length - 10} more</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Linked FIRs */}
                      {s.linked_firs.length > 0 && (
                        <div>
                          <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#5C6573' }}>Linked FIRs ({s.linked_firs.length})</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {s.linked_firs.slice(0, 6).map((f, i) => (
                              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: 'rgba(43,127,255,0.1)', color: '#2B7FFF' }}>{f}</span>
                            ))}
                            {s.linked_firs.length > 6 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#5C6573' }}>+{s.linked_firs.length - 6}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
