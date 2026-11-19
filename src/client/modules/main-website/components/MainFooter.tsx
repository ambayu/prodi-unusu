import React from 'react';
import { Link } from 'react-router-dom';
import {
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

export const MainFooter: React.FC = () => {
  return (
    <footer className="bg-[#052e16] text-emerald-50 border-t-4 border-amber-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Kolom 1: Profil Universitas */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 rounded-full bg-white p-1.5 flex items-center justify-center shadow-md ring-2 ring-amber-300/60 shrink-0">
                <img src="/logo-unusu.jpg" alt="Logo UNUSU" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="font-extrabold text-white text-xl leading-tight">UNUSU</p>
                <p className="text-[13px] text-amber-300 font-bold leading-snug">
                  Universitas Nahdlatul Ulama Sumatera Utara
                </p>
              </div>
            </div>
            <p className="text-emerald-100/95 leading-relaxed text-[15px]">
              Mewujudkan perguruan tinggi unggul berlandaskan Ahlussunnah wal Jama&apos;ah An-Nahdliyah,
              berdaya saing global, dan berintegritas moral tinggi.
            </p>
          </div>

          {/* Kolom 2: Fakultas Akademik */}
          <div>
            <p className="font-bold text-amber-300 text-lg tracking-tight mb-4">
              Fakultas Akademik
            </p>
            <ul className="space-y-2.5 text-[15px] text-emerald-50">
              <li>
                <Link to="/fakultas" className="hover:text-amber-300 transition-colors">
                  Fakultas Ilmu Komputer (Fasilkom)
                </Link>
              </li>
              <li>
                <Link to="/fakultas" className="hover:text-amber-300 transition-colors">
                  Fakultas Ilmu Pendidikan (FIP)
                </Link>
              </li>
              <li>
                <Link to="/fakultas" className="hover:text-amber-300 transition-colors">
                  Fakultas Ekonomi (FE)
                </Link>
              </li>
              <li>
                <Link to="/fakultas" className="hover:text-amber-300 transition-colors">
                  Fakultas Pertanian (Faperta)
                </Link>
              </li>
              <li>
                <Link to="/fakultas" className="hover:text-amber-300 transition-colors">
                  Fakultas Ilmu Kesehatan (Fikes)
                </Link>
              </li>
              <li>
                <Link to="/fakultas" className="hover:text-amber-300 transition-colors">
                  Fakultas Agama Islam (FAI)
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Layanan & Informasi */}
          <div>
            <p className="font-bold text-amber-300 text-lg tracking-tight mb-4">
              Layanan &amp; Portal
            </p>
            <ul className="space-y-2.5 text-[15px] text-emerald-50">
              <li>
                <a
                  href="https://pmb.unusu.ac.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-amber-300 transition-colors"
                >
                  <span>Penerimaan Mahasiswa Baru (PMB)</span>
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0 text-amber-300" />
                </a>
              </li>
              <li>
                <Link to="/berita" className="hover:text-amber-300 transition-colors">
                  Berita &amp; Pengumuman Prodi
                </Link>
              </li>
              <li>
                <Link to="/fakultas" className="hover:text-amber-300 transition-colors">
                  Direktori Fakultas &amp; Prodi
                </Link>
              </li>
              <li>
                <Link to="/kontak" className="hover:text-amber-300 transition-colors">
                  Layanan Informasi &amp; Kontak
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 4: Kampus Pusat */}
          <div>
            <p className="font-bold text-amber-300 text-lg tracking-tight mb-4">
              Kampus Utama
            </p>
            <ul className="space-y-3 text-[15px] text-emerald-50 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <MapPinIcon className="h-5 w-5 shrink-0 text-amber-300 mt-0.5" />
                <span>
                  Jl. H.A. Manaf Lubis No.2, Gaperta Ujung, Helvetia, Kota Medan, Sumatera Utara 20124
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <EnvelopeIcon className="h-5 w-5 shrink-0 text-amber-300" />
                <a href="mailto:rektorat@unusu.ac.id" className="hover:text-amber-300 transition-colors">
                  rektorat@unusu.ac.id
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <PhoneIcon className="h-5 w-5 shrink-0 text-amber-300" />
                <a href="tel:0618445566" className="hover:text-amber-300 transition-colors font-semibold">
                  (061) 844-5566
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-emerald-800/80 text-center text-emerald-200 text-[14px] font-medium">
          © {new Date().getFullYear()} Universitas Nahdlatul Ulama Sumatera Utara • Seluruh Hak Cipta Dilindungi Undang-Undang.
        </div>
      </div>
    </footer>
  );
};
