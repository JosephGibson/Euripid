// @ts-check
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'harness/vendor/**',   // vendored third-party helpers — not our code to lint
      'node_modules/**',
      'projects/*/results/**',
    ],
  },

  // TypeScript-ESLint recommended rules
  ...tseslint.configs.recommended,

  // Disable ESLint formatting rules that conflict with Prettier
  prettierConfig,

  // Project-specific overrides
  {
    rules: {
      // k6 uses console.log/warn/error for structured VU logging — do not flag it
      'no-console': 'off',

      // k6's dynamic config patterns mean some any is unavoidable; warn only
      '@typescript-eslint/no-explicit-any': 'warn',

      // k6 error handling catches unknown values; casting is intentional
      '@typescript-eslint/no-unsafe-assignment': 'off',

      // Unused vars: ignore underscore-prefixed (common k6 callback pattern)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
