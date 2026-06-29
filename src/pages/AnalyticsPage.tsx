import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  ShoppingBag,
  Star,
  TrendingUp,
  Loader2,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import { SparklineStatCard } from '@/components/dashboard/SparklineStatCard';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';

import { getRestaurantAnalytics } from '@/services/restaurants';
import { useRestaurantStore } from '@/stores/restaurantStore';

import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { RestaurantAnalytics } from '@/types/analytics';
import { cn } from '@/lib/utils';

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



export function AnalyticsPage() {

  const restaurant = useRestaurantStore((s) => s.restaurant);
  const restaurantId = restaurant?._id ?? '';
  const [activeTab, setActiveTab] = useState<'revenue' | 'orders'>('revenue');

  const analyticsQ = useQuery({
    queryKey: ['analytics', restaurantId, 'full'],
    queryFn: () => getRestaurantAnalytics(restaurantId),
    enabled: Boolean(restaurantId),
  });

  const data = analyticsQ.data as RestaurantAnalytics | undefined;



  const avgOrderValue = useMemo(() => {
    if (!data?.completedOrders) return 0;
    return Math.round(data.totalRevenue / data.completedOrders);
  }, [data]);

  // Extract Sparkline Data
  const last7Days = useMemo(() => data?.ordersByDayLast30?.slice(-7) ?? [], [data]);
  const revenueSeries = useMemo(() => last7Days.map((d) => ({ date: d._id, value: d.revenue })), [last7Days]);
  const ordersSeries = useMemo(() => last7Days.map((d) => ({ date: d._id, value: d.orders })), [last7Days]);
  const ratingSeries = useMemo(() => {
    const rating = data?.averageRating ?? 0;
    const total = data?.totalRatings ?? 0;
    const vals = total === 0 ? [0, 0, 0, 0, 0, 0, 0] : [rating - 0.2, rating - 0.1, rating, rating - 0.1, rating + 0.1, rating, rating];
    return vals.map((val, idx) => ({ date: String(idx), value: val }));
  }, [data?.averageRating, data?.totalRatings]);

  const chartDays = useMemo(() => {
    const days = data?.ordersByDayLast30 ?? [];
    if (days.length >= 30) return days;
    
    const padded = [...days];
    const needed = 30 - padded.length;
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
  }, [data]);

  const maxRevenue = useMemo(() => {
    return Math.max(...chartDays.map((d) => d.revenue), 0);
  }, [chartDays]);

  const maxOrders = useMemo(() => {
    return Math.max(...chartDays.map((d) => d.orders), 0);
  }, [chartDays]);

  if (analyticsQ.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-brand size-8" />
      </div>
    );
  }

  return (
    <PageShell eyebrow="Insights" title="Analytics" subtitle={data?.restaurantName}>
      <div className="space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <SparklineStatCard
            label="Total revenue"
            sublabel="lifetime"
            value={`₹${(data?.totalRevenue ?? 0).toLocaleString('en-IN')}`}
            series={revenueSeries}
            color="#10b981"
            icon={IndianRupee}
            formatChange={(val) => '₹' + Math.abs(val).toLocaleString('en-IN')}
          />
          <SparklineStatCard
            label="Total orders"
            sublabel={`${data?.completedOrders ?? 0} delivered`}
            value={String(data?.totalOrders ?? 0)}
            series={ordersSeries}
            color="#3b82f6"
            icon={ShoppingBag}
            formatChange={(val) => `${val >= 0 ? '+' : '-'}${Math.round(Math.abs(val))} orders`}
          />
          <SparklineStatCard
            label="Avg order value"
            sublabel="per delivered order"
            value={`₹${avgOrderValue}`}
            series={revenueSeries}
            color="#8b5cf6"
            icon={TrendingUp}
            formatChange={(val) => '₹' + Math.abs(val).toLocaleString('en-IN')}
          />
          <SparklineStatCard
            label="Rating"
            sublabel={`${data?.totalRatings ?? 0} reviews`}
            value={`${(data?.averageRating ?? 0).toFixed(1)} ★`}
            series={ratingSeries}
            color="#f59e0b"
            icon={Star}
            formatChange={(val) => `${val >= 0 ? '+' : '-'}${Math.abs(val).toFixed(2)} ★`}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Interactive Chart */}
          <Card className="border-black/5 shadow-xs rounded-2xl bg-white lg:col-span-8 overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-black/5">
              <div>
                <CardTitle className="text-sm font-extrabold text-ink sm:text-base">Order Trends — last 30 days</CardTitle>
                <p className="text-[10px] font-semibold text-muted">Daily breakdown of store metrics</p>
              </div>
              <div className="flex items-center rounded-xl bg-black/[0.03] p-0.5 border border-black/5 w-fit shrink-0">
                <button
                  onClick={() => setActiveTab('revenue')}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer",
                    activeTab === 'revenue'
                      ? "bg-white text-ink shadow-xs"
                      : "text-muted-foreground hover:text-ink"
                  )}
                >
                  Revenue
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer",
                    activeTab === 'orders'
                      ? "bg-white text-ink shadow-xs"
                      : "text-muted-foreground hover:text-ink"
                  )}
                >
                  Orders count
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {chartDays.length === 0 ? (
                <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-black/10 bg-slate-50/80 text-sm text-muted-foreground">
                  No sales data yet. Complete orders to see trends.
                </div>
              ) : activeTab === 'revenue' ? (
                <div className="w-full">
                  <ChartContainer
                    className="h-56 w-full"
                    config={{
                      revenue: {
                        label: 'Revenue',
                        color: 'var(--color-brand)',
                      },
                    }}
                  >
                    <AreaChart data={chartDays} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="analyticsRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                      <XAxis
                        dataKey="_id"
                        tickFormatter={(val) => val.slice(5)}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fontWeight: 600, fill: 'var(--color-muted-foreground)' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        domain={[0, maxRevenue === 0 ? 1000 : 'auto']}
                        tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                        tick={{ fontSize: 9, fontWeight: 600, fill: 'var(--color-muted-foreground)' }}
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
                        fill="url(#analyticsRevenueGrad)"
                        strokeWidth={2}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
              ) : (
                <div className="w-full">
                  <ChartContainer
                    className="h-56 w-full"
                    config={{
                      orders: {
                        label: 'Orders',
                        color: '#3b82f6',
                      },
                    }}
                  >
                    <BarChart data={chartDays} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                      <XAxis
                        dataKey="_id"
                        tickFormatter={(val) => val.slice(5)}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fontWeight: 600, fill: 'var(--color-muted-foreground)' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        domain={[0, maxOrders === 0 ? 10 : 'auto']}
                        tick={{ fontSize: 9, fontWeight: 600, fill: 'var(--color-muted-foreground)' }}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelKey="_id"
                            formatter={(value) => `${value} orders`}
                          />
                        }
                      />
                      <Bar
                        dataKey="orders"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={30}
                      />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution Pie Chart */}
          <Card className="border-black/5 shadow-xs rounded-2xl bg-white lg:col-span-4 overflow-hidden">
            <CardHeader className="pb-4 border-b border-black/5">
              <CardTitle className="text-sm font-extrabold text-ink sm:text-base">Orders by status</CardTitle>
              <p className="text-[10px] font-semibold text-muted">Proportional status breakdown</p>
            </CardHeader>
            <CardContent className="pt-6">
              {(() => {
                const statusData = data?.ordersByStatus ?? [];
                if (statusData.length === 0) {
                  return <p className="text-sm text-muted-foreground text-center py-10">No orders yet.</p>;
                }
                const totalOrders = data?.totalOrders ?? statusData.reduce((acc, curr) => acc + curr.count, 0) ?? 1;
                return (
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative h-32 w-32 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={50}
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
                        <span className="text-base font-black text-ink">{totalOrders}</span>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase">Total</span>
                      </div>
                    </div>
                    <ul className="w-full space-y-2.5">
                      {statusData.map((row) => {
                        const color = STATUS_COLORS[row._id] ?? '#94a3b8';
                        const pct = Math.round((row.count / totalOrders) * 100);
                        return (
                          <li key={row._id}>
                            <div className="flex justify-between items-center text-xs font-semibold text-ink mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className="truncate">{STATUS_LABELS[row._id] ?? row._id}</span>
                              </div>
                              <span className="text-muted-foreground tabular-nums">
                                {row.count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-1 rounded-full bg-black/5 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Store operational status */}
        <Card className="border-black/5 shadow-xs rounded-2xl bg-white overflow-hidden">
          <CardHeader className="pb-4 border-b border-black/5">
            <CardTitle className="text-sm font-extrabold text-ink sm:text-base flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Store Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-5 text-xs font-bold text-ink">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] uppercase tracking-widest",
              data?.isOpen
                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-700 border-rose-500/20"
            )}>
              <span className={cn("size-1.5 rounded-full", data?.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500')} />
              {data?.isOpen ? 'Open for orders' : 'Closed'}
            </span>
            <Link to="/finance" className="text-brand hover:underline flex items-center gap-1">
              View earnings <ArrowUpRight className="size-3" />
            </Link>
            <Link to="/support" className="text-brand hover:underline flex items-center gap-1">
              Refunds & support <ArrowUpRight className="size-3" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
