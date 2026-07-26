import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UtilityIconButton } from '@/components/Layout/UtilityIconButton';

export function SettingsIcon() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <UtilityIconButton
      icon={Settings}
      label={t('settings.title', { defaultValue: 'Settings' })}
      onClick={() => navigate('/settings')}
    />
  );
}
