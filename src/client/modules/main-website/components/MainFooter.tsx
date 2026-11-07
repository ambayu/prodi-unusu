import React from 'react';
import { Link } from 'react-router-dom';

export const MainFooter: React.FC = () => {
  return (
    <footer className="bg-[#052e16] text-slate-300 text-xs border-t border-emerald-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Kolom 1: Profil Universitas */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-white p-1.5 flex items-center justify-center">
                <img src="/logo-unusu.jpg" alt="Logo UNUSU" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="font-extrabold text-white text-base leading-tight">UNUSU</p>
                <p className="text-[11px] text-amber-300 font-bold leading-tight">Universitas Nahdlatul Ulama Sumatera Utara</p>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              Mewujudkan perguruan tinggi unggul berlandaskan Ahlussunnah wal Jama'ah An-Nahdliyah,
              berdaya saing global, dan berintegritas moral tinggi.
            </p>
          </div>

          {/* Kolom 2: Fakultas Akademik */}
          <div>
            <p className="font-extrabold text-white text-sm uppercase tracking-wider mb-3">Fakultas</p>
            <ul className="space-y-2 text-slate-400">
              <li>Fakultas Ilmu Komputer (Fasilkom)</li>
              <li>Fakultas Ilmu Pendidikan (FIP)</li>
              <li>Fakultas Ekonomi (FE)</li>
              <li>Fakultas Pertanian (Faperta)</li>
              <li>Fakultas Ilmu Kesehatan (Fikes)</li>
              <li>Fakultas Agama Islam (FAI)</li>
            </ul>
          </div>

          {/* Kolom 3: Layanan & Informasi */}
          <div>
            <p className="font-extrabold text-white text-sm uppercase tracking-wider mb-3">Layanan</p>
            <ul className="space-y-2 text-slate-400">
              <li>Penerimaan Mahasiswa Baru (PMB)</li>
              <li>Lembaga Penjaminan Mutu (LPM)</li>
              <li>Lembaga Penelitian & Pengabdian (LPPM)</li>
              <li>Sistem Informasi Akademik (SIAKAD)</li>
              <li>E-Learning UNUSU</li>
            </ul>
          </div>

          {/* Kolom 4: Kampus Pusat */}
          <div>
            <p className="font-extrabold text-white text-sm uppercase tracking-wider mb-3">Kampus Utama</p>
            <p className="text-slate-400 leading-relaxed text-xs">
              Jl. H.A. Manaf Lubis No.2, Gaperta Ujung, Helvetia, Kota Medan, Sumatera Utara 20124
              <br /><strong className="text-white">Email:</strong> rektorat@unusu.ac.id
              <br /><strong className="text-white">Hotline:</strong> (061) 844-5566
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-emerald-900/60 text-center text-slate-500 text-xs">
          © {new Date().getFullYear()} Universitas Nahdlatul Ulama Sumatera Utara • Seluruh Hak Cipta Dilindungi Undang-Undang.
        </div>
      </div>
    </footer>
  );
};
