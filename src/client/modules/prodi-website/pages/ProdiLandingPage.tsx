import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpenIcon,
  DocumentCheckIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  NewspaperIcon,
  PhotoIcon,
  CalendarDaysIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useTenant } from '../../../hooks/useSite';
import { postApi, galleryApi, profileApi } from '../../../services/contentApi';

export const ProdiLandingPage: React.FC = () => {
  const { tenant } = useTenant();
  const [currentSlide, setCurrentSlide] = useState(0);

  const primaryColor = tenant?.theme?.primaryColor || '#1e3a8a';
  const secondaryColor = tenant?.theme?.secondaryColor || '#0f172a';
  const accentColor = tenant?.theme?.accentColor || '#fbbf24';

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

  // Query 6 Berita Terbaru
  const postsQuery = useQuery({
    queryKey: ['public', 'posts', 'landing'],
    queryFn: () => postApi.publicList({ perPage: 6 }).then((res) => res.data),
  });

  // Query Galeri Kegiatan Terbaru
  const galleriesQuery = useQuery({
    queryKey: ['public', 'galleries', 'landing'],
    queryFn: () => galleryApi.public().then((res) => res.data.galleries),
  });

  // Query Profil & Visi Misi
  const profileQuery = useQuery({
    queryKey: ['public', 'profile', 'landing'],
    queryFn: () => profileApi.public().then((res) => res.data),
  });

  const visionMission = profileQuery.data?.visionMission as Record<string, unknown> | null;
  const vision = typeof visionMission?.vision === 'string' ? visionMission.vision : '';
  const missionsRaw = typeof visionMission?.missions === 'string' ? visionMission.missions : '';
  const missionList = missionsRaw
    .split('\n')
    .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 4);

  const latestPosts = postsQuery.data?.items ?? [];
  const latestGalleries = (galleriesQuery.data ?? []).slice(0, 6);

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

      {/* 4. VISI & MISI PROGRAM STUDI */}
      {(vision || missionList.length > 0) && (
        <section className="py-16 bg-slate-50 border-t border-b border-slate-200/80 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <p
                className="text-xs font-bold uppercase tracking-wider mb-1"
                style={{ color: primaryColor }}
              >
                KOMITMEN & ARAH PENGEMBANGAN
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Visi & Misi Program Studi
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Box Visi */}
              <div
                className="lg:col-span-5 rounded-3xl p-8 sm:p-10 text-white flex flex-col justify-between shadow-lg relative overflow-hidden"
                style={{ backgroundColor: primaryColor }}
              >
                <div
                  className="pointer-events-none absolute -right-8 -bottom-8 w-44 h-44 rounded-full opacity-10"
                  style={{ backgroundColor: accentColor }}
                />
                <div className="space-y-4 relative z-10">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-slate-950 shadow-xs"
                    style={{ backgroundColor: accentColor }}
                  >
                    Visi Keunggulan
                  </span>
                  <p className="text-base sm:text-lg font-bold leading-relaxed">
                    "{vision || `Menjadi Program Studi ${tenant?.name || ''} yang unggul, berakhlak mulia, dan berdaya saing global.`}"
                  </p>
                </div>
                <div className="pt-6 relative z-10 border-t border-white/15 mt-6 flex items-center justify-between text-xs text-white/80">
                  <span>UNUSU Sumatera Utara</span>
                  <Link to="/visi-misi" className="font-bold underline hover:text-white">
                    Selengkapnya &rarr;
                  </Link>
                </div>
              </div>

              {/* Box Misi */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide mb-5 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
                    <span>Misi Penyelenggaraan</span>
                  </h3>
                  <div className="space-y-3.5">
                    {(missionList.length > 0
                      ? missionList
                      : [
                          'Menyelenggarakan pendidikan sarjana berkualitas berbasis kompetensi kurikulum OBE.',
                          'Mengembangkan riset terapan inovatif yang relevan dengan perkembangan keilmuan mutakhir.',
                          'Melaksanakan pengabdian kepada masyarakat berbasis nilai Ahlussunnah wal Jama\'ah.',
                        ]
                    ).map((misi, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <CheckCircleIcon
                          className="w-5 h-5 shrink-0 mt-0.5"
                          style={{ color: primaryColor }}
                        />
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                          {misi}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 mt-6 flex justify-end">
                  <Link
                    to="/visi-misi"
                    className="inline-flex items-center text-xs font-bold hover:underline"
                    style={{ color: primaryColor }}
                  >
                    <span>Lihat Tujuan & Sasaran Strategis</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. 6 BERITA & PENGUMUMAN TERBARU */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: primaryColor }}
            >
              KABAR & ARTIKEL
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              6 Berita & Warta Terbaru
            </h2>
          </div>
          <Link
            to="/berita"
            className="inline-flex items-center gap-1.5 text-xs font-bold hover:underline self-start sm:self-auto"
            style={{ color: primaryColor }}
          >
            <span>Buka Semua Berita</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {postsQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : latestPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
            <NewspaperIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">Belum ada warta berita</p>
            <p className="text-xs text-slate-500 mt-1">
              Program studi belum menerbitkan artikel publik terbaru.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestPosts.map((post) => (
              <article
                key={post.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              >
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  {post.thumbnailUrl ? (
                    <img
                      src={post.thumbnailUrl}
                      alt={post.title}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-tr from-slate-100 to-slate-200">
                      <NewspaperIcon className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                  {post.category && (
                    <span
                      className="absolute top-3 left-3 rounded-full px-3 py-1 text-[10px] font-bold text-slate-950 shadow-xs"
                      style={{ backgroundColor: accentColor }}
                    >
                      {post.category.name}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-2">
                    {post.publishedAt && (
                      <span className="flex items-center gap-1 font-medium">
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        {new Date(post.publishedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-medium ml-auto">
                      <EyeIcon className="w-3.5 h-3.5" />
                      {post.views || 0} kali
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </h3>

                  {post.excerpt && (
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                    <span style={{ color: primaryColor }}>Baca Selengkapnya</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" style={{ color: primaryColor }} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 6. DOKUMENTASI & GALERI KEGIATAN TERBARU */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-wider mb-1"
                style={{ color: accentColor }}
              >
                DOKUMENTASI VISUAL
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Galeri Kegiatan & Aktivitas
              </h2>
            </div>
            <Link
              to="/galeri"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-white"
            >
              <span>Lihat Seluruh Album</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>

          {galleriesQuery.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-36 rounded-2xl bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : latestGalleries.length === 0 ? (
            <div className="rounded-2xl border border-white/10 p-8 text-center bg-slate-800/40">
              <PhotoIcon className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">Belum ada dokumentasi foto</p>
              <p className="text-xs text-slate-500 mt-1">
                Album kegiatan kemahasiswaan dan akademik akan tampil di sini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {latestGalleries.map((album) => (
                <Link
                  key={album.id}
                  to="/galeri"
                  className="group relative block aspect-square rounded-2xl overflow-hidden bg-slate-800 shadow-md ring-1 ring-white/10"
                >
                  {album.coverImageUrl ? (
                    <img
                      src={album.coverImageUrl}
                      alt={album.title}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-slate-800">
                      <PhotoIcon className="w-8 h-8 text-slate-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-end">
                    <p className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
                      {album.title}
                    </p>
                    {album.category && (
                      <span className="text-[9px] text-amber-300 mt-1 font-medium">
                        {album.category}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

