# Tipografi

Sumber: `tailwind.config.js` (`fontFamily`) dan `src/client/index.css` (`body`,
`field-label`).

## Keluarga font

| Token | Nilai |
|---|---|
| `font-sans` (bawaan body) | `"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, sans-serif` |
| `font-display` | `"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif` |
| `font-mono` | Bawaan Tailwind (dipakai untuk kode MK, NIDN, kode semester) |

Satu keluarga font saja. Tidak ada font kedua.

## Skala yang dipakai aktual

| Peran | Kelas | Lokasi contoh |
|---|---|---|
| Judul panel admin | `text-xl sm:text-2xl font-bold tracking-tight` | `AdminPanelTemplate` |
| Deskripsi panel admin | `text-[13px] sm:text-sm font-medium text-slate-600` | `AdminPanelTemplate` |
| Judul modal | `text-base font-bold` | `FormModal` |
| Label menu sidebar | `text-[14px] font-bold text-slate-900` | `AdminLayout` |
| Deskripsi menu sidebar | `text-[12px] text-slate-600` | `AdminLayout` |
| Judul grup menu sidebar | `text-[11px] font-bold uppercase tracking-widest text-slate-600` | `AdminLayout` |
| Breadcrumb topbar | `text-[13px] font-semibold text-slate-700` | `AdminLayout` |
| Isi tabel | `text-xs` | `.table-base` |
| Header tabel | `text-[10px] font-bold uppercase tracking-wider text-slate-500` | `.table-base thead th` |
| Label formulir | `text-xs font-bold text-slate-700` | `.field-label` |
| Pesan bantuan | `text-[11px] leading-relaxed text-slate-500` | `Field` hint |
| Judul halaman publik | `text-2xl font-extrabold tracking-tight sm:text-4xl` | `PageHeader` |
| Eyebrow publik | `text-xs font-bold uppercase tracking-wider` | `PageHeader` |

## Ambang keterbacaan sidebar

Sidebar memakai latar `#F0F4FA` dan item aktif `#DBEAFE`. Pada latar-latar itu
`slate-500` hanya menghasilkan 4.31:1 dan `slate-400` 2.32:1, keduanya **gagal**
WCAG AA (ambang 4.5:1). Karena itu teks sekunder sidebar wajib memakai
`slate-600` (6.87:1) atau `slate-700` (9.38:1), dan item aktif memakai `brand`
`#1e3a8a` (8.49:1).

Ukuran minimum teks sidebar adalah **11px** untuk judul grup dan **12px** untuk
deskripsi menu. Jangan menurunkan ke 10px: pada ukuran itu teks kecil sulit
dibaca dan tidak lagi dapat diandalkan memenuhi ambang kontras.

## Aturan

1. Skala di atas adalah **skala efektif proyek**. Jangan memperkenalkan `text-lg`
   atau `text-3xl` acak pada halaman admin.
2. Judul memakai bobot 700 sampai 800 dengan `tracking-tight`; isi memakai 400
   dengan `leading-relaxed`.
3. `docs/DESIGN-RULES.md` §3 menyebut label formulir "11px uppercase". Implementasi
   aktual `.field-label` adalah `text-xs` (12px) **tanpa** uppercase. Yang berlaku
   adalah implementasi (`index.css`). Perbedaan ini dicatat sebagai ketidaksesuaian
   dokumentasi, belum diubah karena bersifat lintas halaman.
4. Emoji dilarang pada antarmuka dan kode.
