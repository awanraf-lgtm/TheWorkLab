import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base keeps the build host-agnostic: the same `dist/` works at a
  // domain root, in a subdirectory, or opened from disk.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    target: 'es2020',
    // Three.js is dynamically imported by the hero, so it lands in its own
    // chunk and never blocks first paint.
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 5173,
    open: true,
  },
  preview: {
    port: 4173,
  },
});
