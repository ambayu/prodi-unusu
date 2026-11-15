# Modul Direktori Dosen (`/admin/dosen`)

## Tujuan dan cakupan

Menampilkan direktori dosen **read-only** program studi. Data bersumber dari ONE
UNUSU API Hub, bukan dari tabel lokal. Modul ini **tidak** membuat, mengubah, atau
menghapus data dosen; koreksi data dilakukan di sistem induk (ONE UNUSU/SIAKAD).

## Rute

| Rute | Berkas | Izin |
|---|---|---|
| `/admin/dosen` | `src/client/pages/admin/AdminLecturers.tsx` | `lecturers.view` |

## Sumber data

| Endpoint | Fungsi |
|---|---|
| `GET /api/v1/admin/lecturers` | Daftar dosen terfilter prodi tenant aktif + `allLecturers` |
| `GET /api/v1/admin/lecturers/all` | Seluruh dosen aktif (dipakai pemilih pengampu di Kurikulum) |
| `GET /api/v1/public/lecturers` | Direktori publik; fallback ke tabel lokal bila API Hub gagal |

Server memanggil `services/lecturerIntegrationService.ts` → ONE UNUSU
`GET /api/v1/inter-service/dosen` (cache 60 detik).

## Template dan komponen

- **Template halaman:** `AdminLayout`.
- **Komponen bersama:** `EmptyState` / `LoadingState` / `ErrorState`, `field-input`
  untuk pencarian, badge status.
- Tabel: `table-base` dengan wrapper `overflow-x-auto` (wajib, lihat
  `docs/DESIGN-RULES.md` bagian 5).

## Aturan implementasi

- **Input manual dosen dihapus.** Endpoint `POST/PUT/DELETE /admin/lecturers` dan
  `createLecturerSchema` tidak lagi tersedia. Jangan menambahkan kembali formulir
  tambah/ubah dosen tanpa ADR baru.
- Kegagalan API Hub ditampilkan sebagai keadaan gagal, bukan data contoh.
- Filter prodi hanya penyaring tampilan; server tetap mengirim `allLecturers` agar
  penugasan pengampu lintas homebase tetap dimungkinkan.
- Tabel `lecturers` lokal **masih ada** dan hanya dipakai sebagai fallback direktori
  publik. Jangan menghapus tabel tanpa migrasi data yang terencana.

## Jangan diubah tanpa keputusan formal

- Sifat read-only modul ini dan penghapusan CRUD dosen lokal (ADR-003).

## Dokumentasi terkait

- `docs/decisions/ADR-003-master-semester-and-lecturer-api-hub.md`
- `docs/DATABASE.md` bagian 7
