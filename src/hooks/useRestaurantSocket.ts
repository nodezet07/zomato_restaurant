import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  connectRestaurantSocket,
  joinRestaurantRoom,
  leaveRestaurantRoom,
  SERVER_EVENTS,
} from '@/lib/socket';
import { alertOrderUpdate } from '@/lib/pushNotifications';
import type { NewOrderSocketPayload } from '@/types/api';
import type { PortalNotification } from '@/services/notifications';

export function useRestaurantSocket(restaurantId: string | null | undefined) {
  const qc = useQueryClient();
  const restaurantIdRef = useRef(restaurantId);
  restaurantIdRef.current = restaurantId;

  useEffect(() => {
    if (!restaurantId) return;

    const socket = connectRestaurantSocket();

    const onConnect = () => {
      if (restaurantIdRef.current) joinRestaurantRoom(restaurantIdRef.current);
    };
    const onJoinedRestaurant = (payload: { restaurantId?: string }) => {
      console.log('[Socket] joined restaurant room', payload?.restaurantId);
    };
    const onConnectError = (err: Error) => {
      console.warn('[Socket] connect error', err.message);
    };
    const onNewOrder = (payload: NewOrderSocketPayload) => {
      const rid = restaurantIdRef.current;
      if (!rid) return;
      qc.invalidateQueries({ queryKey: ['orders', rid] });
      const syntheticNotification: PortalNotification = {
        _id: `order-${payload.orderId}-${Date.now()}`,
        notificationType: 'ORDER',
        title: 'New order',
        message: payload.orderNumber
          ? `New order ${payload.orderNumber} - please confirm and prepare.`
          : 'A new order has been placed.',
        isRead: false,
        sentAt: new Date().toISOString(),
        redirectType: 'ORDER',
        redirectId: payload.orderId,
      };
      window.dispatchEvent(new CustomEvent('qbite:notifications-changed', {
        detail: { notification: syntheticNotification },
      }));
      window.dispatchEvent(new Event('qbite:invalidate-notifications'));
      toast.success('New order received!', {
        description: payload.orderNumber
          ? `Order #${payload.orderNumber} — check kitchen queue`
          : 'A customer just placed an order',
        duration: 8000,
      });
      void alertOrderUpdate({
        title: 'QuickBite — New order',
        body: payload.orderNumber ? `#${payload.orderNumber}` : 'Open orders to manage',
        orderId: payload.orderId,
        type: 'new_order',
      });
    };
    const onOrderUpdated = () => {
      const rid = restaurantIdRef.current;
      if (rid) qc.invalidateQueries({ queryKey: ['orders', rid] });
    };
    const onSocketError = (payload: { message?: string }) => {
      console.warn('[Socket] error', payload?.message);
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('joined_restaurant', onJoinedRestaurant);
    socket.on('error', onSocketError);
    socket.on(SERVER_EVENTS.NEW_ORDER, onNewOrder);
    socket.on(SERVER_EVENTS.ORDER_UPDATED, onOrderUpdated);
    socket.on(SERVER_EVENTS.ORDER_CANCELLED, onOrderUpdated);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('joined_restaurant', onJoinedRestaurant);
      socket.off('error', onSocketError);
      socket.off(SERVER_EVENTS.NEW_ORDER, onNewOrder);
      socket.off(SERVER_EVENTS.ORDER_UPDATED, onOrderUpdated);
      socket.off(SERVER_EVENTS.ORDER_CANCELLED, onOrderUpdated);
      leaveRestaurantRoom(restaurantId);
    };
  }, [restaurantId, qc]);
}
