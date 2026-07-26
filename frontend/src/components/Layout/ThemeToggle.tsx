import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { UtilityIconButton } from './UtilityIconButton';

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();

  return (
    <UtilityIconButton
      icon={theme === 'dark' ? Moon : Sun}
      label={t('settings.toggleTheme', { defaultValue: 'Toggle theme' })}
      active={theme === 'dark'}
      title={theme === 'dark' ? t('settings.switchToLight', { defaultValue: 'Switch to light mode' }) : t('settings.switchToDark', { defaultValue: 'Switch to dark mode' })}
      onClick={toggle}
      className="hidden sm:inline-flex"
    />
  );
}
