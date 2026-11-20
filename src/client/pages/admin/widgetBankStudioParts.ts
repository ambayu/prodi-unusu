import type React from 'react';
import {
  Bars3BottomLeftIcon,
  ChartBarIcon,
  LinkIcon,
  ListBulletIcon,
  PhotoIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline';
import {
  columnCountForLayout,
  type CustomBlock,
  type CustomLayoutTemplateConfig,
  type CustomRow,
  type CustomRowBackground,
  type CustomRowLayout,
  type EmbeddableWidgetCode,
} from '../../../shared/schemas/builder';

// ---------------------------------------------------------
// Konstanta tampilan
// ---------------------------------------------------------

export const ROW_LAYOUTS: Array<{ value: CustomRowLayout; label: string }> = [
  { value: '1-col', label: '1 kolom' },
  { value: '2-col', label: '2 kolom' },
  { value: '2-col-left', label: '2 kolom · kiri lebar' },
  { value: '2-col-right', label: '2 kolom · kanan lebar' },
  { value: '3-col', label: '3 kolom' },
];

export const BACKGROUNDS: Array<{ value: CustomRowBackground; label: string; swatch: string }> = [
  { value: 'white', label: 'Putih', swatch: 'bg-white border-slate-300' },
  { value: 'soft', label: 'Abu lembut', swatch: 'bg-slate-100 border-slate-300' },
  { value: 'tinted', label: 'Bernuansa tema', swatch: 'bg-blue-50 border-blue-300' },
];

export const BLOCK_TYPES: Array<{
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

export const BLOCK_LABEL: Record<CustomBlock['type'], string> = {
  text: 'Teks',
  image: 'Gambar',
  button: 'Tombol',
  list: 'Daftar Poin',
  stat: 'Angka Sorotan',
  youtube: 'Video YouTube',
  widget: 'Modul Prodi',
};

export const EMBEDDABLE_WIDGET_META: Record<EmbeddableWidgetCode, { label: string; hint: string }> = {
  hero_slider: { label: 'Hero Slider (Banner Beranda)', hint: 'Slide banner utama beranda' },
  about_prodi: { label: 'Profil Program Studi', hint: 'Otomatis dari menu Profil Prodi' },
  vision_mission: { label: 'Visi & Misi Program Studi', hint: 'Otomatis dari menu Visi & Misi' },
  curriculum_overview: { label: 'Struktur Kurikulum', hint: 'Otomatis dari menu Kurikulum' },
  lecturer_list: { label: 'Daftar Dosen & Pengajar', hint: 'Otomatis dari menu Dosen' },
  latest_news: { label: 'Berita Terbaru', hint: 'Otomatis dari menu Berita' },
  gallery_grid: { label: 'Galeri Kegiatan', hint: 'Otomatis dari menu Galeri' },
  facility_grid: { label: 'Sarana & Prasarana', hint: 'Otomatis dari menu Sarana' },
  document_list: { label: 'Dokumen & Unduhan', hint: 'Otomatis dari menu Dokumen' },
  statistics: { label: 'Statistik Program Studi', hint: 'Baris angka statistik' },
  cta_banner: { label: 'Banner Ajakan (CTA)', hint: 'Banner ajakan pendaftaran' },
  contact_information: { label: 'Informasi Kontak', hint: 'Alamat, telepon & email prodi' },
};

export function getBlockDisplayName(block: CustomBlock): string {
  if (block.type === 'widget') {
    return EMBEDDABLE_WIDGET_META[block.widgetCode]?.label ?? block.widgetCode;
  }
  return BLOCK_LABEL[block.type];
}

export const LABEL_BACKGROUND: Record<CustomRowBackground, string> = {
  white: 'Putih',
  soft: 'Abu lembut',
  tinted: 'Bernuansa tema',
};

export const LABEL_LAYOUT: Record<CustomRowLayout, string> = {
  '1-col': '1 kolom',
  '2-col': '2 kolom',
  '2-col-left': '2 kolom · kiri lebar',
  '2-col-right': '2 kolom · kanan lebar',
  '3-col': '3 kolom',
};

/** Pratinjau kerangka kolom tanpa teks, dipakai pada kartu galeri. */
export const WIREFRAME_COLUMNS: Record<CustomRowLayout, number[]> = {
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
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function createBlock(type: CustomBlock['type'], widgetCode: EmbeddableWidgetCode = 'about_prodi'): CustomBlock {
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
    case 'widget':
      return { id, type, widgetCode, config: {} };
  }
}

export function createRow(layout: CustomRowLayout = '2-col'): CustomRow {
  const count = columnCountForLayout(layout);
  return {
    id: newId('row'),
    layout,
    background: 'white',
    columns: Array.from({ length: count }, () => []),
  };
}

/** Menyesuaikan jumlah kolom saat tata letak baris diganti tanpa membuang isi. */
export function resizeColumns(row: CustomRow, layout: CustomRowLayout): CustomRow {
  const count = columnCountForLayout(layout);
  const columns = Array.from({ length: count }, (_, index) => row.columns[index] ?? []);
  return { ...row, layout, columns };
}

// ---------------------------------------------------------
// Contoh siap pakai untuk pengguna awam
// ---------------------------------------------------------

export const STARTER_ROW_ID = 'starter-row';

export function createStarterPresets(): Array<{ key: string; name: string; description: string; config: CustomLayoutTemplateConfig }> {
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

