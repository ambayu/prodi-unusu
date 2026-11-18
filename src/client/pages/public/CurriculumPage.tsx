import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FunnelIcon, MagnifyingGlassIcon, DocumentArrowDownIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { Field, FormModal } from '../../components/ui/FormModal';
import { DokumenPreviewModal } from '../../components/DokumenPreviewModal';

/**
 * Label lengkap untuk judul satuan semester, mis. "Semester-1-2026" → "Semester 1".
 * Nilai numerik dari `semester_number` sudah tampil rapi tanpa perlu diubah.
 */
function formatSemesterLabel(smt: string | number | null | undefined): string {
  if (smt === null || smt === undefined || smt === '') return 'Tanpa Semester';
  const str = String(smt).trim();
  if (/^\d+$/.test(str)) return `Semester ${str}`;
  const match = str.match(/^Semester[- ](\d+)/i);
  if (match) return `Semester ${match[1]}`;
  return str.replace(/-/g, ' ');
}

import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { arsipDokumenApi, curriculumApi, rpsBerkasApi, type CurriculumRpsRow } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/** Satu baris mata kuliah pada tabel kurikulum. */
type BarisMataKuliah = {
  id: number;
  code: string;
  name: string;
  credits: number;
  description: string | null;
  rpsDocuments: CurriculumRpsRow[];
  semesterNumber: number | string | null;
};

/** Kelompok mata kuliah untuk satu semester beserta angka ringkasnya. */
type KelompokSemester = {
  /** `null` untuk mata kuliah tanpa semester. */
  number: number | null;
  courses: BarisMataKuliah[];
  totalCredits: number;
  totalRps: number;
};

const SEMESTER_RANGE = [1, 2, 3, 4, 5, 6, 7, 8];

/** Angka semester bila nilainya murni angka; selain itu `null`. */
function asSemesterNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

/**
 * Halaman publik kurikulum.
 *
 * Seluruh angka dan daftar mata kuliah berasal dari database. Tidak ada data
 * contoh yang ditulis di kode maupun angka statistik yang dikarang.
 */
export const CurriculumPage: React.FC = () => {
  const { tenant } = useTenant();
  useSeo({ tenant, title: 'Kurikulum', description: 'Struktur kurikulum program studi beserta mata kuliah, SKS, dan dokumen RPS.' });

  const [search, setSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<number | 'all'>('all');

  /*
   * RPS dilindungi kata sandi prodi yang sama dengan arsip dokumen. Kata sandi
   * hanya hidup di memori halaman: tidak ditulis ke penyimpanan peramban dan
   * hilang begitu halaman ditutup.
   */
  const [password, setPassword] = useState('');
  /** RPS yang sedang diminta dibuka, memicu dialog kata sandi. */
  const [rpsDiminta, setRpsDiminta] = useState<CurriculumRpsRow | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  /** RPS yang pratinjaunya sedang terbuka. */
  const [rpsDibuka, setRpsDibuka] = useState<CurriculumRpsRow | null>(null);

  const curriculumQuery = useQuery({
    queryKey: ['public', 'curriculum'],
    queryFn: () => curriculumApi.public().then((res) => res.data),
  });

  const curriculums = curriculumQuery.data?.curriculums ?? [];
  const activeCurriculum = curriculums[0] ?? null;
  const courses = useMemo(() => {
    if (!activeCurriculum) return [];

    /*
     * Dua sumber digabung:
     * - `items`  → penawaran baru (ADR-006), membawa `course` (master) dan
     *              `academicSemester` (periode kalender).
     * - `semesters[].courses` → data warisan yang masih memakai posisi 1..14.
     * Menggabungkan keduanya membuat mata kuliah lama tidak hilang dari halaman
     * publik selama migrasi belum tuntas.
     */
    const fromItems = (activeCurriculum.items ?? []).map((item) => {
      // Semester pilihan admin didahulukan; kalau kosong, jatuh ke posisi
      // warisan, lalu ke nama semester kalender untuk data lama.
      const legacyPosition = activeCurriculum.semesters.find((semester) =>
        semester.courses.some((course) => course.id === item.id),
      )?.semesterNumber;

      return {
        id: item.id,
        code: item.course.code,
        name: item.course.name,
        credits: item.credits,
        description: item.description,
        rpsDocuments: item.rpsDocuments,
        semesterNumber: item.semesterNumber ?? legacyPosition ?? item.academicSemester?.name ?? null,
      };
    });

    const legacyIds = new Set(fromItems.map((course) => course.id));
    const fromLegacy = activeCurriculum.semesters.flatMap((semester) =>
      semester.courses
        .filter((course) => !legacyIds.has(course.id))
        .map((course) => ({
          id: course.id,
          code: course.code,
          name: course.name,
          credits: course.credits,
          description: course.description,
          rpsDocuments: course.rpsDocuments ?? [],
          semesterNumber: semester.semesterNumber,
        })),
    );

    return [...fromItems, ...fromLegacy];
  }, [activeCurriculum]);


  /*
   * Pengelompokan per semester menjadi bangunan utama halaman: satu kartu
   * ringkas per semester di atas, satu tabel per semester di bawahnya.
   */
  const kelompok = useMemo<KelompokSemester[]>(() => {
    const keyword = search.trim().toLowerCase();
    const cocok = (course: BarisMataKuliah) =>
      keyword === '' ||
      course.name.toLowerCase().includes(keyword) ||
      course.code.toLowerCase().includes(keyword);

    const map = new Map<number | null, BarisMataKuliah[]>();
    for (const course of courses) {
      const number = asSemesterNumber(course.semesterNumber);
      const list = map.get(number) ?? [];
      list.push(course);
      map.set(number, list);
    }

    const numbers = [...map.keys()]
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);
    const urutan: (number | null)[] = map.has(null) ? [...numbers, null] : numbers;

    return urutan.map((number) => {
      const isi = (map.get(number) ?? []).filter(cocok);
      return {
        number,
        courses: isi,
        totalCredits: isi.reduce((acc, course) => acc + course.credits, 0),
        totalRps: isi.filter((course) => course.rpsDocuments.length > 0).length,
      };
    });
  }, [courses, search]);

  /** Kelompok yang ditampilkan: semua, atau satu semester yang dipilih. */
  const kelompokTampil = useMemo(
    () =>
      semesterFilter === 'all'
        ? kelompok.filter((g) => g.courses.length > 0)
        : kelompok.filter((g) => g.number === semesterFilter),
    [kelompok, semesterFilter],
  );

  /*
   * Kartu ringkasan semester: selalu menampilkan Semester 1 s/d 8 ditambah
   * "Semua". Angka per kartu dihitung dari seluruh mata kuliah semester itu,
   * bukan dari hasil pencarian, agar indikator tidak berubah saat mengetik.
   */
  const kartuSemester = useMemo(() => {
    const perNomor = new Map<number, { mk: number; sks: number }>();
    for (const course of courses) {
      const number = asSemesterNumber(course.semesterNumber);
      if (number === null) continue;
      const isi = perNomor.get(number) ?? { mk: 0, sks: 0 };
      isi.mk += 1;
      isi.sks += course.credits;
      perNomor.set(number, isi);
    }

    const nomor = [...new Set([...SEMESTER_RANGE, ...perNomor.keys()])].sort((a, b) => a - b);
    return nomor.map((number) => ({
      number,
      mk: perNomor.get(number)?.mk ?? 0,
      sks: perNomor.get(number)?.sks ?? 0,
    }));
  }, [courses]);

  const totalMk = courses.length;
  const totalSks = courses.reduce((acc, course) => acc + course.credits, 0);

  /*
   * Verifikasi kata sandi cukup sekali per halaman: setelah benar, kata sandi
   * disimpan di state dan dipakai ulang untuk setiap RPS. Server tidak
   * menerbitkan tiket sesi, sehingga kata sandi dapat dipakai kapan saja.
   */
  const unlockMutation = useMutation({
    mutationFn: (sandi: string) => arsipDokumenApi.unlock(sandi).then((res) => res.data),
    onSuccess: (_data, sandi) => {
      setPassword(sandi);
      setPasswordInput('');
      // RPS yang tadi diminta langsung dibuka setelah kata sandi benar.
      if (rpsDiminta) {
        setRpsDibuka(rpsDiminta);
        setRpsDiminta(null);
      }
    },
  });

  const galatUnlock = unlockMutation.isError ? toApiError(unlockMutation.error).message : null;

  /** Menekan "Lihat RPS": kata sandi diminta sekali, lalu diingat untuk halaman ini. */
  const mintaBukaRps = (rps: CurriculumRpsRow) => {
    if (password) {
      setRpsDibuka(rps);
      return;
    }
    setRpsDiminta(rps);
    setPasswordInput('');
    unlockMutation.reset();
  };

  const tutupDialogRps = () => {
    setRpsDiminta(null);
    setPasswordInput('');
    unlockMutation.reset();
  };

  /* Pratinjau dan unduhan memakai berkas yang sama, sehingga mode diabaikan. */
  const ambilBerkasRps = useCallback(
    () => rpsBerkasApi(rpsDibuka?.fileUrl ?? '', password),
    [rpsDibuka, password],
  );

  /*
   * Kolom tabel mata kuliah didefinisikan sebagai data agar lebar kolom tetap
   * dan kolom "Nama MK" saja yang melebar mengikuti panjang nama.
   */
  const columns: Array<DataTableColumn<BarisMataKuliah>> = [
    {
      key: 'kode',
      header: 'Kode MK',
      width: 140,
      cellClassName: 'font-medium text-slate-700',
      render: (course) => (
        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
          {course.code}
        </span>
      ),
    },
    {
      key: 'nama',
      header: 'Nama Mata Kuliah',
      cellClassName: 'font-semibold text-slate-800',
      render: (course) => course.name,
    },
    {
      key: 'sks',
      header: 'SKS',
      width: 72,
      align: 'center',
      render: (course) => (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-xs font-bold text-[#1e3a8a]">
          {course.credits}
        </span>
      ),
    },
    {
      key: 'keterangan',
      header: 'Keterangan',
      width: 200,
      render: (course) =>
        course.description ? (
          <span className="text-slate-700">{course.description}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'rps',
      header: 'RPS',
      width: 140,
      align: 'right',
      render: (course) =>
        course.rpsDocuments && course.rpsDocuments.length > 0 ? (
          <button
            type="button"
            onClick={() => mintaBukaRps(course.rpsDocuments[0])}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-[#1e3a8a]/20 px-2 py-1 text-xs font-bold text-[#1e3a8a] transition-colors hover:bg-[#e8eefb]"
          >
            <DocumentArrowDownIcon className="h-3.5 w-3.5 shrink-0" />
            Lihat RPS
          </button>
        ) : (
          <span className="text-xs text-slate-400">Belum tersedia</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Data Akademik"
        title="Kurikulum Program Studi"
        description="Struktur mata kuliah per semester beserta bobot SKS dan dokumen RPS yang tersedia."
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/*
         * Keadaan memuat/galat/kosong ditangani DataTable. Header ringkasan dan
         * penyaring hanya tampil bila kurikulum sudah dimuat dan tersedia.
         */}
        {curriculumQuery.isLoading || curriculumQuery.isError ? (
          <DataTable<BarisMataKuliah>
            rows={[]}
            rowKey={(course) => String(course.id)}
            columns={columns}
            loading={curriculumQuery.isLoading}
            loadingLabel="Memuat kurikulum"
            loadingRows={4}
            error={curriculumQuery.isError ? toApiError(curriculumQuery.error).message : null}
            onRetry={() => void curriculumQuery.refetch()}
          />
        ) : !activeCurriculum ? (
          <DataTable<BarisMataKuliah>
            rows={[]}
            rowKey={(course) => String(course.id)}
            columns={columns}
            emptyTitle="Kurikulum belum tersedia"
            emptyDescription="Program studi belum mempublikasikan data kurikulum. Silakan hubungi admin prodi atau periksa kembali nanti."
          />
        ) : (
          <>
            {/* Panel penyaring: pilih semester (kartu) atau cari mata kuliah. */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-500 lg:pt-2">
                  <FunnelIcon className="h-4 w-4" />
                  Pilih semester atau cari mata kuliah
                </p>
                <div className="relative lg:w-80">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari kode atau nama MK..."
                    aria-label="Cari kode atau nama mata kuliah"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-9">
                <button
                  type="button"
                  onClick={() => setSemesterFilter('all')}
                  aria-pressed={semesterFilter === 'all'}
                  className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                    semesterFilter === 'all'
                      ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                      : 'border-slate-200 bg-white hover:border-[#1e3a8a]/40'
                  }`}
                >
                  <span className="block text-sm font-bold">Semua</span>
                  <span className={`mt-0.5 block text-[11px] ${semesterFilter === 'all' ? 'text-blue-100' : 'text-slate-500'}`}>
                    {totalMk} MK · {totalSks} SKS
                  </span>
                  <span
                    className={`mt-2 block h-1 rounded-full ${
                      semesterFilter === 'all' ? 'bg-amber-400' : 'bg-[#1e3a8a]/20'
                    }`}
                  />
                </button>

                {kartuSemester.map((kartu) => {
                  const aktif = semesterFilter === kartu.number;
                  return (
                    <button
                      key={kartu.number}
                      type="button"
                      onClick={() => setSemesterFilter(kartu.number)}
                      aria-pressed={aktif}
                      className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                        aktif
                          ? 'border-[#1e3a8a] bg-[#e8eefb]'
                          : 'border-slate-200 bg-white hover:border-[#1e3a8a]/40'
                      }`}
                    >
                      <span className="block text-sm font-bold text-slate-800">Semester {kartu.number}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-500">
                        {kartu.mk} MK · {kartu.sks} SKS
                      </span>
                      <span
                        className={`mt-2 block h-1 rounded-full ${aktif ? 'bg-[#1e3a8a]' : 'bg-[#1e3a8a]/20'}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {kelompokTampil.length === 0 ? (
              <div className="mt-6">
                <DataTable<BarisMataKuliah>
                  rows={[]}
                  rowKey={(course) => String(course.id)}
                  columns={columns}
                  loading={curriculumQuery.isLoading}
                  loadingLabel="Memuat kurikulum"
                  emptyTitle="Tidak ada mata kuliah yang cocok"
                  emptyDescription="Ubah kata kunci pencarian atau pilih semester lain."
                />
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                {kelompokTampil.map((grup) => (
                  <section
                    key={grup.number ?? 'tanpa-semester'}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                    aria-label={grup.number ? `Semester ${grup.number}` : 'Tanpa semester'}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 px-5 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#1e3a8a] text-white">
                          <span className="text-[9px] font-bold uppercase leading-none tracking-wide text-blue-200">
                            SMT
                          </span>
                          <span className="text-lg font-extrabold leading-none">{grup.number ?? '—'}</span>
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900">
                            {formatSemesterLabel(grup.number)}
                          </h3>
                          <p className="text-xs text-slate-500">{grup.courses.length} mata kuliah</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#1e3a8a]">
                          {grup.totalCredits} SKS
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          <DocumentTextIcon className="h-3.5 w-3.5 shrink-0" />
                          {grup.totalRps} RPS
                        </span>
                      </div>
                    </div>

                    <DataTable<BarisMataKuliah>
                      rows={grup.courses}
                      rowKey={(course) => String(course.id)}
                      columns={columns}
                      minWidth={860}
                    />
                  </section>
                ))}
              </div>
            )}

            <p className="mt-4 text-[11px] text-slate-500">
              Menampilkan {kelompokTampil.reduce((acc, grup) => acc + grup.courses.length, 0)} dari {courses.length} mata kuliah
              {activeCurriculum ? ` pada ${activeCurriculum.name} (${activeCurriculum.year})` : ''}.
            </p>
          </>
        )}
      </section>

      {/* -----------------------------------------------------------------
          Dialog kata sandi: muncul saat menekan "Lihat RPS".
          Memakai FormModal bersama agar fokus awal, tombol Escape, dan
          pasangan tombol Batal/Simpan konsisten dengan formulir lain.
          ----------------------------------------------------------------- */}
      <FormModal
        open={Boolean(rpsDiminta)}
        title="RPS dilindungi kata sandi"
        description="Masukkan kata sandi program studi untuk melihat dokumen RPS."
        submitLabel="Buka RPS"
        busy={unlockMutation.isPending}
        onSubmit={(event) => {
          event.preventDefault();
          if (!passwordInput) return;
          unlockMutation.mutate(passwordInput);
        }}
        onClose={tutupDialogRps}
      >
        <Field label="Kata sandi dokumen" htmlFor="rps-password" required>
          <input
            id="rps-password"
            type="password"
            className="field-input"
            autoComplete="current-password"
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
            placeholder="Masukkan kata sandi"
          />
        </Field>

        {galatUnlock ? (
          <p
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700"
          >
            {galatUnlock}
          </p>
        ) : null}

        <p className="text-[11px] leading-relaxed text-slate-500">
          Kata sandi diperoleh dari pengelola program studi.
        </p>
      </FormModal>

      {rpsDibuka ? (
        <DokumenPreviewModal
          open
          judul={rpsDibuka.title}
          password={password}
          ambilBerkas={ambilBerkasRps}
          onClose={() => setRpsDibuka(null)}
        />
      ) : null}
    </>
  );
};

export default CurriculumPage;

