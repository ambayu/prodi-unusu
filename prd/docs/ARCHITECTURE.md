# ARCHITECTURE — UNUSU Multi-Website Management System

Versi 1.1 | 2026-11-07 | Status: Draft teknis

## 1. Prinsip arsitektur

- **Modular Monolith**: satu repository, satu aplikasi Node.js, satu database MySQL, modul dipisahkan secara logis.
- **One application, multiple websites**: seluruh domain publik dilayani aplikasi yang sama.
- **Shared database, tenant-scoped records**: data tenant dipisahkan secara logis melalui foreign key/scope dan pemeriksaan backend.
- **Central administration**: administrasi berada pada `prodi.unusu.ac.id`; domain publik memuat website tenant masing-masing.
- **No frontend-trusted tenant**: tenant publik ditentukan dari hostname terverifikasi; tenant admin ditentukan dari assignment/scope user di backend.

## 2. Technology baseline

| Lapisan | Teknologi | Tanggung jawab |
|---|---|---|
| Admin & public UI | React, TypeScript, Vite | Dashboard, CMS, builder, renderer publik |
| UI system | Tailwind CSS, shadcn/ui | Komponen dan token desain |
| Routing/state | React Router, TanStack Query, Zustand | Navigasi, server state, state UI |
| API | Node.js, Express, TypeScript | HTTP API, middleware, business logic |
| Validation | Zod | Validasi request dan konfigurasi widget |
| ORM | Prisma | Akses database dan migration |
| Database | MySQL | Data aplikasi dan tenant |
| Upload | Multer + storage adapter | Penerimaan file; storage final perlu dipilih |
| Process/proxy | PM2, Nginx | Proses aplikasi, TLS, reverse proxy, host routing |

Catatan: pilihan Session atau JWT belum dikunci. Pilih satu pola utama setelah memutuskan kebutuhan cookie, CSRF, refresh, dan lintas subdomain.

## 3. Logical modules

1. Identity & Authentication
2. Authorization / RBAC
3. Organization (Fakultas, Program Studi)
4. Tenant & Domain Registry
5. Website Settings & Theme
6. Navigation & Page Management
7. Website Builder (widget registry, variants, sections, drafts, publish, versions)
8. CMS (profil, visi-misi, kurikulum, dokumen, dosen, sarpras, berita, galeri, kontak)
9. Media Library
10. SEO & Public Renderer
11. Audit & Notifications
12. System Settings & Monitoring

Setiap modul memiliki router/controller, service/use-case, repository/data access, schema validation, dan test. Hindari business logic di route handler atau komponen React.

## 4. Request flow: public domain

1. Nginx menerima request HTTPS untuk hostname yang dikonfigurasi.
2. Proxy meneruskan request ke aplikasi dan meneruskan `Host` dengan konfigurasi yang aman.
3. Express memvalidasi hostname yang diterima; jangan mempercayai header dari client yang dapat dipalsukan.
4. Domain resolver mencari domain aktif dan tenant terkait di database.
5. Resolver menolak domain tidak dikenal/nonaktif; jangan fallback ke tenant default.
6. Public renderer mengambil published settings, theme, navigation, pages, dan konten hanya untuk tenant tersebut.
7. Cache harus memiliki key yang mencakup tenant/domain dan versi publikasi.

## 5. Request flow: admin

1. Autentikasi user.
2. Muat role/permission assignment dan scope organisasi/tenant dari database.
3. Periksa permission untuk aksi yang diminta.
4. Resolve tenant scope dari assignment backend, bukan `tenantId` bebas dari browser.
5. Validasi bahwa record target berada dalam scope yang diizinkan.
6. Jalankan use-case dan tulis audit log untuk aksi sensitif.

Super Admin dapat memiliki global scope. Admin Fakultas dibatasi pada fakultas dan prodi yang diizinkan. Admin Prodi dan Editor dibatasi pada tenant prodi yang ditugaskan.

## 6. Website builder & publishing

- Simpan struktur halaman sebagai data terstruktur (page → sections → widget instances), bukan HTML/JS bebas.
- Widget instance menyimpan `type`, `variant`, `config`, `order`, dan visibility/responsive settings yang tervalidasi.
- Widget registry menentukan schema konfigurasi, renderer, default, dan variant yang tersedia.
- Draft dan published version harus terpisah atau mempunyai version state yang eksplisit.
- Publish membuat snapshot/version yang dapat di-rollback.
- Sanitasi rich text dan validasi URL/media. Jangan mengeksekusi script dari konfigurasi tenant.
- Preview menggunakan draft; public domain hanya membaca versi published.

## 7. File & media

Gunakan storage adapter agar lokasi penyimpanan dapat diganti tanpa mengubah modul CMS. Simpan metadata file di database (tenant, path/key, mime type, ukuran, alt text, uploader). Batasi ukuran, ekstensi, MIME berdasarkan pemeriksaan konten, nama file acak, dan otorisasi download. Tentukan apakah storage lokal, object storage, atau layanan lain sebelum production.

## 8. Deployment baseline

- Ubuntu VPS, Nginx sebagai reverse proxy/TLS terminator, Node app dikelola PM2.
- Seluruh domain yang disetujui diarahkan ke aplikasi yang sama.
- MySQL tidak diekspos ke publik; akses dibatasi jaringan lokal/host aplikasi.
- Rahasia disimpan di environment/secret store, bukan repository.
- Backup database dan file storage; uji restore berkala.
- Health check, structured logs, error monitoring, log rotation, dan alert disk/CPU/memory.
- Deployment migration menggunakan backup, migration terencana, dan prosedur rollback.

## 9. Struktur repository yang disarankan

```text
src/
  client/                 # React application
    app/ components/ features/ layouts/ routes/ lib/
  server/                 # Express application
    app.ts server.ts middleware/ modules/ shared/
  shared/                 # Types/schema yang aman dipakai bersama
prisma/
  schema.prisma migrations/ seed.ts
public/
docs/
tests/
```

Sesuaikan struktur dengan repository yang sudah ada; jangan memindahkan atau mengganti struktur existing tanpa audit dan persetujuan.

## 10. Quality attributes

Tenant isolation, least privilege, availability, performance, accessibility, responsive UI, SEO per domain, observability, maintainability, testability, dan recoverability merupakan persyaratan lintas modul.
