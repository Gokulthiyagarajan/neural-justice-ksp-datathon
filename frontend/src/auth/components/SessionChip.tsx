import { Shield } from 'lucide-react';

interface SessionChipProps {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  onBack?: () => void;
  backLabel?: string;
}

export function SessionChip({ icon: Icon = Shield, label, onBack, backLabel }: SessionChipProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-ksp-amber/40 bg-ksp-amber/10">
      <Icon className="w-3.5 h-3.5 text-ksp-amber" />
      <span className="text-xs font-medium text-ksp-amber">{label}</span>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="ml-1 text-xs text-ksp-muted hover:text-ksp-amber underline underline-offset-2 transition-colors"
        >
          {backLabel}
        </button>
      )}
    </div>
  );
}
