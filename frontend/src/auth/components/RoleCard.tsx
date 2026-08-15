import { clsx } from 'clsx';
import { Check } from 'lucide-react';

interface RoleCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  abbrev: string;       // CP, SP, PI, PSI, PC
  scope: string;
  badge: string;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Mobile-first role selection card.
 *
 * Structure:
 *   [icon] [code] [access badge]          (flex-wrap meta row — never collides)
 *   Role title                            (wraps naturally, never truncated)
 *   Description                           (full text, wraps naturally)
 *   ✓ corner indicator on selection
 *
 * Selection is communicated by 4 simultaneous signals so it never relies on
 * color alone: border, background, a corner check, and a top accent line.
 */
export function RoleCard({ icon: Icon, title, abbrev, scope, badge, selected, onSelect }: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        'relative w-full min-w-0 overflow-hidden text-left rounded-2xl border transition-all duration-150 outline-none',
        'p-4 sm:p-5',
        'focus-visible:ring-2 focus-visible:ring-ksp-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1628]',
        selected
          ? 'border-ksp-amber/80 bg-[rgba(245,158,11,0.08)] shadow-[0_0_0_1px_rgba(245,158,11,0.25),0_10px_28px_rgba(0,0,0,0.35)]'
          : 'border-ksp-navy-light bg-ksp-navy-mid hover:border-ksp-steel hover:bg-[rgba(43,76,126,0.25)] active:bg-[rgba(43,76,126,0.35)]'
      )}
    >
      {/* Top accent line — extra selection signal */}
      {selected && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-ksp-amber to-transparent"
        />
      )}

      {/* Corner check — visible only when selected; pr-8 keeps meta content clear of it */}
      <span
        aria-hidden
        className={clsx(
          'absolute top-3.5 right-3.5 z-10 flex h-5 w-5 items-center justify-center rounded-full transition-all duration-150',
          selected
            ? 'scale-100 bg-ksp-amber text-ksp-navy opacity-100'
            : 'scale-50 bg-transparent text-transparent opacity-0'
        )}
      >
        <Check className="h-3.5 w-3.5" />
      </span>

      {/* Meta row — icon + code + access badge, wraps instead of colliding */}
      <div className="flex items-center gap-2.5 pr-8 sm:gap-2 flex-wrap">
        <span
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-150',
            selected
              ? 'border-ksp-amber/40 bg-ksp-amber/15 text-ksp-amber'
              : 'border-ksp-navy-light bg-[rgba(43,76,126,0.25)] text-ksp-muted'
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span
          className={clsx(
            'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide transition-colors duration-150 sm:text-xs',
            selected
              ? 'bg-ksp-amber/20 text-ksp-amber border border-ksp-amber/40'
              : 'bg-ksp-navy-mid text-ksp-muted border border-ksp-navy-light'
          )}
        >
          {abbrev}
        </span>
        <span
          className={clsx(
            'max-w-full rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-150 sm:text-xs',
            'whitespace-normal text-balance',
            selected
              ? 'bg-ksp-amber/20 text-ksp-amber border border-ksp-amber/40'
              : 'bg-ksp-navy-mid text-ksp-muted border border-ksp-navy-light'
          )}
        >
          {badge}
        </span>
      </div>

      {/* Role title — full text, wraps naturally */}
      <h3 className="mt-3 text-[17px] font-semibold leading-snug text-ksp-white sm:text-lg">{title}</h3>

      {/* Description — full text, comfortable line length */}
      <p className="mt-1.5 text-sm leading-relaxed text-ksp-muted">{scope}</p>
    </button>
  );
}
