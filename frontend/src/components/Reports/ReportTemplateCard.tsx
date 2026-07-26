import { BarChart3, FileText, Users, Map, Brain } from 'lucide-react';

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  endpoint: string;
  formats: readonly string[];
}

interface ReportTemplateCardProps {
  template: TemplateInfo;
  isSelected: boolean;
  onClick: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3, FileText, Users, Map, Brain,
};

export function ReportTemplateCard({ template, isSelected, onClick }: ReportTemplateCardProps) {
  const Icon = ICON_MAP[template.icon];

  return (
    <button
      onClick={onClick}
      className={`relative text-left w-full p-4 rounded-xl transition-all duration-200 cursor-pointer
        ${isSelected
          ? 'glass-active'
          : 'glass glass-hover-effect'
        }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(0, 212, 255, 0.1)' }}
        >
          {Icon && (
            <Icon
              className="w-5 h-5"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}
          >
            {template.name}
          </p>
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {template.description}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {template.formats.map((fmt) => (
          <span
            key={fmt}
            className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full"
            style={{
              background: 'rgba(0, 212, 255, 0.1)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
            }}
          >
            {fmt}
          </span>
        ))}
      </div>
    </button>
  );
}
