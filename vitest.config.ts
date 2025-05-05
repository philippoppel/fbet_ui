// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/experimental-addon-test/vitest-plugin';

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Globale Konfigurationen
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Top-Level 'test' Objekt, das den Workspace enthält
  test: {
    workspace: [
      // Workspace 1: Standard Unit/Integration Tests (jsdom)
      {
        // Plugins, die den Build/Setup des Workspaces beeinflussen
        plugins: [react()],
        // Test-spezifische Optionen in einem verschachtelten 'test'-Objekt
        test: {
          name: 'unit', // Name innerhalb des verschachtelten 'test'-Objekts
          environment: 'jsdom',
          globals: true,
          setupFiles: './src/testing/setup.ts',
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },

      // Workspace 2: Storybook Interaction Tests (Browser via Playwright)
      {
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
