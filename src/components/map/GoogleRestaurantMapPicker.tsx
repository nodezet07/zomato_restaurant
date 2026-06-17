import { useEffect, useRef, useState } from 'react';

import { GOOGLE_MAPS_API_KEY } from '@/config/env';
import { loadGoogleMaps } from '@/lib/googleMaps';

type Props = {
  latitude: number;
  longitude: number;
  onPick: (lat: number, lng: number) => void;
  height?: number;
};

export function GoogleRestaurantMapPicker({ latitude, longitude, onPick, height = 208 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleMaps(GOOGLE_MAPS_API_KEY);
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) {
          setReady(false);
          setError(e instanceof Error ? e.message : 'Map failed to load');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.google?.maps) return;

    const center = { lat: latitude, lng: longitude };

    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(containerRef.current, {
        center,
        zoom: 16,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      });
      mapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        const lat = e.latLng?.lat();
        const lng = e.latLng?.lng();
        if (lat == null || lng == null) return;
        onPick(lat, lng);
      });
    } else {
      mapRef.current.setCenter(center);
    }

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position: center,
        draggable: true,
        title: 'Restaurant location',
      });
      markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current?.getPosition();
        if (!pos) return;
        onPick(pos.lat(), pos.lng());
      });
    } else {
      markerRef.current.setPosition(center);
    }
  }, [ready, latitude, longitude, onPick]);

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-black/10 bg-slate-100"
      style={{ height }}
    >
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-rose-50 p-4 text-xs text-rose-700">
          <p className="font-semibold text-center">Google Maps could not load</p>
          <p className="text-center leading-relaxed">{error}</p>
        </div>
      )}
      {!ready && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-xs text-muted">
          Loading Google Maps…
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
