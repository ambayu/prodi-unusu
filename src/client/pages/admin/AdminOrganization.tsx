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
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { organizationApi } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';

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
  });

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
        status: 'active',
        sortOrder: 0,
      }),
    onSuccess: () => {
      toast.success('Program studi berhasil dibuat beserta tema dan halaman awalnya.');
      setProgramOpen(false);
      setProgramDraft({ facultyId: 0, code: '', name: '', slug: '', degree: 'S1', description: '' });
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

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
                                        <div className="h-7 w-7 rounded-md bg-blue-100 text-[#1e3a8a] flex items-center justify-center shrink-0">
                                          <AcademicCapIcon className="h-4 w-4" />
                                        </div>
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
          <select
            id="program-faculty"
            className="field-input"
            required
            value={programDraft.facultyId}
            onChange={(event) => setProgramDraft({ ...programDraft, facultyId: Number(event.target.value) })}
          >
            {faculties.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name} ({faculty.code})
              </option>
            ))}
          </select>
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
            <select
              id="program-degree"
              className="field-input"
              value={programDraft.degree}
              onChange={(event) => setProgramDraft({ ...programDraft, degree: event.target.value })}
            >
              <option value="S1">S1</option>
              <option value="S2">S2</option>
              <option value="S3">S3</option>
              <option value="D3">D3</option>
              <option value="D4">D4</option>
            </select>
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
      </FormModal>
    </AdminLayout>
  );
};

export default AdminOrganization;
