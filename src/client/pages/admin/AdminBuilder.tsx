import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  RocketLaunchIcon,
  PencilSquareIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { builderApi, type BuilderPage, type BuilderSection, type BuilderWidgetInstance } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';

/** Membaca konfigurasi widget dari JSON tersimpan. */
function parseConfig(raw: string): Record<string, unknown> {
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Ringkasan isi konfigurasi agar kartu widget tidak kosong tanpa penjelasan. */
function summarize(config: Record<string, unknown>): string {
  const title = typeof config.title === 'string' ? config.title : '';
  if (title) return title;
  if (Array.isArray(config.slides)) return `${config.slides.length} slide`;
  if (Array.isArray(config.items)) return `${config.items.length} item`;
  if (typeof config.vision === 'string' && config.vision) return 'Visi dan misi terisi';
  return 'Belum ada konten';
}

/**
 * Page builder berbasis section dan widget.
 *
 * Perubahan disimpan ke server pada setiap aksi sehingga draft tidak hilang
 * saat halaman dimuat ulang. Publikasi memvalidasi seluruh konfigurasi widget
 * lebih dahulu di backend.
 */
export const AdminBuilder: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [sectionDraft, setSectionDraft] = useState({ sectionKey: 'content', title: '' });
  const [widgetFormOpen, setWidgetFormOpen] = useState(false);
  const [widgetSectionId, setWidgetSectionId] = useState<number | null>(null);
  const [widgetDraft, setWidgetDraft] = useState({ widgetCode: 'about_prodi', variantCode: '' });
  const [configTarget, setConfigTarget] = useState<BuilderWidgetInstance | null>(null);
  const [configText, setConfigText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'section' | 'widget'; id: number; label: string } | null>(
    null,
  );
  const [publishTarget, setPublishTarget] = useState<BuilderPage | null>(null);

  const pagesQuery = useQuery({
    queryKey: ['admin', 'pages'],
    queryFn: () => builderApi.pages().then((res) => res.data.pages),
  });

  const widgetsQuery = useQuery({
    queryKey: ['admin', 'widgets'],
    queryFn: () => builderApi.widgets().then((res) => res.data.widgets),
  });

  // Memilih halaman pertama otomatis agar builder langsung dapat dipakai.
  useEffect(() => {
    if (selectedPageId === null && pagesQuery.data?.length) {
      const beranda = pagesQuery.data.find((page) => page.slug === 'beranda');
      setSelectedPageId(beranda?.id ?? pagesQuery.data[0].id);
    }
  }, [pagesQuery.data, selectedPageId]);

  const detailQuery = useQuery({
    queryKey: ['admin', 'page', selectedPageId],
    queryFn: () => builderApi.page(selectedPageId!).then((res) => res.data.page),
    enabled: selectedPageId !== null,
  });

  const page = detailQuery.data;
  const selectedPage = useMemo(
    () => (pagesQuery.data ?? []).find((item) => item.id === selectedPageId) ?? null,
    [pagesQuery.data, selectedPageId],
  );

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'page', selectedPageId] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
  };

  const createSection = useMutation({
    mutationFn: () => builderApi.createSection(selectedPageId!, sectionDraft),
    onSuccess: () => {
      toast.success('Section berhasil ditambahkan.');
      setSectionFormOpen(false);
      refresh();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const addWidget = useMutation({
    mutationFn: () => {
      const definition = (widgetsQuery.data ?? []).find((item) => item.code === widgetDraft.widgetCode);
      let config: Record<string, unknown> = {};
      try {
        config = definition ? JSON.parse(definition.defaultJson) : {};
      } catch {
        config = {};
      }
      return builderApi.addWidget(widgetSectionId!, {
        widgetCode: widgetDraft.widgetCode,
        variantCode: widgetDraft.variantCode || null,
        config,
      });
    },
    onSuccess: () => {
      toast.success('Widget berhasil ditambahkan.');
      setWidgetFormOpen(false);
      refresh();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      const detail = apiError.fieldErrors?.config?.[0];
      toast.error(detail ?? firstFieldError(apiError) ?? apiError.message);
    },
  });

  const saveConfig = useMutation({
    mutationFn: () => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(configText);
      } catch {
        throw new Error('Konfigurasi bukan JSON yang valid.');
      }
      return builderApi.updateWidget(configTarget!.id, { config: parsed });
    },
    onSuccess: () => {
      toast.success('Konfigurasi widget berhasil disimpan.');
      setConfigTarget(null);
      refresh();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      const detail = apiError.fieldErrors?.config?.[0];
      toast.error(detail ?? firstFieldError(apiError) ?? toApiError(error).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (target: { kind: 'section' | 'widget'; id: number }) =>
      target.kind === 'section' ? builderApi.deleteSection(target.id) : builderApi.deleteWidget(target.id),
    onSuccess: () => {
      toast.success('Data berhasil dihapus.');
      setDeleteTarget(null);
      refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const duplicateWidget = useMutation({
    mutationFn: (id: number) => builderApi.duplicateWidget(id),
    onSuccess: () => {
      toast.success('Widget berhasil digandakan.');
      refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const publishMutation = useMutation({
    mutationFn: () => builderApi.publishPage(publishTarget!.id),
    onSuccess: () => {
      toast.success('Halaman berhasil dipublikasikan.');
      setPublishTarget(null);
      refresh();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      const details = apiError.fieldErrors?.sections;
      toast.error(details?.length ? details.join(' ') : apiError.message);
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: number) => builderApi.unpublishPage(id),
    onSuccess: () => {
      toast.success('Halaman ditarik dari publikasi.');
      refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  /** Memindahkan urutan section atau widget satu langkah ke atas atau bawah. */
  const moveSection = async (section: BuilderSection, direction: -1 | 1) => {
    if (!page) return;
    const ordered = [...page.sections].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((item) => item.id === section.id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;

    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try {
      await builderApi.reorderSections(page.id, ordered.map((item, position) => ({ id: item.id, sortOrder: position })));
      refresh();
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  };

  const moveWidget = async (section: BuilderSection, widget: BuilderWidgetInstance, direction: -1 | 1) => {
    const ordered = [...section.widgets].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((item) => item.id === widget.id);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;

    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try {
      await builderApi.reorderWidgets(section.id, ordered.map((item, position) => ({ id: item.id, sortOrder: position })));
      refresh();
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  };

  const selectedWidgetDefinition = (widgetsQuery.data ?? []).find((item) => item.code === widgetDraft.widgetCode);

  return (
    <AdminLayout
      title="Page Builder"
      description="Susun landing page program studi dari section dan widget. Perubahan tersimpan sebagai draft sampai dipublikasikan."
      actions={
        page ? (
          <>
            {page.isPublished && has('pages.publish') ? (
              <button
                type="button"
                onClick={() => unpublishMutation.mutate(page.id)}
                disabled={unpublishMutation.isPending}
                className="btn-secondary"
              >
                <XCircleIcon className="h-4 w-4" />
                Tarik Publikasi
              </button>
            ) : null}
            {!page.isPublished && has('pages.publish') ? (
              <button type="button" onClick={() => setPublishTarget(selectedPage)} className="btn-primary">
                <RocketLaunchIcon className="h-4 w-4" />
                Publikasikan
              </button>
            ) : null}
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              <EyeIcon className="h-4 w-4" />
              Pratinjau
            </a>
          </>
        ) : null
      }
    >
      {pagesQuery.isLoading ? (
        <LoadingState label="Memuat halaman" />
      ) : pagesQuery.isError ? (
        <ErrorState message={toApiError(pagesQuery.error).message} onRetry={() => void pagesQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-[14px] border border-[#CBD5E1] bg-white p-4 shadow-2xs">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Halaman</p>
            <ul className="space-y-1">
              {(pagesQuery.data ?? []).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPageId(item.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      item.id === selectedPageId
                        ? 'bg-[#1e3a8a] text-white'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0 truncate">{item.title}</span>
                    <span
                      className={`ml-2 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold ${
                        item.isPublished
                          ? item.id === selectedPageId
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-50 text-emerald-700'
                          : item.id === selectedPageId
                            ? 'bg-white/20 text-white'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.isPublished ? 'Terbit' : 'Draft'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="space-y-4">
            {detailQuery.isLoading ? (
              <LoadingState label="Memuat halaman" rows={2} />
            ) : page ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[#CBD5E1] bg-white px-5 py-3.5 shadow-2xs">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{page.title}</p>
                    <p className="font-mono text-[11px] text-slate-500">
                      {page.slug === 'beranda' ? '/' : `/${page.slug}`} • {page.sections.length} section
                    </p>
                  </div>
                  {has('builder.create') ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSectionDraft({ sectionKey: 'content', title: '' });
                        setSectionFormOpen(true);
                      }}
                      className="btn-primary"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Tambah Section
                    </button>
                  ) : null}
                </div>

                {page.sections.length === 0 ? (
                  <EmptyState
                    title="Halaman ini belum memiliki section"
                    description="Section adalah wadah bagi widget. Tambahkan section terlebih dahulu, lalu pilih widget untuk mengisinya."
                    action={
                      has('builder.create') ? (
                        <button type="button" onClick={() => setSectionFormOpen(true)} className="btn-primary">
                          <PlusIcon className="h-4 w-4" />
                          Tambah Section
                        </button>
                      ) : null
                    }
                  />
                ) : (
                  [...page.sections]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((section) => (
                      <section key={section.id} className="rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CBD5E1]/70 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900">
                              {section.title ?? section.sectionKey}
                              <span className="ml-2 font-mono text-[10px] font-normal text-slate-400">
                                {section.sectionKey}
                              </span>
                            </p>
                            <p className="text-[10px] text-slate-500">{section.widgets.length} widget</p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void moveSection(section, -1)}
                              className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-50"
                              aria-label="Naikkan section"
                            >
                              <ArrowUpIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void moveSection(section, 1)}
                              className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-50"
                              aria-label="Turunkan section"
                            >
                              <ArrowDownIcon className="h-3.5 w-3.5" />
                            </button>
                            {has('builder.create') ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setWidgetSectionId(section.id);
                                  setWidgetDraft({ widgetCode: 'about_prodi', variantCode: '' });
                                  setWidgetFormOpen(true);
                                }}
                                className="rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                              >
                                + Widget
                              </button>
                            ) : null}
                            {has('builder.delete') ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    kind: 'section',
                                    id: section.id,
                                    label: section.title ?? section.sectionKey,
                                  })
                                }
                                className="rounded border border-rose-200 p-1 text-rose-600 hover:bg-rose-50"
                                aria-label="Hapus section"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-2 p-4">
                          {section.widgets.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-500">
                              Section ini belum berisi widget. Halaman tidak dapat dipublikasikan sebelum ada widget.
                            </p>
                          ) : (
                            [...section.widgets]
                              .sort((a, b) => a.sortOrder - b.sortOrder)
                              .map((widget) => {
                                const config = parseConfig(widget.configJson);
                                return (
                                  <div
                                    key={widget.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-bold text-slate-800">
                                        {widget.widget.name}
                                        {widget.variantCode ? (
                                          <span className="ml-1.5 rounded bg-white px-1 py-0.5 text-[9px] font-semibold text-slate-500">
                                            {widget.variantCode}
                                          </span>
                                        ) : null}
                                      </p>
                                      <p className="truncate text-[10px] text-slate-500">{summarize(config)}</p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => void moveWidget(section, widget, -1)}
                                        className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100"
                                        aria-label="Naikkan widget"
                                      >
                                        <ArrowUpIcon className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void moveWidget(section, widget, 1)}
                                        className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100"
                                        aria-label="Turunkan widget"
                                      >
                                        <ArrowDownIcon className="h-3 w-3" />
                                      </button>
                                      {has('builder.update') ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setConfigTarget(widget);
                                            setConfigText(JSON.stringify(config, null, 2));
                                          }}
                                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                                        >
                                          <PencilSquareIcon className="h-3 w-3" /> Atur
                                        </button>
                                      ) : null}
                                      {has('builder.create') ? (
                                        <button
                                          type="button"
                                          onClick={() => duplicateWidget.mutate(widget.id)}
                                          className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100"
                                          aria-label="Gandakan widget"
                                        >
                                          <DocumentDuplicateIcon className="h-3 w-3" />
                                        </button>
                                      ) : null}
                                      {has('builder.delete') ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDeleteTarget({ kind: 'widget', id: widget.id, label: widget.widget.name })
                                          }
                                          className="rounded border border-rose-200 bg-white p-1 text-rose-600 hover:bg-rose-50"
                                          aria-label="Hapus widget"
                                        >
                                          <TrashIcon className="h-3 w-3" />
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </section>
                    ))
                )}
              </>
            ) : (
              <EmptyState
                title="Belum ada halaman"
                description="Halaman awal dibuat otomatis ketika program studi dibuat. Hubungi Super Admin bila halaman belum tersedia."
              />
            )}
          </div>
        </div>
      )}

      <FormModal
        open={sectionFormOpen}
        title="Tambah Section"
        busy={createSection.isPending}
        onClose={() => setSectionFormOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          createSection.mutate();
        }}
      >
        <Field label="Kunci section" htmlFor="section-key" required hint="Penanda teknis, contoh hero, profil, berita.">
          <input
            id="section-key"
            className="field-input font-mono"
            required
            value={sectionDraft.sectionKey}
            onChange={(event) => setSectionDraft({ ...sectionDraft, sectionKey: event.target.value })}
          />
        </Field>
        <Field label="Judul section" htmlFor="section-title" hint="Tampil di panel builder sebagai penanda.">
          <input
            id="section-title"
            className="field-input"
            value={sectionDraft.title}
            onChange={(event) => setSectionDraft({ ...sectionDraft, title: event.target.value })}
          />
        </Field>
      </FormModal>

      <FormModal
        open={widgetFormOpen}
        title="Tambah Widget"
        description="Widget menyimpan konfigurasi awal sesuai tipenya. Sesuaikan isinya setelah ditambahkan."
        busy={addWidget.isPending}
        onClose={() => setWidgetFormOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          addWidget.mutate();
        }}
      >
        <Field label="Tipe widget" htmlFor="widget-code" required>
          <select
            id="widget-code"
            className="field-input"
            value={widgetDraft.widgetCode}
            onChange={(event) => setWidgetDraft({ widgetCode: event.target.value, variantCode: '' })}
          >
            {(widgetsQuery.data ?? []).map((widget) => (
              <option key={widget.code} value={widget.code}>
                {widget.category} — {widget.name}
              </option>
            ))}
          </select>
        </Field>

        {selectedWidgetDefinition?.variants.length ? (
          <Field label="Varian tampilan" htmlFor="widget-variant">
            <select
              id="widget-variant"
              className="field-input"
              value={widgetDraft.variantCode}
              onChange={(event) => setWidgetDraft({ ...widgetDraft, variantCode: event.target.value })}
            >
              <option value="">Varian bawaan</option>
              {selectedWidgetDefinition.variants.map((variant) => (
                <option key={variant.code} value={variant.code}>
                  {variant.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </FormModal>

      <FormModal
        open={configTarget !== null}
        title="Atur Konfigurasi Widget"
        description={configTarget?.widget.name}
        busy={saveConfig.isPending}
        wide
        onClose={() => setConfigTarget(null)}
        onSubmit={(event) => {
          event.preventDefault();
          saveConfig.mutate();
        }}
      >
        <Field
          label="Konfigurasi JSON"
          htmlFor="widget-config"
          hint="Isi divalidasi sesuai tipe widget. Nilai yang tidak sesuai akan ditolak server."
        >
          <textarea
            id="widget-config"
            className="field-input min-h-[320px] font-mono text-[11px] leading-relaxed"
            value={configText}
            onChange={(event) => setConfigText(event.target.value)}
            spellCheck={false}
          />
        </Field>
      </FormModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.kind === 'section' ? 'Hapus section' : 'Hapus widget'}
        description={`"${deleteTarget?.label ?? ''}" akan dihapus dari halaman ini.`}
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate({ kind: deleteTarget.kind, id: deleteTarget.id });
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={publishTarget !== null}
        title="Publikasikan halaman"
        description={`Halaman "${publishTarget?.title ?? ''}" akan tampil di website publik ${window.location.hostname}. Seluruh konfigurasi widget divalidasi sebelum terbit.`}
        confirmLabel="Publikasikan"
        tone="primary"
        busy={publishMutation.isPending}
        onConfirm={() => publishMutation.mutate()}
        onCancel={() => setPublishTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminBuilder;
