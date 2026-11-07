import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Memecah vendor agar halaman publik tidak mengunduh seluruh kode admin
    // sekaligus. Tanpa ini satu bundel melewati 1 MB dan memperlambat muat awal
    // (docs/PRD.md bagian 14 Performance).
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query', 'axios'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
  server: {
    // Port tetap 5180 (deret Vite 517x milik ONE UNUSU: 5173 portal, 5174 LMS,
    // 5175 E-Surat, 5176 Akreditasi, 5177 LPM, 5178 LPPM, 5179 Sarpras).
    // `strictPort` menghentikan fallback otomatis agar alamat lokal selalu
    // dapat diprediksi saat menguji pemetaan domain di file hosts.
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5010',
        changeOrigin: false,
        // Header Host diteruskan apa adanya supaya backend dapat menentukan
        // tenant dari domain yang diketik di browser saat pengujian lokal.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const host = req.headers.host;
            if (host) proxyReq.setHeader('Host', host);
          });
        },
      },
      '/uploads': {
        target: 'http://localhost:5010',
        changeOrigin: false,
      },
    },
  },
});
