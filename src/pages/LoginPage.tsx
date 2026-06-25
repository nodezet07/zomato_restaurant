import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Award, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { sendRestaurantEmailOtp, verifyRestaurantEmailOtp } from '@/services/auth';
import {
  discoverWorkingNativeHost,
  getEnvInfo,
} from '@/config/env';
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
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [errorMsg, setErrorMsg] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [envInfo] = useState(getEnvInfo());

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    loginLog('info', 'Login page mounted', envInfo);
  }, []);

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
    navigate('/', { replace: true });
  };

  const sendOtp = useMutation({
    mutationFn: async () => {
      loginLog('info', 'Discovering backend before OTP…');
      const host = await discoverWorkingNativeHost();
      if (!host) {
        throw new Error(
          'Cannot reach backend. Ensure clone-backend is running and your phone is on same Wi-Fi.',
        );
      }
      loginLog('info', 'Sending restaurant email OTP', {
        email: email.trim().toLowerCase(),
        api: getEnvInfo().apiUrl,
      });
      return sendRestaurantEmailOtp(email.trim().toLowerCase());
    },
    onSuccess: () => {
      loginLog('success', 'Send OTP UI success');
      setStep('otp');
      setResendTimer(60);
      setErrorMsg('');
      setTimeout(() => otpInputRefs.current[0]?.focus(), 120);
    },
    onError: (err: Error) => {
      loginLog('error', 'Send OTP UI error', err.message);
      setErrorMsg(err.message || 'Failed to send OTP');
    },
  });

  const verifyOtp = useMutation({
    mutationFn: () => verifyRestaurantEmailOtp(email.trim().toLowerCase(), otp.join('')),
    onSuccess: finishAuth,
    onError: (err: Error) => {
      loginLog('error', 'Verify OTP UI error', err.message);
      setErrorMsg(err.message);
      setOtp(Array(6).fill(''));
      setTimeout(() => otpInputRefs.current[0]?.focus(), 80);
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

  const handleOtpChange = (value: string, index: number) => {
    const clean = value.replace(/\D/g, '');
    if (!clean && value.length > 0) return;
    const next = [...otp];
    if (clean.length > 1) {
      const paste = clean.slice(0, 6 - index);
      for (let i = 0; i < paste.length; i++) next[index + i] = paste[i];
      setOtp(next);
      otpInputRefs.current[Math.min(index + paste.length, 5)]?.focus();
      return;
    }
    next[index] = clean;
    setOtp(next);
    if (clean && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const next = [...otp];
      next[index - 1] = '';
      setOtp(next);
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (otp.join('').length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP');
      return;
    }
    verifyOtp.mutate();
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    setErrorMsg('');
    setOtp(Array(6).fill(''));
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
        <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
          <div className="flex justify-center gap-1.5 sm:gap-2">
            {otp.map((digit, i) => (
              <input
                key={i}
                type="text"
                inputMode="numeric"
                maxLength={6}
                ref={(el) => {
                  otpInputRefs.current[i] = el;
                }}
                value={digit}
                onChange={(e) => handleOtpChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                autoFocus={i === 0}
                className={[
                  'h-[50px] w-[42px] rounded-xl border-[1.5px] bg-white text-center text-xl font-bold text-slate-800 outline-none transition-all sm:h-[52px] sm:w-[46px] sm:text-[22px]',
                  digit
                    ? 'border-brand ring-2 ring-orange-400/20'
                    : 'border-slate-200 focus:border-brand focus:ring-2 focus:ring-orange-400/20',
                ].join(' ')}
              />
            ))}
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
            disabled={busy || otp.join('').length < 6}
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
              setOtp(Array(6).fill(''));
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
