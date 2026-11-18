import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.DEV_PORT || 5180);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DEV_PORT must be an integer between 1 and 65535');
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    emptyOutDir: false,
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
    // `strictPort` menghentikan fallback otomatis agar alamat lokal selalu
    // dapat diprediksi saat menguji pemetaan domain di file hosts.
    port,
    strictPort: true,
    // Dengarkan di semua antarmuka (IPv4 dan IPv6). Tanpa ini Vite hanya
    // mengikat ::1 pada sebagian mesin Windows, sehingga http://localhost:5180
    // gagal dibuka karena peramban mencoba 127.0.0.1 lebih dulu.
    host: true,
    // Izinkan hostname domain prodi yang dipetakan lewat file hosts, agar
    // pengujian multi-domain lokal tidak diblokir pemeriksaan host Vite.
    allowedHosts: ['.unusu.ac.id', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: env.DEV_API_TARGET || 'http://localhost:5010',
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
        target: env.DEV_API_TARGET || 'http://localhost:5010',
        changeOrigin: false,
      },
    },
  },
  };
});
