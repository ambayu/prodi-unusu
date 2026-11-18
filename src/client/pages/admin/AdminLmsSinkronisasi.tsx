import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowTopRightOnSquareIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { api } from '../../services/api';

/**
 * Manajemen LMS — Sinkronisasi (`/admin/lms/sinkronisasi`).
 *
 * LMS tidak menarik data secara langsung: ia meminta ONE UNUSU API Hub, dan
 * API Hub meneruskannya ke endpoint publik Portal Prodi. Halaman ini
 * menampilkan endpoint yang dipakai, satu contoh permintaannya, serta uji
 * koneksi agar administrator dapat memastikan data kelas benar-benar terbaca.
 */

interface UjiHasil {
  ok: boolean;
  pesan: string;
  jumlahProdi?: number;
  jumlahKelas?: number;
}

const ENDPOINT_PUBLIK = '/api/v1/public/lms-kurikulum';
const ENDPOINT_API_HUB = '/api/v1/inter-service/lms-kurikulum';

export const AdminLmsSinkronisasi: React.FC = () => {
  // Uji koneksi memakai endpoint admin: permintaan dari browser tidak membawa
  // PRODI_API_KEY, jadi kunci klien tidak pernah dikirim ke sisi publik.
  const ujiQuery = useQuery({
    queryKey: ['admin', 'lms-sync-check'],
    queryFn: async (): Promise<UjiHasil> => {
      const res = await api.get<{ classrooms: Array<{ _count: { students: number } }> }>(
        '/admin/lms/classrooms',
      );
      const jumlahKelas = res.data.classrooms.length;
      const tanpaPeserta = res.data.classrooms.filter((kelas) => kelas._count.students === 0).length;
      return {
        ok: true,
        jumlahKelas,
        pesan:
          jumlahKelas === 0
            ? 'Belum ada kelas yang bisa dikirim ke LMS.'
            : `${jumlahKelas} kelas siap dikirim${tanpaPeserta > 0 ? ` (${tanpaPeserta} kelas belum ada peserta)` : ''}.`,
      };
    },
    retry: false,
  });

  const hasil = ujiQuery.data;

  return (
    <AdminLayout
      title="Sinkronisasi LMS"
      description="Portal Prodi mengirim data kelas; LMS menariknya lewat ONE UNUSU"
    >
      <div className="space-y-5">
        <section className="card p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Alur Data</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-xs text-slate-700">
            <li>Portal Prodi menyimpan jadwal, ruang, dosen pengampu, dan peserta per kelas.</li>
            <li>LMS meminta ONE UNUSU API Hub untuk menarik katalog perkuliahan.</li>
            <li>API Hub memanggil endpoint publik Portal Prodi dengan kunci server, lalu meneruskan hasilnya.</li>
          </ol>
          <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3">
              <dt className="font-semibold text-slate-500">Endpoint publik (dipakai API Hub)</dt>
              <dd className="mt-1 break-all font-mono text-slate-800">{ENDPOINT_PUBLIK}</dd>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <dt className="font-semibold text-slate-500">Endpoint API Hub (dipakai LMS)</dt>
              <dd className="mt-1 break-all font-mono text-slate-800">{ENDPOINT_API_HUB}</dd>
            </div>
          </dl>
          <p className="text-[11px] text-slate-500">
            Filter opsional <code className="font-mono">?nidn=</code> mempersempit hasil ke kelas milik dosen
            tertentu; tanpa filter seluruh prodi dikirim.
          </p>
          <a
            href={ENDPOINT_PUBLIK}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 hover:underline"
          >
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            Buat permintaan uji (memerlukan kunci server)
          </a>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-bold text-slate-900">Kesiapan Data</h2>
          {ujiQuery.isLoading ? (
            <p className="mt-2 text-xs text-slate-500">Memeriksa data kelas...</p>
          ) : ujiQuery.isError ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-rose-700">
              <XCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              Data kelas tidak dapat dibaca. Periksa sesi dan izin akun Anda.
            </p>
          ) : hasil ? (
            <p
              className={`mt-2 flex items-start gap-1.5 text-xs ${
                hasil.jumlahKelas ? 'text-emerald-800' : 'text-amber-800'
              }`}
            >
              <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {hasil.pesan}
            </p>
          ) : null}
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminLmsSinkronisasi;
