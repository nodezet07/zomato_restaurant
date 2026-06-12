import { apiFetch } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { SupportTicket } from '@/types/analytics';

export async function fetchRestaurantSupportTickets(
  restaurantId: string,
  params?: { page?: number; limit?: number; status?: string; issueType?: string },
) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit ?? 20));
  if (params?.status) qs.set('status', params.status);
  if (params?.issueType) qs.set('issueType', params.issueType);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';

  const body = await apiFetch<
    ApiResponse<{
      tickets: SupportTicket[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>
  >(`/restaurants/${restaurantId}/support-tickets${suffix}`);
  return body.data;
}
