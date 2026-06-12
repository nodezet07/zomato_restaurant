import { API_URL } from '@/config/env';
import { useAuthStore } from '@/stores/authStore';

export type ApiError = Error & { status?: number; data?: unknown };

let refreshPromise: Promise<string | null> | null = null;

async function refreshTokens(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh-token`, {
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
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  const token = useAuthStore.getState().accessToken;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, { ...init, headers });

  if (res.status !== 401) {
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
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

  const retryRes = await fetch(url, { ...init, headers: retryHeaders, _retry: true } as RequestInit);
  const retryText = await retryRes.text();
  const retryData = retryText ? JSON.parse(retryText) : null;
  if (!retryRes.ok) {
    const err = new Error((retryData as { message?: string })?.message ?? `Request failed: ${retryRes.status}`) as ApiError;
    err.status = retryRes.status;
    err.data = retryData;
    throw err;
  }
  return retryData as T;
}
