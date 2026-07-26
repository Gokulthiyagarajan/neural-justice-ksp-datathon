import type { TemplateInfo } from './ReportTemplateCard';

export interface DateRange {
  from: string;
  to: string;
}

interface ReportToolbarProps {
  templates: readonly TemplateInfo[];
  selectedTemplate: string;
  dateRange: DateRange;
  format: string;
  isGenerating: boolean;
  onChange: (field: string, value: string) => void;
  onGenerate: () => void;
}

export function ReportToolbar({
  templates, selectedTemplate, dateRange, format, isGenerating,
  onChange, onGenerate,
}: ReportToolbarProps) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5 min-w-[180px]">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => onChange('selectedTemplate', e.target.value)}
            className="input"
          >
            <option value="">Select a template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            From
          </label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => onChange('from', e.target.value)}
            className="input"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            To
          </label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => onChange('to', e.target.value)}
            className="input"
          />
        </div>

        <div className="flex flex-col gap-1.5 min-w-[130px]">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Format
          </label>
          <select
            value={format}
            onChange={(e) => onChange('format', e.target.value)}
            className="input"
          >
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
          </select>
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating || !selectedTemplate || !dateRange.from || !dateRange.to}
          className="btn-primary"
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  );
}
