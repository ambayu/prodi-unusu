import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { organizationApi } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';

/** Pengelolaan domain dan jejak audit lintas tenant. */
export const AdminDomains: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; hostname: string } | null>(null);
  const [draft, setDraft] = useState({ studyProgramId: 0, hostname: '', isPrimary: false, isActive: true });

  const domainsQuery = useQuery({
    queryKey: ['admin', 'domains'],
    queryFn: () => organizationApi.domains().then((res) => res.data.domains),
  });

  const programsQuery = useQuery({
    queryKey: ['admin', 'study-programs'],
    queryFn: () => organizationApi.studyPrograms().then((res) => res.data.studyPrograms),
  });

  const auditQuery = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: () => organizationApi.auditLogs().then((res) => res.data.logs),
    enabled: has('audit_logs.view'),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'domains'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      organizationApi.createDomain({
        studyProgramId: draft.studyProgramId,
        hostname: draft.hostname.trim().toLowerCase(),
        isPrimary: draft.isPrimary,
        isActive: draft.isActive,
      }),
    onSuccess: () => {
      toast.success('Domain berhasil didaftarkan.');
      setFormOpen(false);
      setDraft({ studyProgramId: 0, hostname: '', isPrimary: false, isActive: true });
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      organizationApi.updateDomain(id, { isActive }),
    onSuccess: () => {
      toast.success('Status domain diperbarui.');
      invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => organizationApi.deleteDomain(id),
    onSuccess: () => {
      toast.success('Domain berhasil dihapus.');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <AdminLayout
      title="Manajemen Domain"
      description="Domain menentukan tenant mana yang tampil. Domain yang tidak terdaftar akan ditolak, bukan diarahkan ke prodi lain."
      actions={
        has('domain.create') ? (
          <button
            type="button"
            onClick={() => {
              setDraft({
                studyProgramId: programsQuery.data?.[0]?.id ?? 0,
                hostname: '',
                isPrimary: false,
                isActive: true,
              });
              setFormOpen(true);
            }}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4" />
            Daftarkan Domain
          </button>
        ) : null
      }
    >
      {domainsQuery.isLoading ? (
        <LoadingState label="Memuat domain" />
      ) : domainsQuery.isError ? (
        <ErrorState message={toApiError(domainsQuery.error).message} onRetry={() => void domainsQuery.refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="table-base">
            <thead>
              <tr>
                <th>Hostname</th>
                <th>Program Studi</th>
                <th>Utama</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(domainsQuery.data ?? []).map((domain) => (
                <tr key={domain.id}>
                  <td className="font-mono font-bold text-[#1e3a8a]">{domain.hostname}</td>
                  <td>
                    <span className="block font-semibold text-slate-800">{domain.studyProgram.name}</span>
                    <span className="font-mono text-[10px] text-slate-500">{domain.studyProgram.code}</span>
                  </td>
                  <td>
                    {domain.isPrimary ? (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-[#1e3a8a]">
                        Utama
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">-</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate({ id: domain.id, isActive: !domain.isActive })}
                      disabled={!has('domain.update') || toggleMutation.isPending}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold disabled:cursor-not-allowed ${
                        domain.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {domain.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td>
                    <div className="flex justify-end">
                      {has('domain.delete') ? (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: domain.id, hostname: domain.hostname })}
                          className="rounded border border-rose-200 p-1 text-rose-600 hover:bg-rose-50"
                          aria-label={`Hapus domain ${domain.hostname}`}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
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

      {has('audit_logs.view') ? (
        <section className="card">
          <h2 className="text-sm font-bold text-slate-900">Jejak Audit Terbaru</h2>
          {auditQuery.isLoading ? (
            <div className="mt-4">
              <LoadingState label="Memuat audit" rows={3} />
            </div>
          ) : (auditQuery.data ?? []).length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Belum ada aktivitas" description="Perubahan data akan tercatat di sini." />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Pengguna</th>
                    <th>Modul</th>
                    <th>Aksi</th>
                    <th>Prodi</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditQuery.data ?? []).slice(0, 30).map((log) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap text-[11px]">
                        {new Date(log.createdAt).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td>{log.user?.name ?? 'Sistem'}</td>
                      <td className="font-mono text-[10px]">{log.module}</td>
                      <td>{log.action}</td>
                      <td className="text-[11px] text-slate-500">{log.studyProgram?.name ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <FormModal
        open={formOpen}
        title="Daftarkan Domain"
        busy={createMutation.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
      >
        <Field label="Program studi" htmlFor="domain-program" required>
          <select
            id="domain-program"
            className="field-input"
            required
            value={draft.studyProgramId}
            onChange={(event) => setDraft({ ...draft, studyProgramId: Number(event.target.value) })}
          >
            {(programsQuery.data ?? []).map((program) => (
              <option key={program.id} value={program.id}>
                {program.code} — {program.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Hostname"
          htmlFor="domain-hostname"
          required
          hint="Tanpa https:// dan tanpa path. Contoh: sin.unusu.ac.id"
        >
          <input
            id="domain-hostname"
            className="field-input font-mono"
            required
            value={draft.hostname}
            onChange={(event) => setDraft({ ...draft, hostname: event.target.value })}
          />
        </Field>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={draft.isPrimary}
              onChange={(event) => setDraft({ ...draft, isPrimary: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
            />
            Jadikan domain utama program studi
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
            />
            Aktifkan domain ini
          </label>
        </div>
      </FormModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus domain"
        description={`Domain ${deleteTarget?.hostname ?? ''} tidak akan dapat diakses lagi. Domain terakhir tidak dapat dihapus.`}
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminDomains;
