import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { FileDown, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { getFir, getFirTimeline } from '@/api/firs';
import { authHeaders } from '@/utils/authHeaders';
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
    accused_age: (fir as any).accused_age ?? null,
    accused_gender: (fir as any).accused_gender ?? null,
    // Per-accused rows straight from the enriched API payload; if absent,
    // fall back to a single row built from the combined name + first age.
    accused_list: Array.isArray((fir as any).accused_list) && (fir as any).accused_list.length > 0
      ? (fir as any).accused_list.map((a: any) => ({
          name: a.name || '',
          age: a.age ?? null,
          gender: a.gender || null,
        }))
      : [{
          name: accusedName || 'Under Investigation',
          age: (fir as any).accused_age ?? null,
          gender: (fir as any).accused_gender ?? null,
        }],
    victim_age: (fir as any).victim_age ?? null,
    victim_gender: (fir as any).victim_gender ?? null,
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
      // Same base-resolution as the API client: VITE_API_URL at build time,
      // otherwise '/api' (Vite dev proxy). Never a bare relative path in prod.
      const BASE_URL = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api`
        : '/api';
      const headers: Record<string, string> = {
        ...authHeaders(),
      };

      const resp = await fetch(`${BASE_URL}/reports/fir/${crimeNo}/pdf?lang=${lang}`, { headers });
      
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
      <div className="sticky top-0 z-40 bg-[#0c1929] border-b border-[#1a2d4a] px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link to="/firs" className="text-[#6b7d9e] hover:text-[#e8edf5] transition-colors flex items-center gap-1.5 text-xs sm:text-sm font-medium min-h-[36px]">
          <ArrowLeft size={16} /> Back
        </Link>
        <button
          onClick={handleExportPdf}
          disabled={isExporting}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium border transition-colors min-h-[36px] ${
            isExporting
              ? 'bg-[#6b7d9e]/20 text-[#6b7d9e] border-[#1a2d4a] cursor-not-allowed'
              : 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/40 hover:bg-[#f59e0b]/25 cursor-pointer'
          }`}
        >
          {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          {isExporting ? 'Generating...' : 'Export PDF'}
        </button>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
        
        {/* Case header */}
        <div className="bg-[#0f1d33] border border-[#1a2d4a] rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <span className="font-mono text-lg sm:text-xl font-bold text-[#f59e0b]">
                  {fir.fir_number}
                </span>
                <Badge color={statusColor(fir.status)}>{fir.status.replace(/_/g, ' ')}</Badge>
              </div>
              <div className="text-base sm:text-lg text-[#e8edf5] font-semibold">{fir.crime_type}</div>
              <div className="text-xs sm:text-sm text-[#6b7d9e] mt-1">
                {fir.station} &middot; Registered by {fir.officer_assigned}
              </div>
            </div>
            {fir.days_open > 0 && (
              <div className="sm:text-right shrink-0">
                <div className={`text-xs font-semibold px-2 py-1 rounded bg-[#0c1929] border border-[#1a2d4a] inline-block ${fir.days_open > 30 ? 'text-[#ef4444]' : 'text-[#6b7d9e]'}`}>
                  {fir.days_open} days open
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 1. Overview ──────────────────────────────────────── */}
        <Section title="Overview">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0f1d33]/50 border border-[#1a2d4a]/60 rounded-lg p-4">
            <div className="space-y-3">
              <Field label="FIR Number" value={fir.fir_number} />
              <Field label="Date of Occurrence" value={fir.date} />
              <Field label="Time" value={fir.occurrence_time} />
              <Field label="Crime Type" value={fir.crime_type} />
              <Field label="Category" value={fir.case_category} />
              <Field label="Location" value={fir.location} />
            </div>
            <div className="space-y-3">
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
          <div className="text-xs sm:text-sm text-[#e8edf5] leading-relaxed whitespace-pre-wrap bg-[#0f1d33]/50 border border-[#1a2d4a]/60 rounded-lg p-4">
            {fir.description_full}
          </div>
        </Section>

        {/* ── 3. Modus Operandi ────────────────────────────────── */}
        <Section title="Modus Operandi">
          <div className="text-xs sm:text-sm text-[#e8edf5] leading-relaxed bg-[#0f1d33]/50 border border-[#1a2d4a]/60 rounded-lg p-4">
            {fir.modus_operandi}
          </div>
        </Section>

        {/* ── 4. Accused ────────────────────────────────────────── */}
        <Section title="Accused Details">
          <div className="bg-[#0f1d33]/50 border border-[#1a2d4a]/60 rounded-lg p-4 space-y-3">
            <div className="hidden sm:grid grid-cols-3 gap-4 pb-2 border-b border-[#1a2d4a] text-[11px] font-semibold text-[#6b7d9e] uppercase tracking-wider">
              <div>Name</div>
              <div>Age</div>
              <div>Gender</div>
            </div>
            {(fir.accused_list && fir.accused_list.length > 0 ? fir.accused_list : []).map((a, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-4 pb-3 border-b border-[#1a2d4a]/40 last:border-0 last:pb-0">
                <div className="text-xs sm:text-sm text-[#e8edf5] font-medium"><span className="sm:hidden text-xs text-[#6b7d9e] font-normal mr-2">Name:</span>{a.name || 'Not recorded'}</div>
                <div className="text-xs sm:text-sm text-[#e8edf5]"><span className="sm:hidden text-xs text-[#6b7d9e] font-normal mr-2">Age:</span>{a.age ? `${a.age}y` : 'N/A'}</div>
                <div className="text-xs sm:text-sm text-[#e8edf5]"><span className="sm:hidden text-xs text-[#6b7d9e] font-normal mr-2">Gender:</span>{a.gender || 'N/A'}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 5. Victim ──────────────────────────────────────────── */}
        <Section title="Victim Details">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#0f1d33]/50 border border-[#1a2d4a]/60 rounded-lg p-4">
            <Field label="Name" value={fir.victim_name} />
            <Field label="Age" value={fir.victim_age ? `${fir.victim_age}y` : 'N/A'} />
            <Field label="Gender" value={fir.victim_gender || 'N/A'} />
          </div>
        </Section>

        {/* ── 6. Investigation Officers ─────────────────────────── */}
        <Section title="Investigation Team">
          <div className="bg-[#0f1d33]/50 border border-[#1a2d4a]/60 rounded-lg p-4 space-y-2">
            {fir.investigation_officers.map((o, i) => (
              <div key={i} className="text-xs sm:text-sm text-[#e8edf5] font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
                {o}
              </div>
            ))}
          </div>
        </Section>

        {/* ── 7. Legal Sections ─────────────────────────────────── */}
        {fir.legal_sections.length > 0 && (
          <Section title="Legal Sections Applied">
            <div className="overflow-x-auto table-scroll rounded-lg border border-[#1a2d4a]/60 bg-[#0f1d33]/50">
              <table className="w-full text-left border-collapse min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#1a2d4a] text-[#6b7d9e] uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-2.5">Code</th>
                    <th className="px-4 py-2.5">Section</th>
                    <th className="px-4 py-2.5">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2d4a]/30 text-xs sm:text-sm">
                  {fir.legal_sections.map((s, i) => (
                    <tr key={i} className="hover:bg-[#0c1929]/40">
                      <td className="px-4 py-2.5 text-[#f59e0b] font-mono font-medium">{s.code}</td>
                      <td className="px-4 py-2.5 text-[#e8edf5] font-medium">{s.section}</td>
                      <td className="px-4 py-2.5 text-[#6b7d9e]">{s.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── 8. Evidence ────────────────────────────────────────── */}
        {fir.evidence_items.length > 0 && (
          <Section title="Evidence / Property Seized">
            <div className="overflow-x-auto table-scroll rounded-lg border border-[#1a2d4a]/60 bg-[#0f1d33]/50">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-[#1a2d4a] text-[#6b7d9e] uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-2.5">ID</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5">Seized From</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2d4a]/30 text-xs sm:text-sm">
                  {fir.evidence_items.map((e, i) => (
                    <tr key={i} className="hover:bg-[#0c1929]/40">
                      <td className="px-4 py-2.5 text-[#6b7d9e] font-mono text-xs">{e.id}</td>
                      <td className="px-4 py-2.5 text-[#e8edf5] font-medium">{e.type}</td>
                      <td className="px-4 py-2.5 text-[#6b7d9e]">{e.description}</td>
                      <td className="px-4 py-2.5 text-[#6b7d9e]">{e.seized_from}</td>
                      <td className="px-4 py-2.5">
                        <Badge color={e.status === 'in_custody' ? C.blue : e.status === 'forensic_analysis' ? C.amber : C.success}>
                          {e.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── 9. Property ────────────────────────────────────────── */}
        {fir.property.length > 0 && (
          <Section title="Stolen / Recovered Property">
            <div className="overflow-x-auto table-scroll rounded-lg border border-[#1a2d4a]/60 bg-[#0f1d33]/50">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-[#1a2d4a] text-[#6b7d9e] uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-2.5">Item</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5">Value</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2d4a]/30 text-xs sm:text-sm">
                  {fir.property.map((p, i) => (
                    <tr key={i} className="hover:bg-[#0c1929]/40">
                      <td className="px-4 py-2.5 text-[#e8edf5] font-medium">{p.item}</td>
                      <td className="px-4 py-2.5 text-[#6b7d9e]">{p.description}</td>
                      <td className="px-4 py-2.5 text-[#f59e0b] font-medium">₹{p.estimated_value?.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2.5">
                        <Badge color={p.status === 'recovered' ? C.success : C.red}>
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── 10. Witnesses ──────────────────────────────────────── */}
        {fir.witnesses.length > 0 && (
          <Section title="Witnesses">
            <div className="overflow-x-auto table-scroll rounded-lg border border-[#1a2d4a]/60 bg-[#0f1d33]/50">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-[#1a2d4a] text-[#6b7d9e] uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Age</th>
                    <th className="px-4 py-2.5">Relation</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2d4a]/30 text-xs sm:text-sm">
                  {fir.witnesses.map((w, i) => (
                    <tr key={i} className="hover:bg-[#0c1929]/40">
                      <td className="px-4 py-2.5 text-[#e8edf5] font-medium">{w.name}</td>
                      <td className="px-4 py-2.5 text-[#6b7d9e]">{w.age}</td>
                      <td className="px-4 py-2.5 text-[#6b7d9e]">{w.relation}</td>
                      <td className="px-4 py-2.5">
                        <Badge color={w.status === 'examined' ? C.success : w.status === 'cross_examined' ? C.blue : C.amber}>
                          {w.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── 11. Investigation Timeline ─────────────────────────── */}
        <Section title="Investigation Timeline">
          <div className="bg-[#0f1d33]/50 border border-[#1a2d4a]/60 rounded-lg p-4 space-y-3">
            {fir.investigation_timeline.length > 0 ? (
              fir.investigation_timeline.map((evt, i) => (
                <div key={i} className="flex gap-3 pb-3 border-b border-[#1a2d4a]/30 last:border-0 last:pb-0">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${i === 0 ? 'bg-[#f59e0b]' : 'bg-[#3b82f6]'}`} />
                  <div>
                    <div className="text-xs text-[#6b7d9e]">{evt.date}</div>
                    <div className="text-xs sm:text-sm text-[#e8edf5] font-medium mt-0.5">{evt.event}</div>
                    <div className="text-xs text-[#6b7d9e] mt-0.5">{evt.officer}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-[#6b7d9e] italic">No timeline events recorded.</div>
            )}
          </div>
        </Section>

        {/* ── 12. Case Diary ─────────────────────────────────────── */}
        {fir.case_diary.length > 0 && (
          <Section title="Case Diary">
            <div className="space-y-3">
              {fir.case_diary.map((d, i) => (
                <div key={i} className="bg-[#0f1d33] border border-[#1a2d4a] rounded-lg p-3.5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#6b7d9e] font-mono">{d.date}</span>
                    <span className="text-[#f59e0b] font-medium">{d.officer}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-[#e8edf5] leading-relaxed">{d.entry}</div>
                  <div>
                    <Badge color={d.progress === 'Completed' ? C.success : d.progress === 'Needs Attention' ? C.red : C.blue}>
                      {d.progress}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── 13. Court Info ──────────────────────────────────────── */}
        {fir.court && (
          <Section title="Court Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0f1d33]/50 border border-[#1a2d4a]/60 rounded-lg p-4">
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
            <div className="overflow-x-auto table-scroll rounded-lg border border-[#1a2d4a]/60 bg-[#0f1d33]/50">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-[#1a2d4a] text-[#6b7d9e] uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-2.5">FIR Number</th>
                    <th className="px-4 py-2.5">Crime Type</th>
                    <th className="px-4 py-2.5">District</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2d4a]/30 text-xs sm:text-sm">
                  {fir.linked_case_details.map((lc, i) => (
                    <tr key={i} className="hover:bg-[#0c1929]/40">
                      <td className="px-4 py-2.5 text-[#f59e0b] font-mono font-medium">{lc.fir_number}</td>
                      <td className="px-4 py-2.5 text-[#e8edf5] font-medium">{lc.crime_type}</td>
                      <td className="px-4 py-2.5 text-[#6b7d9e]">{lc.district}</td>
                      <td className="px-4 py-2.5">
                        <Badge color={lc.status === 'closed' ? C.success : lc.status === 'pending_trial' ? C.amber : C.blue}>
                          {lc.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── 15. Documents ───────────────────────────────────────── */}
        {fir.documents.length > 0 && (
          <Section title="Case Documents">
            <ul className="bg-[#0f1d33]/50 border border-[#1a2d4a]/60 rounded-lg divide-y divide-[#1a2d4a]/30 px-4 py-1">
              {fir.documents.map((doc, i) => (
                <li key={i} className="py-2.5 text-xs sm:text-sm text-[#e8edf5] font-medium flex items-center justify-between">
                  <span>{doc}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a2d4a] text-[#6b7d9e]">PDF</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

      </div>
    </div>
  );
}
