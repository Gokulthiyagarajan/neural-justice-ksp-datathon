interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', variant = 'text', width, height }: SkeletonProps) {
  const base = 'bg-gradient-to-r from-bg-tertiary via-border-primary to-bg-tertiary bg-[length:200%_100%] animate-skeleton rounded';
  const variants = {
    text: 'h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={`${base} ${variants[variant]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-bg-card rounded-xl border border-border-primary p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="w-24" />
          <Skeleton className="w-32 h-8" />
          <Skeleton className="w-20" />
        </div>
        <Skeleton variant="circular" width={40} height={40} />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 py-3">
        {[40, 60, 30, 50, 20].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-t border-border-secondary">
          {[40, 60, 30, 50, 20].map((w, j) => (
            <Skeleton key={j} className="h-3" style={{ width: `${w}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-bg-card rounded-lg border border-border-primary p-4 flex items-center gap-4">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-3/5" />
            <Skeleton className="w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
