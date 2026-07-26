/**
 * Jurisdiction constants — single source of truth for demo role-to-scope mappings.
 *
 * Used by:
 *   useJurisdiction.ts — builds full JurisdictionScope with helper booleans
 *   LoginFlow.tsx — populates auth-store user object with district_id/station_id
 *
 * Both consumers import from here so a station-name or district-code change in
 * one place propagates to all jurisdiction-dependent pages automatically.
 */

export interface JurisdictionBasics {
  district_id: string | null
  station_id: string | null
  jurisdiction_type: 'state' | 'district' | 'station' | 'assigned'
  scopeLabel: string
}

/**
 * Canonical demo jurisdiction mapping per role.
 *
 * ═══ RULE — KEEP THIS IN SYNC WITH THE DB ═══
 * District codes must match `districts.code` in the database.
 * Station names must match `police_stations.name` in the database.
 *
 * Production data would come from the JWT; this is for demo login only.
 */
export const JURISDICTION_BY_ROLE: Record<string, JurisdictionBasics> = {
  // 🏛️ State-level
  SUPER_ADMIN: { district_id: null, station_id: null, jurisdiction_type: 'state', scopeLabel: 'Karnataka State — All Districts' },
  CP:          { district_id: null, station_id: null, jurisdiction_type: 'state', scopeLabel: 'Karnataka State — All Districts' },
  ADMIN:       { district_id: null, station_id: null, jurisdiction_type: 'state', scopeLabel: 'Karnataka State — All Districts' },

  // 🏙️ District-level
  SUPERVISOR: { district_id: 'BENGALURU_URBAN', station_id: null, jurisdiction_type: 'district', scopeLabel: 'Bengaluru Urban District' },
  SP:         { district_id: 'BENGALURU_URBAN', station_id: null, jurisdiction_type: 'district', scopeLabel: 'Bengaluru Urban District' },

  // 🏢 Station-level
  INVESTIGATOR: { district_id: 'BENGALURU_URBAN', station_id: 'Bengaluru Urban Town Police Station', jurisdiction_type: 'station', scopeLabel: 'Bengaluru Urban Town Police Station — Bengaluru Urban' },
  PI:           { district_id: 'BENGALURU_URBAN', station_id: 'Bengaluru Urban Town Police Station', jurisdiction_type: 'station', scopeLabel: 'Bengaluru Urban Town Police Station — Bengaluru Urban' },
  ANALYST:      { district_id: 'BENGALURU_URBAN', station_id: 'Bengaluru Urban Town Police Station', jurisdiction_type: 'station', scopeLabel: 'Bengaluru Urban Town — Bengaluru Urban (Analytics)' },
  PSI:          { district_id: 'BENGALURU_URBAN', station_id: 'Bengaluru Urban Town Police Station', jurisdiction_type: 'station', scopeLabel: 'Bengaluru Urban Town — Bengaluru Urban (Analytics)' },

  // 👮 Assigned/officer-level
  OFFICER: { district_id: 'BENGALURU_URBAN', station_id: 'Bengaluru Urban Town Police Station', jurisdiction_type: 'assigned', scopeLabel: 'Assigned Cases Only' },
  PC:      { district_id: 'BENGALURU_URBAN', station_id: 'Bengaluru Urban Town Police Station', jurisdiction_type: 'assigned', scopeLabel: 'Assigned Cases Only' },
}
