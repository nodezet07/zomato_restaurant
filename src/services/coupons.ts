import { apiFetch } from '@/lib/api';
import type { ApiResponse, Coupon } from '@/types/api';

export async function fetchRestaurantCoupons(restaurantId: string) {
  const body = await apiFetch<ApiResponse<{ coupons: Coupon[]; count: number }>>(
    `/coupons/restaurant/${restaurantId}`,
  );
  return body.data.coupons ?? [];
}

export async function createRestaurantCoupon(payload: {
  restaurantId: string;
  couponCode: string;
  title: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  validFrom: string;
  validTo: string;
}) {
  const body = await apiFetch<ApiResponse<{ coupon: Coupon }>>('/coupons/restaurant', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return body.data.coupon;
}

export async function deleteRestaurantCoupon(couponId: string, restaurantId: string) {
  await apiFetch<ApiResponse<unknown>>(
    `/coupons/restaurant/${couponId}?restaurantId=${encodeURIComponent(restaurantId)}`,
    { method: 'DELETE' },
  );
}
