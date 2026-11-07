/**
 * Data organisasi UNUSU: 6 fakultas induk dan 14 program studi.
 *
 * Sumber: docs/PRD.md bagian 3.2 dan inventaris domain pada
 * source-reference/conversation-source.txt baris 1-26 (IP 103.116.168.49).
 *
 * Sesuai keputusan pemilik sistem: fakultas hanya data induk, tidak menjadi
 * tenant website. Hanya 14 program studi yang punya domain publik.
 */

export interface FacultySeed {
  code: string;
  name: string;
  slug: string;
  sortOrder: number;
  studyPrograms: StudyProgramSeed[];
}

export interface StudyProgramSeed {
  code: string;
  name: string;
  slug: string;
  degree: string;
  hostname: string;
  sortOrder: number;
}

export const FACULTIES: FacultySeed[] = [
  {
    code: 'FIK',
    name: 'Fakultas Ilmu Komputer',
    slug: 'fakultas-ilmu-komputer',
    sortOrder: 1,
    studyPrograms: [
      { code: 'TIF', name: 'Teknik Informatika', slug: 'teknik-informatika', degree: 'S1', hostname: 'tif.unusu.ac.id', sortOrder: 1 },
      { code: 'IKO', name: 'Ilmu Komputer', slug: 'ilmu-komputer', degree: 'S1', hostname: 'iko.unusu.ac.id', sortOrder: 2 },
      { code: 'SIN', name: 'Sistem Informasi', slug: 'sistem-informasi', degree: 'S1', hostname: 'sin.unusu.ac.id', sortOrder: 3 },
    ],
  },
  {
    code: 'FIP',
    name: 'Fakultas Ilmu Pendidikan',
    slug: 'fakultas-ilmu-pendidikan',
    sortOrder: 2,
    studyPrograms: [
      { code: 'PGSD', name: 'Pendidikan Guru Sekolah Dasar', slug: 'pendidikan-guru-sekolah-dasar', degree: 'S1', hostname: 'pgsd.unusu.ac.id', sortOrder: 1 },
    ],
  },
  {
    code: 'FE',
    name: 'Fakultas Ekonomi',
    slug: 'fakultas-ekonomi',
    sortOrder: 3,
    studyPrograms: [
      { code: 'MAN', name: 'Manajemen', slug: 'manajemen', degree: 'S1', hostname: 'manajemen.unusu.ac.id', sortOrder: 1 },
    ],
  },
  {
    code: 'FAPERTA',
    name: 'Fakultas Pertanian',
    slug: 'fakultas-pertanian',
    sortOrder: 4,
    studyPrograms: [
      { code: 'AGB', name: 'Agribisnis', slug: 'agribisnis', degree: 'S1', hostname: 'agribisnis.unusu.ac.id', sortOrder: 1 },
      { code: 'ITP', name: 'Ilmu dan Teknologi Pangan', slug: 'ilmu-dan-teknologi-pangan', degree: 'S1', hostname: 'itp.unusu.ac.id', sortOrder: 2 },
      { code: 'BDP', name: 'Budidaya Pertanian', slug: 'budidaya-pertanian', degree: 'S1', hostname: 'bdp.unusu.ac.id', sortOrder: 3 },
    ],
  },
  {
    code: 'FIKES',
    name: 'Fakultas Ilmu Kesehatan',
    slug: 'fakultas-ilmu-kesehatan',
    sortOrder: 5,
    studyPrograms: [
      { code: 'GIZ', name: 'Ilmu Gizi', slug: 'ilmu-gizi', degree: 'S1', hostname: 'ilmugizi.unusu.ac.id', sortOrder: 1 },
      { code: 'ANK', name: 'D3 Analis Kesehatan', slug: 'd3-analis-kesehatan', degree: 'D3', hostname: 'ankes.unusu.ac.id', sortOrder: 2 },
    ],
  },
  {
    code: 'FAI',
    name: 'Fakultas Agama Islam',
    slug: 'fakultas-agama-islam',
    sortOrder: 6,
    studyPrograms: [
      { code: 'PIAUD', name: 'Pendidikan Islam Anak Usia Dini', slug: 'pendidikan-islam-anak-usia-dini', degree: 'S1', hostname: 'piaud.unusu.ac.id', sortOrder: 1 },
      { code: 'PAI', name: 'Pendidikan Agama Islam', slug: 'pendidikan-agama-islam', degree: 'S1', hostname: 'pai.unusu.ac.id', sortOrder: 2 },
      { code: 'HKI', name: 'Hukum Keluarga Islam', slug: 'hukum-keluarga-islam', degree: 'S1', hostname: 'hki.unusu.ac.id', sortOrder: 3 },
      { code: 'STI', name: 'Studi Islam', slug: 'studi-islam', degree: 'S1', hostname: 'studislam.unusu.ac.id', sortOrder: 4 },
    ],
  },
];

/** 10 menu publik standar (docs/PRD.md bagian 5). Urutan dan URL dipertahankan. */
export const STANDARD_PUBLIC_MENUS: Array<{ title: string; url: string; isRequired: boolean }> = [
  { title: 'Beranda', url: '/', isRequired: true },
  { title: 'Profil', url: '/profil', isRequired: true },
  { title: 'Visi & Misi', url: '/visi-misi', isRequired: true },
  { title: 'Kurikulum', url: '/kurikulum', isRequired: true },
  { title: 'Dokumen', url: '/dokumen', isRequired: true },
  { title: 'Dosen', url: '/dosen', isRequired: true },
  { title: 'Sarpras', url: '/sarana-prasarana', isRequired: true },
  { title: 'Berita', url: '/berita', isRequired: true },
  { title: 'Galeri', url: '/galeri', isRequired: true },
  { title: 'Kontak', url: '/kontak', isRequired: true },
];

export interface WidgetSeed {
  code: string;
  name: string;
  category: string;
  description: string;
  defaultConfig: Record<string, unknown>;
  variants: Array<{ code: string; name: string }>;
}

/**
 * Widget registry.
 *
 * Hanya widget yang renderer React-nya benar-benar ada di
 * `src/client/features/renderer` yang didaftarkan di sini.
 */
export const WIDGETS: WidgetSeed[] = [
  {
    code: 'hero_slider',
    name: 'Hero Slider',
    category: 'Hero & Header',
    description: 'Slideshow gambar penuh dengan pagination titik.',
    defaultConfig: { slides: [], autoplayMs: 6000, showDots: true },
    variants: [
      { code: 'full', name: 'Full Background' },
      { code: 'split', name: 'Split Image' },
    ],
  },
  {
    code: 'about_prodi',
    name: 'About Prodi',
    category: 'Profile & Information',
    description: 'Ringkasan profil program studi beserta gambar pendukung.',
    defaultConfig: { eyebrow: '', title: '', body: '', imageUrl: '', alignment: 'left' },
    variants: [
      { code: 'image-right', name: 'Image Right' },
      { code: 'image-left', name: 'Image Left' },
    ],
  },
  {
    code: 'vision_mission',
    name: 'Visi & Misi',
    category: 'Profile & Information',
    description: 'Kartu visi dan daftar misi program studi.',
    defaultConfig: { vision: '', missions: [] },
    variants: [{ code: 'stacked', name: 'Stacked' }],
  },
  {
    code: 'statistics',
    name: 'Statistics',
    category: 'Statistics',
    description: 'Empat kartu angka ringkas: mahasiswa, dosen, mata kuliah, SKS.',
    defaultConfig: { layout: 'four-columns', items: [] },
    variants: [
      { code: 'four-columns', name: 'Four Columns' },
      { code: 'strip', name: 'Strip' },
    ],
  },
  {
    code: 'lecturer_list',
    name: 'Lecturer List',
    category: 'Academic',
    description: 'Daftar dosen program studi dari modul Dosen.',
    defaultConfig: { title: 'Tenaga Pengajar', limit: 8, variant: 'card' },
    variants: [
      { code: 'card-grid', name: 'Grid Card' },
      { code: 'compact-list', name: 'Compact List' },
    ],
  },
  {
    code: 'curriculum_overview',
    name: 'Curriculum Overview',
    category: 'Academic',
    description: 'Ringkasan kurikulum aktif: jumlah semester, mata kuliah, dan SKS.',
    defaultConfig: { title: 'Kurikulum' },
    variants: [{ code: 'summary', name: 'Summary' }],
  },
  {
    code: 'latest_news',
    name: 'Latest News',
    category: 'Publication',
    description: 'Berita terbaru dari modul Berita.',
    defaultConfig: { title: 'Berita Terbaru', limit: 3 },
    variants: [
      { code: 'grid', name: 'Grid' },
      { code: 'featured', name: 'Featured' },
    ],
  },
  {
    code: 'document_list',
    name: 'Document List',
    category: 'Publication',
    description: 'Dokumen publik dari modul Dokumen.',
    defaultConfig: { title: 'Dokumen', limit: 6 },
    variants: [{ code: 'list', name: 'List' }],
  },
  {
    code: 'facility_grid',
    name: 'Facility Grid',
    category: 'Facilities',
    description: 'Kartu sarana dan prasarana program studi.',
    defaultConfig: { title: 'Sarana & Prasarana', limit: 6 },
    variants: [{ code: 'grid', name: 'Grid' }],
  },
  {
    code: 'gallery_grid',
    name: 'Gallery Grid',
    category: 'Publication',
    description: 'Album galeri kegiatan program studi.',
    defaultConfig: { title: 'Galeri', limit: 6 },
    variants: [{ code: 'grid', name: 'Grid' }],
  },
  {
    code: 'contact_information',
    name: 'Contact Information',
    category: 'Supporting',
    description: 'Alamat, email, telepon, dan peta dari modul Kontak.',
    defaultConfig: { title: 'Hubungi Kami' },
    variants: [{ code: 'split', name: 'Split' }],
  },
  {
    code: 'cta_banner',
    name: 'CTA Banner',
    category: 'Supporting',
    description: 'Ajakan bertindak dengan tombol utama.',
    defaultConfig: { title: '', body: '', buttonLabel: '', buttonUrl: '' },
    variants: [{ code: 'solid', name: 'Solid' }],
  },
];

/** Preset permission group Editor (docs/rbac bagian 7). */
export const PERMISSION_GROUPS: Array<{ code: string; name: string; permissions: string[] }> = [
  {
    code: 'EDITOR_BERITA',
    name: 'Editor Berita',
    permissions: ['posts.view', 'posts.create', 'posts.update', 'posts.delete', 'media.view', 'media.upload'],
  },
  {
    code: 'EDITOR_DOKUMEN',
    name: 'Editor Dokumen',
    permissions: ['documents.view', 'documents.create', 'documents.update', 'documents.delete', 'media.view', 'media.upload'],
  },
  {
    code: 'EDITOR_KURIKULUM',
    name: 'Editor Kurikulum',
    permissions: ['curriculum.view', 'curriculum.create', 'curriculum.update'],
  },
  {
    code: 'EDITOR_DOSEN',
    name: 'Editor Dosen',
    permissions: ['lecturers.view', 'lecturers.create', 'lecturers.update'],
  },
  {
    code: 'EDITOR_GALERI',
    name: 'Editor Galeri',
    permissions: ['galleries.view', 'galleries.create', 'galleries.update', 'galleries.delete', 'media.view', 'media.upload'],
  },
  {
    code: 'EDITOR_PROFIL',
    name: 'Editor Profil',
    permissions: ['profile.view', 'profile.update', 'vision_mission.view', 'vision_mission.update'],
  },
];

/**
 * Menu admin dinamis. `scopeType` menentukan siapa yang melihat:
 * global untuk Super Admin, prodi untuk Admin Prodi dan Editor.
 */
export const ADMIN_MENUS: Array<{
  menuKey: string;
  label: string;
  route: string;
  icon: string;
  parentKey?: string;
  sortOrder: number;
  requiredPermission: string;
  scopeType: string;
}> = [
  { menuKey: 'dashboard', label: 'Dashboard', route: '/admin', icon: 'HomeIcon', sortOrder: 1, requiredPermission: 'dashboard.view', scopeType: 'prodi' },

  { menuKey: 'website', label: 'Website', route: '/admin/website', icon: 'GlobeAltIcon', sortOrder: 10, requiredPermission: 'website.view', scopeType: 'prodi' },
  { menuKey: 'website.identity', label: 'Identitas Website', route: '/admin/website/identitas', icon: 'IdentificationIcon', parentKey: 'website', sortOrder: 11, requiredPermission: 'website.view', scopeType: 'prodi' },
  { menuKey: 'website.navigation', label: 'Navigasi', route: '/admin/website/navigasi', icon: 'Bars3Icon', parentKey: 'website', sortOrder: 12, requiredPermission: 'navigation.view', scopeType: 'prodi' },
  { menuKey: 'website.theme', label: 'Tema', route: '/admin/website/tema', icon: 'SwatchIcon', parentKey: 'website', sortOrder: 13, requiredPermission: 'theme.view', scopeType: 'prodi' },
  { menuKey: 'website.seo', label: 'SEO', route: '/admin/website/seo', icon: 'MagnifyingGlassIcon', parentKey: 'website', sortOrder: 14, requiredPermission: 'seo.view', scopeType: 'prodi' },

  { menuKey: 'builder', label: 'Page Builder', route: '/admin/builder', icon: 'AdjustmentsHorizontalIcon', sortOrder: 20, requiredPermission: 'builder.view', scopeType: 'prodi' },

  { menuKey: 'content', label: 'Konten', route: '/admin/konten', icon: 'DocumentTextIcon', sortOrder: 30, requiredPermission: 'profile.view', scopeType: 'prodi' },
  { menuKey: 'content.profile', label: 'Profil', route: '/admin/konten/profil', icon: 'UserIcon', parentKey: 'content', sortOrder: 31, requiredPermission: 'profile.view', scopeType: 'prodi' },
  { menuKey: 'content.vision', label: 'Visi & Misi', route: '/admin/konten/visi-misi', icon: 'EyeIcon', parentKey: 'content', sortOrder: 32, requiredPermission: 'vision_mission.view', scopeType: 'prodi' },
  { menuKey: 'content.curriculum', label: 'Kurikulum', route: '/admin/kurikulum', icon: 'BookOpenIcon', parentKey: 'content', sortOrder: 33, requiredPermission: 'curriculum.view', scopeType: 'prodi' },
  { menuKey: 'content.documents', label: 'Dokumen', route: '/admin/dokumen', icon: 'FolderOpenIcon', parentKey: 'content', sortOrder: 34, requiredPermission: 'documents.view', scopeType: 'prodi' },
  { menuKey: 'content.lecturers', label: 'Dosen', route: '/admin/dosen', icon: 'UserGroupIcon', parentKey: 'content', sortOrder: 35, requiredPermission: 'lecturers.view', scopeType: 'prodi' },
  { menuKey: 'content.facilities', label: 'Sarpras', route: '/admin/sarpras', icon: 'BuildingOfficeIcon', parentKey: 'content', sortOrder: 36, requiredPermission: 'facilities.view', scopeType: 'prodi' },
  { menuKey: 'content.posts', label: 'Berita', route: '/admin/berita', icon: 'NewspaperIcon', parentKey: 'content', sortOrder: 37, requiredPermission: 'posts.view', scopeType: 'prodi' },
  { menuKey: 'content.galleries', label: 'Galeri', route: '/admin/galeri', icon: 'PhotoIcon', parentKey: 'content', sortOrder: 38, requiredPermission: 'galleries.view', scopeType: 'prodi' },
  { menuKey: 'content.contact', label: 'Kontak', route: '/admin/kontak', icon: 'PhoneIcon', parentKey: 'content', sortOrder: 39, requiredPermission: 'contacts.view', scopeType: 'prodi' },
  { menuKey: 'content.messages', label: 'Pesan Masuk', route: '/admin/pesan', icon: 'InboxIcon', parentKey: 'content', sortOrder: 40, requiredPermission: 'contact_messages.view', scopeType: 'prodi' },

  { menuKey: 'management', label: 'Pengelolaan', route: '/admin/pengelolaan', icon: 'Cog6ToothIcon', sortOrder: 50, requiredPermission: 'media.view', scopeType: 'prodi' },
  { menuKey: 'management.media', label: 'Media Library', route: '/admin/media', icon: 'PhotoIcon', parentKey: 'management', sortOrder: 51, requiredPermission: 'media.view', scopeType: 'prodi' },
  { menuKey: 'management.users', label: 'Pengguna & Editor', route: '/admin/pengguna', icon: 'UsersIcon', parentKey: 'management', sortOrder: 52, requiredPermission: 'users.view', scopeType: 'prodi' },
  { menuKey: 'management.audit', label: 'Audit Aktivitas', route: '/admin/audit', icon: 'ClipboardDocumentListIcon', parentKey: 'management', sortOrder: 53, requiredPermission: 'audit_logs.view', scopeType: 'prodi' },

  { menuKey: 'super.organization', label: 'Manajemen Organisasi', route: '/admin/organisasi', icon: 'BuildingLibraryIcon', sortOrder: 60, requiredPermission: 'organization.view', scopeType: 'global' },
  { menuKey: 'super.tenants', label: 'Daftar Website', route: '/admin/website-list', icon: 'GlobeAltIcon', sortOrder: 61, requiredPermission: 'tenant.view', scopeType: 'global' },
  { menuKey: 'super.domains', label: 'Domain', route: '/admin/domain', icon: 'LinkIcon', sortOrder: 62, requiredPermission: 'domain.view', scopeType: 'global' },
  { menuKey: 'super.widgets', label: 'Widget Library', route: '/admin/widget', icon: 'Squares2X2Icon', sortOrder: 63, requiredPermission: 'widgets.view', scopeType: 'global' },
  { menuKey: 'super.roles', label: 'Roles & Permissions', route: '/admin/roles', icon: 'ShieldCheckIcon', sortOrder: 64, requiredPermission: 'roles.view', scopeType: 'global' },
  { menuKey: 'super.users', label: 'Pengguna', route: '/admin/users', icon: 'UsersIcon', sortOrder: 65, requiredPermission: 'users.view', scopeType: 'global' },
  { menuKey: 'super.audit', label: 'Audit Logs', route: '/admin/audit-logs', icon: 'ClipboardDocumentListIcon', sortOrder: 66, requiredPermission: 'audit_logs.view', scopeType: 'global' },
  { menuKey: 'super.settings', label: 'System Settings', route: '/admin/system-settings', icon: 'WrenchScrewdriverIcon', sortOrder: 67, requiredPermission: 'system_settings.manage', scopeType: 'global' },
];

/**
 * Baseline role ke permission.
 *
 * Admin Fakultas hanya membaca dan melaporkan sesuai docs/rbac bagian 6.
 * Editor tidak diberi baseline apa pun: haknya berasal dari permission group.
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN_FAKULTAS: [
    'dashboard.view',
    'organization.view',
    'tenant.view',
    'domain.view',
    'website.view',
    'profile.view',
    'vision_mission.view',
    'curriculum.view',
    'documents.view',
    'lecturers.view',
    'facilities.view',
    'posts.view',
    'galleries.view',
    'contacts.view',
    'contact_messages.view',
    'media.view',
    'audit_logs.view',
  ],
  ADMIN_PRODI: [
    'dashboard.view',
    'organization.view',
    'website.view',
    'website.update',
    'navigation.view',
    'navigation.create',
    'navigation.update',
    'navigation.delete',
    'theme.view',
    'theme.update',
    'seo.view',
    'seo.update',
    'pages.view',
    'pages.create',
    'pages.update',
    'pages.delete',
    'pages.publish',
    'builder.view',
    'builder.create',
    'builder.update',
    'builder.delete',
    'builder.publish',
    'builder.rollback',
    'widgets.view',
    'profile.view',
    'profile.update',
    'vision_mission.view',
    'vision_mission.update',
    'curriculum.view',
    'curriculum.create',
    'curriculum.update',
    'curriculum.delete',
    'curriculum.publish',
    'documents.view',
    'documents.create',
    'documents.update',
    'documents.delete',
    'lecturers.view',
    'lecturers.create',
    'lecturers.update',
    'lecturers.delete',
    'facilities.view',
    'facilities.create',
    'facilities.update',
    'facilities.delete',
    'posts.view',
    'posts.create',
    'posts.update',
    'posts.delete',
    'posts.publish',
    'galleries.view',
    'galleries.create',
    'galleries.update',
    'galleries.delete',
    'galleries.publish',
    'contacts.view',
    'contacts.update',
    'contact_messages.view',
    'contact_messages.manage',
    'media.view',
    'media.upload',
    'media.update',
    'media.delete',
    'users.view',
    'users.create',
    'users.update',
    'users.disable',
    'users.assign_role',
    'permission_groups.view',
    'audit_logs.view',
  ],
  EDITOR: [],
};
