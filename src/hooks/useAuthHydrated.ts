import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

/** Wait for zustand persist before notification queries (fixes empty list on APK cold start). */
export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(() => {
    try {
      return useAuthStore.persist.hasHydrated();
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (hydrated) return;
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, [hydrated]);

  return hydrated;
}
