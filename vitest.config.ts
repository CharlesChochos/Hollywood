import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**', 'apps/worker/src/**'],
      exclude: ['**/*.test.ts', '**/index.ts'],
    },
  },
});
