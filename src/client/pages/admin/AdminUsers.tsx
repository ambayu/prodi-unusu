import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckBadgeIcon,
  NoSymbolIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { useSiteStore } from '../../app/siteStore';
import { organizationApi, userApi, type ManagedUser } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';
import { ASSIGNABLE_ROLE_CODES } from '../../../shared/constants/sso';

/** Membaca JSON kolom SSO tanpa membuat halaman gagal render bila isinya rusak. */
function bacaJson<T>(nilai: string | null, cadangan: T): T {
  if (!nilai) return cadangan;
  try {
    return JSON.parse(nilai) as T;
  } catch {
    return cadangan;
  }
}

/**
 * Menampilkan peran SSO dalam bentuk yang mudah dibaca.
 *
 * Portal pusat mengirim kode mentah seperti "DOSEN" atau "MAHASISWA". Admin
 * hanya perlu tahu peran apa yang dimiliki pemilik akun, bukan bentuk teknisnya.
 */
function labelPeranSso(kode: string): string {
  const peta: Record<string, string> = {
    SUPERADMIN: 'Super Admin',
    ADMIN_SSO: 'Admin SSO',
    DOSEN: 'Dosen',
    MAHASISWA: 'Mahasiswa',
    TENDIK: 'Tenaga Kependidikan',
  };
  return peta[kode] ?? kode;
}

/**
 * Pengelolaan akun dan pemberian peran pada program studi.
 *
 * Akun tidak dibuat di halaman ini. Seluruh akun berasal dari SSO ONE UNUSU,
 * lalu admin meninjau jejak perannya di portal pusat sebelum memberi peran
 * aplikasi. Peran yang dapat diberikan hanya Admin Utama dan Admin Prodi.
 */
export const AdminUsers: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has, isSuperAdmin } = usePermission();
  const activeTenantId = useSiteStore((state) => state.activeTenantId);

  const [roleTarget, setRoleTarget] = useState<ManagedUser | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ userId: number; assignmentId: number } | null>(null);
  const [disableTarget, setDisableTarget] = useState<ManagedUser | null>(null);

  const [roleDraft, setRoleDraft] = useState<{
    roleCode: string;
    studyProgramId: string;
    permissionGroupCode: string;
  }>({ roleCode: 'ADMIN_PRODI', studyProgramId: '', permissionGroupCode: '' });

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => userApi.list().then((res) => res.data.users),
  });

  const groupsQuery = useQuery({
    queryKey: ['admin', 'permission-groups'],
    queryFn: () => userApi.permissionGroups().then((res) => res.data.groups),
  });

  // Daftar prodi untuk menugaskan Admin Prodi. Hanya dimuat bila diperlukan.
  const prodisQuery = useQuery({
    queryKey: ['admin', 'users', 'study-programs'],
    queryFn: () => organizationApi.studyPrograms().then((res) => res.data.studyPrograms),
    enabled: roleTarget !== null,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  const assignMutation = useMutation({
    mutationFn: () => {
      const adminUtama = roleDraft.roleCode === 'SUPER_ADMIN';
      return userApi.assignRole(roleTarget!.id, {
        roleCode: roleDraft.roleCode,
        // Admin Utama berlaku lintas prodi; Admin Prodi wajib terikat satu prodi.
        scopeType: adminUtama ? 'global' : 'prodi',
        studyProgramId: adminUtama ? null : Number(roleDraft.studyProgramId),
        permissionGroupCodes: roleDraft.permissionGroupCode ? [roleDraft.permissionGroupCode] : [],
      });
    },
    onSuccess: () => {
      toast.success('Peran berhasil diberikan. Pengguna dapat masuk ke portal.');
      setRoleTarget(null);
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (target: { userId: number; assignmentId: number }) =>
      userApi.revokeRole(target.userId, target.assignmentId),
    onSuccess: () => {
      toast.success('Peran berhasil dicabut. Pengguna perlu masuk ulang.');
      setRevokeTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const disableMutation = useMutation({
    mutationFn: (id: number) => userApi.deactivate(id),
    onSuccess: () => {
      toast.success('Akun dinonaktifkan dan tidak dapat masuk lagi.');
      setDisableTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => userApi.activate(id),
    onSuccess: () => {
      toast.success('Akun diaktifkan kembali.');
      invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const akun = usersQuery.data ?? [];

  /** Akun tanpa peran berarti baru masuk lewat SSO dan menunggu validasi. */
  const menungguValidasi = useMemo(() => akun.filter((user) => user.userRoles.length === 0), [akun]);

  const editorGroups = (groupsQuery.data ?? []).filter((group) => group.code.startsWith('EDITOR_'));

  const bukaDialogPeran = (user: ManagedUser) => {
    setRoleTarget(user);
    setRoleDraft({
      roleCode: 'ADMIN_PRODI',
      // Prodi aktif dijadikan nilai awal agar admin tidak salah pilih.
      studyProgramId: activeTenantId ? String(activeTenantId) : '',
      permissionGroupCode: '',
    });
  };

  return (
    <AdminLayout
      title="Pengguna & Editor"
      description={
        isSuperAdmin
          ? 'Seluruh akun berasal dari SSO ONE UNUSU. Tinjau peran portal pusat, lalu berikan peran aplikasi.'
          : 'Akun yang ditampilkan hanya yang ditugaskan pada program studi ini.'
      }
    >
      {/*
        Penjelasan asal akun. Dulu ada tombol "Buat Akun", padahal akun dengan
        kata sandi lokal tidak mencerminkan data kepegawaian resmi dan bisa
        dipakai masuk tanpa melewati portal pusat.
      */}
      <div className="mb-4 flex items-start gap-3 rounded-[14px] border border-[#CBD5E1] bg-blue-50/60 px-4 py-3">
        <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#1e3a8a]" />
        <div className="text-[11px] leading-relaxed text-slate-700">
          <p className="font-bold text-[#1e3a8a]">Akun dibuat otomatis oleh SSO ONE UNUSU</p>
          <p className="mt-0.5">
            Tidak ada pembuatan akun manual di halaman ini. Pengguna masuk sekali lewat SSO, lalu muncul pada
            tabel menunggu validasi. Peran yang dapat diberikan hanya Admin Utama dan Admin Prodi.
          </p>
          {menungguValidasi.length > 0 ? (
            <p className="mt-1 font-bold text-amber-800">
              {menungguValidasi.length} akun sedang menunggu validasi.
            </p>
          ) : null}
        </div>
      </div>

      {usersQuery.isLoading ? (
        <LoadingState label="Memuat pengguna" />
      ) : usersQuery.isError ? (
        <ErrorState message={toApiError(usersQuery.error).message} onRetry={() => void usersQuery.refetch()} />
      ) : akun.length === 0 ? (
        <EmptyState
          title="Belum ada akun terdaftar"
          description="Akun muncul di sini setelah pengguna masuk minimal satu kali melalui SSO ONE UNUSU. Setelah itu Anda dapat memberikan akses Admin Utama atau Admin Prodi."
        />
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Peran SSO</th>
                <th>Peran Aplikasi</th>
                <th>Cakupan</th>
                <th>Status</th>
                <th>Login Terakhir</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {akun.map((user) => {
                /*
                 * `ssoRoles` menyimpan seluruh peran dari portal pusat. Bila akun
                 * dibuat sebelum kolom itu ada, `ssoRole` tunggal tetap dipakai
                 * sebagai cadangan agar peran tidak tampil kosong.
                 */
                const daftarPeran = bacaJson<string[]>(user.ssoRoles, []);
                const peranSso = daftarPeran.length > 0 ? daftarPeran : user.ssoRole ? [user.ssoRole] : [];
                const belumDivalidasi = user.userRoles.length === 0;

                return (
                  <tr key={user.id}>
                    {/* Kolom 1: identitas akun saja. */}
                    <td>
                      <span className="block font-bold text-slate-900">{user.name}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-500">{user.username}</span>
                      <span className="block text-[11px] text-slate-400">{user.email}</span>
                    </td>

                    {/* Kolom 2: peran dari portal pusat, sebagai dasar validasi. */}
                    <td>
                      {peranSso.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {peranSso.map((kode) => (
                            <span
                              key={kode}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700"
                            >
                              {labelPeranSso(kode)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-slate-400">Belum ada data SSO</span>
                      )}
                    </td>

                    {/* Kolom 3: peran yang diberikan admin prodi. */}
                    <td>
                      {belumDivalidasi ? (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                          Menunggu validasi
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.userRoles.map((assignment) => (
                            <span
                              key={assignment.id}
                              className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-[#1e3a8a]"
                            >
                              {assignment.role.name}
                              {has('users.assign_role') ? (
                                <button
                                  type="button"
                                  onClick={() => setRevokeTarget({ userId: user.id, assignmentId: assignment.id })}
                                  className="text-rose-600 hover:text-rose-800"
                                  aria-label={`Cabut peran ${assignment.role.name} dari ${user.name}`}
                                >
                                  <TrashIcon className="h-3 w-3" />
                                </button>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Kolom 4: batas wilayah kerja tiap peran. */}
                    <td>
                      {belumDivalidasi ? (
                        <span className="text-[11px] italic text-slate-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.userRoles.map((assignment) => (
                            <span
                              key={assignment.id}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                            >
                              {assignment.studyProgram
                                ? assignment.studyProgram.name
                                : assignment.faculty
                                  ? assignment.faculty.name
                                  : 'Seluruh prodi'}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {user.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>

                    <td className="text-[11px] text-slate-500">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })
                        : 'Belum pernah'}
                    </td>

                    <td>
                      <div className="flex justify-end gap-1.5">
                        {has('users.assign_role') ? (
                          <button
                            type="button"
                            onClick={() => bukaDialogPeran(user)}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                          >
                            <PlusIcon className="h-3 w-3" /> Peran
                          </button>
                        ) : null}

                        {has('users.disable') ? (
                          user.isActive ? (
                            <button
                              type="button"
                              onClick={() => setDisableTarget(user)}
                              className="inline-flex items-center gap-1 rounded border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700 hover:bg-rose-50"
                            >
                              <NoSymbolIcon className="h-3 w-3" /> Nonaktifkan
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => activateMutation.mutate(user.id)}
                              disabled={activateMutation.isPending}
                              className="inline-flex items-center gap-1 rounded border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              <CheckBadgeIcon className="h-3 w-3" /> Aktifkan
                            </button>
                          )
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <FormModal
        open={roleTarget !== null}
        title="Berikan Peran"
        description={roleTarget?.name}
        busy={assignMutation.isPending}
        onClose={() => setRoleTarget(null)}
        onSubmit={(event) => {
          event.preventDefault();
          if (roleDraft.roleCode === 'ADMIN_PRODI' && !roleDraft.studyProgramId) {
            toast.error('Pilih program studi untuk Admin Prodi.');
            return;
          }
          assignMutation.mutate();
        }}
      >
        <Field
          label="Peran"
          htmlFor="role-code"
          required
          hint="Hanya dua peran yang tersedia sesuai kebijakan akses portal prodi."
        >
          <select
            id="role-code"
            className="field-input"
            value={roleDraft.roleCode}
            onChange={(event) => setRoleDraft({ ...roleDraft, roleCode: event.target.value })}
          >
            {ASSIGNABLE_ROLE_CODES.map((code) => (
              <option key={code} value={code}>
                {code === 'SUPER_ADMIN' ? 'Admin Utama (seluruh program studi)' : 'Admin Prodi (satu program studi)'}
              </option>
            ))}
          </select>
        </Field>

        {roleDraft.roleCode === 'ADMIN_PRODI' ? (
          <Field
            label="Program studi"
            htmlFor="role-prodi"
            required
            hint="Pengguna hanya dapat mengelola data program studi ini."
          >
            <select
              id="role-prodi"
              className="field-input"
              required
              value={roleDraft.studyProgramId}
              onChange={(event) => setRoleDraft({ ...roleDraft, studyProgramId: event.target.value })}
            >
              <option value="">— Pilih program studi —</option>
              {(prodisQuery.data ?? []).map((prodi) => (
                <option key={prodi.id} value={String(prodi.id)}>
                  {prodi.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {/* Grup izin hanya relevan bila kelak Editor diaktifkan kembali. */}
        {roleDraft.roleCode === 'EDITOR' ? (
          <Field label="Grup izin editor" htmlFor="role-group">
            <select
              id="role-group"
              className="field-input"
              value={roleDraft.permissionGroupCode}
              onChange={(event) => setRoleDraft({ ...roleDraft, permissionGroupCode: event.target.value })}
            >
              <option value="">Tanpa grup</option>
              {editorGroups.map((group) => (
                <option key={group.code} value={group.code}>
                  {group.name} ({group.items.length} izin)
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <p className="rounded-xl bg-slate-50 px-4 py-3 text-[11px] leading-relaxed text-slate-600">
          Keanggotaan SSO hanya menentukan boleh-tidaknya akun masuk ke portal. Peran aplikasi tetap ditentukan di
          sini, dan backend menolak akses ke prodi lain meskipun ID diubah manual.
        </p>
      </FormModal>

      <ConfirmDialog
        open={revokeTarget !== null}
        title="Cabut peran"
        description="Pengguna akan kehilangan akses sesuai peran ini dan seluruh sesinya dicabut sehingga harus masuk ulang."
        confirmLabel="Cabut Peran"
        busy={revokeMutation.isPending}
        onConfirm={() => {
          if (revokeTarget) revokeMutation.mutate(revokeTarget);
        }}
        onCancel={() => setRevokeTarget(null)}
      />

      <ConfirmDialog
        open={disableTarget !== null}
        title="Nonaktifkan akun"
        description={
          disableTarget
            ? `Akun ${disableTarget.name} akan dinonaktifkan dan seluruh sesinya dicabut. Ia tidak dapat masuk lagi melalui SSO sampai diaktifkan kembali. Peran dan riwayatnya tetap tersimpan.`
            : ''
        }
        confirmLabel="Nonaktifkan Akun"
        busy={disableMutation.isPending}
        onConfirm={() => {
          if (disableTarget) disableMutation.mutate(disableTarget.id);
        }}
        onCancel={() => setDisableTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminUsers;
