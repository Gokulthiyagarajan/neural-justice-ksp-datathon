import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FirCase } from '@/types';

interface IncidentMapProps {
  incidents: FirCase[];
}

interface DistrictPoint {
  name: string;
  x: number;
  y: number;
  cases: number;
}

const karnatakaPaths: DistrictPoint[] = [
  { name: 'Bengaluru', x: 62, y: 58, cases: 0 },
  { name: 'Mysuru', x: 50, y: 72, cases: 0 },
  { name: 'Hubli', x: 30, y: 40, cases: 0 },
  { name: 'Mangaluru', x: 38, y: 18, cases: 0 },
  { name: 'Belagavi', x: 22, y: 30, cases: 0 },
  { name: 'Kalaburagi', x: 55, y: 22, cases: 0 },
  { name: 'Davanagere', x: 48, y: 48, cases: 0 },
  { name: 'Shivamogga', x: 50, y: 40, cases: 0 },
  { name: 'Tumakuru', x: 58, y: 50, cases: 0 },
  { name: 'Ballari', x: 42, y: 32, cases: 0 },
];

const crimeColorKeys = ['robbery', 'theft', 'assault', 'burglary'] as const;

const crimeColors: Record<string, string> = {
  robbery: 'var(--alert-red)',
  theft: 'var(--alert-amber)',
  assault: '#8B5CF6',
  burglary: 'var(--accent-cyan)',
  default: 'var(--text-tertiary)',
};

function getDotColor(incident: FirCase) {
  const type = (incident.crime_head_name || '').toLowerCase();
  return crimeColors[type] || crimeColors.default;
}

export function IncidentMap({ incidents }: IncidentMapProps) {
  const { t } = useTranslation();
  const [tooltip, setTooltip] = useState<{ crime_no: string; type: string; date: string; x: number; y: number } | null>(null);

  const validIncidents = incidents.filter(
    (inc) => inc.lat != null && inc.lng != null && !Number.isNaN(inc.lat) && !Number.isNaN(inc.lng),
  );

  return (
    <div className="panel-card p-5 transition-all duration-300 hover:border-accent-cyan/20">
      <h3 className="font-semibold text-text-primary font-display mb-4">{t('incidentMap.title')}</h3>
      <div className="relative">
        {validIncidents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-tertiary rounded-md z-10">
            <p className="text-sm text-text-tertiary px-4 text-center">{t('incidentMap.empty')}</p>
          </div>
        )}
        <svg viewBox="0 0 100 100" className="w-full h-64 bg-bg-tertiary rounded-md" role="img" aria-label={t('incidentMap.title')}>
          <rect x="5" y="5" width="90" height="90" rx="8" fill="var(--bg-secondary)" stroke="var(--border-primary)" strokeWidth="0.5" />

          {validIncidents.slice(0, 30).map((inc, i) => {
            const hasValidCoords = inc.lat != null && inc.lng != null;
            const districtIndex = hasValidCoords
              ? Math.floor((inc.lat * 10) % karnatakaPaths.length)
              : i % karnatakaPaths.length;
            const district = karnatakaPaths[districtIndex] || karnatakaPaths[0];

            const x = hasValidCoords ? ((inc.lng - 74) / 4) * 90 + 5 : district.x + ((i % 5) - 2);
            const y = hasValidCoords ? ((18 - inc.lat) / 10) * 90 + 5 : district.y + ((i % 3) - 1);

            return (
              <circle
                key={`${inc.crime_no}-${i}`}
                cx={Math.max(8, Math.min(92, x))}
                cy={Math.max(8, Math.min(92, y))}
                r={2}
                fill={getDotColor(inc)}
                stroke="white"
                strokeWidth={0.5}
                className="cursor-pointer"
                onMouseEnter={() =>
                  setTooltip({
                    crime_no: inc.crime_no,
                    type: inc.crime_head_name || t('common.unknown', { defaultValue: 'Unknown' }),
                    date: inc.occurrence_date,
                    x: Math.max(8, Math.min(92, x)),
                    y: Math.max(8, Math.min(92, y)),
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
          {karnatakaPaths.map((d) => (
            <text
              key={d.name}
              x={d.x}
              y={d.y + 4}
              textAnchor="middle"
              fontSize={2.5}
              fill="var(--text-tertiary)"
              className="pointer-events-none"
            >
              {d.name}
            </text>
          ))}
        </svg>

        {tooltip && (
          <div
            className="absolute bg-bg-secondary border border-border-primary rounded-md shadow-floating px-3 py-2 text-xs pointer-events-none z-10"
            style={{ left: `${tooltip.x}%`, top: `${tooltip.y}%`, transform: 'translate(-50%, -120%)' }}
          >
            <p className="font-mono font-medium text-text-primary">{tooltip.crime_no}</p>
            <p className="text-text-tertiary">{tooltip.type}</p>
            <p className="font-mono text-text-tertiary">{tooltip.date}</p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-tertiary">
          {crimeColorKeys.map((type) => (
            <span key={type} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: crimeColors[type] }} aria-hidden />
              {t(`fir.${type}`)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
