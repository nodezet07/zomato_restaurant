import { useQuery } from '@tanstack/react-query';
import { getRestaurantById, resolveOwnerRestaurantId } from '@/services/restaurants';
import { useRestaurantStore } from '@/stores/restaurantStore';

export function useBootstrapRestaurant() {
  const { restaurantId, restaurant, setRestaurant } = useRestaurantStore();

  const q = useQuery({
    queryKey: ['owner-restaurant', restaurantId],
    queryFn: async () => {
      let id = restaurantId;
      if (!id) {
        id = await resolveOwnerRestaurantId();
        if (!id) throw new Error('No restaurant linked to this owner account.');
      }
      const r = await getRestaurantById(id);
      setRestaurant(r);
      return r;
    },
    enabled: !restaurant,
    retry: 1,
  });

  return { restaurant: restaurant ?? q.data ?? null, isLoading: q.isLoading, error: q.error };
}
