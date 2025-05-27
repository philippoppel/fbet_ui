// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fbet.app',
  appName: 'fbet',
  webDir: 'public', // bleibt so – wird aber nicht verwendet
  server: {
    url: 'https://fbet.vercel.app', // <-- das ist entscheidend
    cleartext: true, // für lokale Tests, sonst weglassen
  },
};

export default config;
