/** Minimal Google Maps JS types for the restaurant portal (no @types package). */
declare namespace google.maps {
  enum SymbolPath {
    CIRCLE = 0,
    FORWARD_CLOSED_ARROW = 1,
  }

  class LatLngBounds {
    extend(point: LatLng): void;
  }

  interface LatLng {
    lat(): number;
    lng(): number;
  }

  interface MapOptions {
    center?: { lat: number; lng: number };
    zoom?: number;
    disableDefaultUI?: boolean;
    zoomControl?: boolean;
    gestureHandling?: string;
    styles?: Array<{ featureType?: string; stylers?: Array<Record<string, string>> }>;
  }

  class Map {
    constructor(el: HTMLElement, opts?: MapOptions);
    fitBounds(bounds: LatLngBounds, padding?: number): void;
    setCenter(center: { lat: number; lng: number }): void;
    setZoom(zoom: number): void;
    addListener(event: string, handler: (e: MapMouseEvent) => void): void;
  }

  interface MapMouseEvent {
    latLng?: { lat(): number; lng(): number };
  }

  interface Symbol {
    path?: SymbolPath | string;
    scale?: number;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWeight?: number;
    rotation?: number;
  }

  interface MarkerOptions {
    map?: Map | null;
    position?: { lat: number; lng: number };
    title?: string;
    icon?: Symbol;
    zIndex?: number;
    draggable?: boolean;
  }

  class Marker {
    constructor(opts?: MarkerOptions);
    setMap(map: Map | null): void;
    getPosition(): LatLng | null | undefined;
    setPosition(pos: { lat: number; lng: number }): void;
    addListener(event: string, handler: () => void): void;
  }

  interface PolylineOptions {
    map?: Map | null;
    path?: Array<{ lat: number; lng: number }>;
    strokeColor?: string;
    strokeWeight?: number;
    geodesic?: boolean;
  }

  class Polyline {
    constructor(opts?: PolylineOptions);
    setMap(map: Map | null): void;
  }
}

declare const google: { maps: typeof google.maps };
