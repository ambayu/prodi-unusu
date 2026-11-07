# DATABASE DESIGN — UNUSU

Versi 1.1 | Status: Draft konseptual — wajib dicocokkan dengan `schema.prisma` aktual.

## 1. Aturan utama

- MySQL + Prisma ORM.
- Gunakan primary key konsisten (pilih UUID/CUID atau integer setelah audit; jangan mencampur tanpa alasan).
- Setiap record tenant-owned harus memiliki relasi tenant/prodi eksplisit atau dapat diturunkan secara aman melalui relasi yang tervalidasi.
- Unique constraint harus mempertimbangkan scope tenant, misalnya slug unik per tenant bila memang dibutuhkan.
- Foreign key dan index untuk kolom relasi, status, slug, hostname, dan query list/filter.
- Gunakan soft delete hanya untuk entitas yang membutuhkan pemulihan/audit; definisikan perilaku unique index saat soft-deleted.
- Semua perubahan melalui Prisma migration; jangan mengedit database production manual sebagai alur normal.

## 2. Domain model konseptual

### Organisasi & tenancy

- `Faculty`: fakultas; dapat bersifat master organisasi walau website fakultas belum diaktifkan.
- `StudyProgram`: program studi dan relasi fakultas.
- `Website/Tenant`: konfigurasi website yang dimiliki satu prodi; relasi 1:1 atau 1:N perlu diputuskan jika satu prodi boleh punya beberapa website.
- `Domain`: hostname, tenant, primary flag, status, verification/SSL metadata bila diperlukan. Hostname harus unik secara global.

### Identity & authorization

- `User`: akun login.
- `Role`, `Permission`, `RolePermission`: definisi role dan permission.
- `UserRole`: assignment role ke user dengan scope global/fakultas/prodi.
- `UserPermission` atau permission override: hanya jika diperlukan; default gunakan role/group agar tidak kompleks.
- `PermissionGroup` dan `PermissionGroupItem`: preset hak Editor.
- `AuditLog`: actor, action, target, scope, metadata aman, timestamp.

### Website & builder

- `WebsiteSetting`, `ThemeSetting`, `Navigation`/`NavigationItem`.
- `Page`: tenant, slug, status, SEO fields.
- `PageVersion`: draft/published snapshot, version number, author, timestamp.
- `PageSection` dan `WidgetInstance`: urutan, widget type, variant, config JSON tervalidasi.
- `WidgetDefinition`/`WidgetVariant`: master registry yang dikelola Super Admin.
- `MediaAsset`: metadata media, tenant/global ownership, storage key, MIME, size, alt text.

### CMS

- `ProfileContent`, `VisionMission` (atau content block terstruktur).
- `Curriculum`, `Semester`, `Course`, `RpsDocument`.
- `Document`, `DocumentCategory`.
- `Lecturer`.
- `Facility`.
- `Post`, `PostCategory`, `PostTag` (opsional), `PostRevision` (opsional).
- `GalleryAlbum`, `GalleryItem`.
- `ContactSetting`, `ContactMessage` (jika form pesan diaktifkan).

### System

- `Notification`, `SystemSetting`, `Job/Integration` (hanya jika kebutuhan asynchronous muncul).

Nama di atas adalah nama konseptual, bukan perintah membuat semua tabel. Gabungkan entitas jika model konten yang dipilih memang lebih tepat, tetapi jangan mengorbankan constraint tenant dan integritas relasi.

## 3. Relasi utama

- Faculty 1—N StudyProgram.
- StudyProgram 1—N Website/Tenant (perlu keputusan apakah satu prodi hanya satu tenant).
- Website/Tenant 1—N Domain.
- Tenant 1—N Page, CMS content, media, users/assignments, theme, navigation.
- Page 1—N PageVersion; PageVersion 1—N Section; Section 1—N WidgetInstance.
- Curriculum 1—N Semester; Semester 1—N Course; Course 0—N RPS asset.
- User N—N Role melalui UserRole; Role N—N Permission melalui RolePermission.

## 4. Tenant isolation rules

1. Semua query tenant-scoped memperoleh `tenantId` dari trusted server context.
2. Jangan menerima `tenantId` request sebagai sumber otorisasi.
3. Untuk nested resource, verifikasi parent dan child berada dalam tenant yang sama.
4. Terapkan scope yang sama pada read, create, update, delete, export, search, file access, dan background jobs.
5. Public endpoint hanya mengambil data published untuk tenant dari hostname terverifikasi.
6. Media privat memerlukan authorization; URL storage tidak boleh membuka file privat tanpa kontrol.
7. Tambahkan integration tests yang mencoba akses silang tenant dengan ID valid dari tenant lain.

## 5. Data integrity & indexes

- `Domain.hostname`: unique global, normalized lowercase, punycode handling jika diperlukan.
- `Page(tenantId, slug)`: unique scoped.
- `NavigationItem(tenantId, parentId, sortOrder)` dan page relation indexes.
- Foreign keys pada seluruh tenant-owned relations.
- Index untuk `tenantId`, `status`, `publishedAt`, `createdAt`, dan kolom pencarian/filter yang benar-benar dipakai.
- Hindari JSON untuk data yang perlu relasi, filter kompleks, atau constraint kuat; JSON sesuai untuk konfigurasi widget/theme yang tervalidasi.

## 6. Migration checklist

- Audit schema dan data existing sebelum menambah model.
- Buat migration kecil, backward-compatible jika memungkinkan.
- Tentukan strategi backfill tenantId untuk data lama.
- Validasi orphan records dan duplicate hostname/slug sebelum unique constraint.
- Backup sebelum migration production.
- Uji migration pada salinan database dan siapkan rollback/recovery plan.
- Jangan reset database production.
