import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createIncident, getIncident, getIncidentTimeline, getIncidentAudit, addTimelineEvent, listIncidents } from '@/api/incident';
import type { Incident, IncidentTimelineEvent } from '@/types/incident';
import type { Hotspot } from '@/types/geo';

interface IncidentCommanderProps {
  districtId: string;
  alert?: Record<string, any> | null;
  hotspot?: Hotspot | null;
  onClose: () => void;
  onOpenCopilot: (incident: Incident) => void;
  onOpenNetwork: (incident: Incident) => void;
  onGeneratePdf: (incident: Incident) => void;
  onNotifyCommand: (incident: Incident) => void;
}

export function IncidentCommander({ districtId, alert, hotspot, onClose, onOpenCopilot, onOpenNetwork, onGeneratePdf, onNotifyCommand }: IncidentCommanderProps) {
  const { t } = useTranslation();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [allIncidents, setAllIncidents] = useState<Incident[]>([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    initIncident();
    loadAllIncidents();
  }, [alert, hotspot]);

  useEffect(() => {
    if (incident && mapCanvasRef.current) {
      drawMiniMap();
    }
  }, [incident, mapCanvasRef.current]);

  async function initIncident() {
    setLoading(true);
    setError(null);
    try {
      const source = alert || (hotspot ? {
        alert_type: hotspot.alert_type || 'emerging_hotspot',
        severity: hotspot.severity || 'Critical',
        title: hotspot.title || hotspot.label || 'Hotspot Incident',
        crime_category: hotspot.crime_category || 'multiple',
        district_id: districtId,
        lat: hotspot.lat,
        lng: hotspot.lng,
        confidence: hotspot.confidence || 75,
        supporting_fir_count: hotspot.fir_count || 0,
        related_fir_numbers: hotspot.related_firs || [],
        related_criminals: hotspot.related_criminals || [],
        ai_explanation: hotspot.ai_explanation || { summary: 'Hotspot detected with elevated crime density.', supporting_evidence: [] },
        estimated_response_time_min: hotspot.estimated_response_time_min,
        nearest_station: hotspot.nearest_station,
      } : null);
      if (!source) {
        setLoading(false);
        return;
      }
      const created = await createIncident(source);
      const full = await getIncident(created.incident_id);
      setIncident(full);
    } catch (e: any) {
      setError('Unable to create incident. Please try again.');
    }
    setLoading(false);
  }

  async function loadAllIncidents() {
    try {
      const list = await listIncidents(districtId);
      setAllIncidents(list);
    } catch { /* ignore */ }
  }

  function drawMiniMap() {
    if (!incident || !mapCanvasRef.current) return;
    const canvas = mapCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#1a2332';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2a3a4a';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const cx = w / 2, cy = h / 2;
    const gradient = ctx.createRadialGradient(cx, cy, 5, cx, cy, 60);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.6)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('INCIDENT', cx - 25, cy - 20);
    if (incident.location) {
      ctx.fillStyle = '#60a5fa';
      ctx.font = '9px monospace';
      ctx.fillText(`${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`, cx - 45, cy + 30);
    }
    ctx.fillStyle = '#34d399';
    incident.related_firs.slice(0, 5).forEach((_fir, i) => {
      const angle = (i / 5) * Math.PI * 2;
      const fx = cx + Math.cos(angle) * 35;
      const fy = cy + Math.sin(angle) * 35;
      ctx.beginPath();
      ctx.arc(fx, fy, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-bg-dark rounded-xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--alert-red)] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-text-tertiary text-sm">{t('incident.initializing')}</p>
        </div>
      </div>
    );
  }

  if (!incident && !error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
        <div className="bg-bg-dark rounded-xl p-6 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-bg-dark flex items-center justify-center mx-auto mb-3">!</div>
          <h2 className="text-white font-semibold mb-2">{t('incident.noActiveTitle')}</h2>
          <p className="text-text-tertiary text-sm mb-4">{t('incident.noActiveDesc')}</p>
          {allIncidents.length > 0 && (
            <div className="text-left">
              <p className="text-xs text-text-tertiary mb-2">Active incidents in {districtId}:</p>
              {allIncidents.slice(0, 5).map((i) => (
                <button key={i.incident_id} onClick={async () => { const f = await getIncident(i.incident_id); setIncident(f); }} className="w-full text-left text-xs text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)] py-1 border-b border-border-primary last:border-0 btn-press-sm">{i.incident_name} <span className="text-text-tertiary">({i.severity})</span></button>
              ))}
            </div>
          )}
          <button onClick={onClose} className="mt-4 text-xs text-text-tertiary hover:text-white">{t('common.close')}</button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
        <div className="bg-bg-dark rounded-xl p-6 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-[rgba(255,51,102,0.15)] flex items-center justify-center mx-auto mb-3" style={{ color: 'var(--alert-red)' }}>!</div>
          <h2 className="text-[var(--text-primary)] font-semibold mb-2">{t('incident.commandError')}</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--alert-red)' }}>Unable to complete the request. Please try again.</p>
          <button onClick={onClose} className="text-xs bg-bg-dark hover:bg-hover-bg text-white px-4 py-2 rounded-lg btn-press-sm">{t('common.dismissAction')}</button>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'map', label: 'Live Map' },
    { id: 'risk', label: 'Risk Analysis' },
    { id: 'actions', label: 'Actions' },
    { id: 'patrol', label: 'Patrol' },
    { id: 'firs', label: 'FIRs' },
    { id: 'network', label: 'Network' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'audit', label: 'Audit' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-dark text-white">
      {/* TOP BAR */}
      <div className="flex items-center justify-between bg-bg-dark border-b border-border-primary px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--alert-red)] animate-pulse" />
            <h1 className="text-sm font-bold tracking-wider uppercase" style={{ color: 'var(--alert-red)' }}>{t('incident.title')}</h1>
          </div>
          <span className="text-xs bg-bg-dark text-text-secondary px-2 py-0.5 rounded font-mono">{incident!.incident_id}</span>
          <SeverityBadge severity={incident!.severity} />
          <span className="text-xs text-text-tertiary">{incident!.district_id}</span>
        </div>
        <div className="flex items-center gap-1">
          <QuickActionButton label={t('incident.copilot')} onClick={() => onOpenCopilot(incident!)} />
          <QuickActionButton label={t('incident.network')} onClick={() => onOpenNetwork(incident!)} />
          <QuickActionButton label="PDF" onClick={() => onGeneratePdf(incident!)} />
          <QuickActionButton label={t('incident.notify')} onClick={() => onNotifyCommand(incident!)} />
          <button onClick={onClose} className="text-xs text-text-tertiary hover:text-white ml-2 px-2 py-1 rounded hover:bg-hover-bg btn-press-sm">&times; {t('common.close')}</button>
        </div>
      </div>

      {/* SECTION TABS */}
      <div className="flex gap-0.5 bg-bg-dark border-b border-border-primary px-2 overflow-x-auto flex-shrink-0">
        {sections.map((s) => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} className={`text-xs px-3 py-2 border-b-2 whitespace-nowrap transition-colors btn-press-sm ${activeSection === s.id ? 'border-[var(--alert-red)] text-[var(--text-primary)]' : 'border-transparent text-text-tertiary hover:text-text-primary'}`}>{s.label}</button>
        ))}
      </div>

      {/* MAIN CONTENT — scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSection === 'overview' && <IncidentOverview incident={incident!} />}
        {activeSection === 'map' && <IncidentMapSection incident={incident!} mapRef={mapCanvasRef} />}
        {activeSection === 'risk' && <IncidentRiskSection incident={incident!} />}
        {activeSection === 'actions' && <IncidentActionsSection incident={incident!} />}
        {activeSection === 'patrol' && <IncidentPatrolSection incident={incident!} />}
        {activeSection === 'firs' && <IncidentFIRSection incident={incident!} />}
        {activeSection === 'network' && <IncidentNetworkSection incident={incident!} onOpenNetwork={onOpenNetwork} />}
        {activeSection === 'timeline' && <IncidentTimelineSection incidentId={incident!.incident_id} noteText={noteText} setNoteText={setNoteText} />}
        {activeSection === 'audit' && <IncidentAuditSection incidentId={incident!.incident_id} />}
      </div>
    </div>
  );
}

/* ===================== Sub-Component Views ===================== */

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = { Critical: 'bg-[var(--alert-red)]', High: 'bg-[var(--alert-amber)]', Medium: 'bg-yellow-500', Low: 'bg-[rgba(0,212,255,0.15)]' };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[severity] || 'bg-bg-tertiary'}`}>{severity}</span>;
}

function QuickActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="text-[10px] bg-bg-dark hover:bg-hover-bg text-text-secondary px-2 py-1 rounded transition-colors btn-press-sm">{label}</button>;
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-bg-dark border border-border-primary rounded-lg p-3">
      <div className={`w-2 h-2 rounded-full ${color} mb-1`} />
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[10px] text-text-tertiary">{label}</div>
    </div>
  );
}

/* OVERVIEW */
function IncidentOverview({ incident }: { incident: Incident }) {
  return (
    <div className="space-y-4">
      <div className="bg-bg-dark border border-border-primary rounded-lg p-4">
        <h2 className="text-sm font-semibold text-white mb-2">{incident.incident_name}</h2>
        <p className="text-xs text-text-tertiary leading-relaxed">{incident.ai_summary || 'No AI summary available.'}</p>
      </div>
      <div className="grid grid-cols-5 gap-3">
        <MetricCard label="Risk Score" value={`${incident.risk_score}/100`} color="bg-[var(--alert-red)]" />
        <MetricCard label="Confidence" value={`${Math.round(incident.confidence)}%`} color="bg-[rgba(0,212,255,0.15)]" />
        <MetricCard label="Related FIRs" value={incident.fir_count} color="bg-[#8B5CF6]" />
        <MetricCard label="Actions" value={incident.suggested_actions.length} color="bg-[var(--alert-amber)]" />
        <MetricCard label="Status" value={incident.status} color="bg-[var(--alert-green)]" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <InfoCard label="Alert Type" value={incident.alert_type.replace(/_/g, ' ')} />
        <InfoCard label="Crime Category" value={incident.crime_category} />
        <InfoCard label="Created" value={new Date(incident.created_at).toLocaleString()} />
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-dark border border-border-primary rounded-lg p-3">
      <div className="text-[10px] text-text-tertiary mb-0.5">{label}</div>
      <div className="text-xs text-white capitalize">{value}</div>
    </div>
  );
}

/* LIVE MAP */
function IncidentMapSection({ incident, mapRef }: { incident: Incident; mapRef: React.RefObject<HTMLCanvasElement | null> }) {
  return (
    <div className="space-y-3">
      <div className="bg-bg-dark border border-border-primary rounded-lg overflow-hidden">
        <canvas ref={mapRef as React.RefObject<HTMLCanvasElement>} width={600} height={300} className="w-full h-64" />
      </div>
      {incident.location && (
        <div className="grid grid-cols-2 gap-3">
          <InfoCard label="Latitude" value={incident.location.lat.toFixed(6)} />
          <InfoCard label="Longitude" value={incident.location.lng.toFixed(6)} />
          <InfoCard label="Station" value={incident.location.station_name || 'Unknown'} />
          <InfoCard label="District" value={incident.location.district_id} />
        </div>
      )}
    </div>
  );
}

/* RISK ANALYSIS */
function IncidentRiskSection({ incident }: { incident: Incident }) {
  return (
    <div className="space-y-3">
      <div className="bg-bg-dark border border-border-primary rounded-lg p-4">
        <h3 className="text-xs font-semibold text-text-secondary mb-3">Risk Factor Breakdown</h3>
        <div className="space-y-2">
          {incident.risk_analysis.map((rf, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-32 text-xs text-text-tertiary flex-shrink-0">{rf.factor}</div>
                <div className="flex-1 bg-bg-dark rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(rf.score * 3.33, 100)}%`, backgroundColor: rf.score >= 20 ? 'var(--alert-red)' : rf.score >= 10 ? 'var(--alert-amber)' : 'var(--accent-cyan)' }} />
              </div>
              <div className="text-xs font-mono text-text-secondary w-8 text-right">{rf.score}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-bg-dark border border-border-primary rounded-lg p-4">
        <h3 className="text-xs font-semibold text-text-secondary mb-2">AI Assessment</h3>
        <p className="text-xs text-text-tertiary leading-relaxed">{incident.ai_summary || 'No AI assessment generated.'}</p>
        <p className="text-xs text-text-tertiary mt-2">Model: {incident.model_version}</p>
      </div>
    </div>
  );
}

/* ACTIONS */
function IncidentActionsSection({ incident }: { incident: Incident }) {
  return (
    <div className="space-y-2">
      {incident.suggested_actions.map((action) => (
        <div key={action.action_id} className="bg-bg-dark border border-border-primary rounded-lg p-3 flex items-start gap-3">
          <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${action.priority === 'Critical' ? 'bg-[var(--alert-red)]' : action.priority === 'High' ? 'bg-[var(--alert-amber)]' : 'bg-yellow-500'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-white">{action.title}</h4>
              <StatusBadge status={action.status} />
            </div>
            <p className="text-[10px] text-text-tertiary mt-0.5">{action.description}</p>
          </div>
          <span className="text-[10px] text-text-tertiary flex-shrink-0">{action.priority}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { pending: 'bg-[rgba(245,158,11,0.2)] text-[var(--alert-amber)]', in_progress: 'bg-[rgba(0,212,255,0.2)] text-[var(--accent-cyan)]', completed: 'bg-[rgba(0,230,118,0.2)] text-[var(--alert-green)]' };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[status] || 'bg-bg-dark text-text-tertiary'}`}>{status}</span>;
}

/* PATROL */
function IncidentPatrolSection({ incident }: { incident: Incident }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {incident.patrol_recommendations.map((pr) => (
          <div key={pr.unit_id} className="bg-bg-dark border border-border-primary rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pr.priority === 'Critical' ? 'bg-[var(--alert-red)]' : 'bg-[var(--alert-amber)]'}`}>{pr.priority}</span>
              <span className="text-xs font-semibold text-white">{pr.unit_type}</span>
            </div>
            <div className="space-y-1 text-[10px] text-text-tertiary">
              <p>Officers: {pr.officer_count}</p>
              <p>Coverage: {pr.coverage_radius_km} km</p>
              <p>Response: ~{pr.estimated_response_min} min</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* FIRs */
function IncidentFIRSection({ incident }: { incident: Incident }) {
  return (
    <div className="space-y-2">
      {incident.related_firs.map((fir) => (
        <div key={fir.crime_no} className="bg-bg-dark border border-border-primary rounded-lg p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent-cyan)' }}>{fir.crime_no}</span>
              <StatusBadge status={fir.status} />
            </div>
            <p className="text-[10px] text-text-tertiary mt-0.5 truncate">{fir.crime_head_name} — {fir.complainant_name}</p>
          </div>
          <span className="text-[10px] text-text-tertiary flex-shrink-0">{fir.occurrence_date || 'N/A'}</span>
        </div>
      ))}
      {incident.related_firs.length === 0 && <p className="text-xs text-text-tertiary text-center py-8">No related FIRs</p>}
    </div>
  );
}

/* NETWORK */
function IncidentNetworkSection({ incident, onOpenNetwork }: { incident: Incident; onOpenNetwork: (i: Incident) => void }) {
  return (
    <div className="space-y-3">
      {incident.criminal_network.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {incident.criminal_network.map((c: any, i: number) => (
            <div key={c.criminal_id || i} className="bg-bg-dark border border-border-primary rounded-lg p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[rgba(139,92,246,0.15)] flex items-center justify-center text-[#8B5CF6] text-xs font-bold flex-shrink-0">{c.name?.charAt(0) || '?'}</div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-semibold text-white truncate">{c.name || 'Unknown'}</h4>
                <p className="text-[10px] text-text-tertiary">{c.priors || 0} priors</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.type === 'primary' ? 'bg-[rgba(139,92,246,0.2)] text-[#8B5CF6]' : 'bg-bg-dark text-text-tertiary'}`}>{c.type}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-bg-dark border border-border-primary rounded-lg p-6 text-center">
          <p className="text-xs text-text-tertiary mb-3">No criminal network data available for this incident.</p>
        </div>
      )}
      <button onClick={() => onOpenNetwork(incident)} className="text-xs bg-[#8B5CF6] hover:bg-[rgba(139,92,246,0.2)] text-white px-4 py-2 rounded-lg transition-colors w-full btn-press-sm">Open Criminal Network Graph</button>
    </div>
  );
}

/* TIMELINE */
function IncidentTimelineSection({ incidentId, noteText, setNoteText }: { incidentId: string; noteText: string; setNoteText: (v: string) => void; onAddEvent?: (id: string, text: string) => void }) {
  const [timeline, setTimeline] = useState<IncidentTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIncidentTimeline(incidentId).then((events) => { setTimeline(events); setLoading(false); }).catch(() => setLoading(false));
  }, [incidentId]);

  if (loading) return <div className="text-xs text-text-tertiary" role="status">Loading timeline...</div>;

  return (
    <div className="space-y-3">
      <div className="bg-bg-dark border border-border-primary rounded-lg p-3 flex gap-2">
        <label htmlFor="timeline-note" className="sr-only">Add timeline note</label>
        <input id="timeline-note" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add timeline note..." className="flex-1 bg-bg-dark border border-border-primary rounded px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder-gray-400 outline-none focus:ring-2 focus:ring-[rgba(0,212,255,0.4)]" />
        <button onClick={async () => {
          if (!noteText.trim()) return;
          await addTimelineEvent(incidentId, { event_type: 'manual', title: 'Manual Note', description: noteText, actor: 'user' });
          setNoteText('');
          const updated = await getIncidentTimeline(incidentId);
          setTimeline(updated);
        }} className="text-xs bg-[rgba(0,212,255,0.15)] hover:bg-[rgba(0,212,255,0.25)] text-white px-3 py-1.5 rounded disabled:opacity-30 btn-press-sm" disabled={!noteText.trim()}>Add</button>
      </div>
      <div className="space-y-1">
        {timeline.length === 0 ? (
          <p className="text-xs text-text-tertiary text-center py-4">No timeline events</p>
        ) : (
          timeline.map((evt) => (
            <div key={evt.event_id} className="bg-bg-dark border border-border-primary rounded-lg p-2 flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[rgba(0,212,255,0.15)] mt-1.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-white">{evt.title}</span>
                  <span className="text-[9px] text-text-secondary">{evt.event_type}</span>
                </div>
                <p className="text-[10px] text-text-tertiary">{evt.description}</p>
                <p className="text-[9px] text-text-secondary mt-0.5">{evt.actor ? `${evt.actor} · ` : ''}{new Date(evt.timestamp).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* AUDIT */
function IncidentAuditSection({ incidentId }: { incidentId: string }) {
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIncidentAudit(incidentId).then((entries) => { setAudit(entries); setLoading(false); }).catch(() => setLoading(false));
  }, [incidentId]);

  if (loading) return <div className="text-xs text-text-tertiary" role="status">Loading audit trail...</div>;

  return (
    <div className="space-y-1">
      {audit.length === 0 ? (
        <p className="text-xs text-text-tertiary text-center py-4">No audit entries</p>
      ) : (
        audit.map((entry) => (
          <div key={entry.entry_id} className="bg-bg-dark border border-border-primary rounded-lg p-2 flex items-start gap-2">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${entry.action?.includes('created') ? 'bg-[var(--alert-green)]' : 'bg-bg-tertiary'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-text-secondary">{entry.action}</span>
                <span className="text-[9px] text-text-secondary">{entry.actor_type}/{entry.actor_id}</span>
              </div>
              <p className="text-[10px] text-text-tertiary">{entry.details}</p>
              <p className="text-[9px] text-text-secondary">{new Date(entry.timestamp).toLocaleString()}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
