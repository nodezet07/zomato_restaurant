import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { isNativeApp } from '@/hooks/use-mobile';
import { reloadApp } from '@/lib/appReload';

export function AppReloadButton() {
  const [reloading, setReloading] = useState(false);

  if (!isNativeApp()) return null;

  return (
    <button
      type="button"
      aria-label="Reload app"
      disabled={reloading}
      onClick={() => {
        setReloading(true);
        reloadApp();
      }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-white text-muted transition-colors hover:border-brand/30 hover:bg-brand/5 hover:text-brand active:scale-95 disabled:opacity-60"
    >
      <RefreshCw className={`size-[18px] ${reloading ? 'animate-spin' : ''}`} />
    </button>
  );
}
