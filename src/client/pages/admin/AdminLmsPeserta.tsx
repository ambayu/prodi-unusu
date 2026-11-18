import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon, TrashIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { toApiError } from '../../services/api';
import { lmsAdminApi, type LmsStudentRow } from '../../services/lmsAdminApi';

/**
 * Manajemen LMS — Plotting Peserta (`/admin/lms/peserta`).
 *
 * Peserta disimpan per kelas. Daftar dikirim utuh ke server setiap kali
 * disimpan, sehingga layar hanya perlu memegang satu salinan sementara.
 * NIM dan nama diketik bebas karena data induk mahasiswa milik SIAKAD; daftar
 * "mahasiswa yang sudah pernah di-plot" dipakai sebagai saran isian cepat.
 */
export const AdminLmsPeserta: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();
  const canEdit = has('curriculum.update');

  const [classroomId, setClassroomId] = useState<number | null>(null);
  const [rows, setRows] = useState<LmsStudentRow[]>([]);
  const [nim, setNim] = useState('');
  const [nama, setNama] = useState('');
  const [cari, setCari] = useState('');

  const classroomsQuery = useQuery({
    queryKey: ['admin', 'lms-classrooms'],
    queryFn: () => lmsAdminApi.classrooms().then((res) => res.data.classrooms),
  });

  const knownQuery = useQuery({
    queryKey: ['admin', 'lms-students'],
    queryFn: () => lmsAdminApi.knownStudents().then((res) => res.data.students),
  });

  const studentsQuery = useQuery({
    queryKey: ['admin', 'lms-classroom-students', classroomId],
    queryFn: () => lmsAdminApi.students(classroomId as number).then((res) => res.data.students),
    enabled: classroomId !== null,
  });

  const classrooms = classroomsQuery.data ?? [];
  const known = knownQuery.data ?? [];

  useEffect(() => {
    if (classroomId === null && classrooms.length > 0) {
      setClassroomId(classrooms[0].id);
    }
  }, [classrooms, classroomId]);

  useEffect(() => {
    setRows(studentsQuery.data ?? []);
  }, [studentsQuery.data]);

  const terpilih = classrooms.find((kelas) => kelas.id === classroomId) ?? null;

  const saran = useMemo(() => {
    const dipakai = new Set(rows.map((row) => row.nim));
    const kata = cari.trim().toLowerCase();
    return known
      .filter((siswa) => !dipakai.has(siswa.nim))
      .filter((siswa) => !kata || siswa.nim.includes(kata) || siswa.name.toLowerCase().includes(kata))
      .slice(0, 8);
  }, [known, rows, cari]);

  const saveMutation = useMutation({
    mutationFn: () => lmsAdminApi.saveStudents(classroomId as number, rows),
    onSuccess: () => {
      toast.success('Peserta kelas berhasil disimpan.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lms-classroom-students', classroomId] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lms-classrooms'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lms-students'] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const tambah = (siswa: LmsStudentRow) => {
    if (!siswa.nim || rows.some((row) => row.nim === siswa.nim)) return;
    setRows([...rows, siswa]);
    setNim('');
    setNama('');
    setCari('');
  };

  const loading = classroomsQuery.isLoading;
  const errorMessage = classroomsQuery.isError
    ? toApiError(classroomsQuery.error).message
    : studentsQuery.isError
    ? toApiError(studentsQuery.error).message
    : null;

  return (
    <AdminLayout
      title="Plotting Peserta Kelas"
      description={terpilih ? `${rows.length} peserta • ${terpilih.curriculumItem.course.code} ${terpilih.group}` : 'Pilih kelas'}
      actions={
        canEdit && terpilih ? (
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || studentsQuery.isLoading}
            className="btn-primary"
          >
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Peserta'}
          </button>
        ) : null
      }
    >
      <div className="space-y-5">
        {loading ? (
          <div className="card p-6 text-sm text-slate-500">Memuat kelas LMS...</div>
        ) : errorMessage ? (
          <div className="card p-6 text-sm text-rose-700">{errorMessage}</div>
        ) : classrooms.length === 0 ? (
          <div className="card p-8 text-center space-y-2">
            <p className="font-semibold text-slate-800">Belum ada kelas LMS</p>
            <p className="text-sm text-slate-500">
              Buka kelas terlebih dahulu pada menu Jadwal &amp; Ruang Kuliah.
            </p>
          </div>
        ) : (
          <>
            <section className="card p-5">
              <label
                htmlFor="lms-kelas"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
              >
                Kelas
              </label>
              <select
                id="lms-kelas"
                className="field-input mt-1.5"
                value={classroomId ?? ''}
                onChange={(event) => setClassroomId(Number(event.target.value))}
              >
                {classrooms.map((kelas) => (
                  <option key={kelas.id} value={kelas.id}>
                    {kelas.curriculumItem.course.code} — {kelas.curriculumItem.course.name} · {kelas.group} ·{' '}
                    {kelas._count.students} peserta
                  </option>
                ))}
              </select>
            </section>

            {canEdit ? (
              <section className="card p-5 space-y-4">
                <h2 className="text-sm font-bold text-slate-900">Tambah Peserta</h2>
                <form
                  className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.6fr_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    tambah({ nim: nim.trim(), name: nama.trim() });
                  }}
                >
                  <input
                    className="field-input"
                    placeholder="NIM"
                    value={nim}
                    onChange={(event) => setNim(event.target.value)}
                    aria-label="NIM mahasiswa"
                  />
                  <input
                    className="field-input"
                    placeholder="Nama mahasiswa"
                    value={nama}
                    onChange={(event) => setNama(event.target.value)}
                    aria-label="Nama mahasiswa"
                  />
                  <button
                    type="submit"
                    className="btn-secondary"
                    disabled={!nim.trim() || !nama.trim() || rows.some((row) => row.nim === nim.trim())}
                  >
                    <PlusIcon className="h-4 w-4" />
                    Tambah
                  </button>
                </form>

                <div>
                  <label
                    htmlFor="lms-cari-mahasiswa"
                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    <MagnifyingGlassIcon className="h-3.5 w-3.5" />
                    Pilih dari mahasiswa yang pernah di-plot
                  </label>
                  <input
                    id="lms-cari-mahasiswa"
                    className="field-input mt-1.5"
                    placeholder="Cari NIM atau nama"
                    value={cari}
                    onChange={(event) => setCari(event.target.value)}
                  />
                  {saran.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {saran.map((siswa) => (
                        <li key={siswa.nim}>
                          <button
                            type="button"
                            onClick={() => tambah(siswa)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                          >
                            {siswa.nim} — {siswa.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="card overflow-hidden">
              <header className="border-b border-slate-200 px-5 py-3.5">
                <h2 className="text-sm font-bold text-slate-900">Daftar Peserta</h2>
              </header>
              {studentsQuery.isLoading ? (
                <p className="p-5 text-sm text-slate-500">Memuat peserta...</p>
              ) : rows.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">Kelas ini belum memiliki peserta.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {rows.map((siswa, index) => (
                    <li key={siswa.nim} className="flex items-center justify-between gap-3 px-5 py-2.5">
                      <span className="text-xs text-slate-700">
                        <span className="mr-2 font-mono text-slate-500">{index + 1}.</span>
                        <span className="font-mono font-semibold">{siswa.nim}</span>
                        <span className="mx-2 text-slate-300">·</span>
                        {siswa.name}
                      </span>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => setRows(rows.filter((row) => row.nim !== siswa.nim))}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                          aria-label={`Hapus ${siswa.name} dari kelas`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminLmsPeserta;
