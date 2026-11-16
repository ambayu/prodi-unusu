import React, { useEffect, useState } from 'react';

/**
 * Gambar pendamping blok "Tentang Fakultas" / "Tentang Prodi".
 *
 * Gambar dari admin (atau bawaan seeder) bisa saja menunjuk berkas yang sudah
 * tidak ada — server SPA lalu membalas halaman HTML dengan status 200, sehingga
 * `<img>` gagal menampilkan apa pun dan yang terlihat hanyalah kotak kosong.
 * Komponen ini mendeteksi kegagalan itu dan langsung mundur ke gambar cadangan,
 * jadi blok "Tentang" tidak pernah tampil tanpa gambar.
 */

/** Gambar cadangan bawaan portal: gedung UNUSU. */
export const GAMBAR_TENTANG_BAWAAN = '/tentang-custom.png';

interface GambarTentangProps {
  /** URL gambar utama; boleh kosong. */
  src?: string | null;
  /** Teks alternatif untuk pembaca layar. */
  alt: string;
  className?: string;
}

export const GambarTentang: React.FC<GambarTentangProps> = ({ src, alt, className }) => {
  const utama = typeof src === 'string' && src.trim() ? src.trim() : GAMBAR_TENTANG_BAWAAN;
  const [terpakai, setTerpakai] = useState(utama);
  const [gagalTotal, setGagalTotal] = useState(false);

  // Ikuti perubahan dari server (mis. admin baru mengunggah gambar baru).
  useEffect(() => {
    setTerpakai(utama);
    setGagalTotal(false);
  }, [utama]);

  /**
   * Dipanggil saat `<img>` gagal memuat. Bila gambar utama yang gagal, coba
   * cadangan; bila cadangan pun gagal, tampilkan bidang warna tema.
   */
  const saatGagal = () => {
    if (terpakai !== GAMBAR_TENTANG_BAWAAN) {
      setTerpakai(GAMBAR_TENTANG_BAWAAN);
      return;
    }
    setGagalTotal(true);
  };

  if (gagalTotal) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 ${className ?? ''}`}
        role="img"
        aria-label={alt}
      >
        <span className="px-6 text-center text-xs font-semibold text-slate-400">{alt}</span>
      </div>
    );
  }

  return <img src={terpakai} alt={alt} className={className} loading="lazy" onError={saatGagal} />;
};

export default GambarTentang;
