import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qbite.restaurant',
  appName: 'QBITE Restaurant Portal',
  webDir: 'dist',
  server: {
    /** Use bundled assets — do NOT set `url` for APK/production builds */
    androidScheme: 'http',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
