import React from 'react';
import { Link } from 'react-router-dom';
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
import { dashboardApi } from '../../services/adminApi';
import { toApiError } from '../../services/api';

/** Satu kartu metrik dashboard. Nilai selalu berasal dari database. */
const MetricCard: React.FC<{
  label: string;
  value: number;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}> = ({ label, value, detail, icon: Icon }) => (
  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5">
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value.toLocaleString('id-ID')}</p>
      <p className="mt-0.5 text-[11px] font-bold text-[#1e3a8a]">{detail}</p>
    </div>
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1e3a8a]">
      <Icon className="h-6 w-6" />
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const { tenant, isMainUniversityWebsite } = useTenant();
  const { isSuperAdmin, user } = usePermission();

  const statsQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => dashboardApi.stats().then((res) => res.data),
  });

  const superQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'super'],
    queryFn: () => dashboardApi.superStats().then((res) => res.data),
    enabled: isSuperAdmin,
  });

  const stats = statsQuery.data?.stats;
  const superStats = superQuery.data?.stats;

  return (
    <AdminLayout
      title={`Selamat datang, ${user?.name ?? 'Administrator'}`}
      description={
        isSuperAdmin
          ? 'Ringkasan seluruh website program studi dan aktivitas administrasi.'
          : `Kelola konten dan desain website ${tenant?.name ?? 'program studi'}.`
      }
      actions={
        <Link
          to="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4 text-slate-500" />
          Buka Website Publik
        </Link>
      }
    >
      {statsQuery.isLoading ? (
        <LoadingState label="Memuat statistik" rows={3} />
      ) : statsQuery.isError ? (
        <ErrorState message={toApiError(statsQuery.error).message} onRetry={() => void statsQuery.refetch()} />
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Mata Kuliah"
              value={stats.courses}
              detail={`${stats.semesters} semester • ${stats.totalCredits} SKS`}
              icon={BookOpenIcon}
            />
            <MetricCard
              label="Dokumen"
              value={stats.documents}
              detail="Repository dokumen dan SOP"
              icon={DocumentTextIcon}
            />
            <MetricCard
              label="Tenaga Pengajar"
              value={stats.lecturers}
              detail="Dosen aktif terdaftar"
              icon={UserGroupIcon}
            />
            <MetricCard
              label="Sarana & Prasarana"
              value={stats.facilities}
              detail="Laboratorium dan fasilitas"
              icon={BuildingOfficeIcon}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Berita Terbit"
              value={stats.postsPublished}
              detail={`${stats.postsDraft} draft menunggu`}
              icon={NewspaperIcon}
            />
            <MetricCard label="Galeri Kegiatan" value={stats.galleries} detail="Album terpublikasi" icon={PhotoIcon} />
            <MetricCard
              label="Pesan Belum Dibaca"
              value={stats.unreadMessages}
              detail="Formulir kontak pengunjung"
              icon={InboxIcon}
            />
            <MetricCard
              label="Halaman Website"
              value={stats.pages}
              detail={`${stats.mediaAssets} aset media`}
              icon={EnvelopeOpenIcon}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-bold text-slate-900">Berita Terbaru</h2>
              {statsQuery.data?.recentPosts.length ? (
                <ul className="mt-4 divide-y divide-slate-100">
                  {statsQuery.data.recentPosts.map((post) => (
                    <li key={post.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
                        {post.title}
                      </span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          post.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {post.status === 'published' ? 'Terbit' : 'Draft'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    title="Belum ada berita"
                    description="Berita yang Anda buat akan muncul di sini beserta status publikasinya."
                  />
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-bold text-slate-900">Aktivitas Terakhir</h2>
              {statsQuery.data?.recentAudit.length ? (
                <ul className="mt-4 space-y-2.5">
                  {statsQuery.data.recentAudit.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-2.5">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1e3a8a]" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-slate-800">
                          {entry.action} {entry.module.toLowerCase()}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {entry.user?.name ?? 'Sistem'} •{' '}
                          {new Date(entry.createdAt).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    title="Belum ada aktivitas"
                    description="Setiap perubahan konten akan tercatat di sini sebagai jejak audit."
                  />
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}

      {isSuperAdmin ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5 text-[#1e3a8a]" />
            <h2 className="text-sm font-bold text-slate-900">Ringkasan Seluruh Universitas</h2>
          </div>

          {superQuery.isLoading ? (
            <div className="mt-4">
              <LoadingState label="Memuat ringkasan universitas" rows={2} />
            </div>
          ) : superQuery.isError ? (
            <div className="mt-4">
              <ErrorState message={toApiError(superQuery.error).message} onRetry={() => void superQuery.refetch()} />
            </div>
          ) : superStats ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {[
                { label: 'Fakultas', value: superStats.faculties, icon: BuildingOfficeIcon },
                { label: 'Program Studi', value: superStats.studyPrograms, icon: AcademicCapIcon },
                { label: 'Domain Aktif', value: superStats.activeDomains, icon: GlobeAltIcon },
                { label: 'Domain Nonaktif', value: superStats.inactiveDomains, icon: GlobeAltIcon },
                { label: 'Pengguna', value: superStats.users, icon: UserGroupIcon },
                { label: 'Berita', value: superStats.totalPosts, icon: NewspaperIcon },
                { label: 'Dokumen', value: superStats.totalDocuments, icon: DocumentTextIcon },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="mt-1 text-lg font-extrabold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status Website</p>
            {superQuery.data?.domains.slice(0, 8).map((domain) => (
              <div
                key={domain.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-bold text-[#1e3a8a]">{domain.hostname}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {domain.studyProgram.code} {domain.studyProgram.name} • {domain.studyProgram.faculty.name}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${
                    domain.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {domain.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </AdminLayout>
  );
};

export default Dashboard;
