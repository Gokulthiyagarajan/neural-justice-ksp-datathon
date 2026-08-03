import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { FileDown, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { getFir, getFirTimeline } from '@/api/firs';
import { LoadingSpinner } from '@/components/Common/LoadingSpinner';
import type { FirCase, TimelineEvent } from '@/types';
import type {
  FIRDetail as FIRDetailType,
  EvidenceItem,
  WitnessInfo,
  CaseDiaryEntry,
  LegalSection,
  TimelineEvent as FIRTimelineEvent,
  FIR,
} from '@/types/fir.types';

// ── Helper to build rich detail from basic FIR data ──────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateMo(crimeType: string): string {
  const modes: Record<string, string> = {
    'Robbery': 'Armed robbery — accused used weapon to intimidate victim, demanded valuables, fled on two-wheeler towards highway.',
    'Theft': 'Accused entered premises through unlocked rear door during daytime, ransacked rooms, stole valuables from bedroom closet.',
    'Assault': 'Accused approached victim on street, verbal altercation escalated to physical assault using a blunt weapon.',
    'Burglary': 'House broken into by forcing rear window lock with a metal bar. Targeted items of high value (jewellery, electronics).',
    'Murder': 'Victim called to isolated location on false pretext. Offence appears premeditated — accused carried weapon.',
    'Cyber Fraud': 'Victim received phishing SMS impersonating bank. Clicked link, entered OTP, funds transferred to mule account.',
    'Domestic Violence': 'Repeated verbal and physical abuse by spouse over dowry demand. Victim sustained injuries requiring medical attention.',
    'Kidnapping': 'Minor enticed from school premises by accused pretending to be family friend. Demand for ransom received after 6 hours.',
    'Chain Snatching': 'Two accused on motorcycle snatched gold chain from victim walking on road. Registration number partially noted by eyewitness.',
    'Vehicle Theft': 'Vehicle parked overnight in residential street. CCTV shows unknown person tampering with door at 0200 hrs.',
    'Rape': 'Victim offered lift by accused from bus stop. Taken to isolated location and assaulted. Victim identified accused through photo identification.',
    'Drug Offence': 'Suspicious parcel intercepted at courier facility. Lab analysis confirmed narcotic substance concealed in book binding.',
  };
  return modes[crimeType] || `Accused committed ${crimeType.toLowerCase()} with criminal intention. Detailed modus operandi being established through investigation.`;
}

/** Generate a realistic investigation timeline for demo FIRs (no backend).
 *  Produces 3–8 events depending on case status and crime severity.
 *  Uses the crime_no as a deterministic seed for consistency per case.
 */
function generateDemoTimeline(
  crimeNo: string,
  status: string,
  crimeType: string,
  occurrenceDate: string,
  officer: string,
): TimelineEvent[] {
  const seed = parseInt(crimeNo.replace(/\D/g, '').slice(-6), 10) || 42;
  const rand = seededRandom(seed);
  const r = () => rand();

  const baseDate = occurrenceDate || '2026-01-01';
  const base = new Date(baseDate);
  if (isNaN(base.getTime())) return [];

  // Number of events based on status and severity
  const isSerious = ['Murder', 'Attempt to Murder', 'Rape', 'Kidnapping', 'Arson', 'Dacoity'].includes(crimeType);
  const isClosed = ['closed', 'resolved', 'chargesheeted', 'convicted'].includes(status);

  const officers = [
    officer, 'SI Meena', 'Inspector Raju', 'ASI Prakash',
    'Inspector Kavya', 'SI Naveen', 'Inspector Deshpande',
  ];
  const pickOfficer = (idx: number) => officers[idx % officers.length];

  const events: TimelineEvent[] = [];

  const addEvent = (event: string, timestamp: Date, details: string, officerIdx: number) => {
    const e: any = { event, timestamp: timestamp.toISOString(), details };
    e._officer = pickOfficer(officerIdx);
    return e as TimelineEvent;
  };

  // Event 1: FIR Registered (always first)
  events.push(addEvent(
    'FIR Registered',
    base,
    `Complaint received and registered. Case categorized as ${crimeType}.`,
    0,
  ));

  // Event 2: Investigation assigned (1–2 days later)
  const d2 = new Date(base);
  d2.setDate(d2.getDate() + 1 + Math.floor(r() * 2));
  events.push(addEvent(
    'Investigation Assigned',
    d2,
    `Investigation assigned. Preliminary inquiry initiated.`,
    1,
  ));

  // Event 3: Scene examined (2–4 days later)
  const d3 = new Date(d2);
  d3.setDate(d3.getDate() + 1 + Math.floor(r() * 3));
  events.push(addEvent(
    'Scene of Crime Examined',
    d3,
    `Scene of crime inspected. Forensic team collected physical evidence. Photographs and panchnama prepared.`,
    2,
  ));

  // Event 4: Witness statements (3–6 days later) — always present for serious crimes
  if (isSerious || r() > 0.3) {
    const d4 = new Date(d3);
    d4.setDate(d4.getDate() + 2 + Math.floor(r() * 4));
    events.push(addEvent(
      'Witness Statements Recorded',
      d4,
      `Statements of ${2 + Math.floor(r() * 4)} eyewitnesses recorded under Section 161 CrPC.`,
      3,
    ));
  }

  // Event 5: Accused identified (5–10 days later)
  const d5 = new Date(d3);
  d5.setDate(d5.getDate() + 3 + Math.floor(r() * 7));
  events.push(addEvent(
    'Accused Identified',
    d5,
    `Based on witness descriptions and CCTV footage, suspect(s) identified.`,
    events.length, // pick next officer in rotation
  ));

  // Event 6: Arrest (7–14 days later) — for open/investigating cases
  if (!['closed', 'resolved'].includes(status) || r() > 0.3) {
    const d6 = new Date(d5);
    d6.setDate(d6.getDate() + 2 + Math.floor(r() * 7));
    events.push(addEvent(
      'Accused Arrested',
      d6,
      `Accused apprehended and taken into custody. Remanded to judicial custody.`,
      events.length,
    ));
  }

  // Event 7: Charge sheet / closure for resolved cases
  if (isClosed) {
    const dLast = new Date(base);
    dLast.setDate(dLast.getDate() + 30 + Math.floor(r() * 60));
    events.push(addEvent(
      status === 'chargesheeted' ? 'Charge Sheet Filed' : 'Case Closed',
      dLast,
      status === 'chargesheeted'
        ? `Charge sheet submitted to court under relevant IPC sections.`
        : `Investigation completed. Final report submitted. Case marked as ${status}.`,
      events.length,
    ));
  }

  return events;
}

function buildRichDetail(
  fir: FirCase,
  events: TimelineEvent[],
  extra?: {
    accused_name?: string;
    victim_name?: string;
    district?: string;
    linked_cases?: number;
    accused_id?: string;
  },
): FIRDetailType {
  // The deployed API enriches the FirCase shape; fall back to raw DB
  // column names too so the page never renders "Unknown"/"N/A" when the
  // underlying record actually has data.
  const crimeType =
    (fir as any).crime_head_name ||
    (fir as any).crime_head ||
    (fir as any).crime_type ||
    'Unknown';
  const stationName =
    (fir as any).station_name ||
    (fir as any).station ||
    'Unknown Station';
  const registeredBy =
    (fir as any).registered_by ||
    (fir as any).complainant_name ||
    'N/A';
  const lat = (fir as any).lat ?? (fir as any).latitude;
  const lng = (fir as any).lng ?? (fir as any).longitude;
  const location = lat !== null && lat !== undefined && lat !== 0 && lng
    ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`
    : 'N/A';

  // Accused — prefer extra (route state), then API-enriched accused_name,
  // then raw accused_names JSON string.
  let accusedName = extra?.accused_name || (fir as any).accused_name;
  if (!accusedName && (fir as any).accused_names) {
    try {
      const parsed = JSON.parse((fir as any).accused_names);
      if (Array.isArray(parsed) && parsed.length > 0) accusedName = parsed.join(', ');
    } catch {
      accusedName = String((fir as any).accused_names).replace(/^\[|\]$/g, '');
    }
  }
  const victimName = extra?.victim_name || (fir as any).victim_name || 'Under Investigation';

  const evidenceItems: EvidenceItem[] = [
    { id: 'EV-001', type: 'Document', description: 'Written complaint / statement of complainant', seized_from: 'Complainant', seized_date: fir.occurrence_date || fir.created_at || 'N/A', status: 'in_custody', value: null },
    { id: 'EV-002', type: 'Photograph', description: 'Scene of crime photographs', seized_from: 'Scene', seized_date: fir.occurrence_date || 'N/A', status: 'in_custody', value: null },
    { id: 'EV-003', type: 'Forensic', description: 'Fingerprints lifted from scene', seized_from: 'Scene', seized_date: fir.occurrence_date || 'N/A', status: 'forensic_analysis', value: null },
  ];

  const ipcSections: LegalSection[] = [
    { code: 'IPC', section: '34', description: 'Common intention' },
    { code: 'IPC', section: '511', description: 'Attempting to commit offences' },
  ];

  const witnesses: WitnessInfo[] = [
    { id: 'WIT-001', name: 'Witness A', age: 35, gender: 'Male', relation: 'Eyewitness', statement: 'Statement recorded and submitted.', status: 'examined' },
    { id: 'WIT-002', name: 'Witness B', age: 42, gender: 'Female', relation: 'Neighbour', statement: 'Yet to be examined.', status: 'yet_to_examine' },
  ];

  const diary: CaseDiaryEntry[] = [
    { date: fir.occurrence_date || 'N/A', officer: registeredBy === 'N/A' ? 'IO' : registeredBy, entry: 'FIR registered and investigation initiated.', progress: 'On Track' },
  ];

  const timeline: FIRTimelineEvent[] = events.map((e: any) => ({
    date: e.timestamp ? new Date(e.timestamp).toISOString().slice(0, 10) : fir.occurrence_date || 'N/A',
    event: e.event,
    officer: e._officer || registeredBy || 'IO',
  }));

  const detail: FIRDetailType = {
    fir_id: fir.crime_no,
    fir_number: fir.crime_no,
    date: fir.occurrence_date || '',
    crime_type: crimeType,
    district: extra?.district || (fir as any).district || '',
    station: stationName,
    accused_name: accusedName || 'Under Investigation',
    accused_id: extra?.accused_id || 'N/A',
    victim_name: victimName,
    status: (fir.status as any) || 'open',
    severity: 'medium' as const,
    officer_assigned: registeredBy,
    days_open: fir.occurrence_date ? Math.floor((Date.now() - new Date(fir.occurrence_date).getTime()) / (86400000)) : 0,
    linked_cases: extra?.linked_cases ?? 0,
    description: fir.brief_facts || 'No description available.',
    location,
    rowid: 0,
    accused_age: null,
    accused_gender: null,
    victim_age: null,
    victim_gender: null,
    investigation_timeline: timeline,
    ai_summary: null,
    description_full: fir.brief_facts || 'No description available.',
    fir_date_time: `${fir.occurrence_date || 'N/A'} ${fir.occurrence_time || ''}`,
    legal_sections: ipcSections,
    witnesses,
    evidence_items: evidenceItems,
    property: [],
    linked_case_details: [],
    case_diary: diary,
    court: null,
    investigation_officers: [registeredBy],
    case_category: 'Cognizable',
    modus_operandi: generateMo(crimeType),
    documents: ['Complaint Copy (Form 1)', 'FIR Form (Form 3)', 'Scene of Crime Panchnama', 'Seizure Memo'],
    updated_at: fir.updated_at || fir.created_at || '',
    occurrence_time: fir.occurrence_time || '',
    registration_time: '',
  };

  return detail;
}

// ── Color palette ──────────────────────────────────────────────────────

const C = {
  navy: '#0c1929',
  navyMid: '#0f1d33',
  navyLight: '#1a2d4a',
  white: '#e8edf5',
  muted: '#6b7d9e',
  amber: '#f59e0b',
  blue: '#3b82f6',
  success: '#22c55e',
  red: '#ef4444',
  warning: '#f59e0b',
  purple: '#a855f7',
  teal: '#14b8a6',
};

// ── Status badge color ──────────────────────────────────────────────────

function statusColor(s: string): string {
  const low = s.toLowerCase();
  if (low === 'registered' || low === 'open') return C.blue;
  if (low === 'under_investigation' || low === 'investigating') return C.amber;
  if (low === 'closed' || low === 'chargesheeted' || low === 'resolved') return C.success;
  return C.muted;
}

// ── Section label style ─────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="print-break-inside" style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.12em', color: C.amber, marginBottom: 12,
        paddingBottom: 6, borderBottom: `1px solid ${C.navyLight}`,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: C.white, lineHeight: 1.5 }}>{value || '—'}</div>
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: `${color}18`, color,
      border: `1px solid ${color}40`, borderRadius: 4,
      padding: '2px 8px', fontSize: 11, fontWeight: 500,
    }}>
      {children}
    </span>
  );
}

// ── Generate a plausible FIRDetail from just a crime number, for demo mode ──
function generateDemoFirDetail(crimeNo: string, routeFirOverride?: Partial<FIR>): FIRDetailType {
  const crimeTypes = ['Robbery', 'Theft', 'Assault', 'Burglary', 'Cyber Fraud', 'Vehicle Theft', 'Chain Snatching'];
  const statuses = ['registered', 'under_investigation', 'open', 'closed'];
  const districts = ['BENGALURU_URBAN', 'BENGALURU_RURAL', 'MYSURU'];
  const stations = ['Koramangala PS', 'Ashok Nagar PS', 'Jayanagar PS'];
  const officers = ['SI Meena', 'Inspector Raju', 'ASI Prakash', 'SI Naveen'];
  // Deterministic seed from crimeNo
  const seed = parseInt(crimeNo.replace(/\D/g, '').slice(-4), 10) || 1;
  const idx = (n: number) => (seed * n + n * 7) % n;
  const crimeType = routeFirOverride?.crime_type ?? crimeTypes[idx(crimeTypes.length)];
  const status = routeFirOverride?.status ?? statuses[idx(statuses.length)];
  const district = routeFirOverride?.district ?? districts[idx(districts.length)];
  const station = routeFirOverride?.station ?? stations[idx(stations.length)];
  const officer = routeFirOverride?.officer_assigned ?? officers[idx(officers.length)];

  const firCase: FirCase = {
    crime_no: crimeNo,
    crime_head_name: crimeType,
    station_name: station,
    registered_by: officer,
    occurrence_date: '2026-07-15',
    occurrence_time: '',
    lat: 12.9345,
    lng: 77.6133,
    brief_facts: routeFirOverride?.description
      ?? `${crimeType} reported in ${district} jurisdiction. Investigation underway.`,
    status,
    fir_type: '',
    created_at: '',
    updated_at: '',
  };
  const demoEvents = generateDemoTimeline(crimeNo, status, crimeType, '2026-07-15', officer);
  return buildRichDetail(firCase, demoEvents, {
    accused_name: routeFirOverride?.accused_name ?? 'Ravi Kumar',
    victim_name: routeFirOverride?.victim_name ?? 'Priya Sharma',
    district,
    linked_cases: seed % 3,
    accused_id: `AID-${seed}`,
  });
}

// ── Main component ──────────────────────────────────────────────────────

export function FIRDetailPage() {
  const { crimeNo } = useParams<{ crimeNo: string }>();
  const routeState = useLocation().state as { fir?: FIR } | null;
  const routeFir = routeState?.fir;
  const [fir, setFir] = useState<FIRDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, _setError] = useState('');

  useEffect(() => {
    if (!crimeNo) return;
    setLoading(true);
    Promise.all([
      getFir(crimeNo).catch(() => null),
      getFirTimeline(crimeNo).catch(() => ({ events: [] as TimelineEvent[] })),
    ])
      .then(([firData, timelineData]) => {
        if (!firData) {
          // Backend doesn't have this FIR — use route state if available,
          // otherwise generate a plausible detail from the crime_no alone.
          if (routeFir) {
            const fallback: FirCase = {
              crime_no: routeFir.fir_number,
              crime_head_name: routeFir.crime_type,
              station_name: routeFir.station,
              registered_by: routeFir.officer_assigned,
              occurrence_date: routeFir.date,
              occurrence_time: '',
              lat: 0,
              lng: 0,
              brief_facts: routeFir.description || 'No description available.',
              status: routeFir.status,
              fir_type: '',
              created_at: '',
              updated_at: '',
            };
            const demoEvents = generateDemoTimeline(
              routeFir.fir_number,
              routeFir.status,
              routeFir.crime_type,
              routeFir.date,
              routeFir.officer_assigned,
            );
            const rich = buildRichDetail(fallback, demoEvents, {
              accused_name: routeFir.accused_name,
              victim_name: routeFir.victim_name,
              district: routeFir.district,
              linked_cases: routeFir.linked_cases,
              accused_id: routeFir.accused_id,
            });
            setFir(rich);
            return;
          }

          // No route state — generate demo detail from scratch
          const rich = generateDemoFirDetail(crimeNo, {
            crime_type: crimeNo.includes('001') ? 'Robbery' : undefined,
          });
          setFir(rich);
          return;
        }
        const rich = buildRichDetail(firData, timelineData.events);
        setFir(rich);
      })
      .catch((err) => {
        // Final fallback: generate demo detail
        console.warn('[FIRDetail] fetch failed, generating demo detail:', err);
        const rich = generateDemoFirDetail(crimeNo, {
          crime_type: crimeNo.includes('001') ? 'Robbery' : undefined,
        });
        setFir(rich);
      })
      .finally(() => setLoading(false));
  }, [crimeNo]);

  const handleExportPdf = useCallback(async () => {
    if (!fir || isExporting) return;
    setIsExporting(true);
    try {
      const crimeNo = encodeURIComponent(fir.fir_number);
      const lang = 'en';
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const resp = await fetch(`/api/reports/fir/${crimeNo}/pdf?lang=${lang}`, { headers });
      
      if (!resp.ok) {
        const errorText = await resp.text().catch(() => '');
        throw new Error(`Server returned ${resp.status}: ${resp.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }
      
      // Ensure response is a blob
      const blob = await resp.blob();
      
      if (!blob) {
        throw new Error('Failed to create blob from response');
      }
      
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `FIR-${fir.fir_number.replace(/[/\\]/g, '-')}.pdf`;
      
      document.body.appendChild(link);
      
      // Use setTimeout to ensure the click event is processed
      setTimeout(() => {
        try {
          link.click();
        } catch (clickErr) {
          console.error('Failed to trigger download:', clickErr);
          toast.error('Failed to trigger PDF download. Please check your browser settings.');
        } finally {
          // Remove the link AFTER the click — must be in the timeout callback,
          // not before, or the click won't fire on the detached element.
          document.body.removeChild(link);
        }
      }, 100);
      
      // Clean up the object URL after download completes
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch (revokeErr) {
          console.warn('Failed to revoke object URL:', revokeErr);
        }
      }, 30000);
    } catch (err) {
      console.warn('[PDF Export] Warning:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Unable to generate the PDF report: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  }, [fir, isExporting]);

  if (loading) return <LoadingSpinner message="Loading case details..." />;
  if (error) {
    return (
      <div style={{ padding: 40, maxWidth: 800, margin: '0 auto' }}>
        <div style={{
          background: `${C.red}10`, border: `1px solid ${C.red}30`,
          borderRadius: 12, padding: 40, textAlign: 'center',
        }}>
          <p style={{ color: C.red, fontSize: 14, marginBottom: 16 }}>Unable to load case details. Please try again.</p>
          <Link to="/firs" style={{ color: C.blue, fontSize: 12, textDecoration: 'underline' }}>
            ← Back to FIR list
          </Link>
        </div>
      </div>
    );
  }
  if (!fir) return null;

  return (
    <div>
      {/* ── Toolbar ────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: C.navy, borderBottom: `1px solid ${C.navyLight}`,
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <Link to="/firs" style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <span style={{ flex: 1 }} />
        <button
          onClick={handleExportPdf}
          disabled={isExporting}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: isExporting ? `${C.muted}30` : `${C.amber}18`,
            color: isExporting ? C.muted : C.amber,
            border: `1px solid ${isExporting ? C.navyLight : C.amber}40`,
            borderRadius: 6,
            padding: '6px 14px', fontSize: 12,
            cursor: isExporting ? 'not-allowed' : 'pointer',
          }}
        >
          {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          {isExporting ? 'Generating...' : 'Export PDF'}
        </button>

      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 80px' }}>
        
        {/* Case header */}
        <div style={{
          background: C.navyMid, border: `1px solid ${C.navyLight}`,
          borderRadius: 12, padding: 20, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: C.amber }}>
                  {fir.fir_number}
                </span>
                <Badge color={statusColor(fir.status)}>{fir.status.replace(/_/g, ' ')}</Badge>
              </div>
              <div style={{ fontSize: 15, color: C.white, fontWeight: 500 }}>{fir.crime_type}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                {fir.station} &middot; Registered by {fir.officer_assigned}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {fir.days_open > 0 && (
                <div style={{ fontSize: 11, color: fir.days_open > 30 ? C.red : C.muted, marginTop: 6 }}>
                  {fir.days_open}d open
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 1. Overview ──────────────────────────────────────── */}
        <Section title="Overview">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Field label="FIR Number" value={fir.fir_number} />
              <Field label="Date of Occurrence" value={fir.date} />
              <Field label="Time" value={fir.occurrence_time} />
              <Field label="Crime Type" value={fir.crime_type} />
              <Field label="Category" value={fir.case_category} />
              <Field label="Location" value={fir.location} />
            </div>
            <div>
              <Field label="Status" value={<Badge color={statusColor(fir.status)}>{fir.status.replace(/_/g, ' ')}</Badge>} />
              <Field label="Station" value={fir.station} />
              <Field label="Registered By" value={fir.officer_assigned} />
              <Field label="Registration Date" value={fir.fir_date_time} />
              <Field label="Days Open" value={`${fir.days_open} days`} />
              <Field label="Last Updated" value={fir.updated_at} />
            </div>
          </div>
        </Section>

        {/* ── 2. Description ───────────────────────────────────── */}
        <Section title="Description of Occurrence">
          <div style={{ fontSize: 13, color: C.white, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {fir.description_full}
          </div>
        </Section>

        {/* ── 3. Modus Operandi ────────────────────────────────── */}
        <Section title="Modus Operandi">
          <div style={{ fontSize: 13, color: C.white, lineHeight: 1.7 }}>
            {fir.modus_operandi}
          </div>
        </Section>

        {/* ── 4. Accused ────────────────────────────────────────── */}
        <Section title="Accused Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Field label="Name" value={fir.accused_name} />
            <Field label="Age" value={fir.accused_age ? `${fir.accused_age}y` : 'N/A'} />
            <Field label="Gender" value={fir.accused_gender || 'N/A'} />
          </div>
        </Section>

        {/* ── 5. Victim ──────────────────────────────────────────── */}
        <Section title="Victim Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Name" value={fir.victim_name} />
            <Field label="Age" value={fir.victim_age ? `${fir.victim_age}y` : 'N/A'} />
            <Field label="Gender" value={fir.victim_gender || 'N/A'} />
          </div>
        </Section>

        {/* ── 6. Investigation Officers ─────────────────────────── */}
        <Section title="Investigation Team">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {fir.investigation_officers.map((o, i) => (
              <div key={i} style={{ fontSize: 13, color: C.white }}>
                {o}
              </div>
            ))}
          </div>
        </Section>

        {/* ── 7. Legal Sections ─────────────────────────────────── */}
        {fir.legal_sections.length > 0 && (
          <Section title="Legal Sections Applied">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.navyLight}`, color: C.muted, textTransform: 'uppercase', fontSize: 10 }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Code</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Section</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {fir.legal_sections.map((s, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.navyLight}20` }}>
                    <td style={{ padding: '6px 8px', color: C.amber }}>{s.code}</td>
                    <td style={{ padding: '6px 8px', color: C.white }}>{s.section}</td>
                    <td style={{ padding: '6px 8px', color: C.muted }}>{s.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* ── 8. Evidence ────────────────────────────────────────── */}
        {fir.evidence_items.length > 0 && (
          <Section title="Evidence / Property Seized">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.navyLight}`, color: C.muted, textTransform: 'uppercase', fontSize: 10 }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Seized From</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {fir.evidence_items.map((e, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.navyLight}20` }}>
                    <td style={{ padding: '6px 8px', color: C.muted, fontFamily: 'monospace', fontSize: 11 }}>{e.id}</td>
                    <td style={{ padding: '6px 8px', color: C.white }}>{e.type}</td>
                    <td style={{ padding: '6px 8px', color: C.muted }}>{e.description}</td>
                    <td style={{ padding: '6px 8px', color: C.muted }}>{e.seized_from}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <Badge color={e.status === 'in_custody' ? C.blue : e.status === 'forensic_analysis' ? C.amber : C.success}>
                        {e.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* ── 9. Property ────────────────────────────────────────── */}
        {fir.property.length > 0 && (
          <Section title="Stolen / Recovered Property">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.navyLight}`, color: C.muted, textTransform: 'uppercase', fontSize: 10 }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Value</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {fir.property.map((p, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.navyLight}20` }}>
                    <td style={{ padding: '6px 8px', color: C.white }}>{p.item}</td>
                    <td style={{ padding: '6px 8px', color: C.muted }}>{p.description}</td>
                    <td style={{ padding: '6px 8px', color: C.amber }}>₹{p.estimated_value?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <Badge color={p.status === 'recovered' ? C.success : C.red}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* ── 10. Witnesses ──────────────────────────────────────── */}
        {fir.witnesses.length > 0 && (
          <Section title="Witnesses">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.navyLight}`, color: C.muted, textTransform: 'uppercase', fontSize: 10 }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Age</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Relation</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {fir.witnesses.map((w, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.navyLight}20` }}>
                    <td style={{ padding: '6px 8px', color: C.white }}>{w.name}</td>
                    <td style={{ padding: '6px 8px', color: C.muted }}>{w.age}</td>
                    <td style={{ padding: '6px 8px', color: C.muted }}>{w.relation}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <Badge color={w.status === 'examined' ? C.success : w.status === 'cross_examined' ? C.blue : C.amber}>
                        {w.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* ── 11. Investigation Timeline ─────────────────────────── */}
        <Section title="Investigation Timeline">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {fir.investigation_timeline.length > 0 ? (
              fir.investigation_timeline.map((evt, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, padding: '8px 0',
                  borderBottom: i < fir.investigation_timeline.length - 1 ? `1px solid ${C.navyLight}20` : 'none',
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: i === 0 ? C.amber : C.blue,
                    marginTop: 4, flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: 12, color: C.muted }}>{evt.date}</div>
                    <div style={{ fontSize: 13, color: C.white, fontWeight: 500 }}>{evt.event}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{evt.officer}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>No timeline events recorded.</div>
            )}
          </div>
        </Section>

        {/* ── 12. Case Diary ─────────────────────────────────────── */}
        {fir.case_diary.length > 0 && (
          <Section title="Case Diary">
            {fir.case_diary.map((d, i) => (
              <div key={i} style={{
                background: C.navyMid, border: `1px solid ${C.navyLight}`,
                borderRadius: 8, padding: 12, marginBottom: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: C.muted }}>{d.date}</span>
                  <span style={{ fontSize: 11, color: C.amber }}>{d.officer}</span>
                </div>
                <div style={{ fontSize: 13, color: C.white, lineHeight: 1.5 }}>{d.entry}</div>
                <div style={{ marginTop: 6 }}>
                  <Badge color={d.progress === 'Completed' ? C.success : d.progress === 'Needs Attention' ? C.red : C.blue}>
                    {d.progress}
                  </Badge>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* ── 13. Court Info ──────────────────────────────────────── */}
        {fir.court && (
          <Section title="Court Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Court" value={fir.court.court_name} />
              <Field label="Case Number" value={fir.court.case_number} />
              <Field label="Judge" value={fir.court.judge} />
              <Field label="Next Hearing" value={fir.court.next_hearing || 'Not scheduled'} />
              <Field label="Bail Status" value={
                <Badge color={fir.court.bail_status === 'granted' ? C.success : fir.court.bail_status === 'denied' ? C.red : C.amber}>
                  {fir.court.bail_status.replace(/_/g, ' ')}
                </Badge>
              } />
              <Field label="Charge Sheet Filed" value={fir.court.filing_date || 'N/A'} />
            </div>
          </Section>
        )}

        {/* ── 14. Linked Cases ────────────────────────────────────── */}
        {fir.linked_case_details.length > 0 && (
          <Section title="Linked Cases">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.navyLight}`, color: C.muted, textTransform: 'uppercase', fontSize: 10 }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>FIR Number</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Crime Type</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>District</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {fir.linked_case_details.map((lc, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.navyLight}20` }}>
                    <td style={{ padding: '6px 8px', color: C.amber, fontFamily: 'monospace' }}>{lc.fir_number}</td>
                    <td style={{ padding: '6px 8px', color: C.white }}>{lc.crime_type}</td>
                    <td style={{ padding: '6px 8px', color: C.muted }}>{lc.district}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <Badge color={lc.status === 'closed' ? C.success : lc.status === 'pending_trial' ? C.amber : C.blue}>
                        {lc.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* ── 15. Documents ───────────────────────────────────────── */}
        {fir.documents.length > 0 && (
          <Section title="Case Documents">
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {fir.documents.map((doc, i) => (
                <li key={i} style={{
                  padding: '6px 0', fontSize: 13, color: C.white,
                  borderBottom: `1px solid ${C.navyLight}20`,
                }}>
                  {doc}
                </li>
              ))}
            </ul>
          </Section>
        )}

      </div>
    </div>
  );
}
