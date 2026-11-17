import React, { useState } from 'react';
import {
  AcademicCapIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  EyeIcon,
  InformationCircleIcon,
  MegaphoneIcon,
  NewspaperIcon,
  PhoneIcon,
  PhotoIcon,
  PlusIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import type { WidgetDefinition } from '../../services/adminApi';

interface WidgetLibraryProps {
  widgets: WidgetDefinition[];
  /** Nama tampilan widget (label sidebar bila ada). */
  namaTampil: (widget: WidgetDefinition) => string;
  /** Null bila pengguna tidak boleh menambah seksi. */
  onPilih: ((widget: WidgetDefinition) => void) | null;
}

/** Ikon per kode widget; widget baru memakai Squares2X2Icon. */
const IKON_WIDGET: Record<string, React.ElementType> = {
  hero_slider: PhotoIcon,
  about_prodi: InformationCircleIcon,
  vision_mission: EyeIcon,
  statistics: ChartBarIcon,
  latest_news: NewspaperIcon,
  gallery_grid: PhotoIcon,
  lecturer_list: UserGroupIcon,
  facility_grid: BuildingOffice2Icon,
  document_list: DocumentTextIcon,
  curriculum_overview: AcademicCapIcon,
  cta_banner: MegaphoneIcon,
  contact_information: PhoneIcon,
};

/** Label Indonesia untuk kategori widget; kategori tak dikenal tampil apa adanya. */
const LABEL_KATEGORI: Record<string, string> = {
  'Hero & Header': 'Banner & Header',
  'Profile & Information': 'Profil & Informasi',
  Statistics: 'Statistik',
  Academic: 'Akademik',
  Publication: 'Publikasi',
  Facilities: 'Fasilitas',
  Supporting: 'Pendukung',
};

/** Pustaka widget: daftar semua widget yang tersedia, dikelompokkan per kategori. */
export const WidgetLibrary: React.FC<WidgetLibraryProps> = ({ widgets, namaTampil, onPilih }) => {
  const [terbuka, setTerbuka] = useState(false);

  const perKategori = widgets.reduce<Record<string, WidgetDefinition[]>>((hasil, widget) => {
    (hasil[widget.category] ??= []).push(widget);
    return hasil;
  }, {});

  return (
    <div className="rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs">
      <button
        type="button"
        onClick={() => setTerbuka((nilai) => !nilai)}
        aria-expanded={terbuka}
        className="flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left"
      >
        <span>
          <span className="block text-sm font-bold text-slate-900">Pustaka Widget</span>
          <span className="block text-[11px] text-slate-500">{widgets.length} widget tersedia untuk halaman ini</span>
        </span>
        {terbuka ? <ChevronDownIcon className="h-4 w-4 text-slate-500" /> : <ChevronRightIcon className="h-4 w-4 text-slate-500" />}
      </button>

      {terbuka ? (
        <div className="space-y-4 border-t border-[#CBD5E1]/70 px-5 py-4">
          {widgets.length === 0 ? <p className="text-xs text-slate-500">Belum ada widget terdaftar.</p> : null}
          {Object.entries(perKategori).map(([kategori, daftar]) => (
            <div key={kategori}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{LABEL_KATEGORI[kategori] ?? kategori}</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {daftar.map((widget) => {
                  const Ikon = IKON_WIDGET[widget.code] ?? Squares2X2Icon;
                  return (
                  <li key={widget.code} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
                    <Ikon className="mt-0.5 h-5 w-5 shrink-0 text-[#1e3a8a]" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900">{namaTampil(widget)}</p>
                      {widget.description ? <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{widget.description}</p> : null}
                    </div>
                    {onPilih ? (
                      <button
                        type="button"
                        onClick={() => onPilih(widget)}
                        aria-label={`Tambah widget ${namaTampil(widget)}`}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-[#1e3a8a]/10 px-2 text-[11px] font-bold text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
                      >
                        <PlusIcon className="h-3 w-3" />
                        Tambah
                      </button>
                    ) : null}
                  </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
