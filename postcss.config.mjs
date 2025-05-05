// postcss.config.mjs (Wieder die ursprüngliche Version)
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // <-- Das ist für Turbopack korrekt
  },
};
export default config;
