import { api } from './client';
import type { Notification } from '@/types';

export async function getNotifications(params?: {
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{
  notifications: Notification[];
  total: number;
  unread_count: number;
}> {
  return api.get('/notifications', params);
}

export async function getUnreadCount(): Promise<{ unread_count: number }> {
  return api.get('/notifications/unread-count');
}

export async function markNotificationRead(notificationId: string): Promise<{ message: string }> {
  return api.put(`/notifications/${notificationId}/read`);
}

export async function markAllRead(): Promise<{ message: string; marked_count: number }> {
  return api.put('/notifications/read-all');
}

/** Create a new notification (for system-generated alerts). */
export async function createNotification(data: {
  type: string;
  title: string;
  message: string;
  severity: string;
  user_id?: string;
  deep_link?: string;
  related_entity_type?: string;
  related_entity_id?: string;
}): Promise<{ notification: Notification; message: string }> {
  return api.post('/notifications', data);
}
