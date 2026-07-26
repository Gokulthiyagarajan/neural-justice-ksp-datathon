import { MapPin, Calendar, Clock, User, FileText } from 'lucide-react';
import { StatusBadge } from '@/components/Common/StatusBadge';
import type { FirCase } from '@/types';
import { useTranslation } from 'react-i18next';

interface FIRCardProps {
  fir: FirCase;
}

export function FIRCard({ fir }: FIRCardProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-bg-card rounded-xl border border-border-primary overflow-hidden">
      <div className="px-6 py-4 border-b border-border-primary bg-bg-tertiary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
            <h2 className="text-lg font-semibold text-text-primary">{fir.crime_no}</h2>
            <StatusBadge status={fir.status} />
          </div>
          <span className="text-xs text-text-tertiary">{fir.fir_type}</span>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider">{t('fir.basicInformation')}</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-text-tertiary" />
              <div>
                <p className="text-text-tertiary">{t('fir.dateFrom')}</p>
                <p className="font-medium text-text-primary">{fir.occurrence_date || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-text-tertiary" />
              <div>
                <p className="text-text-tertiary">{t('fir.occurrenceTime')}</p>
                <p className="font-medium text-text-primary">{fir.occurrence_time || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-text-tertiary" />
              <div>
                <p className="text-text-tertiary">{t('fir.registered_by')}</p>
                <p className="font-medium text-text-primary">{fir.registered_by || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-text-tertiary" />
              <div>
                <p className="text-text-tertiary">{t('fir.location')}</p>
                <p className="font-medium text-text-primary">
                  {fir.lat != null && fir.lng != null
                    ? `Mysuru, Karnataka`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider">{t('fir.viewDetails')}</h4>
          <div className="space-y-3">
            <div className="text-sm">
              <p className="text-text-tertiary">{t('fir.crimeType')}</p>
              <p className="font-medium text-text-primary">{fir.crime_head_name || 'Unknown'}</p>
            </div>
            <div className="text-sm">
              <p className="text-text-tertiary">{t('fir.station')}</p>
              <p className="font-medium text-text-primary">{fir.station_name || `Station #${fir.station_id}`}</p>
            </div>
            {fir.created_at && (
              <div className="text-sm">
                <p className="text-text-tertiary">{t('fir.created_at')}</p>
                <p className="font-medium text-text-primary">{new Date(fir.created_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-3 border-t border-border-primary bg-bg-tertiary flex gap-2">
        <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-[rgba(0,212,255,0.15)] text-white hover:bg-[rgba(0,212,255,0.08)] transition-colors">
          Update Status
        </button>
        <button className="px-3 py-1.5 text-xs font-medium rounded-md border border-border-primary text-text-secondary hover:bg-bg-card transition-colors">
          View Timeline
        </button>
      </div>
    </div>
  );
}
