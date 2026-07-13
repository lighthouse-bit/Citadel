import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Framer Motion intentionally exposes lowercase JSX members (motion.div),
      // which core ESLint cannot mark as used without the full React plugin.
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^[A-Z_]',
        caughtErrors: 'none',
        varsIgnorePattern: '^[A-Z_]|^motion$',
      }],
      // These compiler-oriented rules were introduced after this application.
      // Keep the actionable Hooks rules while legacy effects are modernized.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
    },
  },
  {
    files: ['src/context/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
