/**
 * RankBadge — displays the KSP rank with emoji icon, color, and Kannada label.
 * Used in the Sidebar (top) and ProfileDropdown.
 */

import { useTranslation } from 'react-i18next';
import { RANK_CONFIG, type KSPRole } from '@/config/navConfig';

interface RankBadgeProps {
  role: KSPRole
  userName?: string
  /** Show in sidebar compact mode (icon-only) or full. */
  expanded?: boolean
  className?: string
}

export function RankBadge({ role, userName, expanded = true, className = '' }: RankBadgeProps) {
  const { i18n } = useTranslation();
  const config = RANK_CONFIG[role] || RANK_CONFIG.OFFICER;
  const isKannada = i18n.language?.startsWith('kn');

  if (!expanded) {
    return (
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${className}`}
        style={{
          background: config.bgColor,
          border: `1px solid ${config.borderColor}`,
        }}
        title={isKannada ? config.labelKn : config.label}
      >
        {config.icon}
      </div>
    );
  }

  return (
    <div className={`px-3 py-3 mb-2 border-b border-border-secondary ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{config.icon}</span>
        <div className="min-w-0">
          <p className={`text-xs font-semibold truncate ${config.color}`}>
            {isKannada ? config.labelKn : config.label}
          </p>
          {userName && (
            <p className="text-xs text-text-tertiary truncate">{userName}</p>
          )}
        </div>
      </div>
    </div>
  );
}
