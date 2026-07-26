import { useState } from 'react';
import { Bell, LogOut, User, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/Common/Modal';
import { RANK_CONFIG, type KSPRole } from '@/config/navConfig';
import { ROLE_CONFIGS } from '@/auth/constants/roleConfig';
import LanguageSwitch from '@/components/voice/LanguageSwitch';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Map internal role to proper police rank display name (e.g. "Superintendent of Police (SP)")
  const userRole = (user?.roles?.[0] ?? 'OFFICER') as KSPRole;
  const rankConfig = RANK_CONFIG[userRole] || RANK_CONFIG.OFFICER;
  const roleAbbrev = ROLE_CONFIGS.find((r) => r.value === userRole)?.abbrev || 'PC';
  const rankDisplay = `${rankConfig.label} (${roleAbbrev})`;

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <header className="h-14 sm:h-16 bg-bg-card border-b border-border-primary flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src="/app/nj-logo.png" alt="Neural Justice" className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain" />
          <h1 className="text-base sm:text-lg font-semibold text-text-primary truncate max-w-[120px] sm:max-w-[200px]">{title}</h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
          <LanguageSwitch
            language={i18n.language}
            onChange={handleLanguageChange}
          />
          <button aria-label={t('header.notifications')} className="relative p-1.5 sm:p-2 rounded-lg hover:bg-hover-bg transition-colors btn-press">
            <Bell className="w-4 h-4 sm:w-5 md:w-5 text-text-tertiary" aria-hidden="true" />
            <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-1.5 sm:w-2 h-1.5 sm:h-2 bg-nj-critical rounded-full" />
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            {user?.profile_picture ? (
              <img
                src={user.profile_picture}
                alt="Profile"
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-nj-blue flex items-center justify-center">
                <User className="w-3 sm:w-3.5 md:w-4 h-3 sm:h-3.5 md:h-4 text-white" />
              </div>
            )}
            <div className="hidden sm:block">
              <p className="font-medium text-text-primary truncate max-w-[80px]">{user?.name || user?.username || 'User'}</p>
              <p className="text-[10px] sm:text-xs text-text-tertiary truncate max-w-[80px]">{rankDisplay}</p>
            </div>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-hover-bg transition-colors text-text-tertiary hover:text-nj-critical btn-press"
            aria-label={t('header.logout')}
            title={t('header.logout')}
          >
            <LogOut className="w-4 h-4 sm:w-5 md:w-5" aria-hidden="true" />
          </button>
        </div>

      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title={t('logout.title')}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-card border border-border-primary rounded-lg hover:bg-hover-bg btn-press"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-white bg-nj-critical rounded-lg hover:bg-red-700 btn-press"
            >
              {t('logout.button')}
            </button>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-text-secondary">
              {t('logout.message')}
            </p>
          </div>
        </div>
      </Modal>
    </header>
  );
}
