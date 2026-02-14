const grafanaConfig = require('@grafana/eslint-config/flat');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');

module.exports = [
  ...grafanaConfig,
  {
    rules: {
      'react/prop-types': 'off',
      // Disable React Compiler optimization warnings - code is functionally correct
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-deprecated': 'warn',
      // Disable React Compiler optimization warnings - code is functionally correct
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  {
    files: ['src/config.ts'],
    rules: {
      // graphFieldOptions is deprecated but getGraphFieldOptions is not available in runtime Grafana version
      '@typescript-eslint/no-deprecated': 'off',
    },
  },
];
