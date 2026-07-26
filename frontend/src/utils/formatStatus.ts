/** Normalize backend enum strings and map to i18n keys for FIR / warning statuses */

const STATUS_I18N: Record<string, string> = {
  registered: 'fir.statusRegistered',
  under_investigation: 'fir.statusUnderInvestigation',
  investigation: 'fir.statusUnderInvestigation',
  in_progress: 'fir.statusUnderInvestigation',
  'in-progress': 'fir.statusUnderInvestigation',
  chargesheet_filed: 'fir.statusChargesheetFiled',
  charge_sheet_filed: 'fir.statusChargesheetFiled',
  pending_trial: 'fir.statusPendingTrial',
  convicted: 'fir.statusConvicted',
  acquitted: 'fir.statusAcquitted',
  closed: 'fir.statusClosed',
  resolved: 'status.resolved',
  active: 'status.active',
  new: 'fir.statusNew',
  acknowledged: 'fir.statusAcknowledged',
  escalated: 'fir.statusEscalated',
  unreviewed: 'fir.statusUnreviewed',
  reviewed: 'fir.statusReviewed',
  critical: 'status.critical',
  high: 'status.high',
  medium: 'status.medium',
  low: 'status.low',
};

const STATUS_SEMANTIC: Record<string, 'critical' | 'warning' | 'active' | 'resolved' | 'draft'> = {
  registered: 'active',
  under_investigation: 'warning',
  investigation: 'warning',
  in_progress: 'warning',
  'in-progress': 'warning',
  chargesheet_filed: 'warning',
  charge_sheet_filed: 'warning',
  pending_trial: 'active',
  convicted: 'resolved',
  acquitted: 'resolved',
  closed: 'draft',
  resolved: 'resolved',
  active: 'critical',
  new: 'critical',
  acknowledged: 'active',
  escalated: 'warning',
  unreviewed: 'draft',
  reviewed: 'resolved',
  critical: 'critical',
  high: 'warning',
  medium: 'active',
  low: 'draft',
};

export function normalizeStatusKey(status: string): string {
  return status?.trim().toLowerCase().replace(/[\s-]+/g, '_') || '';
}

export function getStatusI18nKey(status: string): string {
  const key = normalizeStatusKey(status);
  return STATUS_I18N[key] ?? 'fir.statusUnknown';
}

/** Human-readable fallback when i18n is unavailable */
export function formatStatusLabel(status: string): string {
  const key = normalizeStatusKey(status);
  if (STATUS_I18N[key]) {
    return key
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getStatusSemantic(status: string): 'critical' | 'warning' | 'active' | 'resolved' | 'draft' {
  return STATUS_SEMANTIC[normalizeStatusKey(status)] ?? 'draft';
}

/** Active warnings = not yet resolved */
export function isActiveWarning(status: string): boolean {
  const key = normalizeStatusKey(status);
  return key !== 'resolved' && key !== 'closed';
}
