import type { DashboardCard } from '../types/copilot.types';
import type { Language } from './i18n';
import type { KSPRole } from '@/config/navConfig';

// ─── Generic (cross-role) suggestion pool ───────────────────────────────────

export const SUGGESTED_QUERIES: Record<Language, string[]> = {
  en: [
    'Which districts had the most FIRs this week?',
    'Show me repeat offenders in Bengaluru Urban',
    'What crime types spiked this month?',
    'Which zones need patrol deployment this weekend?',
    'Compare theft rates across all 4 divisions',
    'Early warning alerts active right now',
  ],
  kn: [
    'ಈ ವಾರ ಅತಿ ಹೆಚ್ಚು ಎಫ್ಐಆರ್ ಇರುವ ಜಿಲ್ಲೆಗಳು ಯಾವುವು?',
    'ಬೆಂಗಳೂರು ನಗರದಲ್ಲಿ ಪುನರಾವರ್ತಿತ ಅಪರಾಧಿಗಳನ್ನು ತೋರಿಸಿ',
    'ಈ ತಿಂಗಳು ಯಾವ ಅಪರಾಧ ಪ್ರಕಾರಗಳು ಹೆಚ್ಚಾದವು?',
    'ಈ ವಾರಾಂತ್ಯದಲ್ಲಿ ಯಾವ ವಲಯಗಳಿಗೆ ಗಸ್ತು ಬೇಕು?',
    '4 ವಿಭಾಗಗಳಲ್ಲಿ ಕಳ್ಳತನ ದರ ಹೋಲಿಸಿ',
    'ಈಗ ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆ ಅಲರ್ಟ್‌ಗಳು',
  ],
};

// ─── Role-specific suggestion pools ─────────────────────────────────────────
// Each role sees suggestions relevant to their operational scope.

export const ROLE_SUGGESTIONS: Record<KSPRole, Record<Language, string[]>> = {
  // ── Police Constable — assigned cases, patrol, daily tasks ───────────────
  OFFICER: {
    en: [
      "What are my assigned FIRs today?",
      "Show me my patrol route for this shift",
      "Summarise the evidence in my current case",
      "What are today's orders from my station?",
      "Nearest hospitals and emergency contacts",
      "Help me write my daily activity report",
      "What FIRs am I assigned to this week?",
      "Station procedures for evidence collection",
    ],
    kn: [
      'ಇಂದಿನ ನನ್ನ ಎಫ್ಐಆರ್‌ಗಳು ಯಾವುವು?',
      'ನನ್ನ ಗಸ್ತು ಮಾರ್ಗವನ್ನು ತೋರಿಸಿ',
      'ನನ್ನ ಪ್ರಕರಣದ ಸಾಕ್ಷ್ಯಗಳ ಸಾರಾಂಶ ನೀಡಿ',
      'ಇಂದಿನ ಠಾಣೆ ಆದೇಶಗಳು ಯಾವುವು?',
      'ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳು ಮತ್ತು ತುರ್ತು ಸಂಪರ್ಕಗಳು',
      'ನನ್ನ ದೈನಂದಿನ ಚಟುವಟಿಕೆ ವರದಿ ಬರೆಯಲು ಸಹಾಯ ಮಾಡಿ',
      'ಈ ವಾರ ನನಗೆ ನಿಯೋಜಿಸಲಾದ ಎಫ್ಐಆರ್‌ಗಳು ಯಾವುವು?',
      'ಸಾಕ್ಷ್ಯ ಸಂಗ್ರಹಣೆಗೆ ಠಾಣೆ ಕಾರ್ಯವಿಧಾನಗಳು',
    ],
  },

  // ── Police Sub Inspector (PSI) — investigations, analytics ───────────────
  ANALYST: {
    en: [
      "Summarise my ongoing investigations",
      "What are the crime patterns in my station limits?",
      "Show hotspots in my jurisdiction this month",
      "Draft a charge sheet for FIR KSP-2026-001",
      "What evidence correlates across my active cases?",
      "Prepare witness examination checklist",
      "Forecast crime trends for the next 7 days",
      "Which beat areas need more patrol coverage?",
    ],
    kn: [
      'ನನ್ನ ನಡೆಯುತ್ತಿರುವ ತನಿಖೆಗಳ ಸಾರಾಂಶ ನೀಡಿ',
      'ನನ್ನ ಠಾಣೆ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಅಪರಾಧ ಮಾದರಿಗಳು ಯಾವುವು?',
      'ಈ ತಿಂಗಳು ನನ್ನ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳನ್ನು ತೋರಿಸಿ',
      'ಎಫ್ಐಆರ್ KSP-2026-001 ಗಾಗಿ ಆರೋಪಪಟ್ಟಿ ತಯಾರಿಸಿ',
      'ನನ್ನ ಸಕ್ರಿಯ ಪ್ರಕರಣಗಳಲ್ಲಿ ಯಾವ ಸಾಕ್ಷ್ಯವು ಸಂಬಂಧ ಹೊಂದಿದೆ?',
      'ಸಾಕ್ಷಿದಾರರ ಪರೀಕ್ಷಾ ಪಟ್ಟಿ ತಯಾರಿಸಿ',
      'ಮುಂದಿನ 7 ದಿನಗಳ ಅಪರಾಧ ಮುನ್ಸೂಚನೆ ನೀಡಿ',
      'ಯಾವ ಬೀಟ್ ಪ್ರದೇಶಗಳಿಗೆ ಹೆಚ್ಚಿನ ಗಸ್ತು ಬೇಕು?',
    ],
  },

  // ── Police Inspector (PI) — station operations, supervision ──────────────
  INVESTIGATOR: {
    en: [
      "What is the current case load at my station?",
      "Show high-risk investigations requiring attention",
      "Analyse repeat offenders in our jurisdiction",
      "What is the solved rate this quarter?",
      "Compare officer performance across shifts",
      "Draft a crime trend report for this month",
      "Criminal network connections in active cases",
      "Which investigations need additional resources?",
    ],
    kn: [
      'ನನ್ನ ಠಾಣೆಯಲ್ಲಿ ಪ್ರಸ್ತುತ ಪ್ರಕರಣಗಳ ಹೊರೆ ಎಷ್ಟು?',
      'ಗಮನ ಬೇಕಾದ ಉನ್ನತ-ಅಪಾಯದ ತನಿಖೆಗಳನ್ನು ತೋರಿಸಿ',
      'ನಮ್ಮ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಪುನರಾವರ್ತಿತ ಅಪರಾಧಿಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಿ',
      'ಈ ತ್ರೈಮಾಸಿಕದಲ್ಲಿ ಪರಿಹಾರ ದರ ಎಷ್ಟು?',
      'ಶಿಫ್ಟ್‌ಗಳ ನಡುವೆ ಅಧಿಕಾರಿಗಳ ಕಾರ್ಯಕ್ಷಮತೆ ಹೋಲಿಸಿ',
      'ಈ ತಿಂಗಳ ಅಪರಾಧ ಪ್ರವೃತ್ತಿ ವರದಿಯನ್ನು ತಯಾರಿಸಿ',
      'ಸಕ್ರಿಯ ಪ್ರಕರಣಗಳಲ್ಲಿ ಅಪರಾಧಿ ಜಾಲ ಸಂಪರ್ಕಗಳು',
      'ಯಾವ ತನಿಖೆಗಳಿಗೆ ಹೆಚ್ಚುವರಿ ಸಂಪನ್ಮೂಲ ಬೇಕು?',
    ],
  },

  // ── Superintendent of Police (SP) — district oversight ───────────────────
  SUPERVISOR: {
    en: [
      "District crime analysis for this month",
      "Compare station performance across the district",
      "What early warnings are active in my district?",
      "Officer productivity dashboard summary",
      "Resource allocation recommendations",
      "Inter-station coordination on active cases",
      "Risk monitoring alerts for the district",
      "Forecast next month's crime patterns",
    ],
    kn: [
      'ಈ ತಿಂಗಳ ಜಿಲ್ಲಾ ಅಪರಾಧ ವಿಶ್ಲೇಷಣೆ',
      'ಜಿಲ್ಲೆಯಾದ್ಯಂತ ಠಾಣೆಗಳ ಕಾರ್ಯಕ್ಷಮತೆ ಹೋಲಿಸಿ',
      'ನನ್ನ ಜಿಲ್ಲೆಯಲ್ಲಿ ಯಾವ ಮುಂಚಿನ ಎಚ್ಚರಿಕೆಗಳು ಸಕ್ರಿಯವಾಗಿವೆ?',
      'ಅಧಿಕಾರಿಗಳ ಉತ್ಪಾದಕತೆ ಡ್ಯಾಶ್‌ಬೋರ್‌ಡ್ ಸಾರಾಂಶ',
      'ಸಂಪನ್ಮೂಲ ಹಂಚಿಕೆ ಶಿಫಾರಸುಗಳು',
      'ಸಕ್ರಿಯ ಪ್ರಕರಣಗಳಲ್ಲಿ ಅಂತರ-ಠಾಣೆ ಸಮನ್ವಯ',
      'ಜಿಲ್ಲೆಗೆ ಅಪಾಯ ಮೇಲ್ವಿಚಾರಣೆ ಎಚ್ಚರಿಕೆಗಳು',
      'ಮುಂದಿನ ತಿಂಗಳ ಅಪರಾಧ ಮಾದರಿಗಳ ಮುನ್ಸೂಚನೆ',
    ],
  },

  // ── Commissioner of Police (CP) — city-wide command ──────────────────────
  SUPER_ADMIN: {
    en: [
      "City-wide crime intelligence summary",
      "Inter-district comparison for all 31 districts",
      "Strategic resource optimisation recommendations",
      "Predictive policing insights for next 30 days",
      "Executive brief on organised crime networks",
      "Operational readiness across all divisions",
      "Financial intelligence — suspicious transaction report",
      "Policy recommendations based on crime data",
    ],
    kn: [
      'ನಗರ-ವ್ಯಾಪಿ ಅಪರಾಧ ಗುಪ್ತಚರ ಸಾರಾಂಶ',
      'ಎಲ್ಲಾ 31 ಜಿಲ್ಲೆಗಳ ಅಂತರ-ಜಿಲ್ಲಾ ಹೋಲಿಕೆ',
      'ಕಾರ್ಯತಂತ್ರದ ಸಂಪನ್ಮೂಲ ಆಪ್ಟಿಮೈಸೇಶನ್ ಶಿಫಾರಸುಗಳು',
      'ಮುಂದಿನ 30 ದಿನಗಳ ಮುನ್ಸೂಚಕ ಪೊಲೀಸ್ ಒಳನೋಟಗಳು',
      'ಸಂಘಟಿತ ಅಪರಾಧ ಜಾಲಗಳ ಕಾರ್ಯನಿರ್ವಾಹಕ ಬ್ರೀಫ್',
      'ಎಲ್ಲಾ ವಿಭಾಗಗಳಲ್ಲಿ ಕಾರ್ಯಾಚರಣೆಯ ಸನ್ನದ್ಧತೆ',
      'ಹಣಕಾಸು ಗುಪ್ತಚರ — ಅನುಮಾನಾಸ್ಪದ ವಹಿವಾಟು ವರದಿ',
      'ಅಪರಾಧ ದತ್ತಾಂಶದ ಆಧಾರದ ಮೇಲೆ ನೀತಿ ಶಿಫಾರಸುಗಳು',
    ],
  },
};

// ─── Role-aware suggestion generation ────────────────────────────────────────

export function getRandomSuggestions(
  count = 4,
  lang: Language = 'en',
  role?: KSPRole,
): string[] {
  const pool = role && ROLE_SUGGESTIONS[role]
    ? ROLE_SUGGESTIONS[role][lang]
    : SUGGESTED_QUERIES[lang];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ─── Role-aware welcome title ───────────────────────────────────────────────

export const ROLE_WELCOME: Record<KSPRole, Record<Language, { title: string; subtext: string }>> = {
  OFFICER: {
    en: { title: 'Your AI Assistant', subtext: 'Ask about your assigned FIRs, patrol routes, station orders, or daily tasks.' },
    kn: { title: 'ನಿಮ್ಮ AI ಸಹಾಯಕ', subtext: 'ನಿಮ್ಮ ನಿಯೋಜಿತ ಎಫ್ಐಆರ್‌ಗಳು, ಗಸ್ತು ಮಾರ್ಗಗಳು, ಠಾಣೆ ಆದೇಶಗಳು ಅಥವಾ ದೈನಂದಿನ ಕಾರ್ಯಗಳ ಬಗ್ಗೆ ಕೇಳಿ.' },
  },
  ANALYST: {
    en: { title: 'Investigation AI', subtext: 'Analyse crime patterns, draft charge sheets, review evidence, and forecast trends.' },
    kn: { title: 'ತನಿಖಾ AI', subtext: 'ಅಪರಾಧ ಮಾದರಿಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಿ, ಆರೋಪಪಟ್ಟಿ ಸಿದ್ಧಪಡಿಸಿ, ಸಾಕ್ಷ್ಯ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಪ್ರವೃತ್ತಿಗಳನ್ನು ಮುನ್ಸೂಚಿಸಿ.' },
  },
  INVESTIGATOR: {
    en: { title: 'Investigations Command AI', subtext: 'Monitor station caseload, review officer performance, analyse criminal networks.' },
    kn: { title: 'ತನಿಖಾ ಆಜ್ಞೆ AI', subtext: 'ಠಾಣೆ ಪ್ರಕರಣ ಹೊರೆಯನ್ನು ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡಿ, ಅಧಿಕಾರಿಗಳ ಕಾರ್ಯಕ್ಷಮತೆ ಪರಿಶೀಲಿಸಿ, ಅಪರಾಧಿ ಜಾಲಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಿ.' },
  },
  SUPERVISOR: {
    en: { title: 'District Command AI', subtext: 'Analyse district crime trends, station performance, early warnings, and resource planning.' },
    kn: { title: 'ಜಿಲ್ಲಾ ಆಜ್ಞೆ AI', subtext: 'ಜಿಲ್ಲಾ ಅಪರಾಧ ಪ್ರವೃತ್ತಿಗಳು, ಠಾಣೆ ಕಾರ್ಯಕ್ಷಮತೆ, ಮುಂಚಿನ ಎಚ್ಚರಿಕೆಗಳು ಮತ್ತು ಸಂಪನ್ಮೂಲ ಯೋಜನೆಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಿ.' },
  },
  SUPER_ADMIN: {
    en: { title: 'Command Centre AI', subtext: 'City-wide intelligence, strategic analysis, organised crime networks, and policy recommendations.' },
    kn: { title: 'ಆಜ್ಞಾ ಕೇಂದ್ರ AI', subtext: 'ನಗರ-ವ್ಯಾಪಿ ಗುಪ್ತಚರ, ಕಾರ್ಯತಂತ್ರದ ವಿಶ್ಲೇಷಣೆ, ಸಂಘಟಿತ ಅಪರಾಧ ಜಾಲಗಳು ಮತ್ತು ನೀತಿ ಶಿಫಾರಸುಗಳು.' },
  },
};

export const getRandomRoleSuggestions = getRandomSuggestions;

// ─── Response parser (unchanged) ────────────────────────────────────────────

export interface ParsedResponse {
  cleanText: string;
  citedCards: DashboardCard[];
  chartData: { type: string; json: string } | null;
  confidence: number | null;
}

export function parseCopilotResponse(raw: string): ParsedResponse {
  const cardRegex = /\[CARD:([\w-]+)\]/g;
  const chartRegex = /\[CHART:(\w+):(.*?)\]/;
  const confRegex = /\[CONF:(\d+)\]/;

  const cards: DashboardCard[] = [];
  let match: RegExpExecArray | null;
  while ((match = cardRegex.exec(raw)) !== null) {
    if (isValidDashboardCard(match[1])) {
      cards.push(match[1] as DashboardCard);
    }
  }

  const chartMatch = chartRegex.exec(raw);
  const chartData = chartMatch
    ? { type: chartMatch[1], json: chartMatch[2] }
    : null;

  const confMatch = confRegex.exec(raw);
  const confidence = confMatch ? parseInt(confMatch[1], 10) : null;

  const cleanText = raw
    .replace(/\[CARD:[\w-]+\]/g, '')
    .replace(/\[CHART:\w+:.*?\]/g, '')
    .replace(/\[CONF:\d+\]/g, '')
    .trim();

  return { cleanText, citedCards: cards, chartData, confidence };
}

function isValidDashboardCard(s: string): boolean {
  const valid: DashboardCard[] = [
    'todays-firs', 'active-investigations', 'crime-index', 'ai-alerts',
    'active-cases', 'prediction-accuracy', 'intelligence-feed',
    'early-warning', 'incident-map', 'trend-chart',
  ];
  return valid.includes(s as DashboardCard);
}
