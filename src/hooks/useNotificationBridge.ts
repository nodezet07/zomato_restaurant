import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { notificationKeys } from '@/hooks/useNotificationsQuery';
import {
  hydrateNotificationCache,
  loadPersistedNotifications,
  mergeNotificationLists,
  resolveNotifications,
  writeNotificationCache,
} from '@/lib/notificationCache';
import {
  ensurePushListeners,
  registerForPushNotifications,
} from '@/lib/pushNotifications';
import type { PortalNotification } from '@/services/notifications';
import { fetchNotifications } from '@/services/notifications';
import { useAuthStore } from '@/stores/authStore';
import { useAuthReady } from '@/hooks/useAuthReady';

function mergeIntoCache(
  qc: ReturnType<typeof useQueryClient>,
  userId: string,
  incoming: PortalNotification,
) {
  const prev =
    qc.getQueryData<PortalNotification[]>(notificationKeys.list(userId)) ??
    loadPersistedNotifications(userId);
  const merged = mergeNotificationLists([incoming], prev);
  writeNotificationCache(qc, userId, merged);
}

async function refetchNotifications(
  qc: ReturnType<typeof useQueryClient>,
  userId: string,
) {
  try {
    const apiItems = await fetchNotifications(1, 40);
    const memory =
      qc.getQueryData<PortalNotification[]>(notificationKeys.list(userId)) ?? [];
    const items = resolveNotifications(userId, apiItems, memory);
    writeNotificationCache(qc, userId, items);
  } catch {
    hydrateNotificationCache(qc, userId);
  }
}

/**
 * Global notification bridge — runs as soon as the user is authenticated (no restaurant bootstrap wait).
 * Keeps React Query cache in sync for FCM/socket events on Capacitor.
 */
export function useNotificationBridge() {
  const qc = useQueryClient();
  const authReady = useAuthReady();
  const userId = useAuthStore((s) => s.user?._id);
  const isNative = Capacitor.isNativePlatform();
  const enabled = authReady && Boolean(userId);

  useEffect(() => {
    if (!enabled || !userId) return;

    hydrateNotificationCache(qc, userId);

    if (isNative) {
      ensurePushListeners();
      void registerForPushNotifications();
    }

    const onChanged = (event: Event) => {
      const custom = event as CustomEvent<{ notification?: PortalNotification }>;
      const incoming = custom.detail?.notification;
      if (!incoming) return;

      mergeIntoCache(qc, userId, incoming);

      if (isNative && !incoming.isRead) {
        toast.success(incoming.title || 'QuickBite', {
          description: incoming.message,
          duration: 8000,
        });
      }
    };

    const onInvalidate = () => {
      void refetchNotifications(qc, userId);
    };

    window.addEventListener('qbite:notifications-changed', onChanged);
    window.addEventListener('qbite:invalidate-notifications', onInvalidate);

    void refetchNotifications(qc, userId);

    return () => {
      window.removeEventListener('qbite:notifications-changed', onChanged);
      window.removeEventListener('qbite:invalidate-notifications', onInvalidate);
    };
  }, [enabled, isNative, qc, userId]);

  useEffect(() => {
    if (!enabled || !userId) return;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void refetchNotifications(qc, userId);
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [enabled, qc, userId]);
}
