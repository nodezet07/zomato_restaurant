import type { QueryClient } from '@tanstack/react-query';

import { notificationKeys } from '@/hooks/useNotificationsQuery';
import type { PortalNotification } from '@/services/notifications';

const STORAGE_PREFIX = 'qbite.notifications.v1.';

/** Client-only rows merged until the API returns the persisted document. */
export function isSyntheticNotificationId(id: string): boolean {
  return id.startsWith('push-') || id.startsWith('order-');
}

export function mergeNotificationLists(
  apiItems: PortalNotification[],
  existing: PortalNotification[] = [],
): PortalNotification[] {
  const apiIds = new Set(apiItems.map((n) => n._id));
  const apiRedirectIds = new Set(
    apiItems.map((n) => n.redirectId).filter((id): id is string => Boolean(id)),
  );

  const synthetics = existing.filter(
    (n) =>
      isSyntheticNotificationId(n._id) &&
      !apiIds.has(n._id) &&
      !(n.redirectId && apiRedirectIds.has(n.redirectId)),
  );

  const persistedReal = existing.filter(
    (n) =>
      !isSyntheticNotificationId(n._id) &&
      !apiIds.has(n._id) &&
      !(n.redirectId && apiRedirectIds.has(n.redirectId)),
  );

  return [...apiItems, ...persistedReal, ...synthetics]
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
    .slice(0, 60);
}

export function loadPersistedNotifications(userId: string): PortalNotification[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PortalNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistNotifications(userId: string, items: PortalNotification[]) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(items.slice(0, 60)));
  } catch {
    /* quota / private mode */
  }
}

export function clearPersistedNotifications(userId: string) {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
  } catch {
    /* ignore */
  }
}

/** Merge API + in-memory + localStorage, then persist for reload survival. */
export function resolveNotifications(
  userId: string,
  apiItems: PortalNotification[],
  memoryItems: PortalNotification[] = [],
): PortalNotification[] {
  const persisted = loadPersistedNotifications(userId);
  const merged = mergeNotificationLists(apiItems, mergeNotificationLists(memoryItems, persisted));
  persistNotifications(userId, merged);
  return merged;
}

export function writeNotificationCache(
  qc: QueryClient,
  userId: string,
  items: PortalNotification[],
) {
  persistNotifications(userId, items);
  qc.setQueryData(notificationKeys.list(userId), items);
  qc.setQueryData(
    notificationKeys.unread(userId),
    items.filter((n) => !n.isRead).length,
  );
}

export function hydrateNotificationCache(qc: QueryClient, userId: string) {
  const persisted = loadPersistedNotifications(userId);
  if (persisted.length === 0) return;
  writeNotificationCache(qc, userId, persisted);
}

/** Same source the bell badge and list must read — query → cache → localStorage. */
export function getNotificationFeed(
  qc: QueryClient,
  userId: string | undefined,
  queryData?: PortalNotification[],
): PortalNotification[] {
  if (!userId) return [];

  const cached = qc.getQueryData<PortalNotification[]>(notificationKeys.list(userId));
  const persisted = loadPersistedNotifications(userId);

  if (queryData && queryData.length > 0) return queryData;
  if (cached && cached.length > 0) return cached;
  if (persisted.length > 0) return persisted;
  return queryData ?? [];
}

export function dispatchNotificationChanged(notification: PortalNotification) {
  window.dispatchEvent(
    new CustomEvent('qbite:notifications-changed', { detail: { notification } }),
  );
}
