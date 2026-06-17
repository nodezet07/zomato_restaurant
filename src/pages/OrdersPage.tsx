import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, RefreshCw, XCircle, Search, MoreHorizontal, UtensilsCrossed, Download, Printer, Phone } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { cancelOrderByRestaurant, fetchRestaurantOrders, updateOrderStatus, acceptOrder } from '@/services/orders';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { PageShell } from '@/components/layout/PageShell';
import { OrderDetailDialog } from '@/components/orders/OrderDetailDialog';
import { AcceptOrderDialog } from '@/components/orders/AcceptOrderDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Order } from '@/types/api';
import { exportOrdersToCsv } from '@/lib/exportOrders';
import { printKitchenTicket } from '@/lib/printKitchenTicket';

const TABS = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const;

type OrderTab = (typeof TABS)[number];

const OUT_FOR_DELIVERY_STATUSES = ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'] as const;

const TAB_LABELS: Record<OrderTab, string> = {
  ALL: 'All',
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

function orderMatchesTab(orderStatus: string, tab: OrderTab): boolean {
  if (tab === 'ALL') return true;
  if (tab === 'OUT_FOR_DELIVERY') return OUT_FOR_DELIVERY_STATUSES.includes(orderStatus as typeof OUT_FOR_DELIVERY_STATUSES[number]);
  return orderStatus === tab;
}

const NEXT_STATUS: Record<string, string> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY_FOR_PICKUP',
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

export function OrdersPage() {
  const qc = useQueryClient();
  const restaurantId = useRestaurantStore((s) => s.restaurantId) ?? '';
  const restaurant = useRestaurantStore((s) => s.restaurant);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [acceptOrderTarget, setAcceptOrderTarget] = useState<Order | null>(null);
  const [tab, setTab] = useState<OrderTab>('ALL');
  const [globalFilter, setGlobalFilter] = useState('');

  const ordersQ = useQuery({
    queryKey: ['orders', restaurantId, 'all'],
    queryFn: () => fetchRestaurantOrders(restaurantId, { limit: 100 }),
    enabled: Boolean(restaurantId),
    refetchInterval: 15_000,
  });

  const statusMut = useMutation({
    mutationFn: ({ orderId, orderStatus }: { orderId: string; orderStatus: string }) =>
      updateOrderStatus(orderId, orderStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders', restaurantId] });
      toast.success('Order status updated');
    },
    onError: (e: Error) =>
      toast.error(`Update failed: ${e.message}`),
  });

  const acceptMut = useMutation({
    mutationFn: ({ orderId, waitingMinutes }: { orderId: string; waitingMinutes: number }) =>
      acceptOrder(orderId, waitingMinutes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders', restaurantId] });
      toast.success('Order accepted — customer notified');
      setAcceptOrderTarget(null);
    },
    onError: (e: Error) => toast.error(`Accept failed: ${e.message}`),
  });

  const cancelMut = useMutation({
    mutationFn: (orderId: string) => cancelOrderByRestaurant(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders', restaurantId] });
      toast.success('Order cancelled');
    },
    onError: (e: Error) =>
      toast.error(`Cancel failed: ${e.message}`),
  });

  const orders = ordersQ.data ?? [];
  
  // Filter by tab status first
  const filteredData = useMemo(() => {
    return tab === 'ALL' ? orders : orders.filter((o) => orderMatchesTab(o.orderStatus, tab));
  }, [orders, tab]);

  const tabCounts = useMemo(() => {
    const counts = {} as Record<OrderTab, number>;
    for (const t of TABS) {
      counts[t] = t === 'ALL' ? orders.length : orders.filter((o) => orderMatchesTab(o.orderStatus, t)).length;
    }
    return counts;
  }, [orders]);

  // TanStack columns definition
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<Order>();
    return [
      columnHelper.accessor((row) => row.orderNumber ?? row._id.slice(-6).toUpperCase(), {
        id: 'orderNumber',
        header: 'Order #',
        cell: (info) => <span className="font-mono font-black text-ink">#{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => {
        return typeof row.customerId === 'object' ? row.customerId?.fullName ?? 'Customer' : 'Customer';
      }, {
        id: 'customer',
        header: 'Customer',
        cell: (info) => <span className="font-semibold text-ink">{info.getValue()}</span>,
      }),
      columnHelper.accessor('orderItems', {
        header: 'Items',
        cell: (info) => {
          const items = info.getValue() ?? [];
          return (
            <div className="max-w-[220px] truncate text-xs text-muted font-medium">
              {items.map((i) => `${i.quantity}× ${i.itemName}`).join(', ')}
            </div>
          );
        },
      }),
      columnHelper.accessor('grandTotal', {
        header: 'Total',
        cell: (info) => <span className="font-extrabold text-ink">₹{info.getValue()}</span>,
      }),
      columnHelper.accessor('paymentMethod', {
        header: 'Payment',
        cell: (info) => (
          <span className="text-[10px] text-muted font-black uppercase bg-black/[0.03] border border-black/5 px-2 py-0.5 rounded-md">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('orderStatus', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue();
          return (
            <Badge
              variant="outline"
              className={`border font-black text-[9px] px-2.5 py-0.5 uppercase tracking-wider rounded-md ${
                STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-700'
              }`}
            >
              {status.replace(/_/g, ' ')}
            </Badge>
          );
        },
      }),
      columnHelper.accessor('estimatedPreparationTime', {
        header: 'Wait',
        cell: (info) => {
          const mins = info.getValue();
          const order = info.row.original;
          if (order.orderStatus === 'PENDING') {
            return <span className="text-xs text-amber-600 font-semibold">Needs accept</span>;
          }
          if (!mins) return <span className="text-xs text-muted">—</span>;
          return <span className="text-xs font-bold text-ink">{mins} min</span>;
        },
      }),
      columnHelper.display({
        id: 'rider',
        header: 'Rider',
        cell: (info) => {
          const order = info.row.original;
          const riderDoc =
            typeof order.riderId === 'object' && order.riderId ? order.riderId : null;
          if (!riderDoc) {
            return <span className="text-xs text-muted">Not assigned</span>;
          }
          const riderUser =
            riderDoc.userId && typeof riderDoc.userId === 'object' ? riderDoc.userId : null;
          const name = riderUser?.fullName ?? riderDoc.fullName ?? 'Rider';
          const mobile = riderUser?.mobile ?? riderDoc.mobile ?? null;
          return (
            <div className="flex flex-col gap-0.5 min-w-[120px]">
              <span className="text-xs font-bold text-ink">{name}</span>
              {mobile ? (
                <a
                  href={`tel:${mobile}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                >
                  <Phone className="size-3" />
                  {mobile}
                </a>
              ) : (
                <span className="text-[10px] text-muted">No phone</span>
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <div className="text-right pr-4">Actions</div>,
        cell: (info) => {
          const order = info.row.original;
          const next = NEXT_STATUS[order.orderStatus];
          const isPending = order.orderStatus === 'PENDING';
          const canCancel = !['DELIVERED', 'CANCELLED'].includes(order.orderStatus);
          const busy = statusMut.isPending || cancelMut.isPending || acceptMut.isPending;

          return (
            <div className="flex items-center justify-end pr-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl border border-black/5 hover:bg-black/5 cursor-pointer">
                    <MoreHorizontal className="size-4 text-muted" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 p-1 rounded-xl bg-white border border-black/5 shadow-md">
                  <DropdownMenuItem
                    onClick={() => setDetailId(order._id)}
                    className="gap-2.5 px-3 py-2 text-xs font-bold text-ink rounded-lg focus:bg-slate-50 focus:text-brand cursor-pointer"
                  >
                    <Eye className="size-3.5 text-muted" />
                    View Details
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => printKitchenTicket(order, restaurant)}
                    className="gap-2.5 px-3 py-2 text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer"
                  >
                    <Printer className="size-3.5 text-muted" />
                    Print KOT
                  </DropdownMenuItem>

                  {isPending ? (
                    <DropdownMenuItem
                      disabled={busy}
                      onClick={() => setAcceptOrderTarget(order)}
                      className="gap-2.5 px-3 py-2 text-xs font-bold text-brand rounded-lg focus:bg-brand/5 focus:text-brand cursor-pointer"
                    >
                      <UtensilsCrossed className="size-3.5 text-brand" />
                      Accept order
                    </DropdownMenuItem>
                  ) : next ? (
                    <DropdownMenuItem
                      disabled={busy}
                      onClick={() => statusMut.mutate({ orderId: order._id, orderStatus: next })}
                      className="gap-2.5 px-3 py-2 text-xs font-bold text-brand rounded-lg focus:bg-brand/5 focus:text-brand cursor-pointer"
                    >
                      <UtensilsCrossed className="size-3.5 text-brand" />
                      Mark {next.replace(/_/g, ' ')}
                    </DropdownMenuItem>
                  ) : null}

                  {canCancel && (
                    <>
                      <DropdownMenuSeparator className="bg-black/5 my-1" />
                      <DropdownMenuItem
                        disabled={busy}
                        onClick={() => {
                          const orderNum = order.orderNumber ?? order._id.slice(-6).toUpperCase();
                          toast.warning(`Cancel Order #${orderNum}?`, {
                            description: "Are you sure you want to cancel this order?",
                            action: {
                              label: "Cancel Order",
                              onClick: () => cancelMut.mutate(order._id),
                            },
                          });
                        }}
                        className="gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 rounded-lg focus:bg-rose-50 focus:text-rose-600 cursor-pointer"
                      >
                        <XCircle className="size-3.5 text-rose-500" />
                        Cancel Order
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      }),
    ];
  }, [statusMut, cancelMut]);

  // Table instance initialization
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <PageShell
      eyebrow="Orders"
      title="Kitchen queue"
      action={
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
          {/* Global Search Input */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted size-3.5" />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search order # or customer..."
              className="h-9 w-full rounded-xl border border-black/10 bg-slate-50 px-3 pl-8 text-xs font-semibold text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-all"
            />
          </div>
          
          {/* Status Enum Dropdown Filter */}
          <Select value={tab} onValueChange={(val) => setTab(val as OrderTab)}>
            <SelectTrigger className="h-9 w-full sm:w-48 rounded-xl border-black/10 bg-slate-50 text-xs font-semibold text-ink shrink-0 select-none md:hidden">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent position="popper" className="bg-white border border-black/5 rounded-xl shadow-md p-1">
              {TABS.map((t) => (
                <SelectItem
                  key={t}
                  value={t}
                  className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 focus:text-brand cursor-pointer py-1.5"
                >
                  {TAB_LABELS[t]} ({tabCounts[t]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-9 rounded-xl font-bold text-xs border-black/10 shrink-0 w-full sm:w-auto"
            onClick={() => {
              exportOrdersToCsv(filteredData, `orders-${tab.toLowerCase()}.csv`);
              toast.success(`Exported ${filteredData.length} orders`);
            }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>

          <Button variant="outline" size="sm" onClick={() => ordersQ.refetch()} className="gap-2 h-9 rounded-xl font-bold text-xs border-black/10 shrink-0 w-full sm:w-auto">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="w-full space-y-6">
        <div className="hidden md:flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                'rounded-xl border px-3 py-1.5 text-xs font-bold transition',
                tab === t
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-black/5 bg-white text-muted hover:border-black/10 hover:text-ink',
              ].join(' ')}
            >
              {TAB_LABELS[t]}
              <span className="ml-1.5 opacity-70">({tabCounts[t]})</span>
            </button>
          ))}
        </div>

        <div className="flex md:hidden gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                'shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold whitespace-nowrap transition',
                tab === t
                  ? 'border-brand bg-brand text-white'
                  : 'border-black/10 bg-white text-muted',
              ].join(' ')}
            >
              {TAB_LABELS[t]} ({tabCounts[t]})
            </button>
          ))}
        </div>

        {/* TanStack Data Table Container */}
        <div className="rounded-2xl border border-black/5 bg-white overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-black/5">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {ordersQ.isLoading && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted font-medium">
                    Loading queue details…
                  </TableCell>
                </TableRow>
              )}
              {!ordersQ.isLoading && table.getRowModel().rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted font-medium">
                    No orders matching this tab or search filters.
                  </TableCell>
                </TableRow>
              )}
              {!ordersQ.isLoading && table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-black/5 hover:bg-black/[0.005] transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t border-black/5 pt-4">
          <p className="text-xs text-muted font-semibold">
            Showing {table.getRowModel().rows.length} of {filteredData.length} active orders
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 rounded-lg font-bold text-xs border-black/10"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 rounded-lg font-bold text-xs border-black/10"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <OrderDetailDialog
        orderId={detailId}
        open={Boolean(detailId)}
        onOpenChange={(open) => !open && setDetailId(null)}
        restaurantId={restaurantId}
      />

      <AcceptOrderDialog
        order={acceptOrderTarget}
        open={Boolean(acceptOrderTarget)}
        onOpenChange={(open) => !open && setAcceptOrderTarget(null)}
        busy={acceptMut.isPending}
        onAccept={async (orderId, waitingMinutes) => {
          await acceptMut.mutateAsync({ orderId, waitingMinutes });
        }}
      />
    </PageShell>
  );
}
