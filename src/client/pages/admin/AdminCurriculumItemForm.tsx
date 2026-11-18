import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { FormPageTemplate, type FormSection } from '../../components/ui/FormPageTemplate';
import { Field } from '../../components/ui/FormModal';
import { SearchableSelect, type SearchableOption } from '../../components/ui/SearchableSelect';
import { useToast } from '../../components/ui/Toast';
import {
  adminRpsFileUrl,
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
import { useSiteStore } from '../../app/siteStore';
import { firstFieldError, toApiError } from '../../services/api';

interface Draft {
  courseId: string;
  curriculumId: string;
  academicSemesterId: string;
  credits: string;
  description: string;
  lecturersData: LecturerAssignment[];
}

const emptyDraft = (defaultCurriculumId = ''): Draft => ({
  courseId: '',
  curriculumId: defaultCurriculumId,
  academicSemesterId: '',
  credits: '3',
  description: '',
  lecturersData: [],
});

export const AdminCurriculumItemForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const activeTenantId = useSiteStore((state) => state.activeTenantId);

  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [formError, setFormError] = useState<string | null>(null);
  const [dosenSearch, setDosenSearch] = useState('');
  const [rpsFile, setRpsFile] = useState<File | null>(null);
  const [editingItem, setEditingItem] = useState<CurriculumItem | null>(null);

  const curriculumsQuery = useQuery({
    queryKey: ['admin', 'curriculums'],
    queryFn: async () => {
      const res = await curriculumApi.list();
      return res.data.curriculums;
    },
  });

  const mastersQuery = useQuery({
    queryKey: ['admin', 'master-courses'],
    queryFn: async () => {
      const res = await courseMasterApi.list();
      return res.data.courses;
    },
  });

  const semestersQuery = useQuery({
    queryKey: ['admin', 'academic-semesters'],
    queryFn: async () => {
      const res = await academicSemesterApi.list();
      return res.data.semesters;
    },
  });

  const lecturersQuery = useQuery({
    queryKey: ['admin', 'lecturers'],
    queryFn: async () => {
      const res = await lecturerApi.list();
      return res.data.lecturers;
    },
  });

  const itemsQuery = useQuery({
    queryKey: ['admin', 'curriculum-items'],
    queryFn: async () => {
      const res = await curriculumItemApi.list();
      return res.data.items;
    },
  });

  const curriculums: Curriculum[] = useMemo(() => curriculumsQuery.data ?? [], [curriculumsQuery.data]);
  const masters: CourseMaster[] = useMemo(() => mastersQuery.data ?? [], [mastersQuery.data]);
  const semesters = useMemo(() => semestersQuery.data ?? [], [semestersQuery.data]);
  const dosenOptions = useMemo(() => lecturersQuery.data ?? [], [lecturersQuery.data]);
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  // Set default curriculum saat create (ambil kurikulum aktif atau yang pertama)
  useEffect(() => {
    if (!isEdit && curriculums.length > 0 && !draft.curriculumId) {
      const activeCur = curriculums.find((c) => c.isActive) ?? curriculums[0];
      setDraft((prev) => ({ ...prev, curriculumId: String(activeCur.id) }));
    }
  }, [isEdit, curriculums, draft.curriculumId]);

  // Load existing item jika edit
  useEffect(() => {
    if (!isEdit || !id || items.length === 0) return;
    const found = items.find((it) => String(it.id) === id);
    if (found) {
      setEditingItem(found);
      setDraft({
        courseId: String(found.courseId),
        curriculumId: String(found.curriculumId),
        academicSemesterId: found.academicSemesterId ? String(found.academicSemesterId) : '',
        credits: String(found.credits),
        description: found.description ?? '',
        lecturersData: found.lecturersData ?? [],
      });
    }
  }, [isEdit, id, items]);

  const availableMasters = useMemo(() => {
    if (isEdit) return masters;
    const used = new Set(
      items.filter((item) => String(item.curriculumId) === draft.curriculumId).map((item) => item.courseId),
    );
    return masters.filter((master) => !used.has(master.id));
  }, [masters, items, draft.curriculumId, isEdit]);

  const curriculumOptions = useMemo<SearchableOption[]>(
    () =>
      curriculums.map((c) => ({
        value: String(c.id),
        label: `${c.name} (${c.year})`,
        keywords: `${c.year}`,
      })),
    [curriculums],
  );

  const courseOptions = useMemo<SearchableOption[]>(
    () =>
      availableMasters.map((m) => ({
        value: String(m.id),
        label: `${m.code} — ${m.name}`,
        keywords: m.name,
      })),
    [availableMasters],
  );

  const semesterOptions = useMemo<SearchableOption[]>(() => {
    const rows: SearchableOption[] = semesters.map((s) => ({
      value: String(s.id),
      label: `${s.name} (${s.code})`,
      keywords: s.code,
      meta: s.isActive ? 'Aktif' : undefined,
    }));
    return [{ value: '', label: 'Tanpa semester' }, ...rows];
  }, [semesters]);

  const filteredDosen = useMemo(() => {
    const keyword = dosenSearch.trim().toLowerCase();
    if (!keyword) return dosenOptions.slice(0, 30);
    return dosenOptions
      .filter((d) => d.name.toLowerCase().includes(keyword) || (d.nidn ?? '').toLowerCase().includes(keyword))
      .slice(0, 30);
  }, [dosenOptions, dosenSearch]);

  const removeRpsMutation = useMutation({
    mutationFn: (rpsId: number) => curriculumRpsApi.remove(rpsId),
    onSuccess: () => {
      toast.success('Berkas RPS berhasil dihapus.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'curriculum-items'] });
    },
    onError: (err) => {
      const apiErr = toApiError(err);
      toast.error(apiErr.message ?? 'Gagal menghapus RPS.');
    },
  });

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

      const saved = isEdit && id
        ? await curriculumItemApi.update(Number(id), payload)
        : await curriculumItemApi.create(payload);

      if (rpsFile) {
        await curriculumRpsApi.upload(saved.data.item.id, rpsFile);
      }
      return saved.data.item;
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Mata kuliah kurikulum berhasil diperbarui.' : 'Mata kuliah berhasil ditambahkan ke kurikulum.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'curriculum-items'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'curriculums'] });
      navigate('/admin/kurikulum');
    },
    onError: (err) => {
      const apiErr = toApiError(err);
      setFormError(firstFieldError(apiErr) ?? apiErr.message ?? 'Gagal menyimpan penawaran.');
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
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
  };

  const pageTitle = isEdit ? 'Ubah Kurikulum' : 'Tambah Kurikulum';
  const pageDescription = isEdit
    ? 'Perbarui data mata kuliah pada kurikulum: SKS, semester, dosen pengampu, atau berkas RPS.'
    : 'Pilih mata kuliah dari master, lalu lengkapi detail penawarannya pada kurikulum.';

  const sections: FormSection[] = [
    {
      id: 'section-mata-kuliah',
      title: 'Pilihan Mata Kuliah',
      description: 'Pilih mata kuliah dari master untuk ditawarkan ke kurikulum.',
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Mata Kuliah"
            htmlFor="item-course"
            required
            hint="Daftar berasal dari menu Mata Kuliah."
          >
            <SearchableSelect
              id="item-course"
              aria-label="Mata Kuliah"
              options={courseOptions}
              value={draft.courseId}
              onChange={(value) => setDraft({ ...draft, courseId: value })}
              placeholder="Pilih mata kuliah..."
              searchPlaceholder="Cari kode atau nama mata kuliah..."
              noResultLabel="Tidak ada mata kuliah yang cocok."
              disabled={isEdit}
            />
          </Field>

          {draft.courseId ? (
            <Field label="Kode Mata Kuliah" htmlFor="item-code" hint="Mengikuti master, tidak dapat diubah di sini.">
              <input
                id="item-code"
                className="field-input bg-slate-100 text-slate-600 font-mono"
                value={masters.find((m) => String(m.id) === draft.courseId)?.code ?? ''}
                readOnly
              />
            </Field>
          ) : null}

          <Field
            label="Semester"
            htmlFor="item-semester"
            hint="Dipilih dari master semester (kalender akademik)."
          >
            <SearchableSelect
              id="item-semester"
              aria-label="Semester"
              options={semesterOptions}
              value={draft.academicSemesterId}
              onChange={(value) => setDraft({ ...draft, academicSemesterId: value })}
              placeholder="Tanpa semester"
              emptyLabel="Tanpa semester"
              searchPlaceholder="Cari semester..."
            />
          </Field>
        </div>
      ),
    },
    {
      id: 'section-bobot',
      title: 'Bobot SKS dan Keterangan',
      description: 'Jumlah SKS dan catatan jenis penawaran (Wajib / Pilihan / dll).',
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Bobot SKS" htmlFor="item-credits" required>
            <input
              id="item-credits"
              type="number"
              min={0}
              max={12}
              className="field-input"
              value={draft.credits}
              onChange={(e) => setDraft({ ...draft, credits: e.target.value })}
              required
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Keterangan" htmlFor="item-description" hint="Tuliskan catatan, status Wajib/Pilihan, atau capaian kompetensi.">
              <textarea
                id="item-description"
                rows={3}
                className="field-input py-2"
                placeholder="Contoh: Mata Kuliah Wajib Program Studi"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Field>
          </div>
        </div>
      ),
    },
    {
      id: 'section-pengampu-rps',
      title: 'Dosen Pengampu & Berkas RPS',
      description: 'Pengampu mata kuliah dan unggahan RPS berformat PDF.',
      content: (
        <div className="space-y-6">
          {/* Dosen Pengampu */}
          <div>
            <label htmlFor="dosen-search" className="mb-1 block text-xs font-bold text-slate-700">
              Dosen Pengampu
            </label>
            <p className="mb-2 text-[11px] text-slate-500">
              Dosen terpilih akan tercatat sebagai pengampu mata kuliah ini (sumber: ONE UNUSU API Hub).
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
                      className="text-emerald-700 hover:text-rose-600 font-bold"
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
              placeholder="Ketik untuk mencari nama dosen..."
              value={dosenSearch}
              onChange={(e) => setDosenSearch(e.target.value)}
            />

            {lecturersQuery.isLoading ? (
              <p className="mt-2 text-[11px] text-slate-500">Memuat daftar dosen...</p>
            ) : (
              <div className="mt-2 max-h-72 overflow-y-auto rounded-[10px] border border-slate-200 divide-y divide-slate-100">
                {filteredDosen.length === 0 ? (
                  <p className="px-3 py-3 text-[11px] italic text-slate-400">Tidak ada dosen yang cocok.</p>
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
                        className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-xs transition-colors ${
                          selected
                            ? 'bg-emerald-50/70 text-emerald-800 cursor-default'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{dosen.name}</span>
                          {dosen.nidn ? (
                            <span className="block text-[11px] text-slate-500 font-mono mt-0.5">NIDN {dosen.nidn}</span>
                          ) : null}
                        </span>
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${
                            selected
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700 hover:bg-[#1e3a8a] hover:text-white'
                          }`}
                        >
                          {selected ? 'Dipilih' : '+ Pilih'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* RPS Upload */}
          <div className="border-t border-slate-100 pt-4">
            <label htmlFor="rps-file" className="mb-1 block text-xs font-bold text-slate-700">
              Upload RPS
            </label>
            <p className="mb-2 text-[11px] text-slate-500">
              Opsional. Format PDF, maksimal 10 MB. Berkas dapat diunduh publik di halaman Kurikulum.
            </p>

            {editingItem && editingItem.rpsDocuments.length > 0 ? (
              <ul className="mb-3 space-y-1">
                {editingItem.rpsDocuments.map((rps) => (
                  <li
                    key={rps.id}
                    className="flex items-center justify-between gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 text-[11px]"
                  >
                    <a href={adminRpsFileUrl(rps.fileUrl, activeTenantId)} target="_blank" rel="noreferrer" className="truncate text-[#1e3a8a] font-semibold hover:underline">
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
              className="field-input py-1.5"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setRpsFile(file);
              }}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      title={pageTitle}
      description={pageDescription}
      actions={
        <Link to="/admin/kurikulum" className="btn-secondary">
          <ArrowLeftIcon className="h-4 w-4" />
          Kembali
        </Link>
      }
    >
      <FormPageTemplate
        mode={isEdit ? 'edit' : 'create'}
        title={pageTitle}
        description={pageDescription}
        showHeader={false}
        busy={saveMutation.isPending}
        error={formError}
        sections={sections}
        cancelTo="/admin/kurikulum"
        onSubmit={handleSubmit}
      />
    </AdminLayout>
  );
};

export default AdminCurriculumItemForm;
