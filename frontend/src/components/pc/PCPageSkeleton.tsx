export function PCPageSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-6 max-w-3xl mx-auto animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-white/5" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-white/5" />
    </div>
  )
}
