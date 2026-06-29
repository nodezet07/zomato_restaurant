import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearPersistedNotifications } from '@/lib/notificationCache';
import type { AuthUser } from '@/types/api';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => {
        const userId = get().user?._id;
        if (userId) clearPersistedNotifications(userId);
        set({ accessToken: null, refreshToken: null, user: null });
      },
      isAuthenticated: () => Boolean(get().accessToken),
    }),
    {
      name: 'qb-restaurant-auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
      }),
    },
  ),
);
