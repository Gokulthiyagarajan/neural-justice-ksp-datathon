import { Menu, Globe, Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle';
import { Modal } from '../Common/Modal';
import { SettingsIcon } from '../Common/SettingsIcon';
import { BloomSearch } from '../Common/BloomSearch';
import { NotificationsDropdown } from './NotificationsDropdown';
import { ProfileDropdown } from './ProfileDropdown';
import { UtilityIconButton } from './UtilityIconButton';
import { cn } from '@/design-system/utils/cn';

interface TopCommandBarProps {
  onMenuClick: () => void;
}

export default function TopCommandBar({ onMenuClick }: TopCommandBarProps) {
  const { t, i18n } = useTranslation();
  const logout = useAuthStore((s) => s.logout);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const currentLang = i18n.language?.startsWith('kn') ? 'kn' : 'en';

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setShowLangMenu(false);
  };

  useEffect(() => {
    if (!showLangMenu) return;
    const onOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLangMenu(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [showLangMenu]);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 h-12 sm:h-14 z-50 border-b border-border-secondary bg-bg-header/95 backdrop-blur-md"
      >
        <div className="h-full px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <UtilityIconButton
              icon={Menu}
              label={t('a11y.toggleMenu')}
              onClick={onMenuClick}
              className="sm:hidden"
            />
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <img src="/app/nj-logo.png" alt="Neural Justice" className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain shrink-0" />
              <span className="text-xs sm:text-sm font-semibold font-display text-text-primary hidden sm:block truncate">
                {t('app.title')}
              </span>
            </div>
            <div className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-verified-green/10 border border-verified-green/25">
              <span className="relative flex h-1.5 sm:h-2 w-1.5 sm:w-2" aria-hidden>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-verified-green opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 sm:h-2 w-1.5 sm:w-2 bg-verified-green" />
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-verified-green">{t('status.aiActive')}</span>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-2">
            <BloomSearch />
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <div className="relative" ref={langRef}>
              <UtilityIconButton
                icon={Globe}
                label={t('common.language', { defaultValue: 'Language' })}
                active={showLangMenu}
                aria-expanded={showLangMenu}
                aria-haspopup="listbox"
                onClick={() => setShowLangMenu((open) => !open)}
              >
                <span className="text-[10px] sm:text-[11px] font-semibold font-mono uppercase tracking-wide">
                  {currentLang === 'kn' ? 'KN' : 'EN'}
                </span>
              </UtilityIconButton>
              {showLangMenu && (
                <div
                  className="absolute right-0 top-full mt-1 z-50 min-w-[140px] sm:min-w-[148px] py-1 bg-bg-secondary border border-border-primary rounded-md shadow-floating animate-panel-enter motion-reduce:animate-none"
                  role="listbox"
                  aria-label={t('common.language')}
                >
                  {[
                    { code: 'en', flag: '🇬🇧', label: 'English' },
                    { code: 'kn', flag: '🇮🇳', label: 'ಕನ್ನಡ' },
                  ].map(({ code, flag, label }) => (
                    <button
                      key={code}
                      type="button"
                      role="option"
                      aria-selected={currentLang === code}
                      onClick={() => changeLanguage(code)}
                      className={cn(
                        'w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 hover:bg-hover-bg transition-colors duration-fast',
                        currentLang === code && 'bg-service-blue/10',
                      )}
                    >
                      <span className="w-4 sm:w-5 text-center" aria-hidden>{flag}</span>
                      <span className="font-medium text-text-primary flex-1">{label}</span>
                      {currentLang === code && (
                        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-service-blue" strokeWidth={2} aria-hidden />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ThemeToggle />
            <SettingsIcon />
            <NotificationsDropdown />

            <div className="h-4 w-px bg-border-primary mx-1 sm:mx-1.5 hidden sm:block" aria-hidden />

            <ProfileDropdown />
          </div>
        </div>
      </header>

      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title={t('logout.title')}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowLogoutModal(false)} className="btn-secondary btn-sm">
              {t('common.cancel')}
            </button>
            <button type="button" onClick={logout} className="btn-danger btn-sm">
              {t('logout.button')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-text-secondary">{t('logout.message')}</p>
      </Modal>
    </>
  );
}
