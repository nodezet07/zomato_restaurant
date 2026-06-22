/// <reference types="vite/client" />

declare module '*.css' {}

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SOCKET_URL: string;
  readonly VITE_LAN_HOST?: string;
  readonly VITE_ANDROID_API_HOST?: string;
  readonly VITE_NATIVE_API_HOST?: string;
  readonly VITE_DEFAULT_RESTAURANT_ID?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
