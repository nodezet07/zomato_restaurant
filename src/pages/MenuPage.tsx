import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Leaf, Drumstick, Egg, Edit3, Trash2, UtensilsCrossed, Search } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import {
  createMenuCategory,
  createMenuItem,
  deleteMenuCategory,
  deleteMenuItem,
  fetchMenuCategories,
  fetchMenuItems,
  toggleMenuItemAvailability,
  updateMenuCategory,
  updateMenuItem,
} from '@/services/menu';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddonFields } from '@/components/menu/AddonFields';
import { MenuItemImages } from '@/components/menu/MenuItemImages';
import { CombosTab } from '@/components/menu/CombosTab';
import { OffersTab } from '@/components/menu/OffersTab';
import type { MenuAddon, MenuItem } from '@/types/api';

type ItemFormState = {
  itemName: string;
  shortDescription: string;
  description: string;
  price: string;
  discountedPrice: string;
  categoryId: string;
  foodType: MenuItem['foodType'];
  isRecommended: boolean;
  images: string[];
  addons: MenuAddon[];
  spiceLevel: '' | 'low' | 'medium' | 'high';
  preparationTimeMinutes: string;
  ingredients: string;
};

const emptyItemForm = (): ItemFormState => ({
  itemName: '',
  shortDescription: '',
  description: '',
  price: '',
  discountedPrice: '',
  categoryId: '',
  foodType: 'veg',
  isRecommended: false,
  images: [],
  addons: [],
  spiceLevel: '',
  preparationTimeMinutes: '',
  ingredients: '',
});

function parseIngredients(text: string): string[] | undefined {
  const list = text.split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? list : undefined;
}

function itemExtrasPayload(form: ItemFormState) {
  return {
    spiceLevel: form.spiceLevel || undefined,
    preparationTimeMinutes: form.preparationTimeMinutes
      ? Number(form.preparationTimeMinutes)
      : undefined,
    ingredients: parseIngredients(form.ingredients),
  };
}

function foodBadge(type: MenuItem['foodType']) {
  if (type === 'veg') return { icon: Leaf, label: 'Veg', className: 'bg-emerald-500/10 text-emerald-600' };
  if (type === 'egg') return { icon: Egg, label: 'Egg', className: 'bg-amber-500/10 text-amber-600' };
  return { icon: Drumstick, label: 'Non-veg', className: 'bg-rose-500/10 text-rose-600' };
}

function categoryIdOf(item: MenuItem) {
  return typeof item.categoryId === 'object' ? item.categoryId._id : item.categoryId;
}

function categoryNameOf(item: MenuItem) {
  return typeof item.categoryId === 'object' ? item.categoryId.categoryName ?? 'Category' : 'Category';
}

export function MenuPage() {
  const qc = useQueryClient();
  const restaurant = useRestaurantStore((s) => s.restaurant);
  const restaurantId = restaurant?._id ?? '';

  const [catOpen, setCatOpen] = useState(false);
  const [catManageOpen, setCatManageOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [itemOpen, setItemOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [foodTypeFilter, setFoodTypeFilter] = useState('all');

  const [catName, setCatName] = useState('');
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm);

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState<ItemFormState>(emptyItemForm);

  const categoriesQ = useQuery({
    queryKey: ['menu', 'categories', restaurantId],
    queryFn: () => fetchMenuCategories(restaurantId),
    enabled: Boolean(restaurantId),
  });

  const itemsQ = useQuery({
    queryKey: ['menu', 'items', restaurantId],
    queryFn: () => fetchMenuItems(restaurantId),
    enabled: Boolean(restaurantId),
  });

  const categories = categoriesQ.data?.categories ?? [];
  const items = itemsQ.data ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['menu', 'categories', restaurantId] });
    qc.invalidateQueries({ queryKey: ['menu', 'items', restaurantId] });
    qc.invalidateQueries({ queryKey: ['menu', 'combos', restaurantId] });
  };

  const createCatMut = useMutation({
    mutationFn: () =>
      createMenuCategory({
        restaurantId,
        categoryName: catName.trim(),
        sortOrder: categories.length + 1,
      }),
    onSuccess: () => {
      invalidate();
      setCatName('');
      setCatOpen(false);
      toast.success('Category created successfully');
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  const createItemMut = useMutation({
    mutationFn: () =>
      createMenuItem({
        restaurantId,
        categoryId: itemForm.categoryId,
        itemName: itemForm.itemName.trim(),
        shortDescription: itemForm.shortDescription.trim() || undefined,
        description: itemForm.description.trim() || undefined,
        price: Number(itemForm.price),
        discountedPrice: itemForm.discountedPrice
          ? Number(itemForm.discountedPrice)
          : undefined,
        foodType: itemForm.foodType,
        isRecommended: itemForm.isRecommended,
        images: itemForm.images.length ? itemForm.images : undefined,
        addons: itemForm.addons.length ? itemForm.addons : undefined,
        ...itemExtrasPayload(itemForm),
      }),
    onSuccess: () => {
      invalidate();
      setItemForm(emptyItemForm());
      setItemOpen(false);
      toast.success('Menu item added successfully');
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  const updateItemMut = useMutation({
    mutationFn: () => {
      if (!editingItem) throw new Error('No item selected to edit');
      return updateMenuItem(editingItem._id, {
        itemName: editForm.itemName.trim(),
        shortDescription: editForm.shortDescription.trim() || undefined,
        description: editForm.description.trim() || undefined,
        price: Number(editForm.price),
        discountedPrice: editForm.discountedPrice
          ? Number(editForm.discountedPrice)
          : undefined,
        foodType: editForm.foodType,
        isRecommended: editForm.isRecommended,
        images: editForm.images,
        addons: editForm.addons,
        ...itemExtrasPayload(editForm),
      });
    },
    onSuccess: () => {
      invalidate();
      setEditingItem(null);
      setEditOpen(false);
      toast.success('Menu item updated successfully');
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  const updateCatMut = useMutation({
    mutationFn: () => updateMenuCategory(editingCatId!, { categoryName: editingCatName.trim() }),
    onSuccess: () => {
      invalidate();
      setEditingCatId(null);
      setEditingCatName('');
      toast.success('Category renamed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCatMut = useMutation({
    mutationFn: deleteMenuCategory,
    onSuccess: () => {
      invalidate();
      toast.success('Category deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) =>
      toggleMenuItemAvailability(itemId, isAvailable),
    onSuccess: () => {
      invalidate();
      toast.success('Item availability updated');
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  const deleteMut = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => {
      invalidate();
      toast.success('Item removed successfully');
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search Query filter (matches name or description)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.itemName.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesDesc) return false;
      }

      // 2. Category filter
      if (categoryFilter !== 'all') {
        const cid = categoryIdOf(item);
        if (cid !== categoryFilter) return false;
      }

      // 3. Food Type filter
      if (foodTypeFilter !== 'all') {
        if (item.foodType !== foodTypeFilter) return false;
      }

      return true;
    });
  }, [items, searchQuery, categoryFilter, foodTypeFilter]);

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<MenuItem>();
    return [
      columnHelper.accessor('images', {
        id: 'image',
        header: 'Image',
        cell: (info) => {
          const images = info.getValue() ?? [];
          const itemImg = images.length > 0 ? images[0] : null;
          const item = info.row.original;
          return (
            <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-black/5 bg-slate-50 flex items-center justify-center shadow-xs">
              {itemImg ? (
                <img
                  src={itemImg}
                  alt={item.itemName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-brand/5 flex items-center justify-center text-brand">
                  <UtensilsCrossed className="size-5 opacity-40" />
                </div>
              )}
              {item.isRecommended && (
                <span className="absolute -top-0.5 -left-0.5 bg-amber-500 text-white text-[7px] font-black uppercase px-1 py-0.5 rounded-br-md shadow-xs">
                  ★
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('itemName', {
        id: 'name',
        header: 'Name',
        cell: (info) => {
          const item = info.row.original;
          return (
            <div className="break-words">
              <span className="font-bold text-ink text-xs sm:text-sm block">{item.itemName}</span>
              {item.description && (
                <span className="text-[10.5px] text-muted font-semibold line-clamp-1 leading-normal">
                  {item.description}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => categoryNameOf(row), {
        id: 'category',
        header: 'Category',
        cell: (info) => <span className="font-semibold text-xs text-ink">{info.getValue()}</span>,
      }),
      columnHelper.accessor('price', {
        header: 'Price',
        cell: (info) => {
          const item = info.row.original;
          const hasDiscount = item.discountedPrice != null && item.discountedPrice < item.price;
          return (
            <div className="flex flex-col text-xs font-semibold">
              {hasDiscount ? (
                <>
                  <span className="font-extrabold text-brand">₹{item.discountedPrice}</span>
                  <span className="text-[10px] text-muted line-through">₹{item.price}</span>
                </>
              ) : (
                <span className="font-extrabold text-brand">₹{item.price}</span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('foodType', {
        header: 'Food Type',
        cell: (info) => {
          const type = info.getValue();
          const fb = foodBadge(type);
          const Icon = fb.icon;
          return (
            <Badge variant="outline" className={`${fb.className} border-none text-[9px] font-black uppercase px-2 py-0.5 rounded-md`}>
              <Icon className="mr-1 h-3.5 w-3.5 shrink-0" />
              {fb.label}
            </Badge>
          );
        },
      }),
      columnHelper.accessor('isAvailable', {
        header: 'Status',
        cell: (info) => {
          const item = info.row.original;
          return (
            <div className="flex items-center gap-2 select-none">
              <Switch
                id={`avail-${item._id}`}
                checked={item.isAvailable}
                disabled={toggleMut.isPending}
                onCheckedChange={(checked) =>
                  toggleMut.mutate({ itemId: item._id, isAvailable: checked })
                }
              />
              <span className="text-[11px] font-bold text-muted">
                {item.isAvailable ? 'Live' : 'Hidden'}
              </span>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <div className="text-right pr-4">Actions</div>,
        cell: (info) => {
          const item = info.row.original;
          return (
            <div className="flex items-center justify-end gap-1.5 pr-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingItem(item);
                  setEditForm({
                    itemName: item.itemName,
                    shortDescription: item.shortDescription ?? '',
                    description: item.description ?? '',
                    price: String(item.price),
                    discountedPrice:
                      item.discountedPrice != null ? String(item.discountedPrice) : '',
                    categoryId: typeof item.categoryId === 'object' ? item.categoryId._id : item.categoryId,
                    foodType: item.foodType,
                    isRecommended: item.isRecommended ?? false,
                    images: item.images ?? [],
                    addons: item.addons ?? [],
                    spiceLevel: item.spiceLevel ?? '',
                    preparationTimeMinutes:
                      item.preparationTimeMinutes != null
                        ? String(item.preparationTimeMinutes)
                        : '',
                    ingredients: (item.ingredients ?? []).join(', '),
                  });
                  setEditOpen(true);
                }}
                className="text-muted hover:text-brand hover:bg-brand/5 h-8 w-8 rounded-lg cursor-pointer"
              >
                <Edit3 className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={deleteMut.isPending}
                onClick={() => {
                  toast.warning(`Delete "${item.itemName}"?`, {
                    description: "Are you sure you want to remove this item?",
                    action: {
                      label: "Delete",
                      onClick: () => deleteMut.mutate(item._id),
                    },
                  });
                }}
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 rounded-lg cursor-pointer"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          );
        },
      }),
    ];
  }, [toggleMut, deleteMut]);

  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const categoryOptions = categories;

  return (
    <PageShell
      eyebrow="Menu"
      title="Menu management"
      subtitle={`${items.length} items · ${categories.length} categories`}
      action={
        <div className="flex flex-wrap gap-2">
          {/* Add Category Dialog */}
          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9 rounded-xl font-bold text-xs border-black/10">
                <Plus className="h-4 w-4" /> Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[340px] sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base font-extrabold text-ink">Add Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="cat-name" className="text-[10px] font-black uppercase text-muted tracking-wider">Category name</Label>
                <Input
                  id="cat-name"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Biryani"
                  className="h-10 rounded-xl border border-black/10 text-xs font-semibold placeholder:text-muted focus:border-brand"
                />
              </div>
              <DialogFooter className="pt-2">
                <Button
                  onClick={() => createCatMut.mutate()}
                  disabled={!catName.trim() || createCatMut.isPending}
                  className="w-full bg-brand hover:bg-brand-dark text-white font-bold h-10 rounded-xl text-xs"
                >
                  Create Category
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={catManageOpen} onOpenChange={setCatManageOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold text-xs border-black/10">
                Manage categories
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Manage categories</DialogTitle>
              </DialogHeader>
              <ul className="space-y-2 max-h-64 overflow-y-auto py-2">
                {categories.length === 0 ? (
                  <li className="text-sm text-muted text-center py-4">No categories yet.</li>
                ) : (
                  categories.map((cat) => (
                    <li key={cat._id} className="flex items-center gap-2 rounded-xl border border-black/5 p-2">
                      {editingCatId === cat._id ? (
                        <>
                          <Input
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            disabled={updateCatMut.isPending}
                            onClick={() => updateCatMut.mutate()}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => {
                              setEditingCatId(null);
                              setEditingCatName('');
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-ink flex-1">{cat.categoryName}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => {
                              setEditingCatId(cat._id);
                              setEditingCatName(cat.categoryName);
                            }}
                          >
                            <Edit3 className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-rose-600"
                            disabled={deleteCatMut.isPending}
                            onClick={() => {
                              if (confirm(`Delete "${cat.categoryName}"? Items in this category will be removed.`)) {
                                deleteCatMut.mutate(cat._id);
                              }
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </DialogContent>
          </Dialog>

          {/* Add Item Dialog */}
          <Dialog open={itemOpen} onOpenChange={setItemOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 h-9 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold text-xs">
                <Plus className="h-4 w-4" /> Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[95vh] overflow-y-auto overflow-x-hidden sm:max-w-4xl w-full">
              <DialogHeader>
                <DialogTitle className="text-base font-extrabold text-ink">Add Menu Item</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2 text-left">
                {/* Left Column: Details & Image */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted tracking-wider">Category</Label>
                    <Select
                      value={itemForm.categoryId}
                      onValueChange={(v) => setItemForm((f) => ({ ...f, categoryId: v }))}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-black/10 text-xs font-semibold text-ink w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-black/5 rounded-xl shadow-md p-1" position="popper">
                        {categoryOptions.map((c) => (
                          <SelectItem key={c._id} value={c._id} className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer">
                            {c.categoryName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="item-name" className="text-[10px] font-black uppercase text-muted tracking-wider">Item name</Label>
                    <Input
                      id="item-name"
                      value={itemForm.itemName}
                      onChange={(e) => setItemForm((f) => ({ ...f, itemName: e.target.value }))}
                      placeholder="e.g. Chicken Biryani"
                      className="h-10 rounded-xl border border-black/10 text-xs font-semibold placeholder:text-muted"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="item-short" className="text-[10px] font-black uppercase text-muted tracking-wider">Short description</Label>
                    <Input
                      id="item-short"
                      value={itemForm.shortDescription}
                      maxLength={200}
                      onChange={(e) => setItemForm((f) => ({ ...f, shortDescription: e.target.value }))}
                      placeholder="One line for menu card (max 200 chars)"
                      className="h-10 rounded-xl border border-black/10 text-xs font-semibold placeholder:text-muted"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="item-desc" className="text-[10px] font-black uppercase text-muted tracking-wider">Description</Label>
                    <Input
                      id="item-desc"
                      value={itemForm.description}
                      onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="e.g. Fragrant rice with spices & chicken piece"
                      className="h-10 rounded-xl border border-black/10 text-xs font-semibold placeholder:text-muted"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="item-price" className="text-[10px] font-black uppercase text-muted tracking-wider">Price (₹)</Label>
                      <Input
                        id="item-price"
                        type="number"
                        min={0}
                        value={itemForm.price}
                        onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
                        placeholder="e.g. 299"
                        className="h-10 rounded-xl border border-black/10 text-xs font-semibold placeholder:text-muted"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="item-offer" className="text-[10px] font-black uppercase text-muted tracking-wider">Offer price</Label>
                      <Input
                        id="item-offer"
                        type="number"
                        min={0}
                        value={itemForm.discountedPrice}
                        onChange={(e) => setItemForm((f) => ({ ...f, discountedPrice: e.target.value }))}
                        placeholder="Optional"
                        className="h-10 rounded-xl border border-black/10 text-xs font-semibold placeholder:text-muted"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted tracking-wider">Food type</Label>
                      <Select
                        value={itemForm.foodType}
                        onValueChange={(v) =>
                          setItemForm((f) => ({ ...f, foodType: v as MenuItem['foodType'] }))
                        }
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

                  <div className="flex items-center justify-between border border-black/5 p-3 rounded-xl bg-slate-50/50">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-black uppercase text-ink tracking-wider">Recommended Item</Label>
                      <p className="text-[9px] text-muted font-semibold">Highlight this item on the menu</p>
                    </div>
                    <Switch
                      checked={itemForm.isRecommended}
                      onCheckedChange={(checked) => setItemForm((f) => ({ ...f, isRecommended: checked }))}
                    />
                  </div>

                  <MenuItemImages
                    images={itemForm.images}
                    onChange={(images) => setItemForm((f) => ({ ...f, images }))}
                  />
                </div>

                {/* Right Column: Customizations & Extras */}
                <div className="space-y-4 border-t md:border-t-0 md:border-l border-black/5 pt-4 md:pt-0 md:pl-6">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted">Spice level</Label>
                      <Select
                        value={itemForm.spiceLevel || 'none'}
                        onValueChange={(v) =>
                          setItemForm((f) => ({
                            ...f,
                            spiceLevel: v === 'none' ? '' : (v as ItemFormState['spiceLevel']),
                          }))
                        }
                      >
                        <SelectTrigger className="h-9 text-xs w-full"><SelectValue /></SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted">Prep time (min)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={180}
                        value={itemForm.preparationTimeMinutes}
                        onChange={(e) => setItemForm((f) => ({ ...f, preparationTimeMinutes: e.target.value }))}
                        className="h-9 text-xs"
                        placeholder="15"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted">Ingredients (comma-separated)</Label>
                    <Input
                      value={itemForm.ingredients}
                      onChange={(e) => setItemForm((f) => ({ ...f, ingredients: e.target.value }))}
                      className="h-9 text-xs"
                      placeholder="rice, chicken, spices"
                    />
                  </div>
                  <AddonFields
                    value={itemForm.addons}
                    onChange={(addons) => setItemForm((f) => ({ ...f, addons }))}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-black/5 mt-2 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl text-xs font-bold border-black/10"
                  onClick={() => setItemOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createItemMut.mutate()}
                  disabled={
                    !itemForm.categoryId ||
                    !itemForm.itemName.trim() ||
                    !itemForm.price ||
                    createItemMut.isPending
                  }
                  className="bg-brand hover:bg-brand-dark text-white font-bold h-10 rounded-xl text-xs sm:ml-2 flex-1 sm:flex-none"
                >
                  Add menu item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-h-[95vh] overflow-y-auto overflow-x-hidden sm:max-w-4xl w-full">
              <DialogHeader>
                <DialogTitle className="text-base font-extrabold text-ink">Edit Menu Item</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2 text-left">
                {/* Left Column: Details & Image */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-name" className="text-[10px] font-black uppercase text-muted tracking-wider">Item name</Label>
                    <Input
                      id="edit-name"
                      value={editForm.itemName}
                      onChange={(e) => setEditForm((f) => ({ ...f, itemName: e.target.value }))}
                      placeholder="e.g. Chicken Biryani"
                      className="h-10 rounded-xl border border-black/10 text-xs font-semibold placeholder:text-muted"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-short" className="text-[10px] font-black uppercase text-muted tracking-wider">Short description</Label>
                    <Input
                      id="edit-short"
                      value={editForm.shortDescription}
                      maxLength={200}
                      onChange={(e) => setEditForm((f) => ({ ...f, shortDescription: e.target.value }))}
                      placeholder="One line for menu card (max 200 chars)"
                      className="h-10 rounded-xl border border-black/10 text-xs font-semibold placeholder:text-muted"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-desc" className="text-[10px] font-black uppercase text-muted tracking-wider">Description</Label>
                    <Input
                      id="edit-desc"
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="e.g. Fragrant rice with spices & chicken piece"
                      className="h-10 rounded-xl border border-black/10 text-xs font-semibold placeholder:text-muted"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-price" className="text-[10px] font-black uppercase text-muted tracking-wider">Price (₹)</Label>
                      <Input
                        id="edit-price"
                        type="number"
                        min={0}
                        value={editForm.price}
                        onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                        placeholder="e.g. 299"
                        className="h-10 rounded-xl border border-black/10 text-xs font-semibold placeholder:text-muted"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-offer" className="text-[10px] font-black uppercase text-muted tracking-wider">Offer price</Label>
                      <Input
                        id="edit-offer"
                        type="number"
                        min={0}
                        value={editForm.discountedPrice}
                        onChange={(e) => setEditForm((f) => ({ ...f, discountedPrice: e.target.value }))}
                        placeholder="Optional"
                        className="h-10 rounded-xl border border-black/10 text-xs font-semibold placeholder:text-muted"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted tracking-wider">Food type</Label>
                      <Select
                        value={editForm.foodType}
                        onValueChange={(v) =>
                          setEditForm((f) => ({ ...f, foodType: v as MenuItem['foodType'] }))
                        }
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

                  <div className="flex items-center justify-between border border-black/5 p-3 rounded-xl bg-slate-50/50">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-black uppercase text-ink tracking-wider">Recommended Item</Label>
                      <p className="text-[9px] text-muted font-semibold">Highlight this item on the menu</p>
                    </div>
                    <Switch
                      checked={editForm.isRecommended}
                      onCheckedChange={(checked) => setEditForm((f) => ({ ...f, isRecommended: checked }))}
                    />
                  </div>

                  <MenuItemImages
                    images={editForm.images}
                    onChange={(images) => setEditForm((f) => ({ ...f, images }))}
                  />
                </div>

                {/* Right Column: Customizations & Extras */}
                <div className="space-y-4 border-t md:border-t-0 md:border-l border-black/5 pt-4 md:pt-0 md:pl-6">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted">Spice level</Label>
                      <Select
                        value={editForm.spiceLevel || 'none'}
                        onValueChange={(v) =>
                          setEditForm((f) => ({
                            ...f,
                            spiceLevel: v === 'none' ? '' : (v as ItemFormState['spiceLevel']),
                          }))
                        }
                      >
                        <SelectTrigger className="h-9 text-xs w-full"><SelectValue /></SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted">Prep time (min)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={180}
                        value={editForm.preparationTimeMinutes}
                        onChange={(e) => setEditForm((f) => ({ ...f, preparationTimeMinutes: e.target.value }))}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted">Ingredients</Label>
                    <Input
                      value={editForm.ingredients}
                      onChange={(e) => setEditForm((f) => ({ ...f, ingredients: e.target.value }))}
                      className="h-9 text-xs"
                    />
                  </div>
                  <AddonFields
                    value={editForm.addons}
                    onChange={(addons) => setEditForm((f) => ({ ...f, addons }))}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-black/5 mt-2 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl text-xs font-bold border-black/10"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateItemMut.mutate()}
                  disabled={
                    !editForm.itemName.trim() ||
                    !editForm.price ||
                    updateItemMut.isPending
                  }
                  className="bg-brand hover:bg-brand-dark text-white font-bold h-10 rounded-xl text-xs sm:ml-2 flex-1 sm:flex-none"
                >
                  Save changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="mb-5 h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="items" className="text-xs font-bold">
            Menu items ({items.length})
          </TabsTrigger>
          <TabsTrigger value="combos" className="text-xs font-bold">
            Combos
          </TabsTrigger>
          <TabsTrigger value="offers" className="text-xs font-bold">
            Offers & coupons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="combos">
          <CombosTab restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="offers">
          <OffersTab restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          {(categoriesQ.isLoading || itemsQ.isLoading) && (
            <p className="text-sm text-muted font-semibold">Loading menu…</p>
          )}

          {/* Search & Filters controls bar */}
          {!categoriesQ.isLoading && items.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
              {/* Search bar */}
              <div className="relative w-full sm:flex-1 max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted size-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item name or description..."
                  className="h-9 w-full rounded-xl border border-black/10 bg-slate-50 px-3 pl-8 text-xs font-semibold text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-all"
                />
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center w-full sm:w-auto ml-auto">
                {/* Category select filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-44 rounded-xl border-black/10 bg-slate-50 text-xs font-semibold text-ink shrink-0 select-none">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="bg-white border border-black/5 rounded-xl shadow-md p-1">
                    <SelectItem value="all" className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer py-1.5">
                      All Categories
                    </SelectItem>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c._id} value={c._id} className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer py-1.5">
                        {c.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Food Type select filter */}
                <Select value={foodTypeFilter} onValueChange={setFoodTypeFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-32 rounded-xl border-black/10 bg-slate-50 text-xs font-semibold text-ink shrink-0 select-none">
                    <SelectValue placeholder="Food Type" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="bg-white border border-black/5 rounded-xl shadow-md p-1">
                    <SelectItem value="all" className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer py-1.5">All Types</SelectItem>
                    <SelectItem value="veg" className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer py-1.5">Veg</SelectItem>
                    <SelectItem value="nonveg" className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer py-1.5">Non-veg</SelectItem>
                    <SelectItem value="egg" className="text-xs font-bold text-ink rounded-lg focus:bg-slate-50 cursor-pointer py-1.5">Egg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {!categoriesQ.isLoading && items.length === 0 && (
            <Card className="border-dashed border-black/10 bg-white rounded-2xl shadow-xs">
              <CardContent className="py-12 text-center text-sm text-muted font-semibold">
                No menu yet. Add a category, then add items.
              </CardContent>
            </Card>
          )}

          {!categoriesQ.isLoading && items.length > 0 && filteredItems.length === 0 && (
            <Card className="border-dashed border-black/10 bg-white rounded-2xl shadow-xs">
              <CardContent className="py-12 text-center text-sm text-muted font-semibold">
                No menu items match your search or filter options.
              </CardContent>
            </Card>
          )}

          {/* TanStack Table displaying Menu items */}
          {!categoriesQ.isLoading && filteredItems.length > 0 && (
            <div className="w-full space-y-4 pt-1">
              <div className="rounded-2xl border border-black/5 bg-white overflow-hidden shadow-xs">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="hover:bg-transparent border-black/5">
                        {headerGroup.headers.map((header) => (
                          <TableHead 
                            key={header.id} 
                            className={header.id === 'name' ? 'w-full' : ''}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="border-black/5 hover:bg-black/[0.005] transition-colors">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell 
                            key={cell.id} 
                            className={cell.column.id === 'name' ? 'w-full' : ''}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted font-semibold">
                  Showing {table.getRowModel().rows.length} of {filteredItems.length} menu items
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
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
