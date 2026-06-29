import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notifications';
import { useAuthStore } from '@/stores/authStore';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId?: string) => ['notifications', 'list', userId ?? 'anon'] as const,
  unread: (userId?: string) => ['notifications', 'unread-count', userId ?? 'anon'] as const,
};

export function useNotificationsQuery(enabled = true) {
  const userId = useAuthStore((s) => s.user?._id);
  return useQuery({
    queryKey: notificationKeys.list(userId),
    queryFn: () => fetchNotifications(1, 40),
    enabled: enabled && Boolean(userId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useMarkNotificationReadMutation() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?._id);
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
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
      void qc.invalidateQueries({ queryKey: notificationKeys.list(userId) });
      void qc.invalidateQueries({ queryKey: notificationKeys.unread(userId) });
    },
  });
}
