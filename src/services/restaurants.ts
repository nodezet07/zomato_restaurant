import { DEFAULT_RESTAURANT_ID } from '@/config/env';
import { apiFetch } from '@/lib/api';
import type { ApiResponse, EarningsSummary, Restaurant, Settlement } from '@/types/api';

export async function getRestaurantById(restaurantId: string) {
  const body = await apiFetch<ApiResponse<{ restaurant: Restaurant }>>(`/restaurants/${restaurantId}`);
  return body.data.restaurant;
}

export async function updateRestaurant(restaurantId: string, payload: Partial<Restaurant>) {
  const body = await apiFetch<ApiResponse<{ restaurant: Restaurant }>>(
    `/restaurants/${restaurantId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
  return body.data.restaurant;
}

export async function updateRestaurantOpenStatus(restaurantId: string, isOpen: boolean) {
  const body = await apiFetch<ApiResponse<{ restaurant: Restaurant }>>(
    `/restaurants/status/${restaurantId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isOpen }),
    },
  );
  return body.data.restaurant;
}

export async function getRestaurantAnalytics(restaurantId: string) {
  const body = await apiFetch<ApiResponse<Record<string, unknown>>>(
    `/restaurants/analytics/${restaurantId}`,
  );
  return body.data;
}

export async function getRestaurantEarnings(restaurantId: string) {
  const body = await apiFetch<ApiResponse<EarningsSummary>>(
    `/restaurants/${restaurantId}/earnings`,
  );
  return body.data;
}

export async function getRestaurantSettlements(restaurantId: string, page = 1, limit = 20) {
  const body = await apiFetch<
    ApiResponse<{ settlements: Settlement[]; pagination?: { total: number; page: number } }>
  >(`/restaurants/${restaurantId}/settlements?page=${page}&limit=${limit}`);
  return body.data;
}

export async function resolveOwnerRestaurantId(): Promise<string | null> {
  if (DEFAULT_RESTAURANT_ID) {
    try {
      await apiFetch(`/orders/restaurant/${DEFAULT_RESTAURANT_ID}?limit=1`);
      return DEFAULT_RESTAURANT_ID;
    } catch {
      // fall through
    }
  }

  const search = await apiFetch<ApiResponse<{ restaurants?: Restaurant[] }>>(
    '/restaurants/search?q=demo&limit=20',
  );
  const list = search.data.restaurants ?? [];

  for (const r of list) {
    try {
      await apiFetch(`/orders/restaurant/${r._id}?limit=1`);
      return r._id;
    } catch {
      // not owner
    }
  }

  return null;
}
