import type { CapacitorConfig } from '@capacitor/cli';

const local = process.env.CAP_ENV === 'local';
// The deployed field app. Every Vercel deploy reaches the phones the next time the app opens.
const liveUrl = process.env.CAP_SERVER_URL || 'https://erp.wisecart.ph/field';
const host = new URL(liveUrl).host;

const config: CapacitorConfig = {
  appId: 'com.wisecart.field',
  appName: 'WiseCart Field',
  webDir: 'dist',
  server: local
    ? { androidScheme: 'http', cleartext: true }
    : {
        url: liveUrl,
        androidScheme: 'https',
        cleartext: false,
        allowNavigation: [host],
      },
};

export default config;