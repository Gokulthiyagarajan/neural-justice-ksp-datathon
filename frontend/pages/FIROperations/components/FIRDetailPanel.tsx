import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, AlertTriangle, MessageSquare, Scale, FileText, UserIcon,
  Briefcase, BookOpen, Search, Calendar, Printer,
} from 'lucide-react';
import type { FIRDetail as FIRDetailType, TimelineEvent } from '@/types/fir.types';
import { useToast } from '@/components/Common/Toast';
import { C, daysOpenColor, riskColor } from '../theme';
import { FIRSeverityBadge } from './FIRSeverityBadge';
import { FIRStatusBadge } from './FIRStatusBadge';
import { formatDate, initials } from '../utils';

type TabKey = 'overview' | 'evidence' | 'legal' | 'witnesses' | 'diary' | 'casefile';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { key: 'overview', label: 'Overview', icon: <FileText size={14} /> },
  { key: 'evidence', label: 'Evidence', icon: <Search size={14} /> },
  { key: 'legal', label: 'Legal', icon: <Scale size={14} /> },
  { key: 'witnesses', label: 'Witnesses', icon: <UserIcon size={14} /> },
  { key: 'diary', label: 'Case Diary', icon: <BookOpen size={14} /> },
  { key: 'casefile', label: 'Case File', icon: <Briefcase size={14} /> },
];

interface Props {
  fir: FIRDetailType | null;
  aiSummary: string | null;
  aiLoading: boolean;
  onClose: () => void;
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: C.muted,
  marginBottom: 8,
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ ...sectionLabel, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.white, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const dotColor =
    status === 'collected' || status === 'stolen' ? C.amber :
    status === 'forensic_analysis' ? C.blue :
    status === 'in_custody' || status === 'recovered' ? C.success :
    status === 'returned' || status === 'produced_in_court' ? C.muted :
    status === 'examined' || status === 'cross_examined' ? C.success :
    status === 'yet_to_examine' ? C.warning :
    C.muted;

  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: dotColor,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}

export function FIRDetailPanel({ fir, aiSummary, aiLoading, onClose }: Props) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showPrintReport, setShowPrintReport] = useState(false);

  if (!fir) return null;

  const risk = fir.accused_risk_score ?? 0;
  const timeline = fir.investigation_timeline ?? [];

  const handleFollowUp = () => {
    const prompt = `Summarise FIR ${fir.fir_number}. Crime: ${fir.crime_type}. ` +
      `District: ${fir.district}. Accused: ${fir.accused_name} ` +
      `(risk score ${fir.accused_risk_score}). Status: ${fir.status}. ` +
      `Open ${fir.days_open} days. Keep under 60 words.`;
    navigator.clipboard.writeText(prompt).then(() => {
      toast('info', 'Copilot prompt copied — paste it in the assistant');
    }).catch(() => {
      toast('info', prompt);
    });
    window.dispatchEvent(new CustomEvent('copilot:focus'));
  };

  const handlePrintReport = () => {
    setShowPrintReport(true);
  };

  // Trigger print once the PrintReport DOM is committed
  useEffect(() => {
    if (showPrintReport) {
      const id = setTimeout(() => window.print(), 150);
      return () => clearTimeout(id);
    }
  }, [showPrintReport]);

  // Listen for afterprint to close the print view
  useEffect(() => {
    const onAfterPrint = () => {
      setShowPrintReport(false);
    };
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  return (
    <>
      {/* ── Full-screen Print Report ────────────────────────────── */}
      <AnimatePresence>
        {showPrintReport && fir && (
          <PrintReport fir={fir} aiSummary={aiSummary} onClose={() => setShowPrintReport(false)} />
        )}
      </AnimatePresence>

      <motion.aside
        initial={{ x: 420 }}
        animate={{ x: 0 }}
        exit={{ x: 420 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 420,
          background: C.navyMid,
          borderLeft: `1px solid ${C.navyLight}`,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 60,
        }}
      >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        style={{
          height: 56,
          padding: '0 20px',
          borderBottom: `1px solid ${C.navyLight}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 15,
              fontWeight: 600,
              color: C.amber,
              whiteSpace: 'nowrap',
            }}
          >
            {fir.fir_number}
          </span>
          <span style={{ fontSize: 11, color: C.muted, background: C.navyLight, borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap' }}>
            FIR
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handlePrintReport}
            aria-label="Download PDF Report"
            title="Download PDF Report"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', padding: 4 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
          >
            <Printer size={18} />
          </button>
          <button
            type="button"
            onClick={handleFollowUp}
            aria-label="AI Follow-up"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', padding: 4 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.amber)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
          >
            <MessageSquare size={18} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', padding: 4 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${C.navyLight}`,
          overflowX: 'auto',
          flexShrink: 0,
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              fontSize: 11,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? C.amber : C.muted,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? `2px solid ${C.amber}` : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Scrollable content ──────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'overview' && <OverviewTab fir={fir} risk={risk} timeline={timeline} aiSummary={aiSummary} aiLoading={aiLoading} onFollowUp={handleFollowUp} />}
            {activeTab === 'evidence' && <EvidenceTab fir={fir} />}
            {activeTab === 'legal' && <LegalTab fir={fir} />}
            {activeTab === 'witnesses' && <WitnessesTab fir={fir} />}
            {activeTab === 'diary' && <DiaryTab fir={fir} />}
            {activeTab === 'casefile' && <CaseFileTab fir={fir} />}
          </motion.div>
        </AnimatePresence>
      </div>
      </motion.aside>
    </>
    );
  }
  
  // ── OVERVIEW TAB ─────────────────────────────────────────────────

function OverviewTab({
  fir, risk, timeline, aiSummary, aiLoading, onFollowUp,
}: {
  fir: FIRDetailType; risk: number; timeline: TimelineEvent[];
  aiSummary: string | null; aiLoading: boolean;
  onFollowUp: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <FIRStatusBadge status={fir.status} />
          <FIRSeverityBadge severity={fir.severity} />
          {fir.is_repeat_offender && (
            <span style={{ fontSize: 10, background: C.amberDim, color: C.amber, border: '1px solid rgba(245,158,11,0.3)', borderRadius: 4, padding: '1px 6px', fontWeight: 500 }}>
              REPEAT
            </span>
          )}
        </div>
        <span style={{ fontSize: 13, color: daysOpenColor(fir.days_open), fontWeight: 500 }}>
          {fir.days_open} days open
        </span>
      </div>

      {/* Incident details */}
      <div>
        <div style={sectionLabel}>Incident Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', background: 'rgba(10,22,40,0.5)', borderRadius: 8, padding: 12 }}>
          <Field label="Crime Type" value={fir.crime_type} />
          <Field label="Category" value={fir.case_category || '—'} />
          <Field label="Date" value={formatDate(fir.date)} />
          <Field label="Time" value={fir.occurrence_time || '—'} />
          <Field label="District" value={fir.district} />
          <Field label="Station" value={fir.station} />
          <Field label="Location" value={fir.location || '—'} />
          <Field label="Officer" value={fir.officer_assigned || '—'} />
          <Field label="Registered" value={formatDate(fir.date)} />
          <Field label="Reg. Time" value={fir.registration_time || '—'} />
        </div>
      </div>

      {/* Description */}
      {fir.description_full && (
        <div>
          <div style={sectionLabel}>Description of Incident</div>
          <div style={{ fontSize: 13, color: C.white, lineHeight: 1.7, background: 'rgba(10,22,40,0.5)', borderRadius: 8, padding: 12 }}>
            {fir.description_full}
          </div>
        </div>
      )}

      {/* Modus Operandi */}
      <div>
        <div style={sectionLabel}>Modus Operandi</div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, background: 'rgba(10,22,40,0.5)', borderRadius: 8, padding: 12 }}>
          {fir.modus_operandi || '—'}
        </div>
      </div>

      {/* Accused */}
      <div>
        <div style={sectionLabel}>Accused Profile</div>
        <div style={{ background: 'rgba(10,22,40,0.5)', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.steel, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
              {initials(fir.accused_name)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.white }}>{fir.accused_name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {fir.accused_age ? `${fir.accused_age} yrs` : ''} · {fir.accused_gender || ''} · ID: {fir.accused_id}
              </div>
              {fir.accused_prior_offences > 0 && (
                <div style={{ fontSize: 11, color: C.danger, marginTop: 2 }}>
                  Prior offences: {fir.accused_prior_offences}
                </div>
              )}
            </div>
          </div>

          {/* Risk score */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ ...sectionLabel, marginBottom: 0 }}>Risk Score</span>
              <span style={{ fontSize: 13, color: riskColor(risk), fontWeight: 600 }}>{risk}/100</span>
            </div>
            <div style={{ width: '100%', height: 6, background: C.navyLight, borderRadius: 3, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${risk}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ height: '100%', background: riskColor(risk), borderRadius: 3 }}
              />
            </div>
          </div>

          {fir.is_repeat_offender && (
            <div style={{ marginTop: 8, background: C.amberDim, borderLeft: `3px solid ${C.amber}`, borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.amber }}>
              <AlertTriangle size={14} />
              Repeat Offender — {fir.accused_prior_offences} prior case(s)
            </div>
          )}
        </div>
      </div>

      {/* Victim */}
      <div>
        <div style={sectionLabel}>Victim / Complainant</div>
        <div style={{ background: 'rgba(10,22,40,0.5)', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
            <Field label="Name" value={fir.victim_name || '—'} />
            <Field label="Age" value={fir.victim_age ?? '—'} />
            <Field label="Gender" value={fir.victim_gender || '—'} />
            <Field label="Linked Cases" value={fir.linked_cases ?? 0} />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <div style={sectionLabel}>Investigation Timeline</div>
        {timeline.length === 0 ? (
          <p style={{ fontSize: 12, fontStyle: 'italic', color: C.muted }}>Timeline not available</p>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 18, background: 'rgba(10,22,40,0.5)', borderRadius: 8, padding: '12px 12px 12px 24px' }}>
            <div style={{ position: 'absolute', left: 8, top: 8, bottom: 8, width: 1, background: C.navyLight }} />
            {timeline.map((ev, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: 12 }}>
                <span style={{ position: 'absolute', left: -18, top: 3, width: 8, height: 8, borderRadius: '50%', background: i === 0 ? C.amber : C.steel, border: `2px solid ${C.navyMid}` }} />
                <div style={{ fontSize: 13, color: C.white }}>{ev.event}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{formatDate(ev.date)} · {ev.officer}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Analysis */}
      <div>
        <div style={sectionLabel}>AI Analysis</div>
        <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 8, padding: 12 }}>
          {aiLoading ? (
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, display: 'inline-block' }} />
              ))}
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: C.white, lineHeight: 1.6, margin: 0 }}>{aiSummary || fir.ai_summary}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <span style={{ fontSize: 11, color: C.muted, background: C.navyLight, borderRadius: 4, padding: '2px 8px' }}>
                  94% AI
                </span>
                <button type="button" onClick={onFollowUp} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.amber, fontSize: 12, padding: 0 }}>
                  <MessageSquare size={13} /> Ask follow-up ↗
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab helper ───────────────────────────────────────────────
function TabSection({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {label && <div style={sectionLabel}>{label}</div>}
      {children}
    </div>
  );
}

// ── EVIDENCE TAB ─────────────────────────────────────────────
function EvidenceTab({ fir }: { fir: FIRDetailType }) {
  const items = fir.evidence_items || [];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ ...sectionLabel, marginBottom: 0 }}>Collected Evidence</span>
        <span style={{ fontSize: 12, color: C.muted }}>{items.length} item(s)</span>
      </div>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>No evidence recorded yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((ev) => (
            <div key={ev.id} style={{ background: 'rgba(10,22,40,0.5)', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{ev.type}</div>
                <Badge color={ev.status === 'forensic_analysis' ? C.blue : ev.status === 'in_custody' ? C.success : C.amber}>
                  <StatusDot status={ev.status} /> {ev.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p style={{ fontSize: 12, color: C.muted, margin: '0 0 6px 0', lineHeight: 1.5 }}>{ev.description}</p>
              <div style={{ fontSize: 11, color: C.muted }}>
                Seized from: {ev.seized_from} · {formatDate(ev.seized_date)}
              </div>
              {ev.value && (
                <div style={{ fontSize: 11, color: C.amber, marginTop: 4 }}>
                  Estimated value: ₹{ev.value.toLocaleString('en-IN')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LEGAL TAB ────────────────────────────────────────────────
function LegalTab({ fir }: { fir: FIRDetailType }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* IPC / BNS Sections */}
      <TabSection label="Legal Sections Applied">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(fir.legal_sections || []).length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>No sections recorded</p>
          ) : (
            fir.legal_sections.map((s, i) => (
              <div key={i} style={{ background: 'rgba(10,22,40,0.5)', borderRadius: 8, padding: 10, borderLeft: `3px solid ${C.steel}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.amber, fontFamily: 'monospace' }}>
                    {s.code} {s.section}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>{s.description}</div>
              </div>
            ))
          )}
        </div>
      </TabSection>

      {/* Court Information */}
      {fir.court && (
        <TabSection label="Court Information">
          <div style={{ background: 'rgba(10,22,40,0.5)', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
              <Field label="Court" value={fir.court.court_name} />
              <Field label="Case No." value={fir.court.case_number} />
              <Field label="Judge" value={fir.court.judge} />
              <Field label="Next Hearing" value={fir.court.next_hearing ? formatDate(fir.court.next_hearing) : 'Not scheduled'} />
              <Field label="Bail Status" value={
                <Badge color={fir.court.bail_status === 'granted' ? C.success : fir.court.bail_status === 'denied' ? C.danger : C.warning}>
                  {fir.court.bail_status.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              } />
              <Field label="Chargesheet Filed" value={fir.court.filing_date ? formatDate(fir.court.filing_date) : '—'} />
            </div>
          </div>
        </TabSection>
      )}

      {/* Investigation Officers */}
      <TabSection label="Investigation Team">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(fir.investigation_officers || []).length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>No officers assigned</p>
          ) : (
            fir.investigation_officers.map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(10,22,40,0.5)', borderRadius: 8, padding: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.steel, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 11, flexShrink: 0 }}>
                  {initials(o)}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: C.white }}>{o}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{i === 0 ? 'Lead Investigating Officer' : 'Co-Investigating Officer'}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </TabSection>

      {/* Legal Notes */}
      <TabSection label="Notes">
        <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 8, padding: 10 }}>
          <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            Case classified as <strong style={{ color: C.white }}>{fir.case_category || 'Cognizable'}</strong>.
            {fir.is_repeat_offender ? ' Accused has prior criminal history — recommended for fast-track trial.' : ''}
            {fir.court?.bail_status === 'denied' ? ' Accused currently in judicial custody.' : ''}
          </p>
        </div>
      </TabSection>
    </div>
  );
}

// ── WITNESSES TAB ────────────────────────────────────────────
function WitnessesTab({ fir }: { fir: FIRDetailType }) {
  const items = fir.witnesses || [];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ ...sectionLabel, marginBottom: 0 }}>Witnesses</span>
        <span style={{ fontSize: 12, color: C.muted }}>{items.length} person(s)</span>
      </div>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>No witnesses recorded</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((w) => (
            <div key={w.id} style={{ background: 'rgba(10,22,40,0.5)', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{w.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {w.age} yrs · {w.gender} · {w.relation}
                  </div>
                </div>
                <Badge color={w.status === 'examined' || w.status === 'cross_examined' ? C.success : w.status === 'hostile' ? C.danger : C.warning}>
                  <StatusDot status={w.status} /> {w.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.5 }}>{w.statement}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CASE DIARY TAB ───────────────────────────────────────────
function DiaryTab({ fir }: { fir: FIRDetailType }) {
  const entries = fir.case_diary || [];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ ...sectionLabel, marginBottom: 0 }}>Case Diary</span>
        <span style={{ fontSize: 12, color: C.muted }}>{entries.length} entry(s)</span>
      </div>
      {entries.length === 0 ? (
        <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>No diary entries</p>
      ) : (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 7, top: 4, bottom: 4, width: 1, background: C.navyLight }} />
          {entries.map((entry, i) => (
            <div key={i} style={{ position: 'relative', marginBottom: 14, display: 'flex', gap: 12 }}>
              <span style={{ position: 'relative', top: 3, width: 14, height: 14, borderRadius: '50%', background: entry.progress === 'Completed' ? C.success : entry.progress === 'Needs Attention' ? C.danger : C.steel, border: `2px solid ${C.navyMid}`, flexShrink: 0 }} />
              <div style={{ flex: 1, background: 'rgba(10,22,40,0.5)', borderRadius: 8, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: C.muted }}>
                    <Calendar size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    {formatDate(entry.date)}
                  </span>
                  <span style={{ fontSize: 10, color: entry.progress === 'Completed' ? C.success : entry.progress === 'Needs Attention' ? C.danger : C.muted, fontWeight: 500 }}>
                    {entry.progress}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: C.white, margin: '0 0 4px 0', lineHeight: 1.5 }}>{entry.entry}</p>
                <div style={{ fontSize: 11, color: C.muted }}>By: {entry.officer}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CASE FILE TAB ────────────────────────────────────────────
function CaseFileTab({ fir }: { fir: FIRDetailType }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Property */}
      <TabSection label="Property Details">
        {(fir.property || []).length === 0 ? (
          <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>No property recorded</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fir.property.map((p, i) => (
              <div key={p.id || i} style={{ background: 'rgba(10,22,40,0.5)', borderRadius: 8, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{p.item}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{p.description}</div>
                  <div style={{ fontSize: 11, color: C.amber, marginTop: 2 }}>
                    Est. value: ₹{p.estimated_value.toLocaleString('en-IN')}
                  </div>
                </div>
                <Badge color={p.status === 'recovered' ? C.success : C.danger}>
                  <StatusDot status={p.status} /> {p.status.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </TabSection>

      {/* Linked Cases */}
      <TabSection label="Linked Cases (Same Accused)">
        {(fir.linked_case_details || []).length === 0 ? (
          <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>No linked cases</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fir.linked_case_details.map((lc, i) => (
              <div key={i} style={{ background: 'rgba(10,22,40,0.5)', borderRadius: 8, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.amber, fontFamily: 'monospace' }}>{lc.fir_number}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{lc.crime_type} · {lc.district}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Accused: {lc.accused}</div>
                </div>
                <Badge color={lc.status === 'closed' ? C.success : lc.status === 'pending_trial' ? C.warning : C.danger}>
                  {lc.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </TabSection>

      {/* Documents */}
      <TabSection label="Case Documents">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(fir.documents || []).length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>No documents</p>
          ) : (
            fir.documents.map((doc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(10,22,40,0.5)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: C.muted, border: `1px solid ${C.navyLight}` }}>
                <FileText size={13} color={C.steel} />
                {doc}
              </div>
            ))
          )}
        </div>
      </TabSection>

      {/* Last updated */}
      <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', padding: '8px 0', borderTop: `1px solid ${C.navyLight}` }}>
        Last updated: {formatDate(fir.updated_at)} · {fir.officer_assigned}
      </div>
    </div>
  );
}

// ── FULL-SCREEN PRINT REPORT ─────────────────────────────────────

const PRINT_STYLE_ID = 'fir-print-styles';

/** Inject print-specific CSS into the document head when print view is active. */
function usePrintStyles(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const existing = document.getElementById(PRINT_STYLE_ID);
    if (existing) return;

    const style = document.createElement('style');
    style.id = PRINT_STYLE_ID;
    style.textContent = `
      @media print {
        @page { size: A4; margin: 15mm; }
        /* Hide everything except the print report */
        body * { visibility: hidden; }
        .fir-print-report,
        .fir-print-report * { visibility: visible; }
        .fir-print-report {
          position: fixed;
          inset: 0;
          overflow: visible;
          background: white !important;
          color: #111 !important;
          padding: 20px 30px !important;
          font-family: 'Georgia', 'Times New Roman', serif;
        }
        .fir-print-report .print-btn-close { display: none !important; }
        /* Headings */
        .fir-print-report h1 { font-size: 20pt; color: #000; margin-bottom: 4pt; }
        .fir-print-report h2 { font-size: 14pt; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 4pt; margin: 16pt 0 8pt; }
        .fir-print-report h3 { font-size: 11pt; color: #555; margin: 10pt 0 4pt; }
        .fir-print-report .print-section-label { font-size: 9pt; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2pt; }
        .fir-print-report .print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4pt 16pt; font-size: 10pt; color: #333; }
        .fir-print-report .print-field-label { font-size: 7pt; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .fir-print-report .print-field-value { font-size: 10pt; color: #111; }
        .fir-print-report p { font-size: 10pt; color: #333; line-height: 1.5; margin: 4pt 0; }
        .fir-print-report .print-badge {
          display: inline-block; font-size: 8pt; font-weight: 600;
          padding: 1pt 6pt; border-radius: 3pt; border: 1px solid #ccc;
          margin: 2pt; background: #f5f5f5; color: #333;
        }
        .fir-print-report .print-divider { border: none; border-top: 1px dashed #ccc; margin: 12pt 0; }
        .fir-print-report .print-footer { text-align: center; font-size: 8pt; color: #999; margin-top: 20pt; border-top: 1px solid #ddd; padding-top: 8pt; }
        .fir-print-report table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 6pt 0; }
        .fir-print-report th { background: #f0f0f0; color: #333; padding: 4pt 6pt; text-align: left; font-weight: 600; border: 1px solid #ddd; }
        .fir-print-report td { padding: 4pt 6pt; border: 1px solid #ddd; color: #333; }
        .fir-print-report .print-muted { color: #888; }
        .fir-print-report .print-warning {
          background: #fef3c7; border-left: 3px solid #f59e0b;
          padding: 6pt 10pt; font-size: 9pt; border-radius: 3pt; margin: 6pt 0;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const el = document.getElementById(PRINT_STYLE_ID);
      if (el) el.remove();
    };
  }, [active]);
}

function PrintReport({ fir, aiSummary, onClose }: { fir: FIRDetailType; aiSummary: string | null; onClose: () => void }) {
  usePrintStyles(true);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fir-print-report"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#fff',
        color: '#111',
        overflow: 'auto',
        padding: '30px 40px',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      {/* Close button (hidden in print) */}
      <div style={{ textAlign: 'right', marginBottom: 12 }} className="print-btn-close">
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid #ccc',
            borderRadius: 6,
            padding: '6px 16px',
            fontSize: 12,
            cursor: 'pointer',
            color: '#666',
          }}
        >
          ✕ Close Preview
        </button>
        <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
          Use <strong>Ctrl+P</strong> then select <strong>"Save as PDF"</strong> to export, or close to go back.
        </p>
      </div>

      {/* ── Report Header ───────────────────────────────────────── */}
      <div style={{ borderBottom: '2px solid #111', paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#000', margin: 0, fontFamily: 'Georgia, serif' }}>
              Case Report
            </h1>
            <p style={{ fontSize: 13, color: '#555', margin: '4px 0 0', fontFamily: 'monospace' }}>
              {fir.fir_number}
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: 9, color: '#888' }}>
            <p style={{ margin: 0 }}>Karnataka State Police</p>
            <p style={{ margin: 0 }}>Crime Intelligence System</p>
            <p style={{ margin: '4px 0 0', fontFamily: 'monospace' }}>Generated: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <span className="print-badge" style={{ background: '#dc262610', color: '#dc2626', border: '1px solid #dc262640' }}>{fir.status.replace(/_/g, ' ').toUpperCase()}</span>
          <span className="print-badge" style={{ background: '#f59e0b10', color: '#d97706', border: '1px solid #f59e0b40' }}>{fir.severity.toUpperCase()}</span>
          {fir.is_repeat_offender && <span className="print-badge" style={{ background: '#f59e0b10', color: '#92400e', border: '1px solid #f59e0b40' }}>REPEAT OFFENDER</span>}
        </div>
      </div>

      {/* ── 1. Incident Details ─────────────────────────────────── */}
      <h2>1. Incident Details</h2>
      <hr className="print-divider" />
      <div className="print-grid">
        <PrintField label="Crime Type" value={fir.crime_type} />
        <PrintField label="Category" value={fir.case_category || '—'} />
        <PrintField label="Date of Occurrence" value={formatDate(fir.date)} />
        <PrintField label="Time" value={fir.occurrence_time || '—'} />
        <PrintField label="District" value={fir.district} />
        <PrintField label="Police Station" value={fir.station} />
        <PrintField label="Location" value={fir.location || '—'} />
        <PrintField label="Officer Assigned" value={fir.officer_assigned || '—'} />
        <PrintField label="Registration Date" value={formatDate(fir.date)} />
        <PrintField label="Days Open" value={`${fir.days_open} days`} />
        <PrintField label="Fir ID" value={fir.fir_id} />
        <PrintField label="Last Updated" value={formatDate(fir.updated_at)} />
      </div>

      {fir.description_full && (
        <>
          <h3>Description of Incident</h3>
          <p style={{ fontSize: 10, lineHeight: 1.6, color: '#333' }}>{fir.description_full}</p>
        </>
      )}

      {fir.modus_operandi && (
        <>
          <h3>Modus Operandi</h3>
          <p style={{ fontSize: 10, lineHeight: 1.6, color: '#555' }}>{fir.modus_operandi}</p>
        </>
      )}

      {/* ── 2. Accused Profile ──────────────────────────────────── */}
      <h2>2. Accused Profile</h2>
      <hr className="print-divider" />
      <div className="print-grid">
        <PrintField label="Name" value={fir.accused_name} />
        <PrintField label="Age / Gender" value={`${fir.accused_age ?? '—'} yrs · ${fir.accused_gender || '—'}`} />
        <PrintField label="Accused ID" value={fir.accused_id} />
        <PrintField label="Prior Offences" value={String(fir.accused_prior_offences ?? 0)} />
        <PrintField label="Risk Score" value={`${fir.accused_risk_score ?? 0}/100`} />
        <PrintField label="Repeat Offender" value={fir.is_repeat_offender ? 'Yes' : 'No'} />
      </div>

      {/* ── 3. Victim / Complainant ──────────────────────────────── */}
      <h2>3. Victim / Complainant</h2>
      <hr className="print-divider" />
      <div className="print-grid">
        <PrintField label="Name" value={fir.victim_name || '—'} />
        <PrintField label="Age" value={fir.victim_age != null ? String(fir.victim_age) : '—'} />
        <PrintField label="Gender" value={fir.victim_gender || '—'} />
        <PrintField label="Linked Cases" value={String(fir.linked_cases ?? 0)} />
      </div>

      {/* ── 4. Legal Sections ────────────────────────────────────── */}
      <h2>4. Legal Sections Applied</h2>
      <hr className="print-divider" />
      {(fir.legal_sections || []).length === 0 ? (
        <p className="print-muted">No sections recorded</p>
      ) : (
        <table>
          <thead>
            <tr><th>Code</th><th>Section</th><th>Description</th></tr>
          </thead>
          <tbody>
            {fir.legal_sections.map((s, i) => (
              <tr key={i}><td>{s.code}</td><td>{s.section}</td><td>{s.description}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── 5. Court Information ─────────────────────────────────── */}
      {fir.court && (
        <>
          <h2>5. Court Information</h2>
          <hr className="print-divider" />
          <div className="print-grid">
            <PrintField label="Court" value={fir.court.court_name} />
            <PrintField label="Case No." value={fir.court.case_number} />
            <PrintField label="Judge" value={fir.court.judge} />
            <PrintField label="Next Hearing" value={fir.court.next_hearing ? formatDate(fir.court.next_hearing) : 'Not scheduled'} />
            <PrintField label="Bail Status" value={fir.court.bail_status.replace(/_/g, ' ').toUpperCase()} />
            <PrintField label="Chargesheet Filed" value={fir.court.filing_date ? formatDate(fir.court.filing_date) : '—'} />
          </div>
        </>
      )}

      {/* ── 6. Evidence ──────────────────────────────────────────── */}
      <h2>{fir.court ? '6. Evidence' : '5. Evidence'}</h2>
      <hr className="print-divider" />
      {(fir.evidence_items || []).length === 0 ? (
        <p className="print-muted">No evidence recorded</p>
      ) : (
        <table>
          <thead>
            <tr><th>Type</th><th>Description</th><th>Seized From</th><th>Date</th><th>Status</th></tr>
          </thead>
          <tbody>
            {fir.evidence_items.map((ev, i) => (
              <tr key={i}>
                <td>{ev.type}</td>
                <td>{ev.description}</td>
                <td>{ev.seized_from}</td>
                <td>{formatDate(ev.seized_date)}</td>
                <td>{ev.status.replace(/_/g, ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── 7. Witnesses ─────────────────────────────────────────── */}
      <h2>{fir.court ? '7. Witnesses' : '6. Witnesses'}</h2>
      <hr className="print-divider" />
      {(fir.witnesses || []).length === 0 ? (
        <p className="print-muted">No witnesses recorded</p>
      ) : (
        <table>
          <thead>
            <tr><th>Name</th><th>Age</th><th>Gender</th><th>Relation</th><th>Status</th></tr>
          </thead>
          <tbody>
            {fir.witnesses.map((w, i) => (
              <tr key={i}>
                <td>{w.name}</td><td>{w.age}</td><td>{w.gender}</td>
                <td>{w.relation}</td><td>{w.status.replace(/_/g, ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── 8. Investigation Team ─────────────────────────────────── */}
      <h2>{fir.court ? '8. Investigation Team' : '7. Investigation Team'}</h2>
      <hr className="print-divider" />
      <p>{(fir.investigation_officers || []).join(', ') || 'No officers assigned'}</p>

      {/* ── 9. Property ──────────────────────────────────────────── */}
      <h2>{fir.court ? '9. Property' : '8. Property'}</h2>
      <hr className="print-divider" />
      {(fir.property || []).length === 0 ? (
        <p className="print-muted">No property recorded</p>
      ) : (
        <table>
          <thead>
            <tr><th>Item</th><th>Description</th><th>Est. Value</th><th>Status</th></tr>
          </thead>
          <tbody>
            {fir.property.map((p, i) => (
              <tr key={i}>
                <td>{p.item}</td><td>{p.description}</td>
                <td>₹{p.estimated_value.toLocaleString('en-IN')}</td>
                <td>{p.status.toUpperCase()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── 10. Linked Cases ─────────────────────────────────────── */}
      <h2>{fir.court ? '10. Linked Cases' : '9. Linked Cases'}</h2>
      <hr className="print-divider" />
      {(fir.linked_case_details || []).length === 0 ? (
        <p className="print-muted">No linked cases</p>
      ) : (
        <table>
          <thead>
            <tr><th>FIR No</th><th>Crime Type</th><th>District</th><th>Status</th></tr>
          </thead>
          <tbody>
            {fir.linked_case_details.map((lc, i) => (
              <tr key={i}>
                <td>{lc.fir_number}</td><td>{lc.crime_type}</td>
                <td>{lc.district}</td><td>{lc.status.replace(/_/g, ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── 11. Case Diary ────────────────────────────────────────── */}
      <h2>{fir.court ? '11. Case Diary' : '10. Case Diary'}</h2>
      <hr className="print-divider" />
      {(fir.case_diary || []).length === 0 ? (
        <p className="print-muted">No diary entries</p>
      ) : (
        <div>
          {fir.case_diary.map((entry, i) => (
            <div key={i} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: '2px solid #ddd' }}>
              <p style={{ fontSize: 9, color: '#888', margin: '0 0 2pt' }}>
                {formatDate(entry.date)} · {entry.officer} · <em>{entry.progress}</em>
              </p>
              <p style={{ fontSize: 10, color: '#333', margin: 0 }}>{entry.entry}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── 12. AI Analysis ────────────────────────────────────────── */}
      <h2>AI Analysis</h2>
      <hr className="print-divider" />
      <div className="print-warning">
        <p style={{ fontSize: 10, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
          {aiSummary || fir.ai_summary || 'AI analysis not available'}
        </p>
        <p style={{ fontSize: 8, color: '#a16207', margin: '4pt 0 0', fontStyle: 'italic' }}>
          AI-generated analysis — requires human review before operational action.
        </p>
      </div>

      {/* ── 13. Documents ─────────────────────────────────────────── */}
      <h2>Case Documents</h2>
      <hr className="print-divider" />
      {(fir.documents || []).length === 0 ? (
        <p className="print-muted">No documents</p>
      ) : (
        <ul style={{ fontSize: 10, color: '#333' }}>
          {fir.documents.map((doc, i) => (
            <li key={i}>{doc}</li>
          ))}
        </ul>
      )}

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="print-footer">
        <p style={{ margin: 0 }}>
          KARNATAKA STATE POLICE · FIR {fir.fir_number}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 7 }}>
          This document is electronically generated and does not require a physical signature. | Page 1 of 1
        </p>
      </div>
    </motion.div>
  );
}

function PrintField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="print-field-label">{label}</div>
      <div className="print-field-value">{value}</div>
    </div>
  );
}

export { formatDate, initials };
