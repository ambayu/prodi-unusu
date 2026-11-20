import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

export interface WidgetTemplateOption {
  id: number;
  name: string;
  description: string | null;
  usageCount: number;
}

interface WidgetLibraryProps {
  widgets: WidgetDefinition[];
  /** Nama tampilan widget (label sidebar bila ada). */
  namaTampil: (widget: WidgetDefinition) => string;
  /** Null bila pengguna tidak boleh menambah seksi. */
  onPilih: ((widget: WidgetDefinition) => void) | null;
  /** Widget dari Bank Widget; hanya tampil bila pengguna punya akses builder. */
  bankTemplates?: WidgetTemplateOption[];
  /** Menambahkan template Bank Widget ke halaman. */
  onPilihBank?: ((template: WidgetTemplateOption) => void) | null;
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
export const WidgetLibrary: React.FC<WidgetLibraryProps> = ({
  widgets,
  namaTampil,
  onPilih,
  bankTemplates = [],
  onPilihBank = null,
}) => {
  const [terbuka, setTerbuka] = useState(false);

  const builtInWidgets = widgets.filter((w) => w.code !== 'custom_layout');
  const perKategori = builtInWidgets.reduce<Record<string, WidgetDefinition[]>>((hasil, widget) => {
    (hasil[widget.category] ??= []).push(widget);
    return hasil;
  }, {});

  return (
    <div className="overflow-hidden rounded-[15px] border border-[#CBD5E1] bg-white shadow-[0_2px_10px_-4px_rgba(15,23,42,0.06)]">
      <button
        type="button"
        onClick={() => setTerbuka((nilai) => !nilai)}
        aria-expanded={terbuka}
        className="relative flex w-full items-center justify-between gap-2 overflow-hidden bg-slate-50/60 px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none bg-cover bg-right opacity-45"
          style={{ backgroundImage: "url('/assets/admin-header-texture.png')" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-transparent"
        />
        <span className="relative">
          <span className="block text-sm font-bold tracking-tight text-slate-900">
            Bank Widget &amp; Pustaka Modul
          </span>
          <span className="block text-[11px] text-slate-500">
            {bankTemplates.length} widget di Bank Widget · {builtInWidgets.length} modul bawaan
          </span>
        </span>
        {terbuka ? (
          <ChevronDownIcon className="relative h-4 w-4 text-slate-500" />
        ) : (
          <ChevronRightIcon className="relative h-4 w-4 text-slate-500" />
        )}
      </button>

      {terbuka ? (
        <div className="space-y-4 border-t border-slate-200/80 px-5 py-4">
          {onPilihBank ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#1e3a8a]">
                  Bank Widget Prodi (Utama)
                </p>
                <Link
                  to="/admin/widget-bank"
                  className="text-[11px] font-bold text-[#1e3a8a] underline hover:text-[#172f6e]"
                >
                  Kelola / Buat di Bank Widget &rarr;
                </Link>
              </div>
              {bankTemplates.length === 0 ? (
                <p className="rounded-[10px] border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">
                  Belum ada widget di Bank Widget. Pindahkan widget halaman ke Bank Widget atau buat widget baru agar bebas dimodifikasi.
                </p>
              ) : (
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {bankTemplates.map((template) => (
                    <li
                      key={template.id}
                      className="flex items-start justify-between gap-3 rounded-[12px] border border-blue-200/80 bg-blue-50/40 px-3.5 py-3 transition-all hover:border-[#1e3a8a]/40 hover:shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900">{template.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">
                          {template.description || 'Widget bebas dari Bank Widget.'}
                        </p>
                        <Link
                          to={`/admin/widget-bank/${template.id}/edit`}
                          className="mt-1 inline-block text-[10px] font-bold text-[#1e3a8a] hover:underline"
                        >
                          Edit di Bank Widget &rarr;
                        </Link>
                      </div>
                      <button
                        type="button"
                        onClick={() => onPilihBank(template)}
                        aria-label={`Tambah widget ${template.name}`}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[8px] bg-[#1e3a8a] px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-[#172f6e]"
                      >
                        <PlusIcon className="h-3 w-3" />
                        Pakai
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {builtInWidgets.length > 0 ? (
            <details className="rounded-[12px] border border-slate-200 bg-slate-50/60 px-3.5 py-2.5">
              <summary className="cursor-pointer select-none text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700">
                Modul Bawaan Langsung ({builtInWidgets.length}) — Disarankan lewat Bank Widget
              </summary>
              <div className="mt-3 space-y-3">
                {Object.entries(perKategori).map(([kategori, daftar]) => (
                  <div key={kategori}>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {LABEL_KATEGORI[kategori] ?? kategori}
                    </p>
                    <ul className="grid gap-2.5 sm:grid-cols-2">
                      {daftar.map((widget) => {
                        const Ikon = IKON_WIDGET[widget.code] ?? Squares2X2Icon;
                        return (
                          <li
                            key={widget.code}
                            className="group relative flex items-start justify-between gap-3 overflow-hidden rounded-[12px] border border-slate-200/90 bg-white px-3.5 py-3 transition-all hover:border-[#1e3a8a]/35 hover:shadow-xs"
                          >
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 select-none bg-cover bg-right-bottom opacity-40 transition-opacity group-hover:opacity-70"
                              style={{ backgroundImage: "url('/assets/admin-card-texture.png')" }}
                            />
                            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-blue-50 text-[#1e3a8a] ring-1 ring-inset ring-blue-100">
                              <Ikon className="h-[18px] w-[18px]" aria-hidden="true" />
                            </div>
                            <div className="relative min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900">{namaTampil(widget)}</p>
                              {widget.description ? (
                                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{widget.description}</p>
                              ) : null}
                            </div>
                            {onPilih ? (
                              <button
                                type="button"
                                onClick={() => onPilih(widget)}
                                aria-label={`Tambah widget ${namaTampil(widget)}`}
                                className="relative inline-flex h-8 shrink-0 items-center gap-1 rounded-[8px] border border-blue-200/80 bg-blue-50/80 px-2.5 text-[11px] font-bold text-[#1e3a8a] transition-colors hover:border-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
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
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
