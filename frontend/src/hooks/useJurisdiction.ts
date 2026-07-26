/**
 * useJurisdiction — derives jurisdiction scope from the current user's role.
 *
 * Maps the 5-rank KSP model to jurisdiction boundaries:
 *   SUPER_ADMIN → state-wide
 *   SUPERVISOR  → district
 *   INVESTIGATOR → station
 *   ANALYST     → station (analytics focus)
 *   OFFICER     → assigned cases only
 *
 * Uses the canonical JURISDICTION_BY_ROLE mapping from constants/jurisdiction
 * as the single source of truth for demo jurisdiction data.
 *
 * Returns a JurisdictionScope used by:
 * 1. JurisdictionBanner (visual proof for judges)
 * 2. scopeParams passed to every data fetch call site
 * 3. Dashboard KPI card filtering
 */

import { useAuthStore } from '@/store/authStore';
import type { KSPRole } from '@/config/navConfig';
import { JURISDICTION_BY_ROLE } from '@/constants/jurisdiction';

export interface JurisdictionScope {
  role: KSPRole
  district_id: string | null
  station_id: string | null
  jurisdiction_type: 'state' | 'district' | 'station' | 'assigned'
  // Helper booleans
  isStateWide: boolean    // CP — sees everything
  isDistrict: boolean     // SP
  isStation: boolean      // PI, PSI
  isAssigned: boolean     // PC — only assigned cases
  // Jurisdiction label for display
  scopeLabel: string      // e.g. "Bengaluru Urban District"
}

/**
 * Builds full JurisdictionScope from the canonical jurisdiction basics.
 * Adds helper booleans (isStateWide, isDistrict, isStation, isAssigned)
 * derived from the jurisdiction_type for convenience in component logic.
 */
function enrichBasics(
  role: KSPRole,
  basics: { district_id: string | null; station_id: string | null; jurisdiction_type: string; scopeLabel: string },
): JurisdictionScope {
  return {
    role,
    district_id: basics.district_id,
    station_id: basics.station_id,
    jurisdiction_type: basics.jurisdiction_type as JurisdictionScope['jurisdiction_type'],
    isStateWide: basics.jurisdiction_type === 'state',
    isDistrict: basics.jurisdiction_type === 'district',
    isStation: basics.jurisdiction_type === 'station',
    isAssigned: basics.jurisdiction_type === 'assigned',
    scopeLabel: basics.scopeLabel,
  }
}

export function useJurisdiction(): JurisdictionScope {
  const user = useAuthStore((s) => s.user);
  const role = (user?.roles?.[0]?.toUpperCase() ?? 'OFFICER') as KSPRole;

  // If the user object has real jurisdiction data from the backend, use it.
  // Skip in demo mode (localStorage sentinel token) — use canonical constants
  // instead so district_id codes stay consistent with demo data in useFIRData etc.
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const isDemo = token === 'demo-session';

  if (!isDemo && user?.jurisdiction_type && user?.district_id) {
    return {
      role,
      district_id: user.district_id ?? null,
      station_id: user.station_id ?? null,
      jurisdiction_type: user.jurisdiction_type as JurisdictionScope['jurisdiction_type'],
      isStateWide: user.jurisdiction_type === 'state',
      isDistrict: user.jurisdiction_type === 'district',
      isStation: user.jurisdiction_type === 'station',
      isAssigned: user.jurisdiction_type === 'assigned',
      scopeLabel: _buildScopeLabel(role, user),
    };
  }

  // Demo mode: use role-based defaults (try multiple key conventions)
  // This ensures district_ids match the demo data (BENGALURU_URBAN, not BLR-URB).
  return enrichBasics(role, JURISDICTION_BY_ROLE[role] || JURISDICTION_BY_ROLE.OFFICER);
}

function _buildScopeLabel(role: KSPRole, user: any): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Karnataka State — All Districts'
    case 'SUPERVISOR':
      return user?.district_name
        ? `${user.district_name} District`
        : 'Your District'
    case 'INVESTIGATOR':
    case 'ANALYST':
      return user?.station_name
        ? `${user.station_name} Police Station`
        : 'Your Station'
    case 'OFFICER':
      return 'Assigned Cases'
    default:
      return 'Your Jurisdiction'
  }
}
