import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormModal, Field } from '../../components/ui/FormModal';
import { DeleteRowButton, EditRowButton, RowActions } from '../../components/ui/RowActions';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import {
  courseMasterApi,
  curriculumApi,
  curriculumItemApi,
  curriculumRpsApi,
  academicSemesterApi,
  lecturerApi,
  RPS_MAX_BYTES,
  type CourseMaster,
  type Curriculum,
  type CurriculumItem,
  type LecturerAssignment,
} from '../../services/contentApi';
import { firstFieldError, toApiError } from '../../services/api';

const ALL = '__all__';

/** Baris dosen dari API Hub; bentuknya lebih longgar daripada `Lecturer` lokal. */
interface DosenOption {
  id: number | string;
  name: string;
  nidn?: string | null;
}

interface Draft {
  courseId: string;
  curriculumId: string;
  academicSemesterId: string;
  credits: string;
  description: string;
  lecturersData: LecturerAssignment[];
}

const emptyDraft = (curriculumId: string): Draft => ({
  courseId: '',
  curriculumId,
  academicSemesterId: '',
  credits: '2',
  description: '',
  lecturersData: [],
});

/**
 * Penawaran mata kuliah pada kurikulum (`/admin/kurikulum`).
 *
 * Tabel ini menautkan **master mata kuliah** (`courses`, dikelola di menu Mata
 * Kuliah) dengan detail penawaran: semester, bobot SKS, keterangan, dosen
 * pengampu, dan RPS. Kolom "id matakuliah" diwakili oleh pilihan `courseId`
 * pada formulir — satu master boleh ditawarkan di beberapa kurikulum dengan
 * SKS dan pengampu berbeda (ADR-006).
 *
 * Kode dan nama mata kuliah **tidak** diketik di sini; keduanya mengikuti
 * master sehingga tidak mungkin berbeda antarkurikulum.
 */
export const AdminCurriculum: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [search, setSearch] = useState('');
  const [curriculumFilter, setCurriculumFilter] = useState<string>(ALL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CurriculumItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft(''));
  const [dosenSearch, setDosenSearch] = useState('');
  const [rpsFile, setRpsFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CurriculumItem | null>(null);

  const itemsQuery = useQuery({
    queryKey: ['admin', 'curriculum-items'],
    queryFn: () => curriculumItemApi.list().then((res) => res.data.items),
  });

  const curriculumsQuery = useQuery({
    queryKey: ['admin', 'curriculums'],
    queryFn: () => curriculumApi.list().then((res) => res.data.curriculums),
  });

  const mastersQuery = useQuery({
    queryKey: ['admin', 'master-courses'],
    queryFn: () => courseMasterApi.list().then((res) => res.data.courses),
  });

  const semestersQuery = useQuery({
    queryKey: ['admin', 'academic-semesters'],
    queryFn: () => academicSemesterApi.list().then((res) => res.data.semesters),
  });

  const lecturersQuery = useQuery({
    queryKey: ['admin', 'lecturers'],
    queryFn: () => lecturerApi.list().then((res) => res.data.lecturers as unknown as DosenOption[]),
  });

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const curriculums: Curriculum[] = useMemo(() => curriculumsQuery.data ?? [], [curriculumsQuery.data]);
  const masters: CourseMaster[] = useMemo(() => mastersQuery.data ?? [], [mastersQuery.data]);
  const semesters = useMemo(() => semestersQuery.data ?? [], [semestersQuery.data]);
  const dosenOptions = useMemo(() => lecturersQuery.data ?? [], [lecturersQuery.data]);

  const filteredDosen = useMemo(() => {
    const keyword = dosenSearch.trim().toLowerCase();
    if (!keyword) return dosenOptions.slice(0, 8);
    return dosenOptions
      .filter(
        (dosen) =>
          dosen.name.toLowerCase().includes(keyword) ||
          (dosen.nidn ?? '').toLowerCase().includes(keyword),
      )
      .slice(0, 8);
  }, [dosenOptions, dosenSearch]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return items.filter((item) => {
      if (curriculumFilter !== ALL && String(item.curriculumId) !== curriculumFilter) return false;
      if (!keyword) return true;
      return (
        item.course.code.toLowerCase().includes(keyword) ||
        item.course.name.toLowerCase().includes(keyword)
      );
    });
  }, [items, search, curriculumFilter]);

  const totalCredits = filtered.reduce((sum, item) => sum + item.credits, 0);

  /** Master yang belum ditawarkan pada kurikulum terpilih — mencegah duplikat. */
  const availableMasters = useMemo(() => {
    if (editing) return masters;
    const used = new Set(
      items.filter((item) => String(item.curriculumId) === draft.curriculumId).map((item) => item.courseId),
    );
    return masters.filter((master) => !used.has(master.id));
  }, [masters, items, draft.curriculumId, editing]);

  const resetForm = () => {
    setDraft(emptyDraft(curriculums[0] ? String(curriculums[0].id) : ''));
    setFormError(null);
    setEditing(null);
    setDosenSearch('');
    setRpsFile(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item: CurriculumItem) => {
    setDraft({
      courseId: String(item.courseId),
      curriculumId: String(item.curriculumId),
      academicSemesterId: item.academicSemesterId ? String(item.academicSemesterId) : '',
      credits: String(item.credits),
      description: item.description ?? '',
      lecturersData: item.lecturersData ?? [],
    });
    setFormError(null);
    setEditing(item);
    setDosenSearch('');
    setRpsFile(null);
    setModalOpen(true);
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'curriculum-items'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'curriculums'] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        curriculumId: Number(draft.curriculumId),
        courseId: Number(draft.courseId),
        academicSemesterId: draft.academicSemesterId ? Number(draft.academicSemesterId) : null,
        credits: Number(draft.credits),
        description: draft.description.trim() || null,
        lecturersData: draft.lecturersData,
      };

      const saved = editing
        ? await curriculumItemApi.update(editing.id, payload)
        : await curriculumItemApi.create(payload);

      // RPS opsional: diunggah setelah penawaran tersimpan agar punya id.
      if (rpsFile) {
        await curriculumRpsApi.upload(saved.data.item.id, rpsFile);
      }
      return saved.data.item;
    },
    onSuccess: () => {
      toast.success(editing ? 'Mata kuliah kurikulum berhasil diperbarui.' : 'Mata kuliah berhasil ditambahkan ke kurikulum.');
      setModalOpen(false);
      resetForm();
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setFormError(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => curriculumItemApi.remove(id),
    onSuccess: () => {
      toast.success('Mata kuliah berhasil dihapus dari kurikulum.');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const removeRpsMutation = useMutation({
    mutationFn: (id: number) => curriculumRpsApi.remove(id),
    onSuccess: () => {
      toast.success('RPS berhasil dihapus.');
      invalidate();
      // `editing` tetap terbuka; muat ulang datanya dari daftar terbaru.
      setEditing((prev) => {
        if (!prev) return prev;
        const fresh = items.find((item) => item.id === prev.id);
        return fresh ?? prev;
      });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <AdminLayout
      title="Kurikulum"
      description={`${filtered.length} penawaran mata kuliah • ${totalCredits} SKS`}
      actions={
        <div className="flex gap-2">
          {has('curriculum.create') ? (
            <button type="button" onClick={openCreate} className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              Tambah Mata Kuliah
            </button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              className="field-input pl-9"
              placeholder="Cari kode atau nama mata kuliah..."
              aria-label="Cari kode atau nama mata kuliah"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="field-input"
            aria-label="Filter kurikulum"
            value={curriculumFilter}
            onChange={(event) => setCurriculumFilter(event.target.value)}
          >
            <option value={ALL}>Semua Kurikulum</option>
            {curriculums.map((curriculum) => (
              <option key={curriculum.id} value={String(curriculum.id)}>
                {curriculum.name} ({curriculum.year})
              </option>
            ))}
          </select>
        </div>

        {/*
         * Keadaan memuat/galat/kosong ditangani DataTable. Judul dan keterangan
         * keadaan kosong dibedakan menurut penyebabnya: kurikulum belum dibuat,
         * penawaran belum ada, atau pencarian/filter tidak menemukan apa pun.
         */}
        <DataTable<CurriculumItem>
          rows={filtered}
          rowKey={(item) => String(item.id)}
          loading={itemsQuery.isLoading}
          loadingLabel="Memuat kurikulum"
          error={itemsQuery.isError ? toApiError(itemsQuery.error).message : null}
          onRetry={() => void itemsQuery.refetch()}
          emptyTitle={
            curriculumsQuery.isLoading || curriculums.length === 0
              ? 'Belum ada kurikulum'
              : items.length === 0
                ? 'Belum ada mata kuliah pada kurikulum'
                : 'Tidak ada mata kuliah yang cocok'
          }
          emptyDescription={
            curriculumsQuery.isLoading || curriculums.length === 0
              ? 'Buat kurikulum terlebih dahulu sebelum menawarkan mata kuliah.'
              : items.length === 0
                ? 'Tambahkan mata kuliah ke kurikulum. Kode dan namanya diambil dari menu Mata Kuliah.'
                : 'Ubah kata kunci atau kosongkan filter kurikulum.'
          }
          emptyAction={
            curriculumsQuery.isLoading || curriculums.length === 0 ? null : items.length === 0 ? (
              has('curriculum.create') ? (
                <button type="button" onClick={openCreate} className="btn-primary">
                  <PlusIcon className="h-4 w-4" />
                  Tambah Mata Kuliah
                </button>
              ) : null
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCurriculumFilter(ALL);
                }}
                className="btn-secondary"
              >
                Kosongkan filter
              </button>
            )
          }
          minWidth={1180}
          footer={
            <p className="text-[11px] text-slate-500">
              Menampilkan {filtered.length} dari {items.length} penawaran • {totalCredits} SKS
            </p>
          }
          columns={
            [
              {
                key: 'kode',
                header: 'Kode',
                width: 96,
                cellClassName: 'font-mono font-bold text-slate-700',
                render: (item) => item.course.code,
              },
              {
                key: 'nama',
                header: 'Nama Mata Kuliah',
                cellClassName: 'font-semibold text-slate-800',
                render: (item) => item.course.name,
              },
              {
                key: 'kurikulum',
                header: 'Kurikulum',
                width: 160,
                cellClassName: 'text-slate-600',
                render: (item) => (item.curriculum ? `${item.curriculum.name}` : '-'),
              },
              {
                key: 'sks',
                header: 'SKS',
                width: 64,
                align: 'center',
                cellClassName: 'font-bold',
                render: (item) => item.credits,
              },
              {
                key: 'semester',
                header: 'Semester',
                width: 112,
                cellClassName: 'text-slate-600',
                render: (item) => item.academicSemester?.name ?? '-',
              },
              {
                key: 'keterangan',
                header: 'Keterangan',
                width: 112,
                cellClassName: 'text-slate-600',
                render: (item) => item.description || '-',
              },
              {
                key: 'dosen',
                header: 'Dosen Pengampu',
                render: (item) => {
                  const lecturers = item.lecturersData ?? [];
                  return lecturers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {lecturers.map((lecturer) => (
                        <span
                          key={String(lecturer.id)}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-800"
                          title={lecturer.nidn ? `NIDN: ${lecturer.nidn}` : undefined}
                        >
                          <UserGroupIcon className="h-3 w-3 text-slate-500" />
                          {lecturer.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] italic text-slate-400">Belum ditentukan</span>
                  );
                },
              },
              {
                key: 'rps',
                header: 'RPS',
                width: 80,
                align: 'center',
                render: (item) => {
                  const rps = item.rpsDocuments ?? [];
                  return rps.length > 0 ? (
                    <a
                      href={rps[0].fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100"
                      title={rps[0].title}
                    >
                      <DocumentTextIcon className="h-3 w-3" />
                      Lihat
                    </a>
                  ) : (
                    <span className="text-[11px] italic text-slate-400">-</span>
                  );
                },
              },
              {
                key: 'aksi',
                header: 'Aksi',
                width: 110,
                align: 'right',
                render: (item) => (
                  <RowActions>
                    {has('curriculum.update') ? (
                      <EditRowButton
                        label="Ubah mata kuliah kurikulum"
                        konteks={item.course.name}
                        onClick={() => openEdit(item)}
                      />
                    ) : null}
                    {has('curriculum.delete') ? (
                      <DeleteRowButton
                        label="Hapus mata kuliah dari kurikulum"
                        konteks={item.course.name}
                        onClick={() => setDeleteTarget(item)}
                      />
                    ) : null}
                  </RowActions>
                ),
              },
            ] satisfies Array<DataTableColumn<CurriculumItem>>
          }
        />
      </div>

      <FormModal
        open={modalOpen}
        title={editing ? 'Ubah Mata Kuliah Kurikulum' : 'Tambah Mata Kuliah ke Kurikulum'}
        description="Pilih mata kuliah dari menu Mata Kuliah, lalu lengkapi detail penawarannya."
        busy={saveMutation.isPending}
        error={formError}
        wide
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          if (!draft.courseId) {
            setFormError('Pilih mata kuliah terlebih dahulu.');
            return;
          }
          if (!draft.curriculumId) {
            setFormError('Pilih kurikulum terlebih dahulu.');
            return;
          }
          if (rpsFile && rpsFile.size > RPS_MAX_BYTES) {
            setFormError('Ukuran berkas RPS melebihi 10 MB.');
            return;
          }
          saveMutation.mutate();
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Kurikulum" htmlFor="item-curriculum" required>
            <select
              id="item-curriculum"
              className="field-input"
              value={draft.curriculumId}
              onChange={(event) => setDraft({ ...draft, curriculumId: event.target.value, courseId: '' })}
              disabled={editing !== null}
            >
              <option value="">Pilih kurikulum...</option>
              {curriculums.map((curriculum) => (
                <option key={curriculum.id} value={String(curriculum.id)}>
                  {curriculum.name} ({curriculum.year})
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Mata Kuliah"
            htmlFor="item-course"
            required
            hint="Daftar berasal dari menu Mata Kuliah."
          >
            <select
              id="item-course"
              className="field-input"
              value={draft.courseId}
              onChange={(event) => setDraft({ ...draft, courseId: event.target.value })}
            >
              <option value="">Pilih mata kuliah...</option>
              {availableMasters.map((master) => (
                <option key={master.id} value={String(master.id)}>
                  {master.code} — {master.name}
                </option>
              ))}
            </select>
          </Field>

          {draft.courseId ? (
            <Field label="Kode Mata Kuliah" htmlFor="item-code" hint="Mengikuti master, tidak dapat diubah di sini.">
              <input
                id="item-code"
                className="field-input bg-slate-100 text-slate-600"
                value={masters.find((master) => String(master.id) === draft.courseId)?.code ?? ''}
                readOnly
              />
            </Field>
          ) : null}

          <Field
            label="Semester"
            htmlFor="item-semester"
            hint="Dipilih dari master semester (kalender akademik)."
          >
            <select
              id="item-semester"
              className="field-input"
              value={draft.academicSemesterId}
              onChange={(event) => setDraft({ ...draft, academicSemesterId: event.target.value })}
            >
              <option value="">Tanpa semester</option>
              {semesters.map((semester) => (
                <option key={semester.id} value={String(semester.id)}>
                  {semester.name} ({semester.code}){semester.isActive ? ' - Aktif' : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Bobot SKS" htmlFor="item-credits" required>
            <input
              id="item-credits"
              type="number"
              min={0}
              max={12}
              className="field-input"
              value={draft.credits}
              onChange={(event) => setDraft({ ...draft, credits: event.target.value })}
            />
          </Field>

          <Field label="Keterangan" htmlFor="item-description" hint="Teks bebas: Wajib, Pilihan, atau catatan kompetensi.">
            <input
              id="item-description"
              className="field-input"
              placeholder="Wajib"
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </Field>
        </div>

        {/* Dosen pengampu */}
        <div>
          <label htmlFor="dosen-search" className="mb-1 block text-xs font-bold text-slate-700">
            Dosen Pengampu
          </label>
          <p className="mb-2 text-[11px] text-slate-500">
            Dosen terpilih akan tercatat sebagai pengampu mata kuliah ini.
          </p>

          {draft.lecturersData.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {draft.lecturersData.map((lecturer) => (
                <span
                  key={String(lecturer.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800"
                >
                  {lecturer.name}
                  <button
                    type="button"
                    aria-label={`Batalkan ${lecturer.name} sebagai pengampu`}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        lecturersData: draft.lecturersData.filter((l) => String(l.id) !== String(lecturer.id)),
                      })
                    }
                    className="text-emerald-700 hover:text-rose-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <input
            id="dosen-search"
            type="search"
            className="field-input"
            placeholder="Cari nama dosen..."
            value={dosenSearch}
            onChange={(event) => setDosenSearch(event.target.value)}
          />

          {lecturersQuery.isLoading ? (
            <p className="mt-2 text-[11px] text-slate-500">Memuat daftar dosen...</p>
          ) : (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-[10px] border border-slate-200">
              {filteredDosen.length === 0 ? (
                <p className="px-3 py-2 text-[11px] italic text-slate-400">Tidak ada dosen yang cocok.</p>
              ) : (
                filteredDosen.map((dosen) => {
                  const selected = draft.lecturersData.some((l) => String(l.id) === String(dosen.id));
                  return (
                    <button
                      key={String(dosen.id)}
                      type="button"
                      disabled={selected}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          lecturersData: [
                            ...draft.lecturersData,
                            { id: dosen.id, name: dosen.name, nidn: dosen.nidn ?? null },
                          ],
                        })
                      }
                      className={`flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left text-[11px] last:border-b-0 ${
                        selected ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-800">{dosen.name}</span>
                        {dosen.nidn ? (
                          <span className="block text-[10px] text-slate-500">NIDN {dosen.nidn}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-[10px] font-bold">
                        {selected ? 'Dipilih' : '+ Pilih'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* RPS */}
        <div>
          <label htmlFor="rps-file" className="mb-1 block text-xs font-bold text-slate-700">
            Upload RPS
          </label>
          <p className="mb-2 text-[11px] text-slate-500">
            Opsional. Format PDF, maksimal 10 MB. Berkas dapat dilihat pengunjung pada halaman kurikulum publik.
          </p>

          {editing && editing.rpsDocuments.length > 0 ? (
            <ul className="mb-2 space-y-1">
              {editing.rpsDocuments.map((rps) => (
                <li
                  key={rps.id}
                  className="flex items-center justify-between gap-2 rounded border border-slate-200 px-2.5 py-1.5 text-[11px]"
                >
                  <a href={rps.fileUrl} target="_blank" rel="noreferrer" className="truncate text-blue-700 hover:underline">
                    {rps.title}
                  </a>
                  <button
                    type="button"
                    onClick={() => removeRpsMutation.mutate(rps.id)}
                    disabled={removeRpsMutation.isPending}
                    className="shrink-0 rounded border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <input
            id="rps-file"
            type="file"
            accept="application/pdf"
            className="field-input"
            onChange={(event) => setRpsFile(event.target.files?.[0] ?? null)}
          />
          {rpsFile ? (
            <p className="mt-1 text-[11px] text-slate-600">Dipilih: {rpsFile.name}</p>
          ) : (
            <p className="mt-1 text-[11px] italic text-slate-400">Belum ada berkas dipilih</p>
          )}
        </div>
      </FormModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus mata kuliah dari kurikulum"
        description={`"${deleteTarget?.course.code ?? ''} ${deleteTarget?.course.name ?? ''}" akan dihapus dari kurikulum ini beserta RPS-nya. Master mata kuliah di menu Mata Kuliah tidak terpengaruh.`}
        busy={removeMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) removeMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminCurriculum;
