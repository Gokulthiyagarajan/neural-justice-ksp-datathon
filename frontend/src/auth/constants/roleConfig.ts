/**
 * KSP rank configurations for the login role selection screen.
 *
 * 5 ranks of Karnataka State Police:
 *   CP  → Commissioner of Police    → SUPER_ADMIN
 *   SP  → Superintendent of Police  → SUPERVISOR
 *   PI  → Police Inspector          → INVESTIGATOR
 *   PSI → Police Sub-Inspector      → ANALYST
 *   PC  → Police Constable          → OFFICER
 */

import { Crown, Shield, Eye, BarChart2, UserCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { KSPRole } from '@/config/navConfig';

export interface RoleConfig {
  value: KSPRole;
  abbrev: string;         // CP, SP, PI, PSI, PC
  icon: LucideIcon;
  title: string;          // Full KSP rank title
  titleKn: string;        // Kannada translation
  scope: string;
  badge: string;
}

export const ROLE_CONFIGS: RoleConfig[] = [
  {
    value: 'SUPER_ADMIN',
    abbrev: 'CP',
    icon: Crown,
    title: 'Commissioner of Police',
    titleKn: 'ಪೊಲೀಸ್ ಆಯುಕ್ತರು',
    scope: 'State-wide access · All 31 districts · All 906 stations · Full intelligence',
    badge: 'State Command',
  },
  {
    value: 'SUPERVISOR',
    abbrev: 'SP',
    icon: Shield,
    title: 'Superintendent of Police',
    titleKn: 'ಪೊಲೀಸ್ ಅಧೀಕ್ಷಕರು',
    scope: 'District-level access · Patrols · Reports · Financial intelligence',
    badge: 'District Command',
  },
  {
    value: 'INVESTIGATOR',
    abbrev: 'PI',
    icon: Eye,
    title: 'Police Inspector',
    titleKn: 'ಪೊಲೀಸ್ ನಿರೀಕ್ಷಕರು',
    scope: 'Station-level FIRs · AI Copilot · Risk intel · Network analysis',
    badge: 'Station Access',
  },
  {
    value: 'ANALYST',
    abbrev: 'PSI',
    icon: BarChart2,
    title: 'Police Sub-Inspector',
    titleKn: 'ಪೊಲೀಸ್ ಉಪ-ನಿರೀಕ್ಷಕರು',
    scope: 'Analytics · Crime patterns · Forecasts · Station-level data',
    badge: 'Analytics Access',
  },
  {
    value: 'OFFICER',
    abbrev: 'PC',
    icon: UserCheck,
    title: 'Police Constable',
    titleKn: 'ಪೊಲೀಸ್ ಕಾನ್\u200Cಸ್ಟೇಬಲ್',
    scope: 'Assigned cases only · Dashboard · FIR operations',
    badge: 'Field Access',
  },
];
