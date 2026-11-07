import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../components/AdminLayout';
import { Field } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { useSiteStore } from '../../app/siteStore';
import { api, toApiError } from '../../services/api';

/**
 * Biodata pengguna yang sedang masuk.
 *
 * Menampilkan identitas dan daftar permission efektif sehingga pengguna tahu
 * persis modul apa yang boleh diakses, tanpa harus menebak dari menu.
 */
export const AdminMyProfile: React.FC = () => {
  const user = useSiteStore((state) => state.user);
  const refreshUser = useSiteStore((state) => state.refreshUser);
  const toast = useToast();

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.put(`/admin/users/${user!.id}`, payload),
    onSuccess: async () => {
      toast.success('Biodata berhasil diperbarui.');
      await refreshUser();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const [name, setName] = React.useState(user?.name ?? '');
  const [phone, setPhone] = React.useState('');

  React.useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  const groupedPermissions = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const permission of user?.permissions ?? []) {
      const [module] = permission.split('.');
      const list = map.get(module) ?? [];
      list.push(permission);
      map.set(module, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [user?.permissions]);

  return (
    <AdminLayout title="Biodata Saya" description="Identitas akun dan hak akses yang melekat pada sesi ini.">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="card space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Identitas</h2>

          <Field label="Nama lengkap" htmlFor="my-name">
            <input
              id="my-name"
              className="field-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field label="Email" htmlFor="my-email" hint="Email diubah oleh administrator universitas.">
            <input id="my-email" className="field-input bg-slate-50" value={user?.email ?? ''} readOnly />
          </Field>

          <Field label="Nama pengguna" htmlFor="my-username">
            <input id="my-username" className="field-input bg-slate-50 font-mono" value={user?.username ?? ''} readOnly />
          </Field>

          <Field label="Nomor telepon" htmlFor="my-phone">
            <input
              id="my-phone"
              className="field-input"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="08xxxxxxxxxx"
            />
          </Field>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => updateMutation.mutate({ name, phone: phone || null })}
              disabled={updateMutation.isPending}
              className="btn-primary"
            >
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Biodata'}
            </button>
          </div>
        </section>

        <section className="card">
          <h2 className="text-sm font-bold text-slate-900">Peran &amp; Hak Akses</h2>

          <div className="mt-3 space-y-1.5">
            {(user?.roles ?? []).length === 0 ? (
              <p className="text-[11px] italic text-amber-700">Akun ini belum memiliki peran.</p>
            ) : (
              (user?.roles ?? []).map((role, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-[#1e3a8a]">
                    {role.roleName}
                  </span>
                  <span className="text-[11px] text-slate-600">
                    Cakupan: {role.scopeType}
                    {role.studyProgramId ? ` • Prodi ID ${role.studyProgramId}` : ''}
                    {role.facultyId ? ` • Fakultas ID ${role.facultyId}` : ''}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Izin efektif ({user?.permissions.includes('*') ? 'semua' : `${user?.permissions.length ?? 0} izin`})
            </p>

            {user?.permissions.includes('*') ? (
              <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
                Super Admin memiliki seluruh izin pada semua modul.
              </p>
            ) : (
              <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                {groupedPermissions.map(([module, permissions]) => (
                  <div key={module}>
                    <p className="font-mono text-[10px] font-bold text-slate-700">{module}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {permissions.map((permission) => (
                        <span key={permission} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">
                          {permission.split('.')[1]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminMyProfile;
