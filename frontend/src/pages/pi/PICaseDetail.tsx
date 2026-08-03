import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RefreshCw, FileEdit, FileText, Bot, Search, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { authHeaders } from '@/utils/authHeaders';
import { PIPageSkeleton } from '@/components/pi/PIPageSkeleton';

interface CaseDetail {
  fir?: {
    status?: string;
    crime_type?: string;
    occurrence_date?: string;
    section?: string;
    station_name?: string;
    io_name?: string;
  };
  accused?: any[];
  victims?: any[];
  timeline?: any[];
}

export function PICaseDetail() {
  const { crimeNo } = useParams<{ crimeNo: string }>()
  const [caseData, setCaseData] = useState<CaseDetail | null>(null)
  const [aiSummary, setAiSummary] = useState<string>('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showVictims, setShowVictims] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/fir-ops/${crimeNo}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        // Map flat fir-ops response to nested CaseDetail format
        const mapped: CaseDetail = {
          fir: {
            status: d.status || d.fir?.status || 'registered',
            crime_type: d.crime_type || d.fir?.crime_type || 'Unknown',
            occurrence_date: d.date || d.occurrence_date || d.fir?.occurrence_date,
            section: d.section || d.fir?.section || '—',
            station_name: d.station || d.station_name || d.fir?.station_name || '—',
            io_name: d.officer_assigned || d.io_name || d.fir?.io_name || '—',
          },
          accused: d.accused_name ? [{ name: d.accused_name, age: d.accused_age }] : (d.accused ?? []),
          victims: d.victim_name ? [{ name: d.victim_name, age: d.victim_age }] : (d.victims ?? []),
          timeline: d.investigation_timeline ?? d.timeline ?? [],
        }
        setCaseData(mapped); setLoading(false)
      })
      .catch(e => { console.warn('[PICaseDetail] fetch error:', e); setLoading(false); })
  }, [crimeNo])

  const handleAISummary = async () => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Summarize case ${crimeNo} — provide key facts, current status, and recommended next steps`,
          mode: 'case_analysis',
        }),
      })
      const data = await res.json()
      setAiSummary(data.response ?? 'Unable to generate summary')
    } catch (e) {
      console.warn('[PICaseDetail] AI summary error:', e);
      setAiSummary('AI service unavailable. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) return <PIPageSkeleton />
  if (!caseData) return (
    <div className="p-6 text-center text-text-tertiary">Case {crimeNo} not found</div>
  )

  const STAGES = ['FIR Filed', 'Arrested', 'Remand', 'Chargesheeted', 'Court']
  const currentStage = caseData.fir?.status === 'Open' ? 0 :
    caseData.fir?.status === 'Under Investigation' ? 1 :
    caseData.fir?.status === 'Chargesheeted' ? 3 : 4

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/pi/cases" className="text-xs text-text-tertiary hover:text-text-secondary">← Cases</Link>
            <h1 className="text-base font-semibold text-accent-cyan font-mono">{crimeNo}</h1>
            <StatusBadge status={caseData.fir?.status ?? 'unknown'} size="sm" />
          </div>
          <p className="text-xs text-text-tertiary mt-0.5">{caseData.fir?.crime_type}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const s = prompt('Enter new status:')
              if (s && s.trim()) {
                fetch(`/api/firs/${crimeNo}`, {
                  method: 'PUT',
                  headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: s.trim() }),
                }).then(r => { if (r.ok) window.location.reload() })
              }
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                       border border-border-primary text-text-secondary hover:border-border-primary
                       hover:text-service-blue transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />Update Status
          </button>
          <button
            onClick={() => {
              const note = prompt('Enter note:')
              if (note && note.trim()) {
                fetch(`/api/firs/${crimeNo}/diary`, {
                  method: 'POST',
                  headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                  body: JSON.stringify({ entry_text: note.trim() }),
                }).then(r => { if (r.ok) window.location.reload() })
              }
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                       border border-border-primary text-text-secondary hover:border-border-primary
                       hover:text-service-blue transition-colors">
            <FileEdit className="w-3.5 h-3.5" />Add Note
          </button>
          <button
            onClick={() => window.open(`/api/reports/fir/${crimeNo}/pdf`)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                       border border-border-primary text-text-secondary hover:border-border-primary
                       hover:text-service-blue transition-colors">
            <FileText className="w-3.5 h-3.5" />Generate PDF
          </button>
        </div>
      </div>

      {/* Case timeline */}
      <div className="rounded-xl border border-border-primary bg-bg-card px-6 py-4">
        <div className="flex items-center">
          {STAGES.map((stage, i) => (
            <div key={stage} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center
                                 text-[10px] font-bold border-2 transition-all ${
                  i < currentStage ? 'bg-cyan-500 border-cyan-500 text-white' :
                  i === currentStage ? 'bg-hover-bg border-cyan-400 text-accent-cyan' :
                  'bg-bg-card border-border-secondary text-text-tertiary'
                }`}>{i < currentStage ? '✓' : i + 1}</div>
                <p className={`text-[9px] mt-1.5 text-center ${
                  i <= currentStage ? 'text-text-secondary' : 'text-text-tertiary'
                }`}>{stage}</p>
              </div>
              {i < STAGES.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-3 ${
                  i < currentStage ? 'bg-cyan-500' : 'bg-bg-secondary'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Case info + AI summary */}
      <div className="grid grid-cols-5 gap-4">
        {/* Left — Case details */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Basic info */}
          <div className="rounded-xl border border-border-primary bg-bg-card p-4">
            <h3 className="text-xs font-medium text-text-primary mb-3">Case Information</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
              {[
                { label: 'Crime No.', value: crimeNo, mono: true },
                { label: 'Date Filed', value: caseData.fir?.occurrence_date },
                { label: 'Crime Type', value: caseData.fir?.crime_type },
                { label: 'Section', value: caseData.fir?.section ?? '—' },
                { label: 'Station', value: caseData.fir?.station_name },
                { label: 'IO', value: caseData.fir?.io_name ?? '—' },
              ].map(f => (
                <div key={f.label} className="flex justify-between border-b border-border-secondary pb-1.5">
                  <span className="text-text-tertiary">{f.label}</span>
                  <span className={`${f.mono ? 'font-mono' : ''} text-text-primary`}>{f.value ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Accused */}
          <div className="rounded-xl border border-border-primary bg-bg-card p-4">
            <h3 className="text-xs font-medium text-text-primary mb-3">
              Accused ({caseData.accused?.length ?? 0})
            </h3>
            <div className="space-y-2">
              {(caseData.accused ?? []).map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-bg-card">
                  <div className="h-8 w-8 rounded-full bg-bg-secondary flex items-center
                                  justify-center text-xs font-medium text-text-secondary">
                    {a.name?.[0] ?? '?'}
                  </div>
                   <div className="flex-1">
                     <p className="text-xs text-text-primary font-medium">{a.name ?? 'Unknown'}</p>
                     <p className="text-[10px] text-text-tertiary">{a.age ? `${a.age} yrs` : ''} {a.address ?? ''}</p>
                   </div>
                 </div>
              ))}
            </div>
          </div>

          {/* Victims (masked) */}
          <div className="rounded-xl border border-border-primary bg-bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-text-primary">
                Victims ({caseData.victims?.length ?? 0})
              </h3>
              <button onClick={() => setShowVictims(v => !v)}
                className="text-[10px] text-accent-cyan/60 hover:text-accent-cyan transition-colors">
                {showVictims ? 'Mask PII' : 'Reveal (authorized)'}
              </button>
            </div>
            <div className="space-y-2">
              {(caseData.victims ?? []).map((v: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-bg-card">
                  <div className="flex-1">
                    <p className={`text-xs text-text-primary ${!showVictims ? 'blur-sm select-none' : ''}`}>
                      {v.name ?? 'Victim'}
                    </p>
                    <p className={`text-[10px] text-text-tertiary ${!showVictims ? 'blur-sm select-none' : ''}`}>
                      {v.age ? `${v.age} yrs` : ''} {v.address ?? ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — AI Summary */}
        <div className="col-span-2">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-accent-cyan" />
              <h3 className="text-xs font-medium text-accent-cyan/80">AI Case Summary</h3>
            </div>
            {!aiSummary ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <p className="text-xs text-text-tertiary text-center">
                  Let AI analyze this case and provide key insights
                </p>
                <button
                  onClick={handleAISummary}
                  disabled={aiLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs
                             bg-hover-bg text-accent-cyan border border-border-primary
                             hover:bg-cyan-500/30 transition-colors disabled:opacity-40">
                  {aiLoading ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-cyan-400" />
                      Analyzing...
                    </>
                  ) : <><Search className="w-3.5 h-3.5" /> Analyze Case</>}
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <p className="text-xs text-text-primary leading-relaxed">{aiSummary}</p>
                <div className="mt-3 pt-3 border-t border-border-primary">
                  <p className="text-[9px] text-signal-amber/70">
                    <AlertTriangle className="w-3 h-3 inline" /> AI-assisted analysis — verify with case records
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('copilot-open-with-query', { detail: { query: `Summarize case ${crimeNo}` } }))}
                      className="text-[10px] text-accent-cyan/60 hover:text-accent-cyan transition-colors">
                      Full Copilot →
                    </button>
                    <button onClick={() => setAiSummary('')}
                      className="text-[10px] text-text-tertiary hover:text-text-secondary transition-colors">
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Case timeline events */}
      <div className="rounded-xl border border-border-primary bg-bg-card p-4">
        <h3 className="text-xs font-medium text-text-primary mb-4">Case Activity Timeline</h3>
        <div className="space-y-3">
          {(caseData.timeline ?? []).length === 0 ? (
            <p className="text-xs text-text-tertiary">No timeline events recorded</p>
          ) : (
            (caseData.timeline ?? []).map((event: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-cyan-500 mt-1" />
                  {i < (caseData.timeline?.length ?? 0) - 1 && (
                    <div className="w-0.5 h-8 bg-bg-secondary my-1" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-text-primary">{event.description}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {event.officer_name ?? 'System'} ·{' '}
                    {new Date(event.timestamp).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
