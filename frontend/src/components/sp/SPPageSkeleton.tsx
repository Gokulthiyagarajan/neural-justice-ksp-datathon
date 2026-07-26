/**
 * SP Page Skeleton — blue-accent loading state for all 11 SP sub-pages.
 */
export function SPPageSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-white/5" />
          <div className="h-3 w-32 rounded bg-white/5" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-white/10 bg-white/[0.03]" />
        ))}
      </div>
      <div className="h-[400px] rounded-xl border border-white/10 bg-white/[0.03]" />
    </div>
  );
}
