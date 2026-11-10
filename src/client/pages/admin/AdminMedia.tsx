import React, { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpTrayIcon, TrashIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { mediaApi, type MediaAsset } from '../../services/adminApi';
import { toApiError } from '../../services/api';

/** Memformat ukuran berkas ke satuan yang mudah dibaca. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Pustaka media program studi. */
export const AdminMedia: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'media'],
    queryFn: () => mediaApi.list().then((res) => res.data.assets),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mediaApi.remove(id),
    onSuccess: () => {
      toast.success('Aset media berhasil dihapus.');
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    let success = 0;

    for (const file of Array.from(files)) {
      try {
        await mediaApi.upload(file);
        success += 1;
      } catch (error) {
        toast.error(`${file.name}: ${toApiError(error).message}`);
      }
    }

    if (success > 0) {
      toast.success(`${success} berkas berhasil diunggah.`);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
    }
    setUploading(false);
  };

  const copyUrl = async (storageKey: string) => {
    try {
      await navigator.clipboard.writeText(storageKey);
      toast.success('URL berkas disalin ke papan klip.');
    } catch {
      toast.error('Peramban menolak akses papan klip. Salin URL secara manual.');
    }
  };

  return (
    <AdminLayout
      title="Media Library"
      description={`${listQuery.data?.length ?? 0} berkas tersimpan. Gambar dan dokumen di sini dapat dipakai di seluruh konten website.`}
      actions={
        has('media.upload') ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            {uploading ? 'Mengunggah...' : 'Unggah Berkas'}
          </button>
        ) : null
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        accept="image/jpeg,image/png,image/webp,image/svg+xml,application/pdf,.doc,.docx,.xls,.xlsx"
        onChange={(event) => {
          if (event.target.files?.length) void handleUpload(event.target.files);
          event.target.value = '';
        }}
      />

      {listQuery.isLoading ? (
        <LoadingState label="Memuat media" />
      ) : listQuery.isError ? (
        <ErrorState message={toApiError(listQuery.error).message} onRetry={() => void listQuery.refetch()} />
      ) : (listQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="Belum ada berkas media"
          description="Unggah gambar atau dokumen. Berkas yang diunggah mendapat nama acak sehingga tidak dapat ditebak."
          action={
            has('media.upload') ? (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-primary">
                <ArrowUpTrayIcon className="h-4 w-4" />
                Unggah Berkas
              </button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(listQuery.data ?? []).map((asset) => {
            const isImage = asset.mimeType.startsWith('image/');
            return (
              <figure key={asset.id} className="overflow-hidden rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs">
                <div className="flex h-32 items-center justify-center bg-slate-100">
                  {isImage ? (
                    <img
                      src={asset.storageKey}
                      alt={asset.altText ?? asset.filename}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold uppercase text-slate-500">
                      {asset.filename.split('.').pop()}
                    </span>
                  )}
                </div>

                <figcaption className="space-y-1.5 p-3">
                  <p className="truncate text-[11px] font-bold text-slate-800" title={asset.filename}>
                    {asset.filename}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {formatBytes(asset.sizeBytes)} • {asset.uploadedBy?.name ?? 'Sistem'}
                  </p>

                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => void copyUrl(asset.storageKey)}
                      className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-50"
                      aria-label={`Salin URL ${asset.filename}`}
                    >
                      <ClipboardIcon className="h-3.5 w-3.5" />
                    </button>
                    {has('media.delete') ? (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(asset)}
                        className="rounded border border-rose-200 p-1 text-rose-600 hover:bg-rose-50"
                        aria-label={`Hapus ${asset.filename}`}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus berkas media"
        description={`Berkas "${deleteTarget?.filename ?? ''}" akan dihapus dari server. Konten yang masih memakainya akan menampilkan gambar rusak.`}
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminMedia;
