import { Capacitor } from '@capacitor/core';

const API_PORT = '5000';
const HOST_CACHE_KEY = 'qbite_native_api_host';
const LOCAL_BACKEND_OVERRIDE_KEY = 'qbite_local_backend_override';

/** Render production backend — used for release APK + web deploy */
export const BACKEND_URLS = {
  production: {
    base: 'https://zomato-backend-pt66.onrender.com',
    api: 'https://zomato-backend-pt66.onrender.com/api/v1',
    socket: 'https://zomato-backend-pt66.onrender.com',
  },
  /** Local dev default — override in .env */
  local: {
    api: `http://localhost:${API_PORT}/api/v1`,
    socket: `http://localhost:${API_PORT}`,
  },
} as const;

const PRODUCTION_API_URL = BACKEND_URLS.production.api;
const PRODUCTION_SOCKET_URL = BACKEND_URLS.production.socket;

/** Your PC LAN IP — emulator + real phone on same Wi‑Fi */
const LAN_HOST = import.meta.env.VITE_LAN_HOST ?? '192.168.1.101';

function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getCachedNativeHost(): string | null {
  try {
    return sessionStorage.getItem(HOST_CACHE_KEY);
  } catch {
    return null;
  }
}

export function setCachedNativeHost(host: string) {
  try {
    sessionStorage.setItem(HOST_CACHE_KEY, host);
  } catch {
    /* ignore */
  }
}

export function clearCachedNativeHost() {
  try {
    sessionStorage.removeItem(HOST_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

function isLocalBackendOverrideEnabled(): boolean {
  try {
    return sessionStorage.getItem(LOCAL_BACKEND_OVERRIDE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function enableLocalBackendOverride() {
  try {
    sessionStorage.setItem(LOCAL_BACKEND_OVERRIDE_KEY, 'true');
  } catch {
    /* ignore */
  }
}

export function disableLocalBackendOverride() {
  try {
    sessionStorage.removeItem(LOCAL_BACKEND_OVERRIDE_KEY);
  } catch {
    /* ignore */
  }
}

/** Hosts to try on Android — LAN IP first (avoid stale sessionStorage cache). */
export function getNativeHostCandidates(): string[] {
  const candidates: string[] = [];

  const lan = import.meta.env.VITE_LAN_HOST?.trim() ?? LAN_HOST;
  candidates.push(lan);

  const explicit = import.meta.env.VITE_NATIVE_API_HOST?.trim();
  if (explicit && explicit !== lan) candidates.push(explicit);

  if (Capacitor.getPlatform() === 'android') {
    candidates.push('127.0.0.1');
  }

  const emulatorAlias = import.meta.env.VITE_ANDROID_API_HOST?.trim() ?? '10.0.2.2';
  if (emulatorAlias !== lan) candidates.push(emulatorAlias);

  const cached = getCachedNativeHost();
  if (cached && cached !== lan && !candidates.includes(cached)) {
    candidates.push(cached);
  }

  return [...new Set(candidates.filter(Boolean))];
}

function getNativeHost(): string {
  return (
    getCachedNativeHost() ??
    import.meta.env.VITE_LAN_HOST?.trim() ??
    LAN_HOST
  );
}

function isRemoteApiUrl(url: string | undefined): boolean {
  return Boolean(url?.startsWith('https://'));
}

/** Production Render unless explicitly opted into local LAN backend */
function shouldUseProductionBackend(): boolean {
  if (isLocalBackendOverrideEnabled()) return false;
  if (import.meta.env.VITE_USE_LOCAL_BACKEND === 'true') return false;
  if (import.meta.env.VITE_USE_PRODUCTION_BACKEND === 'true') return true;
  if (isRemoteApiUrl(import.meta.env.VITE_API_URL)) return true;
  if (import.meta.env.PROD) return true;
  return false;
}

/** Try each LAN host until /health responds — local APK only */
export async function discoverWorkingNativeHost(): Promise<string | null> {
  if (!isNativeApp() || shouldUseProductionBackend()) return null;

  for (const host of getNativeHostCandidates()) {
    const url = `http://${host}:${API_PORT}/api/v1/health`;
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        setCachedNativeHost(host);
        enableLocalBackendOverride();
        return host;
      }
    } catch {
      /* try next host */
    }
  }
  return null;
}

/** Ping Render (or any HTTPS API) — production APK */
export async function discoverProductionBackend(): Promise<boolean> {
  const url = `${getApiUrl()}/health`;
  try {
    const res = await fetch(url, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

export function getApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();

  if (isNativeApp()) {
    if (shouldUseProductionBackend()) {
      clearCachedNativeHost();
      disableLocalBackendOverride();
      return isRemoteApiUrl(configured) ? configured : PRODUCTION_API_URL;
    }
    const host = getCachedNativeHost() ?? getNativeHost();
    return `http://${host}:${API_PORT}/api/v1`;
  }

  if (shouldUseProductionBackend()) {
    return isRemoteApiUrl(configured) ? configured : PRODUCTION_API_URL;
  }

  if (import.meta.env.VITE_NATIVE_API_HOST) {
    return `http://${import.meta.env.VITE_NATIVE_API_HOST}:${API_PORT}/api/v1`;
  }

  return configured || `http://localhost:${API_PORT}/api/v1`;
}

export function getSocketUrl(): string {
  const configured = import.meta.env.VITE_SOCKET_URL?.trim();

  if (isNativeApp()) {
    if (shouldUseProductionBackend()) {
      return isRemoteApiUrl(configured) ? configured : PRODUCTION_SOCKET_URL;
    }
    const host = getCachedNativeHost() ?? getNativeHost();
    return `http://${host}:${API_PORT}`;
  }

  if (shouldUseProductionBackend()) {
    return isRemoteApiUrl(configured) ? configured : PRODUCTION_SOCKET_URL;
  }

  if (import.meta.env.VITE_NATIVE_API_HOST) {
    return `http://${import.meta.env.VITE_NATIVE_API_HOST}:${API_PORT}`;
  }

  return configured || `http://localhost:${API_PORT}`;
}

export const DEFAULT_RESTAURANT_ID = import.meta.env.VITE_DEFAULT_RESTAURANT_ID ?? '';
export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ??
  import.meta.env.VITE_GOOGLE_GEOCODING_API_KEY ??
  'AIzaSyCxoK3LptaTG8r4VJBPf9LH_bdCBbTenJI';

export function getEnvInfo() {
  return {
    isNative: isNativeApp(),
    platform: Capacitor.getPlatform?.() ?? 'web',
    apiUrl: getApiUrl(),
    socketUrl: getSocketUrl(),
    useProductionBackend: shouldUseProductionBackend(),
    localBackendOverride: isLocalBackendOverrideEnabled(),
    hostCandidates: isNativeApp() ? getNativeHostCandidates() : [],
    cachedHost: getCachedNativeHost(),
  };
}
