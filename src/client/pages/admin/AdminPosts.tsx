import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DeleteRowButton, EditRowButton, RowActions } from '../../components/ui/RowActions';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { postApi, type Post } from '../../services/contentApi';
import { toApiError } from '../../services/api';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Terjadwal',
  published: 'Terbit',
  archived: 'Arsip',
};

/** Pengelolaan berita dan pengumuman program studi. */
export const AdminPosts: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'posts'],
    queryFn: () => postApi.list({ perPage: 50 }).then((res) => res.data),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
  };

  const publishMutation = useMutation({
    mutationFn: ({ id, publish }: { id: number; publish: boolean }) => postApi.publish(id, publish),
    onSuccess: (_data, variables) => {
      toast.success(variables.publish ? 'Berita berhasil diterbitkan.' : 'Berita dikembalikan ke draft.');
      invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => postApi.remove(id),
    onSuccess: () => {
      toast.success('Berita berhasil dihapus.');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const openCreate = () => navigate('/admin/berita/baru');

  /*
   * Kolom tabel berita dipindahkan ke data supaya lebarnya tetap dan kolom
   * aksi tidak lagi menimpa kolom lain saat judul berita panjang.
   */
  const columns: Array<DataTableColumn<Post>> = [
    {
      key: 'judul',
      header: 'Judul',
      render: (post) => (
        <>
          <span className="block font-bold text-slate-900">{post.title}</span>
          <span className="block font-mono text-xs text-slate-500">/{post.slug}</span>
        </>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 110,
      cellClassName: 'whitespace-nowrap',
      render: (post) => (
        <span
          className={`inline-block rounded px-1.5 py-0.5 text-xs font-bold ${
            post.status === 'published'
              ? 'bg-emerald-50 text-emerald-700'
              : post.status === 'draft'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          {STATUS_LABEL[post.status] ?? post.status}
        </span>
      ),
    },
    {
      key: 'dilihat',
      header: 'Dilihat',
      width: 90,
      cellClassName: 'whitespace-nowrap',
      render: (post) => post.views,
    },
    {
      key: 'diperbarui',
      header: 'Diperbarui',
      width: 130,
      cellClassName: 'whitespace-nowrap text-slate-500',
      render: (post) =>
        new Date(post.updatedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' }),
    },
    {
      key: 'aksi',
      header: 'Aksi',
      width: 230,
      align: 'right',
      render: (post) => (
        <RowActions>
          <EditRowButton
            label="Ubah berita"
            konteks={post.title}
            onClick={() => navigate(`/admin/berita/${post.id}/ubah`)}
          />

          {has('posts.publish') ? (
            <button
              type="button"
              onClick={() =>
                publishMutation.mutate({ id: post.id, publish: post.status !== 'published' })
              }
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-bold ${
                post.status === 'published'
                  ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {post.status === 'published' ? (
                <>
                  <EyeSlashIcon className="h-3 w-3" /> Tarik
                </>
              ) : (
                <>
                  <EyeIcon className="h-3 w-3" /> Terbitkan
                </>
              )}
            </button>
          ) : null}

          {has('posts.delete') ? (
            <DeleteRowButton
              label="Hapus berita"
              konteks={post.title}
              onClick={() => setDeleteTarget(post)}
            />
          ) : null}
        </RowActions>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Berita & Pengumuman"
      description="Konten berita hanya tampil di website publik setelah berstatus terbit."
      actions={
        has('posts.create') ? (
          <button type="button" onClick={openCreate} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Tulis Berita
          </button>
        ) : null
      }
    >
      {/*
       * Keadaan memuat/galat/kosong ditangani DataTable, sehingga tidak ada
       * lagi percabangan if-else yang menyalin struktur tabel di sini.
       */}
      <DataTable<Post>
        rows={listQuery.data?.items ?? []}
        rowKey={(post) => String(post.id)}
        loading={listQuery.isLoading}
        loadingLabel="Memuat berita"
        error={listQuery.isError ? toApiError(listQuery.error).message : null}
        onRetry={() => void listQuery.refetch()}
        emptyTitle="Belum ada berita"
        emptyDescription="Tulis berita atau pengumuman pertama. Selama masih draft, isinya tidak tampil di website publik."
        emptyAction={
          has('posts.create') ? (
            <button type="button" onClick={openCreate} className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              Tulis Berita
            </button>
          ) : null
        }
        minWidth={820}
        columns={columns}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus berita"
        description={`Berita "${deleteTarget?.title ?? ''}" akan dihapus permanen.`}
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminPosts;
