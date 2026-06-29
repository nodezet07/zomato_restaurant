import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  ShoppingBag,
  Star,
  TrendingUp,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { getRestaurantAnalytics } from '@/services/restaurants';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { useCompactLayout } from '@/hooks/use-mobile';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RestaurantAnalytics } from '@/types/analytics';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready',
  RIDER_ASSIGNED: 'Rider assigned',
  PICKED_UP: 'Picked up',
  ON_THE_WAY: 'On the way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export function AnalyticsPage() {
  const compact = useCompactLayout();
  const restaurant = useRestaurantStore((s) => s.restaurant);
  const restaurantId = restaurant?._id ?? '';

  const analyticsQ = useQuery({
    queryKey: ['analytics', restaurantId, 'full'],
    queryFn: () => getRestaurantAnalytics(restaurantId),
    enabled: Boolean(restaurantId),
  });

  const data = analyticsQ.data as RestaurantAnalytics | undefined;

  const completionRate = useMemo(() => {
    if (!data?.totalOrders) return 0;
    return Math.round((data.completedOrders / data.totalOrders) * 100);
  }, [data]);

  const avgOrderValue = useMemo(() => {
    if (!data?.completedOrders) return 0;
    return Math.round(data.totalRevenue / data.completedOrders);
  }, [data]);

  const maxRevenue = useMemo(() => {
    const days = data?.ordersByDayLast30 ?? [];
    return Math.max(...days.map((d) => d.revenue), 1);
  }, [data]);

  if (analyticsQ.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-brand size-8" />
      </div>
    );
  }

  const cards = [
    {
      label: 'Total revenue',
      value: `₹${(data?.totalRevenue ?? 0).toLocaleString('en-IN')}`,
      sub: 'Delivered orders (lifetime)',
      icon: IndianRupee,
      color: 'text-emerald-600 bg-emerald-500/10',
    },
    {
      label: 'Total orders',
      value: data?.totalOrders ?? 0,
      sub: `${data?.completedOrders ?? 0} delivered (${completionRate}%)`,
      icon: ShoppingBag,
      color: 'text-blue-600 bg-blue-500/10',
    },
    {
      label: 'Avg order value',
      value: `₹${avgOrderValue}`,
      sub: 'Per delivered order',
      icon: TrendingUp,
      color: 'text-violet-600 bg-violet-500/10',
    },
    {
      label: 'Rating',
      value: `${(data?.averageRating ?? 0).toFixed(1)} ★`,
      sub: `${data?.totalRatings ?? 0} reviews`,
      icon: Star,
      color: 'text-amber-600 bg-amber-500/10',
    },
  ];

  return (
    <PageShell eyebrow="Insights" title="Analytics" subtitle={data?.restaurantName}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label} className="border-black/5 shadow-sm">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex justify-between items-start gap-1">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase text-muted tracking-wider leading-tight">{c.label}</p>
                    <div className={`p-1.5 sm:p-2 rounded-xl shrink-0 ${c.color}`}>
                      <Icon className="size-3.5 sm:size-4" />
                    </div>
                  </div>
                  <p className="text-lg sm:text-2xl font-black text-ink mt-1.5 sm:mt-2">{c.value}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted font-medium mt-0.5 sm:mt-1 line-clamp-2">{c.sub}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-black/5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Revenue — last 30 days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 flex items-end gap-1">
                {(data?.ordersByDayLast30 ?? []).map((d) => {
                  const h = Math.max(8, Math.round((d.revenue / maxRevenue) * 100));
                  return (
                    <div key={d._id} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className="w-full max-w-[20px] bg-brand rounded-t-md group-hover:bg-brand-dark transition-colors"
                        style={{ height: `${h}%` }}
                        title={`₹${d.revenue} · ${d.orders} orders`}
                      />
                      <span className={`text-[8px] text-muted font-bold ${compact ? '' : 'rotate-[-45deg] origin-top-left mt-2'} whitespace-nowrap`}>
                        {d._id.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-black/5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Orders by status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.ordersByStatus ?? []).length === 0 ? (
                <p className="text-sm text-muted">No orders yet.</p>
              ) : (
                (data?.ordersByStatus ?? []).map((row) => {
                  const total = data?.totalOrders ?? 1;
                  const pct = Math.round((row.count / total) * 100);
                  return (
                    <div key={row._id} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>{STATUS_LABELS[row._id] ?? row._id}</span>
                        <span className="text-muted">
                          {row.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-black/5 overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-black/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Store status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm">
            <span className="font-bold">
              {data?.isOpen ? '🟢 Open for orders' : '🔴 Closed'}
            </span>
            <Link to="/finance" className="text-brand font-bold hover:underline">
              View earnings →
            </Link>
            <Link to="/support" className="text-brand font-bold hover:underline">
              Refunds & support →
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
