import { useEffect, useState } from 'react';

import { GOOGLE_MAPS_API_KEY } from '@/config/env';
import { getGoogleMapsLoadError, loadGoogleMaps } from '@/lib/googleMaps';
import { GoogleRestaurantMapPicker } from '@/components/map/GoogleRestaurantMapPicker';
import { OsmRestaurantMapPicker } from '@/components/map/OsmRestaurantMapPicker';

type Props = {
  latitude: number;
  longitude: number;
  onPick: (lat: number, lng: number) => void;
  height?: number;
};

export function RestaurantMapPicker(props: Props) {
  const [engine, setEngine] = useState<'checking' | 'google' | 'osm'>('checking');

  useEffect(() => {
    let cancelled = false;
    if (!GOOGLE_MAPS_API_KEY) {
      setEngine('osm');
      return;
    }
    void (async () => {
      try {
        await loadGoogleMaps(GOOGLE_MAPS_API_KEY);
        if (!cancelled) setEngine('google');
      } catch {
        if (!cancelled) setEngine('osm');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (engine === 'checking') {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-black/10 bg-slate-50 text-xs text-muted min-h-[208px]"
        style={{ height: props.height ?? 208 }}
      >
        Loading map…
      </div>
    );
  }

  if (engine === 'google') {
    return <GoogleRestaurantMapPicker {...props} />;
  }

  return (
    <div className="space-y-2">
      {getGoogleMapsLoadError() && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Google Maps unavailable in browser — using OpenStreetMap. You can still pin your store and
          edit the address below.
        </p>
      )}
      <OsmRestaurantMapPicker {...props} />
    </div>
  );
}
