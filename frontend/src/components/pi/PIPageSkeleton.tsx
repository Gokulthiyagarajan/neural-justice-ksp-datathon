/**
 * Shared PI page loading skeleton.
 * Consistent loading state for all PI workspace pages.
 */
export function PIPageSkeleton() {
  return (
    <div className="p-6 animate-pulse space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-bg-tertiary" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-bg-tertiary" />
          <div className="h-3 w-32 rounded bg-bg-tertiary" />
        </div>
      </div>
      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-bg-card border border-border-primary" />
        ))}
      </div>
      {/* Content area */}
      <div className="h-[400px] rounded-xl bg-bg-card border border-border-primary" />
    </div>
  );
}
