import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createRestaurantCoupon,
  deleteRestaurantCoupon,
  fetchRestaurantCoupons,
} from '@/services/coupons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function formatOffer(coupon: {
  discountType: string;
  discountValue: number;
  minimumOrderAmount?: number;
}) {
  if (coupon.discountType === 'PERCENTAGE') {
    return `${coupon.discountValue}% off`;
  }
  return `₹${coupon.discountValue} off`;
}

export function OffersTab({ restaurantId }: { restaurantId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    couponCode: '',
    title: '',
    description: '',
    discountType: 'FLAT' as 'FLAT' | 'PERCENTAGE',
    discountValue: '',
    minimumOrderAmount: '199',
    usageLimit: '100',
    validDays: '30',
  });

  const couponsQ = useQuery({
    queryKey: ['coupons', restaurantId],
    queryFn: () => fetchRestaurantCoupons(restaurantId),
    enabled: Boolean(restaurantId),
  });

  const createMut = useMutation({
    mutationFn: () => {
      const validFrom = new Date();
      const validTo = new Date();
      validTo.setDate(validTo.getDate() + Number(form.validDays || 30));
      return createRestaurantCoupon({
        restaurantId,
        couponCode: form.couponCode.trim().toUpperCase(),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minimumOrderAmount: Number(form.minimumOrderAmount) || 0,
        usageLimit: Number(form.usageLimit) || 100,
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons', restaurantId] });
      setOpen(false);
      setForm({
        couponCode: '',
        title: '',
        description: '',
        discountType: 'FLAT',
        discountValue: '',
        minimumOrderAmount: '199',
        usageLimit: '100',
        validDays: '30',
      });
      toast.success('Offer created — visible in customer app');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (couponId: string) => deleteRestaurantCoupon(couponId, restaurantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons', restaurantId] });
      toast.success('Offer removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const coupons = couponsQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted font-semibold max-w-lg">
          Same offers customers see in the app offers sheet and apply at checkout.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-brand hover:bg-brand-dark text-white rounded-xl">
              <Plus className="h-4 w-4" /> Create offer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create store offer</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted">Coupon code</Label>
                  <Input
                    value={form.couponCode}
                    onChange={(e) => setForm((f) => ({ ...f, couponCode: e.target.value }))}
                    placeholder="SAVE50"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted">Type</Label>
                  <Select
                    value={form.discountType}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, discountType: v as 'FLAT' | 'PERCENTAGE' }))
                    }
                  >
                    <SelectTrigger className="w-full h-10 rounded-xl border-black/10 text-xs font-semibold text-ink">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-black/5 rounded-xl shadow-md p-1" position="popper">
                      <SelectItem value="FLAT">Flat ₹</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage %</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted">Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Weekend special"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted">Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Flat ₹50 off on orders above ₹199"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted">Discount value</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.discountValue}
                    onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted">Min order (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.minimumOrderAmount}
                    onChange={(e) => setForm((f) => ({ ...f, minimumOrderAmount: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted">Valid for (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.validDays}
                  onChange={(e) => setForm((f) => ({ ...f, validDays: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMut.mutate()}
                disabled={
                  !form.couponCode.trim() ||
                  !form.title.trim() ||
                  !form.discountValue ||
                  createMut.isPending
                }
                className="w-full bg-brand hover:bg-brand-dark"
              >
                Publish offer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {couponsQ.isLoading && <p className="text-sm text-muted">Loading offers…</p>}

      {!couponsQ.isLoading && coupons.length === 0 && (
        <Card className="border-dashed rounded-2xl">
          <CardContent className="py-12 text-center text-sm text-muted">
            No active offers. Create one to show in the customer app.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {coupons.map((c) => (
          <Card key={c._id} className="border-black/5 rounded-2xl shadow-sm">
            <CardContent className="flex gap-4 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Tag className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-sm text-ink">{c.title}</p>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {c.couponCode}
                  </Badge>
                </div>
                <p className="mt-1 text-xs font-black text-brand">{formatOffer(c)}</p>
                {c.description && (
                  <p className="mt-1 text-[11px] text-muted line-clamp-2">{c.description}</p>
                )}
                <p className="mt-2 text-[10px] text-muted">
                  Min ₹{c.minimumOrderAmount ?? 0} · Used {c.usedCount ?? 0}/
                  {c.usageLimit ?? '∞'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-rose-500"
                disabled={deleteMut.isPending}
                onClick={() => {
                  toast.warning('Delete this offer?', {
                    action: {
                      label: 'Delete',
                      onClick: () => deleteMut.mutate(c._id),
                    },
                  });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
