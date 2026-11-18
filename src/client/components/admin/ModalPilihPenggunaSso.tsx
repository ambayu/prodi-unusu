import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { userApi, type KandidatOneUnusu } from '../../services/adminApi';
import { DataTable, type DataTableColumn } from '../ui/DataTable';

const LABEL_PERAN: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN_SSO: 'Admin SSO',
  DOSEN: 'Dosen',
  MAHASISWA: 'Mahasiswa',
  TENDIK: 'Tenaga Kependidikan',
};

function labelPeran(kode: string | null | undefined): string {
  if (!kode) return '—';
  return LABEL_PERAN[kode.toUpperCase()] ?? kode;
}

function inisial(nama: string): string {
  const bagian = nama.trim().split(/\s+/).filter(Boolean);
  if (bagian.length === 0) return '?';
  if (bagian.length === 1) return bagian[0].slice(0, 2).toUpperCase();
  return (bagian[0][0] + bagian[bagian.length - 1][0]).toUpperCase();
}

export interface ModalPilihPenggunaSsoProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  idTerdaftar?: number[];
  usernameTerdaftar?: string[];
}

export const ModalPilihPenggunaSso: React.FC<ModalPilihPenggunaSsoProps> = ({
  open,
  onClose,
  onSuccess,
  idTerdaftar = [],
  usernameTerdaftar = [],
}) => {
  const [baris, setBaris] = useState<KandidatOneUnusu[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  const [kataKunci, setKataKunci] = useState('');
  const [filterPeran, setFilterPeran] = useState('');
  const [filterFakultas, setFilterFakultas] = useState('');
  const [filterProdi, setFilterProdi] = useState('');

  const [opsiFakultas, setOpsiFakultas] = useState<string[]>([]);
  const [opsiProdi, setOpsiProdi] = useState<string[]>([]);
  const [opsiPeran, setOpsiPeran] = useState<string[]>([]);

  const [terpilih, setTerpilih] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const sudahTerdaftarSet = useMemo(() => new Set(idTerdaftar), [idTerdaftar]);
  const sudahTerdaftarUsernames = useMemo(() => new Set(usernameTerdaftar), [usernameTerdaftar]);

  const permintaanTerakhir = useRef(0);

  const muat = useCallback(async (kriteria: { search?: string; role?: string; fakultas?: string; prodi?: string }) => {
    const nomor = ++permintaanTerakhir.current;
    setMemuat(true);
    setGalat(null);
    try {
      const res = await userApi.kandidat(kriteria);
      if (nomor !== permintaanTerakhir.current) return;

      const data = res.data?.data ?? [];
      setBaris(data);

      const tanpaFilter = !kriteria.role && !kriteria.fakultas && !kriteria.prodi && !kriteria.search;
      if (tanpaFilter) {
        const fakultas = Array.from(
          new Set(data.map((u) => (u.fakultas ?? '').trim()).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b, 'id'));
        const prodi = Array.from(
          new Set(data.map((u) => (u.prodi ?? '').trim()).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b, 'id'));
        const peran = Array.from(
          new Set(data.map((u) => (u.role ?? '').trim().toUpperCase()).filter(Boolean)),
        ).sort((a, b) => (LABEL_PERAN[a] ?? a).localeCompare(LABEL_PERAN[b] ?? b, 'id'));
        setOpsiFakultas(fakultas);
        setOpsiProdi(prodi);
        setOpsiPeran(peran);
      }
    } catch (err: unknown) {
      if (nomor !== permintaanTerakhir.current) return;
      setBaris([]);
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Gagal memuat direktori ONE UNUSU.';
      setGalat(msg);
    } finally {
      if (nomor === permintaanTerakhir.current) setMemuat(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setTerpilih([]);
      setKataKunci('');
      setFilterPeran('');
      setFilterFakultas('');
      setFilterProdi('');
      setOpsiPeran([]);
      return;
    }
    void muat({});
  }, [open, muat]);

  // Debounce kata kunci
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      void muat({
        search: kataKunci.trim(),
        role: filterPeran,
        fakultas: filterFakultas,
        prodi: filterProdi,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [open, kataKunci, filterPeran, filterFakultas, filterProdi, muat]);

  const cekSudahTerdaftar = (u: KandidatOneUnusu) => {
    return u.sudahTerdaftar || sudahTerdaftarSet.has(u.id) || sudahTerdaftarUsernames.has(u.username);
  };

  const bisaDipilih = (u: KandidatOneUnusu) => !cekSudahTerdaftar(u);

  const toggleSatu = (u: KandidatOneUnusu) => {
    if (!bisaDipilih(u)) return;
    setTerpilih((prev) =>
      prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id],
    );
  };

  const idBoleh = useMemo(() => baris.filter(bisaDipilih).map((u) => u.id), [baris]);
  const semuaTerpilih = idBoleh.length > 0 && idBoleh.every((id) => terpilih.includes(id));

  const toggleSemua = () => {
    if (semuaTerpilih) {
      setTerpilih((prev) => prev.filter((id) => !idBoleh.includes(id)));
    } else {
      setTerpilih((prev) => Array.from(new Set([...prev, ...idBoleh])));
    }
  };

  const handleSimpan = async () => {
    if (terpilih.length === 0) return;
    setSubmitting(true);
    try {
      const kandidatTerpilih = baris.filter((b) => terpilih.includes(b.id));
      await userApi.createFromSso({
        userIds: terpilih,
        kandidat: kandidatTerpilih,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Gagal mendaftarkan pengguna.';
      setGalat(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const kolom: DataTableColumn<KandidatOneUnusu>[] = [
    {
      key: 'pilih',
      header: (
        <input
          type="checkbox"
          aria-label="Pilih semua pengguna pada halaman ini"
          checked={semuaTerpilih}
          onChange={toggleSemua}
          disabled={memuat || idBoleh.length === 0}
          className="w-4 h-4 accent-[#1e3a8a]"
        />
      ),
      width: 48,
      align: 'center',
      render: (u) => (
        <input
          type="checkbox"
          aria-label={`Pilih ${u.nama}`}
          checked={terpilih.includes(u.id)}
          disabled={!bisaDipilih(u)}
          onChange={() => toggleSatu(u)}
          className="w-4 h-4 accent-[#1e3a8a] disabled:opacity-40 disabled:cursor-not-allowed"
        />
      ),
    },
    {
      key: 'nama',
      header: 'Nama',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          {inisial(u.nama) ? (
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-full bg-blue-100 text-[#1e3a8a] text-xs font-bold flex items-center justify-center shrink-0"
            >
              {inisial(u.nama)}
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-xs truncate">{u.nama}</p>
            <p className="text-slate-500 font-mono text-[11px] truncate">{u.email || u.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'username',
      header: 'NIDN / NIM',
      width: 140,
      cellClassName: 'font-mono text-xs text-slate-700',
      render: (u) => u.username,
    },
    {
      key: 'role',
      header: 'Peran SSO',
      width: 130,
      render: (u) => (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-700">
          {labelPeran(u.role)}
        </span>
      ),
    },
    {
      key: 'unit',
      header: 'Fakultas / Prodi',
      width: 220,
      cellClassName: 'text-xs text-slate-600',
      render: (u) => (
        <div>
          <p className="font-medium text-slate-800 truncate">{u.fakultas || '—'}</p>
          <p className="text-slate-500 text-[11px] truncate">{u.prodi || '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 130,
      render: (u) =>
        cekSudahTerdaftar(u) ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400">
            <CheckCircleIcon className="w-3.5 h-3.5" />
            Terdaftar
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
            <UserCircleIcon className="w-3.5 h-3.5" />
            Bisa dipilih
          </span>
        ),
    },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        className="relative my-6 w-full max-w-5xl rounded-[16px] border border-[#CBD5E1] bg-white shadow-xl flex flex-col max-h-[90vh]"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#CBD5E1] px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Tambah Pengguna dari Direktori ONE UNUSU</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Pilih satu atau beberapa pengguna dari portal pusat untuk didaftarkan ke sistem website prodi.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Kontrol Pencarian & Filter */}
        <div className="p-4 border-b border-[#CBD5E1] bg-slate-50/50 shrink-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama atau NIDN/NIM..."
                value={kataKunci}
                onChange={(e) => setKataKunci(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              />
            </div>

            <select
              value={filterPeran}
              onChange={(e) => setFilterPeran(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">Semua Peran SSO</option>
              {opsiPeran.map((kode) => (
                <option key={kode} value={kode}>{LABEL_PERAN[kode] ?? kode}</option>
              ))}
            </select>

            <select
              value={filterFakultas}
              onChange={(e) => setFilterFakultas(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">Semua Fakultas</option>
              {opsiFakultas.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            <select
              value={filterProdi}
              onChange={(e) => setFilterProdi(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">Semua Program Studi</option>
              {opsiProdi.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {galat && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {galat}
            </div>
          )}
        </div>

        {/* Tabel Data Kandidat */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
          <DataTable<KandidatOneUnusu>
            rows={baris}
            rowKey={(u) => String(u.id)}
            loading={memuat}
            loadingLabel="Menghubungi direktori ONE UNUSU..."
            emptyTitle="Tidak ada pengguna yang cocok"
            emptyDescription="Coba ubah kata kunci pencarian atau bersihkan filter di atas."
            minWidth={840}
            columns={kolom}
          />
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between border-t border-[#CBD5E1] px-6 py-4 bg-slate-50 shrink-0">
          <div className="text-xs text-slate-600">
            {terpilih.length > 0 ? (
              <span className="font-bold text-[#1e3a8a]">{terpilih.length} orang dicentang</span>
            ) : (
              <span>Centang satu atau lebih pengguna untuk ditambahkan.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary text-xs"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void handleSimpan()}
              disabled={submitting || terpilih.length === 0}
              className="btn-primary text-xs"
            >
              {submitting ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : null}
              {terpilih.length > 0 ? `Tambahkan (${terpilih.length}) Pengguna` : 'Tambahkan Pengguna'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
