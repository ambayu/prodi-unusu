import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderOpenIcon,
  FolderIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Field, FormModal } from '../../components/ui/FormModal';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { mediaApi, organizationApi } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';

/** Format berkas gambar yang diterima untuk gambar kartu program studi. */
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';

/**
 * Program studi yang gambarnya sedang disunting.
 *
 * `null` berarti modal tertutup. Nilai awal diambil dari respons API saat
 * tombol diklik, sehingga perubahan yang batal tidak meninggalkan sisa.
 */
interface ProgramImageTarget {
  id: number;
  code: string;
  name: string;
  logoUrl: string | null;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Manajemen organisasi universitas: Pohon Hirarki Fakultas & Program Studi (Tree Structure).
 */
export const AdminOrganization: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [facultyOpen, setFacultyOpen] = useState(false);
  const [programOpen, setProgramOpen] = useState(false);
  const [collapsedFaculties, setCollapsedFaculties] = useState<Record<number, boolean>>({});

  const [facultyDraft, setFacultyDraft] = useState({ code: '', name: '', slug: '', description: '' });
  const [programDraft, setProgramDraft] = useState({
    facultyId: 0,
    code: '',
    name: '',
    slug: '',
    degree: 'S1',
    description: '',
    logoUrl: null as string | null,
  });

  /**
   * Pengelolaan gambar kartu program studi.
   *
   * Gambar disimpan pada `study_programs.logo_url` dan dipakai beranda fakultas
   * sebagai penutup kartu Program Studi. Tombol "Gambar" di tiap baris prodi
   * membuka modal unggah, sehingga admin tidak perlu membuat prodi baru untuk
   * memasang gambar.
   */
  const [imageTarget, setImageTarget] = useState<ProgramImageTarget | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const facultiesQuery = useQuery({
    queryKey: ['admin', 'faculties'],
    queryFn: () => organizationApi.faculties().then((res) => res.data.faculties),
  });

  const programsQuery = useQuery({
    queryKey: ['admin', 'study-programs'],
    queryFn: () => organizationApi.studyPrograms().then((res) => res.data.studyPrograms),
  });

  const toggleFaculty = (id: number) => {
    setCollapsedFaculties((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => setCollapsedFaculties({});
  const collapseAll = () => {
    const allCollapsed: Record<number, boolean> = {};
    (facultiesQuery.data ?? []).forEach((f) => {
      allCollapsed[f.id] = true;
    });
    setCollapsedFaculties(allCollapsed);
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'faculties'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'study-programs'] });
  };

  const createFaculty = useMutation({
    mutationFn: () =>
      organizationApi.createFaculty({
        code: facultyDraft.code.toUpperCase(),
        name: facultyDraft.name,
        slug: facultyDraft.slug || toSlug(facultyDraft.name),
        description: facultyDraft.description || null,
      }),
    onSuccess: () => {
      toast.success('Fakultas berhasil dibuat.');
      setFacultyOpen(false);
      setFacultyDraft({ code: '', name: '', slug: '', description: '' });
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const createProgram = useMutation({
    mutationFn: () =>
      organizationApi.createStudyProgram({
        facultyId: programDraft.facultyId,
        code: programDraft.code.toUpperCase(),
        name: programDraft.name,
        slug: programDraft.slug || toSlug(programDraft.name),
        degree: programDraft.degree,
        description: programDraft.description || null,
        logoUrl: programDraft.logoUrl,
        status: 'active',
        sortOrder: 0,
      }),
    onSuccess: () => {
      toast.success('Program studi berhasil dibuat beserta tema dan halaman awalnya.');
      setProgramOpen(false);
      setProgramDraft({ facultyId: 0, code: '', name: '', slug: '', degree: 'S1', description: '', logoUrl: null });
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  /** Menyimpan `logoUrl` hasil unggahan ke baris program studi. */
  const saveProgramImage = useMutation({
    mutationFn: () =>
      organizationApi.updateStudyProgram(imageTarget!.id, { logoUrl: imageTarget!.logoUrl }),
    onSuccess: () => {
      toast.success('Gambar program studi berhasil disimpan.');
      setImageTarget(null);
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  /**
   * Mengunggah berkas ke pustaka media lalu menyimpan URL-nya pada draf.
   *
   * Modal tetap terbuka setelah unggah agar admin dapat melihat pratinjau dan
   * menekan "Simpan". Tombol Batal tidak mengubah data karena yang berubah hanya
   * draf lokal.
   */
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Pilih berkas gambar JPG, PNG, atau WebP.');
      return;
    }

    setUploadingImage(true);
    try {
      const res = await mediaApi.upload(file);
      setImageTarget((prev) => (prev ? { ...prev, logoUrl: res.data.asset.url } : prev));
      toast.success('Gambar berhasil diunggah. Tekan Simpan untuk menerapkan.');
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setUploadingImage(false);
    }
  };

  const isLoading = facultiesQuery.isLoading || programsQuery.isLoading;
  const isError = facultiesQuery.isError || programsQuery.isError;
  const faculties = facultiesQuery.data ?? [];
  const programs = programsQuery.data ?? [];

  return (
    <AdminLayout
      title="Struktur Organisasi Akademik"
      description="Struktur pohon (tree view) hubungan Fakultas dan Program Studi di lingkungan Universitas Nahdlatul Ulama Sumatera Utara."
      actions={
        <div className="flex items-center gap-2">
          {has('organization.create') ? (
            <button
              type="button"
              onClick={() => setFacultyOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs"
            >
              <PlusIcon className="h-4 w-4 text-slate-500" />
              <span>Tambah Fakultas</span>
            </button>
          ) : null}
          {has('tenant.create') ? (
            <button
              type="button"
              onClick={() => {
                setProgramDraft({
                  facultyId: faculties[0]?.id ?? 0,
                  code: '',
                  name: '',
                  slug: '',
                  degree: 'S1',
                  description: '',
                  logoUrl: null,
                });
                setProgramOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white text-xs font-bold transition-all shadow-2xs"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Tambah Program Studi</span>
            </button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Ringkasan Statistik Kartu */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1e3a8a]">
                <BuildingLibraryIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Fakultas</p>
                <p className="text-2xl font-black text-slate-900">{faculties.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <AcademicCapIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Program Studi</p>
                <p className="text-2xl font-black text-slate-900">{programs.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <GlobeAltIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Domain Terhubung</p>
                <p className="text-2xl font-black text-slate-900">
                  {programs.reduce((acc, p) => acc + (p.domains?.length || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pohon Hirarki Organisasi (Tree View) */}
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pohon Akademik Universitas</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Struktur dekanat, fakultas, dan program studi yang aktif di sistem.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                Buka Semua
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                Tutup Semua
              </button>
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <LoadingState label="Memuat bagan struktur organisasi" rows={4} />
            ) : isError ? (
              <ErrorState
                message={toApiError(facultiesQuery.error || programsQuery.error).message}
                onRetry={invalidate}
              />
            ) : faculties.length === 0 ? (
              <EmptyState
                title="Belum ada data fakultas"
                description="Tambahkan fakultas pertama untuk mulai menyusun organisasi."
              />
            ) : (
              <div className="space-y-4">
                {/* Node Akar: Rektorat UNUSU */}
                <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-3.5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <BuildingLibraryIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-wide text-slate-900 uppercase">
                      Universitas Nahdlatul Ulama Sumatera Utara
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Pusat Manajemen Akademik & Tridharma Perguruan Tinggi
                    </p>
                  </div>
                </div>

                {/* Cabang Hirarki: Fakultas & Prodi */}
                <div className="relative pl-6 sm:pl-8 space-y-3 before:absolute before:left-3 sm:before:left-4 before:top-0 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {faculties.map((faculty) => {
                    const isCollapsed = !!collapsedFaculties[faculty.id];
                    const facultyPrograms = programs.filter((p) => p.faculty?.id === faculty.id);

                    return (
                      <div key={faculty.id} className="relative group">
                        {/* Garis Horizontal ke Node Fakultas */}
                        <div className="absolute -left-3 sm:-left-4 top-5 w-3 sm:w-4 h-0.5 bg-slate-200" />

                        {/* Node Card Fakultas */}
                        <div
                          className={`rounded-xl border transition-all duration-150 ${
                            isCollapsed
                              ? 'border-slate-200 bg-white hover:border-slate-300'
                              : 'border-blue-200 bg-[#F8FAFC] shadow-2xs'
                          }`}
                        >
                          <div
                            onClick={() => toggleFaculty(faculty.id)}
                            className="flex items-center justify-between p-3.5 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                className="h-7 w-7 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 hover:bg-slate-50"
                              >
                                {isCollapsed ? (
                                  <ChevronRightIcon className="h-4 w-4" />
                                ) : (
                                  <ChevronDownIcon className="h-4 w-4" />
                                )}
                              </button>

                              <div className="h-8 w-8 rounded-lg bg-[#166534] text-white flex items-center justify-center shrink-0">
                                {isCollapsed ? (
                                  <FolderIcon className="h-4 w-4" />
                                ) : (
                                  <FolderOpenIcon className="h-4 w-4" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-900 truncate">
                                    {faculty.name}
                                  </span>
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    {faculty.code}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {facultyPrograms.length} Program Studi di bawah naungan
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {has('tenant.create') ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProgramDraft({
                                      facultyId: faculty.id,
                                      code: '',
                                      name: '',
                                      slug: '',
                                      degree: 'S1',
                                      description: '',
                                      logoUrl: null,
                                    });
                                    setProgramOpen(true);
                                  }}
                                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                >
                                  <PlusIcon className="h-3.5 w-3.5" />
                                  <span>Prodi</span>
                                </button>
                              ) : null}
                            </div>
                          </div>

                          {/* Anak Cabang: Daftar Program Studi */}
                          {!isCollapsed && (
                            <div className="border-t border-slate-100 px-4 py-3 bg-white rounded-b-xl">
                              {facultyPrograms.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-2 pl-4">
                                  Belum ada program studi di fakultas ini.
                                </p>
                              ) : (
                                <div className="relative pl-6 space-y-2.5 before:absolute before:left-2 before:top-2 before:bottom-3 before:w-0.5 before:bg-slate-100">
                                  {facultyPrograms.map((program) => (
                                    <div
                                      key={program.id}
                                      className="relative flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all gap-2"
                                    >
                                      {/* Garis Horizontal ke Item Prodi */}
                                      <div className="absolute -left-4 top-1/2 -mt-px w-4 h-0.5 bg-slate-200" />

                                      <div className="flex items-center gap-2.5 min-w-0">
                                        {program.logoUrl ? (
                                          <img
                                            src={program.logoUrl}
                                            alt={`Gambar ${program.name}`}
                                            className="h-9 w-12 rounded-md border border-slate-200 object-cover shrink-0"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="h-9 w-12 rounded-md bg-blue-100 text-[#1e3a8a] flex items-center justify-center shrink-0">
                                            <AcademicCapIcon className="h-4 w-4" />
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-bold text-slate-800">
                                              {program.name}
                                            </span>
                                            <span className="font-mono text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                                              {program.code}
                                            </span>
                                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-blue-50 text-[#1e3a8a] border border-blue-200">
                                              {program.degree}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                            <span className="flex items-center gap-1">
                                              <GlobeAltIcon className="h-3 w-3 text-slate-400" />
                                              {program.domains.length === 0 ? (
                                                <span className="text-amber-700 italic">Belum ada domain</span>
                                              ) : (
                                                <span className="font-mono text-blue-700 font-medium">
                                                  {program.domains.map((d) => d.hostname).join(', ')}
                                                </span>
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 self-end sm:self-center">
                                        {has('tenant.update') ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setImageTarget({
                                                id: program.id,
                                                code: program.code,
                                                name: program.name,
                                                logoUrl: program.logoUrl,
                                              })
                                            }
                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                                            title="Impor gambar kartu program studi"
                                          >
                                            <PhotoIcon className="h-3.5 w-3.5 text-slate-500" />
                                            <span>Gambar</span>
                                          </button>
                                        ) : null}
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                            program.status === 'active'
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                              : 'bg-slate-100 text-slate-600'
                                          }`}
                                        >
                                          {program.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal Tambah Fakultas */}
      <FormModal
        open={facultyOpen}
        title="Tambah Fakultas Baru"
        busy={createFaculty.isPending}
        onClose={() => setFacultyOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          createFaculty.mutate();
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Kode Fakultas" htmlFor="faculty-code" required hint="Contoh: FIK, FAI">
            <input
              id="faculty-code"
              className="field-input font-mono uppercase"
              required
              value={facultyDraft.code}
              onChange={(event) => setFacultyDraft({ ...facultyDraft, code: event.target.value })}
            />
          </Field>
          <Field label="Nama Fakultas" htmlFor="faculty-name" required>
            <input
              id="faculty-name"
              className="field-input"
              required
              value={facultyDraft.name}
              onChange={(event) =>
                setFacultyDraft({
                  ...facultyDraft,
                  name: event.target.value,
                  slug: toSlug(event.target.value),
                })
              }
            />
          </Field>
        </div>
        <Field label="Deskripsi" htmlFor="faculty-description">
          <textarea
            id="faculty-description"
            className="field-textarea"
            rows={3}
            value={facultyDraft.description}
            onChange={(event) => setFacultyDraft({ ...facultyDraft, description: event.target.value })}
          />
        </Field>
      </FormModal>

      {/* Modal Tambah Program Studi */}
      <FormModal
        open={programOpen}
        title="Tambah Program Studi Baru"
        description="Tema, 10 menu standar, dan halaman beranda akan dibuat otomatis oleh sistem."
        busy={createProgram.isPending}
        onClose={() => setProgramOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          createProgram.mutate();
        }}
      >
        <Field label="Fakultas Induk" htmlFor="program-faculty" required>
          <SearchableSelect
            id="program-faculty"
            value={programDraft.facultyId ? String(programDraft.facultyId) : ''}
            onChange={(val) => {
              const id = Number(val);
              if (!Number.isNaN(id)) setProgramDraft({ ...programDraft, facultyId: id });
            }}
            clearable={false}
            placeholder="Pilih fakultas..."
            searchPlaceholder="Cari fakultas..."
            options={faculties.map((faculty) => ({
              value: String(faculty.id),
              label: faculty.name,
              meta: faculty.code,
              keywords: `${faculty.name} ${faculty.code}`,
            }))}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Kode Prodi" htmlFor="program-code" required hint="Contoh: TIF, SI">
            <input
              id="program-code"
              className="field-input font-mono uppercase"
              required
              value={programDraft.code}
              onChange={(event) => setProgramDraft({ ...programDraft, code: event.target.value })}
            />
          </Field>
          <Field label="Jenjang" htmlFor="program-degree" required>
            <SearchableSelect
              id="program-degree"
              value={programDraft.degree}
              onChange={(val) => setProgramDraft({ ...programDraft, degree: val || 'S1' })}
              clearable={false}
              searchable={false}
              options={[
                { value: 'S1', label: 'S1' },
                { value: 'S2', label: 'S2' },
                { value: 'S3', label: 'S3' },
                { value: 'D3', label: 'D3' },
                { value: 'D4', label: 'D4' },
              ]}
            />
          </Field>
          <Field label="Slug URL" htmlFor="program-slug" required>
            <input
              id="program-slug"
              className="field-input font-mono"
              required
              value={programDraft.slug}
              onChange={(event) => setProgramDraft({ ...programDraft, slug: toSlug(event.target.value) })}
            />
          </Field>
        </div>

        <Field label="Nama Program Studi" htmlFor="program-name" required>
          <input
            id="program-name"
            className="field-input"
            required
            value={programDraft.name}
            onChange={(event) =>
              setProgramDraft({
                ...programDraft,
                name: event.target.value,
                slug: toSlug(event.target.value),
              })
            }
          />
        </Field>

        <Field label="Deskripsi Singkat" htmlFor="program-description">
          <textarea
            id="program-description"
            className="field-textarea"
            rows={3}
            value={programDraft.description}
            onChange={(event) => setProgramDraft({ ...programDraft, description: event.target.value })}
          />
        </Field>

        <Field
          label="Gambar kartu prodi"
          htmlFor="program-image"
          hint="Tampil sebagai gambar di atas kartu Program Studi pada beranda fakultas. Boleh dikosongkan dan diisi belakangan."
        >
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
              {programDraft.logoUrl ? (
                <img
                  src={programDraft.logoUrl}
                  alt="Gambar prodi"
                  className="h-full w-full object-cover"
                />
              ) : (
                <PhotoIcon className="h-7 w-7 text-slate-300" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                <ArrowUpTrayIcon className="h-4 w-4 text-slate-500" />
                <span>{uploadingImage ? 'Mengunggah...' : 'Pilih Berkas Gambar'}</span>
                <input
                  id="program-image"
                  type="file"
                  accept={IMAGE_ACCEPT}
                  disabled={uploadingImage}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setUploadingImage(true);
                    void mediaApi
                      .upload(file)
                      .then((res) => {
                        setProgramDraft({ ...programDraft, logoUrl: res.data.asset.url });
                        toast.success('Gambar berhasil diunggah.');
                      })
                      .catch((error) => toast.error(toApiError(error).message))
                      .finally(() => setUploadingImage(false));
                    event.target.value = '';
                  }}
                />
              </label>
              <p className="truncate font-mono text-[10px] text-slate-400">
                {programDraft.logoUrl || 'Belum ada gambar'}
              </p>
            </div>
          </div>
        </Field>
      </FormModal>

      {/* Modal Impor Gambar Program Studi */}
      <FormModal
        open={imageTarget !== null}
        title="Gambar Kartu Program Studi"
        description={
          imageTarget
            ? `Unggah gambar untuk ${imageTarget.name} (${imageTarget.code}). Gambar tampil di atas kartu Program Studi pada beranda fakultas.`
            : ''
        }
        busy={saveProgramImage.isPending || uploadingImage}
        onClose={() => setImageTarget(null)}
        onSubmit={(event) => {
          event.preventDefault();
          saveProgramImage.mutate();
        }}
      >
        <Field label="Berkas gambar" htmlFor="program-image-edit" hint="Format JPG, PNG, atau WebP. Rasio lanskap (mis. 16:9) paling sesuai.">
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="relative flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
              {imageTarget?.logoUrl ? (
                <>
                  <img
                    src={imageTarget.logoUrl}
                    alt="Gambar prodi"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageTarget((prev) => (prev ? { ...prev, logoUrl: null } : prev))}
                    className="absolute right-1 top-1 rounded-full bg-rose-600 p-0.5 text-white shadow-xs hover:bg-rose-700"
                    title="Hapus gambar"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <PhotoIcon className="h-8 w-8 text-slate-300" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                <ArrowUpTrayIcon className="h-4 w-4 text-slate-500" />
                <span>{uploadingImage ? 'Mengunggah...' : 'Pilih Berkas Gambar'}</span>
                <input
                  id="program-image-edit"
                  type="file"
                  accept={IMAGE_ACCEPT}
                  disabled={uploadingImage}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleImageUpload(file);
                    event.target.value = '';
                  }}
                />
              </label>
              <p className="truncate font-mono text-[10px] text-slate-400">
                {imageTarget?.logoUrl || 'Belum ada gambar — kartu memakai huruf kode prodi'}
              </p>
            </div>
          </div>
        </Field>
      </FormModal>
    </AdminLayout>
  );
};

export default AdminOrganization;
