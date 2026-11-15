import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { DeleteRowButton, RowActions } from '../../components/ui/RowActions';
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

  /*
   * Kolom tabel domain dan tabel jejak audit didefinisikan sebagai data agar
   * lebarnya tetap dan tombol aksi tidak lagi menimpa kolom lain.
   */
  const domainColumns: Array<DataTableColumn<Awaited<ReturnType<typeof organizationApi.domains>>['data']['domains'][number]>> = [
    {
      key: 'hostname',
      header: 'Hostname',
      cellClassName: 'font-mono font-bold text-[#1e3a8a]',
      render: (domain) => domain.hostname,
    },
    {
      key: 'prodi',
      header: 'Program Studi',
      width: 260,
      render: (domain) => (
        <>
          <span className="block font-semibold text-slate-800">{domain.studyProgram.name}</span>
          <span className="font-mono text-xs text-slate-500">{domain.studyProgram.code}</span>
        </>
      ),
    },
    {
      key: 'utama',
      header: 'Utama',
      width: 100,
      render: (domain) =>
        domain.isPrimary ? (
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-[#1e3a8a]">
            Utama
          </span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 110,
      render: (domain) => (
        <button
          type="button"
          onClick={() => toggleMutation.mutate({ id: domain.id, isActive: !domain.isActive })}
          disabled={!has('domain.update') || toggleMutation.isPending}
          className={`rounded px-1.5 py-0.5 text-xs font-bold disabled:cursor-not-allowed ${
            domain.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {domain.isActive ? 'Aktif' : 'Nonaktif'}
        </button>
      ),
    },
    {
      key: 'aksi',
      header: 'Aksi',
      width: 90,
      align: 'right',
      render: (domain) => (
        <RowActions>
          {has('domain.delete') ? (
            <DeleteRowButton
              label="Hapus domain"
              konteks={domain.hostname}
              onClick={() => setDeleteTarget({ id: domain.id, hostname: domain.hostname })}
            />
          ) : null}
        </RowActions>
      ),
    },
  ];

  const auditColumns: Array<DataTableColumn<Awaited<ReturnType<typeof organizationApi.auditLogs>>['data']['logs'][number]>> = [
    {
      key: 'waktu',
      header: 'Waktu',
      width: 140,
      cellClassName: 'whitespace-nowrap',
      render: (log) =>
        new Date(log.createdAt).toLocaleString('id-ID', {
          dateStyle: 'short',
          timeStyle: 'short',
        }),
    },
    {
      key: 'pengguna',
      header: 'Pengguna',
      width: 160,
      render: (log) => log.user?.name ?? 'Sistem',
    },
    {
      key: 'modul',
      header: 'Modul',
      width: 130,
      cellClassName: 'font-mono',
      render: (log) => log.module,
    },
    {
      key: 'aksi',
      header: 'Aksi',
      width: 130,
      render: (log) => log.action,
    },
    {
      key: 'prodi',
      header: 'Prodi',
      cellClassName: 'text-slate-500',
      render: (log) => log.studyProgram?.name ?? '-',
    },
  ];

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
      {/* Keadaan memuat/galat ditangani DataTable. */}
      <DataTable
        rows={domainsQuery.data ?? []}
        rowKey={(domain) => String(domain.id)}
        loading={domainsQuery.isLoading}
        loadingLabel="Memuat domain"
        error={domainsQuery.isError ? toApiError(domainsQuery.error).message : null}
        onRetry={() => void domainsQuery.refetch()}
        emptyTitle="Belum ada domain"
        emptyDescription="Daftarkan domain agar website program studi dapat diakses melalui alamatnya sendiri."
        minWidth={800}
        columns={domainColumns}
      />

      <div className="mt-5">
        {has('audit_logs.view') ? (
          <section className="card">
            <h2 className="text-sm font-bold text-slate-900">Jejak Audit Terbaru</h2>
            <div className="mt-4">
              <DataTable
                rows={(auditQuery.data ?? []).slice(0, 30)}
                rowKey={(log) => String(log.id)}
                loading={auditQuery.isLoading}
                loadingLabel="Memuat audit"
                loadingRows={3}
                error={auditQuery.isError ? toApiError(auditQuery.error).message : null}
                onRetry={() => void auditQuery.refetch()}
                emptyTitle="Belum ada aktivitas"
                emptyDescription="Perubahan data akan tercatat di sini."
                minWidth={720}
                columns={auditColumns}
              />
            </div>
          </section>
        ) : null}
      </div>

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
