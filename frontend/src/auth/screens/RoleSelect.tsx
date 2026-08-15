import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { ROLE_CONFIGS } from '../constants/roleConfig';
import { RoleCard } from '../components/RoleCard';
import { COPY } from '../constants/copy';
import type { KSPRole } from '@/config/navConfig';
import { useTranslation } from 'react-i18next';

interface RoleSelectProps {
  selectedRole: string | null;
  onSelect: (role: KSPRole) => void;
  onNext: () => void;
}

/**
 * Role selection — mobile-first.
 *
 * Layout strategy:
 *   base (narrow)  → one card per row, full width vertical stack
 *   ≥ sm (640px)   → 2-column grid (container is capped at 520px, so columns
 *                    stay at a comfortable ~236px instead of stretching)
 *   last card      → spans both columns, centered at one-column width
 *                    (scoped to sm+ only — never affects mobile)
 *
 * The Continue action stays in-flow on purpose: with 5 compact cards it sits
 * near the fold on phones, and a sticky footer risks covering the last card
 * on short viewports. Safe-area insets are handled globally via
 * `viewport-fit=cover` + `env()` padding on #root.
 */
export function RoleSelect({ selectedRole, onSelect, onNext }: RoleSelectProps) {
  const { i18n } = useTranslation();
  const isKn = i18n.language?.startsWith('kn');
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-[520px] px-0 sm:px-4"
    >
      <h2 className="text-balance text-center text-[clamp(1.5rem,1.25rem+1.5vw,2rem)] font-bold leading-tight text-ksp-white">
        {COPY.roleSelect.header}
      </h2>
      <p className="text-balance mt-2 text-center text-[15px] leading-relaxed text-ksp-muted">
        {COPY.roleSelect.subtext}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-7 sm:grid-cols-2 sm:gap-4">
        {ROLE_CONFIGS.map((role, index) => {
          const isLast = index === ROLE_CONFIGS.length - 1;
          return (
            <div
              key={role.value}
              className={clsx(
                'w-full',
                // Last card on sm+: span the full row but hold a single-column
                // width, centered. Scoped to sm+ so mobile stays full width.
                isLast && 'sm:col-span-2 sm:max-w-[calc(50%-0.5rem)] sm:justify-self-center'
              )}
            >
              <RoleCard
                icon={role.icon}
                title={isKn ? role.titleKn : role.title}
                abbrev={role.abbrev}
                scope={role.scope}
                badge={role.badge}
                selected={selectedRole === role.value}
                onSelect={() => onSelect(role.value)}
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!selectedRole}
        onClick={onNext}
        className={clsx(
          'mt-6 h-[52px] w-full rounded-xl text-[15px] font-semibold transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ksp-amber/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1628]',
          selectedRole
            ? 'cursor-pointer bg-ksp-amber text-ksp-navy shadow-[0_4px_24px_rgba(245,158,11,0.25)] hover:brightness-110 active:scale-[0.99]'
            : 'cursor-not-allowed border border-ksp-navy-light bg-ksp-navy-mid text-ksp-muted/80'
        )}
      >
        {COPY.roleSelect.continueBtn}
      </button>

      {!selectedRole && (
        <p className="mt-3 text-center text-xs text-ksp-muted/70">{COPY.roleSelect.selectRoleHint}</p>
      )}
    </motion.div>
  );
}
