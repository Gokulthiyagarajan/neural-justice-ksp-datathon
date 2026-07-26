/**
 * JurisdictionBanner — displays the user's jurisdiction scope at the top of pages.
 *
 * Shows a subtle banner indicating what data the user can see:
 * - State: "Karnataka State — All Districts"
 * - District: "Bengaluru Urban District"
 * - Station: "Koramangala PS — Bengaluru Urban"
 * - Assigned: "Assigned Cases Only"
 */

import { Globe, Building2, MapPin, ShieldCheck } from 'lucide-react';
import type { JurisdictionScope } from '@/hooks/useJurisdiction';

interface JurisdictionBannerProps {
  scope: JurisdictionScope;
  className?: string;
}

const ICON_MAP: Record<string, typeof Globe> = {
  state: Globe,
  district: Building2,
  station: MapPin,
  assigned: MapPin,
};

const BG_MAP: Record<string, string> = {
  state: 'rgba(34,197,94,0.06)',
  district: 'rgba(59,130,246,0.06)',
  station: 'rgba(245,158,11,0.06)',
  assigned: 'rgba(148,163,184,0.06)',
};

const BORDER_MAP: Record<string, string> = {
  state: 'rgba(34,197,94,0.2)',
  district: 'rgba(59,130,246,0.2)',
  station: 'rgba(245,158,11,0.2)',
  assigned: 'rgba(148,163,184,0.2)',
};

const TEXT_MAP: Record<string, string> = {
  state: 'text-verified-green',
  district: 'text-service-blue',
  station: 'text-signal-amber',
  assigned: 'text-text-tertiary',
};

export function JurisdictionBanner({ scope, className = '' }: JurisdictionBannerProps) {
  const jType = scope.jurisdiction_type;
  const Icon = ICON_MAP[jType] || Globe;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium border ${className}`}
      style={{
        background: BG_MAP[jType] || BG_MAP.state,
        borderColor: BORDER_MAP[jType] || BORDER_MAP.state,
      }}
    >
      <Icon className={`w-3 h-3 ${TEXT_MAP[jType] || TEXT_MAP.state}`} strokeWidth={2} />
      <span className="text-text-secondary">
        Viewing:
      </span>
      <span className={`font-semibold ${TEXT_MAP[jType] || TEXT_MAP.state}`}>
        {scope.scopeLabel}
      </span>
      {scope.isAssigned && (
        <span className="ml-auto opacity-60 text-text-tertiary">Assigned cases only</span>
      )}
      {!scope.isAssigned && !scope.isStateWide && (
        <ShieldCheck className="w-3 h-3 text-text-tertiary ml-auto" strokeWidth={1.75} />
      )}
    </div>
  );
}
