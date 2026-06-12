import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MessageSquareWarning } from 'lucide-react';
import { fetchRestaurantSupportTickets } from '@/services/support';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SupportTicket } from '@/types/analytics';

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-amber-500/10 text-amber-700',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-700',
  RESOLVED: 'bg-emerald-500/10 text-emerald-700',
  CLOSED: 'bg-slate-500/10 text-slate-600',
};

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const order =
    typeof ticket.orderId === 'object' && ticket.orderId ? ticket.orderId : null;
  const customer =
    typeof ticket.customerId === 'object' ? ticket.customerId?.fullName ?? 'Customer' : 'Customer';

  return (
    <Card className="border-black/5 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-mono font-black text-sm">{ticket.ticketNumber}</p>
            <p className="text-[10px] text-muted font-medium mt-0.5">
              {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[9px] font-black uppercase">
              {ticket.issueType}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[9px] font-black uppercase ${STATUS_STYLE[ticket.status] ?? ''}`}
            >
              {ticket.status}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-ink leading-relaxed">{ticket.description}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted font-semibold border-t border-black/5 pt-3">
          <span>Customer: {customer}</span>
          {order?.orderNumber && <span>Order #{order.orderNumber}</span>}
          {order?.grandTotal != null && <span>₹{order.grandTotal}</span>}
        </div>
        {ticket.resolution && (
          <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2">
            Resolution: {ticket.resolution}
          </p>
        )}
        <p className="text-[10px] text-muted italic">
          Refunds are processed by platform admin. You can view and track requests here.
        </p>
      </CardContent>
    </Card>
  );
}

export function SupportPage() {
  const restaurantId = useRestaurantStore((s) => s.restaurantId) ?? '';
  const [tab, setTab] = useState<'all' | 'REFUND'>('all');

  const ticketsQ = useQuery({
    queryKey: ['support-tickets', restaurantId, tab],
    queryFn: () =>
      fetchRestaurantSupportTickets(restaurantId, {
        limit: 50,
        issueType: tab === 'REFUND' ? 'REFUND' : undefined,
      }),
    enabled: Boolean(restaurantId),
  });

  const tickets = ticketsQ.data?.tickets ?? [];

  return (
    <PageShell eyebrow="Help desk" title="Refunds & support">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'REFUND')}>
        <TabsList className="mb-4">
          <TabsTrigger value="all" className="text-xs font-bold">All tickets</TabsTrigger>
          <TabsTrigger value="REFUND" className="text-xs font-bold">Refund requests</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-4">
          {ticketsQ.isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-brand size-8" />
            </div>
          )}

          {!ticketsQ.isLoading && tickets.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <MessageSquareWarning className="mx-auto size-10 text-muted/40 mb-3" />
                <p className="text-sm font-bold text-ink">No support tickets</p>
                <p className="text-xs text-muted mt-1">
                  Customer refund and support requests for your orders appear here.
                </p>
              </CardContent>
            </Card>
          )}

          {tickets.map((t) => (
            <TicketCard key={t._id} ticket={t} />
          ))}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
