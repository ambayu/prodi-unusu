import React from 'react';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  BookOpenIcon,
  BuildingLibraryIcon,
  UserGroupIcon,
  ArrowRightIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

export const MainLandingPage: React.FC = () => {
  const faculties = [
    {
      code: 'FASILKOM',
      name: 'Fakultas Ilmu Komputer',
      prodis: [
        { name: 'Sistem Informasi (S1)', domain: 'sin.unusu.ac.id' },
        { name: 'Teknik Informatika (S1)', domain: 'tif.unusu.ac.id' },
        { name: 'Ilmu Komputer (S1)', domain: 'iko.unusu.ac.id' },
      ],
    },
    {
      code: 'FIP',
      name: 'Fakultas Ilmu Pendidikan',
      prodis: [{ name: 'Pendidikan Guru Sekolah Dasar (S1)', domain: 'pgsd.unusu.ac.id' }],
    },
    {
      code: 'FE',
      name: 'Fakultas Ekonomi',
      prodis: [{ name: 'Manajemen (S1)', domain: 'manajemen.unusu.ac.id' }],
    },
    {
      code: 'FAPERTA',
      name: 'Fakultas Pertanian',
      prodis: [
        { name: 'Agribisnis (S1)', domain: 'agribisnis.unusu.ac.id' },
        { name: 'Ilmu dan Teknologi Pangan (S1)', domain: 'itp.unusu.ac.id' },
        { name: 'Budidaya Pertanian (S1)', domain: 'bdp.unusu.ac.id' },
      ],
    },
    {
      code: 'FIKES',
      name: 'Fakultas Ilmu Kesehatan',
      prodis: [
        { name: 'Ilmu Gizi (S1)', domain: 'ilmugizi.unusu.ac.id' },
        { name: 'D3 Analis Kesehatan', domain: 'ankes.unusu.ac.id' },
      ],
    },
    {
      code: 'FAI',
      name: 'Fakultas Agama Islam',
      prodis: [
        { name: 'Pendidikan Agama Islam (S1)', domain: 'pai.unusu.ac.id' },
        { name: 'Pendidikan Islam Anak Usia Dini (S1)', domain: 'piaud.unusu.ac.id' },
        { name: 'Hukum Keluarga Islam (S1)', domain: 'hki.unusu.ac.id' },
        { name: 'Studi Islam (S1)', domain: 'studislam.unusu.ac.id' },
      ],
    },
  ];

  return (
    <div className="space-y-20 pb-20 font-sans">
      {/* 1. Main University Hero Banner */}
      <section className="relative bg-[#14532D] text-white py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <span className="inline-block px-3.5 py-1.5 rounded-full bg-emerald-800/80 text-amber-300 border border-emerald-700 text-xs font-bold uppercase tracking-wider">
                PORTAL RESMI UNIVERSITAS NAHDLATUL ULAMA SUMATERA UTARA
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight">
                Mencetak Cendekia Ahlussunnah wal Jama'ah yang Unggul & Berkarakter
              </h1>
              <p className="text-sm sm:text-base text-emerald-100 max-w-2xl leading-relaxed">
                Pusat keunggulan pendidikan tinggi terakreditasi nasional dengan 6 fakultas dan 14 program studi mandiri,
                memadukan sains modern, teknologi, dan akhlak mulia.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <a
                  href="#fakultas-prodi"
                  className="px-6 py-3.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-md transition-all"
                >
                  Jelajahi Program Studi
                </a>
                <Link
                  to="/login"
                  className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all"
                >
                  Portal Administrasi Pusat
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md bg-white/10 p-6 rounded-3xl border border-white/20 backdrop-blur-xs space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <CheckBadgeIcon className="w-5 h-5 mr-2 text-amber-300" />
                  Statistik Kampus Utama
                </h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                    <p className="text-2xl font-extrabold text-amber-300">6</p>
                    <p className="text-xs text-emerald-100">Fakultas Aktif</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                    <p className="text-2xl font-extrabold text-amber-300">14</p>
                    <p className="text-xs text-emerald-100">Program Studi</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                    <p className="text-2xl font-extrabold text-amber-300">100%</p>
                    <p className="text-xs text-emerald-100">Terakreditasi</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                    <p className="text-2xl font-extrabold text-amber-300">SSO</p>
                    <p className="text-xs text-emerald-100">Layanan Terpadu</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Direktori Fakultas & Website Program Studi Mandiri */}
      <section id="fakultas-prodi" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
            EKOSISTEM WEBSITE MULTI-PRODI
          </p>
          <h2 className="text-3xl font-extrabold text-slate-900">
            Fakultas & Portal Mandiri Program Studi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Masing-masing program studi UNUSU memiliki identitas website independen dengan domain terpisah.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {faculties.map((fac, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-extrabold text-xs">
                  {fac.code}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{fac.name}</h3>
                  <span className="text-[11px] text-slate-500">{fac.prodis.length} Program Studi</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                {fac.prodis.map((p, pIdx) => (
                  <div key={pIdx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-emerald-50/50 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-emerald-800 font-mono">{p.domain}</p>
                    </div>
                    <Link
                      to="/"
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-800"
                      title="Buka Website Prodi"
                    >
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
