import { useMemo, type ComponentType, type ReactNode } from 'react';
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
import { getRestaurantAnalytics } from '@/services/restaurants';
import { fetchRestaurantOrders } from '@/services/orders';
import { fetchMenuItems } from '@/services/menu';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import type { RestaurantAnalytics } from '@/types/analytics';
import type { Order } from '@/types/api';

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

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex min-h-[108px] flex-col justify-between rounded-xl border border-black/5 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-muted">{label}</p>
        <div className="rounded-lg bg-black/[0.04] p-2 text-muted">
          <Icon className="size-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-black tabular-nums tracking-tight text-ink sm:text-[28px]">{value}</p>
        <p className="mt-1 text-[11px] font-medium text-muted">{hint}</p>
      </div>
    </div>
  );
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
      className={`rounded-xl border border-black/5 bg-white ${className}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-black/5 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-ink sm:text-base">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-[11px] font-medium text-muted sm:text-xs">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

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
    const days = analytics?.ordersByDayLast30?.slice(-7) ?? [];
    return days.length ? days : [];
  }, [analytics]);

  const maxRevenue = useMemo(
    () => Math.max(...chartDays.map((d) => d.revenue), 1),
    [chartDays],
  );

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
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
              restaurant?.isOpen
                ? 'bg-emerald-500/10 text-emerald-700'
                : 'bg-rose-500/10 text-rose-700'
            }`}
          >
            {restaurant?.isOpen ? 'Accepting orders' : 'Closed'}
          </span>
          <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold">
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard
            label="Today's sales"
            value={`₹${todayStats.revenue.toLocaleString('en-IN')}`}
            hint={`${todayStats.count} orders today`}
            icon={IndianRupee}
          />
          <StatCard
            label="Lifetime revenue"
            value={`₹${(analytics?.totalRevenue ?? 0).toLocaleString('en-IN')}`}
            hint={`${analytics?.completedOrders ?? 0} delivered`}
            icon={IndianRupee}
          />
          <StatCard
            label="Rating"
            value={`${(analytics?.averageRating ?? restaurant?.averageRating ?? 0).toFixed(1)} ★`}
            hint={`${analytics?.totalRatings ?? restaurant?.totalRatings ?? 0} reviews`}
            icon={Star}
          />
          <StatCard
            label="Total orders"
            value={analytics?.totalOrders ?? orders.length}
            hint="All time"
            icon={UtensilsCrossed}
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
                className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-brand hover:underline"
              >
                Details
                <ArrowUpRight className="size-3.5" />
              </Link>
            }
          >
            {chartDays.length === 0 ? (
              <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-black/10 bg-slate-50/80 text-sm text-muted">
                No sales data yet. Complete orders to see trends.
              </div>
            ) : (
              <>
                <div className="flex h-52 items-end gap-2 border-b border-black/5 pb-3 sm:gap-3">
                  {chartDays.map((d) => {
                    const h = Math.max(10, Math.round((d.revenue / maxRevenue) * 100));
                    return (
                      <div key={d._id} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
                        <div className="relative flex h-40 w-full items-end justify-center">
                          <div className="pointer-events-none absolute bottom-full mb-1 hidden rounded-md bg-ink px-2 py-1 text-[10px] font-bold text-white group-hover:block">
                            ₹{d.revenue.toLocaleString('en-IN')} · {d.orders} orders
                          </div>
                          <div
                            className="w-full max-w-[36px] rounded-t-md bg-brand transition-colors group-hover:bg-brand-dark"
                            style={{ height: `${h}%` }}
                          />
                        </div>
                        <span className="w-full truncate text-center text-[9px] font-bold uppercase text-muted sm:text-[10px]">
                          {formatDayLabel(d._id)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] font-medium text-muted">
                  Peak day: ₹
                  {Math.max(...chartDays.map((d) => d.revenue), 0).toLocaleString('en-IN')} ·{' '}
                  {chartDays.reduce((s, d) => s + d.orders, 0)} orders in period
                </p>
              </>
            )}
          </SectionCard>

          <SectionCard
            className="lg:col-span-4"
            title="Order pipeline"
            subtitle="Live queue — tap Orders to manage"
            action={
              <Link
                to="/orders"
                className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-brand hover:underline"
              >
                Manage
                <ArrowUpRight className="size-3.5" />
              </Link>
            }
          >
            <ul className="divide-y divide-black/5">
              {pipelineCounts.map((step) => {
                const Icon = step.icon;
                return (
                  <li key={step.key} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-lg bg-black/[0.04] p-2 text-muted">
                        <Icon className="size-4 shrink-0" />
                      </div>
                      <span className="truncate text-sm font-semibold text-ink">{step.label}</span>
                    </div>
                    <span
                      className={`min-w-[28px] rounded-lg px-2 py-1 text-center text-sm font-black tabular-nums ${
                        step.count > 0 ? 'bg-brand/10 text-brand' : 'bg-black/[0.04] text-muted'
                      }`}
                    >
                      {step.count}
                    </span>
                  </li>
                );
              })}
            </ul>
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
                className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-brand hover:underline"
              >
                View all
                <ArrowUpRight className="size-3.5" />
              </Link>
            }
          >
            {recentOrders.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted">No orders yet.</div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/5 text-[10px] font-black uppercase tracking-wider text-muted">
                      <th className="pb-3 pr-4 font-black">Order</th>
                      <th className="pb-3 pr-4 font-black">Customer</th>
                      <th className="pb-3 pr-4 font-black">Status</th>
                      <th className="pb-3 pr-4 font-black">Time</th>
                      <th className="pb-3 text-right font-black">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {recentOrders.map((o) => (
                      <tr key={o._id} className="group hover:bg-black/[0.02]">
                        <td className="py-3 pr-4">
                          <Link
                            to="/orders"
                            className="font-bold text-ink group-hover:text-brand"
                          >
                            {orderCode(o)}
                          </Link>
                        </td>
                        <td className="max-w-[120px] truncate py-3 pr-4 text-xs font-medium text-muted">
                          {customerName(o)}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="inline-block max-w-[120px] truncate rounded-md bg-black/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase text-ink">
                            {STATUS_LABELS[o.orderStatus] ?? o.orderStatus}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4 text-xs tabular-nums text-muted">
                          {o.createdAt
                            ? new Date(o.createdAt).toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="py-3 text-right text-sm font-black tabular-nums text-ink">
                          ₹{o.grandTotal}
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
            {(analytics?.ordersByStatus ?? []).length === 0 ? (
              <p className="py-6 text-sm text-muted">No order history yet.</p>
            ) : (
              <ul className="space-y-3">
                {(analytics?.ordersByStatus ?? []).map((row) => {
                  const total = analytics?.totalOrders ?? 1;
                  const pct = Math.round((row.count / total) * 100);
                  return (
                    <li key={row._id}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-semibold text-ink">
                          {STATUS_LABELS[row._id] ?? row._id}
                        </span>
                        <span className="shrink-0 tabular-nums font-bold text-muted">
                          {row.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <SectionCard title="Menu highlights" subtitle="Recommended & available items">
            {menuHighlights.length === 0 ? (
              <p className="py-6 text-sm text-muted">
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
                          className="block truncate text-sm font-bold text-ink hover:text-brand"
                        >
                          {item.itemName}
                        </Link>
                        <p className="text-[11px] font-medium text-muted">{cat}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-black tabular-nums text-ink">₹{price}</span>
                        {item.isRecommended ? (
                          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800">
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
              <p className="py-6 text-sm text-muted">No orders out for delivery right now.</p>
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
                          className="text-sm font-bold text-ink hover:text-brand"
                        >
                          {orderCode(o)}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-muted">
                          <Bike className="size-3 shrink-0" />
                          <span className="truncate">{rider ?? 'Awaiting rider'}</span>
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-black/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase text-ink">
                        {STATUS_LABELS[o.orderStatus] ?? o.orderStatus}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
