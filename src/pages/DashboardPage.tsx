import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Loader2,
  UtensilsCrossed,
  IndianRupee,
  ArrowUpRight,
  Bike,
  Clock,
  ChefHat,
  Package,
  Star,
  BarChart3,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';

import { getRestaurantAnalytics } from '@/services/restaurants';
import { fetchRestaurantOrders } from '@/services/orders';
import { fetchMenuItems } from '@/services/menu';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { useCompactLayout } from '@/hooks/use-mobile';
import { PageShell } from '@/components/layout/PageShell';
import { OrderDetailDialog } from '@/components/orders/OrderDetailDialog';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { RestaurantAnalytics } from '@/types/analytics';
import type { Order } from '@/types/api';
import { cn } from '@/lib/utils';
import { SparklineStatCard } from '@/components/dashboard/SparklineStatCard';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for pickup',
  RIDER_ASSIGNED: 'Rider assigned',
  PICKED_UP: 'Picked up',
  ON_THE_WAY: 'On the way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: '#10b981',       // Emerald
  CANCELLED: '#f43f5e',       // Rose
  PENDING: '#f59e0b',         // Amber
  CONFIRMED: '#d97706',       // Dark Amber
  PREPARING: '#06b6d4',       // Cyan
  READY_FOR_PICKUP: '#6366f1', // Indigo
  RIDER_ASSIGNED: '#3b82f6',   // Blue
  PICKED_UP: '#2563eb',        // Blue-dark
  ON_THE_WAY: '#1d4ed8',       // Blue-darker
};

const PIPELINE_STEPS = [
  { key: 'action', label: 'Needs action', statuses: ['PENDING', 'CONFIRMED'], icon: Clock },
  { key: 'kitchen', label: 'In kitchen', statuses: ['PREPARING'], icon: ChefHat },
  { key: 'ready', label: 'Ready for pickup', statuses: ['READY_FOR_PICKUP'], icon: Package },
  {
    key: 'delivery',
    label: 'Out for delivery',
    statuses: ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'],
    icon: Bike,
  },
] as const;

function isToday(iso?: string) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function formatDayLabel(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr.slice(5) || dateStr;
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function customerName(order: Order) {
  return typeof order.customerId === 'object'
    ? order.customerId?.fullName ?? 'Customer'
    : 'Customer';
}

function orderCode(order: Order) {
  return `#${order.orderNumber ?? order._id.slice(-6).toUpperCase()}`;
}



function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-2xl border border-black/5 bg-white shadow-xs", className)}
    >
      <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-ink sm:text-base">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-[10px] font-semibold text-muted sm:text-xs">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function DashboardPage() {
  const compact = useCompactLayout();
  const restaurant = useRestaurantStore((s) => s.restaurant);
  const restaurantId = restaurant?._id ?? '';
  const [trackOrderId, setTrackOrderId] = useState<string | null>(null);

  const analyticsQ = useQuery({
    queryKey: ['analytics', restaurantId],
    queryFn: () => getRestaurantAnalytics(restaurantId),
    enabled: Boolean(restaurantId),
  });

  const ordersQ = useQuery({
    queryKey: ['orders', restaurantId, 'dashboard'],
    queryFn: () => fetchRestaurantOrders(restaurantId, { limit: 100 }),
    enabled: Boolean(restaurantId),
    refetchInterval: 20_000,
  });

  const menuQ = useQuery({
    queryKey: ['menu', 'items', restaurantId, 'dashboard'],
    queryFn: () => fetchMenuItems(restaurantId),
    enabled: Boolean(restaurantId),
  });

  const orders = ordersQ.data ?? [];
  const analytics = analyticsQ.data as RestaurantAnalytics | undefined;

  const todayStats = useMemo(() => {
    const todayOrders = orders.filter((o) => isToday(o.createdAt) && o.orderStatus !== 'CANCELLED');
    const revenue = todayOrders.reduce((s, o) => s + (o.grandTotal ?? 0), 0);
    return { count: todayOrders.length, revenue };
  }, [orders]);

  const pipelineCounts = useMemo(() => {
    return PIPELINE_STEPS.map((step) => ({
      ...step,
      count: orders.filter((o) => (step.statuses as readonly string[]).includes(o.orderStatus)).length,
    }));
  }, [orders]);

  const chartDays = useMemo(() => {
    const days = analytics?.ordersByDayLast30 ?? [];
    if (days.length >= 7) return days.slice(-7);
    
    const padded = [...days];
    const needed = 7 - padded.length;
    const firstDate = padded[0] ? new Date(padded[0]._id) : new Date();
    
    for (let i = 1; i <= needed; i++) {
      const prev = new Date(firstDate);
      prev.setDate(firstDate.getDate() - i);
      const yyyy = prev.getFullYear();
      const mm = String(prev.getMonth() + 1).padStart(2, '0');
      const dd = String(prev.getDate()).padStart(2, '0');
      padded.unshift({
        _id: `${yyyy}-${mm}-${dd}`,
        orders: 0,
        revenue: 0,
      });
    }
    return padded;
  }, [analytics]);

  const maxRevenue = useMemo(() => {
    return Math.max(...chartDays.map((d) => d.revenue), 0);
  }, [chartDays]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
        .slice(0, 8),
    [orders],
  );

  const activeDeliveries = useMemo(
    () =>
      orders.filter((o) =>
        ['READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(o.orderStatus),
      ),
    [orders],
  );

  const menuHighlights = useMemo(() => {
    return [...(menuQ.data ?? [])]
      .filter((i) => i.isAvailable)
      .sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return a.itemName.localeCompare(b.itemName);
      })
      .slice(0, 5);
  }, [menuQ.data]);

  // Extract Sparkline Data
  const revenueSeries = useMemo(() => chartDays.map((d) => ({ date: d._id, value: d.revenue })), [chartDays]);
  const ordersSeries = useMemo(() => chartDays.map((d) => ({ date: d._id, value: d.orders })), [chartDays]);
  const ratingSeries = useMemo(() => {
    const rating = restaurant?.averageRating ?? 0;
    const total = restaurant?.totalRatings ?? 0;
    const vals = total === 0 ? [0, 0, 0, 0, 0, 0, 0] : [rating - 0.2, rating - 0.1, rating, rating - 0.1, rating + 0.1, rating, rating];
    return vals.map((val, idx) => ({ date: String(idx), value: val }));
  }, [restaurant?.averageRating, restaurant?.totalRatings]);

  const loading = ordersQ.isLoading || analyticsQ.isLoading;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <PageShell
      eyebrow="Dashboard"
      title={restaurant?.restaurantName ?? 'Overview'}
      subtitle="Today’s performance, live order queue, and sales at a glance."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <NotificationBell
            enabled={Boolean(restaurantId)}
            onOrderSelect={(id) => setTrackOrderId(id)}
          />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest",
              restaurant?.isOpen
                ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
            )}
          >
            <span className={cn("size-1.5 rounded-full", restaurant?.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500')} />
            {restaurant?.isOpen ? 'Accepting orders' : 'Closed'}
          </span>
          <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold shadow-xs">
            <Link to="/analytics">
              <BarChart3 className="mr-1.5 size-3.5" />
              Full analytics
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-5 sm:space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <SparklineStatCard
            label="Today's sales"
            sublabel={`${todayStats.count} orders`}
            value={`₹${todayStats.revenue.toLocaleString('en-IN')}`}
            series={revenueSeries}
            color="var(--color-brand)"
            icon={IndianRupee}
            formatChange={(val) => '₹' + Math.abs(val).toLocaleString('en-IN')}
          />
          <SparklineStatCard
            label="Lifetime revenue"
            sublabel={`${analytics?.completedOrders ?? 0} delivered`}
            value={`₹${(analytics?.totalRevenue ?? 0).toLocaleString('en-IN')}`}
            series={revenueSeries}
            color="#10b981"
            icon={IndianRupee}
            formatChange={(val) => '₹' + Math.abs(val).toLocaleString('en-IN')}
          />
          <SparklineStatCard
            label="Rating"
            sublabel={`${analytics?.totalRatings ?? restaurant?.totalRatings ?? 0} reviews`}
            value={`${(analytics?.averageRating ?? restaurant?.averageRating ?? 0).toFixed(1)} ★`}
            series={ratingSeries}
            color="#f59e0b"
            icon={Star}
            formatChange={(val) => `${val >= 0 ? '+' : '-'}${Math.abs(val).toFixed(2)} ★`}
          />
          <SparklineStatCard
            label="Total orders"
            sublabel="All time"
            value={String(analytics?.totalOrders ?? orders.length)}
            series={ordersSeries}
            color="#3b82f6"
            icon={UtensilsCrossed}
            formatChange={(val) => `${val >= 0 ? '+' : '-'}${Math.round(Math.abs(val))} orders`}
          />
        </div>

        {/* Chart + pipeline */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <SectionCard
            className="lg:col-span-8"
            title="Revenue — last 7 days"
            subtitle="Daily delivered revenue from your analytics"
            action={
              <Link
                to="/analytics"
                className="flex shrink-0 items-center gap-0.5 text-xs font-extrabold text-brand hover:underline"
              >
                Details
                <ArrowUpRight className="size-3.5" />
              </Link>
            }
          >
            {chartDays.length === 0 ? (
              <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-black/10 bg-slate-50/80 text-sm text-muted-foreground">
                No sales data yet. Complete orders to see trends.
              </div>
            ) : (
              <div className="w-full">
                <ChartContainer
                  className="h-52 w-full"
                  config={{
                    revenue: {
                      label: 'Revenue',
                      color: 'var(--color-brand)',
                    },
                  }}
                >
                  <AreaChart data={chartDays} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashboardRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                    <XAxis
                      dataKey="_id"
                      tickFormatter={(val) => formatDayLabel(val)}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--color-muted-foreground)' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      domain={[0, maxRevenue === 0 ? 1000 : 'auto']}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--color-muted-foreground)' }}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelKey="_id"
                          formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-brand)"
                      fill="url(#dashboardRevenueGrad)"
                      strokeWidth={2}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ChartContainer>
                <p className="mt-3 text-[11px] font-semibold text-muted-foreground">
                  Peak day: ₹
                  {Math.max(...chartDays.map((d) => d.revenue), 0).toLocaleString('en-IN')} ·{' '}
                  {chartDays.reduce((s, d) => s + d.orders, 0)} orders in period
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard
            className="lg:col-span-4"
            title="Order pipeline"
            subtitle="Live queue — tap Orders to manage"
            action={
              <Link
                to="/orders"
                className="flex shrink-0 items-center gap-0.5 text-xs font-extrabold text-brand hover:underline"
              >
                Manage
                <ArrowUpRight className="size-3.5" />
              </Link>
            }
          >
            <div className="grid gap-3">
              {pipelineCounts.map((step) => {
                const Icon = step.icon;
                const isActive = step.count > 0;
                return (
                  <div
                    key={step.key}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border p-3 transition-all duration-200",
                      isActive
                        ? "bg-brand/[0.02] border-brand/10 shadow-xs"
                        : "bg-transparent border-black/5"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "rounded-xl p-2 transition-colors",
                          isActive
                            ? "bg-brand/10 text-brand"
                            : "bg-black/[0.03] text-muted-foreground"
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                      </div>
                      <div>
                        <span className={cn("block text-xs font-extrabold text-ink", isActive && "text-brand")}>
                          {step.label}
                        </span>
                        <span className="text-[10px] text-muted font-medium">
                          {isActive ? "Needs review" : "Queue clear"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                        </span>
                      )}
                      <span
                        className={cn(
                          "min-w-[28px] rounded-xl px-2.5 py-1 text-center text-xs font-black tabular-nums border",
                          isActive
                            ? "bg-brand/10 text-brand border-brand/20"
                            : "bg-black/[0.03] text-muted-foreground border-transparent"
                        )}
                      >
                        {step.count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* Recent orders + status breakdown */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <SectionCard
            className="lg:col-span-8"
            title="Recent orders"
            subtitle="Latest incoming orders — newest first"
            action={
              <Link
                to="/orders"
                className="flex shrink-0 items-center gap-0.5 text-xs font-extrabold text-brand hover:underline"
              >
                View all
                <ArrowUpRight className="size-3.5" />
              </Link>
            }
          >
            {recentOrders.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No orders yet.</div>
            ) : compact ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {recentOrders.map((o) => (
                  <li
                    key={o._id}
                    className="rounded-xl border border-black/5 bg-slate-50/80 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setTrackOrderId(o._id)}
                        className="text-left font-extrabold text-ink hover:text-brand transition-colors text-xs sm:text-sm"
                      >
                        {orderCode(o)}
                      </button>
                      <span className="text-xs font-black tabular-nums text-ink">₹{o.grandTotal}</span>
                    </div>
                    <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">{customerName(o)}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase border",
                          o.orderStatus === 'DELIVERED' && 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
                          o.orderStatus === 'CANCELLED' && 'bg-rose-500/10 text-rose-700 border-rose-500/20',
                          ['PENDING', 'CONFIRMED'].includes(o.orderStatus) && 'bg-amber-500/10 text-amber-700 border-amber-500/20',
                          o.orderStatus === 'PREPARING' && 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
                          o.orderStatus === 'READY_FOR_PICKUP' && 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
                          ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(o.orderStatus) && 'bg-blue-500/10 text-blue-700 border-blue-500/20'
                        )}
                      >
                        {STATUS_LABELS[o.orderStatus] ?? o.orderStatus}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTrackOrderId(o._id)}
                        className="text-[10px] font-extrabold text-brand hover:underline"
                      >
                        Manage
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-black/5 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4 font-black">Order</th>
                      <th className="pb-3 pr-4 font-black">Customer</th>
                      <th className="pb-3 pr-4 font-black">Status</th>
                      <th className="pb-3 pr-4 font-black">Time</th>
                      <th className="pb-3 text-right font-black">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {recentOrders.map((o) => (
                      <tr key={o._id} className="group hover:bg-black/[0.01] transition-colors">
                        <td className="py-3 pr-4">
                          <button
                            onClick={() => setTrackOrderId(o._id)}
                            className="font-extrabold text-ink group-hover:text-brand text-left cursor-pointer"
                          >
                            {orderCode(o)}
                          </button>
                        </td>
                        <td className="max-w-[120px] truncate py-3 pr-4 text-xs font-semibold text-muted-foreground">
                          {customerName(o)}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={cn(
                              "inline-block rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase border",
                              o.orderStatus === 'DELIVERED' && 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
                              o.orderStatus === 'CANCELLED' && 'bg-rose-500/10 text-rose-700 border-rose-500/20',
                              ['PENDING', 'CONFIRMED'].includes(o.orderStatus) && 'bg-amber-500/10 text-amber-700 border-amber-500/20',
                              o.orderStatus === 'PREPARING' && 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
                              o.orderStatus === 'READY_FOR_PICKUP' && 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
                              ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(o.orderStatus) && 'bg-blue-500/10 text-blue-700 border-blue-500/20'
                            )}
                          >
                            {STATUS_LABELS[o.orderStatus] ?? o.orderStatus}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4 font-semibold text-muted-foreground tabular-nums">
                          {o.createdAt
                            ? new Date(o.createdAt).toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="py-3 text-right text-xs font-black tabular-nums text-ink">
                          ₹{o.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            className="lg:col-span-4"
            title="Orders by status"
            subtitle="Lifetime breakdown"
          >
            {(() => {
              const statusData = analytics?.ordersByStatus ?? [];
              if (statusData.length === 0) {
                return <p className="py-6 text-sm text-muted-foreground">No order history yet.</p>;
              }
              const totalOrders = analytics?.totalOrders ?? statusData.reduce((acc, curr) => acc + curr.count, 0) ?? 1;
              return (
                <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-4">
                  <div className="relative h-28 w-28 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={44}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="_id"
                        >
                          {statusData.map((entry, index) => {
                            const color = STATUS_COLORS[entry._id] ?? '#94a3b8';
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm font-black text-ink">{totalOrders}</span>
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Total</span>
                    </div>
                  </div>
                  <ul className="flex-1 w-full space-y-2">
                    {statusData.map((row) => {
                      const color = STATUS_COLORS[row._id] ?? '#94a3b8';
                      const pct = Math.round((row.count / totalOrders) * 100);
                      return (
                        <li key={row._id} className="flex items-center justify-between text-[11px] font-semibold text-ink">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="truncate">
                              {STATUS_LABELS[row._id] ?? row._id}
                            </span>
                          </div>
                          <span className="shrink-0 font-bold text-muted-foreground tabular-nums">
                            {row.count} ({pct}%)
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}
          </SectionCard>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <SectionCard title="Menu highlights" subtitle="Recommended & available items">
            {menuHighlights.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                No menu items yet.{' '}
                <Link to="/menu" className="font-bold text-brand hover:underline">
                  Add menu →
                </Link>
              </p>
            ) : (
              <ul className="divide-y divide-black/5">
                {menuHighlights.map((item) => {
                  const cat =
                    typeof item.categoryId === 'object'
                      ? item.categoryId.categoryName ?? 'Menu'
                      : 'Menu';
                  const price = item.discountedPrice ?? item.price;
                  return (
                    <li
                      key={item._id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <Link
                          to="/menu"
                          className="block truncate text-xs font-bold text-ink hover:text-brand transition-colors"
                        >
                          {item.itemName}
                        </Link>
                        <p className="text-[10px] font-semibold text-muted-foreground">{cat}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs font-black tabular-nums text-ink">₹{price}</span>
                        {item.isRecommended ? (
                          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[8px] font-black uppercase text-amber-800 border border-amber-500/20">
                            Top
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Active deliveries" subtitle="Rider & pickup status">
            {activeDeliveries.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">No orders out for delivery right now.</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {activeDeliveries.slice(0, 6).map((o) => {
                  const rider =
                    typeof o.riderId === 'object' && o.riderId
                      ? o.riderId.fullName ?? 'Assigned'
                      : null;
                  return (
                    <li
                      key={o._id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <Link
                          to="/orders"
                          className="text-xs font-bold text-ink hover:text-brand transition-colors"
                        >
                          {orderCode(o)}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                          <Bike className="size-3 shrink-0" />
                          <span className="truncate">{rider ?? 'Awaiting rider'}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase border",
                            o.orderStatus === 'DELIVERED' && 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
                            o.orderStatus === 'CANCELLED' && 'bg-rose-500/10 text-rose-700 border-rose-500/20',
                            ['PENDING', 'CONFIRMED'].includes(o.orderStatus) && 'bg-amber-500/10 text-amber-700 border-amber-500/20',
                            o.orderStatus === 'PREPARING' && 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
                            o.orderStatus === 'READY_FOR_PICKUP' && 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
                            ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(o.orderStatus) && 'bg-blue-500/10 text-blue-700 border-blue-500/20'
                          )}
                        >
                          {STATUS_LABELS[o.orderStatus] ?? o.orderStatus}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTrackOrderId(o._id)}
                          className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[9px] font-extrabold uppercase text-cyan-700 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                        >
                          Track map
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <OrderDetailDialog
        orderId={trackOrderId}
        open={Boolean(trackOrderId)}
        onOpenChange={(open) => !open && setTrackOrderId(null)}
        restaurantId={restaurantId}
      />
    </PageShell>
  );
}
