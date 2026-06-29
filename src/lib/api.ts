import { Capacitor } from '@capacitor/core';
import { discoverWorkingNativeHost, enableLocalBackendOverride, getApiUrl } from '@/config/env';
import { useAuthStore } from '@/stores/authStore';
import { loginLog } from '@/lib/loginLogger';

export type ApiError = Error & { status?: number; data?: unknown };

let refreshPromise: Promise<string | null> | null = null;

function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function parseResponseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: 'Invalid server response', raw: text.slice(0, 120) };
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithNetworkFallback(
  path: string,
  init: (RequestInit & { _retry?: boolean }) | undefined,
  headers: Headers,
): Promise<Response> {
  const primaryUrl = path.startsWith('http') ? path : `${getApiUrl()}${path}`;

  const attempts: string[] = [primaryUrl];

  if (isNativeApp()) {
    const host = await discoverWorkingNativeHost(true);
    if (host) {
      enableLocalBackendOverride();
      const localPath = path.startsWith('http')
        ? path.replace(/^https?:\/\/[^/]+/, `http://${host}:5000`)
        : `http://${host}:5000/api/v1${path}`;
      if (!attempts.includes(localPath)) attempts.push(localPath);
    }
  }

  const lan = import.meta.env.VITE_LAN_HOST ?? '192.168.1.101';
  if (!path.startsWith('http')) {
    for (const base of [`http://localhost:5000/api/v1`, `http://${lan}:5000/api/v1`]) {
      const candidate = `${base}${path}`;
      if (!attempts.includes(candidate)) attempts.push(candidate);
    }
  }

  let lastError: unknown;
  for (let i = 0; i < attempts.length; i++) {
    const url = attempts[i]!;
    for (let retry = 0; retry < 2; retry++) {
      try {
        if (retry > 0) await sleep(1500);
        loginLog('info', `API ${init?.method ?? 'GET'} ${path}`, { url, attempt: i + 1 });
        const res = await fetch(url, { ...init, headers });
        return res;
      } catch (err) {
        lastError = err;
        loginLog('warn', `Network attempt failed`, {
          url,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Cannot reach API for ${path}. Check connection or start local backend.`);
}

async function refreshTokens(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${getApiUrl()}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { accessToken?: string; refreshToken?: string } };
    const access = body.data?.accessToken;
    const refresh = body.data?.refreshToken;
    if (!access || !refresh) return null;
    useAuthStore.getState().setTokens(access, refresh);
    return access;
  } catch {
    return null;
  }
}

function isAuthPath(path: string) {
  return path.startsWith('/auth/');
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit & { _retry?: boolean },
): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  const token = useAuthStore.getState().accessToken;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetchWithNetworkFallback(path, init, headers);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    loginLog('error', `Network error on ${path}`, { url: getApiUrl(), message: raw });
    throw new Error(
      `Cannot reach API at ${getApiUrl()}. Check internet, or run clone-backend locally on the same Wi‑Fi.`,
    );
  }

  if (res.status !== 401) {
    const text = await res.text();
    const data = parseResponseBody(text);
    if (!res.ok) {
      loginLog('error', `API error ${res.status} on ${path}`, data);
      const err = new Error((data as { message?: string })?.message ?? `Request failed: ${res.status}`) as ApiError;
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data as T;
  }

  if (init?._retry || isAuthPath(path)) {
    const err = new Error('Unauthorized') as ApiError;
    err.status = 401;
    throw err;
  }

  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null;
    });
  }
  const newToken = await refreshPromise;
  if (!newToken) {
    useAuthStore.getState().logout();
    const err = new Error('Session expired') as ApiError;
    err.status = 401;
    throw err;
  }

  const retryHeaders = new Headers(init?.headers ?? {});
  if (!retryHeaders.has('Content-Type') && init?.body) {
    retryHeaders.set('Content-Type', 'application/json');
  }
  retryHeaders.set('Authorization', `Bearer ${newToken}`);

  const retryRes = await fetchWithNetworkFallback(path, { ...init, headers: retryHeaders, _retry: true } as RequestInit, retryHeaders);
  const retryText = await retryRes.text();
  const retryData = parseResponseBody(retryText);
  if (!retryRes.ok) {
    const err = new Error((retryData as { message?: string })?.message ?? `Request failed: ${retryRes.status}`) as ApiError;
    err.status = retryRes.status;
    err.data = retryData;
    throw err;
  }
  return retryData as T;
}
