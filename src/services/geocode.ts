import { apiFetch } from '@/lib/api';
import type { ApiResponse, RestaurantAddress } from '@/types/api';

export async function reverseGeocode(latitude: number, longitude: number) {
  const body = await apiFetch<ApiResponse<{ address: RestaurantAddress }>>(
    `/restaurants/geocode/reverse?lat=${latitude}&lng=${longitude}`,
  );
  if (!body?.data?.address) {
    return {
      street: `Location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
      city: '',
      state: '',
      country: 'India',
    } satisfies RestaurantAddress;
  }
  return body.data.address;
}
