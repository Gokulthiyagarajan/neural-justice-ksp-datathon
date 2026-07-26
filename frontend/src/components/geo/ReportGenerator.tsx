import { useState } from 'react';
import { X, FileText, Download, Printer, Eye } from 'lucide-react';
import { generateReport } from '@/api/geo';
import type { GeoCoordinates, GeoReport } from '@/types/geo';

interface ReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  clickCoords?: GeoCoordinates | null;
}

const REPORT_TYPES = [
  { value: 'area_summary', label: 'Area Summary' },
  { value: 'hotspot_analysis', label: 'Hotspot Analysis' },
  { value: 'patrol_coverage', label: 'Patrol Coverage' },
] as const;

const SECTIONS = [
  { id: 'fir_list', label: 'FIR List' },
  { id: 'hotspots', label: 'Hotspots' },
  { id: 'risk_assessment', label: 'Risk Assessment' },
  { id: 'patrol_recommendations', label: 'Patrol Recommendations' },
] as const;

const TIME_RANGES = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
] as const;

export function ReportGenerator({ isOpen, onClose, clickCoords }: ReportGeneratorProps) {
  const [reportType, setReportType] = useState<string>('area_summary');
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [selectedSections, setSelectedSections] = useState<string[]>(['fir_list', 'hotspots', 'risk_assessment']);
  const [report, setReport] = useState<GeoReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const toggleSection = (id: string) => {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateReport({
        type: reportType as 'area_summary' | 'hotspot_analysis' | 'patrol_coverage',
        center: clickCoords || undefined,
        time_range: timeRange as '24h' | '7d' | '30d',
        sections: selectedSections,
      });
      setReport(res);
      setPreviewOpen(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
            <h3 className="text-base font-semibold text-text-primary">Generate Report</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-hover-bg">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        {!previewOpen ? (
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-text-primary block mb-1.5">Report Type</label>
              <div className="grid grid-cols-1 gap-1">
                {REPORT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setReportType(t.value)}
                    className={`text-xs text-left px-3 py-2 rounded-lg border transition-colors ${
                       reportType === t.value
                        ? 'border-[rgba(0,212,255,0.15)] bg-[rgba(0,212,255,0.05)] text-[var(--accent-cyan)] font-medium'
                        : 'border-border-primary text-text-secondary hover:bg-hover-bg'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-text-primary block mb-1.5">Time Range</label>
              <div className="flex gap-2">
                {TIME_RANGES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTimeRange(t.value)}
                    className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                      timeRange === t.value
                        ? 'border-[rgba(0,212,255,0.15)] bg-[rgba(0,212,255,0.05)] text-[var(--accent-cyan)] font-medium'
                        : 'border-border-primary text-text-secondary hover:bg-hover-bg'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-text-primary block mb-1.5">Include Sections</label>
              <div className="space-y-1.5">
                {SECTIONS.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(s.id)}
                      onChange={() => toggleSection(s.id)}
                      className="rounded border-border-primary focus:ring-[rgba(0,212,255,0.4)]" style={{ color: 'var(--accent-cyan)' }}
                    />
                    <span className="text-xs text-text-secondary">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {clickCoords && (
              <div className="bg-bg-tertiary rounded-lg p-2 text-center">
                <p className="text-[10px] text-text-tertiary font-mono">
                  Location: {clickCoords.lat.toFixed(4)}, {clickCoords.lng.toFixed(4)}
                </p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || selectedSections.length === 0}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium bg-[rgba(0,212,255,0.15)] text-white rounded-lg hover:bg-[rgba(0,212,255,0.25)] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(0, 230, 118, 0.05)', borderColor: 'rgba(0, 230, 118, 0.15)' }}>
              <FileText className="w-8 h-8 mx-auto mb-1" style={{ color: 'var(--alert-green)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Report Generated</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--alert-green)' }}>ID: {report?.report_id}</p>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-[rgba(0,212,255,0.15)] text-white rounded-lg hover:bg-[rgba(0,212,255,0.25)] transition-colors">
                <Eye className="w-3.5 h-3.5" />
                View Report
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-bg-tertiary text-text-secondary rounded-lg hover:bg-hover-bg transition-colors">
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-bg-tertiary text-text-secondary rounded-lg hover:bg-hover-bg transition-colors">
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-bg-tertiary text-text-secondary rounded-lg hover:bg-hover-bg transition-colors">
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>

            <button
              onClick={() => setPreviewOpen(false)}
              className="w-full text-xs text-text-tertiary py-2 hover:text-text-primary"
            >
              Back to settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
