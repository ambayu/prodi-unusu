import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { useSiteStore } from '../../app/siteStore';
import { dashboardApi, adminMenuApi } from '../../services/adminApi';
import { toApiError } from '../../services/api';

/**
 * Dashboard Portal Utama (scope portal).
 *
 * Portal pusat TIDAK mengelola konten program studi — landing page-nya statis
 * dan hanya menjelaskan bahwa UNUSU menaungi banyak prodi dengan website
 * mandiri. Karena itu halaman ini fokus pada hal yang memang milik portal:
 * statistik universitas, daftar website prodi, dan pintasan ke pengaturan
 * portal.
 *
 * Tombol "Kelola Konten" pada tiap baris adalah sakelar scope: ia mengubah
 * tenant aktif ke prodi tersebut sehingga sidebar berganti ke menu konten
 * prodi, lalu membuka dashboard prodi.
 */

interface PortalDomainRow {
  id: number;
  hostname: string;
  isPrimary: boolean;
  isActive: boolean;
  studyProgram: { id: number; name: string; code: string; status: string; faculty: { name: string } };
}

/** Kartu statistik ringkas. */
const StatCard: React.FC<{
  label: string;
  value: number | string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}> = ({ label, value, hint, icon: Icon, tone }) => (
  <div className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-2xs">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-extrabold leading-tight text-slate-900">{value}</p>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">{hint}</p>
      </div>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] ${tone}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
    </div>
  </div>
);

export const AdminPortalOverview: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isSuperAdmin } = usePermission();
  const enterProdiScope = useSiteStore((state) => state.enterProdiScope);

  const [kataKunci, setKataKunci] = useState('');
  const [switchingId, setSwitchingId] = useState<number | null>(null);

  const superQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'super'],
    queryFn: () => dashboardApi.superStats().then((res) => res.data),
    enabled: isSuperAdmin,
  });

  const stats = superQuery.data?.stats;

  /**
   * Satu baris per program studi.
   *
   * Endpoint dashboard mengembalikan daftar DOMAIN, bukan daftar prodi. Prodi
   * yang belum punya domain tetap harus terlihat (justru itu yang perlu
   * ditindaklanjuti), jadi baris dikelompokkan per `studyProgram.id`.
   */
  const rows = useMemo<PortalDomainRow[]>(() => {
    const domains = superQuery.data?.domains ?? [];
    const byProdi = new Map<number, PortalDomainRow>();
    for (const domain of domains) {
      const existing = byProdi.get(domain.studyProgram.id);
      // Domain utama diprioritaskan sebagai wakil baris prodi.
      if (!existing || (!existing.isPrimary && domain.isPrimary)) {
        byProdi.set(domain.studyProgram.id, domain);
      }
    }
    return Array.from(byProdi.values());
  }, [superQuery.data]);

  const filteredRows = useMemo(() => {
    const kunci = kataKunci.trim().toLowerCase();
    if (!kunci) return rows;
    return rows.filter((row) =>
      [row.studyProgram.name, row.studyProgram.code, row.studyProgram.faculty.name, row.hostname]
        .join(' ')
        .toLowerCase()
        .includes(kunci),
    );
  }, [rows, kataKunci]);

  /**
   * Pindah ke scope prodi lalu buka dashboard prodi.
   *
   * Cache menu dibersihkan agar sidebar membangun ulang katalog scope prodi
   * (bukan memakai katalog portal yang masih tersimpan).
   */
  const handleManage = async (row: PortalDomainRow) => {
    setSwitchingId(row.studyProgram.id);
    try {
      await enterProdiScope(row.studyProgram.id);
      adminMenuApi.clearCache();
      await queryClient.invalidateQueries();
      toast.success(`Beralih ke scope ${row.studyProgram.name}.`);
      navigate('/admin');
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <AdminLayout
      title="Dashboard Portal"
      description="Ringkasan website universitas: fakultas, program studi, domain, dan akses pengguna."
      actions={
        <Link
          to="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[40px] items-center gap-2 rounded-[10px] border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          <span>Lihat Beranda Portal</span>
        </Link>
      }
    >
      <div className="space-y-5">
        {/* Pintasan utama scope portal */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            to="/admin/portal"
            className="group flex items-center gap-3 rounded-[14px] border border-blue-200 bg-blue-50/70 p-4 transition-colors hover:bg-blue-100/70"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-[#1e3a8a] text-white">
              <PhotoIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">Hero Slider Beranda</p>
              <p className="text-[11px] leading-snug text-slate-600">
                Banner gambar yang tampil di beranda portal pusat.
              </p>
            </div>
          </Link>
          <Link
            to="/admin/website-list"
            className="group flex items-center gap-3 rounded-[14px] border border-emerald-200 bg-emerald-50/70 p-4 transition-colors hover:bg-emerald-100/70"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-emerald-700 text-white">
              <GlobeAltIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">Website Prodi</p>
              <p className="text-[11px] leading-snug text-slate-600">
                Registri seluruh portal program studi beserta statusnya.
              </p>
            </div>
          </Link>
        </div>

        {!isSuperAdmin ? (
          <EmptyState
            title="Ringkasan portal hanya untuk Super Admin"
            description="Akun Anda tidak memiliki izin melihat statistik lintas program studi. Hubungi administrator universitas bila Anda membutuhkan akses ini."
          />
        ) : superQuery.isLoading ? (
          <LoadingState label="Memuat ringkasan portal" rows={4} />
        ) : superQuery.isError ? (
          <ErrorState
            message={toApiError(superQuery.error).message}
            onRetry={() => void superQuery.refetch()}
          />
        ) : (
          <>
            {/* Statistik universitas */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Fakultas"
                value={stats?.faculties ?? 0}
                hint="Fakultas terdaftar di universitas"
                icon={BuildingLibraryIcon}
                tone="bg-indigo-50 text-indigo-700"
              />
              <StatCard
                label="Program Studi"
                value={stats?.studyPrograms ?? 0}
                hint="Prodi yang menaungi website mandiri"
                icon={AcademicCapIcon}
                tone="bg-blue-50 text-blue-700"
              />
              <StatCard
                label="Domain Aktif"
                value={stats?.activeDomains ?? 0}
                hint={
                  stats && stats.inactiveDomains > 0
                    ? `${stats.inactiveDomains} domain belum aktif`
                    : 'Seluruh domain berstatus aktif'
                }
                icon={GlobeAltIcon}
                tone="bg-emerald-50 text-emerald-700"
              />
              <StatCard
                label="Pengguna"
                value={stats?.users ?? 0}
                hint="Akun pengelola yang aktif"
                icon={UserGroupIcon}
                tone="bg-amber-50 text-amber-700"
              />
            </div>

            {/* Daftar website prodi */}
            <section className="rounded-[14px] border border-slate-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Website Program Studi</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Klik "Kelola Konten" untuk berpindah ke scope prodi dan mengisi kontennya.
                  </p>
                </div>
                <label className="relative sm:w-64">
                  <span className="sr-only">Cari program studi</span>
                  <MagnifyingGlassIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={kataKunci}
                    onChange={(event) => setKataKunci(event.target.value)}
                    placeholder="Cari prodi, fakultas, atau domain..."
                    className="field-input pl-9"
                  />
                </label>
              </div>

              {filteredRows.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title={kataKunci ? 'Tidak ada prodi yang cocok' : 'Belum ada website prodi'}
                    description={
                      kataKunci
                        ? 'Coba kata kunci lain, atau kosongkan kolom pencarian.'
                        : 'Tambahkan fakultas dan program studi lewat menu Struktur Organisasi.'
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-bold">Kode</th>
                        <th scope="col" className="px-4 py-3 font-bold">Program Studi</th>
                        <th scope="col" className="px-4 py-3 font-bold">Fakultas</th>
                        <th scope="col" className="px-4 py-3 font-bold">Hostname</th>
                        <th scope="col" className="px-4 py-3 font-bold">Status</th>
                        <th scope="col" className="px-4 py-3 text-right font-bold">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((row) => (
                        <tr key={row.studyProgram.id} className="align-middle transition-colors hover:bg-slate-50/60">
                          <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-700">
                            {row.studyProgram.code}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-900">
                            {row.studyProgram.name}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">{row.studyProgram.faculty.name}</td>
                          <td className="px-4 py-3 text-xs">
                            <span className="font-mono text-[11px] text-slate-700">{row.hostname}</span>
                            {row.isPrimary ? (
                              <span className="ml-1.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                                utama
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            {row.isActive ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                <CheckCircleIcon className="h-3 w-3" aria-hidden="true" /> Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                                <XCircleIcon className="h-3 w-3" aria-hidden="true" /> Nonaktif
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => void handleManage(row)}
                              disabled={switchingId !== null}
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-[8px] bg-[#1e3a8a] px-3 text-xs font-bold text-white transition-colors hover:bg-[#16305f] disabled:opacity-60"
                            >
                              {switchingId === row.studyProgram.id ? 'Beralih…' : 'Kelola Konten'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPortalOverview;
