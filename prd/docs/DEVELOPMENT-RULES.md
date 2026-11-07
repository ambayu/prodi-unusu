# DEVELOPMENT RULES — UNUSU

## Sebelum coding

1. Baca `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/DESIGN-RULES.md`, `docs/rbac/ROLE-PERMISSION-MENU-PRD.md`, dan `docs/CHANGELOG.md`.
2. Periksa struktur repository, package versions, `schema.prisma`, migration, route, service, test, dan fitur existing.
3. Jangan mengasumsikan struktur file atau tabel sebelum memeriksanya.

## Implementasi

- Pertahankan Modular Monolith; jangan membuat aplikasi terpisah per tenant atau microservices tanpa keputusan baru.
- Gunakan TypeScript strict bila project sudah mendukung.
- Pisahkan route/controller, business service/use-case, data access, validation, dan UI feature.
- Validasi input di backend dengan Zod atau standar yang sudah dipakai project.
- Gunakan Prisma migration; jangan reset database production.
- Semua operasi tenant-scoped harus memakai trusted tenant context dan pengecekan relasi.
- Backend memeriksa permission; frontend guard hanya untuk UX.
- Jangan mengandalkan data hardcoded untuk menggantikan database production.
- Jangan mengubah konfigurasi tenant lain saat mengerjakan tenant tertentu.
- Jangan menghapus fitur berjalan tanpa persetujuan.
- Upload harus divalidasi dan akses file privat harus diotorisasi.
- Widget config tidak boleh mengeksekusi script bebas.

## Testing

- Tambahkan unit/integration tests untuk setiap fitur.
- Wajib ada test tenant isolation dan authorization untuk endpoint sensitif.
- Test draft/publish, media access, domain resolver, dan builder config.
- Jalankan lint, typecheck, test, dan build sebelum menyatakan selesai.

## Selesai fitur

- Update `docs/CHANGELOG.md`.
- Update dokumentasi/API bila kontrak berubah.
- Sertakan migration dan langkah deploy jika schema berubah.
- Laporkan file yang berubah, test yang dijalankan, hasil, risiko, dan pekerjaan tersisa.
