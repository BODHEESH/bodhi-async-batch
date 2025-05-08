import { defineConfig } from 'tsup';

export default defineConfig({
  noExternal: ['*'],
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: true,
  target: 'es2018',
});
