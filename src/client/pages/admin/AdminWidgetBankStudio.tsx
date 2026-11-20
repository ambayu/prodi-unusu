import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  PhotoIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { Field } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { useTenant } from '../../hooks/useSite';
import { useSiteStore } from '../../app/siteStore';
import { builderApi, mediaApi } from '../../services/adminApi';
import { firstFieldError, toApiError } from '../../services/api';
import { CustomLayoutWidget } from '../../components/builder/CustomLayoutWidget';
import { WidgetRenderer } from '../../components/builder/WidgetRenderer';
import { WidgetVisualForm } from '../../components/builder/WidgetVisualForm';
import {
  BLOCK_LABEL,
  BLOCK_TYPES,
  BACKGROUNDS,
  EMBEDDABLE_WIDGET_META,
  ROW_LAYOUTS,
  createBlock,
  createRow,
  createStarterPresets,
  getBlockDisplayName,
  resizeColumns,
  WIREFRAME_COLUMNS,
} from './widgetBankStudioParts';
import {
  EMBEDDABLE_WIDGET_CODES,
  type CustomBlock,
  type CustomRow,
  type CustomRowLayout,
  type EmbeddableWidgetCode,
} from '../../../shared/schemas/builder';

export const WIDGET_BANK_NEW_PATH = '/admin/widget-bank/new';

export const widgetBankEditPath = (id: number) => `/admin/widget-bank/${id}/edit`;

/** Menyalin baris dengan id baru agar template hasil duplikasi tidak bertabrakan. */
function cloneRowsWithFreshIds(rows: CustomRow[]): CustomRow[] {
  return rows.map((row) => ({
    ...row,
    id: `${row.id}-copy`,
    columns: row.columns.map((blocks) =>
      blocks.map((block) => ({ ...block, id: `${block.id}-copy` } as CustomBlock)),
    ),
  }));
}

/**
 * Studio Bank Widget sebagai halaman penuh (`/admin/widget-bank/new` dan
 * `/admin/widget-bank/:id/edit`) agar ruang menyusun dan pratinjau tidak
 * terjepit di dalam modal.
 */
export const AdminWidgetBankStudio: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { tenant } = useTenant();
  const activeTenantId = useSiteStore((state) => state.activeTenantId);

  const primaryColor = tenant?.theme?.primaryColor ?? '#1e3a8a';
  const accentColor = tenant?.theme?.accentColor ?? '#fbbf24';

  const editingId = params.id ? Number(params.id) : null;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<CustomRow[]>([]);
  const [selected, setSelected] = useState<{ rowId: string; blockId: string } | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  /** Template yang isinya sudah dimuat; mencegah suntingan tertimpa refetch. */
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const starters = useMemo(() => createStarterPresets(), []);
  const loadKey = `${activeTenantId ?? 'none'}:${params.id ?? 'new'}`;

  const templatesQuery = useQuery({
    queryKey: ['admin', 'widget-bank', activeTenantId],
    queryFn: () => builderApi.widgetBank().then((res) => res.data.templates),
  });

  const templates = templatesQuery.data ?? [];
  const template = editingId === null ? undefined : templates.find((item) => item.id === editingId);

  // Isi formulir sekali per template: buat baru mulai dari kosong, sunting dari template.
  useEffect(() => {
    if (loadedKey === loadKey) return;
    if (editingId === null) {
      setName('');
      setDescription('');
      setRows([]);
      setSelected(null);
      setPreviewMode('desktop');
      setLoadedKey(loadKey);
      return;
    }
    if (!template) return;
    setName(template.name);
    setDescription(template.description ?? '');
    setRows(template.config.rows);
    const firstRow = template.config.rows[0];
    const firstBlock = firstRow?.columns[0]?.[0];
    setSelected(
      firstRow && firstBlock && template.config.rows.length === 1 && firstRow.columns.length === 1
        ? { rowId: firstRow.id, blockId: firstBlock.id }
        : null,
    );
    setPreviewMode('desktop');
    setLoadedKey(loadKey);
  }, [loadKey, loadedKey, editingId, template]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'widget-bank'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
  };

  // -------------------------------------------------------
  // Manipulasi baris & blok
  // -------------------------------------------------------

  const addRow = (layout: CustomRowLayout = '2-col') => {
    setRows((current) => [...current, createRow(layout)]);
  };

  const moveRow = (index: number, offset: number) => {
    setRows((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateRow = (rowId: string, updater: (row: CustomRow) => CustomRow) => {
    setRows((current) => current.map((row) => (row.id === rowId ? updater(row) : row)));
  };

  const changeRowLayout = (row: CustomRow, layout: CustomRowLayout) => {
    updateRow(row.id, (current) => resizeColumns(current, layout));
  };

  const addBlock = (row: CustomRow, colIndex: number, type: CustomBlock['type'], widgetCode?: EmbeddableWidgetCode) => {
    const block = createBlock(type, widgetCode);
    updateRow(row.id, (current) => ({
      ...current,
      columns: current.columns.map((blocks, index) =>
        index === colIndex ? [...blocks, block] : blocks,
      ),
    }));
    setSelected({ rowId: row.id, blockId: block.id });
  };

  const updateBlock = (rowId: string, blockId: string, patch: Record<string, unknown>) => {
    updateRow(rowId, (current) => ({
      ...current,
      columns: current.columns.map((blocks) =>
        blocks.map((block) => (block.id === blockId ? ({ ...block, ...patch } as CustomBlock) : block)),
      ),
    }));
  };

  const removeBlock = (rowId: string, blockId: string) => {
    updateRow(rowId, (current) => ({
      ...current,
      columns: current.columns.map((blocks) => blocks.filter((block) => block.id !== blockId)),
    }));
    if (selected?.blockId === blockId) setSelected(null);
  };

  const moveBlock = (rowId: string, colIndex: number, blockId: string, offset: number) => {
    updateRow(rowId, (current) => ({
      ...current,
      columns: current.columns.map((blocks, index) => {
        if (index !== colIndex) return blocks;
        const from = blocks.findIndex((block) => block.id === blockId);
        const to = from + offset;
        if (from < 0 || to < 0 || to >= blocks.length) return blocks;
        const next = [...blocks];
        [next[from], next[to]] = [next[to], next[from]];
        return next;
      }),
    }));
  };

  /** Memindahkan blok ke kolom lain pada baris yang sama. */
  const moveBlockToColumn = (rowId: string, fromCol: number, blockId: string, toCol: number) => {
    if (fromCol === toCol) return;
    updateRow(rowId, (current) => {
      const block = current.columns[fromCol]?.find((item) => item.id === blockId);
      if (!block || !current.columns[toCol]) return current;
      return {
        ...current,
        columns: current.columns.map((blocks, index) => {
          if (index === fromCol) return blocks.filter((item) => item.id !== blockId);
          if (index === toCol) return [...blocks, block];
          return blocks;
        }),
      };
    });
  };

  // -------------------------------------------------------
  // Handler formulir studio
  // -------------------------------------------------------

  const applyStarter = (starter: (typeof starters)[number]) => {
    setName(starter.name);
    setDescription(starter.description);
    setRows(cloneRowsWithFreshIds(starter.config.rows));
    setSelected(null);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        config: { rows },
      };
      return editingId === null
        ? builderApi.createWidgetTemplate(payload)
        : builderApi.updateWidgetTemplate(editingId, payload);
    },
    onSuccess: () => {
      toast.success(
        editingId === null ? 'Widget berhasil disimpan ke Bank Widget.' : 'Perubahan widget berhasil disimpan.',
      );
      refresh();
      navigate('/admin/widget-bank');
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const selectedBlock = useMemo(() => {
    if (!selected) return null;
    const row = rows.find((item) => item.id === selected.rowId);
    if (!row) return null;
    for (let colIndex = 0; colIndex < row.columns.length; colIndex += 1) {
      const block = row.columns[colIndex].find((item) => item.id === selected.blockId);
      if (block) return { row, colIndex, block };
    }
    return null;
  }, [rows, selected]);

  const createFromStarter = (index: number) => {
    const starter = starters[index];
    if (starter) applyStarter(starter);
  };

  const canSave = name.trim().length >= 2 && rows.length > 0 && !saveMutation.isPending;

  const backToBank = () => navigate('/admin/widget-bank');

  if (templatesQuery.isLoading || (editingId !== null && loadedKey !== loadKey)) {
    return (
      <AdminLayout title="Studio Bank Widget" description="Memuat isi widget.">
        <LoadingState label="Memuat widget" rows={4} />
      </AdminLayout>
    );
  }

  if (editingId !== null && !template) {
    return (
      <AdminLayout title="Studio Bank Widget" description="Widget yang dituju tidak tersedia.">
        <ErrorState message="Widget tidak ditemukan di Bank Widget program studi ini." onRetry={backToBank} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={editingId === null ? 'Buat Widget Baru' : 'Sunting Widget'}
      description="Susun baris dan kolom di sebelah kiri, lihat hasilnya langsung di sebelah kanan."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={backToBank} disabled={saveMutation.isPending} className="btn-secondary">
            <ArrowLeftIcon className="h-4 w-4" />
            Kembali
          </button>
          <button type="button" onClick={() => saveMutation.mutate()} disabled={!canSave} className="btn-primary">
            {saveMutation.isPending ? 'Menyimpan…' : 'Simpan Widget'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="rounded-[16px] border border-[#CBD5E1] bg-white p-5 shadow-2xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nama Widget" htmlFor="template-name" required hint="Contoh: Sambutan Kaprodi">
              <input
                id="template-name"
                type="text"
                className="field-input"
                maxLength={150}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field label="Keterangan" htmlFor="template-description" hint="Muncul di kartu galeri. Opsional.">
              <input
                id="template-description"
                type="text"
                className="field-input"
                maxLength={400}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
          </div>

          {editingId === null && rows.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
              <p className="text-[11px] font-bold text-slate-700">Mulai cepat dari contoh</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {starters.map((starter, index) => (
                  <button
                    key={starter.key}
                    type="button"
                    onClick={() => createFromStarter(index)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-bold text-slate-700 transition-colors hover:border-[#1e3a8a]/40 hover:text-[#1e3a8a]"
                  >
                    {starter.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,54%)_minmax(0,1fr)] xl:items-start">
          {/* Panel kiri: penyusun struktural */}
          <div className="space-y-3">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                <p className="text-xs font-bold text-slate-700">Belum ada baris</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Tambahkan baris pertama. Setiap baris bisa berisi 1 sampai 3 kolom.
                </p>
                <button
                  type="button"
                  onClick={() => addRow()}
                  className="mt-3 inline-flex h-8 items-center gap-1 rounded-lg bg-[#1e3a8a] px-3 text-xs font-bold text-white hover:bg-[#172f6e]"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Tambah Baris
                </button>
              </div>
            ) : (
              rows.map((row, rowIndex) => (
                <div key={row.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-slate-50/80 px-3 py-2">
                    <span className="text-[11px] font-extrabold text-slate-700">Baris {rowIndex + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveRow(rowIndex, -1)}
                        disabled={rowIndex === 0}
                        aria-label={`Naikkan baris ${rowIndex + 1}`}
                        className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <ArrowUpIcon className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRow(rowIndex, 1)}
                        disabled={rowIndex === rows.length - 1}
                        aria-label={`Turunkan baris ${rowIndex + 1}`}
                        className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <ArrowDownIcon className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                        aria-label={`Hapus baris ${rowIndex + 1}`}
                        className="rounded border border-rose-200 bg-white p-1 text-rose-600 hover:bg-rose-50"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 p-3">
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Tata letak</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ROW_LAYOUTS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => changeRowLayout(row, option.value)}
                            aria-pressed={row.layout === option.value}
                            className={`h-7 rounded-[7px] border px-2 text-[10px] font-bold transition-colors ${
                              row.layout === option.value
                                ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-[#1e3a8a]/40'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Latar</p>
                      <div className="flex gap-1.5">
                        {BACKGROUNDS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateRow(row.id, (current) => ({ ...current, background: option.value }))}
                            aria-pressed={row.background === option.value}
                            className={`flex h-7 items-center gap-1.5 rounded-[7px] border px-2 text-[10px] font-bold transition-colors ${
                              row.background === option.value
                                ? 'border-[#1e3a8a] text-[#1e3a8a] ring-1 ring-[#1e3a8a]/30'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <span className={`h-3 w-3 rounded-[3px] border ${option.swatch}`} />
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${row.columns.length}, minmax(0, 1fr))` }}>
                      {row.columns.map((blocks, colIndex) => (
                        <div key={`${row.id}-col-${colIndex}`} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2">
                          <p className="mb-1.5 text-[10px] font-bold text-slate-500">Kolom {colIndex + 1}</p>

                          <div className="space-y-1.5">
                            {blocks.map((block, blockIndex) => (
                              <div key={block.id} className="rounded-md border border-slate-200 bg-white">
                                <button
                                  type="button"
                                  onClick={() => setSelected({ rowId: row.id, blockId: block.id })}
                                  className={`flex w-full items-center justify-between gap-1 px-2 py-1.5 text-left text-[10px] font-bold ${
                                    selected?.blockId === block.id ? 'text-[#1e3a8a]' : 'text-slate-700'
                                  }`}
                                >
                                  <span className="truncate">{getBlockDisplayName(block)}</span>
                                  <ChevronRightIcon className="h-3 w-3 shrink-0 text-slate-400" />
                                </button>
                                <div className="flex items-center justify-end gap-0.5 border-t border-slate-100 px-1 py-0.5">
                                  <button
                                    type="button"
                                    onClick={() => moveBlock(row.id, colIndex, block.id, -1)}
                                    disabled={blockIndex === 0}
                                    aria-label="Naikkan blok"
                                    className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                                  >
                                    <ArrowUpIcon className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveBlock(row.id, colIndex, block.id, 1)}
                                    disabled={blockIndex === blocks.length - 1}
                                    aria-label="Turunkan blok"
                                    className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                                  >
                                    <ArrowDownIcon className="h-3 w-3" />
                                  </button>
                                  {row.columns.length > 1 ? (
                                    <select
                                      aria-label="Pindahkan ke kolom"
                                      value={colIndex}
                                      onChange={(event) =>
                                        moveBlockToColumn(row.id, colIndex, block.id, Number(event.target.value))
                                      }
                                      className="rounded border border-slate-200 bg-white px-0.5 text-[10px] text-slate-600"
                                    >
                                      {row.columns.map((_, index) => (
                                        <option key={index} value={index}>
                                          K{index + 1}
                                        </option>
                                      ))}
                                    </select>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => removeBlock(row.id, block.id)}
                                    aria-label="Hapus blok"
                                    className="rounded p-0.5 text-rose-500 hover:bg-rose-50"
                                  >
                                    <TrashIcon className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <select
                            aria-label={`Tambah blok ke kolom ${colIndex + 1}`}
                            value=""
                            onChange={(event) => {
                              const raw = event.target.value;
                              if (!raw) return;
                              if (raw.startsWith('widget:')) {
                                addBlock(row, colIndex, 'widget', raw.slice('widget:'.length) as EmbeddableWidgetCode);
                                return;
                              }
                              addBlock(row, colIndex, raw as CustomBlock['type']);
                            }}
                            className="mt-1.5 h-7 w-full rounded-md border border-dashed border-slate-300 bg-white px-1 text-[10px] font-semibold text-slate-600 hover:border-[#1e3a8a]/50"
                          >
                            <option value="">+ Tambah blok / modul</option>
                            <optgroup label="Konten Bebas">
                              {BLOCK_TYPES.map((option) => (
                                <option key={option.type} value={option.type}>
                                  {option.label} — {option.hint}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Modul & Data Prodi">
                              {EMBEDDABLE_WIDGET_CODES.map((code) => (
                                <option key={code} value={`widget:${code}`}>
                                  {EMBEDDABLE_WIDGET_META[code].label}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}

            {rows.length > 0 ? (
              <button
                type="button"
                onClick={() => addRow()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-[11px] font-bold text-slate-500 transition-colors hover:border-[#1e3a8a] hover:bg-blue-50/50 hover:text-[#1e3a8a]"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Tambah Baris
              </button>
            ) : null}

            {selectedBlock ? (
              <BlockEditor
                key={selectedBlock.block.id}
                block={selectedBlock.block}
                onChange={(patch) => updateBlock(selectedBlock.row.id, selectedBlock.block.id, patch)}
                onDelete={() => removeBlock(selectedBlock.row.id, selectedBlock.block.id)}
              />
            ) : null}
          </div>

          {/* Panel kanan: pratinjau langsung */}
          <div className="xl:sticky xl:top-4 xl:self-start">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-3 py-2">
                <span className="text-[11px] font-extrabold text-slate-700">Pratinjau Langsung</span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('desktop')}
                    aria-pressed={previewMode === 'desktop'}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
                      previewMode === 'desktop' ? 'bg-[#1e3a8a] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ComputerDesktopIcon className="h-3 w-3" />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('mobile')}
                    aria-pressed={previewMode === 'mobile'}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
                      previewMode === 'mobile' ? 'bg-[#1e3a8a] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <DevicePhoneMobileIcon className="h-3 w-3" />
                    Ponsel
                  </button>
                </div>
              </div>
              <div className={`bg-white ${previewMode === 'mobile' ? 'px-6 py-4' : ''}`}>
                <div className={previewMode === 'mobile' ? 'rounded-[20px] border border-slate-300 bg-white p-2' : ''}>
                  <CustomLayoutWidget
                    rows={rows}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                    interactive
                    forceMobile={previewMode === 'mobile'}
                    selectedBlockId={selected?.blockId ?? null}
                    onSelectBlock={(rowId, _colIndex, blockId) => setSelected({ rowId, blockId })}
                    renderEmbeddedWidget={(embeddedCode, embeddedConfig) => (
                      <WidgetRenderer widgetCode={embeddedCode} config={embeddedConfig} />
                    )}
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Klik blok pada pratinjau untuk langsung menyunting isinya. Warna mengikuti tema prodi
              ({primaryColor}), jadi tampilannya sama dengan website publik.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

// ---------------------------------------------------------
// Editor isi blok terpilih
// ---------------------------------------------------------

const BlockEditor: React.FC<{
  block: CustomBlock;
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
}> = ({ block, onChange, onDelete }) => {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Pilih berkas gambar (JPG, PNG, atau WebP).');
      return;
    }
    setUploading(true);
    try {
      const res = await mediaApi.upload(file);
      onChange({ imageUrl: res.data.asset.url });
      toast.success('Gambar berhasil diunggah.');
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setUploading(false);
    }
  };

  const title = getBlockDisplayName(block);

  return (
    <div className="rounded-xl border border-[#1e3a8a]/30 bg-blue-50/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#1e3a8a]">
          <Squares2X2Icon className="h-3.5 w-3.5" />
          {title}
        </span>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Hapus blok terpilih"
          className="rounded p-0.5 text-rose-500 hover:bg-rose-50"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {block.type === 'text' ? (
          <>
            <label className="field-label">
              Label kecil (eyebrow)
              <input
                type="text"
                className="field-input"
                maxLength={80}
                value={block.eyebrow ?? ''}
                onChange={(event) => onChange({ eyebrow: event.target.value })}
              />
            </label>
            <label className="field-label">
              Judul
              <input
                type="text"
                className="field-input"
                maxLength={160}
                value={block.title}
                onChange={(event) => onChange({ title: event.target.value })}
              />
            </label>
            <label className="field-label">
              Isi
              <textarea
                className="field-input"
                rows={6}
                maxLength={4000}
                value={block.body}
                onChange={(event) => onChange({ body: event.target.value })}
              />
            </label>
            <label className="field-label">
              Perataan
              <select
                className="field-input"
                value={block.align}
                onChange={(event) => onChange({ align: event.target.value })}
              >
                <option value="left">Kiri</option>
                <option value="center">Tengah</option>
              </select>
            </label>
          </>
        ) : null}

        {block.type === 'image' ? (
          <>
            <label className="field-label">
              URL Gambar
              <input
                type="text"
                className="field-input"
                value={block.imageUrl}
                onChange={(event) => onChange({ imageUrl: event.target.value })}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                  event.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#1e3a8a]/30 bg-white px-2.5 text-[11px] font-bold text-[#1e3a8a] disabled:opacity-60"
              >
                <PhotoIcon className="h-3.5 w-3.5" />
                {uploading ? 'Mengunggah…' : 'Unggah Gambar'}
              </button>
            </div>
            <label className="field-label">
              Teks alternatif
              <input
                type="text"
                className="field-input"
                maxLength={200}
                value={block.alt}
                onChange={(event) => onChange({ alt: event.target.value })}
              />
            </label>
            <label className="field-label">
              Keterangan
              <input
                type="text"
                className="field-input"
                maxLength={240}
                value={block.caption}
                onChange={(event) => onChange({ caption: event.target.value })}
              />
            </label>
            <label className="field-label">
              Rasio
              <select
                className="field-input"
                value={block.ratio}
                onChange={(event) => onChange({ ratio: event.target.value })}
              >
                <option value="4:3">4:3</option>
                <option value="1:1">1:1</option>
                <option value="16:9">16:9</option>
                <option value="3:4">3:4</option>
              </select>
            </label>
          </>
        ) : null}

        {block.type === 'button' ? (
          <>
            <label className="field-label">
              Teks Tombol
              <input
                type="text"
                className="field-input"
                maxLength={120}
                value={block.label}
                onChange={(event) => onChange({ label: event.target.value })}
              />
            </label>
            <label className="field-label">
              Tautan
              <input
                type="text"
                className="field-input"
                value={block.url}
                onChange={(event) => onChange({ url: event.target.value })}
              />
            </label>
            <label className="field-label">
              Gaya
              <select
                className="field-input"
                value={block.style}
                onChange={(event) => onChange({ style: event.target.value })}
              >
                <option value="primary">Utama</option>
                <option value="secondary">Sekunder</option>
              </select>
            </label>
            <label className="field-label">
              Perataan
              <select
                className="field-input"
                value={block.align}
                onChange={(event) => onChange({ align: event.target.value })}
              >
                <option value="left">Kiri</option>
                <option value="center">Tengah</option>
              </select>
            </label>
          </>
        ) : null}

        {block.type === 'list' ? (
          <>
            <label className="field-label">
              Judul
              <input
                type="text"
                className="field-input"
                maxLength={160}
                value={block.title}
                onChange={(event) => onChange({ title: event.target.value })}
              />
            </label>
            <label className="field-label">
              Gaya
              <select
                className="field-input"
                value={block.style}
                onChange={(event) => onChange({ style: event.target.value })}
              >
                <option value="check">Centang</option>
                <option value="number">Nomor</option>
              </select>
            </label>
            <label className="field-label">
              Item (satu per baris)
              <textarea
                className="field-input"
                rows={6}
                value={block.items.join('\n')}
                onChange={(event) =>
                  onChange({
                    items: event.target.value
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          </>
        ) : null}

        {block.type === 'stat' ? (
          <>
            <label className="field-label">
              Angka
              <input
                type="text"
                className="field-input"
                maxLength={20}
                value={block.value}
                onChange={(event) => onChange({ value: event.target.value })}
              />
            </label>
            <label className="field-label">
              Label
              <input
                type="text"
                className="field-input"
                maxLength={120}
                value={block.label}
                onChange={(event) => onChange({ label: event.target.value })}
              />
            </label>
            <label className="field-label">
              Keterangan
              <input
                type="text"
                className="field-input"
                maxLength={240}
                value={block.description ?? ''}
                onChange={(event) => onChange({ description: event.target.value })}
              />
            </label>
          </>
        ) : null}

        {block.type === 'youtube' ? (
          <>
            <label className="field-label">
              URL YouTube
              <input
                type="text"
                className="field-input"
                placeholder="https://www.youtube.com/watch?v=..."
                value={block.url}
                onChange={(event) => onChange({ url: event.target.value })}
              />
            </label>
            <label className="field-label">
              Keterangan
              <input
                type="text"
                className="field-input"
                maxLength={240}
                value={block.caption}
                onChange={(event) => onChange({ caption: event.target.value })}
              />
            </label>
          </>
        ) : null}

        {block.type === 'widget' ? (
          <div className="space-y-3">
            <label className="field-label">
              Jenis Modul Prodi
              <select
                className="field-input"
                value={block.widgetCode}
                onChange={(event) =>
                  onChange({
                    widgetCode: event.target.value as EmbeddableWidgetCode,
                    config: {},
                  })
                }
              >
                {EMBEDDABLE_WIDGET_CODES.map((code) => (
                  <option key={code} value={code}>
                    {EMBEDDABLE_WIDGET_META[code].label} — {EMBEDDABLE_WIDGET_META[code].hint}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-[#1e3a8a]">
                <Squares2X2Icon className="h-3.5 w-3.5" />
                <span>Pengaturan Modul</span>
              </div>
              <WidgetVisualForm
                widgetCode={block.widgetCode}
                config={block.config ?? {}}
                onChange={(nextConfig) => onChange({ config: nextConfig })}
              />
            </div>
          </div>
        ) : null}
      </div>

      <p className="mt-2 flex items-start gap-1 text-[10px] leading-snug text-slate-500">
        <CheckCircleIcon className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
        Perubahan langsung terlihat pada pratinjau di sebelah kanan.
      </p>
    </div>
  );
};
