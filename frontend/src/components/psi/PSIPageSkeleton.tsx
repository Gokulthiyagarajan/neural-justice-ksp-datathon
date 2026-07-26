export function PSIPageSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-purple-500/10" />
        <div>
          <div className="h-4 w-48 rounded bg-purple-500/10" />
          <div className="h-3 w-32 rounded mt-1 bg-white/5" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="h-80 rounded-xl bg-white/5" />
    </div>
  );
}
