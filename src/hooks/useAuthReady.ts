import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

/** Wait for zustand persist to restore user + token (critical on Capacitor cold start). */
export function useAuthReady() {
  const [ready, setReady] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setReady(true);
      return;
    }
    return useAuthStore.persist.onFinishHydration(() => setReady(true));
  }, []);

  return ready;
}
