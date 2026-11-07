# DESIGN RULES — UNUSU

Versi 1.1 | Draft

## Arah visual

- Modern, minimalis, profesional, akademik, dan mudah dibaca.
- Hindari tampilan generik hasil AI, gradient berlebihan, neon, dan glassmorphism berlebihan.
- Identitas setiap prodi dapat berbeda melalui konfigurasi tema, tetapi tetap menjaga keterbacaan dan aksesibilitas.

## Admin interface

- Dashboard memiliki layout khusus dashboard; jangan gunakan generic page layout.
- Halaman selain dashboard menggunakan page template konsisten.
- Sidebar dan action tampil berdasarkan permission.
- Gunakan hierarchy heading, spacing, typography, empty state, loading state, error state, dan confirmation untuk aksi destruktif.
- Form menggunakan validasi inline dan pesan error yang jelas.
- Tabel mendukung pagination, search/filter relevan, sort bila diperlukan, dan tampilan mobile yang layak.

## Public website & builder

- Responsive desktop, laptop, tablet, dan smartphone.
- Website tenant memiliki theme, logo, favicon, navigation, SEO, dan konten independen.
- Widget mempunyai variant yang terdefinisi; konfigurasi harus tervalidasi.
- Preview harus tersedia sebelum publish.
- Draft tidak boleh terlihat publik.
- Kontras warna, keyboard navigation, alt text, label form, dan semantic HTML diperhatikan.
- Jangan menyimpan markup/script arbitrer sebagai konfigurasi widget.

## Design tokens

Theme tenant dapat mengatur primary, secondary, accent, background, typography, font heading/body, border radius, shadow, button style, header/footer layout, dan container width. Tetapkan fallback default global jika token tenant kosong.

## Component quality

Reusable components, konsistensi shadcn/ui, state interaksi yang jelas, tidak mengandalkan warna saja untuk status, serta tidak mengorbankan performa demi dekorasi.
