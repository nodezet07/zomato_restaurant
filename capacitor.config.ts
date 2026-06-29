import type { CapacitorConfig } from '@capacitor/cli';

const LIVE_RELOAD = process.env.CAPACITOR_LIVE_RELOAD === 'true';
const LAN_HOST = process.env.CAPACITOR_SERVER_HOST ?? '192.168.1.101';
const DEV_PORT = process.env.CAPACITOR_SERVER_PORT ?? '5174';

const config: CapacitorConfig = {
  appId: 'com.company.fooddelivery',
  appName: 'QBITE Restaurant Portal',
  webDir: 'dist',
  server: LIVE_RELOAD
    ? {
        /** Dev only — APK loads from Vite; save web file → auto refresh in app */
        url: `http://${LAN_HOST}:${DEV_PORT}`,
        cleartext: true,
      }
    : {
        androidScheme: 'http',
        cleartext: true,
      },
  android: {
    allowMixedContent: true,
  },
};

export default config;
