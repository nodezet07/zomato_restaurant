import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { alertOrderUpdate } from '@/lib/pushNotifications';
import { dispatchNotificationChanged, resolveNotifications, writeNotificationCache } from '@/lib/notificationCache';
import { notificationKeys } from '@/hooks/useNotificationsQuery';
import { fetchRestaurantOrders } from '@/services/orders';
import { fetchNotifications, type PortalNotification } from '@/services/notifications';
import { useAuthStore } from '@/stores/authStore';

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
export function useRestaurantInAppNotifications(
  restaurantId: string | null | undefined,
  userId?: string | null,
) {
  const qc = useQueryClient();
  const authUserId = useAuthStore((s) => s.user?._id);
  const resolvedUserId = userId ?? authUserId;
  const seenRef = useRef<Set<string>>(new Set());
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);
  const ordersBootstrappedRef = useRef(false);
  const enabled = Boolean(resolvedUserId);
  const isNative = Capacitor.isNativePlatform();
  const pollMs = isNative ? 15_000 : 60_000;

  useEffect(() => {
    if (!enabled) return;

    let alive = true;

    const poll = async () => {
      if (!resolvedUserId) return;

      try {
        const apiItems = await fetchNotifications(1, 30);
        if (!alive) return;

        const memory =
          qc.getQueryData<PortalNotification[]>(notificationKeys.list(resolvedUserId)) ?? [];
        const items = resolveNotifications(resolvedUserId, apiItems, memory);

        writeNotificationCache(qc, resolvedUserId, items);

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
            dispatchNotificationChanged({
              _id: `order-${order._id}-${Date.now()}`,
              notificationType: 'ORDER',
              title: 'New order',
              message: order.orderNumber
                ? `New order ${order.orderNumber} — please confirm and prepare.`
                : 'A new order has been placed.',
              isRead: false,
              sentAt: new Date().toISOString(),
              redirectType: 'ORDER',
              redirectId: order._id,
            });
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

    if (!isNative && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [enabled, isNative, pollMs, qc, restaurantId, resolvedUserId]);
}
