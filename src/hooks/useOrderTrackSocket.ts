import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  connectRestaurantSocket,
  joinOrderRoom,
  leaveOrderRoom,
  SERVER_EVENTS,
} from '@/lib/socket';
import type { OrderTrackPayload } from '@/types/api';

type RiderLocationPayload = {
  orderId?: string;
  riderLocation?: { latitude: number; longitude: number; heading?: number };
};

function mergeTrack(
  prev: OrderTrackPayload | undefined,
  payload: RiderLocationPayload,
): OrderTrackPayload & { socketLive?: boolean } {
  const riderLocation = payload.riderLocation ?? prev?.riderLocation ?? prev?.liveLocation;
  return {
    orderId: payload.orderId ?? prev?.orderId ?? '',
    orderStatus: prev?.orderStatus ?? '',
    ...prev,
    riderLocation,
    liveLocation: riderLocation
      ? {
          latitude: riderLocation.latitude,
          longitude: riderLocation.longitude,
          heading: riderLocation.heading,
        }
      : prev?.liveLocation,
    socketLive: true,
  };
}

/** Real-time rider GPS via socket — no polling. */
export function useOrderTrackSocket(orderId: string | null | undefined, enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || !orderId) return;

    const socket = connectRestaurantSocket();

    const onLocation = (payload: RiderLocationPayload) => {
      const pid = String(payload?.orderId ?? '');
      if (pid && pid !== orderId) return;
      qc.setQueryData(['order-track', orderId], (prev: OrderTrackPayload | undefined) =>
        mergeTrack(prev, payload),
      );
    };

    const onConnect = () => joinOrderRoom(orderId);

    socket.on('connect', onConnect);
    socket.on(SERVER_EVENTS.RIDER_LOCATION_UPDATE, onLocation);
    socket.on(SERVER_EVENTS.ORDER_UPDATED, () => {
      void qc.invalidateQueries({ queryKey: ['order-track', orderId] });
    });
    socket.on(SERVER_EVENTS.RIDER_ASSIGNED, () => {
      void qc.invalidateQueries({ queryKey: ['order-track', orderId] });
    });
    socket.on(SERVER_EVENTS.ORDER_PICKED_UP, () => {
      void qc.invalidateQueries({ queryKey: ['order-track', orderId] });
    });
    socket.on(SERVER_EVENTS.ORDER_DELIVERED, () => {
      void qc.invalidateQueries({ queryKey: ['order-track', orderId] });
    });

    if (socket.connected) joinOrderRoom(orderId);

    return () => {
      socket.off('connect', onConnect);
      socket.off(SERVER_EVENTS.RIDER_LOCATION_UPDATE, onLocation);
      leaveOrderRoom(orderId);
    };
  }, [orderId, enabled, qc]);
}
