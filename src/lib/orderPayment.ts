import type { Order } from '@/types/api';

export function isOnlinePayment(order: Pick<Order, 'paymentMethod'>): boolean {
  return String(order.paymentMethod ?? '').toUpperCase() === 'ONLINE';
}

export function isPaymentCaptured(order: Pick<Order, 'paymentStatus'>): boolean {
  return String(order.paymentStatus ?? '').toUpperCase() === 'CAPTURED';
}

export function isAwaitingOnlinePayment(order: Pick<Order, 'paymentMethod' | 'paymentStatus'>): boolean {
  return isOnlinePayment(order) && !isPaymentCaptured(order);
}

export function paymentStatusLabel(order: Pick<Order, 'paymentMethod' | 'paymentStatus'>): string {
  const ps = String(order.paymentStatus ?? '').toUpperCase();
  if (ps === 'FAILED') return 'Payment failed';
  if (isAwaitingOnlinePayment(order)) return 'Awaiting payment';
  if (ps === 'CAPTURED') return 'Paid';
  if (String(order.paymentMethod ?? '').toUpperCase() === 'COD') return 'COD';
  return ps.replace(/_/g, ' ');
}
