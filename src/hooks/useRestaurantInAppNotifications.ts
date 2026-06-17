import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { fetchNotifications, type PortalNotification } from '@/services/notifications';

function showBrowserNotification(item: PortalNotification) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const n = new Notification(item.title || 'QuickBite', {
    body: item.message,
    tag: item._id,
    requireInteraction: item.notificationType === 'ORDER',
  });

  n.onclick = () => {
    window.focus();
    if (item.redirectType === 'ORDER' && item.redirectId) {
      window.location.assign('/orders');
    }
    n.close();
  };
}

/**
 * Polls in-app notifications (same store Expo push writes to for restaurant owners)
 * and surfaces browser alerts when the portal tab is open/backgrounded.
 * Expo push tokens require a native app; web uses browser notifications + socket.
 */
export function useRestaurantInAppNotifications(enabled: boolean) {
  const qc = useQueryClient();
  const seenRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let alive = true;

    const poll = async () => {
      try {
        const items = await fetchNotifications(1, 30);
        if (!alive) return;

        qc.setQueryData(['notifications', 'restaurant'], items);

        if (!bootstrappedRef.current) {
          items.forEach((item) => seenRef.current.add(item._id));
          bootstrappedRef.current = true;
          return;
        }

        for (const item of items) {
          if (seenRef.current.has(item._id)) continue;
          seenRef.current.add(item._id);
          if (!item.isRead) {
            showBrowserNotification(item);
          }
        }
      } catch {
        // non-fatal when offline
      }
    };

    void poll();
    const id = window.setInterval(poll, 25_000);

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [enabled, qc]);
}
