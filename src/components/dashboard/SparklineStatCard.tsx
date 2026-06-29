import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { Area, AreaChart, XAxis, YAxis } from 'recharts';
import { useMemo } from 'react';

export type SparklinePoint = { date: string; value: number };

type Props = {
  label: string;
  sublabel?: string;
  value: string;
  series: SparklinePoint[];
  dataKey?: string;
  color?: string;
  icon?: LucideIcon;
  formatChange?: (n: number) => string;
  onClick?: () => void;
};

function slugify(text: string) {
  return text.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '_').toLowerCase();
}

export function computeSeriesTrend(series: number[]) {
  if (series.length < 2) {
    return { change: 0, percent: '0%', positive: true };
  }
  const mid = Math.max(1, Math.floor(series.length / 2));
  const firstAvg = series.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const secondAvg = series.slice(mid).reduce((a, b) => a + b, 0) / (series.length - mid);
  const change = secondAvg - firstAvg;
  const pct = firstAvg > 0 ? (change / firstAvg) * 100 : 0;
  return {
    change,
    percent: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
    positive: pct >= 0,
  };
}

export function SparklineStatCard({
  label,
  sublabel,
  value,
  series,
  dataKey = 'value',
  color = '#ff5a00',
  icon: Icon,
  formatChange,
  onClick,
}: Props) {
  const values = useMemo(() => series.map((s) => s.value), [series]);
  const trend = useMemo(() => computeSeriesTrend(values), [values]);
  const gradientId = useMemo(() => `gradient-${slugify(label)}`, [label]);
  const changeText = useMemo(() => {
    if (formatChange) return formatChange(trend.change);
    return trend.change >= 0
      ? `+${Math.abs(trend.change).toFixed(0)}`
      : `-${Math.abs(trend.change).toFixed(0)}`;
  }, [trend.change, formatChange]);

  const maxVal = useMemo(() => {
    return Math.max(...values, 0);
  }, [values]);

  return (
    <Card
      className={cn(
        'border-black/5 bg-white p-0 shadow-xs transition duration-300 hover:shadow-md rounded-2xl overflow-hidden',
        onClick && 'cursor-pointer hover:border-brand/20',
      )}
      onClick={onClick}
    >
      <CardContent className="p-5 pb-0 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <dt className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {label}
                {sublabel ? (
                  <span className="font-normal text-muted-foreground lowercase"> ({sublabel})</span>
                ) : null}
              </dt>
              <dd className="mt-2 text-2xl font-black tracking-tight text-ink tabular-nums leading-none">{value}</dd>
            </div>
            {Icon ? (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.02] border border-black/5 text-muted-foreground">
                <Icon className="size-4" />
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase border leading-none',
                trend.positive
                  ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-700 border-rose-500/20',
              )}
            >
              {trend.percent}
            </span>
            <span
              className={cn(
                'text-[10px] font-semibold leading-none',
                trend.positive ? 'text-emerald-600' : 'text-rose-600',
              )}
            >
              {changeText} vs prior period
            </span>
          </div>
        </div>

        <div className="mt-4 h-14 overflow-hidden -mx-5">
          <ChartContainer
            className="h-full w-full"
            config={{
              [dataKey]: { label, color },
            }}
          >
            <AreaChart data={series} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, maxVal === 0 ? 10 : 'auto']} hide />
              <Area
                dataKey={dataKey}
                stroke={color}
                fill={`url(#${gradientId})`}
                fillOpacity={1}
                strokeWidth={1.5}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
