import { Outlet } from 'react-router-dom';
import { SidebarComponent } from './Sidebar';
import { BottomNav } from './BottomNav';
import { UserDropdown } from './UserDropdown';
import { useBootstrapRestaurant } from '@/hooks/useBootstrapRestaurant';
import { useRestaurantSocket } from '@/hooks/useRestaurantSocket';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export function AppLayout() {
  const { isLoading, error } = useBootstrapRestaurant();
  const restaurant = useRestaurantStore((s) => s.restaurant);
  useRestaurantSocket(restaurant?._id);

  return (
    <SidebarProvider>
      <SidebarComponent />

      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-black/5 bg-white px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="text-muted hover:text-ink" />
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-extrabold text-ink md:text-base">
                {restaurant?.restaurantName ?? 'QuickBite'}
              </h2>
              {restaurant && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                    restaurant.isOpen ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                  }`}
                >
                  {restaurant.isOpen ? 'Open' : 'Closed'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UserDropdown />
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-surface">
          {isLoading && (
            <div className="flex h-40 items-center justify-center text-sm font-medium text-muted animate-pulse">
              Loading restaurant…
            </div>
          )}
          {error && !isLoading && (
            <div className="m-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:m-6">
              {(error as Error).message}
            </div>
          )}
          {!isLoading && <Outlet />}
        </main>

        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
