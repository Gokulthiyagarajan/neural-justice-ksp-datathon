import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getNavForRole, type NavItem, type KSPRole } from '@/config/navConfig';
import { useAuthStore } from '@/store/authStore';
import { RankBadge } from '@/components/Common/RankBadge';

interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function Sidebar({ isExpanded, onToggle }: SidebarProps) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const user = useAuthStore((s) => s.user);
  const userRole = (user?.roles?.[0] ?? 'OFFICER') as KSPRole;

  // Filter nav items by the user's role
  const navItems = getNavForRole(userRole);

  // Group items by their `group` translation key
  const groups = navItems.reduce<Array<{ label: string; items: NavItem[] }>>((acc, item) => {
    const existing = acc.find((g) => g.label === item.group);
    if (existing) {
      existing.items.push(item);
    } else {
      acc.push({ label: item.group, items: [item] });
    }
    return acc;
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {isExpanded && (
        <button
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onToggle}
          aria-label={t('sidebar.close')}
        />
      )}

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`fixed lg:static inset-y-0 left-0 z-30
          flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isExpanded ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isExpanded || hovered ? 'w-48 sm:w-56 md:w-64' : 'w-12 sm:w-16 md:w-16'}`}
        style={{
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-secondary)',
        }}
      >
        <div className="h-14 flex items-center px-3 border-b border-border-secondary">
          {(isExpanded || hovered) && (
            <div className="flex items-center gap-2.5 flex-1">
              <img src="/app/nj-logo.png" alt="Neural Justice" className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain" />
              <span className="text-xs sm:text-sm font-semibold font-display text-text-primary">{t('app.title')}</span>
            </div>
          )}
          {!(isExpanded || hovered) && (
            <img src="/app/nj-logo.png" alt="Neural Justice" className="w-8 h-8 object-contain" />
          )}
          <button
            onClick={onToggle}
            className={`hidden sm:flex items-center justify-center w-6 sm:w-7 h-6 sm:h-7 rounded-md transition-colors duration-fast text-text-tertiary hover:text-text-primary hover:bg-hover-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-service-blue/40 ${isExpanded || hovered ? '' : 'mx-auto'}`}
            aria-label={isExpanded || hovered ? t('sidebar.collapse') : t('sidebar.expand')}
          >
            {isExpanded || hovered ? <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          </button>
          {/* Close button for mobile */}
          <button
            onClick={onToggle}
            className="lg:hidden flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-fast text-text-tertiary hover:text-text-primary hover:bg-hover-bg ml-auto"
            aria-label={t('sidebar.close')}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Rank badge — shows who is logged in */}
        {(isExpanded || hovered) ? (
          <RankBadge role={userRole} userName={user?.name || user?.username} expanded />
        ) : (
          <div className="px-3 py-3 mb-2">
            <RankBadge role={userRole} expanded={false} />
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              {(isExpanded || hovered) && (
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-console px-2 mb-1.5 font-mono text-text-tertiary">
                  {t(group.label)}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={`${item.label}-${item.path}`}
                    to={item.path}
                    onClick={() => {
                      // Close sidebar on mobile when a link is clicked
                      if (isExpanded) onToggle();
                    }}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center min-h-12 px-3 rounded-md text-xs font-medium transition-all duration-200 ease-out
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-service-blue/40
                      ${isExpanded || hovered ? 'gap-2.5' : 'justify-center gap-0'}
                      ${isActive
                        ? 'text-text-primary bg-service-blue/12 border-l-2 border-l-service-blue shadow-[inset_0_0_12px_rgba(62,110,150,0.08)]'
                        : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg border-l-2 border-l-transparent hover:border-l-service-blue/30'}`
                    }
                    title={!(isExpanded || hovered) ? item.label : undefined}
                  >
                    <item.icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" strokeWidth={1.75} />
                    {(isExpanded || hovered) && <span className="text-[11px] sm:text-xs">{item.label}</span>}
                    {/* Badge indicator */}
                    {(isExpanded || hovered) && item.badge === 'alerts' && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-alert-red animate-pulse" />
                    )}
                    {(isExpanded || hovered) && item.badge === 'notifications' && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-signal-amber" />
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
