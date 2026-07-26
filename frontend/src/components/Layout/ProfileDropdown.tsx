import { useState } from 'react';
import { User, LogOut, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dropdown } from '@/components/Common/Dropdown';
import { RankBadge } from '@/components/Common/RankBadge';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/design-system/utils/cn';
import { useAuth } from '@/hooks/useAuth';

export function ProfileDropdown() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { getPrimaryRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const displayName = user?.name || user?.username || 'User';
  const initial = displayName[0].toUpperCase();
  const userRole = getPrimaryRole();

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const trigger = (
    <button
      type="button"
      onClick={() => setIsOpen((open) => !open)}
      className={cn(
        'flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-md',
        'text-text-secondary hover:text-text-primary hover:bg-hover-bg',
        'transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-service-blue/40',
        isOpen && 'bg-service-blue/10 text-text-primary',
      )}
      aria-label={t('profile.menu')}
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      <div className="w-7 h-7 rounded-full bg-service-blue/20 border border-service-blue/30 flex items-center justify-center shrink-0">
        <span className="text-xs font-semibold font-mono text-service-blue">{initial}</span>
      </div>
      <span className="hidden sm:block text-xs font-medium max-w-[120px] truncate">
        {user?.name || user?.username || 'User'}
      </span>
    </button>
  );

  return (
    <Dropdown trigger={trigger} isOpen={isOpen} onToggle={setIsOpen}>
      <div className="px-3 py-2.5 border-b border-border-primary">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-service-blue/20 border border-service-blue/30 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold font-mono text-service-blue">{initial}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{user?.name || user?.username || 'User'}</p>
            <RankBadge role={userRole} expanded={false} />
          </div>
        </div>
      </div>

      <div className="py-1">
        {[
          { icon: User, label: t('profile.viewProfile'), path: '/settings' },
        ].map(({ icon: Icon, label, path }) => (
          <button
            key={path}
            type="button"
            onClick={() => handleNavigate(path)}
            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 text-text-primary hover:bg-hover-bg transition-colors duration-fast"
            role="menuitem"
          >
            <Icon className="w-4 h-4 text-text-tertiary" strokeWidth={1.75} aria-hidden />
            {label}
          </button>
        ))}
        {user?.roles?.includes('ADMIN') && (
          <button
            type="button"
            onClick={() => handleNavigate('/admin')}
            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 text-text-primary hover:bg-hover-bg transition-colors duration-fast"
            role="menuitem"
          >
            <Shield className="w-4 h-4 text-text-tertiary" strokeWidth={1.75} aria-hidden />
            {t('profile.adminPanel')}
          </button>
        )}
      </div>

      <div className="border-t border-border-primary py-1">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 text-alert-red hover:bg-hover-bg transition-colors duration-fast"
          role="menuitem"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} aria-hidden />
          {t('logout.button')}
        </button>
      </div>
    </Dropdown>
  );
}
