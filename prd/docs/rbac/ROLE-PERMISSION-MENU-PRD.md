# PRD — ROLE, PERMISSION & MENU MANAGEMENT UNUSU

Versi 1.1 | 2026-11-07 | Status: Draft konsolidasi

## 1. Tujuan

Menetapkan model akses untuk portal administrasi UNUSU agar menu yang terlihat, aksi yang diizinkan, dan cakupan data pengguna konsisten. Dokumen ini melengkapi bagian role di PRD utama. Menu Admin Fakultas dan Editor di sini adalah rancangan detail yang diusulkan; PRD utama hanya menyebut Admin Fakultas sebagai opsional dan memberi contoh Editor berdasarkan modul.

## 2. Prinsip wajib

1. **Role bukan menu**: role adalah kumpulan permission; menu adalah navigasi UI; scope menentukan data yang boleh disentuh.
2. Backend selalu menjadi enforcement point. Menyembunyikan menu bukan kontrol keamanan.
3. Least privilege: default deny; permission harus diberikan eksplisit.
4. Assignment role menyimpan scope: global, fakultas, atau prodi/tenant.
5. User dapat memiliki lebih dari satu assignment jika disetujui kebijakan universitas; permission efektif merupakan gabungan assignment yang valid, tetap dibatasi scope.
6. Editor bersifat fleksibel melalui permission group, bukan satu role tunggal dengan akses tetap.
7. Super Admin global; Admin Fakultas opsional; Admin Prodi tenant-scoped; Editor tenant-scoped dan module-scoped.

## 3. Role dan scope

| Role | Scope | Tanggung jawab |
|---|---|---|
| `SUPER_ADMIN` | Global | Seluruh organisasi, tenant, domain, akun, role/permission, widget/template global, monitoring, konfigurasi sistem |
| `ADMIN_FAKULTAS` | Fakultas yang ditugaskan | Mengelola prodi dalam fakultas sesuai izin; tidak otomatis global |
| `ADMIN_PRODI` | Satu/multiple prodi yang ditugaskan secara eksplisit | Mengelola website, builder, dan seluruh konten prodi dalam scope |
| `EDITOR` | Tenant prodi yang ditugaskan | Mengelola modul sesuai permission group dan/atau permission khusus |

Admin Fakultas dapat dinonaktifkan jika model pengelolaan fakultas tidak digunakan. Website Fakultas sebagai tenant publik tetap keputusan terpisah dari role Admin Fakultas.

## 4. Menu yang diusulkan

### 4.1 Super Admin

- Dashboard
- Manajemen Organisasi: Fakultas, Program Studi
- Website Management: Daftar Website, Domain, Website Settings, Website Monitoring
- User Management: Pengguna, Roles, Permissions, Permission Groups
- Website Builder: Widget Library, Widget Variants, Template Library
- System Management: Media Library, Audit Logs, Notifications, System Settings

### 4.2 Admin Fakultas (rancangan usulan)

- Dashboard Fakultas
- Organisasi: Daftar Program Studi dalam fakultas (read/manage sesuai permission)
- Website Prodi: Daftar website, status publikasi, ringkasan domain
- Monitoring: ringkasan konten dan aktivitas prodi yang berada dalam scope
- Pengguna: admin/editor fakultas hanya bila kebijakan mengizinkan
- Laporan/Audit: aktivitas dalam scope fakultas

Tidak boleh mengubah konfigurasi global, domain tenant di luar fakultas, master widget global, atau user fakultas lain.

### 4.3 Admin Prodi

- Dashboard
- Website: Identitas Website, Navigasi, Page Builder, Theme Settings, SEO
- Konten: Profil, Visi & Misi, Kurikulum, Dokumen, Dosen, Sarpras, Berita, Galeri, Kontak
- Pengelolaan: Media Library, Pengguna/Editor, Audit Aktivitas

### 4.4 Editor (menu dinamis)

- Dashboard ringkas (jika `dashboard.view` diberikan)
- Konten: hanya modul yang diizinkan, misalnya Berita, Dokumen, Kurikulum, Dosen, Profil, Galeri
- Media Library hanya jika permission media diberikan
- Tidak menampilkan menu Website Settings, Domain, User Management, Roles, Permissions, global Widget Library, atau System Settings kecuali ada permission eksplisit dan kebijakan mengizinkan.

## 5. Permission naming

Format `resource.action`, lowercase, konsisten. Contoh:

- `dashboard.view`
- `organization.view`, `organization.create`, `organization.update`, `organization.delete`
- `tenant.view`, `tenant.create`, `tenant.update`, `tenant.activate`
- `domain.view`, `domain.create`, `domain.update`, `domain.delete`, `domain.verify`
- `website.view`, `website.update`
- `navigation.view`, `navigation.create`, `navigation.update`, `navigation.delete`, `navigation.publish`
- `pages.view`, `pages.create`, `pages.update`, `pages.delete`, `pages.publish`
- `builder.view`, `builder.create`, `builder.update`, `builder.publish`, `builder.rollback`
- `theme.view`, `theme.update`
- `widgets.view`, `widgets.manage`
- `templates.view`, `templates.manage`
- `profile.view`, `profile.create`, `profile.update`, `profile.delete`
- `vision_mission.view`, `vision_mission.update`
- `curriculum.view`, `curriculum.create`, `curriculum.update`, `curriculum.delete`, `curriculum.publish`
- `documents.view`, `documents.create`, `documents.update`, `documents.delete`, `documents.publish`
- `lecturers.view`, `lecturers.create`, `lecturers.update`, `lecturers.delete`
- `facilities.view`, `facilities.create`, `facilities.update`, `facilities.delete`
- `posts.view`, `posts.create`, `posts.update`, `posts.delete`, `posts.publish`, `posts.schedule`
- `galleries.view`, `galleries.create`, `galleries.update`, `galleries.delete`, `galleries.publish`
- `contacts.view`, `contacts.update`, `contact_messages.view`, `contact_messages.manage`
- `media.view`, `media.upload`, `media.update`, `media.delete`
- `users.view`, `users.create`, `users.update`, `users.disable`, `users.assign_role`
- `roles.view`, `roles.manage`; `permissions.view`, `permissions.manage`
- `reports.view`, `audit_logs.view`, `notifications.view`, `system_settings.manage`

Permission harus ditambah hanya ketika ada aksi/use-case nyata. Hindari permission generik `*.all` untuk aplikasi.

## 6. Role-permission baseline

| Resource | Super Admin | Admin Fakultas | Admin Prodi | Editor |
|---|---|---|---|---|
| Dashboard | Global | Scope fakultas | Scope prodi | Jika diberikan |
| Organization | Full | View/manage terbatas | View prodi sendiri | No |
| Tenant/domain | Full | View scope; domain terbatas | Website settings terbatas; domain global tidak | No |
| Builder/theme | Master global | View status | Manage tenant | No by default |
| CMS | Global oversight/manage | View/report; optional delegated | Full tenant | Custom per module |
| Users | Global | Scoped optional | Manage editor tenant | No |
| Roles/permissions | Global | No by default | Assign approved editor groups only | No |
| Audit | Global | Scope fakultas | Scope tenant | No by default |
| System settings | Full | No | No | No |

Matriks ini adalah baseline kebijakan, bukan grant otomatis. Permission efektif harus dibangun dari assignment dan scope.

## 7. Editor permission groups

Preset yang disarankan:

- `EDITOR_BERITA`: `posts.view/create/update/delete` dan `media.view/upload`; publish hanya jika disetujui.
- `EDITOR_DOKUMEN`: `documents.view/create/update/delete` dan `media.view/upload`.
- `EDITOR_KURIKULUM`: `curriculum.view/create/update`; delete/publish terpisah.
- `EDITOR_DOSEN`: `lecturers.view/create/update`; delete terpisah.
- `EDITOR_GALERI`: `galleries.view/create/update/delete` dan `media.view/upload`.
- `EDITOR_PROFIL`: `profile.view/update`, `vision_mission.view/update`.

Admin Prodi dapat memilih satu atau beberapa group. Custom permission hanya diberikan bila diperlukan dan tercatat di audit log. Permission publish/delete dapat dipisahkan dari create/update.

## 8. Dynamic menu rules

- Setiap item menu memiliki `menu_key`, label, route, icon, parent, sort order, dan required permission.
- Render item jika user memiliki permission dan scope yang cocok.
- Sembunyikan parent bila seluruh child tidak terlihat.
- Direct URL tetap diperiksa oleh route guard dan API.
- Menu tidak boleh menjadi sumber otorisasi backend.

## 9. Data model proposal

Model konseptual: `Role`, `Permission`, `RolePermission`, `UserRole` (memuat scope type/id), `PermissionGroup`, `PermissionGroupItem`, `UserPermissionGroup`, optional `UserPermissionOverride`, `AdminMenu`, `MenuPermission`, `AuditLog`.

Sebelum membuat model, audit `schema.prisma` yang ada. Jangan membuat tabel duplikat jika role/user/permission sudah tersedia. Hindari custom override kecuali dibutuhkan oleh skenario yang tidak dapat dipenuhi role/group.

## 10. Backend enforcement

Urutan middleware/use-case:

1. `authenticate` — identitas user valid.
2. `loadAccessContext` — role, permission, scope assignment.
3. `authorizePermission('posts.update')` — cek permission.
4. `resolveTenantScope` — derive scope dari assignment atau domain resolver.
5. `assertRecordInScope` — verifikasi record dan seluruh relasinya.
6. `auditActivity` — catat aksi sensitif.

Jangan menerima role, permission, atau tenant scope dari payload browser sebagai fakta tepercaya.

## 11. Frontend behavior

Gunakan `PermissionGuard`/`ProtectedRoute` untuk pengalaman UI, hide menu tanpa akses, disabled state untuk aksi yang tidak boleh dilakukan, dan tangani 401/403. Frontend guard tidak menggantikan middleware backend.

## 12. Acceptance criteria

- Super Admin dapat mengelola semua tenant dan master global.
- Admin Fakultas tidak dapat mengakses fakultas lain.
- Admin Prodi tidak dapat membaca/mengubah tenant prodi lain meski ID diganti manual.
- Editor hanya melihat modul yang diizinkan dan tidak dapat melakukan aksi tanpa permission.
- Publish/delete dapat dibatasi terpisah.
- Menu mengikuti permission, tetapi endpoint tetap menolak akses tanpa izin.
- Assignment role dan perubahan permission tercatat di audit log.
- Automated tests mencakup akses valid, akses ditolak, dan percobaan cross-tenant.
