import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, toApiError } from '../services/api';
import { useSiteStore } from '../app/siteStore';
import { SsoLoadingScreen } from '../components/SsoLoadingScreen';
import { SsoProblemScreen, type SsoProblemDetail } from '../components/SsoProblemScreen';

function terjemahkanGagalSso(err: unknown, payload: Record<string, any>): SsoProblemDetail {
  const status = (err as any)?.response?.status;
  const code = String(payload?.code || '');
  const msg = String(payload?.message || (err as Error)?.message || '').toLowerCase();
  const appAccess = payload?.appAccess;

  /*
   * Portal pusat menolak akun yang tidak memiliki izin masuk
   * (`masuk_admin` / `masuk_dosen`). Ini berbeda dari akun yang belum diberi
   * peran aplikasi, sehingga pesannya harus menjelaskan bahwa masalahnya ada
   * pada peran di portal pusat — bukan pada tiket atau sistem prodi.
   */
  if (code === 'SSO_NO_ENTRY_PERMISSION' || code === 'SSO_ACCESS_DENIED') {
    const peranSso = appAccess?.ssoRole || appAccess?.ssoRoles?.join(', ') || 'tidak diketahui';
    return {
      jenis: 'peran',
      judul: 'Akun ini tidak memiliki izin masuk ke Portal Program Studi',
      penjelasan:
        'Akun ONE UNUSU Anda berhasil diverifikasi, namun tidak memiliki izin masuk sebagai Administrator atau Dosen. ' +
        'Portal ini hanya diperuntukkan bagi pengelola konten program studi.',
      langkah: [
        'Periksa apakah akun yang Anda gunakan memang akun kepegawaian, bukan akun mahasiswa.',
        'Hubungi Administrator Universitas untuk meminta izin masuk aplikasi Portal Prodi.',
        'Setelah izin diberikan, lakukan proses masuk ulang melalui ONE UNUSU.',
      ],
      catatan: `Peran terdeteksi: ${peranSso}. Akun Anda tidak dibuat di portal ini.`,
      ssoRole: appAccess?.ssoRole || 'Tidak diketahui',
      ssoRoleLabel: 'Tanpa izin masuk portal prodi',
      appName: appAccess?.appName || 'Portal Program Studi UNUSU',
    };
  }

  // Akun nonaktif ditangani terpisah agar pesannya jelas dan tidak disangka galat.
  if (code === 'USER_INACTIVE') {
    return {
      jenis: 'peran',
      judul: 'Akun Anda sedang dinonaktifkan',
      penjelasan:
        'Akun Anda pernah terdaftar di portal program studi, tetapi saat ini dinonaktifkan oleh administrator.',
      langkah: [
        'Hubungi Administrator Universitas untuk menanyakan status akun Anda.',
        'Bila akun diaktifkan kembali, lakukan proses masuk ulang.',
      ],
      ssoRoleLabel: 'Nonaktif',
      appName: 'Portal Program Studi UNUSU',
    };
  }

  if (status === 403 || msg.includes('peran') || msg.includes('izin') || msg.includes('scope') || appAccess?.allowed === false) {
    return {
      jenis: 'peran',
      judul: 'Akun ini belum memiliki akses ke Program Studi',
      penjelasan:
        'Akun ONE UNUSU Anda berhasil diverifikasi, namun belum terdaftar atau belum diberikan peran administratif pada sistem program studi ini.',
      langkah: [
        'Pastikan email dan akun ONE UNUSU yang Anda gunakan sesuai dengan SK penugasan resmi.',
        'Minta Administrator Universitas untuk mengalokasikan peran pada program studi Anda.',
        'Setelah hak akses ditambahkan oleh administrator, silakan lakukan proses masuk ulang.',
      ],
      ssoRole: appAccess?.ssoRole || 'Pengguna Terverifikasi',
      ssoRoleLabel: 'Belum ada alokasi prodi',
      appName: 'Portal Program Studi UNUSU',
    };
  }

  if (status === 401 || msg.includes('token') || msg.includes('tiket')) {
    return {
      jenis: 'token',
      judul: 'Waktu Tiket Masuk Berakhir',
      penjelasan:
        'Tautan otorisasi SSO bersifat sekali pakai dan berumur pendek. Tiket yang sudah pernah digunakan, terbuka di tab lain, atau didiamkan terlalu lama tidak dapat dipakai kembali.',
      langkah: [
        'Tutup tab ini dan kembali ke halaman login portal program studi.',
        'Klik tombol Masuk ONE UNUSU untuk mendapatkan tiket masuk baru.',
        'Hindari membuka tautan login di beberapa jendela browser sekaligus.',
      ],
      catatan: 'Akun Anda aman dan tidak terkunci. Cukup lakukan proses masuk ulang.',
    };
  }

  if (!(err as { response?: unknown })?.response) {
    return {
      jenis: 'jaringan',
      judul: 'Koneksi ke Portal SSO Terputus',
      penjelasan:
        'Perangkat tidak dapat menghubungi server otorisasi ONE UNUSU. Hal ini dapat disebabkan oleh koneksi internet atau gangguan server gateway.',
      langkah: [
        'Periksa kestabilan koneksi internet perangkat Anda.',
        'Muat ulang halaman ini atau coba beberapa saat lagi.',
        'Bila masalah berlanjut, hubungi tim IT Kampus UNUSU.',
      ],
    };
  }

  return {
    jenis: 'umum',
    judul: 'Proses masuk belum berhasil diselesaikan',
    penjelasan:
      'Terjadi kendala saat menyinkronkan data login Anda dengan portal program studi. Kejadian seperti ini umumnya bersifat sementara.',
    langkah: [
      'Silakan coba masuk kembali dari halaman login.',
      'Gunakan browser standar (Chrome/Firefox/Edge) versi terbaru.',
      'Bila masih berulang, hubungi tim administrator kampus.',
    ],
    catatan: 'Tidak ada data akun yang berubah selama proses ini.',
  };
}

export const SsoCallback: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const refreshUser = useSiteStore((state) => state.refreshUser);
  const started = useRef(false);
  const [masalah, setMasalah] = useState<SsoProblemDetail | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const clientId = params.get('client_id');
    const token = params.get('token');

    if (!clientId || !token) {
      setMasalah({
        jenis: 'kosong',
        judul: 'Permintaan Masuk Belum Selesai',
        penjelasan:
          'Halaman ini terbuka tanpa menyelesaikan langkah persetujuan tiket di portal SSO kampus. Biasanya ini terjadi karena proses sebelumnya dibatalkan atau tautan dimuat ulang di tengah jalan.',
        langkah: [
          'Buka halaman masuk portal prodi dan tekan tombol Masuk ONE UNUSU.',
          'Selesaikan seluruh langkah di portal kampus tanpa menutup tab.',
          'Anda akan diarahkan kembali ke panel administrasi secara otomatis.',
        ],
      });
      return;
    }

    api
      .post('/auth/sso', { client_id: clientId, token })
      .then(async (res) => {
        /*
         * Menu sidebar diturunkan dari permission dan tenant aktif. Keduanya
         * baru tersedia setelah `refreshUser`. Tanpa memuat `access-context`
         * lebih dahulu, AdminLayout sempat melihat `activeTenantId = null` lalu
         * menyimpulkan scope "portal" — sidebar pun kosong ("belum memiliki izin
         * modul aktif") sampai halaman dimuat ulang. Karena itu konteks dipuat
         * di sini, sebelum berpindah ke dashboard.
         */
        await refreshUser();

        /*
         * Akun yang lolos gerbang SSO tetapi belum diberi peran diarahkan ke
         * halaman validasi. Tanpa ini pengguna mendarat di dashboard lalu
         * melihat galat "Data gagal dimuat" yang membingungkan.
         */
        const needsValidation = Boolean((res.data as { needsValidation?: boolean })?.needsValidation);
        navigate(needsValidation ? '/validasi-akun' : '/admin', { replace: true });
      })
      .catch((requestError) => {
        const payload = (requestError as { response?: { data?: Record<string, any> } })?.response?.data ?? {};
        setMasalah(terjemahkanGagalSso(requestError, payload));
      });
  }, [params, navigate, refreshUser]);

  if (masalah) {
    return (
      <SsoProblemScreen
        masalah={masalah}
        onCobaLagi={() => navigate('/login', { replace: true })}
      />
    );
  }

  return (
    <SsoLoadingScreen
      title="Memverifikasi Tiket Masuk"
      description="Aplikasi sedang memvalidasi token sekali pakai Anda dengan Portal ONE UNUSU. Jangan tutup halaman ini."
    />
  );
};

export default SsoCallback;
