import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
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

  const navItems = getNavForRole(userRole);

  const groups = navItems.reduce<Array<{ label: string; items: NavItem[] }>>((acc, item) => {
    const existing = acc.find((g) => g.label === item.group);
    if (existing) {
      existing.items.push(item);
    } else {
      acc.push({ label: item.group, items: [item] });
    }
    return acc;
  }, []);

  // Desktop: expanded when hovered OR explicitly toggled open
  // Tablet/mobile: expanded only when explicitly toggled
  const isDesktopExpanded = isExpanded || hovered;
  // On mobile the drawer shows when isExpanded; on tablet the sidebar is always static (icon-only)
  const showLabels = isDesktopExpanded;

  return (
    <>
      {/* ── Mobile overlay backdrop ─── */}
      {isExpanded && (
        <button
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
          onClick={onToggle}
          aria-label={t('sidebar.close')}
          tabIndex={-1}
        />
      )}

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        id="app-sidebar"
        aria-label={t('sidebar.label', { defaultValue: 'Main navigation' })}
        className={[
          'flex flex-col z-30',
          'transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          // Mobile: fixed overlay drawer
          'fixed inset-y-0 left-0',
          // Slide in/out on mobile only
          isExpanded ? 'translate-x-0' : '-translate-x-full',
          // Tablet (md): always visible, always icon-only — override translate
          'md:relative md:translate-x-0 md:inset-auto',
          // Width: mobile full when open, tablet icon-only, desktop expands on hover
          isExpanded ? 'w-56' : 'w-0 md:w-14',
          isDesktopExpanded ? 'md:w-56 lg:w-56' : 'md:w-14',
        ].join(' ')}
        style={{
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-secondary)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* ── Header ─────────────────── */}
        <div className="h-14 flex items-center px-3 border-b border-border-secondary shrink-0">
          {showLabels || isExpanded ? (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <img src="/app/nj-logo.png" alt="Neural Justice" className="w-8 h-8 object-contain shrink-0" />
              <span className="text-sm font-semibold font-display text-text-primary truncate">
                {t('app.title')}
              </span>
            </div>
          ) : (
            <img src="/app/nj-logo.png" alt="Neural Justice" className="w-8 h-8 object-contain mx-auto" />
          )}

          {/* Desktop collapse/expand toggle */}
          <button
            onClick={onToggle}
            className={[
              'hidden lg:flex items-center justify-center w-7 h-7 rounded-md shrink-0',
              'transition-colors duration-fast text-text-tertiary',
              'hover:text-text-primary hover:bg-hover-bg',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-service-blue/40',
              showLabels ? 'ml-1' : 'mx-auto',
            ].join(' ')}
            aria-label={showLabels ? t('sidebar.collapse') : t('sidebar.expand')}
            aria-expanded={showLabels}
          >
            {showLabels ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {/* Mobile close button */}
          <button
            onClick={onToggle}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-md ml-auto transition-colors text-text-tertiary hover:text-text-primary hover:bg-hover-bg"
            aria-label={t('sidebar.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Rank badge ──────────────── */}
        {showLabels || isExpanded ? (
          <RankBadge role={userRole} userName={user?.name || user?.username} expanded />
        ) : (
          <div className="px-3 py-3 mb-2">
            <RankBadge role={userRole} expanded={false} />
          </div>
        )}

        {/* ── Nav ─────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4" aria-label="Navigation menu">
          {groups.map((group) => (
            <div key={group.label}>
              {(showLabels || isExpanded) && (
                <p className="text-[10px] font-semibold uppercase tracking-console px-2 mb-1.5 font-mono text-text-tertiary">
                  {t(group.label)}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={`${item.label}-${item.path}`}
                    to={item.path}
                    onClick={() => {
                      if (isExpanded) onToggle();
                    }}
                    end={item.path === '/'}
                    title={!(showLabels || isExpanded) ? item.label : undefined}
                    className={({ isActive }) =>
                      [
                        'flex items-center min-h-[44px] px-3 rounded-md text-xs font-medium',
                        'transition-all duration-200 ease-out',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-service-blue/40',
                        (showLabels || isExpanded) ? 'gap-2.5' : 'justify-center gap-0',
                        isActive
                          ? 'text-text-primary bg-service-blue/12 border-l-2 border-l-service-blue shadow-[inset_0_0_12px_rgba(62,110,150,0.08)]'
                          : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg border-l-2 border-l-transparent hover:border-l-service-blue/30',
                      ].join(' ')
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                    {(showLabels || isExpanded) && (
                      <span className="text-[11px] sm:text-xs truncate">{item.label}</span>
                    )}
                    {(showLabels || isExpanded) && item.badge === 'alerts' && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-alert-red animate-pulse" aria-hidden />
                    )}
                    {(showLabels || isExpanded) && item.badge === 'notifications' && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-signal-amber" aria-hidden />
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
