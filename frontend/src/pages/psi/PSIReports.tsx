import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';

const PURPLE = '#8B5CF6';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const REPORT_TEMPLATES = [
  {
    id: 'station-fir-log',
    title: 'Station FIR Log',
    description: 'All FIRs filed at this station this month',
    icon: '📋',
    endpoint: 'fir-log',
  },
  {
    id: 'crime-summary',
    title: 'Crime Summary',
    description: 'Crime type breakdown and trend for the station',
    icon: '📊',
    endpoint: 'crime-summary',
  },
  {
    id: 'pending-cases',
    title: 'Pending Cases Report',
    description: 'All open cases older than 30 days',
    icon: '⏰',
    endpoint: 'pending-cases',
  },
  {
    id: 'hotspot-report',
    title: 'Hotspot Analysis',
    description: 'Crime hotspot summary for the station area',
    icon: '🗺️',
    endpoint: 'hotspot-analysis',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PSI REPORTS MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export function PSIReports() {
  const user = useAuthStore((s) => s.user);
  const [generating, setGenerating] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (template: typeof REPORT_TEMPLATES[0]) => {
    setGenerating(template.id);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch(
        `/api/reports/${template.endpoint}?station_id=${user?.station_id}`,
        { headers: authHeaders() },
      );
      const data = await res.json();
      const content = data.content ?? data.report ?? JSON.stringify(data, null, 2);
      setPreview(content);
      setPreviewTitle(template.title);
    } catch (e) {
      console.warn('[PSIReports] generate error:', e);
      setError('Unable to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const handleDownload = () => {
    if (!preview) return;
    const blob = new Blob([preview], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${previewTitle.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">📄</span>
        <div>
          <h1 className="text-base font-semibold" style={{ color: PURPLE }}>Station Reports</h1>
          <p className="text-xs text-white/40">Generate station-scoped intelligence reports</p>
        </div>
      </div>

      {/* Demo banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <span className="text-amber-400 text-lg mt-0.5">🔬</span>
        <div>
          <p className="text-sm font-medium text-amber-300">Demo Mode — Synthetic Dataset</p>
          <p className="text-xs text-amber-400/80 mt-0.5">
            Reports use representative synthetic KSP data. In production, data streams live from Catalyst DataStore.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          <span className="flex-1">Unable to generate report. Please try again.</span>
        </div>
      )}

      {/* Report template cards */}
      <div className="grid grid-cols-2 gap-4">
        {REPORT_TEMPLATES.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{t.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white/80">{t.title}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{t.description}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleGenerate(t)}
              disabled={generating === t.id}
              className="w-full py-2 rounded-lg text-xs font-medium
                         bg-purple-500/20 text-purple-300 border border-purple-500/30
                         hover:bg-purple-500/30 transition-colors disabled:opacity-40"
            >
              {generating === t.id ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        ))}
      </div>

      {/* Report preview */}
      {preview && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-white/70">
              Report Preview — {previewTitle}
            </h3>
            <button
              onClick={handleDownload}
              className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
            >
              Download ↓
            </button>
          </div>
          <pre
            className="text-[10px] text-white/60 whitespace-pre-wrap font-mono
                        max-h-[300px] overflow-y-auto leading-relaxed"
          >
            {preview}
          </pre>
        </div>
      )}
    </div>
  );
}
