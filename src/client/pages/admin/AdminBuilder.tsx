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
  ChevronDownIcon,
  ChevronRightIcon,
  AcademicCapIcon,
  BookOpenIcon,
  NewspaperIcon,
  HomeIcon,
  PhoneIcon,
  DocumentCheckIcon,
  Bars3Icon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { builderApi, settingsApi, type BuilderPage, type BuilderSection, type BuilderWidgetInstance, type MenuItem } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';
import { WidgetVisualForm } from '../../components/builder/WidgetVisualForm';

/** Membaca konfigurasi widget dari JSON tersimpan. */
function parseConfig(raw: string): Record<string, unknown> {
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Label tampilan widget.
 *
 * Widget yang datanya ditarik otomatis memakai nama menu di sidebar admin
 * (Konten & Akademik) agar admin langsung tahu asal datanya. Widget kustom
 * tetap memakai nama aslinya karena isinya diisi manual di sini.
 */
const WIDGET_SIDEBAR_LABELS: Record<string, string> = {
  curriculum_overview: 'Kurikulum & MK',
  lecturer_list: 'Dosen & Tenaga Ahli',
  document_list: 'Dokumen & SK',
  facility_grid: 'Sarana & Prasarana',
  latest_news: 'Berita & Artikel',
  gallery_grid: 'Galeri Kegiatan',
  contact_information: 'Kontak & Pesan',
  hero_slider: 'Hero Slider (Banner Beranda)',
  about_prodi: 'Profil Program Studi',
  vision_mission: 'Visi & Misi Prodi',
  statistics: 'Statistik Prodi',
  cta_banner: 'Banner Ajakan (CTA)',
};

/** Nama widget yang dipakai di dropdown & kartu: label sidebar untuk widget dinamis. */
function getWidgetDisplayName(code: string, fallbackName: string): string {
  return WIDGET_SIDEBAR_LABELS[code] ?? fallbackName;
}

/** Metadata tipe sumber widget: Modul Akademik/Konten (Dinamis) vs Kustom/Media (Input Langsung) */
function getWidgetOriginMeta(widgetCode: string): {
  type: 'dynamic' | 'custom';
  badge: string;
  badgeClass: string;
  sourceDesc: string;
  manageRoute?: string;
  manageLabel?: string;
} {
  switch (widgetCode) {
    case 'latest_news':
      return {
        type: 'dynamic',
        badge: 'Dari Menu: Berita & Artikel',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        sourceDesc: 'Data otomatis dari menu Berita & Artikel.',
        manageRoute: '/admin/berita',
        manageLabel: 'Kelola Berita',
      };
    case 'lecturer_list':
      return {
        type: 'dynamic',
        badge: 'Dari Menu: Dosen & Tenaga Ahli',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        sourceDesc: 'Data otomatis dari menu Dosen & Tenaga Ahli.',
        manageRoute: '/admin/dosen',
        manageLabel: 'Kelola Dosen',
      };
    case 'curriculum_overview':
      return {
        type: 'dynamic',
        badge: 'Dari Menu: Kurikulum & MK',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        sourceDesc: 'Data otomatis dari menu Kurikulum & MK.',
        manageRoute: '/admin/kurikulum',
        manageLabel: 'Kelola Kurikulum',
      };
    case 'facility_grid':
      return {
        type: 'dynamic',
        badge: 'Dari Menu: Sarana & Prasarana',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        sourceDesc: 'Data otomatis dari menu Sarana & Prasarana.',
        manageRoute: '/admin/sarpras',
        manageLabel: 'Kelola Sarpras',
      };
    case 'document_list':
      return {
        type: 'dynamic',
        badge: 'Dari Menu: Dokumen & SK',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        sourceDesc: 'Data otomatis dari menu Dokumen & SK.',
        manageRoute: '/admin/dokumen',
        manageLabel: 'Kelola Dokumen',
      };
    case 'gallery_grid':
      return {
        type: 'dynamic',
        badge: 'Dari Menu: Galeri Kegiatan',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
        sourceDesc: 'Data otomatis dari menu Galeri Kegiatan.',
        manageRoute: '/admin/galeri',
        manageLabel: 'Kelola Galeri',
      };
    case 'contact_information':
      return {
        type: 'dynamic',
        badge: 'Dari Menu: Kontak & Pesan',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        sourceDesc: 'Data otomatis dari menu Kontak & Pesan.',
        manageRoute: '/admin/kontak',
        manageLabel: 'Pengaturan Kontak',
      };
    case 'hero_slider':
      return {
        type: 'custom',
        badge: 'Media & Slide',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
        sourceDesc: 'Slide banner & gambar diisi langsung via Page Builder.',
      };
    case 'about_prodi':
      return {
        type: 'custom',
        badge: 'Editor Konten',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
        sourceDesc: 'Teks narasi profil & foto diatur langsung di Page Builder.',
      };
    case 'vision_mission':
      return {
        type: 'custom',
        badge: 'Editor Konten',
        badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
        sourceDesc: 'Visi & butir misi diatur langsung di Page Builder.',
      };
    case 'statistics':
      return {
        type: 'custom',
        badge: 'Statistik Kustom',
        badgeClass: 'bg-lime-50 text-lime-800 border-lime-200',
        sourceDesc: 'Indikator angka capaian prodi diisi manual di Page Builder.',
      };
    case 'cta_banner':
      return {
        type: 'custom',
        badge: 'Banner Kustom',
        badgeClass: 'bg-pink-50 text-pink-700 border-pink-200',
        sourceDesc: 'Ajakan aksi / PMB & tautan diisi langsung di Page Builder.',
      };
    default:
      return {
        type: 'custom',
        badge: 'Kustom',
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
        sourceDesc: 'Konfigurasi widget kustom.',
      };
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
  const [sectionDraft, setSectionDraft] = useState({
    sectionKey: 'content',
    title: '',
    widgetCode: 'about_prodi',
    /** Judul tampilan widget yang dilihat pengunjung (boleh berbeda dari nama modul). */
    widgetTitle: '',
    /** Deskripsi singkat / pengantar seksi pada website publik. */
    widgetDescription: '',
  });
  const [widgetFormOpen, setWidgetFormOpen] = useState(false);
  const [widgetSectionId, setWidgetSectionId] = useState<number | null>(null);
  const [widgetDraft, setWidgetDraft] = useState({
    widgetCode: 'about_prodi',
    variantCode: '',
    widgetTitle: '',
    widgetDescription: '',
  });
  const [configTarget, setConfigTarget] = useState<BuilderWidgetInstance | null>(null);
  const [configFormState, setConfigFormState] = useState<Record<string, any>>({});
  const [configMode, setConfigMode] = useState<'visual' | 'json'>('visual');
  const [configText, setConfigText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'section' | 'widget'; id: number; label: string } | null>(
    null,
  );
  const [publishTarget, setPublishTarget] = useState<BuilderPage | null>(null);
  
  // State untuk Tambah / Ubah Navbar Baru (Tunggal vs Dropdown)
  const [navbarFormOpen, setNavbarFormOpen] = useState(false);
  const [navbarType, setNavbarType] = useState<'single' | 'dropdown'>('single');
  const [dropdownItems, setDropdownItems] = useState<Array<{ title: string; slug: string }>>([
    { title: '', slug: '' },
  ]);
  const [navbarDraft, setNavbarDraft] = useState({
    title: '',
    slug: '',
    layout: 'default',
    parentGroup: '', // Induk dropdown jika dimasukkan ke grup yang sudah ada
  });
  
  // State untuk Tambah Sub-Menu ke dalam Grup Dropdown yang sudah ada
  const [targetDropdownGroup, setTargetDropdownGroup] = useState<string>('');
  
  // State untuk Edit Label & Hapus Item / Sub Navbar
  const [editNavbarTarget, setEditNavbarTarget] = useState<{ id: number; title: string; isSystem: boolean } | null>(null);
  const [editNavbarTitle, setEditNavbarTitle] = useState('');
  const [deleteNavbarTarget, setDeleteNavbarTarget] = useState<BuilderPage | null>(null);
  const [draggedPageId, setDraggedPageId] = useState<number | null>(null);
  const [isReorderingMenu, setIsReorderingMenu] = useState(false);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    tentang: true,
    akademik: true,
    informasi: true,
    kustom: true,
  });

  const toggleGroup = (groupKey: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const pagesQuery = useQuery({
    queryKey: ['admin', 'pages'],
    queryFn: () => builderApi.pages().then((res) => res.data.pages),
  });

  const widgetsQuery = useQuery({
    queryKey: ['admin', 'widgets'],
    queryFn: () => builderApi.widgets().then((res) => res.data.widgets),
  });

  const menusQuery = useQuery({
    queryKey: ['admin', 'menus'],
    queryFn: () => settingsApi.menus().then((res) => res.data.menus),
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
    mutationFn: async () => {
      // 1. Buat Section
      const secRes = await builderApi.createSection(selectedPageId!, {
        sectionKey: sectionDraft.sectionKey || 'content',
        title: sectionDraft.title || 'Seksi Konten',
      });
      const createdSectionId = secRes.data.section.id;

      // 2. Jika memilih konten widget langsung, otomatis buatkan widget awalnya
      if (sectionDraft.widgetCode) {
        const definition = (widgetsQuery.data ?? []).find((item) => item.code === sectionDraft.widgetCode);
        let config: Record<string, unknown> = {};
        try {
          config = definition ? JSON.parse(definition.defaultJson) : {};
        } catch {
          config = {};
        }
        // Judul & deskripsi kustom dari admin menimpa nilai bawaan widget.
        const customTitle = sectionDraft.widgetTitle.trim();
        const customDescription = sectionDraft.widgetDescription.trim();
        if (customTitle) config.title = customTitle;
        if (customDescription) {
          config.subtitle = customDescription;
          config.description = customDescription;
        }
        await builderApi.addWidget(createdSectionId, {
          widgetCode: sectionDraft.widgetCode,
          variantCode: null,
          config,
        });
      }
      return secRes;
    },
    onSuccess: () => {
      toast.success('Section dan konten berhasil ditambahkan.');
      setSectionFormOpen(false);
      setSectionDraft({
        sectionKey: 'content',
        title: '',
        widgetCode: 'about_prodi',
        widgetTitle: '',
        widgetDescription: '',
      });
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
      // Judul & deskripsi kustom dari admin menimpa nilai bawaan widget.
      const customTitle = widgetDraft.widgetTitle.trim();
      const customDescription = widgetDraft.widgetDescription.trim();
      if (customTitle) config.title = customTitle;
      if (customDescription) {
        config.subtitle = customDescription;
        config.description = customDescription;
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
      setWidgetDraft({ widgetCode: 'about_prodi', variantCode: '', widgetTitle: '', widgetDescription: '' });
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
      let payload: Record<string, unknown>;
      if (configMode === 'visual') {
        payload = configFormState;
      } else {
        try {
          payload = JSON.parse(configText);
        } catch {
          throw new Error('Konfigurasi bukan JSON yang valid.');
        }
      }
      return builderApi.updateWidget(configTarget!.id, { config: payload });
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

  const createNavbarMutation = useMutation({
    mutationFn: async () => {
      if (navbarType === 'dropdown') {
        // 1. Buat Menu Parent di Database Menu Navigasi
        const parentMenuRes = await settingsApi.createMenu({
          title: navbarDraft.title,
          url: `/halaman/${navbarDraft.slug}`,
          target: '_self',
          sortOrder: 40,
          isActive: true,
        });
        const parentMenuId = (parentMenuRes as any)?.data?.menu?.id;

        // 2. Buat Halaman Utama Dropdown di Builder
        const parentPageRes = await builderApi.createPage({
          title: navbarDraft.title,
          slug: navbarDraft.slug,
          layout: 'default',
        });

        // 3. Buat Sub-Navbar jika diisi oleh user
        for (const item of dropdownItems) {
          if (item.title && item.slug) {
            await builderApi.createPage({
              title: item.title,
              slug: item.slug,
              layout: 'default',
            });
            if (parentMenuId) {
              await settingsApi.createMenu({
                parentId: parentMenuId,
                title: item.title,
                url: `/halaman/${item.slug}`,
                target: '_self',
                sortOrder: 45,
                isActive: true,
              });
            }
          }
        }
        return parentPageRes;
      } else {
        // Buat Menu Tunggal
        const pageRes = await builderApi.createPage({
          title: navbarDraft.title,
          slug: navbarDraft.slug,
          layout: 'default',
        });
        try {
          await settingsApi.createMenu({
            title: navbarDraft.title,
            url: `/halaman/${navbarDraft.slug}`,
            target: '_self',
            sortOrder: 50,
            isActive: true,
          });
        } catch {
          // Abaikan jika duplikat
        }
        return pageRes;
      }
    },
    onSuccess: (res: any) => {
      toast.success(
        navbarType === 'dropdown'
          ? 'Grup Dropdown Navbar berhasil dibuat.'
          : 'Item Navbar Tunggal berhasil dibuat.'
      );
      setNavbarFormOpen(false);
      setNavbarDraft({ title: '', slug: '', layout: 'default', parentGroup: '' });
      setDropdownItems([{ title: '', slug: '' }]);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
      if (res?.data?.page?.id) {
        setSelectedPageId(res.data.page.id);
      }
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const updateNavbarTitleMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      return builderApi.updatePage(id, { title });
    },
    onSuccess: () => {
      toast.success('Label navbar berhasil diperbarui.');
      setEditNavbarTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'page', selectedPageId] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const deleteNavbarMutation = useMutation({
    mutationFn: async (id: number) => {
      const pageToDelete = (pagesQuery.data ?? []).find((p) => p.id === id);
      // Hapus di builder
      const res = await builderApi.deletePage(id);
      // Hapus juga menu terkait di database menu jika ada
      if (pageToDelete) {
        try {
          const allMenus = menusQuery.data ?? [];
          const matchedMenu = allMenus.find(
            (m) => m.url === `/${pageToDelete.slug}` || m.url === `/halaman/${pageToDelete.slug}`
          );
          if (matchedMenu && !matchedMenu.isRequired) {
            await settingsApi.deleteMenu(matchedMenu.id);
          }
        } catch {
          // Lanjutkan jika menu sistem
        }
      }
      return res;
    },
    onSuccess: () => {
      toast.success('Navbar / Halaman berhasil dihapus.');
      setDeleteNavbarTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
      const remaining = (pagesQuery.data ?? []).filter((p) => p.id !== deleteNavbarTarget?.id);
      if (remaining.length > 0) {
        setSelectedPageId(remaining[0].id);
      }
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  /**
   * Menukar urutan menu navbar (tombol panah maupun drag & drop).
   *
   * Endpoint `PUT /admin/menus/reorder` memvalidasi setiap item dengan skema
   * ketat (id bilangan bulat positif). Karena `GET /admin/menus` mengembalikan
   * struktur pohon (induk + `children`), pengiriman sebagian item pernah gagal
   * dengan 422. Strategi sekarang: ratakan SELURUH menu tenant, susun ulang
   * hanya pada kelompok saudara (induk yang sama) agar hierarki tidak rusak,
   * lalu kirim semuanya dengan `sortOrder` unik yang berurutan mulai dari 1.
   */
  const handleReorderNavbar = async (sourceId: number, targetId: number) => {
    const rawMenus = menusQuery.data ?? [];
    if (rawMenus.length === 0) return;

    // 1. Ratakan seluruh menu: root (parentId null) dan sub-menu anak.
    type FlatMenu = MenuItem & { parentId: number | null };
    const allFlatMenus: FlatMenu[] = [];
    for (const root of rawMenus) {
      allFlatMenus.push({ ...root, parentId: root.parentId ?? null });
      for (const child of root.children ?? []) {
        allFlatMenus.push({ ...child, parentId: child.parentId ?? root.id });
      }
    }

    // 2. Buang entri tanpa id valid agar payload tidak melanggar skema.
    const validMenus = allFlatMenus.filter(
      (m) => Number.isInteger(m.id) && m.id > 0,
    );
    if (validMenus.length === 0) return;

    const allPages = pagesQuery.data ?? [];
    const sourcePage = allPages.find((p) => p.id === sourceId);
    const targetPage = allPages.find((p) => p.id === targetId);
    if (!sourcePage || !targetPage) return;

    // 3. Cocokkan halaman builder dengan baris menu di database.
    const findMenu = (page: BuilderPage) => {
      const slugUrl = page.slug === 'beranda' ? '/' : `/${page.slug}`;
      const pageUrl = `/halaman/${page.slug}`;
      return (
        validMenus.find((m) => m.url === slugUrl || m.url === pageUrl) ??
        validMenus.find((m) => m.url === page.slug) ??
        validMenus.find(
          (m) => m.title.trim().toLowerCase() === page.title.trim().toLowerCase(),
        )
      );
    };

    const sourceMenu = findMenu(sourcePage);
    const targetMenu = findMenu(targetPage);

    if (!sourceMenu || !targetMenu) {
      toast.error('Item menu navigasi database belum terdaftar untuk halaman ini.');
      return;
    }

    // 4. Susun ulang HANYA kelompok saudara (induk yang sama). Menu dari grup
    //    lain tidak pernah diubah isinya, sehingga hierarki tetap utuh.
    const groupParentId = sourceMenu.parentId ?? null;
    const groupItems = validMenus
      .filter((m) => (m.parentId ?? null) === groupParentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const fromIndex = groupItems.findIndex((m) => m.id === sourceMenu.id);
    if (fromIndex === -1) return;

    let insertIndex: number;
    if ((targetMenu.parentId ?? null) === groupParentId) {
      insertIndex = groupItems.findIndex((m) => m.id === targetMenu.id);
      if (insertIndex === -1) return;
    } else {
      // Target berasal dari grup lain: geser hanya di dalam grup sendiri.
      insertIndex = fromIndex < groupItems.length - 1 ? groupItems.length - 1 : fromIndex;
    }

    if (fromIndex === insertIndex) return;

    const reorderedGroup = [...groupItems];
    const [moved] = reorderedGroup.splice(fromIndex, 1);
    reorderedGroup.splice(insertIndex, 0, moved);

    // 5. Setiap grup memakai kembali slot `sortOrder` miliknya sendiri supaya
    //    blok grup tetap di posisi semula pada daftar akhir.
    const groupSlots = groupItems.map((m) => m.sortOrder).sort((a, b) => a - b);
    const slotById = new Map<number, number>();
    reorderedGroup.forEach((item, position) => slotById.set(item.id, groupSlots[position]));

    const finalOrder: FlatMenu[] = [...validMenus]
      .sort((a, b) => {
        const slotA = slotById.get(a.id) ?? a.sortOrder;
        const slotB = slotById.get(b.id) ?? b.sortOrder;
        if (slotA !== slotB) return slotA - slotB;
        // Tie-break deterministik agar payload selalu sama untuk input sama.
        return a.id - b.id;
      });

    // 6. Kirim SELURUH menu dengan sortOrder unik berurutan mulai dari 1.
    const payload = finalOrder.map((item, index) => ({
      id: item.id,
      sortOrder: index + 1,
    }));

    setIsReorderingMenu(true);
    try {
      await settingsApi.reorderMenus(payload);
      toast.success(`Urutan navbar "${sourcePage.title}" berhasil diubah.`);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
      void queryClient.invalidateQueries({ queryKey: ['public', 'menus'] });
    } catch (err) {
      const apiError = toApiError(err);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    } finally {
      setIsReorderingMenu(false);
    }
  };

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
              href={
                page.slug === 'beranda'
                  ? '/'
                  : [
                      'profil',
                      'visi-misi',
                      'kurikulum',
                      'dosen',
                      'sarana-prasarana',
                      'berita',
                      'galeri',
                      'dokumen',
                      'kontak',
                    ].includes(page.slug)
                  ? `/${page.slug}`
                  : `/halaman/${page.slug}`
              }
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
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
          <aside className="rounded-[14px] border border-[#CBD5E1] bg-white p-4 shadow-2xs">
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Struktur Navbar</p>
                <p className="text-[9px] text-slate-400">Navigasi &amp; Halaman Website</p>
              </div>
              {has('pages.create') ? (
                <button
                  type="button"
                  onClick={() => {
                    setNavbarType('single');
                    setNavbarDraft({ title: '', slug: '', layout: 'default', parentGroup: '' });
                    setNavbarFormOpen(true);
                  }}
                  title="Tambah Navbar Baru"
                  className="inline-flex items-center gap-1 rounded bg-[#1e3a8a]/10 px-2 py-1 text-[10px] font-bold text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white transition-colors"
                >
                  <PlusIcon className="h-3 w-3" />
                  Tambah
                </button>
              ) : null}
            </div>

            {(() => {
              const allPages = pagesQuery.data ?? [];
              const berandaPage = allPages.find((p) => p.slug === 'beranda');
              const profilPages = allPages.filter((p) => p.slug === 'profil' || p.slug === 'visi-misi');
              const akademikPages = allPages.filter(
                (p) => p.slug === 'kurikulum' || p.slug === 'dosen' || p.slug === 'sarana-prasarana' || p.slug === 'sarpras'
              );
              const infoPages = allPages.filter(
                (p) => p.slug === 'berita' || p.slug === 'galeri' || p.slug === 'dokumen'
              );
              const kontakPage = allPages.find((p) => p.slug === 'kontak');

              const standardSlugs = new Set([
                'beranda',
                'profil',
                'visi-misi',
                'kurikulum',
                'dosen',
                'sarana-prasarana',
                'sarpras',
                'berita',
                'galeri',
                'dokumen',
                'kontak',
              ]);
              const customPages = allPages.filter((p) => !standardSlugs.has(p.slug));

              const renderPageItem = (item: BuilderPage, isChild = false, siblingList?: BuilderPage[]) => {
                const isSelected = item.id === selectedPageId;
                const isDragging = draggedPageId === item.id;
                const siblings = siblingList ?? [];
                const itemIndex = siblings.findIndex((p) => p.id === item.id);
                const canMoveUp = itemIndex > 0;
                const canMoveDown = itemIndex !== -1 && itemIndex < siblings.length - 1;

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(item.id));
                      setDraggedPageId(item.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const droppedId = Number(e.dataTransfer.getData('text/plain'));
                      if (droppedId && droppedId !== item.id) {
                        void handleReorderNavbar(droppedId, item.id);
                      }
                      setDraggedPageId(null);
                    }}
                    onDragEnd={() => setDraggedPageId(null)}
                    className={`relative flex items-center group rounded-lg transition-all ${
                      isDragging ? 'opacity-40 border-2 border-dashed border-[#1e3a8a]' : ''
                    }`}
                  >
                    {/* Drag Handle Icon */}
                    <div
                      className="flex items-center pl-1.5 cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-600 transition-colors"
                      title="Tahan & seret (drag) untuk mengubah urutan navbar"
                    >
                      <Bars3Icon className="h-3.5 w-3.5" />
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedPageId(item.id)}
                      className={`flex w-full items-center justify-between rounded-lg py-1.5 pr-32 pl-1.5 text-left text-xs font-semibold transition-colors ${
                        isChild ? 'pl-2' : ''
                      } ${
                        isSelected
                          ? 'bg-[#1e3a8a] text-white'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="min-w-0 truncate">{item.title}</span>
                      <span
                        className={`shrink-0 ml-2 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          item.isPublished
                            ? isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-emerald-50 text-emerald-700'
                            : isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {item.isPublished ? 'Terbit' : 'Draft'}
                      </span>
                    </button>
                    
                    {/* Aksi Reorder Panah, Edit Label & Hapus langsung terlihat nyata di setiap baris item navbar */}
                    <div className="absolute right-1.5 flex items-center gap-0.5 rounded-md bg-white/95 backdrop-blur-xs px-1 py-0.5 shadow-xs border border-slate-200 z-10">
                      {/* Tombol Geser Atas / Bawah */}
                      {siblings.length > 1 ? (
                        <>
                          <button
                            type="button"
                            disabled={!canMoveUp || isReorderingMenu}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canMoveUp) {
                                void handleReorderNavbar(item.id, siblings[itemIndex - 1].id);
                              }
                            }}
                            title="Pindah ke atas"
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <ArrowUpIcon className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={!canMoveDown || isReorderingMenu}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canMoveDown) {
                                void handleReorderNavbar(item.id, siblings[itemIndex + 1].id);
                              }
                            }}
                            title="Pindah ke bawah"
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <ArrowDownIcon className="h-3 w-3" />
                          </button>
                        </>
                      ) : null}

                      {has('pages.update') ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditNavbarTarget({ id: item.id, title: item.title, isSystem: item.isSystem });
                            setEditNavbarTitle(item.title);
                          }}
                          title={`Edit label navbar: ${item.title}`}
                          className="rounded p-1 text-slate-500 hover:bg-blue-50 hover:text-[#1e3a8a] transition-colors"
                        >
                          <PencilSquareIcon className="h-3 w-3" />
                        </button>
                      ) : null}
                      {has('pages.delete') ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteNavbarTarget(item);
                          }}
                          title={`Hapus navbar: ${item.title}`}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              };

              return (
                <div className="space-y-2">
                  {/* 1. Beranda */}
                  {berandaPage && (
                    <div className="space-y-1">
                      {renderPageItem(berandaPage)}
                    </div>
                  )}

                  {/* 2. Dropdown: Tentang Prodi */}
                  {profilPages.length > 0 && (
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-1.5 space-y-1">
                      <div className="flex items-center justify-between px-2 py-1">
                        <button
                          type="button"
                          onClick={() => toggleGroup('tentang')}
                          className="flex flex-1 items-center gap-1.5 text-[11px] font-bold text-slate-700 hover:text-slate-950 text-left"
                        >
                          <AcademicCapIcon className="h-4 w-4 text-slate-500" />
                          <span>Tentang Prodi</span>
                          {openGroups.tentang ? (
                            <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400 ml-auto mr-1" />
                          ) : (
                            <ChevronRightIcon className="h-3.5 w-3.5 text-slate-400 ml-auto mr-1" />
                          )}
                        </button>
                        <div className="flex items-center gap-1">
                          {has('pages.create') ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNavbarType('single');
                                setTargetDropdownGroup('tentang');
                                setNavbarDraft({ title: '', slug: '', layout: 'default', parentGroup: 'tentang' });
                                setNavbarFormOpen(true);
                              }}
                              title="Tambah Sub-Navbar ke Tentang Prodi"
                              className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-[#1e3a8a] transition-colors"
                            >
                              <PlusIcon className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {openGroups.tentang && (
                        <div className="space-y-0.5 pl-2 border-l border-slate-200 ml-2">
                          {profilPages.map((p) => renderPageItem(p, true, profilPages))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Dropdown: Akademik */}
                  {akademikPages.length > 0 && (
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-1.5 space-y-1">
                      <div className="flex items-center justify-between px-2 py-1">
                        <button
                          type="button"
                          onClick={() => toggleGroup('akademik')}
                          className="flex flex-1 items-center gap-1.5 text-[11px] font-bold text-slate-700 hover:text-slate-950 text-left"
                        >
                          <BookOpenIcon className="h-4 w-4 text-slate-500" />
                          <span>Akademik</span>
                          {openGroups.akademik ? (
                            <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400 ml-auto mr-1" />
                          ) : (
                            <ChevronRightIcon className="h-3.5 w-3.5 text-slate-400 ml-auto mr-1" />
                          )}
                        </button>
                        <div className="flex items-center gap-1">
                          {has('pages.create') ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNavbarType('single');
                                setTargetDropdownGroup('akademik');
                                setNavbarDraft({ title: '', slug: '', layout: 'default', parentGroup: 'akademik' });
                                setNavbarFormOpen(true);
                              }}
                              title="Tambah Sub-Navbar ke Akademik"
                              className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-[#1e3a8a] transition-colors"
                            >
                              <PlusIcon className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {openGroups.akademik && (
                        <div className="space-y-0.5 pl-2 border-l border-slate-200 ml-2">
                          {akademikPages.map((p) => renderPageItem(p, true, akademikPages))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. Dropdown: Informasi & Dokumen */}
                  {infoPages.length > 0 && (
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-1.5 space-y-1">
                      <div className="flex items-center justify-between px-2 py-1">
                        <button
                          type="button"
                          onClick={() => toggleGroup('informasi')}
                          className="flex flex-1 items-center gap-1.5 text-[11px] font-bold text-slate-700 hover:text-slate-950 text-left"
                        >
                          <NewspaperIcon className="h-4 w-4 text-slate-500" />
                          <span>Informasi & Dokumen</span>
                          {openGroups.informasi ? (
                            <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400 ml-auto mr-1" />
                          ) : (
                            <ChevronRightIcon className="h-3.5 w-3.5 text-slate-400 ml-auto mr-1" />
                          )}
                        </button>
                        <div className="flex items-center gap-1">
                          {has('pages.create') ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNavbarType('single');
                                setTargetDropdownGroup('informasi');
                                setNavbarDraft({ title: '', slug: '', layout: 'default', parentGroup: 'informasi' });
                                setNavbarFormOpen(true);
                              }}
                              title="Tambah Sub-Navbar ke Informasi & Dokumen"
                              className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-[#1e3a8a] transition-colors"
                            >
                              <PlusIcon className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {openGroups.informasi && (
                        <div className="space-y-0.5 pl-2 border-l border-slate-200 ml-2">
                          {infoPages.map((p) => renderPageItem(p, true, infoPages))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 5. Dropdown / Grup: Halaman Tambahan (Kustom) */}
                  {customPages.length > 0 && (
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-1.5 space-y-1">
                      <div className="flex items-center justify-between px-2 py-1">
                        <button
                          type="button"
                          onClick={() => toggleGroup('kustom')}
                          className="flex flex-1 items-center gap-1.5 text-[11px] font-bold text-slate-700 hover:text-slate-950 text-left"
                        >
                          <DocumentCheckIcon className="h-4 w-4 text-slate-500" />
                          <span>Halaman Kustom ({customPages.length})</span>
                          {openGroups.kustom ? (
                            <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400 ml-auto mr-1" />
                          ) : (
                            <ChevronRightIcon className="h-3.5 w-3.5 text-slate-400 ml-auto mr-1" />
                          )}
                        </button>
                        <div className="flex items-center gap-1">
                          {has('pages.create') ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNavbarType('single');
                                setTargetDropdownGroup('kustom');
                                setNavbarDraft({ title: '', slug: '', layout: 'default', parentGroup: 'kustom' });
                                setNavbarFormOpen(true);
                              }}
                              title="Tambah Sub-Navbar ke Halaman Kustom"
                              className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-[#1e3a8a] transition-colors"
                            >
                              <PlusIcon className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {openGroups.kustom && (
                        <div className="space-y-0.5 pl-2 border-l border-slate-200 ml-2">
                          {customPages.map((p) => renderPageItem(p, true, customPages))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6. Kontak */}
                  {kontakPage && (
                    <div className="space-y-1 pt-1">
                      {renderPageItem(kontakPage)}
                    </div>
                  )}
                </div>
              );
            })()}
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
                        const defaultWidget = widgetsQuery.data?.[0];
                        setSectionDraft({
                          sectionKey: defaultWidget ? defaultWidget.code.replace(/_/g, '-') : 'about-prodi',
                          title: defaultWidget
                            ? `Seksi ${getWidgetDisplayName(defaultWidget.code, defaultWidget.name)}`
                            : 'Seksi Baru',
                          widgetCode: defaultWidget ? defaultWidget.code : 'about_prodi',
                          widgetTitle: '',
                          widgetDescription: '',
                        });
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
                                  setWidgetDraft({
                                    widgetCode: 'about_prodi',
                                    variantCode: '',
                                    widgetTitle: '',
                                    widgetDescription: '',
                                  });
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
                                const origin = getWidgetOriginMeta(widget.widget.code);
                                return (
                                  <div
                                    key={widget.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-2xs hover:bg-white hover:border-slate-300 transition-all"
                                  >
                                    <div className="min-w-0 space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-xs font-bold text-slate-900">
                                          {getWidgetDisplayName(widget.widget.code, widget.widget.name)}
                                        </p>
                                        <span
                                          className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${origin.badgeClass}`}
                                        >
                                          {origin.badge}
                                        </span>
                                        {widget.variantCode ? (
                                          <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                                            {widget.variantCode}
                                          </span>
                                        ) : null}
                                      </div>
                                      {typeof config.title === 'string' && config.title ? (
                                        <p className="text-[11px] font-semibold text-slate-800">
                                          Judul tampil: “{config.title}”
                                        </p>
                                      ) : null}
                                      {(() => {
                                        const desc =
                                          typeof config.subtitle === 'string'
                                            ? config.subtitle
                                            : typeof config.description === 'string'
                                              ? config.description
                                              : '';
                                        return desc ? (
                                          <p className="line-clamp-2 text-[10px] italic text-slate-500">
                                            “{desc}”
                                          </p>
                                        ) : null;
                                      })()}
                                      <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                                        <span className="font-medium text-slate-700">{summarize(config)}</span>
                                        <span>•</span>
                                        <span>{origin.sourceDesc}</span>
                                        {origin.manageRoute && (
                                          <a
                                            href={origin.manageRoute}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-bold text-[#1e3a8a] hover:underline inline-flex items-center gap-0.5"
                                          >
                                            {origin.manageLabel} &rarr;
                                          </a>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
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
                                            setConfigFormState(config);
                                            setConfigText(JSON.stringify(config, null, 2));
                                            setConfigMode('visual');
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
        title="Tambah Seksi Konten"
        description="Pilih jenis konten yang ingin dimasukkan ke dalam halaman ini."
        busy={createSection.isPending}
        onClose={() => setSectionFormOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          createSection.mutate();
        }}
      >
        <Field
          label="Pilih Jenis Konten"
          htmlFor="section-widget-select"
          required
          hint="Konten bertanda (Konten & Akademik) otomatis mengambil data dari menu sidebar terkait; konten lain diisi langsung di sini."
        >
          <select
            id="section-widget-select"
            className="field-input font-medium"
            value={sectionDraft.widgetCode}
            onChange={(event) => {
              const code = event.target.value;
              const found = (widgetsQuery.data ?? []).find((w) => w.code === code);
              setSectionDraft({
                ...sectionDraft,
                widgetCode: code,
                sectionKey: code.replace(/_/g, '-'),
                title: found?.name
                  ? `Seksi ${getWidgetDisplayName(code, found.name)}`
                  : sectionDraft.title,
              });
            }}
          >
            {(widgetsQuery.data ?? []).map((widget) => {
              const origin = getWidgetOriginMeta(widget.code);
              const prefix = origin.type === 'dynamic' ? 'Konten & Akademik' : 'Kustom / Media';
              return (
                <option key={widget.code} value={widget.code}>
                  [{prefix}] — {getWidgetDisplayName(widget.code, widget.name)}
                </option>
              );
            })}
          </select>
        </Field>

        {(() => {
          const origin = getWidgetOriginMeta(sectionDraft.widgetCode);
          return (
            <div
              className={`flex items-start gap-2 rounded-xl border p-3 text-[11px] leading-relaxed ${
                origin.type === 'dynamic'
                  ? 'border-blue-200 bg-blue-50/70 text-blue-900'
                  : 'border-amber-200 bg-amber-50/70 text-amber-900'
              }`}
            >
              <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">{origin.badge}</p>
                <p>{origin.sourceDesc}</p>
                {origin.manageRoute ? (
                  <a
                    href={origin.manageRoute}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block font-bold underline"
                  >
                    {origin.manageLabel} &rarr;
                  </a>
                ) : null}
              </div>
            </div>
          );
        })()}

        <Field
          label="Judul Tampilan Widget"
          htmlFor="section-widget-title"
          hint="Judul seksi yang muncul di website. Kosongkan untuk memakai judul bawaan."
        >
          <input
            id="section-widget-title"
            type="text"
            className="field-input"
            placeholder="Contoh: Mata Kuliah Unggulan Semester Ganjil"
            value={sectionDraft.widgetTitle}
            onChange={(event) => setSectionDraft({ ...sectionDraft, widgetTitle: event.target.value })}
          />
        </Field>

        <Field
          label="Deskripsi Singkat"
          htmlFor="section-widget-desc"
          hint="Pengantar singkat di bawah judul seksi (opsional)."
        >
          <textarea
            id="section-widget-desc"
            className="field-input min-h-[70px]"
            placeholder="Contoh: Daftar mata kuliah inti yang membentuk kompetensi lulusan prodi."
            value={sectionDraft.widgetDescription}
            onChange={(event) =>
              setSectionDraft({ ...sectionDraft, widgetDescription: event.target.value })
            }
          />
        </Field>

        <Field label="Judul Seksi (Label Penanda)" htmlFor="section-title" hint="Judul penanda di panel builder.">
          <input
            id="section-title"
            className="field-input"
            placeholder="Contoh: Seksi Tentang Prodi"
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
        <Field
          label="Tipe Widget"
          htmlFor="widget-code"
          required
          hint="Konten bertanda (Konten & Akademik) otomatis mengambil data dari menu sidebar terkait."
        >
          <select
            id="widget-code"
            className="field-input"
            value={widgetDraft.widgetCode}
            onChange={(event) =>
              setWidgetDraft({ ...widgetDraft, widgetCode: event.target.value, variantCode: '' })
            }
          >
            {(widgetsQuery.data ?? []).map((widget) => {
              const origin = getWidgetOriginMeta(widget.code);
              const prefix = origin.type === 'dynamic' ? 'Konten & Akademik' : 'Kustom / Media';
              return (
                <option key={widget.code} value={widget.code}>
                  [{prefix}] — {getWidgetDisplayName(widget.code, widget.name)}
                </option>
              );
            })}
          </select>
        </Field>

        {(() => {
          const origin = getWidgetOriginMeta(widgetDraft.widgetCode);
          return (
            <div
              className={`flex items-start gap-2 rounded-xl border p-3 text-[11px] leading-relaxed ${
                origin.type === 'dynamic'
                  ? 'border-blue-200 bg-blue-50/70 text-blue-900'
                  : 'border-amber-200 bg-amber-50/70 text-amber-900'
              }`}
            >
              <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">{origin.badge}</p>
                <p>{origin.sourceDesc}</p>
                {origin.manageRoute ? (
                  <a
                    href={origin.manageRoute}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block font-bold underline"
                  >
                    {origin.manageLabel} &rarr;
                  </a>
                ) : null}
              </div>
            </div>
          );
        })()}

        <Field
          label="Judul Tampilan Widget"
          htmlFor="widget-title"
          hint="Judul seksi yang muncul di website. Kosongkan untuk memakai judul bawaan."
        >
          <input
            id="widget-title"
            type="text"
            className="field-input"
            placeholder="Contoh: Berita Prestasi Mahasiswa"
            value={widgetDraft.widgetTitle}
            onChange={(event) => setWidgetDraft({ ...widgetDraft, widgetTitle: event.target.value })}
          />
        </Field>

        <Field
          label="Deskripsi Singkat"
          htmlFor="widget-desc"
          hint="Pengantar singkat di bawah judul seksi (opsional)."
        >
          <textarea
            id="widget-desc"
            className="field-input min-h-[70px]"
            placeholder="Contoh: Rangkaian kabar terbaru dari kegiatan dan prestasi prodi."
            value={widgetDraft.widgetDescription}
            onChange={(event) =>
              setWidgetDraft({ ...widgetDraft, widgetDescription: event.target.value })
            }
          />
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
        title={`Konfigurasi: ${configTarget?.widget.name || 'Widget'}`}
        description="Sesuaikan konten dan tampilan seksi tanpa perlu mengedit kode JSON secara manual."
        busy={saveConfig.isPending}
        wide
        onClose={() => setConfigTarget(null)}
        onSubmit={(event) => {
          event.preventDefault();
          saveConfig.mutate();
        }}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-xs font-bold text-slate-700">Metode Pengisian</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setConfigMode('visual')}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                  configMode === 'visual'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Form Visual &amp; Editor
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfigText(JSON.stringify(configFormState, null, 2));
                  setConfigMode('json');
                }}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                  configMode === 'json'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kode JSON (Teknis)
              </button>
            </div>
          </div>

          {configMode === 'visual' ? (
            <WidgetVisualForm
              widgetCode={configTarget?.widget.code || ''}
              config={configFormState}
              onChange={(updated) => setConfigFormState(updated)}
            />
          ) : (
            <Field
              label="Konfigurasi JSON"
              htmlFor="widget-config"
              hint="Format JSON divalidasi ketat oleh server."
            >
              <textarea
                id="widget-config"
                className="field-input min-h-[300px] font-mono text-xs leading-relaxed"
                value={configText}
                onChange={(event) => {
                  setConfigText(event.target.value);
                  try {
                    setConfigFormState(JSON.parse(event.target.value));
                  } catch {
                    // Biarkan user menyelesaikan ketikan JSON
                  }
                }}
                spellCheck={false}
              />
            </Field>
          )}
        </div>
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

      {/* Modal Tambah Navbar Baru (Tunggal vs Dropdown) */}
      <FormModal
        open={navbarFormOpen}
        title="Tambah Navbar Baru"
        description="Buat navigasi navbar baru untuk website program studi, baik berupa menu tunggal maupun grup dropdown."
        busy={createNavbarMutation.isPending}
        onClose={() => setNavbarFormOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          createNavbarMutation.mutate();
        }}
      >
        <Field label="Jenis Menu Navbar" htmlFor="navbar-type">
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setNavbarType('single')}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                navbarType === 'single'
                  ? 'border-[#1e3a8a] bg-[#1e3a8a]/5 ring-1 ring-[#1e3a8a]'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="text-xs font-bold text-slate-900">1. Menu Navbar Tunggal</span>
              <span className="text-[10px] text-slate-500 mt-1 leading-snug">
                Tautan langsung di bar atas (misal: "Kerjasama", "Alumni").
              </span>
            </button>

            <button
              type="button"
              onClick={() => setNavbarType('dropdown')}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                navbarType === 'dropdown'
                  ? 'border-[#1e3a8a] bg-[#1e3a8a]/5 ring-1 ring-[#1e3a8a]'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="text-xs font-bold text-slate-900">2. Dropdown (Grup Menu)</span>
              <span className="text-[10px] text-slate-500 mt-1 leading-snug">
                Grup navbar yang memiliki anak menu ke bawah.
              </span>
            </button>
          </div>
        </Field>

        <Field
          label={navbarType === 'dropdown' ? 'Nama Grup Dropdown / Halaman Utama' : 'Label Menu Navbar'}
          htmlFor="navbar-title"
          required
        >
          <input
            id="navbar-title"
            className="field-input"
            required
            value={navbarDraft.title}
            onChange={(e) => {
              const val = e.target.value;
              const generatedSlug = val
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
              setNavbarDraft({
                ...navbarDraft,
                title: val,
                slug: generatedSlug,
              });
            }}
            placeholder={navbarType === 'dropdown' ? 'Contoh: Kemahasiswaan & Prestasi' : 'Contoh: Akreditasi'}
          />
        </Field>

        <Field
          label="Slug URL Halaman"
          htmlFor="navbar-slug"
          required
          hint="Huruf kecil, angka, dan tanda hubung (-). URL publik: /halaman/[slug]"
        >
          <input
            id="navbar-slug"
            className="field-input font-mono text-xs"
            required
            value={navbarDraft.slug}
            onChange={(e) => setNavbarDraft({ ...navbarDraft, slug: e.target.value })}
            placeholder="akreditasi"
          />
        </Field>

        {navbarType === 'dropdown' ? (
          <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1e3a8a]">Daftar Sub-Menu (Anak Navbar)</span>
              <button
                type="button"
                onClick={() => setDropdownItems([...dropdownItems, { title: '', slug: '' }])}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1e3a8a] hover:underline"
              >
                <PlusIcon className="h-3 w-3" /> Tambah Sub-Menu
              </button>
            </div>

            <div className="space-y-2">
              {dropdownItems.map((child, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    className="field-input text-xs flex-1"
                    placeholder={`Sub-menu ${idx + 1} (contoh: Ormawa)`}
                    value={child.title}
                    onChange={(e) => {
                      const updated = [...dropdownItems];
                      const val = e.target.value;
                      const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      updated[idx] = { title: val, slug };
                      setDropdownItems(updated);
                    }}
                  />
                  <input
                    className="field-input font-mono text-xs flex-1"
                    placeholder={`slug (contoh: ormawa)`}
                    value={child.slug}
                    onChange={(e) => {
                      const updated = [...dropdownItems];
                      updated[idx] = { ...updated[idx], slug: e.target.value };
                      setDropdownItems(updated);
                    }}
                  />
                  {dropdownItems.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setDropdownItems(dropdownItems.filter((_, i) => i !== idx))}
                      className="rounded p-1 text-rose-500 hover:bg-rose-100"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </FormModal>

      {/* Modal Edit Label Navbar */}
      <FormModal
        open={editNavbarTarget !== null}
        title={`Edit Label Navbar: "${editNavbarTarget?.title ?? ''}"`}
        description="Ubah nama atau label tampilan navigasi ini."
        busy={updateNavbarTitleMutation.isPending}
        onClose={() => setEditNavbarTarget(null)}
        onSubmit={(e) => {
          e.preventDefault();
          if (editNavbarTarget) {
            updateNavbarTitleMutation.mutate({
              id: editNavbarTarget.id,
              title: editNavbarTitle,
            });
          }
        }}
      >
        <Field label="Label / Judul Navigasi" htmlFor="edit-navbar-title" required>
          <input
            id="edit-navbar-title"
            className="field-input font-bold"
            required
            value={editNavbarTitle}
            onChange={(e) => setEditNavbarTitle(e.target.value)}
            placeholder="Masukkan label baru..."
          />
        </Field>
      </FormModal>

      {/* Konfirmasi Hapus Navbar / Halaman */}
      <ConfirmDialog
        open={deleteNavbarTarget !== null}
        title="Hapus Navbar / Halaman"
        description={`Menu "${deleteNavbarTarget?.title ?? ''}" beserta seluruh seksi dan widget di dalamnya akan dihapus dari navigasi dan website.`}
        confirmLabel="Hapus Menu"
        busy={deleteNavbarMutation.isPending}
        onConfirm={() => {
          if (deleteNavbarTarget) deleteNavbarMutation.mutate(deleteNavbarTarget.id);
        }}
        onCancel={() => setDeleteNavbarTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminBuilder;
