import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Settings,
  Store,
  Tag,
  Star,
  Wallet,
  BarChart3,
  LifeBuoy,
  Bell,
} from 'lucide-react';
import { useRestaurantStore } from '@/stores/restaurantStore';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Orders', icon: ClipboardList, end: false },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed, end: false },
  { to: '/offers', label: 'Offers', icon: Tag, end: false },
  { to: '/reviews', label: 'Reviews', icon: Star, end: false },
  { to: '/finance', label: 'Finance', icon: Wallet, end: false },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, end: false },
  { to: '/notifications', label: 'Notifications', icon: Bell, end: false },
  { to: '/support', label: 'Support', icon: LifeBuoy, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: true },
];

export function SidebarComponent() {
  const location = useLocation();
  const restaurant = useRestaurantStore((s) => s.restaurant);
  const { isMobile, setOpenMobile } = useSidebar();

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-black/5 bg-white">
      <SidebarHeader className="h-16 border-b border-black/5 flex flex-col justify-center px-4 group-data-[collapsible=icon]:px-0 transition-all duration-300 ease-in-out">
        <div className="flex items-center gap-3 pr-2 group-data-[collapsible=icon]:pr-0 group-data-[collapsible=icon]:justify-center transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-center rounded-xl bg-brand text-white p-2 shrink-0 transition-all duration-300 ease-in-out h-9 w-9">
            {restaurant?.logo ? (
              <img
                src={restaurant.logo}
                alt="Restaurant Logo"
                className="w-full h-full rounded-lg object-contain transition-all duration-300"
              />
            ) : (
              <Store className="size-5 shrink-0" />
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden group-data-[collapsible=icon]:hidden animate-in fade-in slide-in-from-left-2 duration-300">
            <h1 className="text-xs font-black leading-tight tracking-tight text-ink truncate">
              {restaurant?.restaurantName || 'QuickBite'}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted truncate">Restaurant Portal</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarMenu className="px-2 space-y-1">
          {links.map(({ to, label, end, icon: Icon }) => {
            const isActive = end
              ? location.pathname === to
              : location.pathname.startsWith(to) && to !== '/';

            return (
              <SidebarMenuItem key={to}>
                <SidebarMenuButton
                  asChild
                  tooltip={label}
                  isActive={isActive}
                  className="h-10 transition-all duration-200 data-[active=true]:bg-brand/10 data-[active=true]:text-brand data-[active=true]:hover:bg-brand/20 data-[active=true]:hover:text-brand"
                >
                  <Link to={to} className="flex items-center w-full" onClick={closeMobile}>
                    <Icon className="size-[18px] shrink-0" />
                    <span className="font-semibold ml-3 group-data-[collapsible=icon]:hidden text-sm">{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-black/5 p-4">
        <SidebarMenu className="gap-2">
          <SidebarMenuItem className="px-2 group-data-[collapsible=icon]:hidden mt-2">
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-black/[0.02] border border-black/5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted">System Release</span>
                <span className="text-[10px] font-black text-ink bg-white px-1.5 py-0.5 rounded-md border border-black/10 shadow-sm">v1.1.0</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10 w-full justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-600">ONLINE</span>
                </div>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
