import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  alertOrderUpdate,
  isPushEnabled,
  registerForPushNotifications,
} from '@/lib/pushNotifications';

/** Setup push-style alerts (local notifications on Android/iOS, browser on web). */
export function useRestaurantPush(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    void registerForPushNotifications();

    if (!Capacitor.isNativePlatform()) return;

    const sub = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const orderId = action.notification.extra?.orderId as string | undefined;
      if (orderId) window.location.assign('/orders');
    });

    return () => {
      void sub.then((s) => s.remove());
    };
  }, [enabled]);
}

export { alertOrderUpdate, isPushEnabled, registerForPushNotifications };
