import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

import {
  alertOrderUpdate,
  ensurePushListeners,
  isPushEnabled,
  registerForPushNotifications,
} from '@/lib/pushNotifications';

/** FCM remote push + local foreground alerts (MyApp-style). */
export function useRestaurantPush(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    if (Capacitor.isNativePlatform()) {
      ensurePushListeners();
    }

    void registerForPushNotifications();

    const onNotificationsChanged = () => {
      window.dispatchEvent(new Event('qbite:invalidate-notifications'));
    };
    window.addEventListener('qbite:notifications-changed', onNotificationsChanged);

    return () => {
      window.removeEventListener('qbite:notifications-changed', onNotificationsChanged);
    };
  }, [enabled]);
}

export { alertOrderUpdate, isPushEnabled, registerForPushNotifications };
