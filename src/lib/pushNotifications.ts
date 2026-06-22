import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/** Expo-style order alerts — local notifications on native, browser Notification on web. */
export async function registerForPushNotifications(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return false;

      await LocalNotifications.createChannel({
        id: 'orders',
        name: 'Order alerts',
        description: 'New orders and delivery updates',
        importance: 5,
        vibration: true,
        sound: 'default',
      });

      await LocalNotifications.createChannel({
        id: 'default',
        name: 'General',
        importance: 3,
      });

      return true;
    } catch {
      return false;
    }
  }

  if (typeof Notification === 'undefined') return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

export async function isPushEnabled(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const perm = await LocalNotifications.checkPermissions();
    return perm.display === 'granted';
  }
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

/** Show order alert — mirrors MyApp/RiderApp expo-notifications scheduleNotificationAsync pattern. */
export async function alertOrderUpdate(input: {
  title: string;
  body: string;
  orderId?: string;
  type?: string;
}) {
  const tag = input.orderId ?? 'order-alert';

  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') return;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.abs(tag.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 2147483647,
            title: input.title,
            body: input.body,
            channelId: 'orders',
            sound: 'default',
            extra: {
              type: input.type ?? 'new_order',
              orderId: input.orderId ?? '',
            },
          },
        ],
      });
    } catch {
      /* ignore */
    }
    return;
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    const n = new Notification(input.title, {
      body: input.body,
      tag,
      requireInteraction: input.type === 'new_order',
    });
    n.onclick = () => {
      window.focus();
      if (input.orderId) window.location.assign('/orders');
      n.close();
    };
  }
}
