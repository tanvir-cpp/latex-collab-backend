import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const env = loadEnv('test', process.cwd(), '');

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // Tests run against a separate database so dev data is never touched.
    env: { ...env, NODE_ENV: 'test', DB_NAME: env.DB_NAME_TEST ?? `${env.DB_NAME}_test` },
    fileParallelism: false,
  },
});
