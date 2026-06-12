import { apiFetch } from '@/lib/api';
import type { ApiResponse, Review } from '@/types/api';

export async function fetchRestaurantReviews(restaurantId: string, page = 1, limit = 20) {
  const body = await apiFetch<
    ApiResponse<{
      items: Review[];
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }>
  >(`/reviews/restaurant/${restaurantId}?page=${page}&limit=${limit}`);
  return body.data;
}
