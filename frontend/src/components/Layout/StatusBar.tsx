import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StatusBarProps {
  divisionCount?: number;
  districtCount?: number;
  stationCount?: number;
}

export default function StatusBar({ divisionCount = 4, districtCount = 31, stationCount = 906 }: StatusBarProps) {
  const { t } = useTranslation();

  return (
    <footer className="hidden sm:flex h-7 px-3 items-center justify-between bg-bg-sidebar border-t border-border-primary text-[10px] text-text-tertiary">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-verified-green opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-verified-green" />
          </span>
          {t('statusBar.connected')}
        </span>
        <span className="hidden md:flex items-center gap-1">
          <Activity className="w-3 h-3 text-text-tertiary/60" aria-hidden />
          {t('statusBar.lastSync')}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-mono tracking-tight hidden md:inline">
          {t('statusBar.stats', { divisions: divisionCount, districts: districtCount, stations: stationCount })}
        </span>
      </div>
    </footer>
  );
}
