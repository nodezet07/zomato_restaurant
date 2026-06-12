import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  assignRiderToOrder,
  fetchAvailableRiders,
  fetchOrderById,
  trackOrder,
} from '@/services/orders';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Order } from '@/types/api';

type Props = {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId?: string;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  CONFIRMED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  PREPARING: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  READY_FOR_PICKUP: 'bg-emerald-500/10 text-emerald-600 border-emerald-200/30',
  RIDER_ASSIGNED: 'bg-indigo-500/10 text-indigo-600 border-indigo-200/30',
  PICKED_UP: 'bg-violet-500/10 text-violet-600 border-violet-200/30',
  ON_THE_WAY: 'bg-cyan-500/10 text-cyan-600 border-cyan-200/30',
  DELIVERED: 'bg-slate-500/10 text-slate-600 border-slate-200/30',
  CANCELLED: 'bg-rose-500/10 text-rose-600 border-rose-200/30',
};

export function OrderDetailDialog({ orderId, open, onOpenChange, restaurantId }: Props) {
  const qc = useQueryClient();

  const orderQ = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrderById(orderId!),
    enabled: Boolean(orderId) && open,
  });

  const trackQ = useQuery({
    queryKey: ['order-track', orderId],
    queryFn: () => trackOrder(orderId!),
    enabled: Boolean(orderId) && open,
    refetchInterval: 15_000,
  });

  const ridersQ = useQuery({
    queryKey: ['available-riders'],
    queryFn: fetchAvailableRiders,
    enabled: open && orderQ.data?.orderStatus === 'READY_FOR_PICKUP',
  });

  const assignMut = useMutation({
    mutationFn: (riderUserId: string) => assignRiderToOrder(orderId!, riderUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['order-track', orderId] });
      if (restaurantId) qc.invalidateQueries({ queryKey: ['orders', restaurantId] });
      toast.success('Rider assigned');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const order = orderQ.data;
  const track = trackQ.data;
  const loc = track?.liveLocation ?? track?.riderLocation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md bg-white border border-black/5 rounded-2xl p-6 shadow-xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-extrabold text-ink">
            Order #{order?.orderNumber ?? orderId?.slice(-6).toUpperCase() ?? '…'}
          </DialogTitle>
        </DialogHeader>

        {orderQ.isLoading && (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-32 bg-slate-100 rounded-lg animate-pulse" />
            <Skeleton className="h-24 w-full bg-slate-100 rounded-xl animate-pulse" />
          </div>
        )}

        {order && (
          <OrderDetailBody
            order={order}
            track={track}
            loc={loc}
            riders={ridersQ.data ?? []}
            ridersLoading={ridersQ.isLoading}
            assignPending={assignMut.isPending}
            onAssign={(userId) => assignMut.mutate(userId)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function OrderDetailBody({
  order,
  track,
  loc,
  riders,
  ridersLoading,
  assignPending,
  onAssign,
}: {
  order: Order;
  track?: Awaited<ReturnType<typeof trackOrder>>;
  loc?: { latitude: number; longitude: number };
  riders: Awaited<ReturnType<typeof fetchAvailableRiders>>;
  ridersLoading: boolean;
  assignPending: boolean;
  onAssign: (userId: string) => void;
}) {
  const customer =
    typeof order.customerId === 'object'
      ? order.customerId?.fullName ?? 'Customer'
      : 'Customer';
  const mobile =
    typeof order.customerId === 'object' ? order.customerId?.mobile : undefined;

  const rider =
    typeof order.riderId === 'object' && order.riderId ? order.riderId : null;

  const canAssign = order.orderStatus === 'READY_FOR_PICKUP' && !rider;
  const mapUrl = loc
    ? `https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=16/${loc.latitude}/${loc.longitude}`
    : null;

  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap gap-2 pb-1 border-b border-black/5">
        <Badge
          variant="outline"
          className={`border font-black text-[9px] px-2.5 py-0.5 uppercase tracking-wider rounded-md ${
            STATUS_COLORS[order.orderStatus] ?? 'bg-slate-100 text-slate-700'
          }`}
        >
          {order.orderStatus.replace(/_/g, ' ')}
        </Badge>
        <Badge variant="outline" className="border-black/5 bg-slate-50 text-slate-700 font-bold text-[9px] rounded-md px-2 py-0.5 uppercase tracking-wider">
          {order.paymentMethod}
        </Badge>
      </div>

      {track?.timelineLogs && track.timelineLogs.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Timeline</p>
          <ul className="space-y-1.5 text-xs border-l-2 border-brand/20 pl-3">
            {track.timelineLogs.map((log, i) => (
              <li key={i} className="text-ink">
                <span className="font-bold">{log.status?.replace(/_/g, ' ')}</span>
                {log.timestamp && (
                  <span className="text-muted ml-2">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canAssign && (
        <div className="rounded-xl border border-brand/20 bg-brand/5 p-3 space-y-2">
          <p className="text-[10px] font-black uppercase text-brand">Assign rider</p>
          {ridersLoading ? (
            <Loader2 className="size-4 animate-spin text-brand" />
          ) : riders.length === 0 ? (
            <p className="text-xs text-muted">No online riders available right now.</p>
          ) : (
            <div className="flex gap-2">
              <Select onValueChange={onAssign} disabled={assignPending}>
                <SelectTrigger className="h-9 text-xs flex-1">
                  <SelectValue placeholder="Select rider" />
                </SelectTrigger>
                <SelectContent>
                  {riders.map((r) => (
                    <SelectItem key={r.userId} value={r.userId}>
                      {r.fullName} · {r.riderCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {rider && (
        <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-1">
            <Bike className="size-3" /> Assigned rider
          </p>
          <p className="font-bold text-ink mt-1">{rider.fullName ?? 'Rider'}</p>
          {rider.mobile && <p className="text-xs text-muted">{rider.mobile}</p>}
        </div>
      )}

      {mapUrl && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-1">
            <MapPin className="size-3" /> Live location
          </p>
          <div className="rounded-xl overflow-hidden border border-black/5 h-36 bg-slate-100">
            <iframe
              title="Rider map"
              className="w-full h-full border-0"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${loc!.longitude - 0.01}%2C${loc!.latitude - 0.01}%2C${loc!.longitude + 0.01}%2C${loc!.latitude + 0.01}&layer=mapnik&marker=${loc!.latitude}%2C${loc!.longitude}`}
            />
          </div>
          <Button variant="outline" size="sm" className="w-full text-xs" asChild>
            <a href={mapUrl} target="_blank" rel="noreferrer">
              Open full map
            </a>
          </Button>
        </div>
      )}

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted">Customer</p>
        <p className="font-bold text-ink mt-0.5">{customer}</p>
        {mobile && <p className="text-xs text-muted">{mobile}</p>}
      </div>

      {order.deliveryAddress?.addressLine && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted">Address</p>
          <p className="text-xs text-ink mt-0.5">{order.deliveryAddress.addressLine}</p>
        </div>
      )}

      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted">Items</p>
        <ul className="space-y-3 rounded-xl bg-black/[0.01] border border-black/[0.03] p-3.5">
          {order.orderItems?.map((item, i) => (
            <li key={i} className="text-xs">
              <div className="flex justify-between gap-2 font-semibold text-ink">
                <span>{item.quantity}× {item.itemName}</span>
                <span className="shrink-0">₹{item.total ?? item.price * item.quantity}</span>
              </div>
              {item.addons && item.addons.length > 0 && (
                <ul className="mt-1.5 ml-3 space-y-0.5 border-l-2 border-brand/20 pl-2">
                  {item.addons.map((addon, j) => (
                    <li key={j} className="flex justify-between text-[11px] text-muted">
                      <span>+ {addon.name}</span>
                      {addon.price > 0 && <span>₹{addon.price}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between border-t border-black/5 pt-4 font-black text-ink">
        <span>Grand total</span>
        <span>₹{order.grandTotal}</span>
      </div>

      {order.orderStatus === 'READY_FOR_PICKUP' && (
        <p className="text-[10px] text-muted">
          Delivery completion is updated by the rider app (picked up → on the way → delivered).
        </p>
      )}
    </div>
  );
}
