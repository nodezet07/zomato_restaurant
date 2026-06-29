import { useQuery } from '@tanstack/react-query';
import { getMyRestaurant } from '@/services/restaurants';
import { useAuthStore } from '@/stores/authStore';
import { useRestaurantStore } from '@/stores/restaurantStore';

export function useBootstrapRestaurant() {
  const userId = useAuthStore((s) => s.user?._id);
  const cachedRestaurant = useRestaurantStore((s) => s.restaurant);
  const { setRestaurant } = useRestaurantStore();

  const q = useQuery({
    queryKey: ['owner-restaurant', userId],
    queryFn: async () => {
      const r = await getMyRestaurant();
      setRestaurant(r);
      return r;
    },
    enabled: Boolean(userId),
    retry: 1,
    staleTime: 30_000,
    placeholderData: cachedRestaurant ?? undefined,
  });

  const restaurant = q.data ?? cachedRestaurant ?? null;

  return {
    restaurant,
    isLoading: q.isLoading && !restaurant,
    isRefetching: q.isFetching && Boolean(restaurant),
    error: q.error,
    refetch: q.refetch,
  };
}
