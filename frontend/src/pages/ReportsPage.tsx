import { useState, useCallback } from 'react';
import { ReportTemplateCard } from '@/components/Reports/ReportTemplateCard';
import { ReportToolbar } from '@/components/Reports/ReportToolbar';
import { ReportPreview } from '@/components/Reports/ReportPreview';
import type { TemplateInfo } from '@/components/Reports/ReportTemplateCard';
import type { DateRange } from '@/components/Reports/ReportToolbar';
import type { ReportStatus } from '@/components/Reports/ReportPreview';
import { useTranslation } from 'react-i18next';

const REPORT_TEMPLATES: readonly TemplateInfo[] = [
  { id: 'crime-summary', name: '', description: '', icon: 'BarChart3', endpoint: '/api/reports/crime-summary', formats: ['pdf', 'csv'] as const },
  { id: 'fir-log', name: '', description: '', icon: 'FileText', endpoint: '/api/reports/fir-log', formats: ['pdf', 'csv', 'excel'] as const },
  { id: 'officer-performance', name: '', description: '', icon: 'Users', endpoint: '/api/reports/officer-performance', formats: ['pdf', 'excel'] as const },
  { id: 'hotspot-analysis', name: '', description: '', icon: 'Map', endpoint: '/api/reports/hotspot-analysis', formats: ['pdf'] as const },
  { id: 'ai-insights', name: '', description: '', icon: 'Brain', endpoint: '/api/reports/ai-insights', formats: ['pdf'] as const },
];

export function ReportsPage() {
  const { t } = useTranslation();

  const templates: readonly TemplateInfo[] = REPORT_TEMPLATES.map((tmpl) => {
    const key = tmpl.id.replace(/-/g, '');
    return {
      ...tmpl,
      name: t(`reports.${key}`),
      description: t(`reports.${key}Desc`),
    };
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' });
  const [format, setFormat] = useState('pdf');
  const [status, setStatus] = useState<ReportStatus>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplateObj = templates.find((t) => t.id === selectedTemplate);

  const handleChange = useCallback((field: string, value: string) => {
    switch (field) {
      case 'selectedTemplate':
        setSelectedTemplate(value);
        break;
      case 'from':
        setDateRange((prev) => ({ ...prev, from: value }));
        break;
      case 'to':
        setDateRange((prev) => ({ ...prev, to: value }));
        break;
      case 'format':
        setFormat(value);
        break;
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedTemplateObj) return;

    setStatus('generating');
    setError(null);
    setDownloadUrl(null);

    try {
      const res = await fetch(selectedTemplateObj.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_from: dateRange.from,
          date_to: dateRange.to,
          format,
        }),
      });

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus('ready');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  }, [selectedTemplateObj, dateRange, format]);

  const handleRetry = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  return (
    <div className="space-y-4 max-w-full">
      <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--alert-amber)', background: 'color-mix(in srgb, var(--alert-amber) 12%, transparent)' }}>
        <div className="flex items-start gap-2">
          <span aria-hidden style={{ color: 'var(--alert-amber)', fontSize: '1.1rem', lineHeight: 1.4 }}>⚠</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--alert-amber)' }}>
              {t('reports.demoModeTitle', 'Demo Mode — Sample Data')}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {t('reports.demoModeBody', 'Report figures shown here are illustrative samples for demonstration. FIR Operations and live analytics read real records from the Catalyst Data Store via ZCQL.')}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h1 className="text-heading-l">{t('reports.title')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {t('reports.subtitle')}
        </p>
      </div>

      <ReportToolbar
        templates={templates}
        selectedTemplate={selectedTemplate}
        dateRange={dateRange}
        format={format}
        isGenerating={status === 'generating'}
        onChange={handleChange}
        onGenerate={handleGenerate}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templates.map((template) => (
          <ReportTemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplate === template.id}
            onClick={() => setSelectedTemplate(template.id)}
          />
        ))}
      </div>

      <ReportPreview
        status={status}
        downloadUrl={downloadUrl}
        error={error}
        onRetry={handleRetry}
      />
    </div>
  );
}
