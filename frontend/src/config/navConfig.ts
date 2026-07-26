/**
 * Role-based navigation configuration for Neural Justice.
 *
 * 5-rank KSP access model — single source of truth for sidebar nav,
 * route guards, and dashboard KPI visibility.
 *
 * RANK          INTERNAL ROLE    JURISDICTION      DATA SCOPE
 * ─────────────────────────────────────────────────────────────
 * CP            SUPER_ADMIN      State-wide        ALL districts, ALL stations, ALL FIRs
 * SP            SUPERVISOR       District          Their district only
 * PI            INVESTIGATOR     Station           Their station only
 * PSI           ANALYST          Station           Their station only (analytics focus)
 * PC            OFFICER          Assigned cases    Only FIRs assigned to them
 *
 * IMPORTANT: Every feature must appear EXACTLY ONCE in NAV_ITEMS.
 * Role-specific scoping is handled by the page component internally.
 * No duplicate pages, no duplicate routes, no duplicate labels.
 */

import {
  LayoutDashboard, Scale, BarChart3, ShieldAlert,
  TrendingUp, AlertTriangle, Building2, MapPin, Settings,
  Network, Users,
  ClipboardList, History, Bell,
  IndianRupee, Globe, Siren, Clock,
  BrainCircuit, Handshake, Newspaper, ListChecks, BookOpen,
  type LucideIcon,
} from 'lucide-react';

// ─── Role type & hierarchy ───────────────────────────────────────────────────

export type KSPRole = 'SUPER_ADMIN' | 'SUPERVISOR' | 'INVESTIGATOR' | 'ANALYST' | 'OFFICER'

/** Higher number = more access. */
export const ROLE_LEVEL: Record<KSPRole, number> = {
  SUPER_ADMIN: 5,
  SUPERVISOR: 4,
  INVESTIGATOR: 3,
  ANALYST: 2,
  OFFICER: 1,
}

// ─── Nav item definition ─────────────────────────────────────────────────────

export interface NavItem {
  label: string
  labelKn: string
  path: string
  icon: LucideIcon
  minRole: KSPRole
  /** Optional translation key group for sidebar section headers. */
  group: string
  badge?: 'alerts' | 'notifications'
  /** When true, hides this item from SUPER_ADMIN (CP role) since CP has its own /cp/* equivalent. */
  hideForCP?: boolean
}

// ─── Full navigation catalog (31 items, NO duplicates) ──────────────────────
// Each feature appears exactly once. Role-aware pages handle internal scoping.
// Redirects from legacy role-specific routes are in App.tsx.

export const NAV_ITEMS: NavItem[] = [
  // ═══════════════════════════════════════════════════════════════════════
  //  DASHBOARD & OPERATIONS  (OFFICER+)
  // ═══════════════════════════════════════════════════════════════════════
  {
    label: 'Dashboard',
    labelKn: 'ಡ್ಯಾಶ್‌ಬೋರ್‌ಡ್',
    path: '/',
    icon: LayoutDashboard,
    minRole: 'OFFICER',
    group: 'sidebar.ops',
  },
  {
    label: 'FIR Operations',
    labelKn: 'ಎಫ್‌ಐಆರ್ ಕಾರ್ಯಾಚರಣೆ',
    path: '/firs',
    icon: Scale,
    minRole: 'OFFICER',
    group: 'sidebar.ops',
    badge: 'notifications',
  },
  {
    label: 'Cases',
    labelKn: 'ಪ್ರಕರಣಗಳು',
    path: '/cases',
    icon: ClipboardList,
    minRole: 'OFFICER',
    group: 'sidebar.ops',
    hideForCP: true,
  },
  {
    label: 'My Station',
    labelKn: 'ನನ್ನ ಠಾಣೆ',
    path: '/stations',
    icon: Building2,
    minRole: 'OFFICER',
    group: 'sidebar.ops',
  },
  {
    label: 'Orders',
    labelKn: 'ಆದೇಶಗಳು',
    path: '/orders',
    icon: Clock,
    minRole: 'OFFICER',
    group: 'sidebar.ops',
    hideForCP: true,
  },
  {
    label: 'Activity Log',
    labelKn: 'ಚಟುವಟಿಕೆ ದಾಖಲೆ',
    path: '/activity',
    icon: History,
    minRole: 'OFFICER',
    group: 'sidebar.ops',
    hideForCP: true,
  },
  {
    label: 'Notifications',
    labelKn: 'ಅಧಿಸೂಚನೆಗಳು',
    path: '/notifications',
    icon: Bell,
    minRole: 'OFFICER',
    group: 'sidebar.ops',
    badge: 'notifications',
    hideForCP: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  INTELLIGENCE & ANALYSIS  (ANALYST+)
  // ═══════════════════════════════════════════════════════════════════════
  {
    label: 'Analytics',
    labelKn: 'ವಿಶ್ಲೇಷಣೆ',
    path: '/analytics',
    icon: BarChart3,
    minRole: 'ANALYST',
    group: 'sidebar.int',
    hideForCP: true,
  },
  {
    label: 'Crime Patterns',
    labelKn: 'ಅಪರಾಧ ಮಾದರಿಗಳು',
    path: '/patterns',
    icon: TrendingUp,
    minRole: 'ANALYST',
    group: 'sidebar.int',
    hideForCP: true,
  },
  {
    label: 'Risk Intelligence',
    labelKn: 'ಅಪಾಯ ಗುಪ್ತಚರ',
    path: '/risk',
    icon: ShieldAlert,
    minRole: 'ANALYST',
    group: 'sidebar.int',
    hideForCP: true,
  },
  {
    label: 'Criminal Network',
    labelKn: 'ಅಪರಾಧಿ ಜಾಲ',
    path: '/network',
    icon: Network,
    minRole: 'ANALYST',
    group: 'sidebar.int',
    hideForCP: true,
  },
  {
    label: 'Financial Intel',
    labelKn: 'ಹಣಕಾಸು ಗುಪ್ತಚರ',
    path: '/finance',
    icon: IndianRupee,
    minRole: 'ANALYST',
    group: 'sidebar.int',
    hideForCP: true,
  },
  {
    label: 'Forecast',
    labelKn: 'ಮುನ್ಸೂಚನೆ',
    path: '/forecast',
    icon: TrendingUp,
    minRole: 'ANALYST',
    group: 'sidebar.int',
    hideForCP: true,
  },
  {
    label: 'Early Warnings',
    labelKn: 'ಮುಂಚಿನ ಎಚ್ಚರಿಕೆಗಳು',
    path: '/warnings',
    icon: AlertTriangle,
    minRole: 'ANALYST',
    group: 'sidebar.int',
    badge: 'alerts',
    hideForCP: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  GIS & MAPS  (ANALYST+)
  // ═══════════════════════════════════════════════════════════════════════
  {
    label: 'Geo Map',
    labelKn: 'ಭೌಗೋಳಿಕ ನಕ್ಷೆ',
    path: '/geo',
    icon: Globe,
    minRole: 'ANALYST',
    group: 'sidebar.geo',
    hideForCP: true,
  },
  {
    label: 'Patrol',
    labelKn: 'ಗಸ್ತು',
    path: '/patrol',
    icon: Siren,
    minRole: 'SUPERVISOR',
    group: 'sidebar.geo',
    hideForCP: true,
  },
  {
    label: 'Districts',
    labelKn: 'ಜಿಲ್ಲೆಗಳು',
    path: '/districts',
    icon: MapPin,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.geo',
    hideForCP: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  PERSONNEL  (INVESTIGATOR+)
  // ═══════════════════════════════════════════════════════════════════════
  //  PERSONNEL  (INVESTIGATOR+)
  // ═══════════════════════════════════════════════════════════════════════
  {
    label: 'Criminal Profiles',
    labelKn: 'ಅಪರಾಧಿ ಪ್ರೊಫೈಲ್‌ಗಳು',
    path: '/profiles',
    icon: Users,
    minRole: 'INVESTIGATOR',
    group: 'sidebar.sys',
  },
  {
    label: 'Officers',
    labelKn: 'ಅಧಿಕಾರಿಗಳು',
    path: '/officers',
    icon: Users,
    minRole: 'SUPERVISOR',
    group: 'sidebar.sys',
    hideForCP: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  AUDIT & SETTINGS  (SUPER_ADMIN+)
  // ═══════════════════════════════════════════════════════════════════════
  {
    label: 'Audit Logs',
    labelKn: 'ಆಡಿಟ್ ಲಾಗ್‌ಗಳು',
    path: '/audit',
    icon: ListChecks,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.sys',
    hideForCP: true,
  },
  {
    label: 'Settings',
    labelKn: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    path: '/settings',
    icon: Settings,
    minRole: 'OFFICER',
    group: 'sidebar.sys',
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  CP COMMAND CENTER  (SUPER_ADMIN only — unique features)
  //  NOTE: The "Dashboard" entry at / already routes CP users to CPDashboard
  //  via DashboardRouter. This section only contains truly unique CP features.
  // ═══════════════════════════════════════════════════════════════════════
  {
    label: 'Operations Timeline',
    labelKn: 'ಕಾರ್ಯಾಚರಣೆ ಟೈಮ್‌ಲೈನ್',
    path: '/cp/timeline',
    icon: Clock,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'City GIS',
    labelKn: 'ನಗರ ಜಿಐಎಸ್',
    path: '/cp/gis-map',
    icon: Globe,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Districts',
    labelKn: 'ಜಿಲ್ಲೆಗಳು',
    path: '/cp/districts',
    icon: Building2,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Stations',
    labelKn: 'ಠಾಣೆಗಳು',
    path: '/cp/stations',
    icon: MapPin,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Cases',
    labelKn: 'ಪ್ರಕರಣಗಳು',
    path: '/cp/cases',
    icon: ClipboardList,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Orders',
    labelKn: 'ಆದೇಶಗಳು',
    path: '/cp/orders',
    icon: ListChecks,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Activity',
    labelKn: 'ಚಟುವಟಿಕೆ',
    path: '/cp/activity',
    icon: History,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Notifications',
    labelKn: 'ಅಧಿಸೂಚನೆಗಳು',
    path: '/cp/notifications',
    icon: Bell,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Intelligence',
    labelKn: 'ಗುಪ್ತಚರ',
    path: '/cp/intelligence',
    icon: BookOpen,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Coordination',
    labelKn: 'ಸಮನ್ವಯ',
    path: '/cp/coordination',
    icon: Handshake,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'AI Situation Room',
    labelKn: 'ಎಐ ಪರಿಸ್ಥಿತಿ ಕೊಠಡಿ',
    path: '/cp/ai-situation',
    icon: BrainCircuit,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Media & Public Advisory',
    labelKn: 'ಮಾಧ್ಯಮ ಮತ್ತು ಸಾರ್ವಜನಿಕ ಸಲಹೆ',
    path: '/cp/media',
    icon: Newspaper,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Patrol',
    labelKn: 'ಗಸ್ತು',
    path: '/cp/patrol',
    icon: Siren,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Analytics',
    labelKn: 'ವಿಶ್ಲೇಷಣೆ',
    path: '/cp/analytics',
    icon: BarChart3,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Crime Patterns',
    labelKn: 'ಅಪರಾಧ ಮಾದರಿಗಳು',
    path: '/cp/patterns',
    icon: TrendingUp,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Risk Intelligence',
    labelKn: 'ಅಪಾಯ ಗುಪ್ತಚರ',
    path: '/cp/risk',
    icon: ShieldAlert,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Criminal Network',
    labelKn: 'ಅಪರಾಧಿ ಜಾಲ',
    path: '/cp/networks',
    icon: Network,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Forecast',
    labelKn: 'ಮುನ್ಸೂಚನೆ',
    path: '/cp/forecast',
    icon: TrendingUp,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Early Warnings',
    labelKn: 'ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು',
    path: '/cp/warnings',
    icon: AlertTriangle,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Financial Intel',
    labelKn: 'ಹಣಕಾಸು ಗುಪ್ತಚರ',
    path: '/cp/finance',
    icon: IndianRupee,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Officers',
    labelKn: 'ಅಧಿಕಾರಿಗಳು',
    path: '/cp/officers',
    icon: Users,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Reports',
    labelKn: 'ವರದಿಗಳು',
    path: '/cp/reports',
    icon: BarChart3,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
  {
    label: 'Audit Logs',
    labelKn: 'ಆಡಿಟ್ ಲಾಗ್‌ಗಳು',
    path: '/cp/audit',
    icon: ListChecks,
    minRole: 'SUPER_ADMIN',
    group: 'sidebar.cmd',
  },
]

// ─── Access helpers ──────────────────────────────────────────────────────────

/** Returns true if userRole meets or exceeds minRole. */
export function canAccess(userRole: KSPRole, minRole: KSPRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole]
}

/** Filter NAV_ITEMS to only those accessible to the given role. */
export function getNavForRole(userRole: KSPRole): NavItem[] {
  return NAV_ITEMS.filter(item => {
    if (userRole === 'SUPER_ADMIN' && item.hideForCP) return false;
    return canAccess(userRole, item.minRole);
  });
}

/**
 * Check if a route path is accessible to the user's roles.
 * Used by RoleRoute to gate page access on direct URL navigation.
 */
export function canAccessRoute(path: string, userRoles: string[]): boolean {
  const normalizedPath = path === '' ? '/' : path
  const item = NAV_ITEMS.find(i => {
    if (i.path === '/') return normalizedPath === '/'
    return normalizedPath.startsWith(i.path)
  })
  if (!item) return true // unknown route — let ProtectedRoute handle auth
  const userRole = (userRoles[0] ?? 'OFFICER') as KSPRole
  return canAccess(userRole, item.minRole)
}

// ─── Role display config ─────────────────────────────────────────────────────

export const RANK_CONFIG: Record<KSPRole, {
  label: string
  labelKn: string
  color: string
  textColor: string
  borderColor: string
  bgColor: string
  icon: string
}> = {
  SUPER_ADMIN:  {
    label: 'Commissioner of Police',
    labelKn: 'ಪೊಲೀಸ್ ಆಯುಕ್ತರು',
    color: 'text-amber-400',
    textColor: '#fbbf24',
    borderColor: 'rgba(251,191,36,0.3)',
    bgColor: 'rgba(251,191,36,0.12)',
    icon: '\u{1F451}',
  },
  SUPERVISOR:   {
    label: 'Superintendent of Police',
    labelKn: 'ಪೊಲೀಸ್ ಅಧೀಕ್ಷಕರು',
    color: 'text-blue-400',
    textColor: '#60a5fa',
    borderColor: 'rgba(96,165,250,0.3)',
    bgColor: 'rgba(96,165,250,0.12)',
    icon: '\u{1F6E1}\uFE0F',
  },
  INVESTIGATOR: {
    label: 'Police Inspector',
    labelKn: 'ಪೊಲೀಸ್ ನಿರೀಕ್ಷಕರು',
    color: 'text-cyan-400',
    textColor: '#22d3ee',
    borderColor: 'rgba(34,211,238,0.3)',
    bgColor: 'rgba(34,211,238,0.12)',
    icon: '\u{1F535}',
  },
  ANALYST:      {
    label: 'Police Sub-Inspector',
    labelKn: 'ಪೊಲೀಸ್ ಉಪ-ನಿರೀಕ್ಷಕರು',
    color: 'text-purple-400',
    textColor: '#a855f7',
    borderColor: 'rgba(168,85,247,0.3)',
    bgColor: 'rgba(168,85,247,0.12)',
    icon: '\u{1F537}',
  },
  OFFICER:      {
    label: 'Police Constable',
    labelKn: 'ಪೊಲೀಸ್ ಕಾನ್‌ಸ್ಟೇಬಲ್',
    color: 'text-slate-400',
    textColor: '#94a3b8',
    borderColor: 'rgba(148,163,184,0.3)',
    bgColor: 'rgba(148,163,184,0.12)',
    icon: '\u26A1',
  },
}

// ─── Dashboard KPI cards per rank ────────────────────────────────────────────

export interface KPICard {
  id: string
  label: string
  labelKn: string
  metricKey: string
  icon: LucideIcon
  color: string
  minRole: KSPRole
  description: string
}

export const KPI_CARDS: KPICard[] = [
  // All roles (OFFICER+)
  {
    id: 'total_firs',
    label: 'Total FIRs',
    labelKn: 'ಒಟ್ಟು ಎಫ್‌ಐಆರ್‌ಗಳು',
    metricKey: 'todays_firs',
    icon: Scale,
    color: 'service-blue',
    minRole: 'OFFICER',
    description: 'FIRs in your jurisdiction',
  },
  {
    id: 'open_cases',
    label: 'Open Cases',
    labelKn: 'ತೆರೆದ ಪ್ರಕರಣಗಳು',
    metricKey: 'active_investigations',
    icon: ShieldAlert,
    color: 'signal-amber',
    minRole: 'OFFICER',
    description: 'Cases pending resolution',
  },

  // ANALYST and above (PSI+)
  {
    id: 'solved_rate',
    label: 'Solved Rate',
    labelKn: 'ಪರಿಹಾರ ದರ',
    metricKey: 'prediction_accuracy',
    icon: TrendingUp,
    color: 'verified-green',
    minRole: 'ANALYST',
    description: 'Prediction accuracy %',
  },
  {
    id: 'crime_hotspots',
    label: 'Active Hotspots',
    labelKn: 'ಸಕ್ರಿಯ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು',
    metricKey: 'crime_index',
    icon: MapPin,
    color: 'alert-red',
    minRole: 'ANALYST',
    description: 'Crime index score',
  },

  // INVESTIGATOR and above (PI+)
  {
    id: 'high_risk_accused',
    label: 'High Risk Accused',
    labelKn: 'ಅಧಿಕ ಅಪಾಯದ ಆರೋಪಿಗಳು',
    metricKey: 'active_cases',
    icon: ShieldAlert,
    color: 'alert-red',
    minRole: 'INVESTIGATOR',
    description: 'Active high-risk cases',
  },
  {
    id: 'early_warnings',
    label: 'Active Warnings',
    labelKn: 'ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳು',
    metricKey: 'ai_alerts',
    icon: AlertTriangle,
    color: 'signal-amber',
    minRole: 'INVESTIGATOR',
    description: 'Unacknowledged early warnings',
  },

  // SUPERVISOR and above (SP+)
  {
    id: 'district_fir_trend',
    label: 'District FIR Trend',
    labelKn: 'ಜಿಲ್ಲಾ ಎಫ್‌ಐಆರ್ ಪ್ರವೃತ್ತಿ',
    metricKey: 'todays_firs',
    icon: TrendingUp,
    color: 'service-blue',
    minRole: 'SUPERVISOR',
    description: 'District-level trend',
  },

  // SUPER_ADMIN only (CP)
  {
    id: 'state_overview',
    label: 'State FIR Total',
    labelKn: 'ರಾಜ್ಯ ಎಫ್‌ಐಆರ್ ಒಟ್ಟು',
    metricKey: 'todays_firs',
    icon: ShieldAlert,
    color: 'service-blue',
    minRole: 'SUPER_ADMIN',
    description: 'All 31 Karnataka districts',
  },
]
