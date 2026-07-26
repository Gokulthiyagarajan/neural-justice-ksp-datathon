import { useTranslation } from 'react-i18next';
import { getStatusSemantic, normalizeStatusKey } from '@/utils/formatStatus';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  /** @deprecated Use size="sm" instead */
  compact?: boolean;
}

const SEMANTIC_CLASS: Record<string, string> = {
  critical: 'badge-critical',
  warning: 'badge-warning',
  active: 'badge-active',
  resolved: 'badge-resolved',
  draft: 'badge-draft',
};

const DOT_CLASS: Record<string, string> = {
  critical: 'bg-alert-red',
  warning: 'bg-signal-amber',
  active: 'bg-service-blue',
  resolved: 'bg-verified-green',
  draft: 'bg-text-tertiary',
};

export function StatusBadge({ status, size = 'md', compact }: StatusBadgeProps) {
  // Support legacy `compact` prop — maps to size="sm"
  if (compact) size = 'sm';
  const { t } = useTranslation();
  const normalized = normalizeStatusKey(status);
  const semantic = getStatusSemantic(status);
  const i18nKey = `fir.status.${normalized}`;
  const label = t(i18nKey, {
    defaultValue: t(`status.${normalized}`, {
      defaultValue: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    }),
  });
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full uppercase tracking-wide ${SEMANTIC_CLASS[semantic]} ${sizeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_CLASS[semantic]}`} aria-hidden />
      {label}
    </span>
  );
}
