import { defineConfig } from 'vite';

export default defineConfig({
  base: '/planko_dice/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'cannon': ['cannon-es']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
