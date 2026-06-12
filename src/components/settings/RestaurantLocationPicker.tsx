import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, LocateFixed, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { reverseGeocode } from '@/services/geocode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RestaurantAddress } from '@/types/api';

type Props = {
  latitude: number;
  longitude: number;
  address: RestaurantAddress;
  onLatitudeChange: (v: number) => void;
  onLongitudeChange: (v: number) => void;
  onAddressChange: (patch: Partial<RestaurantAddress>) => void;
};

const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.209;

export function RestaurantLocationPicker({
  latitude,
  longitude,
  address,
  onLatitudeChange,
  onLongitudeChange,
  onAddressChange,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipGeocodeRef = useRef(true);
  const [geocoding, setGeocoding] = useState(false);

  const lat = Number.isFinite(latitude) ? latitude : DEFAULT_LAT;
  const lng = Number.isFinite(longitude) ? longitude : DEFAULT_LNG;

  const fillAddressFromCoords = useCallback(
    async (newLat: number, newLng: number) => {
      setGeocoding(true);
      try {
        const resolved = await reverseGeocode(newLat, newLng);
        onAddressChange({
          street: resolved.street ?? '',
          city: resolved.city ?? '',
          state: resolved.state ?? '',
          pincode: resolved.pincode ?? '',
          country: resolved.country ?? 'India',
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not auto-fill address');
      } finally {
        setGeocoding(false);
      }
    },
    [onAddressChange],
  );

  const applyCoords = useCallback(
    (newLat: number, newLng: number, runGeocode = true) => {
      if (runGeocode) skipGeocodeRef.current = true;
      onLatitudeChange(Number(newLat.toFixed(6)));
      onLongitudeChange(Number(newLng.toFixed(6)));
      if (runGeocode) void fillAddressFromCoords(newLat, newLng);
    },
    [onLatitudeChange, onLongitudeChange, fillAddressFromCoords],
  );

  // Auto-fill when opening with coordinates but no address text yet
  useEffect(() => {
    const needsFill = !address.street && !address.city && !address.pincode;
    if (needsFill) void fillAddressFromCoords(lat, lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const updateFromMapClick = useCallback(
    (e: MouseEvent) => {
      const el = mapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const span = 0.02;
      const newLng = lng + (x - 0.5) * span * 2;
      const newLat = lat - (y - 0.5) * span * 2;
      applyCoords(newLat, newLng, true);
    },
    [lat, lng, applyCoords],
  );

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    el.addEventListener('click', updateFromMapClick);
    return () => el.removeEventListener('click', updateFromMapClick);
  }, [updateFromMapClick]);

  // Debounced geocode when user edits lat/lng manually
  useEffect(() => {
    if (skipGeocodeRef.current) {
      skipGeocodeRef.current = false;
      return;
    }
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => {
      void fillAddressFromCoords(lat, lng);
    }, 700);
    return () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    };
  }, [lat, lng, fillAddressFromCoords]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        skipGeocodeRef.current = true;
        applyCoords(pos.coords.latitude, pos.coords.longitude, true);
      },
      () => toast.error('Location permission denied'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const bbox = `${lng - 0.012},${lat - 0.008},${lng + 0.012},${lat + 0.008}`;
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="space-y-4">
      <div className="relative rounded-xl overflow-hidden border border-black/10 h-52 bg-slate-100">
        <iframe
          title="Restaurant location"
          className="absolute inset-0 w-full h-full border-0 pointer-events-none"
          src={embedSrc}
        />
        <div
          ref={mapRef}
          className="absolute inset-0 cursor-crosshair z-10"
          title="Click to set pin location"
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full z-20 pointer-events-none">
          <MapPin className="size-8 text-rose-600 drop-shadow-md" fill="currentColor" />
        </div>
        {geocoding && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted font-medium">
        Click the map or use GPS — street, city, state and pincode auto-fill from the pin location.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          disabled={geocoding}
          onClick={useMyLocation}
        >
          <LocateFixed className="size-3.5" />
          Use my location
        </Button>
        <Button type="button" variant="outline" size="sm" className="text-xs" asChild>
          <a
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in maps
          </a>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Latitude</Label>
          <Input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => {
              skipGeocodeRef.current = false;
              onLatitudeChange(Number(e.target.value));
            }}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Longitude</Label>
          <Input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => {
              skipGeocodeRef.current = false;
              onLongitudeChange(Number(e.target.value));
            }}
            className="h-9 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Street / area</Label>
        <Input
          value={address.street ?? ''}
          onChange={(e) => onAddressChange({ street: e.target.value })}
          placeholder="Auto-filled from map"
          className="h-9 text-xs"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">City</Label>
          <Input
            value={address.city ?? ''}
            onChange={(e) => onAddressChange({ city: e.target.value })}
            placeholder="Auto-filled"
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">State</Label>
          <Input
            value={address.state ?? ''}
            onChange={(e) => onAddressChange({ state: e.target.value })}
            placeholder="Auto-filled"
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Pincode</Label>
          <Input
            value={address.pincode ?? ''}
            maxLength={6}
            onChange={(e) => onAddressChange({ pincode: e.target.value.replace(/\D/g, '') })}
            placeholder="Auto-filled"
            className="h-9 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
