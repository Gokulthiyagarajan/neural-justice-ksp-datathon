import { useCallback, useState } from 'react';
import { api } from '@/api/client';
import { getFIRDetail } from '@/services/firApi';
import type {
  FIR,
  FIRDetail as FIRDetailType,
  EvidenceItem,
  WitnessInfo,
  CaseDiaryEntry,
  PropertyItem,
  LinkedCaseInfo,
  LegalSection,
  CourtInfo,
} from '@/types/fir.types';

// ── Rich demo-data generators ──────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const IPC_SECTIONS_BY_CRIME: Record<string, LegalSection[]> = {
  'Robbery': [
    { code: 'IPC', section: '392', description: 'Punishment for robbery' },
    { code: 'IPC', section: '397', description: 'Robbery with attempt to cause death or grievous hurt' },
    { code: 'BNS', section: '154(1)', description: 'Preparation to commit robbery' },
  ],
  'Theft': [
    { code: 'IPC', section: '379', description: 'Punishment for theft' },
    { code: 'IPC', section: '380', description: 'Theft in dwelling house' },
    { code: 'BNS', section: '301(2)', description: 'Theft of motor vehicle' },
  ],
  'Assault': [
    { code: 'IPC', section: '323', description: 'Punishment for voluntarily causing hurt' },
    { code: 'IPC', section: '324', description: 'Voluntarily causing hurt by dangerous weapons' },
    { code: 'BNS', section: '118(c)', description: 'Assault or criminal force' },
  ],
  'Burglary': [
    { code: 'IPC', section: '454', description: 'Lurking house trespass for offence punishable with imprisonment' },
    { code: 'IPC', section: '457', description: 'Lurking house trespass by night' },
  ],
  'Murder': [
    { code: 'IPC', section: '302', description: 'Punishment for murder' },
    { code: 'IPC', section: '201', description: 'Causing disappearance of evidence' },
    { code: 'IPC', section: '120B', description: 'Criminal conspiracy' },
    { code: 'BNS', section: '103(1)', description: 'Murder with common intention' },
  ],
  'Cyber Fraud': [
    { code: 'IT Act', section: '66D', description: 'Cheating by impersonation using computer' },
    { code: 'IPC', section: '420', description: 'Cheating and dishonestly inducing delivery of property' },
    { code: 'IPC', section: '406', description: 'Punishment for criminal breach of trust' },
  ],
  'Domestic Violence': [
    { code: 'IPC', section: '498A', description: 'Cruelty by husband or relatives' },
    { code: 'DV Act', section: '3', description: 'Definition of domestic violence' },
    { code: 'IPC', section: '406', description: 'Criminal breach of trust (dowry)' },
  ],
  'Kidnapping': [
    { code: 'IPC', section: '363', description: 'Punishment for kidnapping' },
    { code: 'IPC', section: '364A', description: 'Kidnapping for ransom' },
    { code: 'BNS', section: '140(2)', description: 'Kidnapping a minor' },
  ],
  'Vehicle Theft': [
    { code: 'IPC', section: '379', description: 'Punishment for theft (motor vehicle)' },
    { code: 'IPC', section: '411', description: 'Dishonestly receiving stolen property' },
  ],
  'Rape': [
    { code: 'IPC', section: '376', description: 'Punishment for rape' },
    { code: 'IPC', section: '376(2)', description: 'Punishment for rape by police/public servant' },
    { code: 'BNS', section: '64(1)', description: 'Rape of a minor' },
    { code: 'POCSO', section: '6', description: 'Aggravated penetrative sexual assault' },
  ],
  'Chain Snatching': [
    { code: 'IPC', section: '392', description: 'Punishment for robbery / snatching' },
    { code: 'IPC', section: '356', description: 'Assault in attempt to commit theft of property' },
  ],
  'Drug Offence': [
    { code: 'NDPS Act', section: '8(c)', description: 'Prohibition of certain operations' },
    { code: 'NDPS Act', section: '21', description: 'Punishment for commercial quantity' },
    { code: 'NDPS Act', section: '27', description: 'Punishment for consumption of drugs' },
  ],
};

const DEFAULT_SECTIONS: LegalSection[] = [
  { code: 'IPC', section: '34', description: 'Common intention' },
  { code: 'IPC', section: '511', description: 'Attempting to commit offences' },
];

const EVIDENCE_TEMPLATES: Record<string, EvidenceItem[]> = {
  'Robbery': [
    { id: 'EV-001', type: 'CCTV Footage', description: 'CCTV recording from shop premises covering time of incident', seized_from: 'Shop CCTV System', seized_date: '2026-01-10', status: 'forensic_analysis', value: null },
    { id: 'EV-002', type: 'Weapon', description: 'Country-made pistol (recovered from scene)', seized_from: 'Incident site', seized_date: '2026-01-10', status: 'in_custody', value: null },
    { id: 'EV-003', type: 'Stolen Property', description: 'Cash ₹45,000 and gold chain recovered from accused', seized_from: 'Accused residence', seized_date: '2026-01-12', status: 'in_custody', value: 45000 },
  ],
  'Theft': [
    { id: 'EV-004', type: 'CCTV Footage', description: 'CCCTV capture of suspect near premises', seized_from: 'Neighbouring building CCTV', seized_date: '2026-01-08', status: 'forensic_analysis', value: null },
    { id: 'EV-005', type: 'Stolen Property', description: 'Laptop (Dell Inspiron) recovered', seized_from: 'Pawn shop', seized_date: '2026-01-11', status: 'in_custody', value: 35000 },
    { id: 'EV-006', type: 'Tool', description: 'Lock-picking set found near scene', seized_from: 'Scene of crime', seized_date: '2026-01-08', status: 'collected', value: null },
  ],
  'Murder': [
    { id: 'EV-007', type: 'Weapon', description: 'Knife (30cm blade) with blood stains — recovered', seized_from: 'Scene of crime', seized_date: '2026-01-05', status: 'forensic_analysis', value: null },
    { id: 'EV-008', type: 'Forensic', description: 'Blood samples from scene (type B+ve)', seized_from: 'Crime scene floor', seized_date: '2026-01-05', status: 'forensic_analysis', value: null },
    { id: 'EV-009', type: 'Clothing', description: 'Blood-stained shirt of accused', seized_from: 'Accused residence', seized_date: '2026-01-06', status: 'in_custody', value: null },
    { id: 'EV-010', type: 'Digital Evidence', description: 'Call records between accused and victim (last 48 hrs)', seized_from: 'Service provider', seized_date: '2026-01-07', status: 'in_custody', value: null },
    { id: 'EV-011', type: 'Documents', description: 'Property dispute documents between parties', seized_from: 'Sub-Registrar office', seized_date: '2026-01-08', status: 'produced_in_court', value: null },
  ],
  'Assault': [
    { id: 'EV-012', type: 'Medical', description: 'Medical report — grievous injuries to victim', seized_from: 'Government Hospital', seized_date: '2026-01-09', status: 'in_custody', value: null },
    { id: 'EV-013', type: 'Weapon', description: 'Iron rod used in assault — recovered', seized_from: 'Incident site', seized_date: '2026-01-09', status: 'collected', value: null },
  ],
};

const DEFAULT_EVIDENCE: EvidenceItem[] = [
  { id: 'EV-099', type: 'Document', description: 'Written complaint / statement of complainant', seized_from: 'Complainant', seized_date: '2026-01-01', status: 'in_custody', value: null },
  { id: 'EV-100', type: 'Photograph', description: 'Scene of crime photographs', seized_from: 'Scene', seized_date: '2026-01-01', status: 'in_custody', value: null },
  { id: 'EV-101', type: 'Forensic', description: 'Fingerprints lifted from scene', seized_from: 'Scene', seized_date: '2026-01-02', status: 'forensic_analysis', value: null },
];

const WITNESS_NAMES = [
  'Rajesh Hegde', 'Sunita Patil', 'Venkatesh Gowda', 'Meena Reddy',
  'Prakash Shetty', 'Anita Nair', 'Suresh Kamath', 'Deepa Mohan',
  'Gopal Iyer', 'Lakshmi Devi', 'Naveen Kumar', 'Sharada Rao',
];

const OFFICERS = [
  'SI Meena Kumari', 'Inspector Rajesh Kumar', 'ASI Prakash Gowda',
  'SI Naveen Rao', 'Inspector Venkatesh Shetty', 'SI Priya Patil',
  'Inspector D\'Souza', 'SI Ramesh Hegde', 'ACP Sharmila Devi',
];

function generateDescription(crimeType: string, district: string, station: string): string {
  return `On the aforesaid date and time, the complainant reported that the ${crimeType.toLowerCase()} occurred at ${district} within the jurisdiction of ${station}. The complainant stated that the accused, known to them, committed the offence with criminal intent. The matter was investigated by the duty officer who prepared the scene and recorded statements. Investigation is in progress to ascertain further details and trace any accomplices.`;
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
    'Arson': 'Fire reported in commercial establishment during early hours. Fire department suspects deliberate ignition. CCTV shows unknown person near premises.',
    'Attempt to Murder': 'Victim attacked with sharp weapon while returning home. Alert neighbour raised alarm, accused fled.',
    'Pickpocketing': 'Victim\'s wallet lifted from back pocket in crowded market area. Eye witness saw suspect passing wallet to accomplice.',
    'House Breaking': 'Accused removed ceiling tiles to gain entry. Targeted safe room. Neighbour heard breaking sounds at 1430 hrs.',
    'Criminal Intimidation': 'Accused sent threatening messages via WhatsApp. IP address traced to city cyber cafe. Cafe CCTV obtained.',
    'Cheating': 'Accused promised government job to victim, collected ₹2L as processing fee. Job never materialized, accused untraceable.',
    'Rash Driving': 'Vehicle driven at high speed on wrong side, hit pedestrian near junction. Driver abandoned vehicle at scene.',
  };
  return modes[crimeType] || `Accused committed ${crimeType.toLowerCase()} with criminal intention. Detailed modus operandi being established through investigation.`;
}

function buildRichDetail(fir: FIR): FIRDetailType {
  const rand = seededRandom(parseInt(fir.fir_id, 10) || 42);
  const r = () => rand();
  const evidence = EVIDENCE_TEMPLATES[fir.crime_type]?.slice(0) ?? [...DEFAULT_EVIDENCE];
  const sections = IPC_SECTIONS_BY_CRIME[fir.crime_type] ?? DEFAULT_SECTIONS;

  const numWitnesses = Math.floor(r() * 4) + 1;
  const witnesses: WitnessInfo[] = [];
  const shuffled = [...WITNESS_NAMES].sort(() => r() - 0.5);
  for (let i = 0; i < Math.min(numWitnesses, shuffled.length); i++) {
    witnesses.push({
      id: `WIT-${String(i + 1).padStart(3, '0')}`,
      name: shuffled[i],
      age: Math.floor(r() * 40) + 20,
      gender: r() > 0.5 ? 'Male' : 'Female',
      relation: pick(['Neighbour', 'Family Member', 'Colleague', 'Eyewitness', 'Shop Owner']),
      statement: r() > 0.3 ? 'Statement recorded and submitted.' : 'Yet to be examined.',
      status: r() > 0.6 ? 'examined' : r() > 0.3 ? 'yet_to_examine' : 'cross_examined',
    });
  }

  const numDiary = Math.floor(r() * 5) + 2;
  const diary: CaseDiaryEntry[] = [];
  const baseDate = new Date(fir.date);
  const diaryOfficers = pick([...OFFICERS]);
  for (let i = 0; i < numDiary; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i * (Math.floor(r() * 5) + 2));
    diary.push({
      date: d.toISOString().slice(0, 10),
      officer: diaryOfficers,
      entry: pick([
        'Visited scene of crime and prepared rough sketch.',
        'Recorded statement of neighbours and independent witnesses.',
        'Collected CCTV footage from area shops — sent for forensic analysis.',
        'Accused brought for interrogation — confessional statement obtained.',
        'Recovery of stolen property from accused led to recovery panchnama.',
        'Fingerprint expert visited scene — lifted partial prints.',
        'Medical report received from district hospital.',
        'Witness identification parade conducted at judicial custody.',
        'Case property produced before jurisdictional magistrate.',
        'Investigation revealed involvement of additional accused.',
        'Call detail records analysed for location tracking.',
        'Accused remanded to police custody for 5 days.',
      ]),
      progress: pick(['On Track', 'On Track', 'On Track', 'Needs Attention', 'Completed']),
    });
  }

  const property: PropertyItem[] = [];
  if (['Robbery', 'Theft', 'Burglary', 'Chain Snatching', 'Vehicle Theft', 'House Breaking'].includes(fir.crime_type)) {
    const pcount = Math.floor(r() * 3) + 1;
    const items = ['Gold Chain', 'Cash ₹', 'Smartphone', 'Laptop', 'Two-Wheeler', 'Jewellery Set', 'Wristwatch'];
    for (let i = 0; i < pcount; i++) {
      const itemName = pick(items);
      property.push({
        id: `PROP-${String(i + 1).padStart(3, '0')}`,
        item: itemName,
        description: `${itemName} — estimated value ₹${((Math.floor(r() * 95) + 5) * 1000).toLocaleString('en-IN')}`,
        estimated_value: (Math.floor(r() * 95) + 5) * 1000,
        status: r() > 0.6 ? 'recovered' : 'stolen',
        recovery_date: r() > 0.6 ? fir.date : null,
      });
    }
  }

  const linked: LinkedCaseInfo[] = [];
  if (fir.linked_cases > 0 && fir.accused_name) {
    for (let i = 1; i <= Math.min(fir.linked_cases, 3); i++) {
      const liDate = new Date(fir.date);
      liDate.setDate(liDate.getDate() - i * 45);
      linked.push({
        fir_number: `KSP-2026-${String((parseInt(fir.fir_id, 10) || 1000) - i * 37).padStart(5, '0')}`,
        crime_type: pick(['Theft', 'Robbery', 'Burglary', 'Assault']),
        district: fir.district,
        status: pick(['closed', 'pending_trial', 'open']),
        accused: fir.accused_name,
      });
    }
  }

  const court: CourtInfo | null = fir.status === 'pending_trial' || fir.status === 'closed' || fir.status === 'resolved' ? {
    court_name: `District & Sessions Court, ${fir.district.replace(/_/g, ' ')}`,
    case_number: `SC-${new Date().getFullYear()}-${Math.floor(r() * 5000 + 100)}`,
    judge: pick(['Hon\'ble Sri. Kumar Shetty', 'Hon\'ble Smt. Anitha Rao', 'Hon\'ble Sri. Venkatesh Gowda']),
    next_hearing: r() > 0.3 ? '2026-03-15' : null,
    bail_status: fir.crime_type === 'Murder' || fir.crime_type === 'Rape' ? 'denied' : r() > 0.5 ? 'granted' : 'pending',
    filing_date: new Date(new Date(fir.date).getTime() + 90 * 86400000).toISOString().slice(0, 10),
  } : null;

  const detail: FIRDetailType = {
    ...fir,
    accused_risk_score: Math.floor(r() * 70 + 10),
    accused_prior_offences: fir.is_repeat_offender ? Math.floor(r() * 4 + 1) : 0,
    accused_age: Math.floor(r() * 35 + 20),
    accused_gender: r() > 0.9 ? 'Female' : 'Male',
    victim_age: Math.floor(r() * 30 + 15),
    victim_gender: r() > 0.5 ? 'Female' : 'Male',
    investigation_timeline: [
      { date: fir.date, event: 'FIR Registered', officer: fir.officer_assigned },
      { date: new Date(new Date(fir.date).getTime() + 2 * 86400000).toISOString().slice(0, 10), event: 'Investigation assigned', officer: fir.officer_assigned },
      { date: new Date(new Date(fir.date).getTime() + 4 * 86400000).toISOString().slice(0, 10), event: 'Scene inspection completed', officer: fir.officer_assigned },
    ],
    ai_summary: `FIR ${fir.fir_number} — ${fir.crime_type} registered in ${fir.district}. ${fir.accused_name} ${fir.is_repeat_offender ? 'is a repeat offender. ' : ''}Status: ${fir.status}. Open for ${fir.days_open} days. ${fir.linked_cases} linked case(s). Risk score: ${fir.is_repeat_offender ? Math.floor(r() * 25 + 60) : Math.floor(r() * 35 + 20)}/100.`,

    // New comprehensive fields
    description_full: generateDescription(fir.crime_type, fir.district, fir.station),
    fir_date_time: `${fir.date} ${String(Math.floor(r() * 21 + 8)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')} hrs`,
    occurrence_time: `${String(Math.floor(r() * 21 + 6)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')} hrs`,
    registration_time: `${String(Math.floor(r() * 3 + 8)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')} hrs`,
    legal_sections: sections,
    witnesses,
    evidence_items: evidence,
    property,
    linked_case_details: linked,
    case_diary: diary,
    court,
    investigation_officers: [fir.officer_assigned, pick(OFFICERS)],
    case_category: pick(['Cognizable', 'Cognizable & Non-Bailable', 'Cognizable & Bailable']),
    modus_operandi: generateMo(fir.crime_type),
    documents: [
      'Complaint Copy (Form 1)',
      'FIR Form (Form 3)',
      'Scene of Crime Panchnama',
      'Seizure Memo',
      'Accused Arrest Memo',
      'Remand Application',
    ],
    updated_at: new Date(new Date(fir.date).getTime() + fir.days_open * 86400000).toISOString().slice(0, 10),
  };

  return detail;
}

// ── Hook ──────────────────────────────────────────────────────

export function useFIRDetail() {
  const [selectedFIR, setSelectedFIR] = useState<FIRDetailType | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const openDetail = useCallback(async (fir: FIR) => {
    setLoading(true);
    setAiSummary(null);
    // Immediately generate the rich detail from the table row data (always works)
    const richDetail = buildRichDetail(fir);
    setSelectedFIR(richDetail);

    // Try backend for additional data (silent fail)
    try {
      const backendDetail = await getFIRDetail(fir.fir_id);
      // Merge any backend-provided fields
      setSelectedFIR((prev) => prev ? { ...prev, ...backendDetail } : backendDetail);
    } catch {
      // Backend unavailable — demo data from buildRichDetail is sufficient
    }

    // Generate AI summary locally
    setAiLoading(true);
    try {
      const res = await api.post<{ text?: string; response?: string }>(
        '/ai/query',
        { mode: 'case_analysis', q: fir.fir_number },
      );
      const text = res?.text || res?.response;
      setAiSummary(text || richDetail.ai_summary);
    } catch {
      setAiSummary(richDetail.ai_summary);
    } finally {
      setAiLoading(false);
      setLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedFIR(null);
    setAiSummary(null);
  }, []);

  return {
    selectedFIR,
    loading,
    aiSummary,
    aiLoading,
    openDetail,
    closeDetail,
    isOpen: selectedFIR !== null,
  };
}
