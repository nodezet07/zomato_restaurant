import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getRestaurantAnalytics } from '@/services/restaurants';
import { fetchRestaurantOrders } from '@/services/orders';
import { fetchMenuItems } from '@/services/menu';
import { useRestaurantStore } from '@/stores/restaurantStore';
import {
  Loader2,
  ClipboardList,
  UtensilsCrossed,
  ShoppingBag,
  Star,
  IndianRupee,
  ArrowUpRight,
  Bike,
} from 'lucide-react';

export function DashboardPage() {
  const restaurant = useRestaurantStore((s) => s.restaurant);
  const restaurantId = restaurant?._id ?? '';

  const analyticsQ = useQuery({
    queryKey: ['analytics', restaurantId],
    queryFn: () => getRestaurantAnalytics(restaurantId),
    enabled: Boolean(restaurantId),
  });

  const ordersQ = useQuery({
    queryKey: ['orders', restaurantId, 'dashboard'],
    queryFn: () => fetchRestaurantOrders(restaurantId, { limit: 50 }),
    enabled: Boolean(restaurantId),
    refetchInterval: 20_000,
  });

  const menuQ = useQuery({
    queryKey: ['menu', 'items', restaurantId, 'dashboard'],
    queryFn: () => fetchMenuItems(restaurantId),
    enabled: Boolean(restaurantId),
  });

  if (ordersQ.isLoading || analyticsQ.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[50vh]">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  const orders = ordersQ.data ?? [];
  const menuItems = menuQ.data ?? [];
  const menuHighlights = [...menuItems]
    .filter((i) => i.isAvailable)
    .sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return a.itemName.localeCompare(b.itemName);
    })
    .slice(0, 5);
  const pendingCount = orders.filter(
    (o) => o.orderStatus === 'PENDING' || o.orderStatus === 'CONFIRMED'
  ).length;
  const preparingCount = orders.filter((o) => o.orderStatus === 'PREPARING').length;

  // Calculate today's revenue from live orders
  const todayRevenue = orders
    .filter((o) => o.orderStatus !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.grandTotal ?? 0), 0);

  const analytics = analyticsQ.data as {
    totalOrders?: number;
    completedOrders?: number;
    totalRevenue?: number;
    averageRating?: number;
    totalRatings?: number;
    ordersByStatus?: Array<{ _id: string; count: number }>;
    ordersByDayLast30?: Array<{ _id: string; orders: number; revenue: number }>;
  } | null;

  // Format date helper
  function formatDayName(dateStr: string) {
    if (dateStr.length < 5) return dateStr;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { weekday: 'short' });
    } catch {
      return dateStr;
    }
  }

  // 4 Top Cards configuration
  const cards = [
    {
      label: "Today's Sales",
      value: `₹${Math.round(todayRevenue)}`,
      icon: IndianRupee,
      color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200/30",
      description: "Live orders revenue",
    },
    {
      label: "Active Queue",
      value: pendingCount,
      icon: ClipboardList,
      color: "from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-200/30",
      description: "Awaiting preparation",
    },
    {
      label: "In Kitchen",
      value: preparingCount,
      icon: UtensilsCrossed,
      color: "from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200/30",
      description: "Currently cooking",
    },
    {
      label: "Store Rating",
      value: `${(analytics?.averageRating ?? restaurant?.averageRating ?? 0).toFixed(1)} ★`,
      icon: Star,
      color: "from-purple-500/10 to-fuchsia-500/10 text-purple-600 border-purple-200/30",
      description: `${analytics?.totalRatings ?? restaurant?.totalRatings ?? 0} reviews total`,
    },
  ];

  // Daily Trends - last 7 days of sales from backend, or mock fallback if empty
  const dailySalesData = analytics?.ordersByDayLast30?.slice(-7) || [
    { _id: "Mon", revenue: 4200, orders: 12 },
    { _id: "Tue", revenue: 5800, orders: 18 },
    { _id: "Wed", revenue: 3100, orders: 9 },
    { _id: "Thu", revenue: 6400, orders: 20 },
    { _id: "Fri", revenue: 8200, orders: 25 },
    { _id: "Sat", revenue: 9500, orders: 30 },
    { _id: "Sun", revenue: 7800, orders: 24 },
  ];

  const maxRevenue = Math.max(...dailySalesData.map(d => d.revenue), 1000);

  // Status badges configuration
  const statusLabels: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pending', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
    CONFIRMED: { label: 'Confirmed', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
    PREPARING: { label: 'Preparing', color: 'text-orange-600 bg-orange-500/10 border-orange-500/20' },
    READY_FOR_PICKUP: { label: 'Ready', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
    DELIVERED: { label: 'Delivered', color: 'text-gray-600 bg-gray-500/10 border-gray-500/20' },
    CANCELLED: { label: 'Cancelled', color: 'text-rose-600 bg-rose-500/10 border-rose-500/20' },
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 min-w-0 overflow-hidden">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-ink">Overview Dashboard</h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Real-time analytics and tracking of your restaurant operations flow.
        </p>
      </div>

      {/* STAT CARDS - Mobile-optimized 2x2 grid, scaling to 1x4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="bg-white rounded-2xl border border-black/5 p-4 sm:p-6 shadow-sm hover:translate-y-[-2px] transition-all duration-200 flex flex-col justify-between min-w-0"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] sm:text-xs font-black text-muted uppercase tracking-wider truncate">{c.label}</p>
                <div className={`p-1.5 sm:p-2 rounded-xl bg-gradient-to-br ${c.color} border shrink-0`}>
                  <Icon className="size-4 sm:size-[18px]" />
                </div>
              </div>
              <div className="mt-3 sm:mt-4">
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-ink">{c.value}</p>
                <p className="text-[9px] sm:text-[10px] font-semibold text-muted mt-1 truncate">{c.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 min-w-0 w-full">
        {/* CHART CARD - Pure responsive HTML/CSS styled bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-black/5 p-4 sm:p-6 shadow-sm flex flex-col justify-between min-w-0 w-full overflow-hidden">
          <div>
            <h2 className="text-base sm:text-lg font-black text-ink">Weekly Sales Analytics</h2>
            <p className="text-[10px] sm:text-xs text-muted mt-1">Daily trend of incoming revenue and processed orders.</p>
          </div>
          <div className="h-60 sm:h-72 w-full mt-6 min-w-0 overflow-hidden relative flex flex-col justify-end border-b border-black/5 pb-4">
            <div className="flex h-full items-end justify-between gap-2.5 sm:gap-4 px-2">
              {dailySalesData.map((d) => {
                const heightPercent = Math.max(12, Math.round((d.revenue / maxRevenue) * 100));
                const dayName = formatDayName(d._id);

                return (
                  <div key={d._id} className="flex-1 flex flex-col items-center gap-2.5 group h-full justify-end">
                    <div className="relative w-full flex justify-center items-end h-full">
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 bg-slate-800 text-white text-[10px] font-bold rounded-lg px-2.5 py-1.5 shadow-md whitespace-nowrap">
                        ₹{d.revenue} ({d.orders} orders)
                      </div>
                      {/* Bar fill */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[28px] bg-gradient-to-t from-brand/60 to-brand rounded-t-lg transition-all duration-300 group-hover:from-brand group-hover:to-brand-dark group-hover:shadow-md cursor-pointer"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{dayName}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-4 items-center justify-center text-[10px] sm:text-xs font-bold mt-4 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-brand" />
              <span className="text-muted">Daily Revenue (₹)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-brand/40" />
              <span className="text-muted">Order Volume</span>
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY / ORDER QUEUE */}
        <div className="bg-white rounded-2xl border border-black/5 p-4 sm:p-6 shadow-sm flex flex-col min-w-0 w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base sm:text-lg font-black text-ink">Recent Orders</h2>
            <Link to="/orders" className="text-xs text-brand font-bold hover:underline flex items-center gap-0.5">
              View all
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto pr-1 max-h-[340px] scrollbar-thin">
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <ShoppingBag className="size-8 text-muted/30 mb-2" />
                <p className="text-xs text-muted italic">No active orders yet.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {orders.slice(0, 4).map((o) => {
                  const customer =
                    typeof o.customerId === 'object'
                      ? o.customerId?.fullName ?? 'Customer'
                      : 'Customer';
                  const badgeStyle = statusLabels[o.orderStatus] ?? {
                    label: o.orderStatus,
                    color: 'text-gray-600 bg-gray-50 border-gray-200',
                  };

                  return (
                    <li key={o._id}>
                      <Link
                        to="/orders"
                        className="flex items-center justify-between p-3 rounded-xl bg-black/[0.01] border border-black/5 hover:bg-black/[0.03] transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-ink truncate">
                            #{o.orderNumber ?? o._id.slice(-6).toUpperCase()}
                          </p>
                          <p className="text-[9px] text-muted mt-0.5 font-semibold">{customer}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-black text-ink">₹{o.grandTotal}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle.color} capitalize`}>
                            {o.orderStatus.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SNAPSHOTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Menu Highlights / Top Cuisines */}
        <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm">
          <h2 className="font-black text-sm uppercase tracking-wider text-muted mb-4">
            Menu Highlights & Specials
          </h2>
          <ul className="space-y-3 text-sm">
            {menuHighlights.length === 0 ? (
              <li className="text-xs text-muted italic py-4 text-center">No menu items yet. Add items in Menu.</li>
            ) : (
              menuHighlights.map((item) => {
                const cat =
                  typeof item.categoryId === 'object'
                    ? item.categoryId.categoryName ?? 'Menu'
                    : 'Menu';
                const price = item.discountedPrice ?? item.price;
                const status = item.isRecommended ? 'Recommended' : 'Available';
                return (
                  <li key={item._id} className="flex justify-between border-b border-black/[0.03] pb-2">
                    <div className="min-w-0">
                      <Link to="/menu" className="font-bold text-ink hover:text-brand truncate block">
                        {item.itemName}
                      </Link>
                      <span className="text-[10px] text-muted font-medium">{cat}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-ink">₹{price}</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        item.isRecommended ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {status}
                      </span>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* Ongoing Dispatches / Deliveries */}
        <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm">
          <h2 className="font-black text-sm uppercase tracking-wider text-muted mb-4">
            Ongoing Deliveries & Riders
          </h2>
          <ul className="space-y-3 text-sm">
            {orders.filter((o) =>
              ['READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'].includes(
                o.orderStatus,
              ),
            ).length === 0 ? (
              <li className="text-xs text-muted italic py-4 text-center">No active deliveries.</li>
            ) : (
              orders
                .filter((o) =>
                  ['READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'].includes(
                    o.orderStatus,
                  ),
                )
                .slice(0, 5)
                .map((o) => {
                  const label = `#${o.orderNumber ?? o._id.slice(-6).toUpperCase()}`;
                  const rider =
                    typeof o.riderId === 'object' && o.riderId
                      ? o.riderId.fullName ?? 'Assigned'
                      : null;
                  const statusLabel = o.orderStatus.replace(/_/g, ' ').toLowerCase();

                  return (
                    <li key={o._id} className="flex justify-between border-b border-black/[0.03] pb-2">
                      <div className="min-w-0">
                        <Link to="/orders" className="font-bold text-ink block hover:text-brand">
                          Order {label}
                        </Link>
                        <span className="text-[10px] text-muted font-medium flex items-center gap-1">
                          <Bike className="size-3" />
                          {rider ? `Rider: ${rider}` : 'Awaiting rider'}
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase self-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                        {statusLabel}
                      </span>
                    </li>
                  );
                })
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
