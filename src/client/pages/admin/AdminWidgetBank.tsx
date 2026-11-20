import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  Bars3BottomLeftIcon,
  BoltIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  DevicePhoneMobileIcon,
  DocumentDuplicateIcon,
  ListBulletIcon,
  ComputerDesktopIcon,
  LinkIcon,
  PhotoIcon,
  PlayCircleIcon,
  PlusIcon,
  RectangleStackIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { FormModal, Field } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { useNotifier } from '../../components/ui/Notifier';
import { usePermission, useTenant } from '../../hooks/useSite';
import { useSiteStore } from '../../app/siteStore';
import { builderApi, mediaApi, type WidgetTemplateItem } from '../../services/adminApi';
import { firstFieldError, toApiError } from '../../services/api';
import { CustomLayoutWidget } from '../../components/builder/CustomLayoutWidget';
import {
  columnCountForLayout,
  type CustomBlock,
  type CustomLayoutTemplateConfig,
  type CustomRow,
  type CustomRowBackground,
  type CustomRowLayout,
} from '../../../shared/schemas/builder';

// ---------------------------------------------------------
// Konstanta tampilan
// ---------------------------------------------------------

const ROW_LAYOUTS: Array<{ value: CustomRowLayout; label: string }> = [
  { value: '1-col', label: '1 kolom' },
  { value: '2-col', label: '2 kolom' },
  { value: '2-col-left', label: '2 kolom · kiri lebar' },
  { value: '2-col-right', label: '2 kolom · kanan lebar' },
  { value: '3-col', label: '3 kolom' },
];

const BACKGROUNDS: Array<{ value: CustomRowBackground; label: string; swatch: string }> = [
  { value: 'white', label: 'Putih', swatch: 'bg-white border-slate-300' },
  { value: 'soft', label: 'Abu lembut', swatch: 'bg-slate-100 border-slate-300' },
  { value: 'tinted', label: 'Bernuansa tema', swatch: 'bg-blue-50 border-blue-300' },
];

const BLOCK_TYPES: Array<{
  type: CustomBlock['type'];
  label: string;
  hint: string;
  icon: React.ElementType;
}> = [
  { type: 'text', label: 'Teks', hint: 'Judul & paragraf', icon: Bars3BottomLeftIcon },
  { type: 'image', label: 'Gambar', hint: 'Foto atau ilustrasi', icon: PhotoIcon },
  { type: 'button', label: 'Tombol', hint: 'Tautan ajakan', icon: LinkIcon },
  { type: 'list', label: 'Daftar Poin', hint: 'Poin bercentang / nomor', icon: ListBulletIcon },
  { type: 'stat', label: 'Angka Sorotan', hint: 'Statistik & pencapaian', icon: ChartBarIcon },
  { type: 'youtube', label: 'Video YouTube', hint: 'Sematkan video', icon: PlayCircleIcon },
];

const BLOCK_LABEL: Record<CustomBlock['type'], string> = {
  text: 'Teks',
  image: 'Gambar',
  button: 'Tombol',
  list: 'Daftar Poin',
  stat: 'Angka Sorotan',
  youtube: 'Video YouTube',
};

const LABEL_BACKGROUND: Record<CustomRowBackground, string> = {
  white: 'Putih',
  soft: 'Abu lembut',
  tinted: 'Bernuansa tema',
};

const LABEL_LAYOUT: Record<CustomRowLayout, string> = {
  '1-col': '1 kolom',
  '2-col': '2 kolom',
  '2-col-left': '2 kolom · kiri lebar',
  '2-col-right': '2 kolom · kanan lebar',
  '3-col': '3 kolom',
};

/** Pratinjau kerangka kolom tanpa teks, dipakai pada kartu galeri. */
const WIREFRAME_COLUMNS: Record<CustomRowLayout, number[]> = {
  '1-col': [1],
  '2-col': [1, 1],
  '2-col-left': [2, 1],
  '2-col-right': [1, 2],
  '3-col': [1, 1, 1],
};

// ---------------------------------------------------------
// Pembuat blok & baris baru
// ---------------------------------------------------------

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter.toString(36)}`;
}

function createBlock(type: CustomBlock['type']): CustomBlock {
  const id = newId(type);
  switch (type) {
    case 'text':
      return { id, type, eyebrow: '', title: '', body: '', align: 'left' };
    case 'image':
      return { id, type, imageUrl: '', alt: '', caption: '', ratio: '4:3' };
    case 'button':
      return { id, type, label: 'Pelajari Selengkapnya', url: '/', style: 'primary', align: 'left' };
    case 'list':
      return { id, type, title: '', items: [], style: 'check' };
    case 'stat':
      return { id, type, value: '100%', label: 'Judul Sorotan', description: '' };
    case 'youtube':
      return { id, type, url: '', caption: '' };
  }
}

function createRow(layout: CustomRowLayout = '2-col'): CustomRow {
  const count = columnCountForLayout(layout);
  return {
    id: newId('row'),
    layout,
    background: 'white',
    columns: Array.from({ length: count }, () => []),
  };
}

/** Menyesuaikan jumlah kolom saat tata letak baris diganti tanpa membuang isi. */
function resizeColumns(row: CustomRow, layout: CustomRowLayout): CustomRow {
  const count = columnCountForLayout(layout);
  const columns = Array.from({ length: count }, (_, index) => row.columns[index] ?? []);
  return { ...row, layout, columns };
}

// ---------------------------------------------------------
// Contoh siap pakai untuk pengguna awam
// ---------------------------------------------------------

const STARTER_ROW_ID = 'starter-row';

function createStarterPresets(): Array<{ key: string; name: string; description: string; config: CustomLayoutTemplateConfig }> {
  return [
    {
      key: 'pengantar-gambar',
      name: 'Pengantar & Gambar',
      description: 'Teks sambutan dengan foto pendamping.',
      config: {
        rows: [
          {
            id: STARTER_ROW_ID,
            layout: '2-col-left',
            background: 'white',
            columns: [
              [
                { id: 'starter-a', type: 'text', eyebrow: 'Tentang Kami', title: 'Kualitas akademik yang terukur', body: 'Tuliskan pengantar singkat program studi di sini.\n\nParagraf kedua dapat menjelaskan keunggulan utama.', align: 'left' },
                { id: 'starter-b', type: 'button', label: 'Kenali Lebih Dekat', url: '/profil', style: 'primary', align: 'left' },
              ],
              [{ id: 'starter-c', type: 'image', imageUrl: '', alt: 'Foto kegiatan program studi', caption: '', ratio: '4:3' }],
            ],
          },
        ],
      },
    },
    {
      key: 'sorotan-angka',
      name: 'Sorotan Angka',
      description: 'Tiga indikator capaian berdampingan.',
      config: {
        rows: [
          {
            id: STARTER_ROW_ID,
            layout: '3-col',
            background: 'soft',
            columns: [
              [{ id: 'starter-a', type: 'stat', value: '1.200+', label: 'Mahasiswa Aktif', description: 'Angkatan 2019 sampai sekarang.' }],
              [{ id: 'starter-b', type: 'stat', value: '98%', label: 'Lulusan Terserap', description: 'Bekerja dalam 6 bulan pertama.' }],
              [{ id: 'starter-c', type: 'stat', value: '24', label: 'Mitra Industri', description: 'Kerja sama magang dan riset.' }],
            ],
          },
        ],
      },
    },
    {
      key: 'daftar-keunggulan',
      name: 'Daftar Keunggulan',
      description: 'Poin bercentang dengan judul penjelas.',
      config: {
        rows: [
          {
            id: STARTER_ROW_ID,
            layout: '2-col',
            background: 'white',
            columns: [
              [{ id: 'starter-a', type: 'text', eyebrow: 'Mengapa Memilih Kami', title: 'Fasilitas belajar yang lengkap', body: 'Semua kebutuhan praktik mahasiswa tersedia di lingkungan kampus.', align: 'left' }],
              [
                {
                  id: 'starter-b',
                  type: 'list',
                  title: 'Keunggulan',
                  items: ['Laboratorium modern', 'Dosen bergelar doktor', 'Program magang bersertifikat'],
                  style: 'check',
                },
              ],
            ],
          },
        ],
      },
    },
    {
      key: 'video-profil',
      name: 'Video Profil',
      description: 'Video YouTube bersanding dengan narasi.',
      config: {
        rows: [
          {
            id: STARTER_ROW_ID,
            layout: '2-col-left',
            background: 'white',
            columns: [
              [{ id: 'starter-a', type: 'youtube', url: '', caption: 'Video profil program studi' }],
              [
                { id: 'starter-b', type: 'text', eyebrow: 'Galeri Video', title: 'Mengenal kampus kami', body: 'Tempel tautan YouTube pada panel kiri untuk langsung menampilkan videonya di sini.', align: 'left' },
              ],
            ],
          },
        ],
      },
    },
  ];
}

/** Membuang dua karakter pertama id agar tidak bertabrakan saat template dipakai berulang. */
function cloneRowsWithFreshIds(rows: CustomRow[]): CustomRow[] {
  return rows.map((row) => ({
    ...row,
    id: newId('row'),
    columns: row.columns.map((blocks) =>
      blocks.map((block) => ({ ...block, id: newId(block.type) })),
    ),
  }));
}

// ---------------------------------------------------------
// Halaman
// ---------------------------------------------------------

export const AdminWidgetBank: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const notifier = useNotifier();
  const { has } = usePermission();
  const { tenant } = useTenant();
  const activeTenantId = useSiteStore((state) => state.activeTenantId);

  const primaryColor = tenant?.theme?.primaryColor ?? '#1e3a8a';
  const accentColor = tenant?.theme?.accentColor ?? '#fbbf24';

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<CustomRow[]>([]);
  const [selected, setSelected] = useState<{ rowId: string; blockId: string } | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const starters = useMemo(() => createStarterPresets(), []);

  const templatesQuery = useQuery({
    queryKey: ['admin', 'widget-bank', activeTenantId],
    queryFn: () => builderApi.widgetBank().then((res) => res.data.templates),
  });

  const templates = templatesQuery.data ?? [];

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'widget-bank'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'page'] });
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setRows([]);
    setSelected(null);
    setPreviewMode('desktop');
  };

  const openCreate = (label = '', body = '', config?: CustomLayoutTemplateConfig) => {
    resetForm();
    setName(label);
    setDescription(body);
    if (config?.rows.length) {
      const cloned = cloneRowsWithFreshIds(config.rows);
      setRows(cloned);
      setSelected(null);
    }
    setEditorOpen(true);
  };

  const openEdit = (template: WidgetTemplateItem) => {
    resetForm();
    setEditingId(template.id);
    setName(template.name);
    setDescription(template.description ?? '');
    setRows(template.config.rows);
    setEditorOpen(true);
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
      setEditorOpen(false);
      resetForm();
      refresh();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
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

  // -------------------------------------------------------
  // Manipulasi baris & blok pada studio
  // -------------------------------------------------------

  const addRow = (layout: CustomRowLayout = '2-col') => {
    const row = createRow(layout);
    setRows((current) => [...current, row]);
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

  const addBlock = (row: CustomRow, colIndex: number, type: CustomBlock['type']) => {
    const block = createBlock(type);
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

  /** Rekomendasi pertama sebagai langkah awal pengguna yang belum punya widget. */
  const createFromStarter = (index: number) => {
    const starter = starters[index];
    if (!starter) return;
    openCreate(starter.name, starter.description, starter.config);
  };

  const canSave = name.trim().length >= 2 && rows.length > 0 && !saveMutation.isPending;

  return (
    <AdminLayout
      title="Bank Widget"
      description="Susun widget susunan kolom sendiri, lalu pakai ulang di Visual Page Builder. Perubahan otomatis mengikuti semua halaman yang memakainya."
      actions={
        has('builder.create') ? (
          <button type="button" onClick={() => openCreate()} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Buat Widget Baru
          </button>
        ) : null
      }
    >
      <div className="space-y-5">
        {/* Langkah penggunaan untuk pengguna awam */}
        <section className="relative overflow-hidden rounded-[16px] border border-[#CBD5E1] bg-white px-5 py-4 shadow-2xs">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 select-none bg-cover bg-right opacity-40"
            style={{ backgroundImage: "url('/assets/admin-header-texture.png')" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white via-white/92 to-transparent"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-slate-900">Cara kerja Bank Widget</p>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">
                Buat sekali, pakai di banyak halaman. Mengubah isi widget di sini akan langsung memperbarui
                semua halaman yang memakainya — tanpa perlu menyunting halaman satu per satu.
              </p>
            </div>
            <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              {['Buat widget', 'Susun kolom', 'Pakai di Page Builder'].map((step, index) => (
                <li key={step} className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1e3a8a] text-[10px] font-extrabold text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                  {index < 2 ? <ChevronRightIcon className="h-3 w-3 text-slate-400" /> : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Galeri widget milik prodi */}
        {templatesQuery.isLoading ? (
          <LoadingState label="Memuat Bank Widget" rows={3} />
        ) : templatesQuery.isError ? (
          <ErrorState
            message={toApiError(templatesQuery.error).message}
            onRetry={() => void templatesQuery.refetch()}
          />
        ) : templates.length === 0 ? (
          <div className="space-y-4">
            <EmptyState
              title="Bank Widget masih kosong"
              description="Mulai dari contoh siap pakai di bawah ini, atau buat widget kosong lalu susun kolomnya sendiri."
              action={
                has('builder.create') ? (
                  <button type="button" onClick={() => openCreate()} className="btn-primary">
                    <PlusIcon className="h-4 w-4" />
                    Buat Widget Kosong
                  </button>
                ) : null
              }
            />
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Mulai dari contoh
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {starters.map((starter, index) => (
                  <button
                    key={starter.key}
                    type="button"
                    disabled={!has('builder.create')}
                    onClick={() => createFromStarter(index)}
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
            </div>
          </div>
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
                    {template.usageCount > 0
                      ? `Dipakai di ${template.usageCount} halaman`
                      : 'Belum dipakai'}
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
                        {WIREFRAME_COLUMNS[row.layout].map((weight, index) => (
                          <div
                            key={`${row.id}-${index}`}
                            className="h-6 rounded-[4px] border border-slate-200 bg-slate-50"
                            style={{ flexGrow: weight }}
                          />
                        ))}
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
                        onClick={() => openEdit(template)}
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

      <FormModal
        open={editorOpen}
        title={editingId === null ? 'Buat Widget Baru' : 'Sunting Widget'}
        description="Susun baris dan kolom di sebelah kiri, lihat hasilnya langsung di sebelah kanan."
        submitLabel="Simpan Widget"
        busy={saveMutation.isPending}
        size="xl"
        tall
        onClose={() => {
          setEditorOpen(false);
          resetForm();
        }}
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) return;
          saveMutation.mutate();
        }}
      >
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          {/* Panel kiri: penyusun struktural */}
          <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
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
                                  <span className="truncate">{BLOCK_LABEL[block.type]}</span>
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
                              const type = event.target.value as CustomBlock['type'];
                              if (type) addBlock(row, colIndex, type);
                            }}
                            className="mt-1.5 h-7 w-full rounded-md border border-dashed border-slate-300 bg-white px-1 text-[10px] font-semibold text-slate-600 hover:border-[#1e3a8a]/50"
                          >
                            <option value="">+ Tambah blok</option>
                            {BLOCK_TYPES.map((option) => (
                              <option key={option.type} value={option.type}>
                                {option.label} — {option.hint}
                              </option>
                            ))}
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
          <div className="lg:sticky lg:top-4 lg:self-start">
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
              <div
                className={`max-h-[62vh] overflow-y-auto overflow-x-hidden bg-white ${
                  previewMode === 'mobile' ? 'px-6 py-4' : ''
                }`}
              >
                <div className={previewMode === 'mobile' ? 'rounded-[20px] border border-slate-300 bg-white p-2' : ''}>
                  <CustomLayoutWidget
                    rows={rows}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                    interactive
                    forceMobile={previewMode === 'mobile'}
                    selectedBlockId={selected?.blockId ?? null}
                    onSelectBlock={(rowId, _colIndex, blockId) => setSelected({ rowId, blockId })}
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
      </FormModal>
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

  const title = BLOCK_LABEL[block.type];

  return (
    <div className="rounded-xl border-2 border-[#1e3a8a]/30 bg-white p-3 shadow-2xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-extrabold text-[#1e3a8a]">Sunting Blok: {title}</span>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
        >
          <TrashIcon className="h-3 w-3" />
          Hapus
        </button>
      </div>

      <div className="space-y-2.5">
        {block.type === 'text' ? (
          <>
            <label className="field-label">
              Label kecil (opsional)
              <input
                type="text"
                className="field-input"
                maxLength={100}
                value={block.eyebrow}
                onChange={(event) => onChange({ eyebrow: event.target.value })}
              />
            </label>
            <label className="field-label">
              Judul
              <input
                type="text"
                className="field-input"
                maxLength={200}
                value={block.title}
                onChange={(event) => onChange({ title: event.target.value })}
              />
            </label>
            <label className="field-label">
              Paragraf
              <textarea
                className="field-input min-h-[86px]"
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
                <option value="left">Rata kiri</option>
                <option value="center">Tengah</option>
              </select>
            </label>
          </>
        ) : null}

        {block.type === 'image' ? (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#1e3a8a]/25 bg-white px-3 text-[11px] font-bold text-[#1e3a8a] hover:border-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white disabled:opacity-60"
              >
                <PhotoIcon className="h-3.5 w-3.5" />
                {uploading ? 'Mengunggah...' : 'Unggah Gambar'}
              </button>
              {block.imageUrl ? (
                <button
                  type="button"
                  onClick={() => onChange({ imageUrl: '' })}
                  className="text-[11px] font-semibold text-rose-600 hover:underline"
                >
                  Lepas gambar
                </button>
              ) : null}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void handleUpload(file);
                }}
              />
            </div>
            <label className="field-label">
              URL gambar (boleh diisi manual)
              <input
                type="text"
                className="field-input"
                value={block.imageUrl}
                onChange={(event) => onChange({ imageUrl: event.target.value })}
              />
            </label>
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
                maxLength={300}
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
                <option value="16:9">16:9</option>
                <option value="1:1">1:1</option>
                <option value="auto">Menyesuaikan gambar</option>
              </select>
            </label>
          </>
        ) : null}

        {block.type === 'button' ? (
          <>
            <label className="field-label">
              Label tombol
              <input
                type="text"
                className="field-input"
                maxLength={80}
                value={block.label}
                onChange={(event) => onChange({ label: event.target.value })}
              />
            </label>
            <label className="field-label">
              Tautan tujuan
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
                <option value="primary">Tombol penuh warna</option>
                <option value="outline">Garis tepi</option>
              </select>
            </label>
            <label className="field-label">
              Perataan
              <select
                className="field-input"
                value={block.align}
                onChange={(event) => onChange({ align: event.target.value })}
              >
                <option value="left">Rata kiri</option>
                <option value="center">Tengah</option>
              </select>
            </label>
          </>
        ) : null}

        {block.type === 'list' ? (
          <>
            <label className="field-label">
              Judul daftar
              <input
                type="text"
                className="field-input"
                maxLength={160}
                value={block.title}
                onChange={(event) => onChange({ title: event.target.value })}
              />
            </label>
            <label className="field-label">
              Poin (satu per baris)
              <textarea
                className="field-input min-h-[96px]"
                value={block.items.join('\n')}
                onChange={(event) =>
                  onChange({
                    items: event.target.value
                      .split('\n')
                      .map((item) => item.slice(0, 300))
                      .slice(0, 20),
                  })
                }
              />
            </label>
            <label className="field-label">
              Penanda
              <select
                className="field-input"
                value={block.style}
                onChange={(event) => onChange({ style: event.target.value })}
              >
                <option value="check">Centang</option>
                <option value="number">Nomor</option>
              </select>
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
                maxLength={40}
                value={block.value}
                onChange={(event) => onChange({ value: event.target.value })}
              />
            </label>
            <label className="field-label">
              Judul sorotan
              <input
                type="text"
                className="field-input"
                maxLength={100}
                value={block.label}
                onChange={(event) => onChange({ label: event.target.value })}
              />
            </label>
            <label className="field-label">
              Penjelasan
              <textarea
                className="field-input min-h-[64px]"
                maxLength={300}
                value={block.description}
                onChange={(event) => onChange({ description: event.target.value })}
              />
            </label>
          </>
        ) : null}

        {block.type === 'youtube' ? (
          <>
            <label className="field-label">
              Tautan YouTube
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
      </div>

      <p className="mt-2 flex items-start gap-1 text-[10px] leading-snug text-slate-500">
        <CheckCircleIcon className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
        Perubahan langsung terlihat pada pratinjau di sebelah kanan.
      </p>
    </div>
  );
};
