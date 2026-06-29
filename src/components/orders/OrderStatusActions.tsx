import { Eye, Printer, UtensilsCrossed, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { isAwaitingOnlinePayment, paymentStatusLabel } from '@/lib/orderPayment';
import { printKitchenTicket } from '@/lib/printKitchenTicket';
import type { Order, Restaurant } from '@/types/api';

export const NEXT_STATUS: Record<string, string> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY_FOR_PICKUP',
};

export function formatStatusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

type Props = {
  order: Order;
  restaurant?: Restaurant | null;
  busy?: boolean;
  onAcceptClick: () => void;
  onAdvance: (nextStatus: string) => void;
  onCancel: () => void;
  onViewDetails?: () => void;
  variant?: 'stack' | 'inline';
  showPrint?: boolean;
  showView?: boolean;
};

export function confirmCancelOrder(order: Order, onConfirm: () => void) {
  const orderNum = order.orderNumber ?? order._id.slice(-6).toUpperCase();
  toast.warning(`Cancel Order #${orderNum}?`, {
    description: 'Are you sure you want to cancel this order?',
    action: {
      label: 'Cancel Order',
      onClick: onConfirm,
    },
  });
}

export function OrderStatusActions({
  order,
  restaurant,
  busy,
  onAcceptClick,
  onAdvance,
  onCancel,
  onViewDetails,
  variant = 'stack',
  showPrint = true,
  showView = false,
}: Props) {
  const isPending = order.orderStatus === 'PENDING';
  const awaitingPayment = isAwaitingOnlinePayment(order);
  const next = NEXT_STATUS[order.orderStatus];
  const canCancel = !['DELIVERED', 'CANCELLED'].includes(order.orderStatus);
  const stack = variant === 'stack';

  return (
    <div className={stack ? 'flex flex-col gap-2' : 'flex flex-wrap items-center gap-2'}>
      {isPending && awaitingPayment && (
        <div
          className={`rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${
            order.paymentStatus === 'FAILED'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <span className="font-bold">{paymentStatusLabel(order)}.</span>{' '}
          {order.paymentStatus === 'FAILED'
            ? 'Customer must retry payment before you can accept this order.'
            : 'Waiting for customer to complete online payment before you can accept.'}
        </div>
      )}

      {isPending && !awaitingPayment && (
        <Button
          disabled={busy}
          onClick={onAcceptClick}
          className={`bg-brand font-bold text-white hover:bg-brand/90 ${stack ? 'h-10 w-full rounded-xl text-sm' : 'h-8 rounded-xl text-xs'}`}
        >
          <UtensilsCrossed className="mr-1.5 size-3.5" />
          Accept order
        </Button>
      )}

      {next && !isPending && (
        <Button
          disabled={busy}
          onClick={() => onAdvance(next)}
          className={`bg-brand font-bold text-white hover:bg-brand/90 ${stack ? 'h-10 w-full rounded-xl text-sm' : 'h-8 rounded-xl text-xs'}`}
        >
          <UtensilsCrossed className="mr-1.5 size-3.5" />
          Mark {formatStatusLabel(next)}
        </Button>
      )}

      <div className={stack ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2'}>
        {showView && onViewDetails && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={onViewDetails}
            className={`font-bold ${stack ? 'h-9 w-full rounded-xl text-xs' : 'h-8 rounded-xl text-xs'}`}
          >
            <Eye className="mr-1.5 size-3.5" />
            View
          </Button>
        )}

        {showPrint && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => printKitchenTicket(order, restaurant)}
            className={`font-bold ${stack ? 'h-9 w-full rounded-xl text-xs' : 'h-8 rounded-xl text-xs'}`}
          >
            <Printer className="mr-1.5 size-3.5" />
            Print KOT
          </Button>
        )}

        {canCancel && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => confirmCancelOrder(order, onCancel)}
            className={`font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 ${stack ? 'h-9 w-full rounded-xl text-xs' : 'h-8 rounded-xl text-xs'}`}
          >
            <XCircle className="mr-1.5 size-3.5" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
