import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpenIcon,
  DocumentTextIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ArrowTopRightOnSquareIcon,
  NewspaperIcon,
  PhotoIcon,
  InboxIcon,
  EnvelopeOpenIcon,
  AcademicCapIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { usePermission, useTenant } from '../../hooks/useSite';
import { useSiteStore } from '../../app/siteStore';
import { dashboardApi } from '../../services/adminApi';
import { toApiError } from '../../services/api';

/** Satu kartu metrik dashboard standar UNUSU. */
const MetricCard: React.FC<{
  label: string;
  value: number;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: string;
}> = ({ label, value, detail, icon: Icon, accentColor = 'bg-[#DBEAFE] text-[#1e3a8a]' }) => (
  <div className="flex items-center justify-between rounded-[14px] border border-[#CBD5E1] bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
    <div className="min-w-0 pr-3">
      <p className="text-xs font-semibold text-slate-500 truncate">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
        {value.toLocaleString('id-ID')}
      </p>
      <p className="mt-1 text-[11px] font-bold text-[#1e3a8a] truncate">{detail}</p>
    </div>
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] ${accentColor} shadow-2xs`}>
      <Icon className="h-6 w-6" />
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const { tenant } = useTenant();
  const { isSuperAdmin, user } = usePermission();
  const portalScope = useSiteStore((state) => state.portalScope);
  const activeTenantId = useSiteStore((state) => state.activeTenantId);

  /**
   * Saat scope PORTAL aktif, dashboard prodi tidak relevan: semua metrik di
   * sini (kurikulum, dosen, berita, galeri) milik satu program studi. Pengguna
   * diarahkan ke Dashboard Portal.
   *
   * Redirect hanya dilakukan bila pengguna memang Super Admin — akun prodi
   * tidak pernah masuk scope portal karena tenant-nya selalu terisi.
   */
  const inPortalScope = (portalScope || activeTenantId === null) && isSuperAdmin;

  const statsQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => dashboardApi.stats().then((res) => res.data),
    enabled: !inPortalScope,
  });

  const superQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'super'],
    queryFn: () => dashboardApi.superStats().then((res) => res.data),
    enabled: isSuperAdmin && !inPortalScope,
  });

  const stats = statsQuery.data?.stats;
  const superStats = superQuery.data?.stats;

  // Scope portal punya dashboard sendiri; ringkasan prodi tidak berlaku.
  if (inPortalScope) {
    return <Navigate to="/admin/portal-utama" replace />;
  }

  return (
    <AdminLayout
      title={`Selamat Datang, ${user?.name ?? 'Administrator'}`}
      description={
        isSuperAdmin
          ? 'Ringkasan operasional seluruh website program studi dan tata kelola universitas.'
          : `Kelola konten, profil akademik, dan publikasi website ${tenant?.name ?? 'Program Studi'}.`
      }
      actions={
        <Link
          to="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:text-[#1e3a8a]"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4 text-emerald-700" />
          <span>Buka Website Publik</span>
        </Link>
      }
    >
      {statsQuery.isLoading ? (
        <LoadingState label="Memuat ringkasan data statistik" rows={3} />
      ) : statsQuery.isError ? (
        <ErrorState message={toApiError(statsQuery.error).message} onRetry={() => void statsQuery.refetch()} />
      ) : stats ? (
        <div className="space-y-6">
          {/* Row 1: Metrik Akademik */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              AKADEMIK &amp; SARANA
            </h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Mata Kuliah"
                value={stats.courses}
                detail={`${stats.semesters} semester • ${stats.totalCredits} SKS`}
                icon={BookOpenIcon}
              />
              <MetricCard
                label="Dokumen Mutu &amp; SOP"
                value={stats.documents}
                detail="Repositori dokumen resmi"
                icon={DocumentTextIcon}
              />
              <MetricCard
                label="Tenaga Pengajar"
                value={stats.lecturers}
                detail="Dosen aktif terdaftar"
                icon={UserGroupIcon}
              />
              <MetricCard
                label="Sarana &amp; Fasilitas"
                value={stats.facilities}
                detail="Laboratorium & sarpras prodi"
                icon={BuildingOfficeIcon}
              />
            </div>
          </div>

          {/* Row 2: Metrik Publikasi & Media */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              KONTEN &amp; PUBLIKASI
            </h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Berita Terbit"
                value={stats.postsPublished}
                detail={`${stats.postsDraft} draf menunggu`}
                icon={NewspaperIcon}
                accentColor="bg-emerald-50 text-emerald-700"
              />
              <MetricCard
                label="Galeri Kegiatan"
                value={stats.galleries}
                detail="Album foto kegiatan"
                icon={PhotoIcon}
              />
              <MetricCard
                label="Pesan Kontak Masuk"
                value={stats.unreadMessages}
                detail="Formulir kontak publik"
                icon={InboxIcon}
                accentColor={stats.unreadMessages > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}
              />
              <MetricCard
                label="Halaman &amp; Aset"
                value={stats.pages}
                detail={`${stats.mediaAssets} berkas media`}
                icon={EnvelopeOpenIcon}
              />
            </div>
          </div>

          {/* Row 3: Berita Terbaru & Audit Log */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Berita Terbaru */}
            <section className="rounded-[14px] border border-[#CBD5E1] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]/70">
                <div className="flex items-center gap-2">
                  <NewspaperIcon className="h-4 w-4 text-[#1e3a8a]" />
                  <h3 className="text-sm font-bold text-slate-900">Berita Terbaru</h3>
                </div>
                <Link
                  to="/admin/berita"
                  className="text-xs font-bold text-[#1e3a8a] hover:underline"
                >
                  Kelola Semua
                </Link>
              </div>

              {statsQuery.data?.recentPosts.length ? (
                <ul className="mt-3 divide-y divide-slate-100">
                  {statsQuery.data.recentPosts.map((post) => (
                    <li key={post.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800">
                        {post.title}
                      </span>
                      <span
                        className={`shrink-0 rounded-[6px] px-2 py-0.5 text-[10px] font-bold border ${
                          post.status === 'published'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {post.status === 'published' ? 'Terbit' : 'Draf'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-6">
                  <EmptyState
                    title="Belum ada berita"
                    description="Berita yang Anda publikasikan akan muncul di sini."
                  />
                </div>
              )}
            </section>

            {/* Jejak Audit & Aktivitas */}
            <section className="rounded-[14px] border border-[#CBD5E1] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]/70">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-slate-900">Aktivitas Terakhir</h3>
                </div>
                <span className="text-[11px] font-medium text-slate-400">Jejak Audit</span>
              </div>

              {statsQuery.data?.recentAudit.length ? (
                <ul className="mt-3 space-y-2.5">
                  {statsQuery.data.recentAudit.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-2.5">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#1e3a8a]" />
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-slate-800 truncate">
                          {entry.action} {entry.module.toLowerCase()}
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                          Oleh {entry.user?.name ?? 'Sistem'} •{' '}
                          {new Date(entry.createdAt).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-6">
                  <EmptyState
                    title="Belum ada aktivitas"
                    description="Perubahan data akan tercatat otomatis pada jejak audit sistem."
                  />
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {/* Super Admin Section */}
      {isSuperAdmin && (
        <div className="mt-6 pt-6 border-t border-[#CBD5E1]">
          <section className="rounded-[14px] border border-[#CBD5E1] bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-2 pb-3 border-b border-[#CBD5E1]/70">
              <GlobeAltIcon className="h-5 w-5 text-[#1e3a8a]" />
              <h3 className="text-sm font-bold text-slate-900">Ringkasan Ekosistem Universitas</h3>
            </div>

            {superQuery.isLoading ? (
              <div className="py-6">
                <LoadingState label="Memuat ringkasan data universitas" rows={2} />
              </div>
            ) : superQuery.isError ? (
              <div className="py-4">
                <ErrorState message={toApiError(superQuery.error).message} onRetry={() => void superQuery.refetch()} />
              </div>
            ) : superStats ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {[
                  { label: 'Fakultas', value: superStats.faculties },
                  { label: 'Program Studi', value: superStats.studyPrograms },
                  { label: 'Domain Aktif', value: superStats.activeDomains },
                  { label: 'Domain Nonaktif', value: superStats.inactiveDomains },
                  { label: 'Pengguna', value: superStats.users },
                  { label: 'Berita', value: superStats.totalPosts },
                  { label: 'Dokumen', value: superStats.totalDocuments },
                ].map((item) => (
                  <div key={item.label} className="rounded-[10px] border border-[#CBD5E1]/60 bg-slate-50/70 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {superQuery.data?.domains && (
              <div className="mt-5 space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Status Domain Website</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {superQuery.data.domains.slice(0, 8).map((domain) => (
                    <div
                      key={domain.id}
                      className="flex items-center justify-between gap-2 rounded-[10px] border border-[#CBD5E1]/70 bg-slate-50/50 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono font-bold text-[#1e3a8a]">{domain.hostname}</p>
                        <p className="truncate text-[10px] text-slate-500">
                          {domain.studyProgram.code} - {domain.studyProgram.name}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-[6px] px-2 py-0.5 text-[10px] font-bold border ${
                          domain.isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {domain.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </AdminLayout>
  );
};
