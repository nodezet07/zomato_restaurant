import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

import {
  registerDeviceToken,
  unregisterDeviceToken,
  type PortalNotification,
} from '@/services/notifications';
import { dispatchNotificationChanged } from '@/lib/notificationCache';

const PUSH_TOKEN_KEY = 'qbite.pushToken';

let pushListenersAttached = false;
let removePushListeners: (() => void) | undefined;

export function ensurePushListeners(): void {
  if (!Capacitor.isNativePlatform() || pushListenersAttached) return;
  pushListenersAttached = true;
  removePushListeners = setupPushNotificationListeners();
}

export function teardownPushListeners(): void {
  removePushListeners?.();
  removePushListeners = undefined;
  pushListenersAttached = false;
}

async function setupLocalChannels() {
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
}

function storePushToken(token: string) {
  try {
    sessionStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

function getStoredPushToken(): string | null {
  try {
    return sessionStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function clearStoredPushToken() {
  try {
    sessionStorage.removeItem(PUSH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Register FCM (native) or browser notifications — same backend flow as MyApp/Rider Expo push. */
export async function registerForPushNotifications(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      ensurePushListeners();
      await setupLocalChannels();

      const localPerm = await LocalNotifications.requestPermissions();

      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === 'prompt') {
        perm = await PushNotifications.requestPermissions();
      }

      if (perm.receive === 'granted') {
        await PushNotifications.register();
      }

      return perm.receive === 'granted' || localPerm.display === 'granted';
    } catch (error) {
      console.warn('[Push] native registration failed', error);
      return false;
    }
  }

  if (typeof Notification === 'undefined') return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

export async function unregisterForPushNotifications(): Promise<void> {
  const token = getStoredPushToken();
  if (token) {
    try {
      await unregisterDeviceToken(token);
    } catch {
      /* ignore */
    }
    clearStoredPushToken();
  }
  if (Capacitor.isNativePlatform()) {
    try {
      await PushNotifications.unregister();
    } catch {
      /* ignore */
    }
  }
}

export async function isPushEnabled(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const [pushPerm, localPerm] = await Promise.all([
      PushNotifications.checkPermissions(),
      LocalNotifications.checkPermissions(),
    ]);
    return pushPerm.receive === 'granted' || localPerm.display === 'granted';
  }
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

function handlePushData(data: Record<string, string | undefined>) {
  const orderId = data.orderId ?? data.redirectId;
  if (orderId) {
    window.location.assign('/orders');
    return;
  }
  window.location.assign('/notifications');
}

function buildNotificationFromPush(input: {
  title?: string;
  body?: string;
  data?: Record<string, string | undefined>;
}): PortalNotification {
  const redirectType = input.data?.redirectType;
  const redirectId = input.data?.redirectId ?? input.data?.orderId;
  const notificationType = input.data?.type ?? 'ORDER';
  return {
    _id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    notificationType,
    title: input.title ?? 'QuickBite',
    message: input.body ?? '',
    isRead: false,
    sentAt: new Date().toISOString(),
    redirectType,
    redirectId,
  };
}

/** Call once after login — registers FCM token with backend (like MyApp Expo push). */
export function setupPushNotificationListeners() {
  if (!Capacitor.isNativePlatform()) return () => undefined;

  const subs: Array<{ remove: () => void }> = [];

  void PushNotifications.addListener('registration', async (token) => {
    try {
      storePushToken(token.value);
      await registerDeviceToken(
        token.value,
        Capacitor.getPlatform() === 'ios' ? 'ios' : 'android',
      );
      console.log('[Push] FCM token registered with backend');
    } catch (error) {
      console.warn('[Push] failed to save FCM token', error);
    }
  }).then((s) => subs.push(s));

  void PushNotifications.addListener('registrationError', (error) => {
    console.warn('[Push] FCM registration error', error);
  }).then((s) => subs.push(s));

  void PushNotifications.addListener('pushNotificationReceived', (notification) => {
    const data = (notification.data ?? {}) as Record<string, string | undefined>;
    dispatchNotificationChanged(
      buildNotificationFromPush({
        title: notification.title,
        body: notification.body,
        data,
      }),
    );
  }).then((s) => subs.push(s));

  void PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = (action.notification.data ?? {}) as Record<string, string | undefined>;
    dispatchNotificationChanged(
      buildNotificationFromPush({
        title: action.notification.title,
        body: action.notification.body,
        data,
      }),
    );
    window.dispatchEvent(new Event('qbite:invalidate-notifications'));
    handlePushData(data);
  }).then((s) => subs.push(s));

  void LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const orderId = action.notification.extra?.orderId as string | undefined;
    const title = action.notification.title ?? 'QuickBite';
    const body = action.notification.body ?? '';
    dispatchNotificationChanged(
      buildNotificationFromPush({
        title,
        body,
        data: {
          orderId,
          redirectId: orderId,
          redirectType: orderId ? 'ORDER' : undefined,
          type: (action.notification.extra?.type as string | undefined) ?? 'new_order',
        },
      }),
    );
    window.dispatchEvent(new Event('qbite:invalidate-notifications'));
    if (orderId) window.location.assign('/orders');
    else window.location.assign('/notifications');
  }).then((s) => subs.push(s));

  return () => {
    subs.forEach((s) => s.remove());
  };
}

/** Foreground/socket alert — local notification when app is open. */
export async function alertOrderUpdate(input: {
  title: string;
  body: string;
  orderId?: string;
  type?: string;
}) {
  const tag = input.orderId ?? 'order-alert';

  if (Capacitor.isNativePlatform()) {
    try {
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        perm = await LocalNotifications.requestPermissions();
      }
      if (perm.display !== 'granted') return;

      await setupLocalChannels();
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
