import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  DocumentTextIcon,
  EyeIcon,
  FolderIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { DokumenPreviewModal } from '../../components/DokumenPreviewModal';
import { arsipDokumenApi, dokumenProdiApi, type ArsipDokumenPublik, type DokumenAsal } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/** Dokumen dari dua sumber disajikan seragam; `asal` hanya menentukan jalur pengambilan berkas. */
type DokumenPublik = ArsipDokumenPublik & { asal: DokumenAsal };

/** Kunci kategori untuk dokumen yang belum diklasifikasikan. */
const TANPA_KATEGORI = '__tanpa_kategori__';

const LABEL_TANPA_KATEGORI = 'Tanpa kategori';

/**
 * Halaman publik bank dokumen (arsip surat) program studi.
 *
 * Alur yang dipakai:
 *   1. Daftar dokumen TERBUKA — siapa pun boleh melihat judul, kategori,
 *      tahun, dan nomor tanpa kata sandi.
 *   2. Saat pengunjung menekan "Lihat Dokumen", kata sandi prodi diminta.
 *   3. Setelah kata sandi benar, berkas dipratinjau lebih dulu, baru dapat
 *      diunduh lewat tombol Download.
 *
 * Kata sandi tidak pernah menjadi syarat untuk melihat daftar: arsip mutu
 * perlu mudah ditemukan. Perlindungan diletakkan pada isi berkasnya, bukan
 * pada keberadaan dokumen.
 */
export const DocumentsPage: React.FC = () => {
  const { tenant } = useTenant();
  useSeo({
    tenant,
    title: 'Dokumen',
    description: 'Arsip surat dan dokumen program studi.',
  });

  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState<string>('all');

  /*
   * Kata sandi hanya hidup di memori halaman: tidak ditulis ke localStorage
   * maupun sessionStorage, dan hilang begitu halaman ditutup. Server tidak
   * menerbitkan tiket sesi, sehingga kata sandi dapat dipakai kapan saja.
   */
  const [password, setPassword] = useState('');

  /** Dokumen yang sedang diminta untuk dibuka (memicu dialog kata sandi). */
  const [dokumenDiminta, setDokumenDiminta] = useState<DokumenPublik | null>(null);
  const [passwordInput, setPasswordInput] = useState('');

  /** Dokumen yang pratinjaunya sedang terbuka. */
  const [previewTarget, setPreviewTarget] = useState<DokumenPublik | null>(null);

  const pusatQuery = useQuery({
    queryKey: ['public', 'arsip-dokumen'],
    queryFn: () => arsipDokumenApi.publicInfo().then((res) => res.data),
    retry: 1,
  });
  const prodiQuery = useQuery({
    queryKey: ['public', 'dokumen-prodi'],
    queryFn: () => dokumenProdiApi.publicList().then((res) => res.data.items),
    retry: 1,
  });

  // Bila salah satu sumber gagal, sumber lain tetap tampil.
  const listQuery = { isLoading: pusatQuery.isLoading || prodiQuery.isLoading, isError: pusatQuery.isError && prodiQuery.isError, error: pusatQuery.error, refetch: () => Promise.all([pusatQuery.refetch(), prodiQuery.refetch()]) };
  const items = useMemo<DokumenPublik[]>(
    () => [
      ...(prodiQuery.data ?? []).map((d) => ({ ...d, asal: 'prodi' as const })),
      ...(pusatQuery.data?.items ?? []).map((d) => ({ ...d, asal: 'arsip' as const })),
    ],
    [prodiQuery.data, pusatQuery.data],
  );
  const meta = pusatQuery.data?.meta;

  const unlockMutation = useMutation({
    mutationFn: (sandi: string) => arsipDokumenApi.unlock(sandi).then((res) => res.data),
    onSuccess: (_data, sandi) => {
      setPassword(sandi);
      setPasswordInput('');
      // Dokumen yang tadi diminta langsung dibuka setelah kata sandi benar.
      if (dokumenDiminta) {
        setPreviewTarget(dokumenDiminta);
        setDokumenDiminta(null);
      }
    },
  });

  const galatUnlock = unlockMutation.isError ? toApiError(unlockMutation.error).message : null;

  /** Daftar kategori beserta jumlah dokumennya, untuk panel kiri. */
  const daftarKategori = useMemo(() => {
    const hitung = new Map<string, { label: string; jumlah: number }>();
    for (const item of items) {
      const kunci = item.kategori?.trim() ? item.kategori.trim() : TANPA_KATEGORI;
      const label = kunci === TANPA_KATEGORI ? LABEL_TANPA_KATEGORI : kunci;
      const sekarang = hitung.get(kunci) ?? { label, jumlah: 0 };
      sekarang.jumlah += 1;
      hitung.set(kunci, sekarang);
    }
    // Urut abjad; "Tanpa kategori" selalu di akhir agar tidak mendominasi.
    return Array.from(hitung.entries())
      .map(([kunci, nilai]) => ({ kunci, ...nilai }))
      .sort((a, b) => {
        if (a.kunci === TANPA_KATEGORI) return 1;
        if (b.kunci === TANPA_KATEGORI) return -1;
        return a.label.localeCompare(b.label, 'id-ID');
      });
  }, [items]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return items.filter((item) => {
      const kunciKategori = item.kategori?.trim() ? item.kategori.trim() : TANPA_KATEGORI;
      const cocokKategori = kategori === 'all' || kunciKategori === kategori;
      const cocokKata =
        keyword === '' ||
        item.judul.toLowerCase().includes(keyword) ||
        (item.nomor ?? '').toLowerCase().includes(keyword) ||
        (item.kategori ?? '').toLowerCase().includes(keyword);
      return cocokKategori && cocokKata;
    });
  }, [items, search, kategori]);

  /**
   * Menekan "Lihat Dokumen".
   *
   * Bila kata sandi sudah dipegang untuk halaman ini, pratinjau langsung
   * dibuka. Bila belum, dialog kata sandi yang muncul lebih dulu.
   */
  const mintaBukaDokumen = (dokumen: DokumenPublik) => {
    if (password) {
      setPreviewTarget(dokumen);
      return;
    }
    setDokumenDiminta(dokumen);
    setPasswordInput('');
    unlockMutation.reset();
  };

  const tutupDialog = () => {
    setDokumenDiminta(null);
    setPasswordInput('');
    unlockMutation.reset();
  };

  return (
    <>
      <PageHeader
        eyebrow="Bank Dokumen"
        title="Dokumen Program Studi"
        description="Arsip surat dan dokumen program studi. Untuk membuka isi berkas, masukkan kata sandi arsip program studi."
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {listQuery.isLoading ? (
          <LoadingState label="Memuat arsip dokumen" rows={4} />
        ) : listQuery.isError ? (
          <ErrorState
            message={toApiError(listQuery.error).message}
            onRetry={() => void listQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Belum ada dokumen"
            description="Dokumen yang dipublikasikan program studi ini akan muncul di sini."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            {/* -------------------------------------------------------
                Panel kiri: kategori
                ------------------------------------------------------- */}
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <FolderIcon className="h-4 w-4" />
                  Kategori Dokumen
                </h2>

                <ul className="space-y-1">
                  <li>
                    <button
                      type="button"
                      onClick={() => setKategori('all')}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
                        kategori === 'all'
                          ? 'bg-[#e8eefb] text-[#1e3a8a]'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>Semua Dokumen</span>
                      <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        {items.length}
                      </span>
                    </button>
                  </li>

                  {daftarKategori.map((kat) => (
                    <li key={kat.kunci}>
                      <button
                        type="button"
                        onClick={() => setKategori(kat.kunci)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
                          kategori === kat.kunci
                            ? 'bg-[#e8eefb] text-[#1e3a8a]'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="min-w-0 truncate" title={kat.label}>
                          {kat.label}
                        </span>
                        <span className="shrink-0 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                          {kat.jumlah}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {meta?.passwordActive === false ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                  <p className="font-bold">Kata sandi arsip belum dipasang.</p>
                  <p className="mt-1">
                    Pengelola program studi belum memasang kata sandi, sehingga berkas dokumen belum dapat
                    dibuka siapa pun.
                  </p>
                </div>
              ) : null}
            </aside>

            {/* -------------------------------------------------------
                Panel kanan: pencarian dan daftar dokumen
                ------------------------------------------------------- */}
            <div className="min-w-0">
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari judul, nomor, atau kategori dokumen"
                  aria-label="Cari dokumen"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <ul className="mt-4 space-y-3">
                {filtered.length === 0 ? (
                  <li>
                    <EmptyState
                      title="Tidak ada dokumen"
                      description={
                        kategori === 'all'
                          ? 'Belum ada dokumen arsip yang cocok dengan pencarian Anda.'
                          : 'Tidak ada dokumen pada kategori ini. Pilih kategori lain atau tampilkan semua dokumen.'
                      }
                    />
                  </li>
                ) : (
                  filtered.map((dokumen) => (
                    <li
                      key={`${dokumen.asal}-${dokumen.sumber ?? ''}-${dokumen.id}`}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8eefb] text-[#1e3a8a]">
                          <DocumentTextIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">{dokumen.judul}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {[
                              dokumen.kategori ?? LABEL_TANPA_KATEGORI,
                              dokumen.tahun,
                              dokumen.nomor,
                            ]
                              .filter(Boolean)
                              .join(' • ')}
                          </p>
                        </div>
                      </div>

                      {dokumen.fileTersedia ? (
                        <button
                          type="button"
                          onClick={() => mintaBukaDokumen(dokumen)}
                          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#1e3a8a] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#172f6e]"
                        >
                          <EyeIcon className="h-4 w-4" />
                          Lihat Dokumen
                        </button>
                      ) : (
                        <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                          Berkas belum tersedia
                        </span>
                      )}
                    </li>
                  ))
                )}
              </ul>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500">
                  Menampilkan {filtered.length} dari {items.length} dokumen.
                </p>
                {password ? (
                  <button
                    type="button"
                    onClick={() => setPassword('')}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 transition-colors hover:text-slate-800"
                  >
                    <LockClosedIcon className="h-3.5 w-3.5" />
                    Lupakan kata sandi
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* -----------------------------------------------------------------
          Dialog kata sandi: muncul saat menekan "Lihat Dokumen".
          Memakai FormModal bersama agar fokus awal, tombol Escape, dan
          pasangan tombol Batal/Simpan konsisten dengan formulir lain.
          ----------------------------------------------------------------- */}
      <FormModal
        open={Boolean(dokumenDiminta)}
        title="Dokumen dilindungi kata sandi"
        description="Masukkan kata sandi arsip program studi untuk melihat dan mengunduh dokumen."
        submitLabel="Buka Dokumen"
        busy={unlockMutation.isPending}
        onSubmit={(event) => {
          event.preventDefault();
          if (!passwordInput) return;
          unlockMutation.mutate(passwordInput);
        }}
        onClose={tutupDialog}
      >
        <Field label="Kata sandi arsip" htmlFor="arsip-password" required>
          <input
            id="arsip-password"
            type="password"
            className="field-input"
            autoComplete="current-password"
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
            placeholder="Masukkan kata sandi"
          />
        </Field>

        {galatUnlock ? (
          <p
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700"
          >
            {galatUnlock}
          </p>
        ) : null}

        <p className="text-[11px] leading-relaxed text-slate-500">
          Kata sandi diperoleh dari pengelola program studi.
        </p>
      </FormModal>

      {previewTarget ? (
        <DokumenPreviewModal
          open
          arsipId={previewTarget.id}
          judul={previewTarget.judul}
          password={password}
          asal={previewTarget.asal}
          onClose={() => setPreviewTarget(null)}
        />
      ) : null}
    </>
  );
};

export default DocumentsPage;
