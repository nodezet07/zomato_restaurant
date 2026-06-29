import * as React from 'react';
import { Capacitor } from '@capacitor/core';

const MOBILE_BREAKPOINT = 768;

function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export { isNativeApp };

function computeCompactLayout(): boolean {
  if (isNativeApp()) return true;
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

/** Phone / tablet app shell — native Capacitor always uses compact (bottom nav, no desktop sidebar). */
export function useCompactLayout(): boolean {
  const [compact, setCompact] = React.useState<boolean>(() => computeCompactLayout());

  React.useEffect(() => {
    if (isNativeApp()) {
      setCompact(true);
      return;
    }
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setCompact(window.innerWidth < MOBILE_BREAKPOINT);
    mql.addEventListener('change', onChange);
    setCompact(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return compact;
}

/** @deprecated use useCompactLayout — kept for shadcn sidebar compat */
export function useIsMobile(): boolean {
  return useCompactLayout();
}
