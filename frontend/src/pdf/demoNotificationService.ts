/**
 * Demo-mode notification service.
 *
 * In a real deployment, the backend creates a DB row for each notification
 * and the poller in NotificationsDropdown picks it up.  In demo mode there is
 * no backend, so we store notifications in localStorage under a well-known
 * key so the dropdown can read them.
 *
 * The structure mirrors what the backend API returns so the existing
 * Notification type and dropdown renderer work unchanged.
 */

import type { Notification } from '@/types';

const STORAGE_KEY = 'nj_demo_notifications';

// ── In-memory read-through cache ────────────────────────────────────

function readAll(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAll(items: Notification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage full or unavailable — silently discard
  }
}

// ── Public API ──────────────────────────────────────────────────────

/** Add a notification to the demo store and return it. */
export function addDemoNotification(
  notification: Omit<Notification, 'id' | 'created_at'> & { id?: string; created_at?: string },
): Notification {
  const items = readAll();
  const n: Notification = {
    ...notification,
    id: notification.id ?? `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: notification.created_at ?? new Date().toISOString(),
  };
  // Prepend so newest is first
  writeAll([n, ...items]);
  return n;
}

/** Get all demo notifications (newest first). */
export function getDemoNotifications(): Notification[] {
  return readAll();
}

/** Mark a demo notification as read. */
export function markDemoNotificationRead(id: string): void {
  const items = readAll();
  const idx = items.findIndex((n) => n.id === id);
  if (idx !== -1) {
    items[idx].is_read = true;
    writeAll(items);
  }
}

/** Mark all demo notifications as read. */
export function markAllDemoNotificationsRead(): number {
  const items = readAll();
  let count = 0;
  for (const n of items) {
    if (!n.is_read) {
      n.is_read = true;
      count++;
    }
  }
  writeAll(items);
  return count;
}

/** Get unread count. */
export function getDemoUnreadCount(): number {
  return readAll().filter((n) => !n.is_read).length;
}

/**
 * Create a PDF-export notification for the downloading officer's
 * superior(s).  Returns the list of created notifications.
 */
export function createPdfExportNotifications(
  superiorRoles: string[],
  officerRoleLabel: string,
  officerName: string,
  firNumber: string,
  firCrimeType: string,
): Notification[] {
  if (superiorRoles.length === 0) return [];

  const now = new Date().toISOString();
  const ts = Date.now();

  return superiorRoles.map((_, i) => {
    const notification: Notification = {
      id: `pdf-${ts}-${i}`,
      type: 'alert',
      title: 'PDF Report Downloaded',
      message: `${officerRoleLabel} ${officerName} has downloaded the FIR report for ${firNumber} (${firCrimeType}). Review the case details.`,
      severity: 'medium',
      is_read: false,
      created_at: now,
      related_entity_type: 'fir',
      related_entity_id: firNumber,
      deep_link: `/firs/${firNumber}`,
    };
    addDemoNotification(notification);
    return notification;
  });
}
