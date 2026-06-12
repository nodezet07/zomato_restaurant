import type { ReactNode } from 'react';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

/** Consistent page wrapper — mobile-safe padding + bottom nav clearance */
export function PageShell({ eyebrow, title, subtitle, action, children }: Props) {
  return (
    <div className="px-4 pb-24 pt-4 sm:px-6 md:pb-8 md:pt-6 lg:px-8 lg:pt-8">
      <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand sm:text-xs">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-0.5 truncate text-xl font-extrabold text-ink sm:text-2xl lg:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted sm:text-sm">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </div>
  );
}
