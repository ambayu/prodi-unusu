import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  KeyIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { DeleteRowButton, EditRowButton, RowActions } from '../../components/ui/RowActions';
import { DokumenPreviewModal } from '../../components/DokumenPreviewModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import {
  DOKUMEN_MAX_BYTES,
  arsipDokumenApi,
  dokumenProdiApi,
  type DokumenAsal,
  type DokumenProdiInput,
  type DokumenProdiItem,
} from '../../services/contentApi';
import { toApiError, firstFieldError } from '../../services/api';

/** Kunci untuk dokumen yang belum diklasifikasikan ke kategori mana pun. */
const TANPA_KATEGORI = '__tanpa_kategori__';
const LABEL_TANPA_KATEGORI = 'Tanpa kategori';

/** Satu baris tabel: dokumen buatan prodi atau kiriman pusat, bentuknya seragam. */
interface BarisDokumen {
  kunci: string;
  id: number;
  asal: DokumenAsal;
  judul: string;
  nomor: string | null;
  kategori: string | null;
  tahun: number | null;
  status: string | null;
  mimeType: string | null;
  adaBerkas: boolean;
  /** Terisi hanya pada dokumen buatan prodi; hanya baris ini yang dapat diubah/dihapus. */
  milikProdi: DokumenProdiItem | null;
}

const FORM_KOSONG: DokumenProdiInput = {
  title: '',
  code: '',
  category: '',
  year: new Date().getFullYear(),
  description: '',
  isPublic: true,
  file: null,
};

/**
 * Menerjemahkan `mimeType` menjadi label jenis berkas singkat. Nilai yang tidak
 * dikenali dibiarkan `null` agar kolom Berkas menampilkan tanda hubung, bukan
 * tebakan yang menyesatkan.
 */
function ekstensiBerkas(mimeType: string | null): string | null {
  if (!mimeType) return null;
  const jenis = mimeType.toLowerCase();
  if (jenis.includes('pdf')) return 'PDF';
  if (jenis.includes('wordprocessingml') || jenis.includes('msword')) return 'DOCX';
  if (jenis.includes('spreadsheetml') || jenis.includes('ms-excel')) return 'XLSX';
  if (jenis.includes('presentationml') || jenis.includes('ms-powerpoint')) return 'PPTX';
  if (jenis.startsWith('image/')) return jenis.replace('image/', '').toUpperCase();
  return null;
}

/** Memformat tanggal ISO menjadi tanggal Indonesia yang ringkas. */
function formatTanggal(iso: string | null): string {
  if (!iso) return '—';
  const tanggal = new Date(iso);
  if (Number.isNaN(tanggal.getTime())) return '—';
  return tanggal.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const kunciKategori = (kategori: string | null) => (kategori?.trim() ? kategori.trim() : TANPA_KATEGORI);

const WARNA_STATUS: Record<string, string> = {
  Publish: 'bg-emerald-50 text-emerald-700',
  Aktif: 'bg-emerald-50 text-emerald-700',
  Draft: 'bg-amber-50 text-amber-700',
};

/**
 * Bank dokumen / arsip surat program studi.
 *
 * Prodi menambah, mengubah, dan menghapus dokumennya sendiri. Dokumen kiriman
 * pusat tampil di tabel yang sama tetapi hanya dapat dilihat. Status Publish
 * menampilkan dokumen di halaman publik; Draft hanya terlihat di panel ini.
 */
export const AdminDocuments: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();
  const bolehTambah = has('documents.create');
  const bolehUbah = has('documents.update');
  const bolehHapus = has('documents.delete');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('');
  const [previewTarget, setPreviewTarget] = useState<BarisDokumen | null>(null);

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [sedangDiubah, setSedangDiubah] = useState<DokumenProdiItem | null>(null);
  const [form, setForm] = useState<DokumenProdiInput>(FORM_KOSONG);
  const [galatForm, setGalatForm] = useState<string | null>(null);
  const [targetHapus, setTargetHapus] = useState<DokumenProdiItem | null>(null);

  const [passwordBaru, setPasswordBaru] = useState('');
  const [passwordUlang, setPasswordUlang] = useState('');
  const [panelTerbuka, setPanelTerbuka] = useState(false);

  const prodiQuery = useQuery({
    queryKey: ['admin', 'dokumen-prodi'],
    queryFn: () => dokumenProdiApi.list().then((res) => res.data.items),
    retry: 1,
  });

  /*
   * Dokumen kiriman pusat bersifat tambahan: bila gagal dimuat, dokumen milik
   * prodi tetap tampil dan pengguna diberi tahu lewat catatan di bawah.
   */
  const pusatQuery = useQuery({
    queryKey: ['admin', 'arsip-dokumen'],
    queryFn: () => arsipDokumenApi.adminList().then((res) => res.data.items),
    retry: 1,
  });

  const passwordQuery = useQuery({
    queryKey: ['admin', 'dokumen-password'],
    queryFn: () => arsipDokumenApi.passwordStatus().then((res) => res.data),
    retry: 1,
  });

  const invalidasi = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dokumen-prodi'] });
    void queryClient.invalidateQueries({ queryKey: ['public', 'dokumen-prodi'] });
  };

  const simpanPassword = useMutation({
    mutationFn: (password: string) => arsipDokumenApi.setPassword(password).then((res) => res.data),
    onSuccess: () => {
      toast.success('Kata sandi dokumen berhasil disimpan.');
      setPasswordBaru('');
      setPasswordUlang('');
      setPanelTerbuka(false);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dokumen-password'] });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const simpanDokumen = useMutation({
    mutationFn: (input: DokumenProdiInput) =>
      sedangDiubah ? dokumenProdiApi.update(sedangDiubah.id, input) : dokumenProdiApi.create(input),
    onSuccess: () => {
      toast.success(sedangDiubah ? 'Dokumen berhasil diperbarui.' : 'Dokumen berhasil ditambahkan.');
      tutupForm();
      invalidasi();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setGalatForm(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const hapusDokumen = useMutation({
    mutationFn: (id: number) => dokumenProdiApi.remove(id),
    onSuccess: () => {
      toast.success('Dokumen berhasil dihapus.');
      setTargetHapus(null);
      invalidasi();
    },
    onError: (error) => {
      toast.error(toApiError(error).message);
      setTargetHapus(null);
    },
  });

  const passwordAktif = passwordQuery.data?.passwordActive ?? false;

  const semuaBaris = useMemo<BarisDokumen[]>(() => {
    const milikProdi = (prodiQuery.data ?? []).map<BarisDokumen>((d) => ({
      kunci: `prodi-${d.id}`,
      id: d.id,
      asal: 'prodi',
      judul: d.judul,
      nomor: d.nomor,
      kategori: d.kategori,
      tahun: d.tahun,
      status: d.status,
      mimeType: d.mimeType,
      adaBerkas: true,
      milikProdi: d,
    }));
    const kirimanPusat = (pusatQuery.data ?? []).map<BarisDokumen>((d) => ({
      kunci: `arsip-${d.sumber}-${d.id}`,
      id: d.id,
      asal: 'arsip',
      judul: d.judul,
      nomor: d.nomor,
      kategori: d.kategori,
      tahun: d.tahun,
      status: d.status,
      mimeType: d.mimeType,
      adaBerkas: Boolean(d.fileUrl),
      milikProdi: null,
    }));
    return [...milikProdi, ...kirimanPusat];
  }, [prodiQuery.data, pusatQuery.data]);

  /** Kategori yang benar-benar ada beserta jumlahnya, urut abjad; "Tanpa kategori" terakhir. */
  const daftarKategori = useMemo(() => {
    const hitung = new Map<string, { label: string; jumlah: number }>();
    for (const baris of semuaBaris) {
      const kunci = kunciKategori(baris.kategori);
      const sekarang = hitung.get(kunci) ?? {
        label: kunci === TANPA_KATEGORI ? LABEL_TANPA_KATEGORI : kunci,
        jumlah: 0,
      };
      sekarang.jumlah += 1;
      hitung.set(kunci, sekarang);
    }
    return Array.from(hitung.entries())
      .map(([kunci, nilai]) => ({ kunci, ...nilai }))
      .sort((a, b) => {
        if (a.kunci === TANPA_KATEGORI) return 1;
        if (b.kunci === TANPA_KATEGORI) return -1;
        return a.label.localeCompare(b.label, 'id-ID');
      });
  }, [semuaBaris]);

  const daftarStatus = useMemo(
    () => Array.from(new Set(semuaBaris.map((baris) => baris.status).filter((s): s is string => Boolean(s)))).sort(),
    [semuaBaris],
  );

  const barisTersaring = useMemo(() => {
    const kata = search.trim().toLowerCase();
    return semuaBaris.filter((baris) => {
      if (kategoriFilter && kunciKategori(baris.kategori) !== kategoriFilter) return false;
      if (statusFilter && baris.status !== statusFilter) return false;
      if (!kata) return true;
      return [baris.judul, baris.nomor, baris.kategori].some((teks) => teks?.toLowerCase().includes(kata));
    });
  }, [semuaBaris, search, statusFilter, kategoriFilter]);

  const kategoriSaran = useMemo(
    () => Array.from(new Set((prodiQuery.data ?? []).map((d) => d.kategori))).sort((a, b) => a.localeCompare(b, 'id-ID')),
    [prodiQuery.data],
  );

  const bukaFormTambah = () => {
    setSedangDiubah(null);
    setForm(FORM_KOSONG);
    setGalatForm(null);
    setFormTerbuka(true);
  };

  const bukaFormUbah = (dokumen: DokumenProdiItem) => {
    setSedangDiubah(dokumen);
    setForm({
      title: dokumen.judul,
      code: dokumen.nomor ?? '',
      category: dokumen.kategori,
      year: dokumen.tahun,
      description: dokumen.deskripsi ?? '',
      isPublic: dokumen.isPublic,
      file: null,
    });
    setGalatForm(null);
    setFormTerbuka(true);
  };

  function tutupForm() {
    setFormTerbuka(false);
    setSedangDiubah(null);
    setGalatForm(null);
  }

  const kirimForm = (event: React.FormEvent) => {
    event.preventDefault();
    if (!sedangDiubah && !form.file) {
      setGalatForm('Pilih berkas PDF terlebih dahulu.');
      return;
    }
    setGalatForm(null);
    simpanDokumen.mutate(form);
  };

  const pilihBerkas = (event: React.ChangeEvent<HTMLInputElement>) => {
    const berkas = event.target.files?.[0] ?? null;
    if (berkas && berkas.type !== 'application/pdf') {
      setGalatForm('Berkas wajib berformat PDF.');
      event.target.value = '';
      return;
    }
    if (berkas && berkas.size > DOKUMEN_MAX_BYTES) {
      setGalatForm(`Ukuran berkas maksimal ${DOKUMEN_MAX_BYTES / 1024 / 1024} MB.`);
      event.target.value = '';
      return;
    }
    setGalatForm(null);
    setForm((sekarang) => ({ ...sekarang, file: berkas }));
  };

  const errorProdi = prodiQuery.isError ? toApiError(prodiQuery.error).message : null;
  const adaFilter = Boolean(search.trim() || kategoriFilter || statusFilter);

  return (
    <AdminLayout
      title="Bank Dokumen"
      description="Arsip surat dan dokumen program studi. Dokumen berstatus Publish tampil di halaman publik; Draft hanya terlihat di sini."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {bolehTambah ? (
            <button type="button" onClick={bukaFormTambah} className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              Tambah Dokumen
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setPanelTerbuka((current) => !current)}
            className="btn-secondary"
          >
            {passwordAktif ? <LockClosedIcon className="h-4 w-4" /> : <KeyIcon className="h-4 w-4" />}
            {passwordAktif ? 'Ubah Kata Sandi' : 'Pasang Kata Sandi'}
          </button>
        </div>
      }
    >
      {/* ---------------------------------------------------------------
          Peringatan bila kata sandi belum dipasang: arsip tertutup total.
          --------------------------------------------------------------- */}
      {!passwordQuery.isLoading && !passwordAktif ? (
        <div className="mb-4 flex items-start gap-3 rounded-[14px] border border-amber-300 bg-amber-50 px-4 py-3.5">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div className="min-w-0 text-sm text-amber-900">
            <p className="font-bold leading-snug">
              Dokumen prodi ini belum dilindungi kata sandi untuk publik.
            </p>
            <p className="mt-1.5 leading-relaxed">
              Pengelola tetap dapat membuka dokumen tanpa kata sandi. Pengunjung publik memerlukannya untuk membuka berkas.
            </p>
            <button
              type="button"
              onClick={() => setPanelTerbuka(true)}
              className="btn-primary mt-3 gap-2 bg-amber-600 hover:bg-amber-700"
            >
              <KeyIcon className="h-4 w-4" />
              Pasang Kata Sandi Sekarang
            </button>
          </div>
        </div>
      ) : null}

      {/* Panel pengaturan kata sandi */}
      {panelTerbuka ? (
        <section className="mb-4 rounded-[14px] border border-[#CBD5E1] bg-white p-4 shadow-2xs">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <KeyIcon className="h-4 w-4 text-[#1e3a8a]" />
                Kunci Dokumen Prodi
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Satu kata sandi berlaku untuk seluruh dokumen prodi ini. Kata sandi ini melindungi berkas
                dari pengunjung publik; Anda sebagai pengelola tetap dapat membuka dokumen tanpa
                memasukkannya. Kata sandi tidak pernah disimpan sebagai teks biasa.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPanelTerbuka(false)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-slate-50"
              aria-label="Tutup panel kata sandi"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (passwordBaru.length < 6) {
                toast.error('Kata sandi minimal 6 karakter.');
                return;
              }
              if (passwordBaru !== passwordUlang) {
                toast.error('Ulangi kata sandi dengan nilai yang sama.');
                return;
              }
              simpanPassword.mutate(passwordBaru);
            }}
          >
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-slate-700">
                {passwordAktif ? 'Kata sandi baru' : 'Kata sandi'}
              </span>
              <input
                type="password"
                className="field-input"
                required
                minLength={6}
                maxLength={72}
                autoComplete="new-password"
                value={passwordBaru}
                onChange={(event) => setPasswordBaru(event.target.value)}
                placeholder="Minimal 6 karakter"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-slate-700">Ulangi kata sandi</span>
              <input
                type="password"
                className="field-input"
                required
                minLength={6}
                maxLength={72}
                autoComplete="new-password"
                value={passwordUlang}
                onChange={(event) => setPasswordUlang(event.target.value)}
                placeholder="Ketik ulang kata sandi"
              />
            </label>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
              <button type="submit" className="btn-primary" disabled={simpanPassword.isPending}>
                <LockClosedIcon className="h-4 w-4" />
                {simpanPassword.isPending ? 'Menyimpan...' : 'Simpan Kata Sandi'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setPasswordBaru('');
                  setPasswordUlang('');
                  setPanelTerbuka(false);
                }}
              >
                Batal
              </button>
              {passwordAktif ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                  <CheckCircleIcon className="h-4 w-4" />
                  Kata sandi aktif
                  {passwordQuery.data?.setAt ? ` sejak ${formatTanggal(passwordQuery.data.setAt)}` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                  <LockOpenIcon className="h-4 w-4" />
                  Belum ada kata sandi
                </span>
              )}
            </div>
          </form>

        </section>
      ) : null}

      {/* Penyaring */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            className="field-input pl-9"
            placeholder="Cari judul, nomor, atau kategori dokumen"
            aria-label="Cari dokumen"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="field-select sm:w-56"
          value={kategoriFilter}
          onChange={(event) => setKategoriFilter(event.target.value)}
          aria-label="Saring kategori dokumen"
        >
          <option value="">Semua kategori</option>
          {daftarKategori.map((kategori) => (
            <option key={kategori.kunci} value={kategori.kunci}>
              {kategori.label} ({kategori.jumlah})
            </option>
          ))}
        </select>
        <select
          className="field-select sm:w-48"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Saring status dokumen"
        >
          <option value="">Semua status</option>
          {daftarStatus.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {pusatQuery.isError ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Sebagian dokumen belum dapat dimuat. Dokumen yang Anda tambahkan sendiri tetap ditampilkan.
        </div>
      ) : null}

      <DataTable<BarisDokumen>
        rows={barisTersaring}
        rowKey={(baris) => baris.kunci}
        loading={prodiQuery.isLoading}
        loadingLabel="Memuat dokumen"
        error={errorProdi}
        onRetry={() => void prodiQuery.refetch()}
        emptyTitle={adaFilter ? 'Tidak ada dokumen yang cocok' : 'Belum ada dokumen'}
        emptyDescription={
          adaFilter
            ? 'Ubah pencarian atau penyaring untuk melihat dokumen lain.'
            : 'Tambahkan dokumen pertama program studi ini.'
        }
        emptyAction={
          !adaFilter && bolehTambah ? (
            <button type="button" onClick={bukaFormTambah} className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              Tambah Dokumen
            </button>
          ) : adaFilter ? (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setKategoriFilter('');
                setStatusFilter('');
              }}
              className="btn-secondary"
            >
              Hapus penyaring
            </button>
          ) : undefined
        }
        minWidth={1000}
        columns={[
          {
            key: 'judul',
            header: 'Judul Dokumen',
            cellClassName: 'text-xs font-semibold text-slate-900',
            render: (baris) => baris.judul,
          },
          {
            key: 'nomor',
            header: 'Nomor Dokumen',
            width: 180,
            cellClassName: 'font-mono text-xs text-slate-700',
            render: (baris) =>
              baris.nomor ?? <span className="italic text-slate-400">—</span>,
          },
          {
            key: 'berkas',
            header: 'Berkas',
            width: 90,
            align: 'center',
            render: (baris) => {
              const jenis = ekstensiBerkas(baris.mimeType);
              return jenis ? (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold uppercase text-slate-600">
                  {jenis}
                </span>
              ) : (
                <span className="italic text-slate-400">—</span>
              );
            },
          },
          {
            key: 'kategori',
            header: 'Kategori',
            width: 150,
            cellClassName: 'text-xs text-slate-700',
            render: (baris) => baris.kategori ?? <span className="italic text-slate-400">—</span>,
          },
          {
            key: 'tahun',
            header: 'Tahun',
            width: 80,
            align: 'center',
            cellClassName: 'text-xs text-slate-700',
            render: (baris) => baris.tahun ?? <span className="italic text-slate-400">—</span>,
          },
          {
            key: 'status',
            header: 'Status',
            width: 110,
            render: (baris) => (
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                  WARNA_STATUS[baris.status ?? ''] ?? 'bg-slate-100 text-slate-600'
                }`}
              >
                {baris.status ?? '—'}
              </span>
            ),
          },
          {
            key: 'aksi',
            header: 'Aksi',
            width: 150,
            align: 'right',
            render: (baris) => (
              <RowActions>
                {baris.adaBerkas ? (
                  <button
                    type="button"
                    onClick={() => setPreviewTarget(baris)}
                    className="btn-icon-neutral"
                    aria-label={`Lihat dokumen: ${baris.judul}`}
                    title="Lihat dokumen"
                  >
                    <EyeIcon className="h-[17px] w-[17px]" aria-hidden="true" />
                  </button>
                ) : null}
                {baris.milikProdi && bolehUbah ? (
                  <EditRowButton label="Ubah dokumen" konteks={baris.judul} onClick={() => bukaFormUbah(baris.milikProdi!)} />
                ) : null}
                {baris.milikProdi && bolehHapus ? (
                  <DeleteRowButton label="Hapus dokumen" konteks={baris.judul} onClick={() => setTargetHapus(baris.milikProdi!)} />
                ) : null}
              </RowActions>
            ),
          },
        ]}
      />

      <FormModal
        open={formTerbuka}
        wide
        title={sedangDiubah ? 'Ubah Dokumen' : 'Tambah Dokumen'}
        description="Dokumen berstatus Publish tampil di halaman publik, Draft hanya terlihat oleh pengelola."
        submitLabel={sedangDiubah ? 'Simpan Perubahan' : 'Simpan Dokumen'}
        busy={simpanDokumen.isPending}
        error={galatForm}
        onSubmit={kirimForm}
        onClose={tutupForm}
      >
        <Field label="Judul Dokumen" htmlFor="dok-judul" required>
          <input
            id="dok-judul"
            className="field-input"
            required
            minLength={3}
            maxLength={255}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nomor Dokumen" htmlFor="dok-nomor" hint="Opsional, misalnya nomor surat.">
            <input
              id="dok-nomor"
              className="field-input"
              maxLength={50}
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
          </Field>
          <Field label="Kategori" htmlFor="dok-kategori" required>
            <input
              id="dok-kategori"
              className="field-input"
              required
              minLength={2}
              maxLength={100}
              list="dok-kategori-saran"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            />
            <datalist id="dok-kategori-saran">
              {kategoriSaran.map((kategori) => (
                <option key={kategori} value={kategori} />
              ))}
            </datalist>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tahun" htmlFor="dok-tahun" required>
            <input
              id="dok-tahun"
              type="number"
              className="field-input"
              required
              min={1990}
              max={2100}
              value={form.year}
              onChange={(event) => setForm({ ...form, year: Number(event.target.value) })}
            />
          </Field>
          <Field label="Status" htmlFor="dok-status" required>
            <select
              id="dok-status"
              className="field-select"
              value={form.isPublic ? 'publish' : 'draft'}
              onChange={(event) => setForm({ ...form, isPublic: event.target.value === 'publish' })}
            >
              <option value="publish">Publish — tampil di halaman publik</option>
              <option value="draft">Draft — hanya terlihat pengelola</option>
            </select>
          </Field>
        </div>

        <Field label="Deskripsi" htmlFor="dok-deskripsi" hint="Opsional.">
          <textarea
            id="dok-deskripsi"
            className="field-input min-h-[96px]"
            maxLength={5000}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </Field>

        <Field
          label="Berkas PDF"
          htmlFor="dok-berkas"
          required={!sedangDiubah}
          hint={
            sedangDiubah
              ? 'Kosongkan bila tidak ingin mengganti berkas yang sudah ada. Maksimal 10 MB.'
              : 'Format PDF, maksimal 10 MB.'
          }
        >
          <input
            id="dok-berkas"
            type="file"
            accept="application/pdf"
            className="field-input"
            onChange={pilihBerkas}
          />
        </Field>
      </FormModal>

      <ConfirmDialog
        open={Boolean(targetHapus)}
        title="Hapus dokumen?"
        description={`"${targetHapus?.judul ?? ''}" beserta berkasnya akan dihapus permanen dan tidak dapat dikembalikan.`}
        busy={hapusDokumen.isPending}
        onConfirm={() => targetHapus && hapusDokumen.mutate(targetHapus.id)}
        onCancel={() => setTargetHapus(null)}
      />

      {previewTarget ? (
        <DokumenPreviewModal
          open
          arsipId={previewTarget.id}
          judul={previewTarget.judul}
          sumber="admin"
          asal={previewTarget.asal}
          onClose={() => setPreviewTarget(null)}
        />
      ) : null}
    </AdminLayout>
  );
};

export default AdminDocuments;
