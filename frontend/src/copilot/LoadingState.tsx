import { useEffect, useState } from 'react';

/* ─────────────────────────────────────────────────────────
 * LOADING STATE — pixel-grid loader adapted for KSP Datathon
 *
 * Variants:
 *   Drive  — square cells, chevron wavefront driving right
 *   Dots   — same wavefront, circular cells
 *   Orbit  — a comet lapping the grid perimeter
 *
 * Paired with a shimmering label and a live elapsed timer
 * in mono tabular figures. Reduced motion freezes the grid
 * to its dim state; the timer still ticks.
 * ───────────────────────────────────────────────────────── */

const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3), c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i);
  return k === -1 ? null : k * 110;
});

const PATTERNS: Record<string, { delays: (number | null)[]; dur: number; round: boolean }> = {
  Drive: { delays: chevron, dur: 650, round: false },
  Dots: { delays: chevron, dur: 650, round: true },
  Orbit: { delays: orbit, dur: 950, round: false },
};

function useElapsed() {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDs((d) => d + 1), 100);
    return () => clearInterval(t);
  }, []);
  const total = ds / 10;
  if (total < 60) return `${total.toFixed(1)}s`;
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

export default function LoadingState({
  label = 'Churning',
  variant = 'Drive',
}: {
  label?: string;
  variant?: 'Drive' | 'Dots' | 'Orbit';
}) {
  const elapsed = useElapsed();
  const { delays, dur, round } = PATTERNS[variant] ?? PATTERNS.Drive;

  return (
    <div className="flex w-fit items-center gap-2.5">
      <svg
        aria-hidden
        className="grid grid-cols-[repeat(3,4px)] gap-[1.5px]"
        viewBox="0 0 36 12"
      >
        {delays.map((d, i) => {
          const style: React.CSSProperties = {};
          if (d === null) {
            style.opacity = 0.03;
            style.animation = 'none';
          } else {
            style.opacity = 0.15;
            style.animation = `pixel-on ${dur}ms ease-in-out ${d}ms infinite`;
          }
          return (
            <rect
              key={i}
              width="4"
              height="4"
              fill="var(--color-service-blue)"
              style={style}
              className={round ? 'rounded-full' : 'rounded-[1px]'}
            />
          );
        })}
      </svg>
      <span
        className="bg-clip-text text-[13px] font-medium whitespace-nowrap text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(90deg, var(--text-tertiary) 35%, var(--text-primary) 50%, var(--text-tertiary) 65%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s linear infinite",
        }}
      >
        {label}
      </span>
      <span className="font-mono text-[12px] text-muted-foreground tabular-nums">
        {elapsed}
      </span>
    </div>
  );
}