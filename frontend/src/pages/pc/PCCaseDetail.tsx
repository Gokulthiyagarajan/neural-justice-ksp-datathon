import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

import { PCPageSkeleton } from '@/components/pc/PCPageSkeleton';
import { StatusBadge } from '@/components/Common/StatusBadge';
import { getPcFirDetail } from '@/api/pc';
import type { FirCase } from '@/types';

export function PCCaseDetail() {
  const { crimeNo } = useParams<{ crimeNo: string }>();
  const navigate = useNavigate();
  const [fir, setFir] = useState<FirCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!crimeNo) return;
    setLoading(true);
    setError(''); // reset stale error when switching cases in-app (hash navigation)
    getPcFirDetail(crimeNo)
      .then(setFir)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [crimeNo]);

  if (loading) return <PCPageSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col gap-4 p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <span className="text-3xl block mb-2">⚠️</span>
          <p className="text-sm text-red-400">Unable to load case details. Please try again.</p>
          <button
            onClick={() => navigate('/pc/my-cases')}
            className="mt-4 text-xs text-slate-400 hover:text-white underline underline-offset-2"
          >
            ← Back to My Cases
          </button>
        </div>
      </div>
    );
  }

  if (!fir || !fir.status) {
    // Guard against an empty/malformed response (e.g. {} with 200): StatusBadge
    // calls status.replace() and would crash the whole page via the error boundary.
    return (
      <div className="flex flex-col gap-4 p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <span className="text-3xl block mb-2">📭</span>
          <p className="text-sm text-white/40">Case not found</p>
          <Link to="/pc/my-cases"
            className="mt-4 inline-block text-xs text-slate-400 hover:text-white underline underline-offset-2">
            ← Back to My Cases
          </Link>
        </div>
      </div>
    );
  }

  const daysOpen = fir.occurrence_date
    ? Math.floor(
        (Date.now() - new Date(fir.occurrence_date).getTime())
        / (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    <div className="flex flex-col gap-5 p-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        to="/pc/my-cases"
        className="text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1"
      >
        ← Back to My Cases
      </Link>

      {/* Case header */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-sm text-white/80">{fir.crime_no}</span>
              <StatusBadge status={fir.status} compact />
            </div>
            <h1 className="text-base font-semibold text-slate-200">
              {fir.crime_head_name || '—'}
            </h1>
          </div>
          {daysOpen > 0 && (
            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20 shrink-0">
              {daysOpen}d open
            </span>
          )}
        </div>

        {/* Key details grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs mt-4 pt-4 border-t border-white/5">
          <DetailRow label="Status" value={fir.status} />
          <DetailRow label="FIR Type" value={fir.fir_type} />
          <DetailRow label="Date of Occurrence" value={fir.occurrence_date} />
          <DetailRow label="Time" value={fir.occurrence_time} />
          <DetailRow label="Station" value={fir.station_name || '—'} />
          <DetailRow label="Registered By" value={fir.registered_by} />
          <DetailRow label="Created" value={fir.created_at || '—'} />
          <DetailRow label="Updated" value={fir.updated_at || '—'} />
        </div>
      </div>

      {/* Location */}
      {(fir.lat || fir.lng) && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
            Location
          </h2>
          <p className="text-xs text-white/60">
            {fir.lat?.toFixed(5)}, {fir.lng?.toFixed(5)}
          </p>
        </div>
      )}

      {/* Brief facts */}
      {fir.brief_facts && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
            Brief Facts
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {fir.brief_facts}
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400/60 mb-3">
          Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/firs/${fir.crime_no}`}
            className="text-xs px-4 py-2 rounded-lg bg-slate-500/20 text-slate-200
                       border border-slate-500/30 hover:bg-slate-500/30 transition-colors"
          >
            View Full FIR Record →
          </Link>
          <Link
            to={`/pc/cases/${fir.crime_no}/diary`}
            className="text-xs px-4 py-2 rounded-lg bg-slate-500/20 text-slate-200
                       border border-slate-500/30 hover:bg-slate-500/30 transition-colors"
          >
            📝 Case Diary
          </Link>
          <button
            disabled
            title="This feature is under development"
            className="text-xs px-4 py-2 rounded-lg bg-white/5 text-white/30
                       border border-white/10 cursor-not-allowed"
          >
            📎 Upload Evidence
          </button>
        </div>
      </div>
    </div>
  );
}

/** A label + value row for the key details grid. */
function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-white/30">{label}</span>
      <span className="text-white/70">{value || '—'}</span>
    </div>
  );
}
