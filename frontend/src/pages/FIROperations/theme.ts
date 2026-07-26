import type { FIRStatus, Severity } from '@/types/fir.types';

// ── Core palette (from FIR Operations design system) ─────────
export const C = {
  navy: '#0A1628',
  navyMid: '#0F2040',
  navyLight: '#1A3358',
  steel: '#2B4C7E',
  amber: '#F59E0B',
  amberDim: 'rgba(245, 158, 11, 0.12)',
  white: '#F8FAFC',
  muted: '#94A3B8',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  blue: '#3B82F6',
  glass: 'rgba(15, 32, 64, 0.92)',
} as const;

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: C.danger,
  high: C.warning,
  medium: C.blue,
  low: C.muted,
};

export const SEVERITY_BG: Record<Severity, string> = {
  critical: 'rgba(239, 68, 68, 0.15)',
  high: 'rgba(245, 158, 11, 0.15)',
  medium: 'rgba(59, 130, 246, 0.15)',
  low: 'rgba(148, 163, 184, 0.15)',
};

export const STATUS_COLOR: Record<FIRStatus, string> = {
  open: C.danger,
  under_investigation: C.warning,
  pending_trial: C.blue,
  closed: C.success,
  resolved: C.success,
};

export const STATUS_BG: Record<FIRStatus, string> = {
  open: 'rgba(239, 68, 68, 0.15)',
  under_investigation: 'rgba(245, 158, 11, 0.15)',
  pending_trial: 'rgba(59, 130, 246, 0.15)',
  closed: 'rgba(16, 185, 129, 0.15)',
  resolved: 'rgba(16, 185, 129, 0.15)',
};

export const STATUS_LABEL: Record<FIRStatus, string> = {
  open: 'Open',
  under_investigation: 'Under Investigation',
  pending_trial: 'Pending Trial',
  closed: 'Closed',
  resolved: 'Resolved',
};

/** Days-open colour coding by urgency. */
export function daysOpenColor(days: number): string {
  if (days > 90) return C.danger;
  if (days >= 30) return C.warning;
  return C.muted;
}

/** Risk score fill colour by band. */
export function riskColor(score: number): string {
  if (score > 70) return C.danger;
  if (score > 40) return C.warning;
  return C.success;
}
