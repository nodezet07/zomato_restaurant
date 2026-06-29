import { apiFetch } from '@/lib/api';

export type PortalNotification = {
  _id: string;
  notificationType: string;
  title: string;
  message: string;
  isRead: boolean;
  sentAt: string;
  redirectType?: string;
  redirectId?: string;
};

type NotificationsResponse = {
  data?: {
    notifications: PortalNotification[];
    pagination?: { total: number };
  };
};

export async function fetchNotifications(page = 1, limit = 20) {
  const body = await apiFetch<NotificationsResponse>(`/notifications?page=${page}&limit=${limit}`);
  return body.data?.notifications ?? [];
}

export async function markNotificationRead(notificationId: string) {
  return apiFetch(`/notifications/read/${notificationId}`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  return apiFetch('/notifications/read-all', { method: 'PATCH' });
}

export async function fetchUnreadNotificationCount() {
  const items = await fetchNotifications(1, 50);
  return items.filter((n) => !n.isRead).length;
}

export async function registerDeviceToken(token: string, platform: 'android' | 'ios' | 'web') {
  return apiFetch('/notifications/device-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
}

export async function unregisterDeviceToken(token: string) {
  return apiFetch('/notifications/device-token', {
    method: 'DELETE',
    body: JSON.stringify({ token }),
  });
}
