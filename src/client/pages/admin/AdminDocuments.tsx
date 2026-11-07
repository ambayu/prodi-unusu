import React, { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilSquareIcon, TrashIcon, ArrowUpTrayIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { documentApi, type DocumentItem } from '../../services/contentApi';
import { mediaApi } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';

const EMPTY: Partial<DocumentItem> = {
  code: '',
  title: '',
  category: 'Pedoman Akademik',
  description: '',
  year: new Date().getFullYear(),
  fileUrl: '',
  isPublic: true,
};

/** Bank dokumen mutu program studi. */
export const AdminDocuments: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentItem | null>(null);
  const [draft, setDraft] = useState<Partial<DocumentItem>>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [uploading, setUploading] = useState(false);

  const listQuery = useQuery({
    queryKey: ['admin', 'documents'],
    queryFn: () => documentApi.list().then((res) => res.data.documents),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<DocumentItem>) => {
      const body = {
        ...payload,
        code: payload.code || null,
        description: payload.description || null,
        year: Number(payload.year) || new Date().getFullYear(),
      };
      return editing ? documentApi.update(editing.id, body) : documentApi.create(body);
    },
    onSuccess: () => {
      toast.success(editing ? 'Dokumen berhasil diperbarui.' : 'Dokumen berhasil ditambahkan.');
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'documents'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentApi.remove(id),
    onSuccess: () => {
      toast.success('Dokumen berhasil dihapus.');
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'documents'] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  /** Mengunggah berkas lalu mengisi otomatis URL dan ukurannya di formulir. */
  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await mediaApi.upload(file);
      setDraft((current) => ({
        ...current,
        fileUrl: res.data.asset.url,
        fileSize: res.data.asset.sizeBytes,
        mimeType: res.data.asset.mimeType,
      }));
      toast.success('Berkas berhasil diunggah. Lengkapi judul lalu simpan.');
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setUploading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (document: DocumentItem) => {
    setEditing(document);
    setDraft({ ...document });
    setFormOpen(true);
  };

  return (
    <AdminLayout
      title="Bank Dokumen"
      description={`${listQuery.data?.length ?? 0} dokumen tersimpan. Dokumen publik dapat diunduh pengunjung website.`}
      actions={
        has('documents.create') ? (
          <button type="button" onClick={openCreate} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Tambah Dokumen
          </button>
        ) : null
      }
    >
      {listQuery.isLoading ? (
        <LoadingState label="Memuat dokumen" />
      ) : listQuery.isError ? (
        <ErrorState message={toApiError(listQuery.error).message} onRetry={() => void listQuery.refetch()} />
      ) : (listQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="Belum ada dokumen"
          description="Unggah pedoman akademik, SOP, atau SK agar dapat diakses publik melalui halaman Dokumen."
          action={
            has('documents.create') ? (
              <button type="button" onClick={openCreate} className="btn-primary">
                <PlusIcon className="h-4 w-4" />
                Tambah Dokumen
              </button>
            ) : null
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="table-base">
            <thead>
              <tr>
                <th>Judul</th>
                <th>Kategori</th>
                <th>Tahun</th>
                <th>Status</th>
                <th>Unduhan</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(listQuery.data ?? []).map((document) => (
                <tr key={document.id}>
                  <td>
                    <span className="block font-bold text-slate-900">{document.title}</span>
                    <span className="block font-mono text-[11px] text-slate-500">
                      {document.code ?? 'tanpa kode'}
                    </span>
                  </td>
                  <td>{document.category}</td>
                  <td>{document.year}</td>
                  <td>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        document.isPublic ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {document.isPublic ? 'Publik' : 'Privat'}
                    </span>
                  </td>
                  <td>{document.downloadCount}</td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      {document.fileUrl ? (
                        <a
                          href={document.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50"
                          aria-label={`Unduh ${document.title}`}
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </a>
                      ) : null}
                      {has('documents.update') ? (
                        <button
                          type="button"
                          onClick={() => openEdit(document)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50"
                          aria-label={`Ubah ${document.title}`}
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      ) : null}
                      {has('documents.delete') ? (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(document)}
                          className="rounded-lg border border-rose-200 p-1.5 text-rose-600 transition-colors hover:bg-rose-50"
                          aria-label={`Hapus ${document.title}`}
                        >
                          <TrashIcon className="h-4 w-4" />
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
        open={formOpen}
        title={editing ? 'Ubah Dokumen' : 'Tambah Dokumen'}
        description="Dokumen publik muncul pada halaman Dokumen dan dapat diunduh pengunjung."
        busy={saveMutation.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          saveMutation.mutate(draft);
        }}
      >
        <Field label="Judul dokumen" htmlFor="document-title" required>
          <input
            id="document-title"
            className="field-input"
            required
            value={draft.title ?? ''}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Kode" htmlFor="document-code">
            <input
              id="document-code"
              className="field-input"
              value={draft.code ?? ''}
              onChange={(event) => setDraft({ ...draft, code: event.target.value })}
            />
          </Field>
          <Field label="Kategori" htmlFor="document-category" required>
            <input
              id="document-category"
              className="field-input"
              required
              list="document-categories"
              value={draft.category ?? ''}
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
            />
            <datalist id="document-categories">
              <option value="Pedoman Akademik" />
              <option value="SOP" />
              <option value="SK" />
              <option value="Modul Praktikum" />
              <option value="Laporan" />
            </datalist>
          </Field>
          <Field label="Tahun" htmlFor="document-year">
            <input
              id="document-year"
              type="number"
              min={1990}
              max={2100}
              className="field-input"
              value={draft.year ?? new Date().getFullYear()}
              onChange={(event) => setDraft({ ...draft, year: Number(event.target.value) })}
            />
          </Field>
        </div>

        <Field label="Berkas dokumen" htmlFor="document-file" hint="Format PDF, DOC, DOCX, XLS, atau XLSX. Maksimal 10 MB.">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id="document-file"
              className="field-input flex-1"
              placeholder="/uploads/media/nama-berkas.pdf"
              value={draft.fileUrl ?? ''}
              onChange={(event) => setDraft({ ...draft, fileUrl: event.target.value })}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary shrink-0"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              {uploading ? 'Mengunggah...' : 'Pilih Berkas'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
                event.target.value = '';
              }}
            />
          </div>
        </Field>

        <Field label="Deskripsi" htmlFor="document-description">
          <textarea
            id="document-description"
            className="field-textarea"
            value={draft.description ?? ''}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
        </Field>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={draft.isPublic ?? true}
            onChange={(event) => setDraft({ ...draft, isPublic: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
          />
          Dapat diakses pengunjung website
        </label>
      </FormModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus dokumen"
        description={`Dokumen "${deleteTarget?.title ?? ''}" akan dihapus dari bank dokumen dan tidak lagi dapat diunduh.`}
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminDocuments;

