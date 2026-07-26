import { forwardRef } from 'react';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/design-system/utils/cn';

export interface UtilityIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  label: string;
  active?: boolean;
  badge?: number | string;
  children?: ReactNode;
}

/** Format badge count: 0→hidden, 1-9→digit, 10-99→9+, 100-999→99+, 1000+→999+ */
function formatBadge(badge: number | string | undefined): string | null {
  if (badge == null) return null;
  const n = typeof badge === 'string' ? parseInt(badge, 10) : badge;
  if (isNaN(n) || n <= 0) return null;
  if (n > 999) return '999+';
  if (n > 99) return '99+';
  if (n > 9) return '9+';
  return String(n);
}

/** Shared top-bar icon control — 36×36, Lucide 20px, stroke 1.75 */
export const UtilityIconButton = forwardRef<HTMLButtonElement, UtilityIconButtonProps>(function UtilityIconButton({
  icon: Icon,
  label,
  active,
  badge,
  children,
  className,
  disabled,
  ...props
}, ref) {
  const badgeText = formatBadge(badge);

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      disabled={disabled}
      className={cn(
        'relative inline-flex items-center justify-center gap-1.5 h-9 min-w-9 px-2 rounded-md',
        'text-text-secondary hover:text-text-primary hover:bg-hover-bg',
        'transition-colors duration-fast motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-service-blue/40',
        active && 'text-text-primary bg-service-blue/10',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-text-secondary',
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} aria-hidden />}
      {children}
      {badgeText && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-alert-red text-[10px] font-mono font-semibold text-white px-1 animate-badge-pop motion-reduce:animate-none"
          aria-live="polite"
          aria-label={`${typeof badge === 'number' ? badge : parseInt(String(badge), 10)} unread notifications`}
        >
          {badgeText}
        </span>
      )}
    </button>
  );
});
