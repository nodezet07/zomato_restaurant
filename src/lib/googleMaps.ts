let loadPromise: Promise<GoogleMapsRuntime> | null = null;
let authFailed = false;
let runtime: GoogleMapsRuntime | null = null;

type MapsNamespace = {
  importLibrary(libraryName: 'maps' | 'marker'): Promise<unknown>;
  SymbolPath: typeof google.maps.SymbolPath;
};

declare global {
  interface Window {
    google?: typeof google;
    __googleMapsAuthFailure?: () => void;
    __googleMapsInitCallback?: () => void;
  }
}

export type GoogleMapsRuntime = {
  Map: typeof google.maps.Map;
  Marker: typeof google.maps.Marker;
  Polyline: typeof google.maps.Polyline;
  LatLngBounds: typeof google.maps.LatLngBounds;
  SymbolPath: typeof google.maps.SymbolPath;
};

export function getGoogleMapsRuntime(): GoogleMapsRuntime | null {
  return runtime;
}

export function getGoogleMapsLoadError(): string | null {
  if (authFailed) {
    return (
      'Google Maps rejected this API key for the browser. Use a Web (JavaScript) key — not the Android app key. ' +
      'Enable Maps JavaScript API and allow http://localhost:5174/* in key restrictions.'
    );
  }
  return null;
}

function getMapsApi(): MapsNamespace | undefined {
  return window.google?.maps as unknown as MapsNamespace | undefined;
}

async function importMapsRuntime(): Promise<GoogleMapsRuntime> {
  if (runtime) return runtime;
  const mapsNs = getMapsApi();
  if (typeof mapsNs?.importLibrary !== 'function') {
    throw new Error('Google Maps bootstrap did not load');
  }

  const maps = (await mapsNs.importLibrary('maps')) as google.maps.MapsLibrary;
  let MarkerCtor = maps.Marker as typeof google.maps.Marker | undefined;
  if (!MarkerCtor) {
    try {
      const markerLib = (await mapsNs.importLibrary('marker')) as { Marker?: typeof google.maps.Marker };
      MarkerCtor = markerLib.Marker;
    } catch {
      /* Marker may still be on maps namespace in older loaders */
    }
  }
  if (!MarkerCtor) {
    throw new Error('Google Maps Marker library is unavailable');
  }

  runtime = {
    Map: maps.Map,
    Marker: MarkerCtor,
    Polyline: maps.Polyline,
    LatLngBounds: maps.LatLngBounds,
    SymbolPath: mapsNs.SymbolPath,
  };
  return runtime;
}

export function loadGoogleMaps(apiKey: string): Promise<GoogleMapsRuntime> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps is only available in the browser'));
  }
  if (runtime) return Promise.resolve(runtime);
  if (!apiKey) return Promise.reject(new Error('Google Maps API key missing'));
  if (authFailed) return Promise.reject(new Error(getGoogleMapsLoadError()!));

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const finish = async () => {
        try {
          const libs = await importMapsRuntime();
          resolve(libs);
        } catch (error) {
          loadPromise = null;
          reject(error instanceof Error ? error : new Error('Google Maps failed to initialize'));
        }
      };

      const mapsNs = getMapsApi();
      if (typeof mapsNs?.importLibrary === 'function') {
        void finish();
        return;
      }

      window.__googleMapsAuthFailure = () => {
        authFailed = true;
        loadPromise = null;
        reject(new Error(getGoogleMapsLoadError()!));
      };

      window.__googleMapsInitCallback = () => {
        void finish();
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&callback=__googleMapsInitCallback`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        loadPromise = null;
        reject(new Error('Failed to load Google Maps script'));
      };
      document.head.appendChild(script);
    });
  }

  return loadPromise;
}

export type MapCoord = { latitude: number; longitude: number; heading?: number };

export function isValidCoord(
  point?: Partial<MapCoord> | null,
): point is MapCoord {
  return (
    Boolean(point) &&
    Number.isFinite(point!.latitude) &&
    Number.isFinite(point!.longitude)
  );
}

export function formatCoordDisplay(
  point?: Partial<MapCoord> | null,
  precision = 5,
): string | null {
  if (!isValidCoord(point)) return null;
  return `${point.latitude.toFixed(precision)}, ${point.longitude.toFixed(precision)}`;
}

export function riderArrowSymbol(
  gmaps: GoogleMapsRuntime,
  heading = 0,
): google.maps.Symbol {
  return {
    path: gmaps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 5.5,
    fillColor: '#00BCD4',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    rotation: heading,
  };
}

export function pinSymbol(gmaps: GoogleMapsRuntime, color: string): google.maps.Symbol {
  return {
    path: gmaps.SymbolPath.CIRCLE,
    scale: 9,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
  };
}
