import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheckIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  KeyIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { FormModal, Field } from '../../components/ui/FormModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { rbacApi, type RoleItem } from '../../services/rbacApi';
import { toApiError } from '../../services/api';

export const AdminRoles: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isSuperAdmin } = usePermission();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleItem | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Query daftar roles
  const rolesQuery = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => rbacApi.getRoles().then((res) => res.data.roles),
  });

  // Query daftar permissions untuk modal
  const permissionsQuery = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => rbacApi.getPermissions().then((res) => res.data),
    enabled: formOpen,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingRole) {
        return rbacApi.updateRole(editingRole.id, {
          name,
          description,
          permissionCodes: selectedPermissions,
        });
      }
      return rbacApi.createRole({
        code,
        name,
        description,
        permissionCodes: selectedPermissions,
      });
    },
    onSuccess: () => {
      toast.success(editingRole ? 'Peran berhasil diperbarui.' : 'Peran baru berhasil dibuat.');
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rbacApi.deleteRole(id),
    onSuccess: () => {
      toast.success('Peran berhasil dihapus.');
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const openCreate = () => {
    setEditingRole(null);
    setCode('');
    setName('');
    setDescription('');
    setSelectedPermissions([]);
    setFormOpen(true);
  };

  const openEdit = async (role: RoleItem) => {
    setEditingRole(role);
    setCode(role.code);
    setName(role.name);
    setDescription(role.description ?? '');
    try {
      const res = await rbacApi.getRole(role.id);
      setSelectedPermissions(res.data.role.permissions?.map((p) => p.code) ?? []);
    } catch {
      setSelectedPermissions([]);
    }
    setFormOpen(true);
  };

  const togglePermission = (permCode: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permCode) ? prev.filter((c) => c !== permCode) : [...prev, permCode]
    );
  };

  const toggleAllModule = (modulePermCodes: string[]) => {
    const allSelected = modulePermCodes.every((c) => selectedPermissions.includes(c));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((c) => !modulePermCodes.includes(c)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...modulePermCodes])));
    }
  };

  return (
    <AdminLayout
      title="Manajemen Peran (Roles)"
      description="Daftar peran pengguna sistem dan alokasi hak akses izin yang melekat."
      actions={
        isSuperAdmin ? (
          <button
            type="button"
            onClick={openCreate}
            className="btn-primary"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Tambah Peran Baru</span>
          </button>
        ) : null
      }
    >
      {rolesQuery.isLoading ? (
        <LoadingState label="Memuat data peran" rows={4} />
      ) : rolesQuery.isError ? (
        <ErrorState
          message={toApiError(rolesQuery.error).message}
          onRetry={() => void rolesQuery.refetch()}
        />
      ) : (rolesQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="Belum ada peran"
          description="Tambahkan peran untuk mengatur hak akses akun pengguna."
        />
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[#CBD5E1] bg-white shadow-xs">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nama Peran &amp; Kode</th>
                <th>Deskripsi</th>
                <th className="text-center">Jumlah Pengguna</th>
                <th className="text-center">Izin Terpasang</th>
                {isSuperAdmin && <th className="text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {(rolesQuery.data ?? []).map((role) => {
                const isProdiRole = role.code.startsWith('ADMIN_PRODI');
                return (
                  <tr key={role.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${
                            role.code === 'SUPER_ADMIN'
                              ? 'bg-rose-50 text-rose-700'
                              : isProdiRole
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-blue-50 text-[#1e3a8a]'
                          }`}
                        >
                          <ShieldCheckIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs sm:text-sm">{role.name}</p>
                          <p className="font-mono text-[10px] text-slate-500 font-semibold">{role.code}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-xs text-slate-600 line-clamp-2 max-w-sm">
                        {role.description || '-'}
                      </p>
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-[#CBD5E1]/60">
                        <UsersIcon className="h-3 w-3 text-slate-400" />
                        {role.userCount}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#1e3a8a] border border-blue-200">
                        <KeyIcon className="h-3 w-3 text-[#1e3a8a]" />
                        {role.code === 'SUPER_ADMIN' ? 'Semua (*)' : `${role.permissionCount} Izin`}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(role)}
                            className="inline-flex items-center gap-1 p-1.5 text-xs font-bold text-slate-600 hover:text-[#1e3a8a] hover:bg-slate-100 rounded-[8px] transition-colors"
                            title="Edit Peran & Izin"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          {role.code !== 'SUPER_ADMIN' && role.userCount === 0 && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(role)}
                              className="inline-flex items-center gap-1 p-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-[8px] transition-colors"
                              title="Hapus Peran"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah/Edit Role */}
      <FormModal
        open={formOpen}
        title={editingRole ? `Ubah Peran: ${editingRole.name}` : 'Buat Peran Baru'}
        description="Atur nama, deskripsi, dan centang izin-izin akses yang diizinkan untuk peran ini."
        submitLabel={saveMutation.isPending ? 'Menyimpan...' : 'Simpan Peran'}
        busy={saveMutation.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        onClose={() => setFormOpen(false)}
        wide
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Kode Peran" htmlFor="role-code" required hint="Huruf kapital dan garis bawah, misal: ADMIN_PRODI_TIF">
            <input
              id="role-code"
              className="field-input font-mono"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={!!editingRole}
              placeholder="CONTOH_ROLE"
              required
            />
          </Field>
          <Field label="Nama Peran" htmlFor="role-name" required>
            <input
              id="role-name"
              className="field-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Admin Prodi..."
              required
            />
          </Field>
        </div>

        <Field label="Deskripsi Peran" htmlFor="role-desc">
          <textarea
            id="role-desc"
            className="field-textarea min-h-[70px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan cakupan tanggung jawab peran ini..."
          />
        </Field>

        {/* Pemilihan Izin per Modul */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Katalog Hak Akses Izin ({selectedPermissions.length} terpilih)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const allCodes = permissionsQuery.data?.permissions.map((p) => p.code) ?? [];
                  setSelectedPermissions(allCodes);
                }}
                className="text-[11px] font-bold text-[#1e3a8a] hover:underline"
              >
                Pilih Semua
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setSelectedPermissions([])}
                className="text-[11px] font-bold text-slate-500 hover:underline"
              >
                Kosongkan
              </button>
            </div>
          </div>

          {permissionsQuery.isLoading ? (
            <LoadingState label="Memuat daftar izin" rows={3} />
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {(permissionsQuery.data?.modules ?? []).map((mod) => {
                const modCodes = mod.permissions.map((p) => p.code);
                const allModSelected = modCodes.every((c) => selectedPermissions.includes(c));
                const someModSelected = modCodes.some((c) => selectedPermissions.includes(c));

                return (
                  <div
                    key={mod.module}
                    className="rounded-[10px] border border-[#CBD5E1]/80 bg-slate-50/50 p-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Modul: {mod.module} ({mod.count} Izin)
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleAllModule(modCodes)}
                        className="text-[11px] font-bold text-[#1e3a8a] hover:underline"
                      >
                        {allModSelected ? 'Batal Semua' : 'Centang Semua'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5">
                      {mod.permissions.map((p) => {
                        const checked = selectedPermissions.includes(p.code);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-start gap-2 p-1.5 rounded-[8px] cursor-pointer transition-colors text-xs ${
                              checked ? 'bg-blue-50/80 text-[#1e3a8a]' : 'hover:bg-white text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(p.code)}
                              className="mt-0.5 rounded border-[#CBD5E1] text-[#1e3a8a] focus:ring-[#1e3a8a]"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold leading-tight">{p.name}</p>
                              <p className="font-mono text-[10px] text-slate-400 leading-tight">{p.code}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </FormModal>

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Peran"
        description={`Apakah Anda yakin ingin menghapus peran "${deleteTarget?.name}"? Aksi ini permanen.`}
        confirmLabel={deleteMutation.isPending ? 'Menghapus...' : 'Hapus Peran'}
        busy={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};
