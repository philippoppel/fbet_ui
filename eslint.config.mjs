// eslint.config.mjs
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

// Importiere die Prettier-Plugins
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier'; // Stellt sicher, dass ESLint-Regeln Prettier nicht stören

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals'), // Behalte bei, was für dich funktioniert

  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...prettierPlugin.configs.recommended.rules,
    },
  },

  prettierConfig,

  {
    ignores: ['node_modules/', '.next/', 'public/'],
  },

  // ADD: Custom Rule Set für TS71007 und Client Components
  {
    files: ['**/*.tsx'],
    rules: {
      '@next/next/no-server-import-in-client-component': 'error', // schützt vor versehentlichem Server-Import
      'react/jsx-no-bind': 'off', // erlaubt function props wie setOpen
      '@typescript-eslint/ban-types': 'off', // erlaubt Funktionen als Props
      // TS71007 suppression support (falls du ts-expect-error nutzt)
      '@typescript-eslint/ban-ts-comment': [
        'warn',
        {
          'ts-expect-error': 'allow-with-description',
        },
      ],
    },
  },
];

export default eslintConfig;
