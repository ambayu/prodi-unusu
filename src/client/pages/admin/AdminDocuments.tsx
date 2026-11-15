import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
  LockOpenIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/ui/DataTable';
import { DokumenPreviewModal } from '../../components/DokumenPreviewModal';
import { useToast } from '../../components/ui/Toast';
import { arsipDokumenApi, type ArsipDokumenItem, type ArsipSumber } from '../../services/contentApi';
import { toApiError, firstFieldError } from '../../services/api';

/** Label sumber arsip agar terbaca manusia, bukan kode aplikasi. */
const SUMBER_LABEL: Record<ArsipSumber, string> = {
  lpm: 'LPM',
  lppm: 'LPPM',
};

const SUMBER_WARNA: Record<ArsipSumber, string> = {
  lpm: 'bg-sky-50 text-sky-700 border-sky-200',
  lppm: 'bg-violet-50 text-violet-700 border-violet-200',
};

/** Memformat tanggal ISO menjadi tanggal Indonesia yang ringkas. */
function formatTanggal(iso: string | null): string {
  if (!iso) return '—';
  const tanggal = new Date(iso);
  if (Number.isNaN(tanggal.getTime())) return '—';
  return tanggal.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Penampil arsip dokumen mutu LPM/LPPM untuk pengelola program studi.
 *
 * Halaman ini SENGAJA hanya-baca: dokumen mutu diterbitkan dan dikelola oleh
 * LPM/LPPM, sehingga prodi tidak dapat menambah, mengubah, atau menghapusnya.
 * Satu-satunya kewenangan prodi adalah memasang kata sandi yang melindungi
 * seluruh arsipnya dari akses publik.
 */
export const AdminDocuments: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [previewTarget, setPreviewTarget] = useState<ArsipDokumenItem | null>(null);

  const [passwordBaru, setPasswordBaru] = useState('');
  const [passwordUlang, setPasswordUlang] = useState('');
  const [panelTerbuka, setPanelTerbuka] = useState(false);

  /*
   * Kata sandi arsip HANYA dipakai untuk melindungi akses publik, bukan admin.
   * Pengelola prodi yang sudah login membuka berkas lewat rute admin sehingga
   * tidak perlu mengetik kata sandi lagi.
   */

  const listQuery = useQuery({
    queryKey: ['admin', 'arsip-dokumen', search, statusFilter],
    queryFn: () =>
      arsipDokumenApi
        .adminList({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
        })
        .then((res) => res.data),
    retry: 1,
  });

  const passwordQuery = useQuery({
    queryKey: ['admin', 'dokumen-password'],
    queryFn: () => arsipDokumenApi.passwordStatus().then((res) => res.data),
    retry: 1,
  });

  const simpanPassword = useMutation({
    mutationFn: (password: string) => arsipDokumenApi.setPassword(password).then((res) => res.data),
    onSuccess: () => {
      toast.success('Kata sandi arsip dokumen berhasil disimpan.');
      setPasswordBaru('');
      setPasswordUlang('');
      setPanelTerbuka(false);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dokumen-password'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'arsip-dokumen'] });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const meta = listQuery.data?.meta;
  const items = listQuery.data?.items ?? [];
  const passwordAktif = passwordQuery.data?.passwordActive ?? meta?.passwordActive ?? false;
  const errorText = listQuery.isError ? toApiError(listQuery.error).message : null;
  const kodeBelumDipetakan = errorText?.toLowerCase().includes('kode prodi') ?? false;

  /**
   * Membuka pratinjau dokumen.
   *
   * Admin prodi sudah membuktikan haknya lewat login, jadi tombol ini langsung
   * menampilkan pratinjau PDF tanpa meminta kata sandi arsip. Kata sandi tetap
   * berlaku untuk pengunjung publik pada halaman `/dokumen`.
   */
  const bukaPratinjau = (dokumen: ArsipDokumenItem) => {
    setPreviewTarget(dokumen);
  };

  return (
    <AdminLayout
      title="Arsip Dokumen (LPM/LPPM)"
      description="Dokumen mutu dari LPM dan LPPM yang ditujukan kepada program studi ini. Arsip hanya dapat dilihat — pengelolaan tetap di aplikasi LPM/LPPM."
      actions={
        <button
          type="button"
          onClick={() => setPanelTerbuka((current) => !current)}
          className={passwordAktif ? 'btn-secondary' : 'btn-primary'}
        >
          {passwordAktif ? <LockClosedIcon className="h-4 w-4" /> : <KeyIcon className="h-4 w-4" />}
          {passwordAktif ? 'Ubah Kata Sandi' : 'Pasang Kata Sandi'}
        </button>
      }
    >
      {/* ---------------------------------------------------------------
          Peringatan bila kata sandi belum dipasang: arsip tertutup total.
          --------------------------------------------------------------- */}
      {!passwordQuery.isLoading && !passwordAktif ? (
        <div className="mb-4 flex items-start gap-3 rounded-[14px] border border-amber-300 bg-amber-50 px-4 py-3.5">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          {/*
           * Isi peringatan dinaikkan dari 12px ke 14px (`text-sm`).
           *
           * Sebelumnya `text-xs leading-relaxed` membuat paragraf ini terasa
           * sempit meskipun jenis hurufnya sudah lapang: 12px pada Plus Jakarta
           * Sans hanya menghasilkan x-height sekitar 6.4px. 14px memberi 7.4px.
           */}
          <div className="min-w-0 text-sm text-amber-900">
            <p className="font-bold leading-snug">
              Arsip dokumen prodi ini belum dilindungi kata sandi untuk publik.
            </p>
            <p className="mt-1.5 leading-relaxed">
              Anda tetap dapat membuka dan mengunduh semua dokumen di halaman ini tanpa kata sandi. Kata
              sandi hanya diperlukan pengunjung publik di halaman <span className="font-semibold">/dokumen</span>{' '}
              untuk membuka berkas. Satu kata sandi berlaku untuk seluruh dokumen prodi ini.
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

      {/* ---------------------------------------------------------------
          Filter arsip
          --------------------------------------------------------------- */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            className="field-input pl-9"
            placeholder="Cari judul, nomor, atau kategori dokumen"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="field-input sm:w-48"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Saring status dokumen"
        >
          <option value="">Semua status</option>
          <option value="Aktif">Aktif</option>
          <option value="Kadaluarsa">Kadaluarsa</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      {/* Peringatan sumber yang sedang tidak dapat dibaca */}
      {meta?.sumberGagal?.length ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          Arsip {meta.sumberGagal.map((sumber) => SUMBER_LABEL[sumber]).join(' dan ')} sedang tidak dapat
          dibaca. Dokumen dari sumber lain tetap ditampilkan.
        </div>
      ) : null}

      {/*
       * Keadaan loading/galat/kosong ditangani DataTable, termasuk menampilkan
       * keterangan footer hanya saat ada data.
       */}
      <DataTable<ArsipDokumenItem>
        rows={items}
        rowKey={(dokumen) => `${dokumen.sumber}-${dokumen.id}`}
        loading={listQuery.isLoading}
        loadingLabel="Memuat arsip dokumen LPM/LPPM"
        error={
          listQuery.isError
            ? kodeBelumDipetakan
              ? 'Kode program studi ini belum dipetakan ke arsip LPM/LPPM. Hubungi administrator universitas untuk melengkapinya.'
              : (errorText ?? 'Arsip dokumen belum dapat dimuat.')
            : null
        }
        onRetry={() => void listQuery.refetch()}
        emptyTitle="Belum ada arsip dokumen"
        emptyDescription="Dokumen mutu yang ditujukan kepada program studi ini akan muncul di sini setelah diterbitkan oleh LPM atau LPPM."
        minWidth={900}
        footer={
          <p className="flex items-center gap-1.5 text-slate-600">
            <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            Menampilkan {items.length} dokumen
            {meta?.prodiCode ? ` untuk kode prodi ${meta.prodiCode}` : ''}. Sumber: arsip LPM &amp; LPPM
            melalui ONE UNUSU.
          </p>
        }
        columns={[
          {
            key: 'judul',
            header: 'Judul',
            render: (dokumen) => (
              <>
                {/* Judul dokumen adalah isi terpenting baris ini: dibuat lebih
                    besar dan hitam pekat agar menjadi titik pandang. */}
                <span className="block text-[14px] font-extrabold leading-snug text-slate-900">
                  {dokumen.judul}
                </span>
                <span className="mt-1 block break-all font-mono text-slate-600">
                  {dokumen.nomor ?? 'tanpa nomor'}
                </span>
              </>
            ),
          },
          {
            key: 'sumber',
            header: 'Sumber',
            width: 110,
            render: (dokumen) => (
              <span
                className={`inline-block max-w-full truncate rounded border px-2 py-1 align-middle font-bold ${SUMBER_WARNA[dokumen.sumber]}`}
                title={SUMBER_LABEL[dokumen.sumber]}
              >
                {SUMBER_LABEL[dokumen.sumber]}
              </span>
            ),
          },
          {
            key: 'kategori',
            header: 'Kategori',
            width: 150,
            render: (dokumen) => dokumen.kategori ?? '—',
          },
          {
            key: 'tahun',
            header: 'Tahun',
            width: 80,
            cellClassName: 'whitespace-nowrap',
            render: (dokumen) => dokumen.tahun ?? '—',
          },
          {
            key: 'status',
            header: 'Status',
            width: 100,
            render: (dokumen) => (
              <span
                className={`inline-block max-w-full truncate rounded px-2 py-1 align-middle font-bold ${
                  dokumen.status === 'Aktif'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
                title={dokumen.status ?? '—'}
              >
                {dokumen.status ?? '—'}
              </span>
            ),
          },
          {
            key: 'aksi',
            header: 'Aksi',
            width: 180,
            align: 'right',
            render: (dokumen) =>
              dokumen.fileUrl ? (
                <button
                  type="button"
                  onClick={() => bukaPratinjau(dokumen)}
                  title="Pratinjau & unduh dokumen"
                  className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-lg bg-[#1e3a8a] px-3.5 py-2 font-bold text-white transition-colors hover:bg-[#172f6e]"
                  aria-label={`Lihat ${dokumen.judul}`}
                >
                  <EyeIcon className="h-4 w-4 shrink-0" />
                  Lihat Dokumen
                </button>
              ) : (
                <span className="font-semibold text-slate-500">Berkas belum ada</span>
              ),
          },
        ]}
      />

      {/* -----------------------------------------------------------------
          Pratinjau PDF: langsung tampil tanpa meminta kata sandi arsip.
          ----------------------------------------------------------------- */}
      {previewTarget ? (
        <DokumenPreviewModal
          open
          arsipId={previewTarget.id}
          judul={previewTarget.judul}
          sumber="admin"
          onClose={() => setPreviewTarget(null)}
        />
      ) : null}
    </AdminLayout>
  );
};

export default AdminDocuments;
