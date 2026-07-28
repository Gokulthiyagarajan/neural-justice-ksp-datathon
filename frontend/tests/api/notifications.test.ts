// Frontend API client tests for notifications service.
//
// Tests all notification-related API endpoints:
// - GET /api/notifications (with filters/pagination)
// - GET /api/notifications/unread-count
// - POST /api/notifications/{id}/read
// - POST /api/notifications/{id}/acknowledge
// - POST /api/notifications/mark-all-read
//
// Tests HTTP method consistency, error handling, and API client integration.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFuture, MockHttpClient } from './__mocks__/test-utils';
import * as apiClient from '../notifications';
import type { Notification } from '@/types';

// Mock the HTTP client
vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockApi = await import('./client');

describe('Notifications API Client', () => {
  const mockGet = mockApi.default.get as any;
  const mockPost = mockApi.default.post as any;

  beforeEach(() => {
    mockGet.mockClear();
    mockPost.mockClear();
  });

  describe('getNotifications', () => {
    it('should call GET /api/notifications with default parameters', async () => {
      const mockResponse = {
        notifications: [],
        total: 0,
        unread_count: 0,
      };

      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await apiClient.getNotifications();

      expect(mockGet).toHaveBeenCalledWith('/notifications');
      expect(result).toEqual(mockResponse);
    });

    it('should call GET /api/notifications with query parameters', async () => {
      const mockResponse = {
        notifications: [],
        total: 5,
        unread_count: 2,
      };

      mockGet.mockResolvedValueOnce(mockResponse);

      const params = { unread_only: true, limit: 10 };
      const result = await apiClient.getNotifications(params);

      expect(mockGet).toHaveBeenCalledWith('/notifications', params);
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('Failed to fetch notifications');
      mockGet.mockRejectedValueOnce(error);

      await expect(apiClient.getNotifications()).rejects.toThrow(
        'Failed to fetch notifications'
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should call GET /api/notifications/unread-count', async () => {
      const mockResponse = { unread_count: 3 };

      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await apiClient.getUnreadCount();

      expect(mockGet).toHaveBeenCalledWith('/notifications/unread-count');
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const error = new Error('Failed to fetch unread count');
      mockGet.mockRejectedValueOnce(error);

      await expect(apiClient.getUnreadCount()).rejects.toThrow(
        'Failed to fetch unread count'
      );
    });
  });

  describe('markNotificationRead', () => {
    it('should call POST /api/notifications/{id}/read', async () => {
      const mockResponse = { message: 'Notification marked as read' };

      mockPost.mockResolvedValueOnce(mockResponse);

      const notificationId = '123';
      const result = await apiClient.markNotificationRead(notificationId);

      expect(mockPost).toHaveBeenCalledWith(
        '/notifications/123/read'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const error = new Error('Failed to mark notification as read');
      mockPost.mockRejectedValueOnce(error);

      await expect(
        apiClient.markNotificationRead('123')
      ).rejects.toThrow('Failed to mark notification as read');
    });
  });

  describe('markAllRead', () => {
    it('should call POST /api/notifications/mark-all-read', async () => {
      const mockResponse = { message: 'All notifications marked as read', marked_count: 15 };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await apiClient.markAllRead();

      expect(mockPost).toHaveBeenCalledWith('/notifications/mark-all-read');
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const error = new Error('Failed to mark all notifications as read');
      mockPost.mockRejectedValueOnce(error);

      await expect(apiClient.markAllRead()).rejects.toThrow(
        'Failed to mark all notifications as read'
      );
    });
  });

  describe('createNotification', () => {
    it('should call POST /api/notifications with notification data', async () => {
      const mockNotification: Notification = {
        id: 'notif-001',
        type: 'alert',
        title: 'Test Alert',
        message: 'This is a test notification',
        severity: 'critical',
        is_read: false,
        created_at: new Date().toISOString(),
        related_entity_type: 'fir',
        related_entity_id: 'fir-123',
        deep_link: '/fir/fir-123',
        priority: 'urgent',
        triggered_by: 'system',
        fir_reference: 'FIR-2026-001',
        crime_type: 'theft',
        status: 'open',
      };

      const mockResponse = {
        notification: mockNotification,
        message: 'Notification created successfully',
      };

      const notificationData = {
        type: 'alert',
        title: 'Test Alert',
        message: 'This is a test notification',
        severity: 'critical',
        user_id: 'user-123',
        deep_link: '/fir/fir-123',
        related_entity_type: 'fir',
        related_entity_id: 'fir-123',
      };

      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await apiClient.createNotification(notificationData);

      expect(mockPost).toHaveBeenCalledWith('/notifications', notificationData);
      expect(result).toEqual(mockResponse);
      expect(result.notification).toEqual(mockNotification);
    });

    it('should handle API errors', async () => {
      const error = new Error('Failed to create notification');
      mockPost.mockRejectedValueOnce(error);

      const notificationData = {
        type: 'alert',
        title: 'Test Alert',
        message: 'This is a test notification',
        severity: 'critical',
      };

      await expect(
        apiClient.createNotification(notificationData)
      ).rejects.toThrow('Failed to create notification');
    });
  });

  describe('acknowledgeNotification', () => {
    it('should call POST /api/notifications/{id}/acknowledge', async () => {
      const mockResponse = { message: 'Notification acknowledged' };

      mockPost.mockResolvedValueOnce(mockResponse);

      const notificationId = '456';
      const result = await apiClient.acknowledgeNotification(notificationId);

      expect(mockPost).toHaveBeenCalledWith(
        '/notifications/456/acknowledge'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const error = new Error('Failed to acknowledge notification');
      mockPost.mockRejectedValueOnce(error);

      await expect(
        apiClient.acknowledgeNotification('456')
      ).rejects.toThrow('Failed to acknowledge notification');
    });
  });
});
