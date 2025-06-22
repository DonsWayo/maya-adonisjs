import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  external: ['@openrouter/ai-sdk-provider', 'ai', '@vinejs/vine'],
  target: 'node22',
  platform: 'node',
  shims: false,
})