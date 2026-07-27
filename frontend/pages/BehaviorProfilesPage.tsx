import { useState } from 'react';
import { Search, Users, AlertTriangle } from 'lucide-react';
import { BehaviorProfile } from '@/components/Intelligence/BehaviorProfile';
import { LoadingSpinner } from '@/components/Common/LoadingSpinner';
import { JurisdictionBanner } from '@/components/Common/JurisdictionBanner';
import { useJurisdiction } from '@/hooks/useJurisdiction';
import { getBehaviorProfile } from '@/api/intelligence';
import type { BehaviorProfile as BehaviorProfileType } from '@/types';
import { useTranslation } from 'react-i18next';

export function BehaviorProfilesPage() {
  const { t } = useTranslation();
  const jurisdiction = useJurisdiction();
  const [query, setQuery] = useState('');
  const [profile, setProfile] = useState<BehaviorProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await getBehaviorProfile(query.trim());
      setProfile(data);
    } catch (err) {
      setError((err as Error).message);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <JurisdictionBanner scope={jurisdiction} />
      <div className="bg-bg-card rounded-xl border border-border-primary p-5">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
          <h3 className="font-semibold text-text-primary">{t('profiles.searchTitle')}</h3>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('profiles.searchPlaceholder')}
            className="flex-1 px-4 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            disabled={!query.trim() || isLoading}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 hover:opacity-80 disabled:opacity-50"
            style={{ background: 'rgba(0, 212, 255, 0.15)' }}
          >
            <Search className="w-4 h-4" />
            {t('profiles.search')}
          </button>
        </div>
      </div>

      {isLoading && <LoadingSpinner message={t('profiles.loading')} />}

      {error && (
        <div className="alert-error flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Unable to load behavior profile. Please try again.
        </div>
      )}

      {profile && <BehaviorProfile data={profile} />}

      {!profile && !isLoading && !error && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-text-secondary mx-auto mb-3" />
          <p className="text-text-tertiary">{t('profiles.noResults')}</p>
        </div>
      )}
    </div>
  );
}
