import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Sparkles, UtensilsCrossed, Edit3, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  createMenuCombo,
  deleteMenuCombo,
  fetchMenuItems,
  fetchOwnerCombos,
  updateMenuCombo,
} from '@/services/menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import type { MenuCombo, MenuItem } from '@/types/api';

type ComboForm = {
  title: string;
  tag: string;
  price: string;
  foodType: MenuItem['foodType'];
  image: string;
  item1Id: string;
  item2Id: string;
  mainItemId: string;
  isAvailable: boolean;
};

const emptyForm = (): ComboForm => ({
  title: '',
  tag: 'Combo Deal',
  price: '',
  foodType: 'veg',
  image: '',
  item1Id: '',
  item2Id: '',
  mainItemId: '',
  isAvailable: true,
});

function itemIdOf(ref: string | MenuItem | undefined): string {
  if (!ref) return '';
  return typeof ref === 'object' ? ref._id : ref;
}

function itemLabel(item: MenuItem) {
  const price = item.discountedPrice ?? item.price;
  return `${item.itemName} (₹${price})`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CombosTab({ restaurantId }: { restaurantId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuCombo | null>(null);
  const [form, setForm] = useState<ComboForm>(emptyForm());

  const itemsQ = useQuery({
    queryKey: ['menu', 'items', restaurantId],
    queryFn: () => fetchMenuItems(restaurantId),
    enabled: Boolean(restaurantId),
  });

  const combosQ = useQuery({
    queryKey: ['menu', 'owner-combos', restaurantId],
    queryFn: () => fetchOwnerCombos(restaurantId),
    enabled: Boolean(restaurantId),
  });

  const menuItems = itemsQ.data ?? [];
  const combos = combosQ.data ?? [];

  const suggestedPrice = useMemo(() => {
    const i1 = menuItems.find((i) => i._id === form.item1Id);
    const i2 = menuItems.find((i) => i._id === form.item2Id);
    if (!i1 || !i2) return null;
    const sum = (i1.discountedPrice ?? i1.price) + (i2.discountedPrice ?? i2.price);
    return Math.round(sum * 0.9);
  }, [form.item1Id, form.item2Id, menuItems]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const items = [
        { menuItemId: form.item1Id, quantity: 1 },
        { menuItemId: form.item2Id, quantity: 1 },
      ];
      const payload = {
        restaurantId,
        title: form.title.trim(),
        tag: form.tag.trim() || 'Combo Deal',
        image: form.image || undefined,
        price: Number(form.price),
        foodType: form.foodType,
        items,
        mainItemId: form.mainItemId,
        isAvailable: form.isAvailable,
      };

      if (!payload.title || !form.item1Id || !form.item2Id || !form.mainItemId) {
        throw new Error('Fill title, both items, and main item');
      }
      if (form.item1Id === form.item2Id) {
        throw new Error('Pick two different menu items');
      }
      if (!payload.price || payload.price <= 0) {
        throw new Error('Enter a valid combo price');
      }

      if (editing?._id) {
        return updateMenuCombo(editing._id, payload);
      }
      return createMenuCombo(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu', 'owner-combos', restaurantId] });
      qc.invalidateQueries({ queryKey: ['menu', 'combos', restaurantId] });
      toast.success(editing ? 'Combo updated' : 'Combo created');
      setOpen(false);
      setEditing(null);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (comboId: string) => deleteMenuCombo(comboId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu', 'owner-combos', restaurantId] });
      qc.invalidateQueries({ queryKey: ['menu', 'combos', restaurantId] });
      toast.success('Combo deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ comboId, isAvailable, combo }: { comboId: string; isAvailable: boolean; combo: MenuCombo }) => {
      const items = (combo.items ?? []).map((row) => ({
        menuItemId: itemIdOf(row.menuItemId as string | MenuItem),
        quantity: row.quantity ?? 1,
      }));
      return updateMenuCombo(comboId, {
        isAvailable,
        items,
        mainItemId: itemIdOf(combo.mainItemId as string | MenuItem),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu', 'owner-combos', restaurantId] });
      qc.invalidateQueries({ queryKey: ['menu', 'combos', restaurantId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(combo: MenuCombo) {
    const rows = combo.items ?? [];
    const i1 = itemIdOf(rows[0]?.menuItemId as string | MenuItem);
    const i2 = itemIdOf(rows[1]?.menuItemId as string | MenuItem);
    setEditing(combo);
    setForm({
      title: combo.title,
      tag: combo.tag ?? 'Combo Deal',
      price: String(combo.price),
      foodType: (combo.foodType as MenuItem['foodType']) ?? 'veg',
      image: combo.image ?? '',
      item1Id: i1,
      item2Id: i2,
      mainItemId: itemIdOf(combo.mainItemId as string | MenuItem),
      isAvailable: combo.isAvailable ?? true,
    });
    setOpen(true);
  }

  const selectedIds = [form.item1Id, form.item2Id].filter(Boolean);

  if (combosQ.isLoading) {
    return <p className="text-sm text-muted font-semibold">Loading combos…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted font-semibold max-w-xl">
          Create manual combos — they replace auto-generated pairs on the customer app. Customers see
          the combo card; tapping ADD still adds the main item only (full bundle checkout is a
          separate customer-app upgrade).
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2 shrink-0">
              <Plus className="size-4" /> New combo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[95vh] overflow-y-auto overflow-x-hidden sm:max-w-3xl w-full">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold text-ink">{editing ? 'Edit Combo' : 'Create Combo'}</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2 text-left">
              {/* Left Column: Details */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="combo-title" className="text-[10px] font-black uppercase text-muted tracking-wider">Combo title</Label>
                  <Input
                    id="combo-title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Lunch Special + Drink"
                    className="h-10 rounded-xl border border-black/10 text-xs font-semibold placeholder:text-muted"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted tracking-wider">Item 1</Label>
                    <Select
                      value={form.item1Id}
                      onValueChange={(v) => setForm((f) => ({ ...f, item1Id: v }))}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-black/10 text-xs font-semibold text-ink w-full">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-black/5 rounded-xl shadow-md p-1" position="popper">
                        {menuItems.map((i) => (
                          <SelectItem key={i._id} value={i._id} className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer">{itemLabel(i)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted tracking-wider">Item 2</Label>
                    <Select
                      value={form.item2Id}
                      onValueChange={(v) => setForm((f) => ({ ...f, item2Id: v }))}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-black/10 text-xs font-semibold text-ink w-full">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-black/5 rounded-xl shadow-md p-1" position="popper">
                        {menuItems.map((i) => (
                          <SelectItem key={i._id} value={i._id} className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer">{itemLabel(i)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted tracking-wider">Main item (added to cart on customer app)</Label>
                  <Select
                    value={form.mainItemId}
                    onValueChange={(v) => setForm((f) => ({ ...f, mainItemId: v }))}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-black/10 text-xs font-semibold text-ink w-full">
                      <SelectValue placeholder="Pick main item" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-black/5 rounded-xl shadow-md p-1" position="popper">
                      {selectedIds.map((id) => {
                        const i = menuItems.find((m) => m._id === id);
                        if (!i) return null;
                        return (
                          <SelectItem key={id} value={id} className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer">{itemLabel(i)}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="combo-price" className="text-[10px] font-black uppercase text-muted tracking-wider">Combo price (₹)</Label>
                    <Input
                      id="combo-price"
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder={suggestedPrice ? String(suggestedPrice) : '299'}
                      className="h-10 rounded-xl border border-black/10 text-xs font-semibold placeholder:text-muted"
                    />
                    {suggestedPrice != null && (
                      <button
                        type="button"
                        className="text-[9px] font-bold text-brand hover:underline block text-left"
                        onClick={() => setForm((f) => ({ ...f, price: String(suggestedPrice) }))}
                      >
                        Use suggested ₹{suggestedPrice} (10% off)
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="combo-tag" className="text-[10px] font-black uppercase text-muted tracking-wider">Tag badge</Label>
                    <Input
                      id="combo-tag"
                      value={form.tag}
                      onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
                      placeholder="Combo Deal"
                      className="h-10 rounded-xl border border-black/10 text-xs font-semibold placeholder:text-muted"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted tracking-wider">Food type</Label>
                  <Select
                    value={form.foodType}
                    onValueChange={(v) => setForm((f) => ({ ...f, foodType: v as MenuItem['foodType'] }))}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-black/10 text-xs font-semibold text-ink w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-black/5 rounded-xl shadow-md p-1" position="popper">
                      <SelectItem value="veg" className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer">Veg</SelectItem>
                      <SelectItem value="nonveg" className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer">Non-veg</SelectItem>
                      <SelectItem value="egg" className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer">Egg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right Column: Image & Settings */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-black/5 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted tracking-wider">Cover image</Label>
                    {form.image ? (
                      <div className="relative w-full h-36 rounded-xl overflow-hidden border border-black/5 bg-slate-50">
                        <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, image: '' }))}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border border-dashed border-black/10 rounded-xl p-6 bg-slate-50 hover:bg-slate-100/50 hover:border-brand/40 transition cursor-pointer select-none">
                        <Upload className="size-5 text-muted mb-1" />
                        <span className="text-xs font-bold text-ink">Upload cover image</span>
                        <span className="text-[9px] text-muted font-semibold mt-0.5">PNG, JPG, WEBP up to 2MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const data = await readFileAsDataUrl(file);
                            setForm((f) => ({ ...f, image: data }));
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border border-black/5 p-3.5 rounded-xl bg-slate-50/50 mt-auto">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-black uppercase text-ink tracking-wider">Visible on App</Label>
                    <p className="text-[9px] text-muted font-semibold">Make this combo live for customers</p>
                  </div>
                  <Switch
                    checked={form.isAvailable}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isAvailable: v }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-black/5 mt-2">
              <Button variant="outline" className="h-10 rounded-xl text-xs font-bold border-black/10" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="bg-brand hover:bg-brand-dark text-white font-bold h-10 rounded-xl text-xs">
                {editing ? 'Save changes' : 'Create combo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {menuItems.length < 2 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-4 text-sm text-amber-800">
            Add at least 2 menu items before creating combos.
          </CardContent>
        </Card>
      )}

      {combos.length === 0 ? (
        <Card className="border-dashed border-black/10 rounded-2xl">
          <CardContent className="py-12 text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted/40" />
            <p className="text-sm font-bold text-ink">No manual combos yet</p>
            <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
              Without manual combos, customers see auto-generated pairs from your menu. Create one to
              take full control.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {combos.map((combo) => {
            const id = combo._id ?? combo.id ?? '';
            const img =
              combo.image ||
              (typeof combo.mainItemId === 'object' ? combo.mainItemId?.images?.[0] : undefined);
            const itemNames = (combo.items ?? [])
              .map((row) =>
                typeof row.menuItemId === 'object' ? row.menuItemId.itemName : 'Item',
              )
              .join(' + ');

            return (
              <Card key={id} className="overflow-hidden border-black/5 shadow-sm rounded-2xl">
                <div className="relative h-36 bg-slate-100">
                  {img ? (
                    <img src={img} alt={combo.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-brand/30">
                      <UtensilsCrossed className="h-12 w-12" />
                    </div>
                  )}
                  <Badge className="absolute left-3 top-3 bg-brand text-white border-none text-[9px] font-black">
                    {combo.tag ?? 'Combo'}
                  </Badge>
                  {!combo.isAvailable && (
                    <Badge className="absolute right-3 top-3 bg-slate-600 text-white border-none text-[9px]">
                      Hidden
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="font-bold text-sm text-ink line-clamp-2">{combo.title}</p>
                    <p className="text-[10px] text-muted mt-0.5 line-clamp-1">{itemNames}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-black text-brand">₹{combo.price}</p>
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {combo.foodType}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/5">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={combo.isAvailable ?? true}
                        disabled={toggleMut.isPending}
                        onCheckedChange={(v) =>
                          toggleMut.mutate({ comboId: id, isAvailable: v, combo })
                        }
                      />
                      <span className="text-[10px] font-bold text-muted">Live</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(combo)}>
                        <Edit3 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-600 rounded-lg cursor-pointer"
                        onClick={() => {
                          toast.warning(`Delete "${combo.title}"?`, {
                            description: "Are you sure you want to remove this combo?",
                            action: {
                              label: "Delete",
                              onClick: () => deleteMut.mutate(id),
                            },
                          });
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
