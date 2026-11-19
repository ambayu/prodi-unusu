import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDaysIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { DeleteRowButton, EditRowButton, RowActions } from '../../components/ui/RowActions';
import { SearchableSelect, type SearchableOption } from '../../components/ui/SearchableSelect';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import {
  adminRpsFileUrl,
  arsipDokumenApi,
  curriculumApi,
  curriculumItemApi,
  type Curriculum,
  type CurriculumItem,
} from '../../services/contentApi';
import { useSiteStore } from '../../app/siteStore';
import { firstFieldError, toApiError } from '../../services/api';
import { pickCurrentCurriculum } from '../../../shared/utils/curriculum';

const SEMESTER_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8];

type SemesterGroup = {
  number: number | null;
  items: CurriculumItem[];
  totalCredits: number;
  totalRps: number;
};

/** Mengembalikan semester posisi yang valid; data lama dapat belum memiliki nilai ini. */
function semesterOf(item: CurriculumItem): number | null {
  return Number.isInteger(item.semesterNumber) && (item.semesterNumber ?? 0) > 0
    ? item.semesterNumber
    : null;
}

/** Halaman administrasi penawaran mata kuliah per kurikulum. */
export const AdminCurriculum: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const { has } = usePermission();
  const activeTenantId = useSiteStore((state) => state.activeTenantId);

  const [search, setSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<number | 'all'>('all');
  const [curriculumFilter, setCurriculumFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<CurriculumItem | null>(null);

  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneDraft, setCloneDraft] = useState({
    sourceId: 0,
    year: new Date().getFullYear(),
    name: '',
  });
  const [cloneError, setCloneError] = useState<string | null>(null);

  const itemsQuery = useQuery({
    queryKey: ['admin', 'curriculum-items'],
    queryFn: () => curriculumItemApi.list().then((res) => res.data.items),
  });

  const curriculumsQuery = useQuery({
    queryKey: ['admin', 'curriculums'],
    queryFn: () => curriculumApi.list().then((res) => res.data.curriculums),
  });

  const passwordQuery = useQuery({
    queryKey: ['admin', 'dokumen-password'],
    queryFn: () => arsipDokumenApi.passwordStatus().then((res) => res.data),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const curriculums: Curriculum[] = useMemo(() => curriculumsQuery.data ?? [], [curriculumsQuery.data]);
  const sandiBelumDipasang = passwordQuery.data?.passwordActive === false;
  const keyword = search.trim().toLowerCase();

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (curriculumFilter !== 'all' && String(item.curriculumId) !== curriculumFilter) return false;
        if (semesterFilter !== 'all' && semesterOf(item) !== semesterFilter) return false;
        if (!keyword) return true;
        return item.course.code.toLowerCase().includes(keyword) || item.course.name.toLowerCase().includes(keyword);
      }),
    [items, keyword, semesterFilter, curriculumFilter],
  );

  const groups = useMemo<SemesterGroup[]>(() => {
    const map = new Map<number | null, CurriculumItem[]>();
    for (const item of filteredItems) {
      const number = semesterOf(item);
      const groupItems = map.get(number) ?? [];
      groupItems.push(item);
      map.set(number, groupItems);
    }

    const numbers = Array.from(map.keys())
      .filter((number): number is number => number !== null)
      .sort((a, b) => a - b);
    const order = map.has(null) ? [...numbers, null] : numbers;

    return order.map((number) => {
      const groupItems = map.get(number) ?? [];
      return {
        number,
        items: groupItems,
        totalCredits: groupItems.reduce((sum, item) => sum + item.credits, 0),
        totalRps: groupItems.filter((item) => item.rpsDocuments.length > 0).length,
      };
    });
  }, [filteredItems]);

  const semesterCards = useMemo(() => {
    const summary = new Map<number, { courseCount: number; totalCredits: number }>();
    for (const item of items) {
      const number = semesterOf(item);
      if (number === null) continue;
      const current = summary.get(number) ?? { courseCount: 0, totalCredits: 0 };
      current.courseCount += 1;
      current.totalCredits += item.credits;
      summary.set(number, current);
    }

    return SEMESTER_NUMBERS.map((number) => ({
      number,
      courseCount: summary.get(number)?.courseCount ?? 0,
      totalCredits: summary.get(number)?.totalCredits ?? 0,
    }));
  }, [items]);

  const totalCredits = items.reduce((sum, item) => sum + item.credits, 0);
  const totalRps = items.filter((item) => item.rpsDocuments.length > 0).length;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'curriculum-items'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'curriculums'] });
  };

  const removeMutation = useMutation({
    mutationFn: (id: number) => curriculumItemApi.remove(id),
    onSuccess: () => {
      toast.success('Mata kuliah berhasil dihapus dari kurikulum.');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const cloneMutation = useMutation({
    mutationFn: () =>
      curriculumApi.cloneCurriculum(cloneDraft.sourceId, {
        year: Number(cloneDraft.year),
        name: cloneDraft.name.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Kurikulum berhasil disalin ke tahun baru.');
      setCloneModalOpen(false);
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lms-courses'] });
    },
    onError: (err) => {
      const apiErr = toApiError(err);
      setCloneError(firstFieldError(apiErr) ?? apiErr.message ?? 'Gagal menyalin kurikulum.');
    },
  });

  const currentCurriculum = useMemo(() => pickCurrentCurriculum(curriculums), [curriculums]);

  const curriculumFilterOptions = useMemo<SearchableOption[]>(
    () => [
      { value: 'all', label: 'Semua Tahun', keywords: 'semua seluruh tahun kurikulum' },
      ...curriculums.map((c) => ({
        value: String(c.id),
        label: `Tahun ${c.year}`,
        description: c.name,
        keywords: `${c.year} ${c.name}`,
      })),
    ],
    [curriculums],
  );

  const cloneSourceOptions = useMemo<SearchableOption[]>(
    () =>
      curriculums.map((c) => ({
        value: String(c.id),
        label: `Tahun ${c.year}`,
        description: c.name,
        keywords: `${c.year} ${c.name}`,
      })),
    [curriculums],
  );

  const handleOpenClone = () => {
    const source = currentCurriculum ?? curriculums[0];
    const nextYear = source ? source.year + 2 : new Date().getFullYear();
    setCloneDraft({
      sourceId: source ? source.id : 0,
      year: nextYear,
      name: source ? `${source.name.replace(/\b\d{4}\b/g, '').trim()} ${nextYear}`.trim() : '',
    });
    setCloneError(null);
    setCloneModalOpen(true);
  };

  const columns: Array<DataTableColumn<CurriculumItem>> = [
    {
      key: 'kode',
      header: 'Kode MK',
      width: 130,
      render: (item) => (
        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
          {item.course.code}
        </span>
      ),
    },
    {
      key: 'nama',
      header: 'Nama Mata Kuliah',
      cellClassName: 'text-xs font-semibold text-slate-800',
      render: (item) => item.course.name,
    },
    {
      key: 'kurikulum',
      header: 'Kurikulum / Tahun',
      width: 190,
      cellClassName: 'text-xs text-slate-700',
      render: (item) => (
        <div className="min-w-0">
          <span className="block truncate font-medium text-slate-900" title={item.curriculum?.name ?? ''}>
            {item.curriculum?.name ?? '—'}
          </span>
          {item.curriculum?.year ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
              Tahun {item.curriculum.year}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'sks',
      header: 'SKS',
      width: 68,
      align: 'center',
      render: (item) => (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-xs font-bold text-[#1e3a8a]">
          {item.credits}
        </span>
      ),
    },
    {
      key: 'keterangan',
      header: 'Keterangan',
      width: 140,
      cellClassName: 'text-xs text-slate-700',
      render: (item) => (
        <span className="block truncate" title={item.description ?? ''}>
          {item.description || <span className="italic text-slate-400">—</span>}
        </span>
      ),
    },
    {
      key: 'dosen',
      header: 'Dosen Pengampu',
      width: 220,
      render: (item) => {
        const lecturers = item.lecturersData ?? [];
        return lecturers.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {lecturers.map((lecturer) => (
              <span
                key={String(lecturer.id)}
                className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                title={lecturer.nidn ? `${lecturer.name} — NIDN: ${lecturer.nidn}` : lecturer.name}
              >
                <UserGroupIcon className="h-3 w-3 shrink-0 text-slate-500" />
                <span className="truncate">{lecturer.name}</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs italic text-slate-400">Belum ditentukan</span>
        );
      },
    },
    {
      key: 'rps',
      header: 'RPS',
      width: 100,
      align: 'center',
      render: (item) => {
        const rps = item.rpsDocuments ?? [];
        return rps.length > 0 ? (
          <a
            href={adminRpsFileUrl(rps[0].fileUrl, activeTenantId)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            title={rps[0].title}
          >
            <DocumentTextIcon className="h-3.5 w-3.5" />
            Lihat
          </a>
        ) : (
          <span className="text-xs text-slate-400">—</span>
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
              onClick={() => navigate(`/admin/kurikulum/${item.id}/ubah`)}
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
  ];

  return (
    <AdminLayout
      title="Kurikulum"
      description={`${items.length} penawaran mata kuliah • ${totalCredits} SKS`}
      actions={
        has('curriculum.create') ? (
          <div className="flex flex-wrap items-center gap-2">
            {curriculums.length > 0 ? (
              <button
                type="button"
                onClick={handleOpenClone}
                className="btn-secondary gap-1.5"
              >
                <DocumentDuplicateIcon className="h-4 w-4 text-[#1e3a8a]" />
                Salin ke Tahun Baru
              </button>
            ) : null}
            <Link to="/admin/kurikulum/baru" className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              Tambah Kurikulum
            </Link>
          </div>
        ) : null
      }
    >
      <div className="space-y-5">
        {sandiBelumDipasang ? (
          <div className="flex items-start gap-3 rounded-[14px] border border-amber-300 bg-amber-50 px-4 py-3.5">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 text-sm text-amber-900">
              <p className="font-bold leading-snug">RPS belum dapat dibuka pengunjung.</p>
              <p className="mt-1.5 leading-relaxed">
                Kata sandi dokumen prodi ini belum dipasang. Selama belum ada sandi, seluruh berkas RPS tertutup untuk publik. Pasang sandi terlebih dahulu sebelum mengunggah RPS.
              </p>
              <Link to="/admin/dokumen" className="btn-primary mt-3 gap-2 bg-amber-600 hover:bg-amber-700">
                <KeyIcon className="h-4 w-4" />
                Pasang Kata Sandi
              </Link>
            </div>
          </div>
        ) : null}

        <section
          className="rounded-2xl border border-slate-200/90 bg-slate-50/45 p-4 shadow-2xs sm:p-5"
          aria-label="Filter kurikulum"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#1e3a8a] shadow-2xs ring-1 ring-slate-200/80">
                <FunnelIcon className="h-3.5 w-3.5" />
              </span>
              Pilih tahun kurikulum, semester, atau cari mata kuliah
            </p>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              {curriculums.length > 0 ? (
                <SearchableSelect
                  value={curriculumFilter}
                  onChange={(val) => setCurriculumFilter(val || 'all')}
                  options={curriculumFilterOptions}
                  clearable={false}
                  searchPlaceholder="Cari tahun kurikulum..."
                  icon={<CalendarDaysIcon className="h-4 w-4" />}
                  dropdownMinWidth={240}
                  className="w-full sm:w-44"
                  aria-label="Filter berdasarkan tahun kurikulum"
                />
              ) : null}
              <div className="relative sm:w-72">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  className="field-input pl-9"
                  placeholder="Cari kode atau nama..."
                  aria-label="Cari kode atau nama mata kuliah"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
            <button
              type="button"
              onClick={() => setSemesterFilter('all')}
              className={`group rounded-xl border p-3 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] ${
                semesterFilter === 'all'
                  ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white shadow-[0_6px_16px_-6px_rgba(30,58,138,0.5)]'
                  : 'border-slate-200/90 bg-white text-slate-700 shadow-2xs hover:border-[#1e3a8a]/40 hover:bg-[#eff6ff]/70'
              }`}
            >
              <span className="block text-sm font-bold tracking-tight">Semua</span>
              <span className={`mt-1 block text-[11px] tabular-nums ${semesterFilter === 'all' ? 'text-blue-100' : 'text-slate-500'}`}>
                {items.length} MK · {totalCredits} SKS
              </span>
              <span className={`mt-2.5 block h-1 rounded-full transition-colors ${semesterFilter === 'all' ? 'bg-[#fbbf24]' : 'bg-slate-200/90 group-hover:bg-[#1e3a8a]/25'}`} />
            </button>
            {semesterCards.map((semester) => {
              const selected = semesterFilter === semester.number;
              return (
                <button
                  key={semester.number}
                  type="button"
                  onClick={() => setSemesterFilter(semester.number)}
                  className={`group rounded-xl border p-3 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] ${
                    selected
                      ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white shadow-[0_6px_16px_-6px_rgba(30,58,138,0.5)]'
                      : 'border-slate-200/90 bg-white text-slate-700 shadow-2xs hover:border-[#1e3a8a]/40 hover:bg-[#eff6ff]/70'
                  }`}
                >
                  <span className="block text-sm font-bold tracking-tight">Semester {semester.number}</span>
                  <span className={`mt-1 block text-[11px] tabular-nums ${selected ? 'text-blue-100' : 'text-slate-500'}`}>
                    {semester.courseCount} MK · {semester.totalCredits} SKS
                  </span>
                  <span className={`mt-2.5 block h-1 rounded-full transition-colors ${selected ? 'bg-[#fbbf24]' : 'bg-slate-200/90 group-hover:bg-[#1e3a8a]/25'}`} />
                </button>
              );
            })}
          </div>
        </section>

        {itemsQuery.isLoading || itemsQuery.isError ? (
          <DataTable<CurriculumItem>
            rows={[]}
            rowKey={(item) => String(item.id)}
            columns={columns}
            loading={itemsQuery.isLoading}
            loadingLabel="Memuat penawaran kurikulum"
            error={itemsQuery.isError ? toApiError(itemsQuery.error).message : null}
            onRetry={() => void itemsQuery.refetch()}
          />
        ) : groups.length === 0 ? (
          <DataTable<CurriculumItem>
            rows={[]}
            rowKey={(item) => String(item.id)}
            columns={columns}
            emptyTitle={curriculumsQuery.isLoading || curriculums.length === 0 ? 'Belum ada kurikulum' : 'Mata kuliah tidak ditemukan'}
            emptyDescription={
              curriculumsQuery.isLoading || curriculums.length === 0
                ? 'Klik "Tambah Kurikulum" untuk mulai menyusun struktur mata kuliah.'
                : 'Ubah kata pencarian atau pilih semester lain untuk melihat penawaran mata kuliah.'
            }
            emptyAction={
              search || semesterFilter !== 'all' ? (
                <button type="button" onClick={() => { setSearch(''); setSemesterFilter('all'); }} className="btn-secondary">
                  Reset filter & pencarian
                </button>
              ) : has('curriculum.create') ? (
                <Link to="/admin/kurikulum/baru" className="btn-primary">
                  <PlusIcon className="h-4 w-4" />
                  Tambah Kurikulum
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.number ?? 'tanpa-semester'} className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
                <header className="flex flex-col gap-3 border-b border-slate-200/90 bg-gradient-to-r from-slate-50/90 via-white to-blue-50/35 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-[#1e3a8a] text-white shadow-xs">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-blue-200">Smt</span>
                      <span className="-mt-0.5 text-lg font-extrabold leading-none tabular-nums">{group.number ?? '—'}</span>
                    </span>
                    <div>
                      <h2 className="text-sm font-bold tracking-tight text-slate-900">{group.number === null ? 'Tanpa Semester' : `Semester ${group.number}`}</h2>
                      <p className="mt-0.5 text-xs text-slate-500 tabular-nums">{group.items.length} mata kuliah</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold tabular-nums">
                    <span className="rounded-lg border border-blue-200/70 bg-blue-50/80 px-2.5 py-1 text-[#1e3a8a]">{group.totalCredits} SKS</span>
                    <span className="rounded-lg border border-emerald-200/70 bg-emerald-50/80 px-2.5 py-1 text-emerald-700">{group.totalRps} RPS</span>
                  </div>
                </header>
                <DataTable<CurriculumItem>
                  rows={group.items}
                  rowKey={(item) => String(item.id)}
                  columns={columns}
                  minWidth={1180}
                  pageSize={null}
                  className="[&>div]:rounded-none [&>div]:border-x-0 [&>div]:border-b-0"
                />
              </section>
            ))}
          </div>
        )}
      </div>

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

      <FormModal
        open={cloneModalOpen}
        title="Salin Kurikulum ke Tahun Baru"
        busy={cloneMutation.isPending}
        error={cloneError}
        onClose={() => setCloneModalOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          setCloneError(null);
          if (!cloneDraft.sourceId) {
            setCloneError('Pilih kurikulum sumber yang ingin disalin.');
            return;
          }
          if (!cloneDraft.year || cloneDraft.year < 1990 || cloneDraft.year > 2100) {
            setCloneError('Tahun kurikulum baru harus antara 1990 s/d 2100.');
            return;
          }
          cloneMutation.mutate();
        }}
      >
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          Menyalin seluruh struktur mata kuliah, pembagian semester 1–8, bobot SKS, dosen pengampu, dan berkas RPS dari kurikulum sumber ke tahun kurikulum baru secara otomatis.
        </p>

        <Field label="Kurikulum Sumber" htmlFor="clone-source" required hint="Kurikulum yang datanya akan disalin.">
          <SearchableSelect
            id="clone-source"
            value={cloneDraft.sourceId ? String(cloneDraft.sourceId) : ''}
            options={cloneSourceOptions}
            clearable={false}
            placeholder="Pilih kurikulum sumber..."
            searchPlaceholder="Cari tahun atau nama kurikulum..."
            icon={<CalendarDaysIcon className="h-4 w-4" />}
            onChange={(val) => {
              const srcId = Number(val);
              const found = curriculums.find((c) => c.id === srcId);
              setCloneDraft((prev) => ({
                ...prev,
                sourceId: srcId,
                name: found ? `${found.name.replace(/\b\d{4}\b/g, '').trim()} ${prev.year}`.trim() : prev.name,
              }));
            }}
          />
        </Field>

        <Field label="Tahun Kurikulum Baru" htmlFor="clone-year" required hint="Contoh: 2026">
          <input
            id="clone-year"
            type="number"
            min={1990}
            max={2100}
            className="field-input"
            value={cloneDraft.year}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCloneDraft((prev) => {
                const found = curriculums.find((c) => c.id === prev.sourceId);
                return {
                  ...prev,
                  year: val,
                  name: found ? `${found.name.replace(/\b\d{4}\b/g, '').trim()} ${val}`.trim() : prev.name,
                };
              });
            }}
            required
          />
        </Field>

        <Field label="Nama Kurikulum Baru" htmlFor="clone-name" hint="Dapat disesuaikan jika ingin nama khusus.">
          <input
            id="clone-name"
            type="text"
            className="field-input"
            placeholder="Contoh: Kurikulum Sistem Informasi 2026"
            value={cloneDraft.name}
            onChange={(e) => setCloneDraft({ ...cloneDraft, name: e.target.value })}
          />
        </Field>
      </FormModal>
    </AdminLayout>
  );
};

export default AdminCurriculum;
