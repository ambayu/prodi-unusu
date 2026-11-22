import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InboxIcon,
  NewspaperIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { usePermission, useTenant } from '../../hooks/useSite';
import { useSiteStore } from '../../app/siteStore';
import { dashboardApi } from '../../services/adminApi';
import { toApiError } from '../../services/api';

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Menambahkan',
  UPDATE: 'Memperbarui',
  DELETE: 'Menghapus',
  PUBLISH: 'Memublikasikan',
  UNPUBLISH: 'Menarik publikasi',
  LOGIN: 'Masuk ke sistem',
};

const MODULE_LABELS: Record<string, string> = {
  BUILDER: 'Page Builder',
  POSTS: 'Berita',
  CURRICULUM: 'Kurikulum',
  LECTURERS: 'Dosen',
  FACILITIES: 'Sarana & Prasarana',
  GALLERIES: 'Galeri',
  DOCUMENTS: 'Dokumen',
  SETTINGS: 'Pengaturan Website',
  LMS: 'Perkuliahan LMS',
  CONTACTS: 'Kontak',
  MEDIA: 'Media',
  USERS: 'Pengguna',
};

function formatAuditLabel(action: string, module: string): string {
  const act = ACTION_LABELS[action.toUpperCase()] ?? action;
  const mod = MODULE_LABELS[module.toUpperCase()] ?? module.toLowerCase();
  return `${act} ${mod}`;
}

export const Dashboard: React.FC = () => {
  const { tenant } = useTenant();
  const { isSuperAdmin, user } = usePermission();
  const portalScope = useSiteStore((state) => state.portalScope);
  const activeTenantId = useSiteStore((state) => state.activeTenantId);

  /**
   * Saat scope PORTAL aktif, dashboard prodi tidak relevan karena semua metrik
   * milik satu program studi. Super Admin diarahkan ke Dashboard Portal.
   */
  const inPortalScope = (portalScope || activeTenantId === null) && isSuperAdmin;

  const statsQuery = useQuery({
    queryKey: ['admin', 'dashboard', activeTenantId],
    queryFn: () => dashboardApi.stats().then((res) => res.data),
    enabled: !inPortalScope,
  });

  if (inPortalScope) {
    return <Navigate to="/admin/portal-utama" replace />;
  }

  const stats = statsQuery.data?.stats;
  const classrooms = stats?.classrooms;
  const lmsAttentionCount =
    (classrooms?.withoutLecturer ?? 0) + (classrooms?.withoutSchedule ?? 0);
  const actionTotal = (stats?.unreadMessages ?? 0) + (stats?.postsDraft ?? 0);

  return (
    <AdminLayout
      title={`Selamat Datang, ${user?.name ?? 'Administrator'}`}
      description={`Ringkasan penting akademik, perkuliahan LMS, dan publikasi ${tenant?.name ?? 'Program Studi'}.`}
      actions={
        <Link
          to="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:border-[#1e3a8a]/40 hover:text-[#1e3a8a]"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4 text-[#1e3a8a]" />
          <span>Website Publik</span>
        </Link>
      }
    >
      {statsQuery.isLoading ? (
        <LoadingState label="Memuat ringkasan dashboard" rows={3} />
      ) : statsQuery.isError ? (
        <ErrorState
          message={toApiError(statsQuery.error).message}
          onRetry={() => void statsQuery.refetch()}
        />
      ) : stats ? (
        <div className="space-y-5">
          {/* 1. Ringkasan Program Studi */}
          <section className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-[#1e3a8a] via-[#1b357d] to-[#13265c] text-white shadow-sm">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#fbbf24]/20 blur-2xl"
            />
            <div className="relative flex flex-col sm:flex-row sm:items-stretch sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-col justify-center p-5 sm:p-6">
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#fbbf24]">
                  <AcademicCapIcon className="h-3.5 w-3.5" />
                  <span>{tenant?.facultyName ?? 'Program Studi Aktif'}</span>
                </div>
                <h2 className="mt-2 truncate text-lg font-extrabold tracking-tight text-white sm:text-xl">
                  {tenant?.name ?? 'Ringkasan Akademik'}
                </h2>
                <p className="mt-1 text-xs text-blue-100/85">
                  {stats.semesters} semester aktif pada kurikulum program studi · {stats.postsPublished} berita terbit
                </p>
              </div>

              <div className="relative flex shrink-0 items-end justify-end px-5 sm:px-6 sm:pt-3">
                <img
                  src="/assets/tentang/students-duo.png"
                  alt="Mahasiswa Universitas Nahdlatul Ulama Sumatera Utara"
                  className="h-32 w-auto select-none object-contain object-bottom drop-shadow-[0_10px_18px_rgba(0,0,0,0.28)] sm:h-36 md:h-40"
                />
              </div>
            </div>
          </section>

          {/* 2. Ringkasan LMS & Perlu Tindakan */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Kesiapan Perkuliahan LMS */}
            <section className="flex flex-col rounded-[16px] border border-[#CBD5E1] bg-white p-5 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#eff6ff] text-[#1e3a8a]">
                    <CalendarDaysIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Kesiapan Perkuliahan LMS</h3>
                    <p className="text-[11px] text-slate-500">
                      {classrooms?.total ?? 0} kelas kurikulum aktif
                    </p>
                  </div>
                </div>
                <Link
                  to="/admin/lms/jadwal"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#1e3a8a]/25 bg-white px-2.5 py-1 text-[11px] font-bold text-[#1e3a8a] transition-colors hover:border-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
                >
                  Atur Jadwal
                  <ArrowRightIcon className="h-3 w-3" />
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <Link
                  to="/admin/lms/jadwal"
                  className={`rounded-[12px] border p-3.5 transition-colors ${
                    (classrooms?.withoutLecturer ?? 0) > 0
                      ? 'border-amber-200 bg-amber-50/70 hover:bg-amber-50'
                      : 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50'
                  }`}
                >
                  <p className="text-[11px] font-semibold text-slate-600">Belum ada dosen</p>
                  <p
                    className={`mt-1 text-2xl font-black tabular-nums ${
                      (classrooms?.withoutLecturer ?? 0) > 0 ? 'text-amber-900' : 'text-emerald-800'
                    }`}
                  >
                    {(classrooms?.withoutLecturer ?? 0).toLocaleString('id-ID')}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                    {(classrooms?.withoutLecturer ?? 0) > 0 ? 'Perlu tetapkan pengampu' : 'Semua kelas punya dosen'}
                  </p>
                </Link>

                <Link
                  to="/admin/lms/jadwal"
                  className={`rounded-[12px] border p-3.5 transition-colors ${
                    (classrooms?.withoutSchedule ?? 0) > 0
                      ? 'border-amber-200 bg-amber-50/70 hover:bg-amber-50'
                      : 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50'
                  }`}
                >
                  <p className="text-[11px] font-semibold text-slate-600">Belum ada jadwal</p>
                  <p
                    className={`mt-1 text-2xl font-black tabular-nums ${
                      (classrooms?.withoutSchedule ?? 0) > 0 ? 'text-amber-900' : 'text-emerald-800'
                    }`}
                  >
                    {(classrooms?.withoutSchedule ?? 0).toLocaleString('id-ID')}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                    {(classrooms?.withoutSchedule ?? 0) > 0 ? 'Hari & jam belum diisi' : 'Semua kelas terjadwal'}
                  </p>
                </Link>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                {lmsAttentionCount === 0 && (classrooms?.total ?? 0) > 0 ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Seluruh kelas kurikulum aktif sudah memiliki dosen dan jadwal.</span>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      {(classrooms?.total ?? 0) === 0
                        ? 'Belum ada mata kuliah pada kurikulum aktif.'
                        : `${classrooms?.withoutStudents ?? 0} kelas belum memiliki peserta mahasiswa.`}
                    </span>
                  </>
                )}
              </div>
            </section>

            {/* Perlu Tindakan */}
            <section className="flex flex-col rounded-[16px] border border-[#CBD5E1] bg-white p-5 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-amber-50 text-amber-800">
                    <InboxIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Perlu Tindakan</h3>
                    <p className="text-[11px] text-slate-500">
                      {actionTotal > 0 ? `${actionTotal} item menunggu ditinjau` : 'Semua antrean bersih'}
                    </p>
                  </div>
                </div>
                {actionTotal > 0 ? (
                  <span className="rounded-full bg-[#fbbf24] px-2.5 py-0.5 text-[11px] font-extrabold tabular-nums text-[#1e3a8a]">
                    {actionTotal}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                    Beres
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2.5">
                <Link
                  to="/admin/pesan"
                  className="group flex items-center justify-between gap-3 rounded-[12px] border border-slate-200 bg-slate-50/60 px-3.5 py-3 transition-colors hover:border-[#1e3a8a]/35 hover:bg-white"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-xs font-black tabular-nums ${
                        stats.unreadMessages > 0
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-200/70 text-slate-500'
                      }`}
                    >
                      {stats.unreadMessages}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">
                        Pesan Kontak Belum Dibaca
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {stats.unreadMessages > 0
                          ? 'Pertanyaan pengunjung dari halaman kontak publik'
                          : 'Tidak ada pesan baru yang menunggu'}
                      </p>
                    </div>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#1e3a8a]" />
                </Link>

                <Link
                  to="/admin/berita"
                  className="group flex items-center justify-between gap-3 rounded-[12px] border border-slate-200 bg-slate-50/60 px-3.5 py-3 transition-colors hover:border-[#1e3a8a]/35 hover:bg-white"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-xs font-black tabular-nums ${
                        stats.postsDraft > 0
                          ? 'bg-blue-100 text-[#1e3a8a]'
                          : 'bg-slate-200/70 text-slate-500'
                      }`}
                    >
                      {stats.postsDraft}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">
                        Berita Draf Menunggu Terbit
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {stats.postsDraft > 0
                          ? `${stats.postsPublished} berita sudah terbit di website`
                          : `Seluruh ${stats.postsPublished} berita sudah dipublikasikan`}
                      </p>
                    </div>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#1e3a8a]" />
                </Link>
              </div>
            </section>
          </div>

          {/* 3. Berita Terbaru & Aktivitas Terakhir */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-[16px] border border-[#CBD5E1] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <NewspaperIcon className="h-4 w-4 text-[#1e3a8a]" />
                  <h3 className="text-sm font-bold text-slate-900">Berita Terbaru</h3>
                </div>
                <Link
                  to="/admin/berita"
                  className="text-xs font-bold text-[#1e3a8a] hover:underline"
                >
                  Lihat semua
                </Link>
              </div>

              {statsQuery.data?.recentPosts.length ? (
                <ul className="mt-2 divide-y divide-slate-100">
                  {statsQuery.data.recentPosts.slice(0, 5).map((post) => (
                    <li key={post.id}>
                      <Link
                        to={`/admin/berita/${post.id}/ubah`}
                        className="group flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-[#1e3a8a]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-800 group-hover:text-[#1e3a8a]">
                            {post.title}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            Diperbarui{' '}
                            {new Date(post.updatedAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                            post.status === 'published'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-800'
                          }`}
                        >
                          {post.status === 'published' ? 'Terbit' : 'Draf'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="pt-4">
                  <EmptyState
                    title="Belum ada berita"
                    description="Berita yang Anda buat akan muncul di sini."
                  />
                </div>
              )}
            </section>

            <section className="rounded-[16px] border border-[#CBD5E1] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-[#1e3a8a]" />
                  <h3 className="text-sm font-bold text-slate-900">Aktivitas Terakhir</h3>
                </div>
                <span className="text-[11px] font-medium text-slate-400">6 terbaru</span>
              </div>

              {statsQuery.data?.recentAudit.length ? (
                <ul className="mt-3 space-y-3">
                  {statsQuery.data.recentAudit.slice(0, 6).map((entry) => (
                    <li key={entry.id} className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#1e3a8a]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {formatAuditLabel(entry.action, entry.module)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {entry.user?.name ?? 'Sistem'} ·{' '}
                          {new Date(entry.createdAt).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="pt-4">
                  <EmptyState
                    title="Belum ada aktivitas"
                    description="Setiap perubahan data di panel ini tercatat otomatis di sini."
                  />
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
};
