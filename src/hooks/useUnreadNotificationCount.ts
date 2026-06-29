import { useNotificationFeed } from '@/hooks/useNotificationsQuery';

export function useUnreadNotificationCount(enabled = true) {
  const { unread } = useNotificationFeed(enabled);
  return unread;
}
