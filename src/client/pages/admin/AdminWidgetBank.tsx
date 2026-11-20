import React, { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownTrayIcon,
  ArrowRightIcon,
  BoltIcon,
  DocumentDuplicateIcon,
  PlusIcon,
  RectangleStackIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { useNotifier } from '../../components/ui/Notifier';
import { usePermission } from '../../hooks/useSite';
import { useSiteStore } from '../../app/siteStore';
import { builderApi, type WidgetTemplateItem } from '../../services/adminApi';
import { toApiError } from '../../services/api';
import {
  BLOCK_LABEL,
  EMBEDDABLE_WIDGET_META,
  WIREFRAME_COLUMNS,
  createStarterPresets,
} from './widgetBankStudioParts';
import { WIDGET_BANK_NEW_PATH, widgetBankEditPath } from './AdminWidgetBankStudio';

/** Galeri Bank Widget: daftar widget prodi, pintu masuk ke studio halaman penuh. */
export const AdminWidgetBank: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const notifier = useNotifier();
  const { has } = usePermission();
  const activeTenantId = useSiteStore((state) => state.activeTenantId);

  const starters = useMemo(() => createStarterPresets(), []);

  const templatesQuery = useQuery({
    queryKey: ['admin', 'widget-bank', activeTenantId],
    queryFn: () => builderApi.widgetBank().then((res) => res.data.templates),
  });

  const templates = templatesQuery.data ?? [];

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'widget-bank'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'page'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
  };

  // Tautan lama dari Page Builder & galeri widget: `?edit=<id>` -> halaman studio.
  const editParam = searchParams.get('edit');
  useEffect(() => {
    if (editParam) navigate(widgetBankEditPath(Number(editParam)), { replace: true });
  }, [editParam, navigate]);

  const importPagesMutation = useMutation({
    mutationFn: () => builderApi.importPagesToBank(),
    onSuccess: (res) => {
      toast.success(res.data.message);
      refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => builderApi.duplicateWidgetTemplate(id),
    onSuccess: () => {
      toast.success('Widget berhasil digandakan.');
      refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => builderApi.deleteWidgetTemplate(id),
    onSuccess: () => {
      toast.success('Widget berhasil dihapus dari Bank Widget.');
      refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const askDelete = (template: WidgetTemplateItem) => {
    void notifier
      .confirmAction(
        `Widget "${template.name}" akan dihapus dari Bank Widget. Tindakan ini tidak dapat dibatalkan.`,
        { title: 'Hapus widget?', confirmLabel: 'Hapus', tone: 'danger' },
        () => deleteMutation.mutateAsync(template.id),
      )
      .catch(() => {
        // Galat sudah dilaporkan lewat onError mutasi.
      });
  };

  return (
    <AdminLayout
      title="Bank Widget"
      description="Susun widget bebas dan pakai ulang di Page Builder. Membuat dan menyunting membuka halaman tersendiri agar ruang kerja lega."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {has('builder.update') ? (
            <button
              type="button"
              onClick={() => importPagesMutation.mutate()}
              disabled={importPagesMutation.isPending}
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[#1e3a8a]/25 bg-white px-3.5 text-xs font-bold text-[#1e3a8a] shadow-2xs transition-colors hover:border-[#1e3a8a] hover:bg-blue-50 disabled:opacity-60"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span>{importPagesMutation.isPending ? 'Memindahkan…' : 'Impor dari Halaman'}</span>
            </button>
          ) : null}
          {has('builder.create') ? (
            <button type="button" onClick={() => navigate(WIDGET_BANK_NEW_PATH)} className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              Buat Widget Baru
            </button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-5">
        {templatesQuery.isLoading ? (
          <LoadingState label="Memuat Bank Widget" rows={3} />
        ) : templatesQuery.isError ? (
          <ErrorState
            message={toApiError(templatesQuery.error).message}
            onRetry={() => void templatesQuery.refetch()}
          />
        ) : templates.length === 0 ? (
          <>
            <EmptyState
              title="Bank Widget masih kosong"
              description="Mulai dari contoh siap pakai atau impor widget yang sudah terpasang di halaman."
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {starters.map((starter) => (
                <button
                  key={starter.key}
                  type="button"
                  disabled={!has('builder.create')}
                  onClick={() => navigate(WIDGET_BANK_NEW_PATH)}
                  className="group flex flex-col items-start gap-2 rounded-[14px] border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[#1e3a8a]/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-blue-50 text-[#1e3a8a] ring-1 ring-inset ring-blue-100">
                    <BoltIcon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="text-xs font-bold text-slate-900">{starter.name}</span>
                  <span className="text-[11px] leading-snug text-slate-500">{starter.description}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#1e3a8a]">
                    Pakai contoh <ArrowRightIcon className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <article
                key={template.id}
                className="group flex flex-col overflow-hidden rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs transition-all hover:border-[#1e3a8a]/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 bg-slate-50/70 px-4 py-2.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                      template.usageCount > 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                    title={template.usedInPages.join(', ') || 'Belum dipakai di halaman mana pun'}
                  >
                    <RectangleStackIcon className="h-3 w-3" />
                    {template.usageCount > 0 ? `Dipakai di ${template.usageCount} halaman` : 'Belum dipakai'}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {template.config.rows.length} baris
                  </span>
                </div>

                {/* Kerangka baris agar bentuk widget terlihat tanpa membuka studio */}
                <div className="space-y-1.5 bg-white px-4 py-4">
                  {template.config.rows.length === 0 ? (
                    <p className="py-6 text-center text-[11px] italic text-slate-400">Widget masih kosong</p>
                  ) : (
                    template.config.rows.slice(0, 4).map((row) => (
                      <div key={row.id} className="flex gap-1.5">
                        {WIREFRAME_COLUMNS[row.layout].map((weight, index) => {
                          const colBlocks = row.columns[index] ?? [];
                          const widgetBlock = colBlocks.find((item) => item.type === 'widget');
                          return (
                            <div
                              key={`${row.id}-${index}`}
                              className={`flex h-7 min-w-0 items-center justify-center rounded-[5px] border px-1.5 text-[10px] font-bold ${
                                widgetBlock
                                  ? 'border-blue-200 bg-blue-50/70 text-[#1e3a8a]'
                                  : 'border-slate-200 bg-slate-50 text-slate-400'
                              }`}
                              style={{ flexGrow: weight }}
                            >
                              {widgetBlock && widgetBlock.type === 'widget' ? (
                                <span className="truncate">
                                  {EMBEDDABLE_WIDGET_META[widgetBlock.widgetCode]?.label ?? widgetBlock.widgetCode}
                                </span>
                              ) : colBlocks.length > 0 ? (
                                <span className="truncate text-[9px] font-semibold">
                                  {colBlocks.map((b) => BLOCK_LABEL[b.type]).join(' · ')}
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                  {template.config.rows.length > 4 ? (
                    <p className="text-center text-[10px] font-semibold text-slate-400">
                      +{template.config.rows.length - 4} baris lainnya
                    </p>
                  ) : null}
                </div>

                <div className="mt-auto border-t border-slate-200/80 px-4 py-3">
                  <p className="truncate text-xs font-bold text-slate-900">{template.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">
                    {template.description || 'Tanpa deskripsi.'}
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    {has('builder.update') ? (
                      <button
                        type="button"
                        onClick={() => navigate(widgetBankEditPath(template.id))}
                        className="inline-flex h-7 items-center gap-1 rounded-[7px] border border-[#1e3a8a]/25 bg-white px-2.5 text-[11px] font-bold text-[#1e3a8a] transition-colors hover:border-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
                      >
                        Sunting
                      </button>
                    ) : null}
                    {has('builder.create') ? (
                      <button
                        type="button"
                        onClick={() => duplicateMutation.mutate(template.id)}
                        aria-label={`Gandakan ${template.name}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                      >
                        <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    {has('builder.delete') ? (
                      <button
                        type="button"
                        onClick={() => askDelete(template)}
                        aria-label={`Hapus ${template.name}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] border border-rose-200 bg-white text-rose-600 transition-colors hover:bg-rose-50"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
