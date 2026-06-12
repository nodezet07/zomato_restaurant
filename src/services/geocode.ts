import { apiFetch } from '@/lib/api';
import type { ApiResponse, RestaurantAddress } from '@/types/api';

export async function reverseGeocode(latitude: number, longitude: number) {
  const body = await apiFetch<ApiResponse<{ address: RestaurantAddress }>>(
    `/restaurants/geocode/reverse?lat=${latitude}&lng=${longitude}`,
  );
  return body.data.address;
}
