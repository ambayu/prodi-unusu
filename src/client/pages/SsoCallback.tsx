import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, toApiError } from '../services/api';
import { useSiteStore } from '../app/siteStore';
import { SsoLoadingScreen } from '../components/SsoLoadingScreen';
import { SsoProblemScreen, type SsoProblemDetail } from '../components/SsoProblemScreen';

function terjemahkanGagalSso(err: any, payload: any): SsoProblemDetail {
  const status = err?.response?.status;
  const msg = String(payload?.message || err?.message || '').toLowerCase();
  const appAccess = payload?.appAccess;

  if (status === 403 || msg.includes('peran') || msg.includes('izin') || msg.includes('scope') || (appAccess && appAccess.allowed === false)) {
    return {
      jenis: 'peran',
      judul: 'Akun ini belum memiliki akses ke Program Studi',
      penjelasan:
        'Akun ONE UNUSU Anda berhasil diverifikasi, namun belum terdaftar atau belum diberikan peran administratif (Admin Prodi / Editor) pada sistem program studi ini.',
      langkah: [
        'Pastikan email dan akun ONE UNUSU yang Anda gunakan sesuai dengan SK penugasan resmi.',
        'Minta Super Administrator Universitas untuk mengalokasikan peran pada program studi Anda.',
        'Setelah hak akses ditambahkan oleh administrator, silakan lakukan proses masuk ulang.',
      ],
      ssoRole: appAccess?.ssoRole || 'Pengguna Terverifikasi',
      ssoRoleLabel: appAccess?.ssoRoleLabel || 'Belum ada alokasi prodi',
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

  if (!err?.response) {
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
      .then(async () => {
        await refreshUser();
        navigate('/admin', { replace: true });
      })
      .catch((requestError) => {
        const payload = requestError.response?.data;
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
