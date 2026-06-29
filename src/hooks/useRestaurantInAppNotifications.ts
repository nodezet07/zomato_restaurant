import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { alertOrderUpdate } from '@/lib/pushNotifications';
import { fetchRestaurantOrders } from '@/services/orders';
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

function surfaceNewNotification(item: PortalNotification) {
  const title = item.title || 'QuickBite';

  if (Capacitor.isNativePlatform()) {
    toast.success(title, {
      description: item.message,
      duration: 8000,
    });
    void alertOrderUpdate({
      title,
      body: item.message,
      orderId: item.redirectType === 'ORDER' ? item.redirectId : undefined,
      type: item.notificationType,
    });
    return;
  }

  showBrowserNotification(item);
}

/**
 * Polls in-app notifications from the API and shows native local alerts on Capacitor
 * (Web Notification API does not work inside Android WebView).
 */
export function useRestaurantInAppNotifications(restaurantId: string | null | undefined) {
  const qc = useQueryClient();
  const seenRef = useRef<Set<string>>(new Set());
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);
  const ordersBootstrappedRef = useRef(false);
  const enabled = Boolean(restaurantId);
  const isNative = Capacitor.isNativePlatform();
  const pollMs = isNative ? 15_000 : 60_000;

  useEffect(() => {
    if (!enabled) return;

    let alive = true;

    const poll = async () => {
      try {
        const items = await fetchNotifications(1, 30);
        if (!alive) return;

        qc.setQueryData(['notifications', 'restaurant'], items);
        void qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
        void qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });

        if (!bootstrappedRef.current) {
          items.forEach((item) => seenRef.current.add(item._id));
          bootstrappedRef.current = true;
          return;
        }

        for (const item of items) {
          if (seenRef.current.has(item._id)) continue;
          seenRef.current.add(item._id);
          if (!item.isRead) {
            surfaceNewNotification(item);
          }
        }

        if (isNative && restaurantId) {
          const orders = await fetchRestaurantOrders(restaurantId, { limit: 40 });
          if (!alive) return;

          if (!ordersBootstrappedRef.current) {
            orders.forEach((o) => seenOrderIdsRef.current.add(o._id));
            ordersBootstrappedRef.current = true;
            return;
          }

          const freshOrders = orders
            .filter((o) => !seenOrderIdsRef.current.has(o._id))
            .sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());

          for (const order of freshOrders) {
            seenOrderIdsRef.current.add(order._id);
            toast.success('New order received!', {
              description: order.orderNumber
                ? `Order #${order.orderNumber} — check kitchen queue`
                : 'A customer just placed an order',
              duration: 8000,
            });
            void alertOrderUpdate({
              title: 'QuickBite — New order',
              body: order.orderNumber ? `#${order.orderNumber}` : 'Open orders to manage',
              orderId: order._id,
              type: 'new_order',
            });
          }
        }
      } catch {
        // non-fatal when offline
      }
    };

    void poll();
    const id = window.setInterval(poll, pollMs);

    const onInvalidate = (event: Event) => {
      const custom = event as CustomEvent<{ notification?: PortalNotification }>;
      const incoming = custom.detail?.notification;
      if (incoming) {
        qc.setQueriesData<PortalNotification[]>(
          { queryKey: ['notifications', 'list'] },
          (prev = []) => {
            if (prev.some((item) => item._id === incoming._id)) return prev;
            return [incoming, ...prev].slice(0, 60);
          },
        );
      }
      void poll();
    };
    window.addEventListener('qbite:invalidate-notifications', onInvalidate);
    window.addEventListener('qbite:notifications-changed', onInvalidate);

    if (!isNative && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }

    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener('qbite:invalidate-notifications', onInvalidate);
      window.removeEventListener('qbite:notifications-changed', onInvalidate);
    };
  }, [enabled, isNative, pollMs, qc, restaurantId]);
}
