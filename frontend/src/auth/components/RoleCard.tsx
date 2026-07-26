import { clsx } from 'clsx';

interface RoleCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  abbrev: string;       // CP, SP, PI, PSI, PC
  scope: string;
  badge: string;
  selected: boolean;
  onSelect: () => void;
}

export function RoleCard({ icon: Icon, title, abbrev, scope, badge, selected, onSelect }: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        'text-left p-5 rounded-xl border transition-all duration-150 outline-none',
        'hover:border-ksp-steel hover:bg-[rgba(43,76,126,0.2)]',
        selected
          ? 'border-ksp-amber shadow-[0_0_0_1px_rgba(245,158,11,0.3)] bg-ksp-amber/10'
          : 'border-ksp-navy-light bg-ksp-navy-mid'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={clsx(
            'flex items-center justify-center w-10 h-10 rounded-lg',
            selected ? 'bg-ksp-amber/15 text-ksp-amber' : 'bg-ksp-navy-mid text-ksp-muted'
          )}
        >
          <Icon className="w-5 h-5" />
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              'text-[10px] font-bold px-1.5 py-0.5 rounded',
              selected
                ? 'bg-ksp-amber/20 text-ksp-amber border border-ksp-amber/40'
                : 'bg-ksp-navy-mid text-ksp-muted border border-ksp-navy-light'
            )}
          >
            {abbrev}
          </span>
          <span
            className={clsx(
              'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full',
              selected
                ? 'bg-ksp-amber/20 text-ksp-amber border border-ksp-amber/40'
                : 'bg-ksp-navy-mid text-ksp-muted border border-ksp-navy-light'
            )}
          >
            {badge}
          </span>
        </div>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-ksp-white">{title}</h3>
      <p className="mt-1 text-xs text-ksp-muted leading-relaxed">{scope}</p>
    </button>
  );
}
