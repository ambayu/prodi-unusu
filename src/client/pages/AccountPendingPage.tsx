import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSiteStore } from '../app/siteStore';
import { SsoProblemScreen, type SsoProblemDetail } from '../components/SsoProblemScreen';

/**
 * Halaman pemberitahuan untuk akun yang sudah lolos gerbang SSO tetapi belum
 * divalidasi administrator.
 *
 * Akun seperti ini sudah berhasil diverifikasi portal ONE UNUSU, namun sengaja
 * dibuat tanpa peran agar tidak memperoleh akses otomatis. Halaman ini
 * menjelaskan langkah berikutnya, bukan menampilkan galat teknis seperti
 * "Data gagal dimuat" yang membingungkan pengguna.
 */
export const AccountPendingPage: React.FC = () => {
  const user = useSiteStore((state) => state.user);
  const logout = useSiteStore((state) => state.logout);

  // Akun yang sudah punya peran tidak perlu melihat halaman ini.
  if (user && (user.isSuperAdmin || user.roles.length > 0)) {
    return <Navigate to="/admin" replace />;
  }

  const masalah: SsoProblemDetail = {
    jenis: 'peran',
    judul: 'Akun Anda sedang divalidasi',
    penjelasan: user
      ? `Akun ${user.name} telah terverifikasi melalui SSO ONE UNUSU, tetapi belum diberikan peran apa pun. Administrator perlu menetapkan peran beserta program studi yang Anda kelola sebelum portal dapat digunakan.`
      : 'Akun Anda telah terverifikasi melalui SSO ONE UNUSU, tetapi belum diberikan peran apa pun oleh administrator.',
    langkah: [
      'Hubungi admin utama universitas untuk mengajukan validasi akun.',
      'Sebutkan nama, email, dan program studi yang akan Anda kelola.',
      'Setelah peran diberikan, masuk kembali melalui SSO ONE UNUSU.',
      'Bila sudah divalidasi tetapi masih melihat halaman ini, keluar lalu masuk lagi agar sesi terbarui.',
    ],
    catatan: 'Halaman ini bukan galat sistem. Akses baru terbuka setelah administrator memberikan peran.',
    ssoRoleLabel: 'Belum divalidasi',
    appName: 'Portal Administrasi Program Studi',
  };

  return <SsoProblemScreen masalah={masalah} onCobaLagi={() => void logout()} />;
};

export default AccountPendingPage;
