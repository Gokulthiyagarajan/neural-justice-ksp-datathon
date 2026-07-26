import { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, Check, AlertTriangle, Info, BellDot, FileText, Shield, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UtilityIconButton } from '@/components/Layout/UtilityIconButton';
import { Skeleton } from '@/design-system/components/Skeleton';
import { getNotifications, getUnreadCount, markNotificationRead, markAllRead } from '@/api/notifications';
import {
  getDemoNotifications,
  getDemoUnreadCount,
  markDemoNotificationRead,
  markAllDemoNotificationsRead,
} from '@/pdf/demoNotificationService';
import type { Notification } from '@/types';
import { useNavigate } from 'react-router-dom';

const DRAWER_WIDTH = 380;
const POLL_INTERVAL = 30_000; // 30 seconds
const MAX_VISIBLE_NOTIFICATIONS = 5;

/** Simple hook to detect mobile viewport */
function useIsMobile(breakpoint = 640): boolean {
  const [mobile, setMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return mobile;
}

/** Format relative time (e.g., "2m ago", "1h ago", "3d ago") */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

/** Get notification type icon */
function getTypeIcon(type: string) {
  switch (type) {
    case 'case':
      return <FileText className="w-3 h-3" strokeWidth={2} aria-hidden />;
    case 'warning':
      return <AlertTriangle className="w-3 h-3" strokeWidth={2} aria-hidden />;
    case 'system':
      return <Shield className="w-3 h-3" strokeWidth={2} aria-hidden />;
    default:
      return <Bell className="w-3 h-3" strokeWidth={2} aria-hidden />;
  }
}

export function NotificationsDropdown() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile(640);

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // ── Offline detection ─────────────────────────────────────────────────────

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => {
      setIsOffline(false);
      retryCountRef.current = 0;
      loadUnreadCount();
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadNotifications = useCallback(async () => {
    // Abort any in-flight request to prevent duplicates
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    const token = localStorage.getItem('auth_token');
    const isDemo = token === 'demo-session';

    try {
      if (isDemo) {
        const demo = getDemoNotifications();
        setNotifications(demo.slice(0, MAX_VISIBLE_NOTIFICATIONS));
        setUnreadCount(getDemoUnreadCount());
      } else {
        const res = await getNotifications({ limit: MAX_VISIBLE_NOTIFICATIONS });
        if (!controller.signal.aborted) {
          setNotifications(res.notifications.slice(0, MAX_VISIBLE_NOTIFICATIONS));
          setUnreadCount(res.unread_count);
        }
      }
      retryCountRef.current = 0;
    } catch (err) {
      if (controller.signal.aborted) return;
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        setTimeout(() => { if (!controller.signal.aborted) loadNotifications(); }, 2000);
      } else {
        setError((err as Error).message || 'Failed to load notifications');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    if (!navigator.onLine) return;
    const token = localStorage.getItem('auth_token');
    const isDemo = token === 'demo-session';

    try {
      if (isDemo) {
        setUnreadCount(getDemoUnreadCount());
      } else {
        const res = await getUnreadCount();
        setUnreadCount(res.unread_count);
      }
      retryCountRef.current = 0;
    } catch {
      // Graceful fallback: keep last known count
    }
  }, []);

  // Poll unread count every 30 seconds with duplicate prevention
  useEffect(() => {
    loadUnreadCount();
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(loadUnreadCount, POLL_INTERVAL);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    if (isOpen) loadNotifications();
  }, [isOpen, loadNotifications]);

  // ── Drawer open/close with animation ─────────────────────────────────────

  const open = useCallback(() => {
    setAnimating(true);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setAnimating(false);
    // Wait for slide-out animation (200ms) before unmounting
    setTimeout(() => setIsOpen(false), 200);
    // Restore focus to trigger
    triggerRef.current?.focus();
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) handleClose();
    else open();
  }, [isOpen, open, handleClose]);

  // ── Click outside & escape ────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    // Delay adding listener to avoid immediate close from open click
    const raf = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleClose]);

  // ── Focus trap ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;
    const first = drawerRef.current.querySelector<HTMLElement>('button, [href], input');
    first?.focus();
  }, [isOpen]);

  // ── Notification actions ──────────────────────────────────────────────────

  const handleMarkRead = useCallback(async (id: string) => {
    const isDemo = localStorage.getItem('auth_token') === 'demo-session';
    try {
      if (isDemo) {
        markDemoNotificationRead(id);
      } else {
        await markNotificationRead(id);
      }
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    const isDemo = localStorage.getItem('auth_token') === 'demo-session';
    try {
      if (isDemo) {
        markAllDemoNotificationsRead();
      } else {
        await markAllRead();
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, []);

  const handleClick = useCallback(
    (notification: Notification) => {
      if (!notification.is_read) handleMarkRead(notification.id);
      if (notification.deep_link) {
        navigate(notification.deep_link);
        handleClose();
      }
    },
    [handleMarkRead, navigate, handleClose],
  );

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-alert-red" strokeWidth={1.75} aria-hidden />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-signal-amber" strokeWidth={1.75} aria-hidden />;
      case 'medium':
        return <Info className="w-4 h-4 text-service-blue" strokeWidth={1.75} aria-hidden />;
      default:
        return <Info className="w-4 h-4 text-text-tertiary" strokeWidth={1.75} aria-hidden />;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Bell trigger */}
      <UtilityIconButton
        ref={triggerRef}
        icon={Bell}
        label={t('notifications.label', { defaultValue: 'Notifications' })}
        badge={unreadCount}
        active={isOpen}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={toggle}
      />

      {/* Backdrop — only when open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 animate-fade-in motion-reduce:animate-none"
          style={{ background: 'rgba(8, 12, 20, 0.5)' }}
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* ── Drawer / Bottom Sheet ───────────────────────────────────────── */}

      {isOpen && !isMobile && (
        /* ── Desktop: Compact right-side drawer ── */
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('notifications.title')}
          className={`fixed top-0 right-0 z-50 flex flex-col bg-bg-secondary border-l border-border-primary shadow-floating ${
            animating ? 'animate-slide-in-right' : 'animate-slide-out-right'
          } motion-reduce:animate-none`}
          style={{
            width: DRAWER_WIDTH,
            maxHeight: '75vh',
            marginTop: '64px', // align below header
            borderTopLeftRadius: '12px',
            borderBottomLeftRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <NotificationPanel
            notifications={notifications}
            unreadCount={unreadCount}
            loading={loading}
            error={error}
            isMobile={false}
            isOffline={isOffline}
            onClose={handleClose}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onClick={handleClick}
            onRetry={loadNotifications}
            onViewAll={() => { navigate('/notifications'); handleClose(); }}
            getSeverityIcon={getSeverityIcon}
            t={t}
          />
        </div>
      )}

      {isOpen && isMobile && (
        /* ── Mobile: Bottom sheet ── */
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('notifications.title')}
          className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-bg-secondary border-t border-border-primary shadow-floating ${
            animating ? 'animate-slide-up' : 'animate-fade-in'
          } motion-reduce:animate-none`}
          style={{
            maxHeight: '85vh',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            overflow: 'hidden',
          }}
        >
          {/* Drag handle for mobile sheet */}
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <div className="w-8 h-1 rounded-full bg-border-secondary" />
          </div>
          <NotificationPanel
            notifications={notifications}
            unreadCount={unreadCount}
            loading={loading}
            error={error}
            isMobile={true}
            isOffline={isOffline}
            onClose={handleClose}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onClick={handleClick}
            onRetry={loadNotifications}
            onViewAll={() => { navigate('/notifications'); handleClose(); }}
            getSeverityIcon={getSeverityIcon}
            t={t}
          />
        </div>
      )}
    </>
  );
}

// ── Shared panel content (used by both desktop drawer & mobile bottom sheet) ─

interface PanelProps {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  isMobile: boolean;
  isOffline?: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClick: (n: Notification) => void;
  onRetry: () => void;
  onViewAll: () => void;
  getSeverityIcon: (severity: string) => React.ReactNode;
  t: (key: string, opts?: any) => string;
}

function NotificationPanel({
  notifications,
  unreadCount,
  loading,
  error,
  isMobile,
  isOffline,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onClick,
  onRetry,
  onViewAll,
  getSeverityIcon,
  t,
}: PanelProps) {
  return (
    <>
      {/* ── Offline banner ─────────────────────────────────────────────── */}
      {isOffline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-signal-amber/10 border-b border-signal-amber/20 shrink-0">
          <WifiOff className="w-3.5 h-3.5 text-signal-amber" strokeWidth={2} aria-hidden />
          <span className="text-[11px] text-signal-amber font-medium">Offline — showing cached notifications</span>
        </div>
      )}
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-border-primary">
        <div className="flex items-center gap-2">
          <BellDot className="w-4 h-4 text-text-secondary" strokeWidth={1.75} aria-hidden />
          <h3 className="text-sm font-semibold text-text-primary font-display">
            {t('notifications.title')}
          </h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-mono font-semibold text-text-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="text-[11px] text-service-blue hover:underline px-1.5 py-0.5 rounded hover:bg-hover-bg transition-colors"
            >
              {t('notifications.markAllRead')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-hover-bg text-text-tertiary hover:text-text-primary transition-colors"
            aria-label="Close notifications"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ maxHeight: isMobile ? 'calc(85vh - 100px)' : 'calc(75vh - 52px)' }}
      >
        {loading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <AlertTriangle className="w-8 h-8 text-alert-red mb-3" strokeWidth={1.5} aria-hidden />
            <p className="text-sm text-text-tertiary mb-3">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="text-xs text-service-blue hover:underline px-3 py-1 rounded border border-border-secondary hover:bg-hover-bg transition-colors"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : notifications.length === 0 ? (
          /* ── Polished empty state ─────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-text-tertiary" strokeWidth={1.5} aria-hidden />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">
              {t('notifications.emptyTitle', { defaultValue: 'No Notifications' })}
            </p>
            <p className="text-xs text-text-tertiary max-w-[200px]">
              {t('notifications.emptySubtitle', { defaultValue: 'New alerts and activity will appear here.' })}
            </p>
          </div>
        ) : (
          /* ── Notification list ────────────────────────────────────── */
          (() => {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterdayStart = new Date(todayStart.getTime() - 86400000);

            const groups: { label: string; items: Notification[] }[] = [];
            const today = notifications.filter((n) => new Date(n.created_at) >= todayStart);
            const yesterday = notifications.filter((n) => {
              const d = new Date(n.created_at);
              return d >= yesterdayStart && d < todayStart;
            });
            const older = notifications.filter((n) => new Date(n.created_at) < yesterdayStart);

            if (today.length) groups.push({ label: 'Today', items: today });
            if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday });
            if (older.length) groups.push({ label: 'Older', items: older });

            return groups.map((group) => (
              <div key={group.label}>
                <div className="px-4 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-console text-text-tertiary bg-bg-tertiary/50 sticky top-0 z-10">
                  {group.label}
                </div>
                {group.items.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => onClick(notification)}
                    className={`w-full px-4 py-2.5 text-left border-b border-border-secondary last:border-b-0 hover:bg-hover-bg transition-colors duration-fast ${
                      !notification.is_read ? 'bg-service-blue/[0.04]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {getSeverityIcon(notification.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p
                            className={`text-xs font-medium leading-snug truncate ${
                              !notification.is_read ? 'text-text-primary' : 'text-text-secondary'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <span className="shrink-0 text-text-tertiary opacity-60" title={notification.type}>
                            {getTypeIcon(notification.type)}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-tertiary mt-0.5 line-clamp-2 leading-snug">
                          {notification.message}
                        </p>
                        {/* Metadata row: FIR ref, crime type, officer */}
                        {(notification.fir_reference || notification.crime_type || notification.triggered_by) && (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                            {notification.fir_reference && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-service-blue bg-service-blue/10 px-1 py-0.5 rounded">
                                FIR: {notification.fir_reference}
                              </span>
                            )}
                            {notification.crime_type && (
                              <span className="text-[10px] text-text-tertiary bg-bg-tertiary px-1 py-0.5 rounded">
                                {notification.crime_type}
                              </span>
                            )}
                            {notification.triggered_by && (
                              <span className="text-[10px] text-text-tertiary">
                                by {notification.triggered_by}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-[10px] font-mono text-text-tertiary mt-1.5 opacity-70">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkRead(notification.id);
                          }}
                          className="shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center rounded hover:bg-hover-bg transition-colors"
                          aria-label={t('notifications.markRead')}
                        >
                          <Check className="w-3.5 h-3.5 text-service-blue" strokeWidth={2} aria-hidden />
                        </button>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ));
          })()
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      {notifications.length > 0 && (
        <div className="shrink-0 border-t border-border-primary">
          <button
            type="button"
            onClick={onViewAll}
            className="w-full px-4 py-2.5 text-xs text-service-blue hover:bg-hover-bg text-left transition-colors flex items-center gap-1.5"
          >
            <span>{t('notifications.viewAll')}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
