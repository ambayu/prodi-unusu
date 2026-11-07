import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from '@heroicons/react/24/outline';
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
 * Manajemen organisasi: fakultas dan program studi.
 *
 * Hanya untuk Super Admin. Menambah program studi baru langsung menyiapkan
 * tema, menu standar, dan halaman beranda sehingga tidak perlu aplikasi baru.
 */
export const AdminOrganization: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [facultyOpen, setFacultyOpen] = useState(false);
  const [programOpen, setProgramOpen] = useState(false);
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
      toast.success('Program studi berhasil dibuat beserta menu dan halaman awalnya.');
      setProgramOpen(false);
      setProgramDraft({ facultyId: 0, code: '', name: '', slug: '', degree: 'S1', description: '' });
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  return (
    <AdminLayout
      title="Manajemen Organisasi"
      description="Fakultas adalah data induk. Program studi adalah tenant yang memiliki website sendiri."
      actions={
        <>
          {has('organization.create') ? (
            <button type="button" onClick={() => setFacultyOpen(true)} className="btn-secondary">
              <PlusIcon className="h-4 w-4" />
              Fakultas
            </button>
          ) : null}
          {has('tenant.create') ? (
            <button
              type="button"
              onClick={() => {
                setProgramDraft({
                  facultyId: facultiesQuery.data?.[0]?.id ?? 0,
                  code: '',
                  name: '',
                  slug: '',
                  degree: 'S1',
                  description: '',
                });
                setProgramOpen(true);
              }}
              className="btn-primary"
            >
              <PlusIcon className="h-4 w-4" />
              Program Studi
            </button>
          ) : null}
        </>
      }
    >
      <section className="card">
        <h2 className="text-sm font-bold text-slate-900">Fakultas</h2>
        {facultiesQuery.isLoading ? (
          <div className="mt-4">
            <LoadingState label="Memuat fakultas" rows={2} />
          </div>
        ) : facultiesQuery.isError ? (
          <div className="mt-4">
            <ErrorState
              message={toApiError(facultiesQuery.error).message}
              onRetry={() => void facultiesQuery.refetch()}
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {(facultiesQuery.data ?? []).map((faculty) => (
              <li key={faculty.id} className="flex items-center justify-between py-2.5">
                <span>
                  <span className="text-xs font-bold text-slate-900">{faculty.name}</span>
                  <span className="ml-2 font-mono text-[10px] text-slate-400">{faculty.code}</span>
                </span>
                <span className="text-[11px] text-slate-500">{faculty._count.studyPrograms} program studi</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="text-sm font-bold text-slate-900">Program Studi</h2>
        {programsQuery.isLoading ? (
          <div className="mt-4">
            <LoadingState label="Memuat program studi" />
          </div>
        ) : programsQuery.isError ? (
          <div className="mt-4">
            <ErrorState
              message={toApiError(programsQuery.error).message}
              onRetry={() => void programsQuery.refetch()}
            />
          </div>
        ) : (programsQuery.data ?? []).length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Belum ada program studi" description="Tambahkan program studi untuk memulai." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Program Studi</th>
                  <th>Fakultas</th>
                  <th>Jenjang</th>
                  <th>Domain</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(programsQuery.data ?? []).map((program) => (
                  <tr key={program.id}>
                    <td>
                      <span className="block font-bold text-slate-900">{program.name}</span>
                      <span className="font-mono text-[10px] text-slate-500">{program.code}</span>
                    </td>
                    <td>{program.faculty.name}</td>
                    <td>{program.degree}</td>
                    <td>
                      {program.domains.length === 0 ? (
                        <span className="text-[11px] italic text-amber-700">Belum ada domain</span>
                      ) : (
                        <div className="space-y-0.5">
                          {program.domains.map((domain) => (
                            <span key={domain.id} className="block font-mono text-[11px] text-[#1e3a8a]">
                              {domain.hostname}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          program.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {program.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <FormModal
        open={facultyOpen}
        title="Fakultas Baru"
        busy={createFaculty.isPending}
        onClose={() => setFacultyOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          createFaculty.mutate();
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Kode" htmlFor="faculty-code" required hint="Contoh FIK">
            <input
              id="faculty-code"
              className="field-input font-mono uppercase"
              required
              value={facultyDraft.code}
              onChange={(event) => setFacultyDraft({ ...facultyDraft, code: event.target.value })}
            />
          </Field>
          <Field label="Nama fakultas" htmlFor="faculty-name" required>
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
            value={facultyDraft.description}
            onChange={(event) => setFacultyDraft({ ...facultyDraft, description: event.target.value })}
          />
        </Field>
      </FormModal>

      <FormModal
        open={programOpen}
        title="Program Studi Baru"
        description="Tema, 10 menu standar, dan halaman beranda akan dibuat otomatis."
        busy={createProgram.isPending}
        onClose={() => setProgramOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          createProgram.mutate();
        }}
      >
        <Field label="Fakultas" htmlFor="program-faculty" required>
          <select
            id="program-faculty"
            className="field-input"
            required
            value={programDraft.facultyId}
            onChange={(event) => setProgramDraft({ ...programDraft, facultyId: Number(event.target.value) })}
          >
            {(facultiesQuery.data ?? []).map((faculty) => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Kode" htmlFor="program-code" required>
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
          <Field label="Slug" htmlFor="program-slug" required>
            <input
              id="program-slug"
              className="field-input font-mono"
              required
              value={programDraft.slug}
              onChange={(event) => setProgramDraft({ ...programDraft, slug: toSlug(event.target.value) })}
            />
          </Field>
        </div>

        <Field label="Nama program studi" htmlFor="program-name" required>
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

        <Field label="Deskripsi" htmlFor="program-description">
          <textarea
            id="program-description"
            className="field-textarea"
            value={programDraft.description}
            onChange={(event) => setProgramDraft({ ...programDraft, description: event.target.value })}
          />
        </Field>

        <p className="rounded-xl bg-slate-50 px-4 py-3 text-[11px] leading-relaxed text-slate-600">
          Setelah dibuat, daftarkan domain melalui menu Domain. Tanpa domain, website prodi belum dapat dibuka.
        </p>
      </FormModal>
    </AdminLayout>
  );
};

export default AdminOrganization;
