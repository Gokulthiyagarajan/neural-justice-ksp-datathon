import { C } from '../theme';

const COL_WIDTHS = [120, 80, 100, 100, 80, 60, 80];

export function FIRTableSkeleton() {
  return (
    <div style={{ marginTop: 8 }}>
      {/* Results bar skeleton */}
      <div
        style={{
          width: 300,
          height: 16,
          borderRadius: 4,
          background: C.navyLight,
          animation: 'fir-pulse 1.5s ease-in-out infinite',
          marginBottom: 12,
        }}
      />

      {/* Header skeleton */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          padding: '0 16px',
          height: 40,
          alignItems: 'center',
          borderBottom: `1px solid ${C.navyLight}`,
        }}
      >
        {COL_WIDTHS.map((w, i) => (
          <div
            key={i}
            style={{
              width: w,
              height: 11,
              background: C.navyLight,
              borderRadius: 3,
              animation: 'fir-pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>

      {/* 8 rows */}
      {Array.from({ length: 8 }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            padding: '0 16px',
            height: 52,
            borderBottom: `1px solid ${C.navyMid}`,
            animationDelay: `${rowIdx * 0.1}s`,
          }}
        >
          {COL_WIDTHS.map((w, colIdx) => (
            <div
              key={colIdx}
              style={{
                width: w,
                height: 12,
                borderRadius: 4,
                background: C.navyLight,
                animation: 'fir-pulse 1.5s ease-in-out infinite',
                animationDelay: `${rowIdx * 0.1}s`,
              }}
            />
          ))}
        </div>
      ))}

      <style>{`
        @keyframes fir-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
