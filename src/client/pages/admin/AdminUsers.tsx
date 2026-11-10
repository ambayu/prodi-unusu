import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { useSiteStore } from '../../app/siteStore';
import { userApi, type ManagedUser } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';

/** Pengelolaan akun dan pemberian peran pada program studi. */
export const AdminUsers: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has, isSuperAdmin } = usePermission();
  const activeTenantId = useSiteStore((state) => state.activeTenantId);

  const [createOpen, setCreateOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<ManagedUser | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ userId: number; assignmentId: number } | null>(null);

  const [account, setAccount] = useState({ name: '', email: '', username: '', password: '' });
  const [roleDraft, setRoleDraft] = useState({ roleCode: 'EDITOR', permissionGroupCode: '' });

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => userApi.list().then((res) => res.data.users),
  });

  const rolesQuery = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => userApi.roles().then((res) => res.data.roles),
  });

  const groupsQuery = useQuery({
    queryKey: ['admin', 'permission-groups'],
    queryFn: () => userApi.permissionGroups().then((res) => res.data.groups),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  const createMutation = useMutation({
    mutationFn: () => userApi.create(account),
    onSuccess: () => {
      toast.success('Akun berhasil dibuat.');
      setCreateOpen(false);
      setAccount({ name: '', email: '', username: '', password: '' });
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      userApi.assignRole(roleTarget!.id, {
        roleCode: roleDraft.roleCode,
        scopeType: isSuperAdmin && !activeTenantId ? 'global' : 'prodi',
        studyProgramId: activeTenantId,
        permissionGroupCodes: roleDraft.permissionGroupCode ? [roleDraft.permissionGroupCode] : [],
      }),
    onSuccess: () => {
      toast.success('Peran berhasil diberikan.');
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

  const editorGroups = (groupsQuery.data ?? []).filter((group) => group.code.startsWith('EDITOR_'));

  return (
    <AdminLayout
      title="Pengguna & Editor"
      description={
        isSuperAdmin
          ? 'Super Admin dapat melihat seluruh akun lintas program studi.'
          : 'Akun yang ditampilkan hanya yang ditugaskan pada program studi ini.'
      }
      actions={
        has('users.create') ? (
          <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary">
            <UserPlusIcon className="h-4 w-4" />
            Buat Akun
          </button>
        ) : null
      }
    >
      {usersQuery.isLoading ? (
        <LoadingState label="Memuat pengguna" />
      ) : usersQuery.isError ? (
        <ErrorState message={toApiError(usersQuery.error).message} onRetry={() => void usersQuery.refetch()} />
      ) : (usersQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="Belum ada akun terdaftar"
          description="Buat akun editor agar pengelolaan konten dapat didelegasikan tanpa membagikan akses administrator."
          action={
            has('users.create') ? (
              <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary">
                <UserPlusIcon className="h-4 w-4" />
                Buat Akun
              </button>
            ) : null
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Peran &amp; Cakupan</th>
                <th>Status</th>
                <th>Login Terakhir</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(usersQuery.data ?? []).map((user) => (
                <tr key={user.id}>
                  <td>
                    <span className="block font-bold text-slate-900">{user.name}</span>
                    <span className="block text-[11px] text-slate-500">
                      {user.username} • {user.email}
                    </span>
                  </td>
                  <td>
                    {user.userRoles.length === 0 ? (
                      <span className="text-[11px] italic text-amber-700">Belum punya peran</span>
                    ) : (
                      <div className="space-y-1">
                        {user.userRoles.map((assignment) => (
                          <div key={assignment.id} className="flex items-center gap-1.5">
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-[#1e3a8a]">
                              {assignment.role.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {assignment.studyProgram?.name ?? assignment.faculty?.name ?? 'Global'}
                            </span>
                            {assignment.UserRolePermissionGroup.length > 0 ? (
                              <span className="text-[10px] text-slate-400">
                                ({assignment.UserRolePermissionGroup.length} grup)
                              </span>
                            ) : null}
                            {has('users.assign_role') ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setRevokeTarget({ userId: user.id, assignmentId: assignment.id })
                                }
                                className="text-rose-600 hover:text-rose-800"
                                aria-label={`Cabut peran ${assignment.role.name} dari ${user.name}`}
                              >
                                <TrashIcon className="h-3 w-3" />
                              </button>
                            ) : null}
                          </div>
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
                    <div className="flex justify-end">
                      {has('users.assign_role') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setRoleTarget(user);
                            setRoleDraft({ roleCode: 'EDITOR', permissionGroupCode: '' });
                          }}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                        >
                          <PlusIcon className="h-3 w-3" /> Peran
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormModal
        open={createOpen}
        title="Buat Akun Baru"
        description="Akun baru belum memiliki peran sampai Anda memberikannya pada tabel pengguna."
        busy={createMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
      >
        <Field label="Nama lengkap" htmlFor="user-name" required>
          <input
            id="user-name"
            className="field-input"
            required
            value={account.name}
            onChange={(event) => setAccount({ ...account, name: event.target.value })}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="user-email" required>
            <input
              id="user-email"
              type="email"
              className="field-input"
              required
              value={account.email}
              onChange={(event) => setAccount({ ...account, email: event.target.value })}
            />
          </Field>
          <Field label="Nama pengguna" htmlFor="user-username" required>
            <input
              id="user-username"
              className="field-input font-mono"
              required
              value={account.username}
              onChange={(event) => setAccount({ ...account, username: event.target.value.toLowerCase() })}
            />
          </Field>
        </div>

        <Field
          label="Kata sandi awal"
          htmlFor="user-password"
          required
          hint="Minimal 10 karakter, memuat huruf besar, huruf kecil, dan angka."
        >
          <input
            id="user-password"
            type="password"
            className="field-input"
            required
            value={account.password}
            onChange={(event) => setAccount({ ...account, password: event.target.value })}
          />
        </Field>
      </FormModal>

      <FormModal
        open={roleTarget !== null}
        title="Berikan Peran"
        description={roleTarget?.name}
        busy={assignMutation.isPending}
        onClose={() => setRoleTarget(null)}
        onSubmit={(event) => {
          event.preventDefault();
          assignMutation.mutate();
        }}
      >
        <Field label="Peran" htmlFor="role-code" required>
          <select
            id="role-code"
            className="field-input"
            value={roleDraft.roleCode}
            onChange={(event) => setRoleDraft({ ...roleDraft, roleCode: event.target.value })}
          >
            {(rolesQuery.data ?? []).map((role) => (
              <option key={role.code} value={role.code}>
                {role.name}
              </option>
            ))}
          </select>
        </Field>

        {roleDraft.roleCode === 'EDITOR' ? (
          <Field
            label="Grup izin editor"
            htmlFor="role-group"
            hint="Menentukan modul yang boleh dikelola editor ini, misalnya hanya berita."
          >
            <select
              id="role-group"
              className="field-input"
              value={roleDraft.permissionGroupCode}
              onChange={(event) => setRoleDraft({ ...roleDraft, permissionGroupCode: event.target.value })}
            >
              <option value="">Tanpa grup (belum ada akses konten)</option>
              {editorGroups.map((group) => (
                <option key={group.code} value={group.code}>
                  {group.name} ({group.items.length} izin)
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <p className="rounded-xl bg-slate-50 px-4 py-3 text-[11px] leading-relaxed text-slate-600">
          Peran diberikan pada cakupan program studi yang sedang aktif. Pengguna hanya dapat mengelola data
          prodi tersebut, dan backend menolak akses ke prodi lain meskipun ID diubah manual.
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
    </AdminLayout>
  );
};

export default AdminUsers;
