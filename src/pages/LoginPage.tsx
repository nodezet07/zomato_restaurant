import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Award, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { sendRestaurantEmailOtp, verifyRestaurantEmailOtp } from '@/services/auth';
import {
  BACKEND_URLS,
  discoverProductionBackend,
  discoverWorkingNativeHost,
  enableLocalBackendOverride,
  getEnvInfo,
} from '@/config/env';
import { registerForPushNotifications } from '@/lib/pushNotifications';
import {
  loginLog,
} from '@/lib/loginLogger';
import { useAuthStore } from '@/stores/authStore';
import { useRestaurantStore } from '@/stores/restaurantStore';
import type { AuthUser } from '@/types/api';

type Step = 'email' | 'otp';

function assertRestaurantOwner(user: AuthUser) {
  if (user.role !== 'restaurant_owner') {
    throw new Error('This portal is for restaurant partners only.');
  }
}

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearRestaurant = useRestaurantStore((s) => s.clearRestaurant);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [envInfo, setEnvInfo] = useState(getEnvInfo());
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ok' | 'fail'>('checking');

  const otpInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loginLog('info', 'Login page mounted', envInfo);
  }, []);

  useEffect(() => {
    if (!envInfo.isNative) {
      setBackendStatus('ok');
      return;
    }

    let alive = true;

    if (envInfo.useProductionBackend || envInfo.apiUrl.startsWith('https://')) {
      void discoverProductionBackend().then((ok) => {
        if (!alive) return;
        if (ok) {
          setBackendStatus('ok');
          loginLog('success', 'Production backend reachable', { api: getEnvInfo().apiUrl });
        } else {
          setBackendStatus('fail');
          loginLog('error', 'Production backend not reachable', { api: getEnvInfo().apiUrl });
        }
      });
      return () => {
        alive = false;
      };
    }

    void discoverWorkingNativeHost().then((host) => {
      if (!alive) return;
      if (host) {
        setBackendStatus('ok');
        setEnvInfo(getEnvInfo());
        loginLog('success', 'Backend reachable', { host, api: getEnvInfo().apiUrl });
      } else {
        setBackendStatus('fail');
        loginLog('error', 'Backend not reachable', { tried: getEnvInfo().hostCandidates });
      }
    });
    return () => {
      alive = false;
    };
  }, [envInfo.isNative, envInfo.useProductionBackend, envInfo.apiUrl]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const finishAuth = (data: { user: AuthUser; accessToken: string; refreshToken: string }) => {
    loginLog('success', 'Login complete — redirecting', {
      email: data.user.email,
      role: data.user.role,
    });
    assertRestaurantOwner(data.user);
    clearRestaurant();
    setAuth(data.user, data.accessToken, data.refreshToken);
    void registerForPushNotifications();
    navigate('/', { replace: true });
  };

  const sendOtp = useMutation({
    mutationFn: async () => {
      const latestEnv = getEnvInfo();
      if (latestEnv.isNative && latestEnv.useProductionBackend) {
        const renderOk = await discoverProductionBackend();
        if (!renderOk) {
          const host = await discoverWorkingNativeHost(true);
          if (!host) {
            throw new Error(
              `Cannot reach ${BACKEND_URLS.production.base}. Wait ~30s if the server was sleeping, or enable local backend and ensure phone + PC are on same Wi‑Fi.`,
            );
          }
          enableLocalBackendOverride();
          setEnvInfo(getEnvInfo());
          setBackendStatus('ok');
          loginLog('warn', 'Falling back to local backend', { host, api: getEnvInfo().apiUrl });
        }
      } else if (latestEnv.isNative && !latestEnv.apiUrl.startsWith('https://')) {
        loginLog('info', 'Discovering backend before OTP…');
        const host = await discoverWorkingNativeHost();
        if (!host) {
          const lan = import.meta.env.VITE_LAN_HOST ?? '192.168.1.101';
          throw new Error(
            `Cannot reach backend at ${lan}:5000. Start clone-backend (npm run dev), use same Wi‑Fi, and set VITE_LAN_HOST=${lan} in .env then rebuild APK.`,
          );
        }
      }
      loginLog('info', 'Sending restaurant email OTP', {
        email: email.trim().toLowerCase(),
        api: latestEnv.apiUrl,
      });
      return sendRestaurantEmailOtp(email.trim().toLowerCase());
    },
    onSuccess: () => {
      loginLog('success', 'Send OTP UI success');
      setStep('otp');
      setResendTimer(60);
      setErrorMsg('');
      setOtpCode('');
      setTimeout(() => otpInputRef.current?.focus(), 120);
    },
    onError: (err: Error) => {
      loginLog('error', 'Send OTP UI error', err.message);
      setErrorMsg(err.message || 'Failed to send OTP');
    },
  });

  const verifyOtp = useMutation({
    mutationFn: () => verifyRestaurantEmailOtp(email.trim().toLowerCase(), otpCode),
    onSuccess: finishAuth,
    onError: (err: Error) => {
      loginLog('error', 'Verify OTP UI error', err.message);
      setErrorMsg(err.message);
      setOtpCode('');
      setTimeout(() => otpInputRef.current?.focus(), 80);
    },
  });

  const busy = sendOtp.isPending || verifyOtp.isPending;

  const handleEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim().includes('@')) {
      loginLog('warn', 'Invalid email format', { email });
      setErrorMsg('Please enter a valid Gmail / email address');
      return;
    }
    loginLog('info', 'Send OTP form submitted', { email: email.trim().toLowerCase() });
    sendOtp.mutate();
  };

  const handleOtpSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (otpCode.length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP');
      return;
    }
    verifyOtp.mutate();
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    setErrorMsg('');
    setOtpCode('');
    sendOtp.mutate();
  };

  const FormBody = (
    <div className="flex w-full max-w-[360px] flex-col gap-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-brand shadow-lg">
          <Mail className="size-7 text-white" />
        </div>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-slate-800">
            {step === 'email' ? 'Login with Gmail' : 'Verify OTP'}
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
            {step === 'email'
              ? "We'll send a 6-digit OTP to your restaurant partner email."
              : `Enter the code sent to ${email}`}
          </p>
        </div>
      </div>

      {envInfo.isNative && backendStatus !== 'ok' && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-center text-[12px] font-medium leading-relaxed ${
            backendStatus === 'checking'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-red-200 bg-red-50 text-red-600'
          }`}
        >
          {backendStatus === 'checking'
            ? envInfo.useProductionBackend
              ? `Connecting to ${BACKEND_URLS.production.base}…`
              : `Checking backend at ${import.meta.env.VITE_LAN_HOST ?? '192.168.1.101'}:5000…`
            : envInfo.useProductionBackend
              ? `Cannot reach ${BACKEND_URLS.production.base}. Check internet — Render may take ~30s to wake up.`
              : `Cannot reach backend. Start clone-backend (npm run dev), use same Wi‑Fi, then rebuild APK.`}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-center text-[12.5px] font-semibold text-red-600">
          {errorMsg}
        </div>
      )}

      {step === 'email' && (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Gmail / Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                autoComplete="email"
                placeholder="owner@foodapp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-orange-500/20"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-bold text-white shadow-md shadow-orange-400/25 transition-all hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sendOtp.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Sending to Gmail…
              </>
            ) : (
              'Send OTP →'
            )}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form
          onSubmit={handleOtpSubmit}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="mb-1.5 block text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
              6-digit OTP
            </label>
            <input
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                if (!pasted) return;
                e.preventDefault();
                setOtpCode(pasted);
              }}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-xl font-bold tracking-[0.45em] text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-orange-500/20"
              placeholder="------"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 text-center text-[12.5px]">
            <span className="text-slate-400">Didn&apos;t receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendTimer > 0}
              className={`font-bold transition-colors ${resendTimer > 0 ? 'cursor-not-allowed text-slate-400' : 'text-brand hover:text-brand-dark'}`}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Now'}
            </button>
          </div>

          <button
            type="submit"
            disabled={busy || otpCode.length < 6}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-bold text-white shadow-md shadow-orange-400/25 transition-all hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {verifyOtp.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Verifying…
              </>
            ) : (
              'Verify & Continue'
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('email');
              setOtpCode('');
              setErrorMsg('');
            }}
            className="text-center text-[12.5px] text-slate-400 underline underline-offset-2 transition-colors hover:text-brand"
          >
            Change email
          </button>
        </form>
      )}

      <div className="flex select-none flex-wrap items-center justify-center gap-4 text-[9.5px] font-bold uppercase tracking-widest text-slate-400 sm:gap-6">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald-500" /> Secure Login
        </span>
        <span className="flex items-center gap-1.5">
          <Award className="size-3.5 text-blue-400" /> Partner Verified
        </span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex min-h-[100dvh] flex-col overflow-hidden md:flex-row">
      {/* Mobile hero */}
      <div
        className="relative max-h-[38vh] min-h-[200px] shrink-0 overflow-hidden md:hidden"
        style={{ background: 'linear-gradient(145deg, #ff5a00 0%, #d44a00 100%)' }}
      >
        <div className="flex h-full flex-col items-center justify-center px-6 py-8 text-center text-white">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 shadow-xl">
            <Mail className="size-8 text-brand" />
          </div>
          <h2 className="text-xl font-black sm:text-2xl">QuickBite Partner</h2>
          <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-white/90 sm:text-sm">
            Sign in with your Gmail — OTP sent to your inbox
          </p>
        </div>
      </div>

      {/* Desktop left */}
      <div
        className="relative hidden h-full w-1/2 shrink-0 flex-col items-center justify-center overflow-hidden md:flex"
        style={{ background: 'linear-gradient(145deg, #1a1c1c 0%, #2d2410 40%, #1a1008 100%)' }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(#ff5a00 1px, transparent 1px), linear-gradient(90deg, #ff5a00 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 flex max-w-sm flex-col items-center gap-6 px-8 text-center">
          <div className="flex h-52 w-52 items-center justify-center rounded-[32px] bg-brand shadow-2xl">
            <Mail className="size-20 text-white" />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white">QuickBite</h2>
            <p className="mt-2 text-sm text-white/60">Gmail OTP login for restaurant partners</p>
          </div>
        </div>
      </div>

      {/* Mobile form sheet */}
      <div className="-mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_-6px_32px_rgba(0,0,0,0.12)] md:hidden">
        <div className="flex shrink-0 justify-center pt-3">
          <div className="h-1 w-9 rounded-full bg-slate-200" />
        </div>
        <div
          className="flex flex-1 items-start justify-center overflow-y-auto overscroll-contain px-4 pt-4"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        >
          {FormBody}
        </div>
      </div>

      {/* Desktop form */}
      <div className="hidden min-h-0 flex-1 items-center justify-center overflow-y-auto bg-white px-6 py-10 md:flex md:w-1/2 lg:px-12">
        {FormBody}
      </div>
    </div>
  );
}
