# Token Warna

Sumber tunggal: `tailwind.config.js` (theme.extend.colors) dan
`src/client/index.css` (kelas komponen). Nilai di bawah disalin dari berkas
tersebut, bukan usulan.

## Token brand

| Token Tailwind | HEX | Pemakaian |
|---|---|---|
| `brand` / `brand.DEFAULT` | `#1e3a8a` | Tombol utama (`btn-primary`), tautan aktif, cincin fokus |
| `brand.dark` | `#172f6e` | Hover tombol utama |
| `brand.light` | `#e8eefb` | Latar lembut, badge informasi |

## Token accent

| Token Tailwind | HEX | Pemakaian |
|---|---|---|
| `accent` / `accent.DEFAULT` | `#fbbf24` | Aksen, garis eyebrow, penanda |
| `accent.dark` | `#f59e0b` | Aksen sekunder |
| `accent.light` | `#fef3c7` | Latar aksen lembut |

## Netral dan garis

| Nilai | Pemakaian |
|---|---|
| `slate-800` / `slate-900` | Teks utama (body `text-slate-800`) |
| `slate-500` | Teks sekunder, keterangan |
| `slate-400` | Placeholder, ikon redup |
| `#CBD5E1` | **Garis baku** border kartu, input, tabel, panel |
| `slate-100` | Garis baris tabel, latar skeleton |
| `#F0F4FA` | Latar sidebar admin |
| `#DBEAFE` | Latar item sidebar aktif |

## Warna status

| Status | Kelas | Catatan |
|---|---|---|
| Sukses / Aktif | `emerald-50` teks `emerald-700`, border `emerald-200` | |
| Gagal / Hapus | `rose-50` teks `rose-900`, border `rose-200` | `ErrorState` memakai ini |
| Informasi | `blue-50` teks `blue-900`, border `blue-200` | |

## Aturan

1. **Warna status tidak boleh menjadi satu-satunya pembeda.** Setiap status wajib
   disertai teks ("Aktif", "Non-aktif", "Terbit"). Lihat `docs/DESIGN-RULES.md` §2.
2. Nilai `#CBD5E1` dipakai literal (bukan token Tailwind) di banyak komponen; jangan
   menggantinya per halaman. Perubahan harus lewat satu sprint konsistensi.
3. Warna tema prodi berasal dari tabel `themes` (per tenant), bukan dari token ini.
   Lihat `docs/DESIGN-RULES.md` §6.
