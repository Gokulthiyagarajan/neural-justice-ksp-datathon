import { useEffect, useState } from 'react';
import { ForecastChart } from '@/components/Intelligence/ForecastChart';
import { ErrorState } from '@/design-system/components/ErrorState';
import { EmptyState } from '@/design-system/components/EmptyState';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import { TrendingUp } from 'lucide-react';
import { getForecast } from '@/api/intelligence';
import { api } from '@/api/client';
import type { Forecast } from '@/types';
import { useTranslation } from 'react-i18next';

interface DivisionOption {
  id: number;
  name: string;
  districts: { id: number; name: string }[];
}

interface CrimeTypeOption {
  id: number;
  name: string;
}

export function ForecastPage() {
  const { t } = useTranslation();
  const jurisdiction = useJurisdiction();
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [horizon, setHorizon] = useState(30);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [crimeTypes, setCrimeTypes] = useState<CrimeTypeOption[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<number | ''>('');
  const [selectedDistrict, setSelectedDistrict] = useState<number | ''>('');
  const [selectedCrimeType, setSelectedCrimeType] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ divisions: DivisionOption[] }>('/api/divisions-districts')
      .then((res) => {
        const r = res as { divisions: DivisionOption[] };
        setDivisions(r.divisions ?? []);
      })
      .catch(() => {});
    api.get<{ crime_types: CrimeTypeOption[] }>('/api/crime-types')
      .then((res) => {
        const r = res as { crime_types: CrimeTypeOption[] };
        setCrimeTypes(r.crime_types ?? []);
      })
      .catch(() => {});
  }, []);

  const currentDivision = divisions.find((d) => d.id === selectedRegion);
  const availableDistricts = currentDivision ? currentDivision.districts : [];

  const load = async (days: number) => {
    if (!selectedDistrict) {
      setError(t('forecast.selectDistrict'));
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const res = await getForecast(String(selectedDistrict), days, selectedCrimeType ? String(selectedCrimeType) : undefined);
      setForecasts(res.forecasts ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDistrict) {
      load(horizon);
    }
  }, [horizon, selectedDistrict]);

  if (isLoading && forecasts.length === 0) {
    return (
      <div className="panel-card p-8 text-center text-sm text-text-tertiary">
        {t('forecast.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <JurisdictionBanner scope={jurisdiction} />
      {error && error.includes('validation') ? (
        <ErrorState
          title={t('forecast.requestRejected')}
          description="The forecast API returned a validation error — confirm district and crime type filters, then retry."
          onRetry={() => selectedDistrict && load(horizon)}
          variant="warning"
        />
      ) : error ? (
        <ErrorState
          title={t('forecast.unavailable')}
          description="Please try again. If the issue persists, contact support."
          onRetry={() => selectedDistrict && load(horizon)}
        />
      ) : null}

      <div className="panel-card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-text-tertiary mb-1">Region</label>
            <select
              value={selectedRegion}
              onChange={(e) => { setSelectedRegion(Number(e.target.value) || ''); setSelectedDistrict(''); }}
              className="px-3 py-1.5 border border-border-primary rounded-lg text-sm bg-bg-card"
            >
              <option value="">Select Region</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-tertiary mb-1">{t('forecast.district')}</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(Number(e.target.value) || '')}
              disabled={!selectedRegion}
              className="px-3 py-1.5 border border-border-primary rounded-lg text-sm bg-bg-card disabled:opacity-50"
            >
              <option value="">{selectedRegion ? 'Select District' : t('forecast.allDistricts')}</option>
              {availableDistricts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-tertiary mb-1">{t('forecast.crimeType')}</label>
            <select
              value={selectedCrimeType}
              onChange={(e) => setSelectedCrimeType(Number(e.target.value) || '')}
              className="px-3 py-1.5 border border-border-primary rounded-lg text-sm bg-bg-card"
            >
              <option value="">{t('forecast.allTypes')}</option>
              {crimeTypes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => load(horizon)}
            className="btn-primary self-end"
          >
            {t('common.apply')}
          </button>
        </div>
      </div>

      {selectedDistrict && (
        <ForecastChart
          forecasts={forecasts}
          horizonDays={horizon}
          onHorizonChange={setHorizon}
        />
      )}

      {!selectedDistrict && !error && (
        <EmptyState
          icon={<TrendingUp />}
          title="Select a Region & District"
          description="Choose a region first, then a district to generate a case-volume forecast."
        />
      )}

      {forecasts.length > 0 && (
        <div className="panel-card p-4">
          <h4 className="text-sm font-semibold text-text-primary mb-3">{t('forecast.dailyData')}</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary">
                  <th className="text-left py-2 text-text-tertiary font-medium">{t('forecast.date')}</th>
                  <th className="text-right py-2 text-text-tertiary font-medium">{t('forecast.predicted')}</th>
                  <th className="text-right py-2 text-text-tertiary font-medium">{t('forecast.lower')}</th>
                  <th className="text-right py-2 text-text-tertiary font-medium">{t('forecast.upper')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-secondary">
                {forecasts.map((f) => (
                  <tr key={f.date}>
                    <td className="py-2 text-text-primary">{f.date}</td>
                    <td className="py-2 text-right font-medium text-text-primary">{Math.round(f.predicted_cases * 10) / 10}</td>
                    <td className="py-2 text-right text-text-tertiary">{Math.round(f.lower * 10) / 10}</td>
                    <td className="py-2 text-right text-text-tertiary">{Math.round(f.upper * 10) / 10}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
