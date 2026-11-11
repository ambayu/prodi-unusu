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
  EllipsisVerticalIcon,
  FolderArrowDownIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission, useTenant } from '../../hooks/useSite';
import { builderApi, settingsApi, type BuilderPage, type BuilderSection, type BuilderWidgetInstance, type MenuItem } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';
import { WidgetVisualForm } from '../../components/builder/WidgetVisualForm';
import {
  buildNavbarTree,
  findOrphanPages,
  flattenMenus,
  pageUrl,
  type NavbarMenuRow,
  type NavbarNode,
} from '../../../shared/utils/navbarTree';

/**
 * Satu baris sidebar Page Builder.
 *
 * Sidebar kini dibangun dari tabel `menus`, bukan dari daftar halaman, karena
 * navbar pengunjung juga dibaca dari tabel itu. Dengan begitu urutan dan grup
 * yang diatur di sini benar-benar sama dengan yang tampil di landing page.
 */
interface NavbarSidebarEntry {
  /** Etiket stabil untuk React; menu grup memakai id negatif turunan slug. */
  key: string;
  /** Id menu di tabel menus; `null` untuk grup sementara (database masih datar). */
  menuId: number | null;
  title: string;
  url: string;
  isGroup: boolean;
  /** Halaman Builder yang cocok dengan URL menu, bila ada. */
  page: BuilderPage | null;
  children: NavbarSidebarEntry[];
}

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
  curriculum_overview: 'Struktur Kurikulum Merdeka & OBE',
  lecturer_list: 'Dosen Pembina & Pengajar Ahli',
  document_list: 'Dokumen & Unduhan',
  facility_grid: 'Sarana & Prasarana',
  latest_news: 'Warta & Pengumuman',
  gallery_grid: 'Galeri Aktivitas Mahasiswa',
  contact_information: 'Sekretariat Prodi',
  hero_slider: 'Hero Slider (Banner Beranda)',
  about_prodi: 'Profil Program Studi',
  vision_mission: 'Komitmen Akademik & Visi Misi',
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
        badge: 'Dari Menu: Berita',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        sourceDesc: 'Data otomatis dari menu Berita.',
        manageRoute: '/admin/berita',
        manageLabel: 'Kelola Berita',
      };
    case 'lecturer_list':
      return {
        type: 'dynamic',
        badge: 'Dari Menu: Dosen',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        sourceDesc: 'Data otomatis dari menu Dosen.',
        manageRoute: '/admin/dosen',
        manageLabel: 'Kelola Dosen',
      };
    case 'curriculum_overview':
      return {
        type: 'dynamic',
        badge: 'Dari Menu: Kurikulum',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        sourceDesc: 'Data otomatis dari menu Kurikulum.',
        manageRoute: '/admin/kurikulum',
        manageLabel: 'Kelola Kurikulum',
      };
    case 'facility_grid':
      return {
        type: 'dynamic',
        badge: 'Dari Menu: Sarpras',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        sourceDesc: 'Data otomatis dari menu Sarpras.',
        manageRoute: '/admin/sarpras',
        manageLabel: 'Kelola Sarpras',
      };
    case 'document_list':
      return {
        type: 'dynamic',
        badge: 'Dari Menu: Dokumen',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        sourceDesc: 'Data otomatis dari menu Dokumen.',
        manageRoute: '/admin/dokumen',
        manageLabel: 'Kelola Dokumen',
      };
    case 'gallery_grid':
      return {
        type: 'dynamic',
        badge: 'Dari Menu: Galeri',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
        sourceDesc: 'Data otomatis dari menu Galeri.',
        manageRoute: '/admin/galeri',
        manageLabel: 'Kelola Galeri',
      };
    case 'contact_information':
      return {
        type: 'dynamic',
        badge: 'Dari Menu: Kontak',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        sourceDesc: 'Data otomatis dari menu Kontak.',
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
        type: 'dynamic',
        badge: 'Dari Menu: Profil Program Studi',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
        sourceDesc: 'Uraian & gambar otomatis dari halaman Profil Program Studi.',
        manageRoute: '/admin/konten/profil',
        manageLabel: 'Kelola Profil',
      };
    case 'vision_mission':
      return {
        type: 'dynamic',
        badge: 'Dari Menu: Visi & Misi Program Studi',
        badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
        sourceDesc: 'Visi & butir misi otomatis dari halaman Visi & Misi Program Studi.',
        manageRoute: '/admin/konten/visi-misi',
        manageLabel: 'Kelola Visi & Misi',
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
 * Menu aksi untuk satu item navbar di sidebar Builder.
 *
 * Menggabungkan tiga aksi yang sebelumnya tersebar — pindah grup, ubah judul,
 * dan hapus — ke dalam satu tombol tiga titik. Dengan cara ini baris tetap
 * ringkas dan setiap aksi terbaca jelas beserta ikonnya, bukan berupa ikon
 * kecil tanpa label.
 *
 * Bila item belum terdaftar di tabel menus, aksi "Pindahkan ke grup" serta
 * submenu grup tidak ditampilkan: item seperti itu belum punya id sehingga
 * belum bisa dipindahkan.
 */
const DropdownAksiNavbar: React.FC<{
  namaItem: string;
  aksi: { pindah: boolean; ubah: boolean; hapus: boolean };
  grupTujuan: Array<{ key: string; title: string }>;
  onPindah: (kunci: string | null) => void;
  onUbah: () => void;
  onHapus: () => void;
  /**
   * Diberitahukan setiap kali dropdown dibuka atau ditutup. Induk memakainya
   * untuk menaikkan `z-index` baris yang sedang aktif, karena baris di
   * bawahnya akan menimpa panel dropdown tanpa itu.
   */
  onOpenChange?: (terbuka: boolean) => void;
}> = ({ namaItem, aksi, grupTujuan, onPindah, onUbah, onHapus, onOpenChange }) => {
  const [terbuka, setTerbuka] = React.useState(false);
  /** Submenu daftar grup dibuka terpisah agar menu utama tetap pendek. */
  const [submenuPindah, setSubmenuPindah] = React.useState(false);
  const kontainer = React.useRef<HTMLDivElement>(null);

  const ubahStatus = React.useCallback(
    (nilai: boolean) => {
      setTerbuka(nilai);
      if (!nilai) setSubmenuPindah(false);
      onOpenChange?.(nilai);
    },
    [onOpenChange],
  );

  React.useEffect(() => {
    if (!terbuka) return;

    function tutupJikaDiLuar(event: MouseEvent) {
      if (kontainer.current && !kontainer.current.contains(event.target as Node)) {
        ubahStatus(false);
      }
    }
    function tutupDenganEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') ubahStatus(false);
    }

    document.addEventListener('mousedown', tutupJikaDiLuar);
    document.addEventListener('keydown', tutupDenganEscape);
    return () => {
      document.removeEventListener('mousedown', tutupJikaDiLuar);
      document.removeEventListener('keydown', tutupDenganEscape);
    };
  }, [terbuka, ubahStatus]);

  const jalankan = (callback: () => void) => {
    ubahStatus(false);
    callback();
  };

  return (
    <div ref={kontainer} className="relative text-left">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          ubahStatus(!terbuka);
        }}
        aria-haspopup="menu"
        aria-expanded={terbuka}
        aria-label={`Aksi untuk ${namaItem}`}
        title={`Aksi untuk ${namaItem}`}
        className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
          terbuka
            ? 'border-[#1e3a8a] bg-blue-50 text-[#1e3a8a]'
            : 'border-slate-200 bg-white/95 text-slate-500 shadow-xs hover:bg-slate-50 hover:text-slate-800'
        }`}
      >
        <EllipsisVerticalIcon className="h-3.5 w-3.5" />
      </button>

      {terbuka ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {aksi.pindah ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation();
                  setSubmenuPindah((sebelumnya) => !sebelumnya);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <FolderArrowDownIcon className="h-3.5 w-3.5 shrink-0" />
                  Pindahkan ke grup
                </span>
                <ChevronRightIcon
                  className={`h-3 w-3 text-slate-400 transition-transform ${
                    submenuPindah ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {submenuPindah ? (
                <div className="mx-1 mb-1 max-h-52 overflow-y-auto rounded-md border border-slate-100 bg-slate-50/70 py-1">
                  {grupTujuan.map((grup) => (
                    <button
                      key={grup.key}
                      type="button"
                      role="menuitem"
                      onClick={(event) => {
                        event.stopPropagation();
                        jalankan(() => onPindah(grup.key));
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1 text-left text-[11px] font-medium text-slate-600 hover:bg-white hover:text-[#1e3a8a]"
                    >
                      <DocumentCheckIcon className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate">{grup.title}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(event) => {
                      event.stopPropagation();
                      jalankan(() => onPindah(null));
                    }}
                    className="flex w-full items-center gap-2 border-t border-slate-200/70 px-3 pt-1.5 pb-1 text-left text-[11px] font-medium text-slate-600 hover:bg-white hover:text-[#1e3a8a]"
                  >
                    <XCircleIcon className="h-3 w-3 shrink-0 text-slate-400" />
                    Keluarkan dari grup
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {aksi.ubah ? (
            <button
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                jalankan(onUbah);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <PencilSquareIcon className="h-3.5 w-3.5 shrink-0" />
              Edit
            </button>
          ) : null}

          {aksi.hapus ? (
            <button
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                jalankan(onHapus);
              }}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-1.5 text-left text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
            >
              <TrashIcon className="h-3.5 w-3.5 shrink-0" />
              Hapus
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

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
  const { tenant } = useTenant();

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

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  /**
   * Kunci item navbar yang dropdown aksinya sedang terbuka.
   *
   * Dipakai untuk menaikkan `z-index` satu baris saja. Kalau semua baris
   * diberi `z-index`, baris berikutnya tetap menimpa dropdown dan masalahnya
   * tidak hilang.
   */
  const [openAksiKey, setOpenAksiKey] = useState<string | null>(null);

  const toggleGroup = (groupKey: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  /**
   * Grup yang sedang menganggur karena database masih datar.
   *
   * Selama admin belum menyentuh grup, navbar publik mengelompokkan menu memakai
   * definisi bawaan tanpa menyimpan `parentId`. Begitu admin mengganti nama grup
   * atau memindahkan item, struktur itu perlu "dibekukan" menjadi baris menus
   * sungguhan. Peta ini mengingat id baris hasil pembekuan untuk tiap grup.
   */
  const [pendingGroupMenus, setPendingGroupMenus] = useState<Record<string, number>>({});
  /** Target dialog ganti nama grup: grup yang belum ada di database. */
  const [pendingGroupEdit, setPendingGroupEdit] = useState<{ key: string; title: string } | null>(null);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');

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

  /**
   * Membuat halaman baru beserta entri navigasinya.
   *
   * Tiga hal yang dijaga di sini:
   *   1. URL menu memakai bentuk yang sama dengan yang dibaca navbar (`/<slug>`),
   *      bukan `/halaman/<slug>`. Sebelumnya keduanya berbeda sehingga item baru
   *      tidak pernah tersorot sebagai halaman aktif.
   *   2. Menambah item ke grup tujuan mengisi `parentId`, sehingga item langsung
   *      berada di dropdown yang dipilih admin.
   *   3. Bila grup tujuan belum ada di database (navbar masih datar), grup itu
   *      dibekukan lebih dahulu agar item punya induk yang sah.
   */
  const createNavbarMutation = useMutation({
    mutationFn: async () => {
      const judul = navbarDraft.title.trim();
      const slug = navbarDraft.slug.trim();
      if (!judul || !slug) {
        throw new Error('Nama dan slug halaman wajib diisi.');
      }

      // Cari grup tujuan pada pohon navbar saat ini.
      let grupTujuanId: number | null = null;
      if (navbarDraft.parentGroup) {
        const pohon = buildNavbarTree((menusQuery.data ?? []) as NavbarMenuRow[]);
        const idNyata = new Set(flattenMenus(menusQuery.data ?? []).map((m) => m.id));
        let indeks = 0;
        for (const node of pohon) {
          const kunci = `g${indeks}`;
          indeks += 1;
          if (kunci !== navbarDraft.parentGroup) continue;

          const sudahAda = node.id > 0 && idNyata.has(node.id);
          const idPending = pendingGroupMenus[kunci] ?? null;
          grupTujuanId = sudahAda ? node.id : idPending;

          if (!grupTujuanId) {
            // Grup bawaan yang belum tersimpan: bekukan sekarang.
            const semuaMenu = flattenMenus(menusQuery.data ?? []);
            const anakPertama = node.children?.[0];
            const urutan = anakPertama
              ? semuaMenu.find((m) => m.id === anakPertama.id)?.sortOrder
              : undefined;

            const grupRes = await settingsApi.createMenu({
              title: node.label,
              url: '#',
              target: '_self',
              sortOrder: urutan ?? semuaMenu.length + 1,
              isActive: true,
              isGroup: true,
            } as any);
            grupTujuanId = ((grupRes as any)?.data?.menu?.id as number | undefined) ?? null;

            if (grupTujuanId && node.children?.length) {
              await Promise.all(
                node.children.map((anak, index) =>
                  settingsApi.updateMenu(anak.id, { parentId: grupTujuanId, sortOrder: index + 1 } as any),
                ),
              );
            }
            setPendingGroupMenus((prev) => ({ ...prev, [kunci]: grupTujuanId ?? 0 }));
          }
          break;
        }
      }

      const pageRes = await builderApi.createPage({ title: judul, slug, layout: 'default' });

      // Halaman baru selalu masuk sebagai item navbar, sesuai pilihan admin.
      await settingsApi.createMenu({
        parentId: grupTujuanId,
        title: judul,
        url: pageUrl(slug),
        target: '_self',
        sortOrder: 0,
        isActive: true,
      } as any);

      if (navbarType === 'dropdown') {
        for (const item of dropdownItems) {
          if (!item.title.trim() || !item.slug.trim()) continue;
          await builderApi.createPage({
            title: item.title.trim(),
            slug: item.slug.trim(),
            layout: 'default',
          });
          // Sub-item tidak lagi membuat induk baru; ia masuk grup yang sama.
          await settingsApi.createMenu({
            parentId: grupTujuanId,
            title: item.title.trim(),
            url: pageUrl(item.slug.trim()),
            target: '_self',
            sortOrder: 0,
            isActive: true,
          } as any);
        }
      }

      return pageRes;
    },
    onSuccess: (res: any) => {
      toast.success(
        navbarType === 'dropdown'
          ? 'Halaman beserta sub-menunya berhasil dibuat.'
          : 'Halaman dan menu navbar berhasil dibuat.',
      );
      setNavbarFormOpen(false);
      setNavbarDraft({ title: '', slug: '', layout: 'default', parentGroup: '' });
      setDropdownItems([{ title: '', slug: '' }]);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
      void queryClient.invalidateQueries({ queryKey: ['public', 'menus'] });
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
      // Hapus juga menu terkait di database menu jika ada. Pencarian dilakukan
      // pada menu tingkat atas maupun anak grup, karena menu yang sudah
      // dipindahkan ke dalam group tidak lagi berada di daftar teratas.
      if (pageToDelete) {
        try {
          const urlHalaman = pageUrl(pageToDelete.slug);
          const semuaMenu = flattenMenus(menusQuery.data ?? []);
          const matchedMenu = semuaMenu.find(
            (m) =>
              m.url === urlHalaman ||
              m.url === `/${pageToDelete.slug}` ||
              m.url === `/halaman/${pageToDelete.slug}`,
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
      void queryClient.invalidateQueries({ queryKey: ['public', 'menus'] });
      const remaining = (pagesQuery.data ?? []).filter((p) => p.id !== deleteNavbarTarget?.id);
      if (remaining.length > 0) {
        setSelectedPageId(remaining[0].id);
      }
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  /**
   * Menautkan halaman Builder yang belum punya entri menu ke tabel menus.
   *
   * Ini satu-satunya cara agar halaman seperti "Sejarah & Perkembangan" muncul
   * di navbar pengunjung: navbar dibaca dari `menus`, bukan dari `pages`.
   */
  const attachPageToMenuMutation = useMutation({
    mutationFn: (data: { slug: string; parentId?: number | null }) => settingsApi.attachPageToMenu(data),
    onSuccess: () => {
      toast.success('Halaman berhasil ditambahkan ke navbar.');
      refreshNavbar();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  /**
   * Mengubah grup yang masih "menganggur" menjadi baris menus sungguhan.
   *
   * Latar belakang: selama `parentId` seluruh menu masih kosong, navbar publik
   * mengelompokkan menu memakai definisi bawaan tanpa menyimpan apa pun. Grup
   * seperti itu belum punya id, sehingga tidak bisa diganti nama atau dipindah
   * isinya. Fungsi ini membuat satu baris induk ber-URL `#`, lalu mengisi
   * `parentId` seluruh anggotanya sekaligus.
   *
   * @param key    Kunci stabil grup pada pohon navbar.
   * @param node   Simpul grup beserta anggotanya.
   * @param title  Judul baru bila admin mengganti nama grup.
   * @returns Id menu induk hasil pembekuan.
   */
  const materializeGroup = async (
    key: string,
    node: NavbarSidebarEntry,
    title?: string,
  ): Promise<number> => {
    // Grup yang sudah ada di database cukup diperbarui judulnya.
    if (node.menuId !== null) {
      if (title && title !== node.title) {
        await settingsApi.updateMenu(node.menuId, { title });
      }
      return node.menuId;
    }

    const anggota = node.children.filter((anak) => anak.menuId !== null);
    const semuaMenu = flattenMenus(menusQuery.data ?? []);

    // Grup diletakkan tepat sebelum anggota pertamanya agar tidak melompat posisi.
    const urutanPertama = anggota.length > 0
      ? semuaMenu.find((menu) => menu.id === anggota[0].menuId)?.sortOrder
      : undefined;

    const grupRes = await settingsApi.createMenu({
      title: title?.trim() || node.title,
      url: '#',
      target: '_self',
      sortOrder: urutanPertama ?? semuaMenu.length + 1,
      isActive: true,
      isGroup: true,
    } as any);

    const grupId = (grupRes as any)?.data?.menu?.id as number | undefined;
    if (!grupId) {
      throw new Error('Grup navbar gagal dibuat. Coba lagi.');
    }

    // Pindahkan seluruh anggota ke bawah grup tanpa mengubah urutannya.
    await Promise.all(
      anggota.map((anak, index) =>
        settingsApi.updateMenu(anak.menuId as number, { parentId: grupId, sortOrder: index + 1 } as any),
      ),
    );

    setPendingGroupMenus((prev) => ({ ...prev, [key]: grupId }));
    return grupId;
  };

  /** Menyegarkan seluruh tampilan yang bergantung pada struktur navbar. */
  const refreshNavbar = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });
    void queryClient.invalidateQueries({ queryKey: ['public', 'menus'] });
  };

  /**
   * Menukar urutan dua menu berdasarkan id menu (bukan id halaman).
   *
   * Sidebar kini dibangun dari tabel menus, sehingga baik tombol panah maupun
   * seret-lepas bekerja pada id menu. Kedua menu harus bersaudara (induk sama);
   * pemindahan antar grup ditangani `handleMoveToGroup`.
   */
  const handleReorderNavbarMenu = async (sourceMenuId: number, targetMenuId: number) => {
    const datar = flattenMenus(menusQuery.data ?? []);
    if (datar.length === 0) return;

    const sumber = datar.find((menu) => menu.id === sourceMenuId);
    const tujuan = datar.find((menu) => menu.id === targetMenuId);
    if (!sumber || !tujuan) return;
    if ((sumber.parentId ?? null) !== (tujuan.parentId ?? null)) return;

    const saudara = datar
      .filter((menu) => (menu.parentId ?? null) === (sumber.parentId ?? null))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

    const dari = saudara.findIndex((menu) => menu.id === sourceMenuId);
    const ke = saudara.findIndex((menu) => menu.id === targetMenuId);
    if (dari === -1 || ke === -1 || dari === ke) return;

    const disusun = [...saudara];
    const [dipindah] = disusun.splice(dari, 1);
    disusun.splice(ke, 0, dipindah);

    // Seluruh menu dikirim ulang dengan sortOrder unik agar urutan tersimpan
    // persis seperti yang terlihat, bukan hanya menukar dua nomor yang bisa sama.
    const urutan = new Map<number, number>();
    datar
      .filter((menu) => (menu.parentId ?? null) === null)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
      .forEach((menu, index) => urutan.set(menu.id, (index + 1) * 100));

    disusun.forEach((menu, index) => urutan.set(menu.id, index + 1));

    const payload = datar.map((menu) => ({
      id: menu.id,
      sortOrder: urutan.get(menu.id) ?? menu.sortOrder,
    }));

    setIsReorderingMenu(true);
    try {
      await settingsApi.reorderMenus(payload);
      toast.success(`Urutan "${sumber.title}" berhasil diubah.`);
      refreshNavbar();
    } catch (err) {
      const apiError = toApiError(err);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    } finally {
      setIsReorderingMenu(false);
    }
  };

  /** Mengganti nama grup dropdown, sekaligus membekukannya bila belum ada di database. */
  const handleRenameGroup = async (node: NavbarSidebarEntry, key: string, judulBaru: string) => {
    const judul = judulBaru.trim();
    if (!judul) {
      toast.error('Nama grup tidak boleh kosong.');
      return;
    }
    if (judul === node.title) {
      setPendingGroupEdit(null);
      return;
    }

    setIsReorderingMenu(true);
    try {
      if (node.menuId !== null) {
        await settingsApi.updateMenu(node.menuId, { title: judul });
      } else {
        await materializeGroup(key, node, judul);
      }
      toast.success(`Grup diubah menjadi "${judul}".`);
      setPendingGroupEdit(null);
      refreshNavbar();
    } catch (err) {
      const apiError = toApiError(err);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    } finally {
      setIsReorderingMenu(false);
    }
  };

  /** Membuat grup dropdown kosong yang nantinya dapat diisi halaman. */
  const handleCreateGroup = async () => {
    const judul = newGroupTitle.trim();
    if (!judul) {
      toast.error('Nama grup tidak boleh kosong.');
      return;
    }

    setIsReorderingMenu(true);
    try {
      const semuaMenu = flattenMenus(menusQuery.data ?? []);
      const urutanTerakhir = semuaMenu.reduce((maks, menu) => Math.max(maks, menu.sortOrder), 0);
      await settingsApi.createMenu({
        title: judul,
        url: '#',
        target: '_self',
        sortOrder: urutanTerakhir + 1,
        isActive: true,
        isGroup: true,
      } as any);
      toast.success(`Grup "${judul}" berhasil dibuat.`);
      setNewGroupOpen(false);
      setNewGroupTitle('');
      refreshNavbar();
    } catch (err) {
      const apiError = toApiError(err);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    } finally {
      setIsReorderingMenu(false);
    }
  };

  /**
   * Memindahkan satu item menu ke grup lain.
   *
   * `targetKey` adalah kunci grup tujuan; `null` berarti mengeluarkan item dari
   * grupnya menjadi menu tingkat atas. Bila grup tujuan belum ada di database,
   * grup tersebut dibekukan lebih dahulu agar item punya induk yang sah.
   */
  const handleMoveToGroup = async (
    item: NavbarSidebarEntry,
    targetKey: string | null,
    targetNode: NavbarSidebarEntry | null,
  ) => {
    if (item.menuId === null) {
      toast.error('Item ini belum terdaftar di navigasi. Tambahkan ke menu terlebih dahulu.');
      return;
    }

    setIsReorderingMenu(true);
    try {
      let targetId: number | null = null;
      if (targetNode && targetKey) {
        targetId =
          targetNode.menuId !== null ? targetNode.menuId : await materializeGroup(targetKey, targetNode);
      }

      // Item diletakkan di urutan terakhir grup tujuan.
      const saudara = flattenMenus(menusQuery.data ?? []).filter(
        (menu) => (menu.parentId ?? null) === targetId && menu.id !== item.menuId,
      );
      const urutanTerakhir = saudara.reduce((maks, menu) => Math.max(maks, menu.sortOrder), 0);

      await settingsApi.updateMenu(item.menuId, {
        parentId: targetId,
        sortOrder: urutanTerakhir + 1,
      } as any);

      toast.success(
        targetNode
          ? `"${item.title}" dipindahkan ke ${targetNode.title}.`
          : `"${item.title}" dikeluarkan dari grup.`,
      );
      refreshNavbar();
    } catch (err) {
      const apiError = toApiError(err);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    } finally {
      setIsReorderingMenu(false);
    }
  };

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
        <div className="space-y-4">
          {tenant ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-blue-200 bg-blue-50/60 px-4 py-2.5">
              <p className="text-xs font-semibold text-blue-900">
                Cakupan aktif:{' '}
                <span className="font-bold">{tenant.name}</span>
                <span className="ml-1.5 rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-800">
                  {tenant.code}
                </span>
                <span className="ml-1.5 font-normal text-blue-800">â€” {tenant.facultyName}</span>
              </p>
              <a
                href={tenant.domain ? `http://${tenant.domain}:5180/` : 'http://localhost:5180/'}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-blue-900 underline hover:text-blue-950"
              >
                Lihat Website Prodi &rarr;
              </a>
            </div>
          ) : null}
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
              const rawMenus = menusQuery.data ?? [];

              /** Halaman Builder yang URL-nya sama dengan menu. */
              const findPage = (url: string): BuilderPage | null => {
                if (!url) return null;
                return (
                  allPages.find((p) => pageUrl(p.slug) === url) ??
                  allPages.find((p) => `/halaman/${p.slug}` === url) ??
                  null
                );
              };

              /**
               * Pohon navbar diambil dari fungsi bersama `buildNavbarTree`, fungsi
               * yang sama yang dipakai landing page. Inilah yang menjamin sidebar
               * Builder tidak pernah berbeda dari navbar pengunjung.
               */
              const pohon: NavbarNode[] = buildNavbarTree(rawMenus as NavbarMenuRow[]);

              /** Id menu yang sudah ada di database, dipakai membedakan grup nyata/sementara. */
              const idMenuNyata = new Set(flattenMenus(rawMenus as NavbarMenuRow[]).map((m) => m.id));

              const keEntri = (node: NavbarNode, kunci: string): NavbarSidebarEntry => {
                const idPending = pendingGroupMenus[kunci];
                const menuId = node.id > 0 && idMenuNyata.has(node.id) ? node.id : idPending ?? null;
                const anak = (node.children ?? []).map((c, i) => keEntri(c, `${kunci}.${i}`));
                const halaman = findPage(node.path);

                return {
                  key: kunci,
                  menuId,
                  title: node.label,
                  url: node.path,
                  isGroup: Boolean(node.isGroup) || anak.length > 0,
                  page: halaman,
                  children: anak,
                };
              };

              const entri: NavbarSidebarEntry[] = pohon.map((node, i) => keEntri(node, `g${i}`));
              /** Semua grup, dipakai sebagai pilihan tujuan pemindahan item. */
              const semuaGrup = entri.filter((e) => e.isGroup);
              /** Halaman terbit yang belum punya entri di tabel menus. */
              const halamanTanpaMenu = findOrphanPages(allPages, rawMenus as NavbarMenuRow[]);

              /**
               * Grup lain yang boleh menjadi tujuan pemindahan.
               *
               * Grup tempat item berada sekarang tidak ditampilkan karena
               * memindahkan ke grup yang sama tidak mengubah apa pun.
               */
              const grupLain = (item: NavbarSidebarEntry) =>
                semuaGrup.filter(
                  (grup) => grup.key !== item.key && !item.key.startsWith(`${grup.key}.`),
                );

              /**
               * Item punya tombol aksi bila minimal satu aksi tersedia, yaitu
               * sudah terdaftar di navigasi (untuk dipindah) atau punya halaman
               * yang boleh diubah/dihapus.
               */
              const bisaKelola = (item: NavbarSidebarEntry) =>
                (item.menuId !== null && grupLain(item).length > 0) ||
                (item.page !== null && (has('pages.update') || has('pages.delete')));

              const renderItem = (item: NavbarSidebarEntry, isChild = false) => {
                const halaman = item.page;
                const isSelected = halaman !== null && halaman.id === selectedPageId;
                const isDragging = halaman !== null && halaman.id === draggedPageId;

                return (
                  <div
                    key={item.key}
                    draggable={item.menuId !== null}
                    onDragStart={(e) => {
                      if (item.menuId === null) return;
                      e.dataTransfer.setData('text/plain', String(item.menuId));
                      if (halaman) setDraggedPageId(halaman.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const droppedMenuId = Number(e.dataTransfer.getData('text/plain'));
                      setDraggedPageId(null);
                      if (!droppedMenuId || droppedMenuId === item.menuId || item.menuId === null) return;

                      /*
                       * Penyusunan ulang hanya berlaku untuk item yang berada
                       * pada induk yang sama. Perbandingan memakai `parentId`
                       * sebenarnya dari kedua menu, bukan posisi dalam daftar,
                       * agar seret-lepas antar grup tidak menghasilkan urutan
                       * yang salah.
                       */
                      const semuaMenu = flattenMenus(rawMenus as NavbarMenuRow[]);
                      const sumber = semuaMenu.find((menu) => menu.id === droppedMenuId);
                      const tujuan = semuaMenu.find((menu) => menu.id === item.menuId);
                      if (!sumber || !tujuan) return;
                      if ((sumber.parentId ?? null) !== (tujuan.parentId ?? null)) return;

                      void handleReorderNavbarMenu(droppedMenuId, item.menuId);
                    }}
                    onDragEnd={() => setDraggedPageId(null)}
                    /*
                     * `z-30` hanya aktif saat dropdown item ini terbuka.
                     * Tanpa itu baris berikutnya (juga berposisi `relative`)
                     * menimpa panel dropdown sehingga separuh menunya
                     * tertutup tombol ⋮ milik item di bawahnya.
                     */
                    className={`relative flex items-center group rounded-lg transition-all ${
                      isDragging ? 'opacity-40 border-2 border-dashed border-[#1e3a8a]' : ''
                    } ${openAksiKey === item.key ? 'z-30' : ''}`}
                  >
                    <div
                      className={`flex items-center pl-1.5 text-slate-300 transition-colors ${
                        item.menuId !== null ? 'cursor-grab active:cursor-grabbing group-hover:text-slate-600' : 'opacity-30'
                      }`}
                      title={item.menuId !== null ? 'Seret untuk mengubah urutan' : 'Tambahkan ke menu agar dapat diurutkan'}
                    >
                      <Bars3Icon className="h-3.5 w-3.5" />
                    </div>

                    <button
                      type="button"
                      disabled={halaman === null}
                      onClick={() => halaman && setSelectedPageId(halaman.id)}
                      title={halaman === null ? 'Belum ada halaman untuk menu ini' : `Buka ${item.title}`}
                      className={`flex w-full items-center justify-between rounded-lg py-1.5 pr-24 pl-1.5 text-left text-xs font-semibold transition-colors disabled:cursor-default ${
                        isChild ? 'pl-2' : ''
                      } ${isSelected ? 'bg-[#1e3a8a] text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <span className="min-w-0 truncate">{item.title}</span>
                      {halaman ? (
                        <span
                          className={`shrink-0 ml-2 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            halaman.isPublished
                              ? isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-50 text-emerald-700'
                              : isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {halaman.isPublished ? 'Terbit' : 'Draft'}
                        </span>
                      ) : (
                        <span className="shrink-0 ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                          Tanpa halaman
                        </span>
                      )}
                    </button>

                    {/*
                      Satu dropdown untuk seluruh aksi item. Menampung
                      "Pindahkan ke grup", "Edit judul", dan "Hapus" agar deretan
                      tombol tidak memenuhi baris. Tiap aksi hanya muncul bila
                      pengguna punya izinnya dan item memang sudah terdaftar di
                      navigasi.
                    */}
                    {bisaKelola(item) ? (
                      <div className="absolute right-1.5 z-20">
                        <DropdownAksiNavbar
                          namaItem={item.title}
                          onOpenChange={(terbuka) =>
                            setOpenAksiKey((sebelumnya) => {
                              if (!terbuka) return sebelumnya === item.key ? null : sebelumnya;
                              return item.key;
                            })
                          }
                          aksi={{
                            pindah: item.menuId !== null && grupLain(item).length > 0,
                            ubah: halaman !== null && has('pages.update'),
                            hapus: halaman !== null && has('pages.delete'),
                          }}
                          grupTujuan={grupLain(item)}
                          onPindah={(kunci) => {
                            if (kunci === null) {
                              void handleMoveToGroup(item, null, null);
                              return;
                            }
                            const tujuan = semuaGrup.find((g) => g.key === kunci) ?? null;
                            if (tujuan) void handleMoveToGroup(item, kunci, tujuan);
                          }}
                          onUbah={() => {
                            if (!halaman) return;
                            setEditNavbarTarget({ id: halaman.id, title: halaman.title, isSystem: halaman.isSystem });
                            setEditNavbarTitle(halaman.title);
                          }}
                          onHapus={() => {
                            if (halaman) setDeleteNavbarTarget(halaman);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              };

              const renderGroup = (group: NavbarSidebarEntry) => (
                <div key={group.key} className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-1.5 space-y-1">
                  <div className="flex items-center justify-between px-2 py-1">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className="flex flex-1 items-center gap-1.5 text-[11px] font-bold text-slate-700 hover:text-slate-950 text-left"
                    >
                      <DocumentCheckIcon className="h-4 w-4 text-slate-500" />
                      <span>{group.title}</span>
                      {openGroups[group.key] ? (
                        <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400 ml-auto mr-1" />
                      ) : (
                        <ChevronRightIcon className="h-3.5 w-3.5 text-slate-400 ml-auto mr-1" />
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      {has('navigation.update') ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingGroupEdit({ key: group.key, title: group.title });
                          }}
                          title={`Ganti nama grup: ${group.title}`}
                          className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-[#1e3a8a] transition-colors"
                        >
                          <PencilSquareIcon className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      {has('pages.create') ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNavbarType('single');
                            setTargetDropdownGroup(group.key);
                            setNavbarDraft({ title: '', slug: '', layout: 'default', parentGroup: group.key });
                            setNavbarFormOpen(true);
                          }}
                          title={`Tambah halaman ke ${group.title}`}
                          className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-[#1e3a8a] transition-colors"
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {openGroups[group.key] !== false && (
                    <div className="space-y-0.5 pl-2 border-l border-slate-200 ml-2">
                      {group.children.length === 0 ? (
                        <p className="px-2 py-1.5 text-[10px] italic text-slate-400">
                          Grup masih kosong. Pindahkan halaman ke sini lewat menu aksi (⋮) &rarr; Pindahkan ke grup.
                        </p>
                      ) : (
                        group.children.map((anak) => renderItem(anak, true))
                      )}
                    </div>
                  )}
                </div>
              );

              return (
                <div className="space-y-2">
                  {entri.length === 0 && halamanTanpaMenu.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-[11px] text-slate-500">
                      Navigasi masih kosong. Tambahkan menu dengan tombol â€œTambahâ€ di atas.
                    </p>
                  ) : null}

                  {entri.map((node) => {
                    if (node.isGroup) return renderGroup(node);
                    return (
                      <div key={node.key} className="space-y-1">
                        {renderItem(node)}
                      </div>
                    );
                  })}

                  {has('pages.create') ? (
                    <button
                      type="button"
                      onClick={() => {
                        setNewGroupTitle('');
                        setNewGroupOpen(true);
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-1.5 text-[11px] font-semibold text-slate-500 hover:border-[#1e3a8a] hover:bg-blue-50/50 hover:text-[#1e3a8a] transition-colors"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                      Buat Grup Dropdown Baru
                    </button>
                  ) : null}

                  {halamanTanpaMenu.length > 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2 space-y-1.5">
                      <p className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                        <InformationCircleIcon className="h-3.5 w-3.5" />
                        Halaman belum ada di navbar ({halamanTanpaMenu.length})
                      </p>
                      <p className="px-1 text-[10px] leading-relaxed text-amber-900/80">
                        Halaman ini bisa diedit tetapi tidak terlihat pengunjung karena belum punya entri menu.
                      </p>
                      {halamanTanpaMenu.map((hal) => {
                        const halamanBuilder = allPages.find((p) => p.slug === hal.slug);
                        return (
                          <div
                            key={hal.slug}
                            className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5"
                          >
                            <button
                              type="button"
                              onClick={() => halamanBuilder && setSelectedPageId(halamanBuilder.id)}
                              className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold text-slate-700 hover:text-[#1e3a8a]"
                              title={hal.title}
                            >
                              {hal.title}
                            </button>
                            {has('navigation.create') ? (
                              <button
                                type="button"
                                disabled={isReorderingMenu}
                                onClick={() => void attachPageToMenuMutation.mutate({ slug: hal.slug })}
                                className="shrink-0 rounded bg-[#1e3a8a] px-2 py-0.5 text-[10px] font-bold text-white hover:bg-[#172554] disabled:opacity-50"
                                title="Buat entri menu agar halaman tampil di navbar"
                              >
                                Tambahkan ke menu
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
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
                      {page.slug === 'beranda' ? '/' : `/${page.slug}`} â€¢ {page.sections.length} section
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
                                          Judul tampil: â€œ{config.title}â€
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
                                            â€œ{desc}â€
                                          </p>
                                        ) : null;
                                      })()}
                                      <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                                        <span className="font-medium text-slate-700">{summarize(config)}</span>
                                        <span>â€¢</span>
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
                  [{prefix}] â€” {getWidgetDisplayName(widget.code, widget.name)}
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
                  [{prefix}] â€” {getWidgetDisplayName(widget.code, widget.name)}
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

      {/* Ganti nama grup dropdown */}
      <FormModal
        open={pendingGroupEdit !== null}
        title="Ganti Nama Grup Navbar"
        description="Nama ini tampil sebagai judul dropdown pada navbar website prodi."
        submitLabel="Simpan Nama"
        busy={isReorderingMenu}
        onSubmit={(event) => {
          event.preventDefault();
          if (!pendingGroupEdit) return;
          const kunci = pendingGroupEdit.key;
          const pohon = buildNavbarTree((menusQuery.data ?? []) as NavbarMenuRow[]);
          const node = pohon.find((_, index) => `g${index}` === kunci);
          if (!node) {
            toast.error('Grup tidak ditemukan. Muat ulang halaman lalu coba lagi.');
            return;
          }
          const entri: NavbarSidebarEntry = {
            key: kunci,
            menuId: node.id > 0 ? node.id : null,
            title: node.label,
            url: node.path,
            isGroup: true,
            page: null,
            children: (node.children ?? []).map((anak, index) => ({
              key: `${kunci}.${index}`,
              menuId: anak.id > 0 ? anak.id : null,
              title: anak.label,
              url: anak.path,
              isGroup: false,
              page: null,
              children: [],
            })),
          };
          void handleRenameGroup(entri, kunci, pendingGroupEdit.title);
        }}
        onClose={() => setPendingGroupEdit(null)}
      >
        <Field label="Nama Grup" htmlFor="nama-grup-navbar" required>
          <input
            id="nama-grup-navbar"
            type="text"
            value={pendingGroupEdit?.title ?? ''}
            onChange={(e) =>
              setPendingGroupEdit((prev) => (prev ? { ...prev, title: e.target.value } : prev))
            }
            placeholder="Contoh: Kemahasiswaan & Alumni"
            className="input"
            autoFocus
          />
        </Field>
      </FormModal>

      {/* Buat grup dropdown baru */}
      <FormModal
        open={newGroupOpen}
        title="Buat Grup Dropdown"
        description="Grup baru tampil di navbar sebagai dropdown. Setelah dibuat, pindahkan halaman ke dalamnya lewat tombol “Pindah…”."
        submitLabel="Buat Grup"
        busy={isReorderingMenu}
        onSubmit={(event) => {
          event.preventDefault();
          void handleCreateGroup();
        }}
        onClose={() => setNewGroupOpen(false)}
      >
        <Field label="Nama Grup" htmlFor="grup-baru-navbar" required>
          <input
            id="grup-baru-navbar"
            type="text"
            value={newGroupTitle}
            onChange={(e) => setNewGroupTitle(e.target.value)}
            placeholder="Contoh: Kemahasiswaan & Alumni"
            className="input"
            autoFocus
          />
        </Field>
      </FormModal>
    </AdminLayout>
  );
};

export default AdminBuilder;
