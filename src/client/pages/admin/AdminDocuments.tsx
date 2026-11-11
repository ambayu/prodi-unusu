import React, { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
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
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(extension)) {
      toast.error('Pilih berkas PDF, DOC, DOCX, XLS, atau XLSX.');
      return;
    }
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
        <div className="overflow-x-auto rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs">
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
          // Sebelumnya berkas boleh diketik manual sebagai URL; kini wajib
          // diunggah agar tautan unduhan tidak menunjuk berkas yang tidak ada.
          if (!draft.fileUrl) {
            toast.error('Unggah berkas dokumen terlebih dahulu.');
            return;
          }
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

        <Field
          label="Berkas dokumen"
          htmlFor="document-file"
          hint="Format PDF, DOC, DOCX, XLS, atau XLSX. Maksimal 10 MB. Tautan unduhan terisi otomatis setelah berkas diunggah."
        >
          <div className="space-y-2">
            {draft.fileUrl ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                <DocumentIcon className="h-5 w-5 shrink-0 text-[#1e3a8a]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[11px] font-semibold text-slate-700">
                    {draft.fileUrl.split('/').pop()}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {draft.mimeType ? `${draft.mimeType} · ` : ''}
                    {draft.fileSize ? `${Math.round(draft.fileSize / 1024)} KB` : 'Ukuran belum terdeteksi'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, fileUrl: '', fileSize: null, mimeType: null })}
                  title="Hapus berkas"
                  className="rounded p-1 text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-800"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-3 py-4 text-slate-500">
                <DocumentArrowUpIcon className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="text-[11px] font-medium">
                  Belum ada berkas. Unggah berkas dokumen dari perangkat Anda.
                </span>
              </div>
            )}

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50">
              <ArrowUpTrayIcon className="h-4 w-4 text-[#1e3a8a]" />
              <span>{uploading ? 'Mengunggah...' : draft.fileUrl ? 'Ganti Berkas' : 'Unggah Berkas'}</span>
              <input
                ref={fileInputRef}
                id="document-file"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                  event.target.value = '';
                }}
              />
            </label>
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

