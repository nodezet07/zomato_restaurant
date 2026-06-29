import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type PortalNotification,
} from '@/services/notifications';
import {
  getNotificationFeed,
  isSyntheticNotificationId,
  loadPersistedNotifications,
  resolveNotifications,
  writeNotificationCache,
} from '@/lib/notificationCache';
import { useAuthStore } from '@/stores/authStore';
import { useAuthReady } from '@/hooks/useAuthReady';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId?: string) => ['notifications', 'list', userId ?? 'anon'] as const,
  unread: (userId?: string) => ['notifications', 'unread-count', userId ?? 'anon'] as const,
};

export function useNotificationsQuery(enabled = true) {
  const userId = useAuthStore((s) => s.user?._id);
  const qc = useQueryClient();
  const isNative = Capacitor.isNativePlatform();
  const active = enabled && Boolean(userId);

  return useQuery({
    queryKey: notificationKeys.list(userId),
    queryFn: async () => {
      if (!userId) return [];

      const memory =
        qc.getQueryData<PortalNotification[]>(notificationKeys.list(userId)) ??
        loadPersistedNotifications(userId);

      try {
        const apiItems = await fetchNotifications(1, 40);
        return resolveNotifications(userId, apiItems, memory);
      } catch {
        const merged = resolveNotifications(userId, [], memory);
        return merged.length > 0 ? merged : loadPersistedNotifications(userId);
      }
    },
    enabled: active,
    refetchInterval: active ? (isNative ? 30_000 : 60_000) : false,
    refetchOnMount: 'always',
    staleTime: isNative ? 10_000 : 30_000,
    retry: 1,
    throwOnError: false,
  });
}

/** Bell + notifications page — reads React Query cache (same on web + APK). */
export function useNotificationFeed(enabled = true) {
  const authReady = useAuthReady();
  const userId = useAuthStore((s) => s.user?._id);
  const qc = useQueryClient();
  const listQ = useNotificationsQuery(enabled && authReady);

  const items = getNotificationFeed(qc, userId, listQ.data);
  const unread = items.filter((n) => !n.isRead).length;
  const loading = listQ.isPending && items.length === 0;

  return { ...listQ, items, unread, loading };
}

export function useMarkNotificationReadMutation() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?._id);
  return useMutation({
    mutationFn: (id: string) => {
      if (isSyntheticNotificationId(id)) return Promise.resolve();
      return markNotificationRead(id);
    },
    onSuccess: (_, id) => {
      if (!userId) return;

      if (isSyntheticNotificationId(id)) {
        const next = (
          qc.getQueryData<PortalNotification[]>(notificationKeys.list(userId)) ??
          loadPersistedNotifications(userId)
        ).map((n) => (n._id === id ? { ...n, isRead: true } : n));
        writeNotificationCache(qc, userId, next);
        return;
      }
      void qc.invalidateQueries({ queryKey: notificationKeys.list(userId) });
      void qc.invalidateQueries({ queryKey: notificationKeys.unread(userId) });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?._id);
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      if (!userId) return;
      const current =
        qc.getQueryData<PortalNotification[]>(notificationKeys.list(userId)) ??
        loadPersistedNotifications(userId);
      writeNotificationCache(
        qc,
        userId,
        current.map((n) => ({ ...n, isRead: true })),
      );
      void qc.invalidateQueries({ queryKey: notificationKeys.list(userId) });
      void qc.invalidateQueries({ queryKey: notificationKeys.unread(userId) });
    },
  });
}
