import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, LocateFixed, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { RestaurantMapPicker } from '@/components/map/RestaurantMapPicker';
import { reverseGeocode } from '@/services/geocode';
import { getCurrentPosition } from '@/lib/geolocation';
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

const DEFAULT_LAT = 19.076;
const DEFAULT_LNG = 72.8777;

export function RestaurantLocationPicker({
  latitude,
  longitude,
  address,
  onLatitudeChange,
  onLongitudeChange,
  onAddressChange,
}: Props) {
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
        onAddressChange({
          street: `Location (${newLat.toFixed(5)}, ${newLng.toFixed(5)})`,
          city: address.city ?? '',
          state: address.state ?? '',
          pincode: address.pincode ?? '',
          country: address.country ?? 'India',
        });
        const msg = e instanceof Error ? e.message : 'Could not auto-fill address';
        if (!msg.toLowerCase().includes('reverse geocoding')) {
          toast.error(msg);
        }
      } finally {
        setGeocoding(false);
      }
    },
    [onAddressChange],
  );

  const applyCoords = useCallback(
    (newLat: number, newLng: number, runGeocode = true) => {
      if (!Number.isFinite(newLat) || !Number.isFinite(newLng)) return;
      if (runGeocode) skipGeocodeRef.current = true;
      onLatitudeChange(Number(newLat.toFixed(6)));
      onLongitudeChange(Number(newLng.toFixed(6)));
      if (runGeocode) void fillAddressFromCoords(newLat, newLng);
    },
    [onLatitudeChange, onLongitudeChange, fillAddressFromCoords],
  );

  const handleMapPick = useCallback(
    (newLat: number, newLng: number) => {
      applyCoords(newLat, newLng, true);
    },
    [applyCoords],
  );

  useEffect(() => {
    const needsFill = !address.street && !address.city && !address.pincode;
    if (needsFill && Number.isFinite(lat) && Number.isFinite(lng)) {
      void fillAddressFromCoords(lat, lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    if (skipGeocodeRef.current) {
      skipGeocodeRef.current = false;
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => {
      void fillAddressFromCoords(lat, lng);
    }, 700);
    return () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    };
  }, [lat, lng, fillAddressFromCoords]);

  async function useMyLocation() {
    try {
      const pos = await getCurrentPosition();
      skipGeocodeRef.current = true;
      applyCoords(pos.latitude, pos.longitude, true);
      toast.success('Location updated from GPS');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not get location');
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <RestaurantMapPicker
          latitude={lat}
          longitude={lng}
          onPick={handleMapPick}
        />
        {geocoding && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-xl">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted font-medium flex items-center gap-1">
        <MapPin className="size-3 text-rose-500" />
        Click map or drag pin — address auto-fills from Google Geocoding.
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
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in Google Maps
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
