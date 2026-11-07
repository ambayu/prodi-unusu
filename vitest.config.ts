import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Pengujian isolasi tenant memakai database sungguhan, bukan mock, karena
    // yang diuji justru perilaku query terhadap data tenant.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
