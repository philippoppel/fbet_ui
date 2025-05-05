// next.config.js oder next.config.mjs
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* andere Konfigurationsoptionen hier */

  // Füge diese Zeilen hinzu, um die Warnung zu beheben:
  // Erlaube Anfragen von deiner Netzwerk-IP während der Entwicklung
  allowedDevOrigins: ['https://192.168.178.148:3000'],
};

export default nextConfig;
