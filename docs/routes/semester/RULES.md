# Modul Master Semester (`/admin/semester`)

## Tujuan dan cakupan

Mengelola **master semester global** universitas: kode semester, nama semester, dan
rentang tanggal (mulai selesai). Satu daftar berlaku untuk seluruh program studi;
prodi hanya memilih, tidak membuat semester sendiri. Modul ini tidak mengatur
semester internal kurikulum (lihat `docs/routes/kurikulum/RULES.md`).

## Rute dan menu

| Rute | Berkas | Izin |
|---|---|---|
| `/admin/semester` | `src/client/pages/admin/AdminAcademicSemesters.tsx` | `organization.view` (baca), `organization.manage` (tulis) |

Menu sidebar: `super.semester` pada section `UNIVERSITAS`, scope `global` (hanya
tampil pada sidebar portal). Didefinisikan di `CATALOG_PORTAL`
(`src/client/services/adminApi.ts`) dan `ADMIN_MENUS`
(`src/shared/constants/organization.ts`).

## Template dan komponen

- **Template halaman:** `AdminLayout`.
- **Komponen bersama:** `FormModal` + `Field`, `ConfirmDialog`, `useToast`,
  `EmptyState` / `LoadingState` / `ErrorState`.
- **Kepatuhan template:** sama dengan modul Kurikulum. Modul ini adalah **modul
  pertama** yang direncanakan dimigrasikan ke `FormPageTemplate`
  (`docs/design-system/PAGE_TEMPLATES.md`). Selama migrasi belum dikerjakan,
  halaman ini tetap memakai `FormModal`.

## Aturan implementasi

- `code` wajib unik (contoh `20261`). Duplikasi ditolak server dengan 409.
- `startDate` dan `endDate` disimpan sebagai `DATE`; validasi tanggal memakai Zod.
- Tabel tidak memiliki `study_program_id`: data ini sengaja tidak ter-scope tenant.
  Karena itu **jangan** menambahkan filter `scopedTenantId` pada endpoint ini.
- Aksi tulis dicatat lewat `recordAudit` dengan modul `ORGANIZATION`.

## Jangan diubah tanpa keputusan formal

- Status global (tanpa tenant) dari entitas `academic_semesters`.
- Penghapusan semester global memakai `ON DELETE SET NULL` pada tautan kurikulum.

## Dokumentasi terkait

- `docs/decisions/ADR-003-master-semester-and-lecturer-api-hub.md`
- `docs/DATABASE.md` bagian 7
