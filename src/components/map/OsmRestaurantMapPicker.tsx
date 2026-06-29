import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Props = {
  latitude: number;
  longitude: number;
  onPick: (lat: number, lng: number) => void;
  height?: number;
};

const pinIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function OsmRestaurantMapPicker({ latitude, longitude, onPick, height = 208 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);

  onPickRef.current = onPick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 16,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([latitude, longitude], { draggable: true, icon: pinIcon }).addTo(map);

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onPickRef.current(e.latlng.lat, e.latlng.lng);
    });

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onPickRef.current(pos.lat, pos.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const center: L.LatLngExpression = [latitude, longitude];
    mapRef.current.setView(center, mapRef.current.getZoom());
    markerRef.current.setLatLng(center);
  }, [latitude, longitude]);

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-black/10 bg-slate-100 min-h-[208px] z-0"
      style={{ height }}
    >
      <div ref={containerRef} className="h-full w-full min-h-[208px]" />
      <p className="absolute bottom-2 left-2 right-2 text-center text-[10px] font-medium text-slate-600 bg-white/80 rounded-md py-1">
        OpenStreetMap — click or drag pin to set location
      </p>
    </div>
  );
}
