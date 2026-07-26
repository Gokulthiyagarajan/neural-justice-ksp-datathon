export function CPPageSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden animate-pulse">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5" />
          <div className="space-y-1.5">
            <div className="h-4 w-48 rounded bg-white/5" />
            <div className="h-2.5 w-36 rounded bg-white/5" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/50">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-white/[0.03] border border-white/5" />
        ))}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-4 space-y-3">
          <div className="h-8 w-32 rounded bg-white/5" />
          <div className="h-[300px] rounded-xl bg-white/[0.03] border border-white/10" />
          <div className="h-[200px] rounded-xl bg-white/[0.03] border border-white/10" />
        </div>
        <div className="w-80 border-l border-white/10 bg-slate-900/50">
          <div className="p-4 space-y-3">
            <div className="h-4 w-24 rounded bg-white/5" />
            <div className="h-20 rounded-lg bg-white/[0.03] border border-white/5" />
            <div className="h-20 rounded-lg bg-white/[0.03] border border-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
