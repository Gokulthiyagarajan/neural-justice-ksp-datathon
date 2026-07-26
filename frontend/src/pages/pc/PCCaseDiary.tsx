import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PCPageSkeleton } from '@/components/pc/PCPageSkeleton';
import { getPcCaseDiary, createPcCaseDiaryEntry } from '@/api/pc';
import type { CaseDiaryEntry, CaseDiaryCreateRequest } from '@/types';

const MAX_ENTRY_LENGTH = 2000;

export function PCCaseDiary() {
  const { crimeNo } = useParams<{ crimeNo: string }>();
  const [entries, setEntries] = useState<CaseDiaryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newEntry, setNewEntry] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDiary = useCallback(async () => {
    if (!crimeNo) return;
    setLoading(true);
    try {
      const data = await getPcCaseDiary(crimeNo);
      setEntries(data.entries);
      setTotal(data.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [crimeNo]);

  useEffect(() => { fetchDiary(); }, [fetchDiary]);

  const handleSubmit = async () => {
    if (!crimeNo || !newEntry.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data: CaseDiaryCreateRequest = { entry_text: newEntry.trim() };
      await createPcCaseDiaryEntry(crimeNo, data);
      setNewEntry('');
      await fetchDiary(); // refresh list
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PCPageSkeleton />;

  return (
    <div className="flex flex-col gap-5 p-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        to={`/pc/cases/${crimeNo}`}
        className="text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1"
      >
        ← Back to Case
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">📓</span>
        <div>
          <h1 className="text-base font-semibold text-slate-300">Case Diary</h1>
          <p className="text-xs text-white/40">
            {crimeNo} &middot; {total} entr{total === 1 ? 'y' : 'ies'}
          </p>
        </div>
      </div>

      {/* New entry form */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
          New Entry
        </h2>
        <textarea
          value={newEntry}
          onChange={(e) => setNewEntry(e.target.value)}
          placeholder="Describe today's progress, observations, or actions taken..."
          maxLength={MAX_ENTRY_LENGTH}
          rows={5}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm
                     text-slate-200 placeholder-white/20 resize-none
                     focus:outline-none focus:border-slate-500/40"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-white/30">
            {newEntry.length}/{MAX_ENTRY_LENGTH}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!newEntry.trim() || submitting}
            className="text-xs px-4 py-1.5 rounded-lg bg-slate-500/20 text-slate-200
                       border border-slate-500/30 hover:bg-slate-500/30 transition-colors
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-xs text-red-400">Unable to load case diary. Please try again.</p>
        </div>
      )}

      {/* Entries list */}
      {entries.length === 0 && !error ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <span className="text-3xl block mb-2 opacity-30">📭</span>
          <p className="text-sm text-white/40">No diary entries yet</p>
          <p className="text-xs text-white/20 mt-1">
            Start by writing your first entry above
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-white/30">
                  {entry.entry_date}
                </span>
                <span className="text-[10px] text-white/20">
                  {entry.officer_id}
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {entry.entry_text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
