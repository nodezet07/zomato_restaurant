import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Restaurant } from '@/types/api';

type RestaurantState = {
  restaurantId: string | null;
  restaurant: Restaurant | null;
  setRestaurant: (restaurant: Restaurant) => void;
  clearRestaurant: () => void;
};

export const useRestaurantStore = create<RestaurantState>()(
  persist(
    (set) => ({
      restaurantId: null,
      restaurant: null,
      setRestaurant: (restaurant) =>
        set({ restaurant, restaurantId: restaurant._id }),
      clearRestaurant: () => set({ restaurant: null, restaurantId: null }),
    }),
    {
      name: 'qb-restaurant-context',
      partialize: (s) => ({
        restaurantId: s.restaurantId,
        restaurant: s.restaurant,
      }),
    },
  ),
);
