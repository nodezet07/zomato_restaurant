import { useQuery } from '@tanstack/react-query';
import { fetchNotifications } from '@/services/notifications';
import { useAuthStore } from '@/stores/authStore';

export function useUnreadNotificationCount(enabled = true) {
  const userId = useAuthStore((s) => s.user?._id);
  const q = useQuery({
    queryKey: ['notifications', 'unread-count', userId ?? 'anon'],
    queryFn: async () => {
      const items = await fetchNotifications(1, 50);
      return items.filter((n) => !n.isRead).length;
    },
    enabled: enabled && Boolean(userId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return q.data ?? 0;
}
