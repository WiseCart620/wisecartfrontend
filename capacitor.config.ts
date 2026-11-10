import type { CapacitorConfig } from '@capacitor/cli';

const local = process.env.CAP_ENV === 'local';

const config: CapacitorConfig = {
  appId: 'com.wisecart.field',
  appName: 'WiseCart Field',
  webDir: 'dist',
  server: local
    ? { androidScheme: 'http', cleartext: true }
    : { androidScheme: 'https' },
};

export default config;