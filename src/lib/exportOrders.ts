import type { Order } from '@/types/api';

function csvCell(value: string | number | undefined | null): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportOrdersToCsv(orders: Order[], filename = 'orders-export.csv') {
  const headers = [
    'Order #',
    'Status',
    'Customer',
    'Items',
    'Grand Total',
    'Payment',
    'Payment Status',
    'Created',
  ];

  const rows = orders.map((o) => {
    const customer =
      typeof o.customerId === 'object' ? o.customerId?.fullName ?? '' : '';
    const items = (o.orderItems ?? [])
      .map((i) => `${i.quantity}x ${i.itemName}`)
      .join('; ');
    return [
      o.orderNumber ?? o._id.slice(-6),
      o.orderStatus,
      customer,
      items,
      o.grandTotal,
      o.paymentMethod,
      o.paymentStatus,
      o.createdAt ? new Date(o.createdAt).toISOString() : '',
    ]
      .map(csvCell)
      .join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
