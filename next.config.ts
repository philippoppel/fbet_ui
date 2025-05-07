// next.config.ts  (ESM mit TypeScript)
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ... andere Optionen …

  eslint: {
    /**
     * Achtung: Damit läuft der Build auch durch,
     * wenn noch echte ESLint-FEHLER vorhanden sind !
     */
    ignoreDuringBuilds: true,
  },

  allowedDevOrigins: ['https://192.168.178.148:3000'], // das bleibt davon unberührt
};

export default nextConfig;
