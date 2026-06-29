import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { logoutApi } from '@/services/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, RefreshCw } from 'lucide-react';
import { isNativeApp } from '@/hooks/use-mobile';
import { reloadApp } from '@/lib/appReload';
import { unregisterForPushNotifications } from '@/lib/pushNotifications';

export function UserDropdown({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logout = useAuthStore((s) => s.logout);
  const clearRestaurant = useRestaurantStore((s) => s.clearRestaurant);

  const handleLogout = async () => {
    try {
      await unregisterForPushNotifications();
      await logoutApi(refreshToken);
    } catch {
      // ignore
    }
    logout();
    clearRestaurant();
    navigate('/login', { replace: true });
  };

  const nameParts = user?.fullName ? user.fullName.split(' ') : ['Owner'];
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || '';
  const initials = ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-2 pl-1 cursor-pointer group select-none sm:gap-3 sm:pl-2">
          {!compact && (
            <div className="hidden flex-col items-end opacity-90 group-hover:opacity-100 transition-opacity sm:flex">
              <span className="max-w-[120px] truncate text-xs font-bold text-ink leading-none">
                {user?.fullName ?? 'Restaurant Owner'}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted mt-1">
                {user?.role?.replace('_', ' ') ?? 'Owner'}
              </span>
            </div>
          )}
          <div className="relative">
            <div className="h-9 w-9 overflow-hidden rounded-full border border-black/10 bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center text-brand font-black text-xs transition-all duration-300 group-hover:border-brand group-hover:scale-105 shadow-sm active:scale-95">
              {user?.profileImage ? (
                <img src={user.profileImage} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                initials || <User className="size-4" />
              )}
            </div>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-2 p-2 rounded-xl border border-black/5 shadow-xl bg-white">
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-bold leading-none text-ink">{user?.fullName ?? 'Owner'}</p>
            <p className="text-xs leading-none text-muted">{user?.email ?? ''}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-black/5" />
        {isNativeApp() && (
          <DropdownMenuItem
            onClick={() => reloadApp()}
            className="focus:bg-brand/5 focus:text-brand rounded-lg cursor-pointer transition-colors px-3 py-2.5"
          >
            <div className="flex items-center w-full">
              <RefreshCw className="size-4 mr-3" />
              <span className="font-semibold text-sm">Reload app</span>
            </div>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem 
          onClick={handleLogout}
          className="focus:bg-red-50 focus:text-red-600 text-red-500 rounded-lg cursor-pointer transition-colors px-3 py-2.5"
        >
          <div className="flex items-center w-full">
            <LogOut className="size-4 mr-3" />
            <span className="font-semibold text-sm">Logout</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
