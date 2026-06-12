import { apiFetch } from '@/lib/api';
import type { ApiResponse, AvailableRider, Order, OrderTrackPayload } from '@/types/api';

export async function fetchRestaurantOrders(
  restaurantId: string,
  params?: { status?: string; page?: number; limit?: number },
) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit ?? 50));

  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const body = await apiFetch<ApiResponse<{ orders: Order[]; pagination?: unknown }>>(
    `/orders/restaurant/${restaurantId}${suffix}`,
  );
  return body.data.orders ?? [];
}

export async function fetchOrderById(orderId: string) {
  const body = await apiFetch<ApiResponse<{ order: Order }>>(`/orders/${orderId}`);
  return body.data.order;
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  cancellationReason?: string,
) {
  const body = await apiFetch<ApiResponse<{ order: Order }>>(`/orders/status/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, cancellationReason }),
  });
  return body.data.order;
}

/** Restaurant owner cancel — uses status API, not customer /orders/cancel */
export async function cancelOrderByRestaurant(orderId: string, reason?: string) {
  return updateOrderStatus(orderId, 'CANCELLED', reason ?? 'Cancelled by restaurant');
}

export async function trackOrder(orderId: string) {
  const body = await apiFetch<ApiResponse<OrderTrackPayload>>(`/orders/track/${orderId}`);
  return body.data;
}

export async function fetchAvailableRiders() {
  const body = await apiFetch<ApiResponse<{ riders: AvailableRider[] }>>('/orders/riders/available');
  return body.data.riders ?? [];
}

export async function assignRiderToOrder(orderId: string, riderUserId: string) {
  const body = await apiFetch<ApiResponse<{ order: Order }>>(
    `/orders/assign-rider/${orderId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ riderId: riderUserId }),
    },
  );
  return body.data.order;
}
