import { Outlet } from 'react-router-dom';
import { SidebarComponent } from './Sidebar';
import { BottomNav } from './BottomNav';
import { AppReloadButton } from './AppReloadButton';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { UserDropdown } from './UserDropdown';
import { useBootstrapRestaurant } from '@/hooks/useBootstrapRestaurant';
import { useRestaurantInAppNotifications } from '@/hooks/useRestaurantInAppNotifications';
import { useNotificationBridge } from '@/hooks/useNotificationBridge';
import { useRestaurantSocket } from '@/hooks/useRestaurantSocket';
import { useCompactLayout } from '@/hooks/use-mobile';
import { useAuthStore } from '@/stores/authStore';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export function AppLayout() {
  const compact = useCompactLayout();
  const userId = useAuthStore((s) => s.user?._id);
  const { isLoading, isRefetching, error, refetch } = useBootstrapRestaurant();
  const restaurant = useRestaurantStore((s) => s.restaurant);
  useNotificationBridge();
  useRestaurantSocket(restaurant?._id);
  useRestaurantInAppNotifications(restaurant?._id, userId);

  const blockUi = isLoading && !restaurant;

  return (
    <SidebarProvider defaultOpen={!compact}>
      <div className="flex min-h-svh w-full min-w-0">
        <SidebarComponent />

        <div className="flex min-w-0 flex-1 flex-col h-svh overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-black/5 bg-white px-4 shadow-sm sm:h-16 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              {!compact && (
                <SidebarTrigger className="shrink-0 text-muted hover:text-ink" />
              )}
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-sm font-extrabold text-ink sm:text-base">
                  {restaurant?.restaurantName ?? 'QuickBite'}
                </h2>
                {restaurant && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase sm:px-2.5 sm:text-[10px] ${
                      restaurant.isOpen ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                    }`}
                  >
                    {restaurant.isOpen ? 'Open' : 'Closed'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <AppReloadButton />
              <NotificationBell enabled={Boolean(userId)} />
              <UserDropdown compact={compact} />
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-surface">
            {blockUi && (
              <div className="flex h-40 items-center justify-center text-sm font-medium text-muted animate-pulse">
                Loading restaurant…
              </div>
            )}
            {error && !blockUi && !restaurant && (
              <div className="m-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:m-6 space-y-2">
                <p>{(error as Error).message}</p>
                <button
                  type="button"
                  className="text-xs font-bold underline"
                  onClick={() => void refetch()}
                >
                  Retry
                </button>
              </div>
            )}
            {!blockUi && (
              <>
                {isRefetching && (
                  <div className="px-4 py-1 text-[10px] font-semibold text-muted md:px-6">
                    Syncing restaurant…
                  </div>
                )}
                <Outlet />
              </>
            )}
          </main>

          {compact && <BottomNav />}
        </div>
      </div>
    </SidebarProvider>
  );
}
