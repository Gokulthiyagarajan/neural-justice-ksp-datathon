import { AlertTriangle, CheckCircle, Clock, FileText, MapPin, Shield, Users, Scale, Eye, Crosshair, Truck, Swords, Landmark, Lightbulb, Target } from 'lucide-react';
import type { InvestigationSummary as InvestigationSummaryType } from '@/types';

interface Props {
  data: InvestigationSummaryType;
}

const riskColorMap: Record<string, string> = {
  Critical: 'text-alert-red bg-alert-red/10 border-alert-red/30',
  High: 'text-signal-amber bg-signal-amber/10 border-signal-amber/30',
  Moderate: 'text-accent-cyan bg-accent-cyan/10 border-accent-cyan/30',
  Low: 'text-verified-green bg-verified-green/10 border-verified-green/30',
};

const priorityColorMap: Record<string, string> = {
  Critical: 'bg-alert-red/20 text-alert-red',
  High: 'bg-signal-amber/20 text-signal-amber',
  Medium: 'bg-accent-cyan/20 text-accent-cyan',
  Low: 'bg-verified-green/20 text-verified-green',
  Routine: 'bg-text-tertiary/10 text-text-secondary',
};

const stageOrder = [
  'Incident Occurred',
  'FIR Registered',
  'Investigation',
  'Charge Sheet',
  'Court',
  'Closed',
];

function getStageIndex(stage: string): number {
  const idx = stageOrder.indexOf(stage);
  return idx >= 0 ? idx : -1;
}

export function InvestigationSummary({ data }: Props) {
  const currentIdx = getStageIndex(data.current_stage);

  return (
    <div className="space-y-6">
      {/* Section 1: Executive AI Summary */}
      <div className="bg-bg-card rounded-xl border border-border-primary overflow-hidden">
        <div className="px-5 py-3 border-b border-border-primary bg-bg-tertiary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">AI Investigation Summary</h3>
          </div>
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${priorityColorMap[data.priority] || priorityColorMap.Routine}`}>
            {data.priority}
          </span>
        </div>
        <div className="p-5">
          <p className="text-sm text-text-secondary leading-relaxed mb-4">{data.summary_paragraph}</p>

          {/* Chips row */}
          <div className="flex flex-wrap gap-2">
            <Chip label={data.incident_type} icon={FileText} />
            <Chip label={data.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} icon={CheckCircle} />
            <Chip label={data.priority} icon={AlertTriangle} />
            <Chip label={`AI: ${data.ai_confidence}%`} icon={Shield} />
            <Chip label={data.crime_category} icon={Scale} />
            <Chip label={data.district} icon={MapPin} />
            <Chip label={data.police_station} icon={Landmark} />
            <Chip label={data.officer} icon={Eye} />
            <Chip label={`${data.case_age_days}d old`} icon={Clock} />
          </div>
        </div>
      </div>

      {/* Section 2: Key Details — Accused / Victims / Evidence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Accused */}
        <div className="bg-bg-card rounded-xl border border-border-primary p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-alert-red" />
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Accused</h4>
            <span className="ml-auto text-[10px] text-text-tertiary">{data.accused.length}</span>
          </div>
          {data.accused.length > 0 ? (
            <div className="space-y-2">
              {data.accused.map((a, i) => (
                <div key={i} className="text-xs p-2 rounded-md bg-bg-secondary/50">
                  <p className="font-medium text-text-primary">{a.name}</p>
                  <p className="text-text-tertiary">
                    {[a.age, a.gender].filter(Boolean).join(' · ')}
                    {a.status ? ` · ${a.status}` : ''}
                  </p>
                  {a.details && <p className="text-text-tertiary mt-0.5 truncate">{a.details}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">No accused recorded</p>
          )}
        </div>

        {/* Victims */}
        <div className="bg-bg-card rounded-xl border border-border-primary p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-signal-amber" />
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Victims</h4>
            <span className="ml-auto text-[10px] text-text-tertiary">{data.victims.length}</span>
          </div>
          {data.victims.length > 0 ? (
            <div className="space-y-2">
              {data.victims.map((v, i) => (
                <div key={i} className="text-xs p-2 rounded-md bg-bg-secondary/50">
                  <p className="font-medium text-text-primary">{v.name}</p>
                  <p className="text-text-tertiary">
                    {[v.age, v.gender].filter(Boolean).join(' · ')}
                  </p>
                  {v.details && <p className="text-text-tertiary mt-0.5 truncate">{v.details}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">No victims recorded</p>
          )}
        </div>

        {/* Evidence */}
        <div className="bg-bg-card rounded-xl border border-border-primary p-4">
          <div className="flex items-center gap-2 mb-3">
            <Crosshair className="w-4 h-4 text-verified-green" />
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Evidence</h4>
            <span className="ml-auto text-[10px] text-text-tertiary">{data.evidence.length}</span>
          </div>
          {data.evidence.length > 0 ? (
            <div className="space-y-2">
              {data.evidence.map((e, i) => (
                <div key={i} className="text-xs p-2 rounded-md bg-bg-secondary/50">
                  <p className="font-medium text-text-primary">{e.type}</p>
                  {e.description && <p className="text-text-tertiary truncate">{e.description}</p>}
                  <p className="text-text-tertiary">
                    {e.value != null ? `Value: ₹${e.value.toLocaleString()}` : ''}
                    {e.status ? ` · ${e.status}` : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">No evidence recorded</p>
          )}
        </div>
      </div>

      {/* Section 2b: Witnesses / Vehicles / Weapons / Locations */}
      {(data.witnesses.length > 0 || data.vehicles.length > 0 || data.weapons.length > 0 || data.locations.length > 0) && (
        <div className="flex flex-wrap gap-4">
          {data.witnesses.length > 0 && (
            <MiniEntityList title="Witnesses" icon={Eye} items={data.witnesses} />
          )}
          {data.vehicles.length > 0 && (
            <MiniEntityList title="Vehicles" icon={Truck} items={data.vehicles} />
          )}
          {data.weapons.length > 0 && (
            <MiniEntityList title="Weapons" icon={Swords} items={data.weapons} />
          )}
          {data.locations.length > 0 && (
            <MiniEntityList title="Locations" icon={MapPin} items={data.locations} />
          )}
        </div>
      )}

      {/* Section 3: AI Insights */}
      {data.insights.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border-primary overflow-hidden">
          <div className="px-5 py-3 border-b border-border-primary bg-bg-tertiary">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-signal-amber" />
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">AI Observations</h3>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-bg-secondary/30 border border-border-secondary">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: insight.confidence >= 80 ? 'rgba(76, 158, 118, 0.15)' : insight.confidence >= 50 ? 'rgba(214, 154, 62, 0.15)' : 'rgba(92, 101, 115, 0.15)' }}>
                  <span className="text-[10px] font-bold" style={{
                    color: insight.confidence >= 80 ? 'var(--verified-green)' : insight.confidence >= 50 ? 'var(--signal-amber)' : 'var(--text-tertiary)'
                  }}>{insight.confidence >= 80 ? 'A' : insight.confidence >= 50 ? 'B' : 'C'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-primary">{insight.label}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{
                        background: insight.confidence >= 80 ? 'rgba(76, 158, 118, 0.15)' : insight.confidence >= 50 ? 'rgba(214, 154, 62, 0.15)' : 'rgba(92, 101, 115, 0.15)',
                        color: insight.confidence >= 80 ? 'var(--verified-green)' : insight.confidence >= 50 ? 'var(--signal-amber)' : 'var(--text-tertiary)',
                      }}>
                      {insight.confidence}% confidence
                    </span>
                    <span className="text-[10px] text-text-tertiary truncate">{insight.evidence_source}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border-primary overflow-hidden">
          <div className="px-5 py-3 border-b border-border-primary bg-bg-tertiary">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-verified-green" />
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">AI Recommendations</h3>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {data.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-bg-secondary/30 border border-border-secondary">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                  rec.priority === 'High' ? 'bg-alert-red/20 text-alert-red' :
                  rec.priority === 'Medium' ? 'bg-signal-amber/20 text-signal-amber' :
                  'bg-verified-green/20 text-verified-green'
                }`}>
                  {rec.priority === 'High' ? '!' : rec.priority === 'Medium' ? '-' : 'i'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-primary">{rec.action}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      rec.priority === 'High' ? 'bg-alert-red/20 text-alert-red' :
                      rec.priority === 'Medium' ? 'bg-signal-amber/20 text-signal-amber' :
                      'bg-verified-green/20 text-verified-green'
                    }`}>{rec.priority}</span>
                    <span className="text-[10px] text-text-tertiary">{rec.reason}</span>
                    <span className="text-[10px] text-text-tertiary ml-auto">{rec.confidence}% conf.</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 5: Timeline */}
      {data.timeline.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border-primary overflow-hidden">
          <div className="px-5 py-3 border-b border-border-primary bg-bg-tertiary">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-cyan" />
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Investigation Timeline</h3>
              <span className="ml-auto text-[10px] text-text-tertiary">Current: {data.current_stage}</span>
            </div>
          </div>
          <div className="p-5">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border-secondary" />

              <div className="space-y-5">
                {data.timeline.map((step, i) => {
                  const stageIdx = getStageIndex(step.stage);
                  const isActive = stageIdx >= 0 && currentIdx >= 0 && stageIdx <= currentIdx;
                  const isCurrent = step.stage === data.current_stage;

                  return (
                    <div key={i} className="flex gap-4 relative">
                      <div className={`w-[15px] h-[15px] rounded-full border-2 shrink-0 mt-0.5 z-10 ${
                        isCurrent
                          ? 'border-accent-cyan bg-accent-cyan'
                          : isActive
                            ? 'border-verified-green bg-verified-green'
                            : 'border-border-secondary bg-bg-card'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-medium ${isCurrent ? 'text-accent-cyan' : isActive ? 'text-text-primary' : 'text-text-tertiary'}`}>
                          {step.stage}
                          {isCurrent && <span className="ml-2 text-[10px] text-accent-cyan">(current)</span>}
                        </p>
                        {step.date && <p className="text-[11px] text-text-tertiary">{new Date(step.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                        {step.details && <p className="text-[11px] text-text-tertiary mt-0.5">{step.details}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 6: Similar Cases */}
      {data.similar_cases.length > 0 && (
        <div className="bg-bg-card rounded-xl border border-border-primary overflow-hidden">
          <div className="px-5 py-3 border-b border-border-primary bg-bg-tertiary">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent-cyan" />
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Similar Cases</h3>
            </div>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-text-tertiary border-b border-border-secondary">
                    <th className="text-left py-2 pr-3 font-medium">FIR No.</th>
                    <th className="text-left py-2 pr-3 font-medium">Crime Type</th>
                    <th className="text-left py-2 pr-3 font-medium">District</th>
                    <th className="text-left py-2 pr-3 font-medium">Status</th>
                    <th className="text-right py-2 font-medium">Similarity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.similar_cases.map((sc, i) => (
                    <tr key={i} className="border-b border-border-secondary last:border-0 hover:bg-bg-secondary/30 transition-colors">
                      <td className="py-2 pr-3 text-text-primary font-medium">{sc.crime_no}</td>
                      <td className="py-2 pr-3 text-text-secondary">{sc.crime_type}</td>
                      <td className="py-2 pr-3 text-text-secondary">{sc.district}</td>
                      <td className="py-2 pr-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-bg-secondary/50 text-text-secondary">{sc.status.replace('_', ' ')}</span>
                      </td>
                      <td className="py-2 text-right">
                        <span className="text-verified-green font-medium">{sc.similarity}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Risk Analysis Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-bg-card rounded-xl border border-border-primary p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4" style={{ color: 'var(--color-signal-amber)' }} />
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Risk Analysis</h4>
          </div>
          <div className="space-y-2">
            <RiskBar label="Overall Risk" value={data.risk_analysis.overall_risk} score={data.risk_analysis.overall_score} />
            <RiskBar label="Repeat Offender" value={data.risk_analysis.repeat_offender_risk} />
            <RiskBar label="Violence Risk" value={data.risk_analysis.violence_risk} />
            <RiskBar label="Escape Risk" value={data.risk_analysis.escape_risk} />
            <RiskBar label="Organized Crime" value={data.risk_analysis.organized_crime_risk} />
            <RiskBar label="Community Impact" value={data.risk_analysis.community_impact} />
          </div>
        </div>
        <div className="bg-bg-card rounded-xl border border-border-primary p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-accent-cyan" />
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Geo Information</h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border-secondary">
              <span className="text-text-tertiary">District</span>
              <span className="text-text-primary font-medium">{data.geo_info.district || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-secondary">
              <span className="text-text-tertiary">Nearest Station</span>
              <span className="text-text-primary font-medium">{data.geo_info.nearest_station || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border-secondary">
              <span className="text-text-tertiary">Coordinates</span>
              <span className="text-text-primary font-medium">
                {data.geo_info.incident_lat != null && data.geo_info.incident_lng != null
                  ? `${data.geo_info.incident_lat.toFixed(4)}, ${data.geo_info.incident_lng.toFixed(4)}`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-text-tertiary">Case Age</span>
              <span className="text-text-primary font-medium">{data.case_age_days} days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, icon: Icon }: { label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-bg-secondary/50 text-text-secondary border border-border-secondary">
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}

function MiniEntityList({ title, icon: Icon, items }: { title: string; icon: React.ComponentType<{ className?: string }>; items: string[] }) {
  return (
    <div className="bg-bg-card rounded-lg border border-border-primary p-3 min-w-[140px]">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3 h-3 text-text-tertiary" />
        <span className="text-[10px] font-semibold text-text-primary uppercase tracking-wider">{title}</span>
        <span className="text-[10px] text-text-tertiary ml-auto">{items.length}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((item, i) => (
          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-secondary/50 text-text-secondary">{item}</span>
        ))}
      </div>
    </div>
  );
}

function RiskBar({ label, value, score }: { label: string; value: string; score?: number }) {
  const normalizedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  const colorClass = riskColorMap[normalizedValue] || riskColorMap.Low;
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-bg-secondary/20">
      <span className="text-xs text-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        {score != null && <span className="text-xs text-text-tertiary">{score}</span>}
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
          {normalizedValue}
        </span>
      </div>
    </div>
  );
}
