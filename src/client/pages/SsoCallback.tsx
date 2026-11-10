import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, toApiError } from '../services/api';
import { useSiteStore } from '../app/siteStore';
import { SsoLoadingScreen } from '../components/SsoLoadingScreen';
import { SsoProblemScreen, type SsoProblemDetail } from '../components/SsoProblemScreen';

function terjemahkanGagalSso(err: any): SsoProblemDetail {
  const status = err?.response?.status;
  const msg = String(err?.response?.data?.message || err?.message || '').toLowerCase();

  if (status === 401 || msg.includes('token') || msg.includes('tiket')) {
    return {
      jenis: 'token',
      judul: 'Waktu Tiket Masuk Berakhir',
      penjelasan:
        'Tautan otorisasi SSO bersifat sekali pakai dan berumur pendek. Tiket yang sudah pernah digunakan atau terlalu lama didiamkan tidak dapat dipakai kembali.',
      langkah: [
        'Tutup halaman ini dan kembali ke halaman login.',
        'Klik tombol Masuk ONE UNUSU untuk mendapatkan tiket masuk baru.',
        'Hindari membuka tautan login di beberapa tab sekaligus.',
      ],
      catatan: 'Akun Anda aman dan tidak terkunci. Cukup lakukan login ulang.',
    };
  }

  if (status === 403 || msg.includes('peran') || msg.includes('izin') || msg.includes('scope')) {
    return {
      jenis: 'peran',
      judul: 'Akun Belum Memiliki Akses Program Studi',
      penjelasan:
        'Akun ONE UNUSU Anda berhasil diverifikasi, namun belum diberikan hak akses (peran) sebagai Admin atau Editor pada Program Studi ini.',
      langkah: [
        'Hubungi Super Administrator UNUSU untuk mengalokasikan peran pada program studi Anda.',
        'Pastikan email ONE UNUSU yang Anda gunakan sesuai dengan penugasan SK resmi.',
      ],
      catatan: 'Setelah administrator menambahkan peran Anda, silakan masuk kembali.',
    };
  }

  if (!err?.response) {
    return {
      jenis: 'jaringan',
      judul: 'Koneksi ke Portal SSO Terputus',
      penjelasan:
        'Aplikasi tidak dapat menghubungi server otorisasi ONE UNUSU. Hal ini dapat disebabkan oleh koneksi internet atau gangguan server gateway.',
      langkah: [
        'Periksa stabilitas koneksi internet perangkat Anda.',
        'Muat ulang halaman ini atau coba beberapa saat lagi.',
        'Bila masalah berlanjut, hubungi tim IT Kampus UNUSU.',
      ],
    };
  }

  return {
    jenis: 'umum',
    judul: 'Gagal Menghubungkan Sesi SSO',
    penjelasan:
      'Terjadi kendala saat menyinkronkan data login Anda dengan portal program studi.',
    langkah: [
      'Silakan coba masuk kembali dari halaman login.',
      'Gunakan browser standar (Chrome/Firefox/Edge) versi terbaru.',
    ],
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
        judul: 'Tiket Masuk Tidak Ditemukan',
        penjelasan:
          'Portal ONE UNUSU tidak mengirimkan tiket login yang lengkap. Anda harus memulai proses login dari halaman masuk.',
        langkah: [
          'Kembali ke halaman masuk portal prodi.',
          'Klik tombol Masuk ONE UNUSU untuk memulai otorisasi.',
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
        setMasalah(terjemahkanGagalSso(requestError));
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
      title="Memverifikasi Sesi ONE UNUSU"
      description="Menghubungkan akun Anda dengan portal Program Studi UNUSU..."
    />
  );
};
