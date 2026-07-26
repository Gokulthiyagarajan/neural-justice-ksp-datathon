import { clsx } from 'clsx';
import { Check } from 'lucide-react';

interface AuditCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function AuditCheckbox({ checked, onChange, label }: AuditCheckboxProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none group">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'mt-0.5 flex items-center justify-center w-5 h-5 rounded border transition-colors duration-150 shrink-0',
          checked
            ? 'bg-ksp-amber border-ksp-amber text-ksp-navy'
            : 'border-ksp-amber bg-transparent text-transparent'
        )}
      >
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
      </button>
      <span className={clsx('text-sm leading-relaxed', checked ? 'text-ksp-white' : 'text-ksp-muted')}>
        {label}
      </span>
    </label>
  );
}
