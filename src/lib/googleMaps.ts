let loadPromise: Promise<void> | null = null;
let authFailed = false;

declare global {
  interface Window {
    google?: typeof google;
    __googleMapsAuthFailure?: () => void;
    __googleMapsInitCallback?: () => void;
  }
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

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (!apiKey) return Promise.reject(new Error('Google Maps API key missing'));
  if (authFailed) return Promise.reject(new Error(getGoogleMapsLoadError()!));

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      window.__googleMapsAuthFailure = () => {
        authFailed = true;
        loadPromise = null;
        reject(new Error(getGoogleMapsLoadError()!));
      };

      window.__googleMapsInitCallback = () => {
        if (window.google?.maps) resolve();
        else reject(new Error('Google Maps failed to initialize'));
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

export function riderArrowSymbol(heading = 0): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 5.5,
    fillColor: '#00BCD4',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    rotation: heading,
  };
}

export function pinSymbol(color: string): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 9,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
  };
}
