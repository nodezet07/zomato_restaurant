import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IndianRupee, Loader2, Wallet, ArrowDownToLine } from 'lucide-react';
import { getRestaurantEarnings, getRestaurantSettlements } from '@/services/restaurants';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { useCompactLayout } from '@/hooks/use-mobile';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function money(n?: number) {
  return `₹${(n ?? 0).toLocaleString('en-IN')}`;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  SETTLED: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  PAID: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
};

export function FinancePage() {
  const compact = useCompactLayout();
  const restaurantId = useRestaurantStore((s) => s.restaurantId) ?? '';
  const [settlementPage, setSettlementPage] = useState(1);

  const earningsQ = useQuery({
    queryKey: ['earnings', restaurantId],
    queryFn: () => getRestaurantEarnings(restaurantId),
    enabled: Boolean(restaurantId),
  });

  const settlementsQ = useQuery({
    queryKey: ['settlements', restaurantId, settlementPage],
    queryFn: () => getRestaurantSettlements(restaurantId, settlementPage, 15),
    enabled: Boolean(restaurantId),
  });

  const e = earningsQ.data;
  const settlements = settlementsQ.data?.settlements ?? [];
  const totalPages = Math.ceil(
    (settlementsQ.data?.pagination?.total ?? settlements.length) / 15,
  ) || 1;

  return (
    <PageShell eyebrow="Finance" title="Earnings & settlements">
      <Tabs defaultValue="earnings" className="space-y-5">
        <TabsList className="bg-black/[0.03]">
          <TabsTrigger value="earnings" className="font-bold text-xs">
            Earnings
          </TabsTrigger>
          <TabsTrigger value="settlements" className="font-bold text-xs">
            Settlements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-5">
          {earningsQ.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-brand size-8" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                <Card className="border-black/5 shadow-sm">
                  <CardHeader className="pb-2 p-3 sm:p-6">
                    <CardDescription className="flex items-center gap-1.5 text-[10px] sm:text-xs leading-tight">
                      <Wallet className="size-3.5 shrink-0" /> Pending settlement
                    </CardDescription>
                    <CardTitle className="text-lg sm:text-2xl font-black">{money(e?.pendingSettlement?.netPayable)}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-[10px] sm:text-xs text-muted font-medium px-3 pb-3 sm:px-6 sm:pb-6">
                    {e?.pendingSettlement?.orderCount ?? 0} delivered orders · Gross{' '}
                    {money(e?.pendingSettlement?.grossFoodSales)}
                  </CardContent>
                </Card>
                <Card className="border-black/5 shadow-sm">
                  <CardHeader className="pb-2 p-3 sm:p-6">
                    <CardDescription className="flex items-center gap-1.5 text-[10px] sm:text-xs leading-tight">
                      <ArrowDownToLine className="size-3.5 shrink-0" /> Awaiting transfer
                    </CardDescription>
                    <CardTitle className="text-lg sm:text-2xl font-black">{money(e?.awaitingBankTransfer?.netPayable)}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-[10px] sm:text-xs text-muted font-medium px-3 pb-3 sm:px-6 sm:pb-6">
                    {e?.awaitingBankTransfer?.orderCount ?? 0} orders settled, payment pending
                  </CardContent>
                </Card>
                <Card className="border-black/5 shadow-sm col-span-2 lg:col-span-1">
                  <CardHeader className="pb-2 p-3 sm:p-6">
                    <CardDescription className="flex items-center gap-1.5 text-[10px] sm:text-xs leading-tight">
                      <IndianRupee className="size-3.5 shrink-0" /> Total paid out
                    </CardDescription>
                    <CardTitle className="text-lg sm:text-2xl font-black">{money(e?.totalPaidOut?.netPayable)}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-[10px] sm:text-xs text-muted font-medium px-3 pb-3 sm:px-6 sm:pb-6">
                    {e?.totalPaidOut?.orderCount ?? 0} orders · Commission rate{' '}
                    {e?.commissionRate ?? '—'}%
                  </CardContent>
                </Card>
              </div>

              {e?.pendingSettlement && e.pendingSettlement.totalCommission > 0 && (
                <Card className="border-black/5 shadow-sm">
                  <CardContent className="p-4 text-sm flex justify-between">
                    <span className="text-muted font-medium">Platform commission (pending)</span>
                    <span className="font-bold text-rose-600">
                      −{money(e.pendingSettlement.totalCommission)}
                    </span>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="settlements">
          {settlementsQ.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-brand size-8" />
            </div>
          ) : settlements.length === 0 ? (
            <Card className="border-black/5">
              <CardContent className="py-12 text-center text-sm text-muted">
                No settlement records yet. Settlements appear after admin processes payouts.
              </CardContent>
            </Card>
          ) : (
            <>
              {compact ? (
                <div className="grid grid-cols-2 gap-3">
                  {settlements.map((s) => (
                    <Card key={s._id} className="border-black/5 shadow-sm">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-mono text-xs font-bold text-ink">{s.settlementNumber}</p>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-black uppercase ${STATUS_STYLE[s.status] ?? ''}`}
                          >
                            {s.status}
                          </Badge>
                        </div>
                        <p className="text-lg font-black text-ink">{money(s.netPayable)}</p>
                        <p className="text-xs text-muted">
                          {s.orderCount} orders · Gross {money(s.grossFoodSales)} · Comm −
                          {money(s.totalCommission)}
                        </p>
                        <p className="text-[10px] text-muted">
                          {s.paidAt
                            ? new Date(s.paidAt).toLocaleDateString()
                            : s.createdAt
                              ? new Date(s.createdAt).toLocaleDateString()
                              : '—'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
              <div className="rounded-xl border border-black/5 bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Settlement #</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Net payable</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlements.map((s) => (
                      <TableRow key={s._id}>
                        <TableCell className="font-mono text-xs font-bold">{s.settlementNumber}</TableCell>
                        <TableCell>{s.orderCount}</TableCell>
                        <TableCell>{money(s.grossFoodSales)}</TableCell>
                        <TableCell className="text-rose-600">−{money(s.totalCommission)}</TableCell>
                        <TableCell className="font-bold">{money(s.netPayable)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-black uppercase ${STATUS_STYLE[s.status] ?? ''}`}
                          >
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted">
                          {s.paidAt
                            ? new Date(s.paidAt).toLocaleDateString()
                            : s.createdAt
                              ? new Date(s.createdAt).toLocaleDateString()
                              : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              )}
              {totalPages > 1 && (
                <div className="flex justify-center gap-3 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={settlementPage <= 1}
                    onClick={() => setSettlementPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-bold text-muted self-center">
                    Page {settlementPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={settlementPage >= totalPages}
                    onClick={() => setSettlementPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
