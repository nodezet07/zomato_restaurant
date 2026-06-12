import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/config/env';
import { useAuthStore } from '@/stores/authStore';

export const CLIENT_EVENTS = {
  JOIN_RESTAURANT: 'join_restaurant',
  LEAVE_RESTAURANT: 'leave_restaurant',
} as const;

export const SERVER_EVENTS = {
  NEW_ORDER: 'new_order',
  ORDER_UPDATED: 'order_updated',
  ORDER_CANCELLED: 'order_cancelled',
} as const;

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectRestaurantSocket(): Socket {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error('Not authenticated');

  if (socket?.connected) return socket;

  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
  });

  return socket;
}

export function joinRestaurantRoom(restaurantId: string) {
  const s = socket ?? connectRestaurantSocket();
  s.emit(CLIENT_EVENTS.JOIN_RESTAURANT, { restaurantId });
}

export function leaveRestaurantRoom(restaurantId: string) {
  socket?.emit(CLIENT_EVENTS.LEAVE_RESTAURANT, { restaurantId });
}

export function disconnectRestaurantSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
