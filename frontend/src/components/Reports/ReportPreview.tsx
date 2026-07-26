import { FileText, Loader2, Download, RefreshCw } from 'lucide-react';

export type ReportStatus = 'idle' | 'generating' | 'ready' | 'error';

interface ReportPreviewProps {
  status: ReportStatus;
  downloadUrl: string | null;
  error: string | null;
  onRetry: () => void;
}

export function ReportPreview({ status, downloadUrl, error, onRetry }: ReportPreviewProps) {
  if (status === 'idle') {
    return (
      <div className="glass rounded-xl p-4 flex flex-col items-center justify-center py-16 gap-4">
        <FileText className="w-12 h-12" style={{ color: 'var(--text-tertiary)' }} />
        <p className="text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
          Choose a template and date range, then click Generate
        </p>
      </div>
    );
  }

  if (status === 'generating') {
    return (
      <div className="glass rounded-xl p-4 flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--accent-cyan)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Generating report...
        </p>
        <div className="w-full max-w-xs h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0, 212, 255, 0.1)' }}>
          <div
            className="h-full rounded-full w-1/4 animate-progress-indeterminate"
            style={{ background: 'var(--accent-cyan)' }}
          />
        </div>
      </div>
    );
  }

  if (status === 'ready' && downloadUrl) {
    return (
      <div className="glass rounded-xl p-4 flex flex-col items-center justify-center py-16 gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0, 230, 118, 0.1)' }}
        >
          <Download className="w-6 h-6" style={{ color: 'var(--accent-green)' }} />
        </div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Report ready
        </p>
        <a
          href={downloadUrl}
          download
          className="btn-success inline-flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download
        </a>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="glass rounded-xl p-4 flex flex-col items-center justify-center py-16 gap-4">
        <div className="alert-error w-full max-w-md">
          <span className="text-sm">{error || 'Unable to generate report. Please try again.'}</span>
        </div>
        <button onClick={onRetry} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return null;
}
