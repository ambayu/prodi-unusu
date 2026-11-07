import { describe, expect, it } from 'vitest';
import {
  validateWidgetConfig,
  heroSliderConfigSchema,
  statisticsConfigSchema,
  aboutProdiConfigSchema,
  createPageSchema,
  createSectionWidgetSchema,
} from '../src/shared/schemas/builder';
import { hostnameSchema, safeUrlSchema, hexColorSchema } from '../src/shared/schemas/common';
import { loginSchema, ssoExchangeSchema } from '../src/shared/schemas/auth';

/**
 * Pengujian validasi konfigurasi.
 *
 * Konfigurasi widget adalah jalur paling berisiko karena tersimpan di database
 * lalu dirender ke halaman publik. Skema harus menolak bentuk yang tidak
 * dikenali dan tidak meloloskan HTML atau script bebas.
 */

describe('validasi konfigurasi widget', () => {
  it('menolak widget yang tidak terdaftar di registry', () => {
    const result = validateWidgetConfig('widget_khayalan', {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain('tidak terdaftar');
    }
  });

  it('menerima konfigurasi about_prodi yang sah dan mengisi nilai bawaan', () => {
    const result = validateWidgetConfig('about_prodi', {
      eyebrow: 'Tentang',
      title: 'Profil Prodi',
      body: 'Deskripsi singkat.',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.alignment).toBe('left');
      expect(result.data.imageUrl).toBe('');
    }
  });

  it('menolak nilai alignment di luar pilihan', () => {
    const result = validateWidgetConfig('about_prodi', { alignment: 'diagonal' });
    expect(result.ok).toBe(false);
  });

  it('menolak badge HTML pada field teks karena bukan markup yang diizinkan', () => {
    // Field hanya menerima string, sehingga tag HTML tersimpan sebagai teks
    // biasa dan tidak pernah dieksekusi. Panjang berlebih harus ditolak.
    const result = validateWidgetConfig('about_prodi', {
      title: 'x'.repeat(500),
    });
    expect(result.ok).toBe(false);
  });

  it('membatasi jumlah slide hero agar halaman tidak menjadi berat', () => {
    const slides = Array.from({ length: 20 }).map(() => ({
      imageUrl: '/uploads/media/a.jpg',
      alt: 'slide',
    }));

    const result = heroSliderConfigSchema.safeParse({ slides });
    expect(result.success).toBe(false);
  });

  it('menerima slide hero dengan URL relatif di dalam aplikasi', () => {
    const result = heroSliderConfigSchema.safeParse({
      slides: [{ imageUrl: '/heroslider-full.png', alt: 'Kampus' }],
      autoplayMs: 5000,
    });

    expect(result.success).toBe(true);
  });

  it('menolak URL gambar dengan skema berbahaya', () => {
    const result = heroSliderConfigSchema.safeParse({
      slides: [{ imageUrl: 'javascript:alert(1)', alt: 'x' }],
    });
    expect(result.success).toBe(false);
  });

  it('menolak angka statistik negatif', () => {
    const result = statisticsConfigSchema.safeParse({
      items: [{ label: 'Mahasiswa', value: -5, icon: 'users' }],
    });
    expect(result.success).toBe(false);
  });

  it('menerima statistik dengan empat kartu standar', () => {
    const result = statisticsConfigSchema.safeParse({
      layout: 'four-columns',
      items: [
        { label: 'Mahasiswa', value: 250, icon: 'users' },
        { label: 'Dosen', value: 15, icon: 'graduation-cap' },
        { label: 'Mata Kuliah', value: 66, icon: 'book-open' },
        { label: 'SKS', value: 148, icon: 'award' },
      ],
    });

    expect(result.success).toBe(true);
  });
});

describe('validasi data halaman dan widget', () => {
  it('menolak slug halaman dengan huruf besar atau spasi', () => {
    expect(createPageSchema.safeParse({ slug: 'Tentang Kami', title: 'Tentang' }).success).toBe(false);
    expect(createPageSchema.safeParse({ slug: 'tentang-kami', title: 'Tentang' }).success).toBe(true);
  });

  it('menolak kode widget kosong pada payload section', () => {
    expect(createSectionWidgetSchema.safeParse({ widgetCode: '' }).success).toBe(false);
  });
});

describe('validasi input umum', () => {
  it('menormalkan hostname menjadi huruf kecil', () => {
    const result = hostnameSchema.safeParse('SIN.UNUSU.AC.ID');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('sin.unusu.ac.id');
  });

  it('menolak hostname yang memuat skema atau path', () => {
    expect(hostnameSchema.safeParse('https://sin.unusu.ac.id').success).toBe(false);
    expect(hostnameSchema.safeParse('sin.unusu.ac.id/profil').success).toBe(false);
  });

  it('menolak URL yang bukan relatif dan bukan http(s)', () => {
    expect(safeUrlSchema.safeParse('/profil').success).toBe(true);
    expect(safeUrlSchema.safeParse('https://unusu.ac.id').success).toBe(true);
    expect(safeUrlSchema.safeParse('javascript:void(0)').success).toBe(false);
    expect(safeUrlSchema.safeParse('data:text/html,<script>').success).toBe(false);
  });

  it('hanya menerima warna heksadesimal enam digit', () => {
    expect(hexColorSchema.safeParse('#1e3a8a').success).toBe(true);
    expect(hexColorSchema.safeParse('rgb(30,58,138)').success).toBe(false);
    expect(hexColorSchema.safeParse('#fff').success).toBe(false);
  });

  it('menolak permintaan login tanpa kata sandi', () => {
    expect(loginSchema.safeParse({ username: 'admin' }).success).toBe(false);
    expect(loginSchema.safeParse({ username: 'admin', password: 'rahasia' }).success).toBe(true);
  });

  it('menolak payload tukar tiket SSO yang tidak lengkap', () => {
    expect(ssoExchangeSchema.safeParse({ client_id: 'prodi-unusu' }).success).toBe(false);
    expect(ssoExchangeSchema.safeParse({ client_id: 'prodi-unusu', token: 'abc' }).success).toBe(true);
  });
});
