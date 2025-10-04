// eslint.config.js (Flat config, compatible avec presets .eslintrc via FlatCompat)

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import prettier from 'eslint-plugin-prettier';

// Utilitaire de compat pour consommer des configs .eslintrc (plugin:react/recommended, prettier, etc.)
import { FlatCompat } from '@eslint/eslintrc';
import { defineConfig, globalIgnores } from 'eslint/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

export default defineConfig([
  // Ignorer les artefacts de build
  globalIgnores(['dist', 'build', 'coverage']),

  // Bases recommandées (Flat natives)
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Presets au format .eslintrc → convertis via FlatCompat
  ...compat.extends(
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:react-refresh/recommended',
    'prettier' // désactive les règles en conflit avec Prettier
  ),

  {
    files: ['**/*.{ts,tsx,js,jsx}'],

    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },

    settings: {
      // Détection auto de la version de React
      react: { version: 'detect' }
    },

    // En flat config, "plugins" doit être un objet nom→plugin
    plugins: {
      // typescript-eslint expose son plugin via `tseslint.plugin`
      '@typescript-eslint': tseslint.plugin,
      prettier
    },

    rules: {
      /* === Style aligné avec CODING_RULES.md === */
      // Accolades à la ligne (Allman)
      'brace-style': ['error', 'allman', { allowSingleLine: false }],
      // Accolades obligatoires même pour 1 ligne
      curly: ['error', 'all'],
      // Égalité stricte
      eqeqeq: ['error', 'always'],
      // Variables & déclarations
      'no-var': 'error',
      'prefer-const': 'warn',
      'one-var': ['error', 'never'],
      semi: ['error', 'always'],
      // Lisibilité
      'max-len': [
        'warn',
        {
          code: 110,
          ignoreComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true
        }
      ],
      'max-statements-per-line': ['error', { max: 1 }],
      'padding-line-between-statements': [
        'warn',
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'always', prev: '*', next: ['return', 'export'] }
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      /* === TypeScript goodies === */
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' }
      ],

      /* === Intégration Prettier (formatage cosmétique) === */
      'prettier/prettier': [
        'warn',
        {
          printWidth: 100,
          tabWidth: 2,
          useTabs: false,
          semi: true,
          singleQuote: true,
          bracketSpacing: true,
          arrowParens: 'always',
          endOfLine: 'lf',
          trailingComma: 'es5'
        }
      ]
    }
  }
]);
