import { useCallback, useEffect, useRef, useState } from 'react';
import { getFIRs, getFilterOptions } from '@/services/firApi';
import type {
  FIR,
  FIRFilters,
  FIRFilterOptions,
  FIRSummary,
} from '@/types/fir.types';

const PAGE_SIZE = 50;

const EMPTY_FILTERS: FIRFilters = {
  date_from: '',
  date_to: '',
  district: 'all',
  station: 'all',
  crime_type: 'all',
  status: 'all',
  severity: 'all',
  search: '',
};

const EMPTY_SUMMARY: FIRSummary = {
  critical: 0,
  high: 0,
  open: 0,
  resolved: 0,
};

// Sample FIR records for demo mode (when backend has no DB records)
// Generated 350+ realistic FIRs across Karnataka districts, crime types, stations
const DISTRICTS = [
  'BENGALURU_URBAN', 'BENGALURU_RURAL', 'MYSURU', 'MANGALURU',
  'BELAGAVI', 'HUBLI-DHARWAD', 'GULBARGA', 'BIJAPUR',
  'RAICHUR', 'BELLARY', 'SHIMOGA', 'TUMKUR',
  'MANDYA', 'HASSAN', 'KODAGU', 'DAKSHINA_KANNADA',
  'UDUPI', 'CHITRADURGA', 'DAVANAGERE', 'KOPPAL',
];

const CRIME_TYPES = [
  'Robbery', 'Theft', 'Assault', 'Burglary', 'Murder',
  'Cyber Fraud', 'Domestic Violence', 'Kidnapping', 'Arson',
  'Drug Offence', 'Vehicle Theft', 'Cheating', 'Criminal Intimidation',
  'Chain Snatching', 'Pickpocketing', 'House Breaking', 'Rape',
  'Attempt to Murder', 'Rash Driving', 'Criminal Breach of Trust',
];

const STATIONS: Record<string, string[]> = {
  'BENGALURU_URBAN': ['Koramangala PS', 'Ashok Nagar PS', 'Jayanagar PS', 'Whitefield PS', 'HSR Layout PS', 'Indiranagar PS', 'Malleshwaram PS', 'Rajajinagar PS', 'Yelahanka PS', 'Marathahalli PS', 'Kamakshipalya PS', 'Banashankari PS'],
  'BENGALURU_RURAL': ['Devanahalli PS', 'Doddaballapur PS', 'Hosakote PS', 'Nelamangala PS'],
  'MYSURU': ['Deccan PS', 'Vani Mohalla PS', 'Mysuru City PS', 'Udayagiri PS', 'Nazarbad PS'],
  'MANGALURU': ['Mangaluru City PS', 'Bejai PS', 'Kadri PS', 'Ullal PS', 'Mulki PS'],
  'BELAGAVI': ['Tilakwadi PS', 'Belagavi City PS', 'Khanapur PS', 'Gokak PS'],
  'HUBLI-DHARWAD': ['Hubli East PS', 'Hubli West PS', 'Dharwad PS', 'Navanagar PS'],
  'GULBARGA': ['Gulbarga City PS', 'Afzalpur PS', 'Chittapur PS', 'Sedam PS'],
  'BIJAPUR': ['Bijapur City PS', 'Basavana Bagewadi PS', 'Indi PS'],
  'RAICHUR': ['Raichur City PS', 'Manvi PS', 'Sindhanur PS'],
  'BELLARY': ['Bellary City PS', 'Hospet PS', 'Sandur PS'],
  'SHIMOGA': ['Shimoga Town PS', 'Bhadravathi PS', 'Sagara PS', 'Shikaripur PS'],
  'TUMKUR': ['Tumkur City PS', 'Sira PS', 'Madhugiri PS', 'Pavagada PS'],
  'MANDYA': ['Mandya Town PS', 'Maddur PS', 'Malavalli PS', 'Nagamangala PS'],
  'HASSAN': ['Hassan City PS', 'Channarayapatna PS', 'Arkalgud PS', 'Belur PS'],
  'KODAGU': ['Madikeri PS', 'Virajpet PS', 'Somwarpet PS'],
  'DAKSHINA_KANNADA': ['Puttur PS', 'Bantwal PS', 'Moodbidri PS', 'Sullia PS'],
  'UDUPI': ['Udupi City PS', 'Kundapur PS', 'Karkala PS'],
  'CHITRADURGA': ['Chitradurga City PS', 'Hiriyur PS', 'Challakere PS'],
  'DAVANAGERE': ['Davanagere City PS', 'Harihar PS', 'Channagiri PS'],
  'KOPPAL': ['Koppal City PS', 'Gangavathi PS', 'Kushtagi PS'],
};

const STATUSES: Array<'open' | 'under_investigation' | 'pending_trial' | 'closed' | 'resolved'> = [
  'open', 'under_investigation', 'pending_trial', 'closed', 'resolved',
];

const SEVERITIES: Array<'critical' | 'high' | 'medium' | 'low'> = [
  'critical', 'high', 'medium', 'low',
];

const OFFICERS = [
  'SI Meena', 'Inspector Raju', 'ASI Prakash', 'Inspector Kavya', 'SI Naveen',
  'Inspector Deshpande', 'SI Kulkarni', 'ACP Sharma', 'Inspector Lakshmi', 'DSP Rao',
  'Inspector Thomas', 'SI Hegde', 'SI Ramesh', 'Inspector Geetha', 'ACP Singh',
  'SI Priya', 'Inspector Venkatesh', 'SI Deepak', 'ACP Reddy', 'SI Lakshmi',
];

const ACCUSED_NAMES = [
  'Ravi Kumar', 'Suresh Babu', 'Ibrahim Khan', 'Raju Verma', 'Mohan Gowda',
  'Firoz Khan', 'Deepak Reddy', 'Prakash Gowda', 'Ashwin D\'Souza', 'Manjunath Shetty',
  'Ramesh Nayak', 'Shivanna Gowda', 'Mohammed Ali', 'Sunil Patil', 'Venkatesh Rao',
  'Arun Nair', 'Priya Sharma', 'Lakshmi Devi', 'Vikram Rao', 'Sunita Patil',
  'Ganesh Hegde', 'Ramesh Yadav', 'Suma Prakash', 'Ashwin Kumar', 'Manjunath',
];

const VICTIM_NAMES = [
  'Priya Sharma', 'Arun Nair', 'Lakshmi Devi', 'Vikram Rao', 'Sunita Patil',
  'Ganesh Hegde', 'Ramesh Yadav', 'Suma Prakash', 'Deepak Jain', 'Kiran Motors',
  'Ramesh Yadav', 'Suma Prakash', 'Minor (name withheld)', 'N/A', 'Anita Reddy',
  'Rajesh Kumar', 'Meena Shetty', 'Vijay Kumar', 'Pooja Singh', 'Rahul Gupta',
];

const DESCRIPTIONS: Record<string, string[]> = {
  'Robbery': [
    'Armed robbery at electronics shop',
    'Street robbery — mobile and cash stolen',
    'Jewellery shop robbery in market area',
    'Bank robbery attempt foiled by security',
    'ATM robbery — cash van targeted',
  ],
  'Theft': [
    'Bicycle theft from college campus',
    'Mobile phone theft in crowded bus',
    'Laptop theft from parked vehicle',
    'Gold chain snatched near temple',
    'Cash theft from retail shop',
  ],
  'Assault': [
    'Road rage incident',
    'Bar fight leads to serious injury',
    'Domestic dispute turns violent',
    'Assault with deadly weapon',
    'Gang assault in residential area',
  ],
  'Burglary': [
    'House break-in — gold and cash stolen',
    'Office burglary over weekend',
    'Warehouse break-in — electronics stolen',
    'Jewellery store burglary',
    'Residential burglary — repeated offence',
  ],
  'Murder': [
    'Homicide in apartment complex',
    'Murder over property dispute',
    'Honour killing in rural area',
    'Contract killing suspected',
    'Murder during robbery attempt',
  ],
  'Cyber Fraud': [
    'UPI payment fraud — phishing link',
    'Credit card fraud — ₹3L stolen',
    'Online job scam — ₹1.5L lost',
    'Cryptocurrency investment scam',
    'Bank impersonation fraud',
  ],
  'Domestic Violence': [
    'Repeated domestic abuse — protection order issued',
    'Dowry harassment case',
    'Physical abuse by spouse',
    'Child abuse in domestic setting',
    'Marital rape complaint',
  ],
  'Kidnapping': [
    'Minor kidnapped for ransom',
    'Child abduction — custody dispute',
    'Kidnapping for forced marriage',
    'Industrialist kidnapped for ransom',
    'Student kidnapped from school',
  ],
  'Arson': [
    'Warehouse fire — suspected arson',
    'Vehicle set ablaze in parking',
    'Crop field burned — land dispute',
    'Shop arson over business rivalry',
    'Forest fire — intentional ignition',
  ],
  'Drug Offence': [
    'MD drug seizure from residence',
    'Ganja plantation discovered',
    'Heroin trafficking intercepted',
    'Synthetic drugs factory raided',
    'Narcotics smuggling at border',
  ],
  'Vehicle Theft': [
    'Honda City stolen from apartment parking',
    'Two-wheeler theft from railway station',
    'Commercial vehicle hijacked on highway',
    'Luxury car stolen using relay attack',
    'Auto-rickshaw theft spree',
  ],
  'Cheating': [
    'Real estate fraud — deposit for non-existent flat',
    'Online shopping scam — fake seller',
    'Investment fraud — Ponzi scheme',
    'Marriage bureau fraud',
    'Government job scam',
  ],
  'Criminal Intimidation': [
    'Threatening messages over property dispute',
    'Blackmail with morphed images',
    'Witness intimidation in court case',
    'Extortion calls to businessman',
    'Threats over unpaid loan',
  ],
  'Chain Snatching': [
    'Gold chain snatched near park',
    'Two-wheeler borne snatchers target women',
    'Chain snatching at bus stop',
    'Serial chain snatcher arrested',
    'Elderly woman targeted for chain',
  ],
  'Pickpocketing': [
    'Wallet stolen in crowded market',
    'Phone pickpocketed in bus',
    'Passport stolen at railway station',
    'Tourist targeted by pickpocket gang',
    'Senior citizen loses pension money',
  ],
  'House Breaking': [
    'Daytime house breaking in residential area',
    'Night-time house breaking spree',
    'Locked house targeted during festival',
    'House breaking with weapon',
    'Repeat house breaker arrested',
  ],
  'Rape': [
    'Minor girl raped by neighbour',
    'Woman raped by acquaintance',
    'Gang rape reported in isolated area',
    'Custodial rape allegation',
    'Statutory rape case',
  ],
  'Attempt to Murder': [
    'Stabbing over personal rivalry',
    'Shooting attempt on local leader',
    'Poisoning attempt on family member',
    'Vehicle used as weapon',
    'Acid attack attempt',
  ],
  'Rash Driving': [
    'Hit and run — pedestrian killed',
    'Drunk driving accident — multiple injuries',
    'Racing on public road — fatal crash',
    'Overloaded truck loses control',
    'School bus rash driving',
  ],
  'Criminal Breach of Trust': [
    'Employee embezzles company funds',
    'Trustee misappropriates trust property',
    'Bank employee diverts customer deposits',
    'Lawyer misuses client money',
    'Government official misuses funds',
  ],
};

// Generate 350+ FIR records
function generateDemoFIRs(): FIR[] {
  const firs: FIR[] = [];
  const baseDate = new Date('2026-01-01');
  let rowid = 1;

  for (let i = 0; i < 365; i++) {
    const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
    const station = STATIONS[district]?.[Math.floor(Math.random() * (STATIONS[district]?.length || 1))] || 'Unknown PS';
    const crimeType = CRIME_TYPES[Math.floor(Math.random() * CRIME_TYPES.length)];
    const descriptions = DESCRIPTIONS[crimeType] || DESCRIPTIONS['Theft'];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
    const daysOpen = Math.floor(Math.random() * 60) + 1;
    const officer = OFFICERS[Math.floor(Math.random() * OFFICERS.length)];
    const accusedName = ACCUSED_NAMES[Math.floor(Math.random() * ACCUSED_NAMES.length)];
    const victimName = VICTIM_NAMES[Math.floor(Math.random() * VICTIM_NAMES.length)];
    const linkedCases = Math.floor(Math.random() * 3);

    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);

    const firNumber = `CR-2026-${String(50000 - i).padStart(5, '0')}`;

    firs.push({
      fir_id: String(rowid),
      fir_number: firNumber,
      date: dateStr,
      crime_type: crimeType,
      district,
      station,
      accused_name: accusedName,
      accused_id: `AID-${String(rowid).padStart(3, '0')}`,
      victim_name: victimName,
      status,
      severity,
      officer_assigned: officer,
      days_open: daysOpen,
      linked_cases: linkedCases,
      description: `${description} — ${locationForDistrict(district)}`,
      location: locationForDistrict(district),
      rowid,
    });
    rowid++;
  }

  return firs;
}

function locationForDistrict(district: string): string {
  const locations: Record<string, string[]> = {
    'BENGALURU_URBAN': ['Koramangala', 'Whitefield', 'HSR Layout', 'Indiranagar', 'Jayanagar', 'Malleshwaram', 'Rajajinagar', 'Yelahanka', 'Marathahalli', 'Banashankari', 'Electronic City', 'BTM Layout'],
    'BENGALURU_RURAL': ['Devanahalli', 'Doddaballapur', 'Hosakote', 'Nelamangala'],
    'MYSURU': ['Deccan', 'Vani Mohalla', 'University Campus', 'Nazarbad', 'Udayagiri'],
    'MANGALURU': ['Hampankatta', 'Bejai', 'Kadri', 'Ullal', 'Mulki'],
    'BELAGAVI': ['Tilakwadi', 'Khanapur', 'Gokak', 'Belagavi Fort'],
    'HUBLI-DHARWAD': ['Vidyanagar', 'Navanagar', 'Hubli Railway Station', 'Dharwad'],
    'GULBARGA': ['Old City', 'Afzalpur', 'Chittapur', 'Sedam'],
    'BIJAPUR': ['Bijapur City', 'Basavana Bagewadi', 'Indi', 'Muddebihal'],
    'RAICHUR': ['Raichur City', 'Manvi', 'Sindhanur', 'Lingasugur'],
    'BELLARY': ['Bellary City', 'Hospet', 'Sandur', 'Siruguppa'],
    'SHIMOGA': ['Shimoga Town', 'Bhadravathi', 'Sagara', 'Shikaripur'],
    'TUMKUR': ['Tumkur City', 'Sira', 'Madhugiri', 'Pavagada'],
    'MANDYA': ['Mandya Town', 'Maddur', 'Malavalli', 'Nagamangala'],
    'HASSAN': ['Hassan City', 'Channarayapatna', 'Arkalgud', 'Belur'],
    'KODAGU': ['Madikeri', 'Virajpet', 'Somwarpet', 'Kushalnagar'],
    'DAKSHINA_KANNADA': ['Puttur', 'Bantwal', 'Moodbidri', 'Sullia'],
    'UDUPI': ['Udupi City', 'Kundapur', 'Karkala', 'Brahmavar'],
    'CHITRADURGA': ['Chitradurga City', 'Hiriyur', 'Challakere', 'Holalkere'],
    'DAVANAGERE': ['Davanagere City', 'Harihar', 'Channagiri', 'Honnali'],
    'KOPPAL': ['Koppal City', 'Gangavathi', 'Kushtagi', 'Yelburga'],
  };
  const locs = locations[district] || ['Main Area'];
  return locs[Math.floor(Math.random() * locs.length)];
}

const DEMO_FIRS: FIR[] = generateDemoFIRs();

export function useFIRData() {
  const [filters, setFilters] = useState<FIRFilters>(EMPTY_FILTERS);
  const [firs, setFirs] = useState<FIR[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<FIRSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FIRFilterOptions>({
    districts: [],
    crime_types: [],
    stations: [],
    statuses: [],
    severities: [],
  });
  // Track whether we're in demo mode (backend returned empty / errored)
  const demoMode = useRef(false);

  // Load filter options on mount.
  useEffect(() => {
    getFilterOptions()
      .then((opts) => {
        // When the DB has no FIR records, districts/crime_types/stations come
        // back empty. Populate with realistic Karnataka demo data so the
        // filter dropdowns are always usable.
        setFilterOptions({
          districts: opts.districts.length > 0 ? opts.districts : [
            'BENGALURU_URBAN', 'BENGALURU_RURAL', 'MYSURU', 'MANGALURU',
            'BELAGAVI', 'HUBLI-DHARWAD', 'GULBARGA', 'BIJAPUR',
            'RAICHUR', 'BELLARY', 'SHIMOGA', 'TUMKUR',
            'MANDYA', 'HASSAN', 'KODAGU', 'DAKSHINA_KANNADA',
            'UDUPI', 'CHITRADURGA', 'DAVANAGERE', 'KOPPAL',
            'YADGIR', 'BAGALKOT', 'CHAMARAJANAGAR', 'CHikkamagaluru',
            'KUSHALNAGAR', 'RAMANAGARA', 'KOLAR', 'CHikkABALLAPUR',
            'VIJAYAPURA', 'HAVERI', 'GADAG',
          ],
          crime_types: opts.crime_types.length > 0 ? opts.crime_types : [
            'Robbery', 'Theft', 'Assault', 'Burglary', 'Murder',
            'Cyber Fraud', 'Domestic Violence', 'Kidnapping', 'Arson',
            'Drug Offence', 'Vehicle Theft', 'Cheating', 'Criminal Intimidation',
          ],
          stations: opts.stations.length > 0 ? opts.stations : Object.values(STATIONS).flat().sort(),
          statuses: opts.statuses.length > 0 ? opts.statuses : [
            'open', 'under_investigation', 'pending_trial', 'closed', 'resolved',
          ],
          severities: opts.severities.length > 0 ? opts.severities : [
            'critical', 'high', 'medium', 'low',
          ],
        });
      })
      .catch((err) => {
        // Even on total failure, provide demo filter options
        console.warn('[FIR] Filter options failed, using demo data:', err);
        setFilterOptions({
          districts: [
            'BENGALURU_URBAN', 'MYSURU', 'MANGALURU', 'BELAGAVI',
            'HUBLI-DHARWAD', 'GULBARGA', 'SHIMOGA', 'TUMKUR',
          ],
          crime_types: [
            'Robbery', 'Theft', 'Assault', 'Burglary', 'Murder', 'Cyber Fraud',
          ],
          stations: Object.values(STATIONS).flat().sort(),
          statuses: ['open', 'under_investigation', 'closed'],
          severities: ['critical', 'high', 'medium', 'low'],
        });
      });
  }, []);

  const filterDemoFirs = useCallback((fl: FIRFilters): FIR[] => {
    return DEMO_FIRS.filter((fir) => {
      if (fl.district !== 'all' && fir.district !== fl.district) return false;
      if (fl.station !== 'all' && fir.station !== fl.station) return false;
      if (fl.crime_type !== 'all' && fir.crime_type !== fl.crime_type) return false;
      if (fl.status !== 'all' && fir.status !== fl.status) return false;
      if (fl.severity !== 'all' && fir.severity !== fl.severity) return false;
      if (fl.search) {
        const q = fl.search.toLowerCase();
        const haystack = `${fir.fir_number} ${fir.accused_name} ${fir.victim_name} ${fir.crime_type} ${fir.district} ${fir.station}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (fl.date_from && fir.date < fl.date_from) return false;
      if (fl.date_to && fir.date > fl.date_to) return false;
      return true;
    });
  }, []);

  const computeSummary = useCallback((list: FIR[]): FIRSummary => {
    return {
      critical: list.filter((f) => f.severity === 'critical').length,
      high: list.filter((f) => f.severity === 'high').length,
      open: list.filter((f) => f.status === 'open' || f.status === 'under_investigation').length,
      resolved: list.filter((f) => f.status === 'resolved' || f.status === 'closed').length,
    };
  }, []);

  const fetchFIRs = useCallback(async () => {
    setLoading(true);
    try {
      // In demo mode, filter client-side — don't hit the backend
      if (demoMode.current) {
        const filtered = filterDemoFirs(filters);
        setFirs(filtered);
        setTotal(filtered.length);
        setHasMore(false);
        setSummary(computeSummary(filtered));
        setLoading(false);
        return;
      }

const data = await getFIRs({ ...filters, page, limit: PAGE_SIZE });
      // If the backend returns empty (no DB records), switch to demo mode
      if (data.firs.length === 0 && data.total === 0) {
        demoMode.current = true;
        const filtered = filterDemoFirs(filters);
        setFirs(filtered);
        setTotal(filtered.length);
        setHasMore(false);
        setSummary(computeSummary(filtered));
      } else {
        // Backend has real data - exit demo mode
        demoMode.current = false;
        setFirs(data.firs);
        setTotal(data.total);
        setHasMore(data.has_more ?? false);
        setSummary(data.summary);
      }
    } catch (err) {
      // Demo mode or backend down — show sample FIRs
      console.warn('[FIR] Fetch failed, using demo data:', err);
      demoMode.current = true;
      const filtered = filterDemoFirs(filters);
      setFirs(filtered);
      setTotal(filtered.length);
      setHasMore(false);
      setSummary(computeSummary(filtered));
    } finally {
      setLoading(false);
    }
  }, [filters, page, filterDemoFirs, computeSummary]);

  useEffect(() => {
    fetchFIRs();
  }, [fetchFIRs]);

  // Reset to page 1 when filters change (but not when page itself changes)
  const prevFiltersRef = useRef(filters);
  useEffect(() => {
    if (prevFiltersRef.current !== filters) {
      prevFiltersRef.current = filters;
      setPage(1);
    }
  }, [filters]);

  const updateFilter = useCallback(
    (key: keyof FIRFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  const hasActiveFilters = Object.entries(filters).some(
    ([, v]) => v !== '' && v !== 'all',
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    firs,
    total,
    summary,
    loading,
    filters,
    filterOptions,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    refetch: fetchFIRs,
    // Pagination
    page,
    setPage,
    hasMore,
    totalPages,
    pageSize: PAGE_SIZE,
  };
}
