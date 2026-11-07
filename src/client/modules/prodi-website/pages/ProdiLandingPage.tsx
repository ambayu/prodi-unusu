import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpenIcon,
  DocumentCheckIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useTenant } from '../../../hooks/useSite';

export const ProdiLandingPage: React.FC = () => {
  const { tenant } = useTenant();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Slide Banner Penuh Murni Gambar Tanpa Teks / Tombol Overlay
  const slides = [
    { id: 1, image: '/heroslider-full.png' },
    { id: 2, image: '/hero-slide-generated.png' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="pb-16 font-sans bg-white">
      {/* 1. HERO SLIDER FULL IMAGE MURNI (TANPA TOMBOL, TANPA TEKS) */}
      <section className="relative w-full overflow-hidden bg-slate-900 select-none">
        <div className="relative w-full aspect-[21/9] min-h-[300px] sm:min-h-[420px] lg:min-h-[500px] xl:min-h-[540px]">
          {/* Full Image Banner */}
          <img
            src={slides[currentSlide].image}
            alt="Hero Banner Universitas"
            className="w-full h-full object-cover object-center transition-all duration-700 ease-in-out"
          />

          {/* Titik Dot Pagination Halus di Bawah Gambar */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentSlide === idx ? 'w-8 bg-[#f59e0b] shadow-sm' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 2. TENTANG PLATFORM: MENYAMBUNG LANGSUNG DENGAN HERO SLIDER (TANPA GAP / BATAS PUTIH) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#eef4ff] via-white to-white py-16 lg:py-24">
        {/* Latar Belakang Motif Titik Matriks Biru Transparan */}
        <div 
          className="absolute -left-12 -top-12 w-96 h-96 pointer-events-none opacity-25"
          style={{
            backgroundImage: `radial-gradient(#1e3a8a 1.5px, transparent 1.5px)`,
            backgroundSize: '18px 18px'
          }}
        />

        {/* Motif Geometris Garis Biru & Emas */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-80 h-80 pointer-events-none opacity-10">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#1e3a8a]">
            <path d="M40 100 C 40 40, 100 40, 100 100 C 100 160, 160 160, 160 100" stroke="currentColor" strokeWidth="4" strokeDasharray="6 6" />
            <path d="M20 100 C 20 20, 100 20, 100 100 C 100 180, 180 180, 180 100" stroke="currentColor" strokeWidth="2" />
            <circle cx="100" cy="100" r="12" fill="#f59e0b" opacity="0.6" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Sisi Teks Kiri */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-block border-l-2 border-[#f59e0b] pl-3">
                <span className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider">
                  TENTANG PLATFORM
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-black tracking-tight leading-tight">
                Mengenal Program Studi {tenant?.name || 'Sistem Informasi'}
              </h2>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal">
                Program Studi {tenant?.name || 'Sistem Informasi'} Universitas Nahdlatul Ulama Sumatera Utara
                merupakan gerbang pendidikan tinggi teknologi terpadu yang memadukan rekayasa sistem informasi enterprise,
                analisis data berskala besar, dan kepemimpinan digital ke dalam satu pengalaman akademik komprehensif.
              </p>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal">
                Bukan sekadar pengajaran teoritis di ruang kelas, kami mengarahkan mahasiswa pada proyek studi kasus industri nyata,
                pembelajaran berbasis luaran Outcome-Based Education (OBE), dan penguasaan sertifikasi kompetensi teknologi terstandarisasi.
              </p>

              {/* Checklist Ikon Bulat Aksen Kuning/Emas & Biru */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center space-x-3.5">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <CheckCircleIcon className="w-4 h-4 text-[#f59e0b]" />
                  </div>
                  <span className="text-sm text-black font-semibold">
                    Kurikulum OBE 66 mata kuliah dengan 148 SKS terstruktur
                  </span>
                </div>
                <div className="flex items-center space-x-3.5">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <CheckCircleIcon className="w-4 h-4 text-[#f59e0b]" />
                  </div>
                  <span className="text-sm text-black font-semibold">
                    Silabus dan Rencana Pembelajaran Semester (RPS) dapat diakses publik
                  </span>
                </div>
                <div className="flex items-center space-x-3.5">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <CheckCircleIcon className="w-4 h-4 text-[#f59e0b]" />
                  </div>
                  <span className="text-sm text-black font-semibold">
                    Gerbang identitas tunggal terintegrasi melalui ONE UNUSU SSO
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  to="/profil"
                  className="inline-flex items-center text-xs sm:text-sm font-bold text-[#1e3a8a] hover:text-[#f59e0b] group"
                >
                  <span>Pelajari Sejarah, Struktur Organisasi & Visi Misi Selengkapnya</span>
                  <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Sisi Kanan: GAMBAR DARI USER DENGAN TINGGI PENUH PROPOSIONAL */}
            <div className="lg:col-span-6 flex justify-center items-end self-stretch">
              <div className="w-full flex items-end justify-center">
                <img
                  src="/tentang-custom.png"
                  alt="Civitas & Gedung Kampus Universitas Nahdlatul Ulama Sumatera Utara"
                  className="w-full h-auto max-h-[640px] lg:max-h-[720px] object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-[1.01]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 4 PILAR MODUL AKADEMIK */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a] mb-1">
            LAYANAN INFORMASI DIGITAL
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-black">
            Akses Seluruh Instrumen Akademik & Kemahasiswaan
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            to="/kurikulum"
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-[#1e3a8a] shadow-xs hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#f59e0b] flex items-center justify-center mb-4 group-hover:bg-[#1e3a8a] group-hover:text-white transition-colors">
              <BookOpenIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-black mb-1">Kurikulum & RPS</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Daftar mata kuliah per semester beserta silabus dan modul ajar resmi.
            </p>
          </Link>

          <Link
            to="/dokumen"
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-[#1e3a8a] shadow-xs hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#f59e0b] flex items-center justify-center mb-4 group-hover:bg-[#1e3a8a] group-hover:text-white transition-colors">
              <DocumentCheckIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-black mb-1">Bank Dokumen Mutu</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Panduan tugas akhir, surat keputusan, pedoman akademik, dan formulir SOP.
            </p>
          </Link>

          <Link
            to="/dosen"
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-[#1e3a8a] shadow-xs hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#f59e0b] flex items-center justify-center mb-4 group-hover:bg-[#1e3a8a] group-hover:text-white transition-colors">
              <UserGroupIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-black mb-1">Direktori Dosen</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Profil tenaga pendidik tetap, nomor NIDN, bidang riset, dan kontak akademik.
            </p>
          </Link>

          <Link
            to="/sarpras"
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-[#1e3a8a] shadow-xs hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#f59e0b] flex items-center justify-center mb-4 group-hover:bg-[#1e3a8a] group-hover:text-white transition-colors">
              <AcademicCapIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-black mb-1">Sarana & Prasarana</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Laboratorium komputer, ruang sidang skripsi, dan fasilitas riset penunjang.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
};

