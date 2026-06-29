import { apiFetch } from '@/lib/api';
import { loginLog } from '@/lib/loginLogger';
import type { ApiResponse, AuthTokens, AuthUser } from '@/types/api';

type AuthPayload = AuthTokens & { user: AuthUser };

function unwrapAuth(body: ApiResponse<AuthPayload>) {
  return body.data;
}

/** Gmail / email OTP — primary restaurant login */
export async function sendRestaurantEmailOtp(email: string) {
  loginLog('info', 'Sending restaurant email OTP', { email });
  try {
    const body = await apiFetch<
      ApiResponse<{ email?: string; purpose?: string }>
    >('/auth/restaurant/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    loginLog('success', 'OTP send response received');
    return body.data;
  } catch (err) {
    loginLog('error', 'OTP send failed', err instanceof Error ? err.message : err);
    throw err;
  }
}

export async function verifyRestaurantEmailOtp(email: string, otp: string) {
  loginLog('info', 'Verifying restaurant email OTP', { email, otpLength: otp.length });
  try {
    const body = await apiFetch<ApiResponse<AuthPayload>>('/auth/restaurant/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    loginLog('success', 'OTP verified', { userId: body.data?.user?._id, role: body.data?.user?.role });
    return unwrapAuth(body);
  } catch (err) {
    loginLog('error', 'OTP verify failed', err instanceof Error ? err.message : err);
    throw err;
  }
}

export async function sendRestaurantOtp(mobile: string) {
  const body = await apiFetch<
    ApiResponse<{ email?: string; purpose?: string }>
  >('/auth/restaurant/send-otp', {
    method: 'POST',
    body: JSON.stringify({ mobile }),
  });
  return body.data;
}

export async function verifyRestaurantOtp(mobile: string, otp: string) {
  const body = await apiFetch<ApiResponse<AuthPayload>>('/auth/restaurant/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ mobile, otp }),
  });
  return unwrapAuth(body);
}

export async function loginWithPassword(email: string, password: string) {
  const body = await apiFetch<ApiResponse<AuthPayload>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return unwrapAuth(body);
}

export async function fetchCurrentUser() {
  const body = await apiFetch<ApiResponse<{ user: AuthUser }>>('/auth/me');
  return body.data.user;
}

export async function logoutApi(refreshToken: string | null) {
  if (!refreshToken) return;
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // ignore
  }
}
