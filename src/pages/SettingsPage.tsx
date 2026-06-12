import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bell,
  Upload,
  Trash2,
  Store,
  Clock,
  User,
  Sliders,
  Image as ImageIcon,
  Truck,
  CreditCard,
  Landmark,
  MapPin,
} from 'lucide-react';
import { RestaurantLocationPicker } from '@/components/settings/RestaurantLocationPicker';
import type { RestaurantAddress } from '@/types/api';
import { updateRestaurant, updateRestaurantOpenStatus } from '@/services/restaurants';
import { useRestaurantStore } from '@/stores/restaurantStore';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WEEKDAYS, type WeeklyHour } from '@/types/api';
import { useIsMobile } from '@/hooks/use-mobile';

const SETTINGS_TABS = [
  { id: 'availability', label: 'Store availability', icon: Store },
  { id: 'hours', label: 'Opening hours', icon: Clock },
  { id: 'profile', label: 'Restaurant profile', icon: User },
  { id: 'business', label: 'Order rules', icon: Sliders },
  { id: 'branding', label: 'Logo & banners', icon: ImageIcon },
  { id: 'location', label: 'Store location', icon: MapPin },
  { id: 'delivery', label: 'Delivery settings', icon: Truck },
  { id: 'payments', label: 'Payments & compliance', icon: CreditCard },
  { id: 'bank', label: 'Bank details', icon: Landmark },
  { id: 'alerts', label: 'Order alerts', icon: Bell },
] as const;


function defaultWeeklyHours(existing?: WeeklyHour[]): WeeklyHour[] {
  const map = new Map((existing ?? []).map((h) => [h.day, h]));
  return WEEKDAYS.map((day) => ({
    day,
    open: map.get(day)?.open ?? '09:00',
    close: map.get(day)?.close ?? '22:00',
    isClosed: map.get(day)?.isClosed ?? false,
  }));
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error('Image must be under 2MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SettingsPage() {
  const isMobile = useIsMobile();
  const restaurant = useRestaurantStore((s) => s.restaurant);
  const setRestaurant = useRestaurantStore((s) => s.setRestaurant);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [cuisinesText, setCuisinesText] = useState('');
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('22:00');
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHour[]>([]);
  const [minimumOrderAmount, setMinimumOrderAmount] = useState('');
  const [packagingCharge, setPackagingCharge] = useState('');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('');
  const [averageDeliveryTime, setAverageDeliveryTime] = useState('');
  const [latitude, setLatitude] = useState(28.6139);
  const [longitude, setLongitude] = useState(77.209);
  const [address, setAddress] = useState<RestaurantAddress>({});
  const [logo, setLogo] = useState('');
  const [bannerImages, setBannerImages] = useState<string[]>([]);
  const [supportsCOD, setSupportsCOD] = useState(true);
  const [supportsOnlinePayment, setSupportsOnlinePayment] = useState(true);
  const [gstNumber, setGstNumber] = useState('');
  const [fssaiLicense, setFssaiLicense] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted',
  );

  useEffect(() => {
    if (!restaurant) return;
    setName(restaurant.restaurantName ?? '');
    setPhone(restaurant.phone ?? '');
    setEmail(restaurant.email ?? '');
    setDescription(restaurant.description ?? '');
    setCuisinesText((restaurant.cuisines ?? []).join(', '));
    setOpeningTime(restaurant.openingTime ?? '09:00');
    setClosingTime(restaurant.closingTime ?? '22:00');
    setWeeklyHours(defaultWeeklyHours(restaurant.weeklyHours));
    setMinimumOrderAmount(
      restaurant.minimumOrderAmount != null ? String(restaurant.minimumOrderAmount) : '',
    );
    setPackagingCharge(
      restaurant.packagingCharge != null ? String(restaurant.packagingCharge) : '',
    );
    setLatitude(restaurant.latitude ?? 28.6139);
    setLongitude(restaurant.longitude ?? 77.209);
    setAddress(restaurant.address ?? {});
    setDeliveryRadiusKm(
      restaurant.deliveryRadiusKm != null ? String(restaurant.deliveryRadiusKm) : '5',
    );
    setAverageDeliveryTime(
      restaurant.averageDeliveryTime != null ? String(restaurant.averageDeliveryTime) : '30',
    );
    setLogo(restaurant.logo ?? '');
    setBannerImages(restaurant.bannerImages ?? []);
    setSupportsCOD(restaurant.supportsCOD ?? true);
    setSupportsOnlinePayment(restaurant.supportsOnlinePayment ?? true);
    setGstNumber(restaurant.gstNumber ?? '');
    setFssaiLicense(restaurant.fssaiLicense ?? '');
    setAccountHolder(restaurant.bankAccountDetails?.accountHolderName ?? '');
    setAccountNumber(restaurant.bankAccountDetails?.accountNumber ?? '');
    setIfscCode(restaurant.bankAccountDetails?.ifscCode ?? '');
  }, [restaurant]);

  const onSaveError = (e: Error) => toast.error(e.message);
  const onSaveSuccess = (updated: typeof restaurant, msg: string) => {
    if (updated) setRestaurant(updated);
    toast.success(msg);
  };

  const toggle = useMutation({
    mutationFn: (isOpen: boolean) => updateRestaurantOpenStatus(restaurant!._id, isOpen),
    onSuccess: (updated) => onSaveSuccess(updated, updated.isOpen ? 'Restaurant is now open' : 'Restaurant is now closed'),
    onError: onSaveError,
  });

  const saveProfile = useMutation({
    mutationFn: () =>
      updateRestaurant(restaurant!._id, {
        restaurantName: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        description: description.trim() || undefined,
        cuisines: cuisinesText
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      }),
    onSuccess: (u) => onSaveSuccess(u, 'Profile updated'),
    onError: onSaveError,
  });

  const saveBusiness = useMutation({
    mutationFn: () =>
      updateRestaurant(restaurant!._id, {
        minimumOrderAmount: minimumOrderAmount ? Number(minimumOrderAmount) : 0,
        packagingCharge: packagingCharge ? Number(packagingCharge) : 0,
      }),
    onSuccess: (u) => onSaveSuccess(u, 'Business rules saved'),
    onError: onSaveError,
  });

  const saveLocation = useMutation({
    mutationFn: () =>
      updateRestaurant(restaurant!._id, {
        latitude,
        longitude,
        address: {
          street: address.street?.trim() || undefined,
          city: address.city?.trim() || undefined,
          state: address.state?.trim() || undefined,
          country: address.country?.trim() || 'India',
          pincode: address.pincode?.trim() || undefined,
        },
      }),
    onSuccess: (u) => onSaveSuccess(u, 'Store location saved'),
    onError: onSaveError,
  });

  const saveDelivery = useMutation({
    mutationFn: () =>
      updateRestaurant(restaurant!._id, {
        deliveryRadiusKm: deliveryRadiusKm ? Number(deliveryRadiusKm) : undefined,
        averageDeliveryTime: averageDeliveryTime ? Number(averageDeliveryTime) : undefined,
      }),
    onSuccess: (u) => onSaveSuccess(u, 'Delivery settings saved'),
    onError: onSaveError,
  });

  const saveBranding = useMutation({
    mutationFn: () =>
      updateRestaurant(restaurant!._id, {
        logo: logo || undefined,
        bannerImages: bannerImages.length ? bannerImages : undefined,
      }),
    onSuccess: (u) => onSaveSuccess(u, 'Branding saved'),
    onError: onSaveError,
  });

  const savePayments = useMutation({
    mutationFn: () =>
      updateRestaurant(restaurant!._id, {
        supportsCOD,
        supportsOnlinePayment,
        gstNumber: gstNumber.trim() || undefined,
        fssaiLicense: fssaiLicense.trim() || undefined,
      }),
    onSuccess: (u) => onSaveSuccess(u, 'Payment & compliance saved'),
    onError: onSaveError,
  });

  const saveHours = useMutation({
    mutationFn: () =>
      updateRestaurant(restaurant!._id, { openingTime, closingTime, weeklyHours }),
    onSuccess: (u) => onSaveSuccess(u, 'Opening hours saved'),
    onError: onSaveError,
  });

  const saveBank = useMutation({
    mutationFn: () =>
      updateRestaurant(restaurant!._id, {
        bankAccountDetails: {
          accountHolderName: accountHolder.trim() || undefined,
          accountNumber: accountNumber.trim() || undefined,
          ifscCode: ifscCode.trim() || undefined,
        },
      }),
    onSuccess: (u) => onSaveSuccess(u, 'Bank details saved'),
    onError: onSaveError,
  });

  async function requestNotifications() {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotificationsEnabled(perm === 'granted');
    toast[perm === 'granted' ? 'success' : 'error'](
      perm === 'granted' ? 'Notifications enabled' : 'Permission denied',
    );
  }

  function updateDay(day: string, patch: Partial<WeeklyHour>) {
    setWeeklyHours((prev) => prev.map((h) => (h.day === day ? { ...h, ...patch } : h)));
  }

  async function onImagePick(
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'logo' | 'banner',
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await readImageFile(file);
      if (target === 'logo') setLogo(data);
      else setBannerImages((prev) => [...prev, data]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
    e.target.value = '';
  }

  if (!restaurant) return null;

  return (
    <PageShell eyebrow="Settings" title="Restaurant settings">
      <Tabs
        defaultValue="availability"
        orientation={isMobile ? 'horizontal' : 'vertical'}
        className="flex flex-col md:flex-row gap-8 items-start w-full max-w-6xl space-y-0"
      >
        <TabsList
          variant="line"
          className="flex flex-row md:flex-col h-auto md:w-60 gap-1.5 bg-slate-50 md:bg-transparent p-1.5 md:p-0 justify-start overflow-x-auto md:overflow-x-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0 w-full md:w-60 border border-black/5 md:border-0 rounded-2xl"
        >
          {SETTINGS_TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="text-xs md:text-sm font-semibold capitalize md:w-full md:justify-start px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2.5 justify-center cursor-pointer text-muted-foreground hover:text-ink hover:bg-black/[0.02] data-[state=active]:bg-brand/10 data-[state=active]:text-brand data-[state=active]:font-bold data-[state=active]:after:opacity-0 after:hidden"
            >
              <Icon className="size-4 shrink-0" />
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 w-full max-w-2xl mt-0 space-y-6">
          <TabsContent value="availability">
          <Card className="border-black/5 shadow-sm">
            <CardHeader>
              <CardTitle>Store availability</CardTitle>
              <CardDescription>Control whether customers can place new orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="open-toggle">Accepting orders</Label>
                  <p className="text-xs text-muted-foreground">
                    {restaurant.isOpen ? 'Open on the customer app' : 'Shown as closed'}
                  </p>
                </div>
                <Switch
                  id="open-toggle"
                  checked={restaurant.isOpen}
                  disabled={toggle.isPending}
                  onCheckedChange={(c) => toggle.mutate(c)}
                />
              </div>
              <Separator />
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Slug</dt><dd className="font-medium">{restaurant.slug}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className="font-medium">{restaurant.restaurantStatus}</dd></div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <Card className="border-black/5 shadow-sm">
            <CardHeader>
              <CardTitle>Default hours</CardTitle>
              <CardDescription>Shown on customer app once listing hours are enabled there</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Opens at</Label><Input type="time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} /></div>
              <div className="space-y-2"><Label>Closes at</Label><Input type="time" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} /></div>
            </CardContent>
          </Card>
          <Card className="border-black/5 shadow-sm">
            <CardHeader><CardTitle>Weekly schedule</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {weeklyHours.map((row) => (
                <div key={row.day} className="flex flex-wrap items-center gap-3 rounded-xl border border-black/5 p-3">
                  <span className="w-10 text-xs font-black">{row.day}</span>
                  <Switch checked={!row.isClosed} onCheckedChange={(o) => updateDay(row.day, { isClosed: !o })} />
                  {!row.isClosed ? (
                    <>
                      <Input type="time" className="w-32 h-8 text-xs" value={row.open ?? ''} onChange={(e) => updateDay(row.day, { open: e.target.value })} />
                      <span className="text-xs text-muted">to</span>
                      <Input type="time" className="w-32 h-8 text-xs" value={row.close ?? ''} onChange={(e) => updateDay(row.day, { close: e.target.value })} />
                    </>
                  ) : (
                    <span className="text-xs font-bold text-rose-600 uppercase">Closed</span>
                  )}
                </div>
              ))}
              <Button onClick={() => saveHours.mutate()} disabled={saveHours.isPending}>Save hours</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="border-black/5 shadow-sm">
            <CardHeader><CardTitle>Restaurant profile</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Restaurant name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Phone</Label><Input value={phone} maxLength={10} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Cuisines (comma-separated)</Label><Input value={cuisinesText} onChange={(e) => setCuisinesText(e.target.value)} placeholder="North Indian, Biryani, Chinese" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>Save profile</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business">
          <Card className="border-black/5 shadow-sm">
            <CardHeader>
              <CardTitle>Order rules</CardTitle>
              <CardDescription>Matches minimum order & packaging shown to customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Minimum order amount (₹)</Label>
                <Input type="number" min={0} value={minimumOrderAmount} onChange={(e) => setMinimumOrderAmount(e.target.value)} placeholder="199" />
              </div>
              <div className="space-y-2">
                <Label>Packaging charge (₹)</Label>
                <Input type="number" min={0} value={packagingCharge} onChange={(e) => setPackagingCharge(e.target.value)} placeholder="0 for free packaging filter" />
              </div>
              <Button onClick={() => saveBusiness.mutate()} disabled={saveBusiness.isPending}>Save business rules</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card className="border-black/5 shadow-sm">
            <CardHeader>
              <CardTitle>Logo & banners</CardTitle>
              <CardDescription>Used on home listing and restaurant page in the customer app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Logo</Label>
                {logo ? (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border">
                    <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setLogo('')} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"><Trash2 className="size-3" /></button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand">
                    <Upload className="size-4" /> Upload logo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onImagePick(e, 'logo')} />
                  </label>
                )}
              </div>
              <div className="space-y-2">
                <Label>Banner images</Label>
                <div className="grid grid-cols-2 gap-3">
                  {bannerImages.map((img, i) => (
                    <div key={i} className="relative h-24 rounded-xl overflow-hidden border">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setBannerImages((p) => p.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"><Trash2 className="size-3" /></button>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-brand mt-2">
                  <Upload className="size-4" /> Add banner
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onImagePick(e, 'banner')} />
                </label>
              </div>
              <Button onClick={() => saveBranding.mutate()} disabled={saveBranding.isPending}>Save branding</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location">
          <Card className="border-black/5 shadow-sm">
            <CardHeader>
              <CardTitle>Store location</CardTitle>
              <CardDescription>Pin on map for nearby search & delivery radius center</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RestaurantLocationPicker
                latitude={latitude}
                longitude={longitude}
                address={address}
                onLatitudeChange={setLatitude}
                onLongitudeChange={setLongitude}
                onAddressChange={(patch) => setAddress((a) => ({ ...a, ...patch }))}
              />
              <Button onClick={() => saveLocation.mutate()} disabled={saveLocation.isPending}>
                Save location
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery">
          <Card className="border-black/5 shadow-sm">
            <CardHeader>
              <CardTitle>Delivery settings</CardTitle>
              <CardDescription>Radius and ETA used for restaurant discovery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Delivery radius (km)</Label>
                <Input type="number" min={0.5} max={50} step={0.5} value={deliveryRadiusKm} onChange={(e) => setDeliveryRadiusKm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Average delivery time (minutes)</Label>
                <Input type="number" min={5} max={180} value={averageDeliveryTime} onChange={(e) => setAverageDeliveryTime(e.target.value)} />
              </div>
              <Button onClick={() => saveDelivery.mutate()} disabled={saveDelivery.isPending}>Save delivery settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="border-black/5 shadow-sm">
            <CardHeader><CardTitle>Payments & compliance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between"><Label>Accept cash on delivery</Label><Switch checked={supportsCOD} onCheckedChange={setSupportsCOD} /></div>
              <div className="flex items-center justify-between"><Label>Accept online payment</Label><Switch checked={supportsOnlinePayment} onCheckedChange={setSupportsOnlinePayment} /></div>
              <Separator />
              <div className="space-y-2"><Label>GST number</Label><Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" /></div>
              <div className="space-y-2"><Label>FSSAI license</Label><Input value={fssaiLicense} onChange={(e) => setFssaiLicense(e.target.value)} placeholder="14-digit license" /></div>
              <Button onClick={() => savePayments.mutate()} disabled={savePayments.isPending}>Save</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank">
          <Card className="border-black/5 shadow-sm">
            <CardHeader><CardTitle>Bank account</CardTitle><CardDescription>For settlement payouts</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Account holder</Label><Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} /></div>
              <div className="space-y-2"><Label>Account number</Label><Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></div>
              <div className="space-y-2"><Label>IFSC</Label><Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} /></div>
              <Button onClick={() => saveBank.mutate()} disabled={saveBank.isPending}>Save bank details</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card className="border-black/5 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="size-4" /> Order alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm">Browser pop-ups for new orders (with socket alerts)</p>
                <Button variant={notificationsEnabled ? 'outline' : 'default'} size="sm" onClick={requestNotifications}>
                  {notificationsEnabled ? 'Re-check' : 'Enable'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </div>
      </Tabs>
    </PageShell>
  );
}
