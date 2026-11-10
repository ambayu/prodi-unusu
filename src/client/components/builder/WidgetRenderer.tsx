import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDaysIcon,
  EyeIcon,
  ArrowRightIcon,
  UserGroupIcon,
  BookOpenIcon,
  DocumentCheckIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { postApi, galleryApi, lecturerApi, curriculumApi } from '../../services/contentApi';
import { useTenant } from '../../hooks/useSite';

interface WidgetInstanceProps {
  widgetCode: string;
  config: Record<string, any>;
  variantCode?: string | null;
}

export const WidgetRenderer: React.FC<WidgetInstanceProps> = ({
  widgetCode,
  config,
}) => {
  const { tenant } = useTenant();
  const primaryColor = tenant?.theme?.primaryColor || '#1e3a8a';
  const secondaryColor = tenant?.theme?.secondaryColor || '#0f172a';
  const accentColor = tenant?.theme?.accentColor || '#fbbf24';

  // 1. HERO SLIDER
  if (widgetCode === 'hero_slider') {
    const rawSlides = Array.isArray(config.slides) && config.slides.length > 0
      ? config.slides
      : [
          { imageUrl: '/heroslider-full.png', alt: 'Hero Banner 1' },
          { imageUrl: '/hero-slide-generated.png', alt: 'Hero Banner 2' },
        ];
    const [activeIdx, setActiveIdx] = useState(0);
    const autoplayMs = typeof config.autoplayMs === 'number' ? config.autoplayMs : 5000;
    const showDots = config.showDots !== false;

    useEffect(() => {
      if (rawSlides.length <= 1) return;
      const t = setInterval(() => {
        setActiveIdx((prev) => (prev + 1) % rawSlides.length);
      }, autoplayMs);
      return () => clearInterval(t);
    }, [rawSlides.length, autoplayMs]);

    const activeSlide = rawSlides[activeIdx] || rawSlides[0];

    return (
      <section className="relative w-full overflow-hidden bg-slate-900 select-none">
        <div className="relative w-full aspect-[21/9] min-h-[300px] sm:min-h-[420px] lg:min-h-[500px] xl:min-h-[540px]">
          {activeSlide.linkUrl ? (
            <a href={activeSlide.linkUrl} target="_blank" rel="noreferrer" className="block w-full h-full">
              <img
                src={activeSlide.imageUrl}
                alt={activeSlide.alt || 'Banner'}
                className="w-full h-full object-cover object-center transition-all duration-700 ease-in-out"
              />
            </a>
          ) : (
            <img
              src={activeSlide.imageUrl}
              alt={activeSlide.alt || 'Banner'}
              className="w-full h-full object-cover object-center transition-all duration-700 ease-in-out"
            />
          )}

          {showDots && rawSlides.length > 1 && (
            <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-2">
              {rawSlides.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveIdx(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeIdx === idx ? 'w-8 bg-[#fbbf24] shadow-sm' : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // 2. ABOUT PRODI
  if (widgetCode === 'about_prodi') {
    const isImageRight = config.alignment === 'right';
    return (
      <section className="relative overflow-hidden bg-gradient-to-b from-[#eef4ff] via-white to-white py-16 lg:py-24">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Teks Uraian */}
            <div className={`space-y-6 ${isImageRight ? 'lg:col-span-7 lg:order-1' : 'lg:col-span-7 lg:order-2'}`}>
              <div className="space-y-2">
                <span
                  className="inline-block py-1 px-3.5 rounded-full text-xs font-black tracking-widest uppercase shadow-2xs"
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                  {config.eyebrow || 'Mengenal Program Studi'}
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight">
                  {config.title || `Program Studi Unggulan ${tenant?.name || 'UNUSU'}`}
                </h2>
              </div>

              {config.body ? (
                <div
                  className="prose prose-slate max-w-none text-sm sm:text-base text-slate-600 leading-relaxed space-y-3"
                  dangerouslySetInnerHTML={{ __html: config.body }}
                />
              ) : (
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Program studi berfokus pada pendidikan berkualitas tinggi yang menggabungkan keunggulan akademik,
                  nilai-nilai Islam Ahlussunnah wal Jama'ah, dan kesiapan berkarier di era transformasi global.
                </p>
              )}

              <div className="pt-2">
                <Link
                  to="/profil"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>Lihat Profil Lengkap</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Gambar Ilustrasi */}
            <div className={`relative ${isImageRight ? 'lg:col-span-5 lg:order-2' : 'lg:col-span-5 lg:order-1'}`}>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-100">
                <img
                  src={config.imageUrl || '/rektorat-unusu.jpg'}
                  alt={config.title || 'Profil Prodi'}
                  className="w-full h-80 sm:h-96 object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-400">Terakreditasi Baik</p>
                  <p className="text-sm sm:text-base font-bold leading-tight">{tenant?.name || 'Program Studi UNUSU'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 3. VISION & MISSION
  if (widgetCode === 'vision_mission') {
    const rawMissions: string[] = Array.isArray(config.missions) ? config.missions : [];
    return (
      <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span
              className="inline-block py-1 px-3.5 rounded-full text-xs font-black tracking-widest uppercase mb-2"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              Komitmen Akademik
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Visi &amp; Misi Program Studi
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Visi */}
            <div className="lg:col-span-5 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Visi Utama</span>
              <div
                className="mt-4 text-base sm:text-lg font-medium leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: config.vision || 'Menjadi program studi unggul dalam pengembangan ilmu dan teknologi berkarakter nilai luhur.',
                }}
              />
            </div>

            {/* Misi */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Misi Kami</span>
              <div className="space-y-3">
                {rawMissions.length > 0 ? (
                  rawMissions.map((m: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3.5">
                      <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold grid place-items-center mt-0.5 border border-emerald-200">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-slate-700 leading-relaxed">{m}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 italic">Misi program studi sedang diselaraskan.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 4. STATISTICS
  if (widgetCode === 'statistics') {
    const items: Array<{ label: string; value: number; icon?: string }> = Array.isArray(config.items) ? config.items : [];
    const isStrip = config.layout === 'strip';

    return (
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className={`grid gap-6 ${isStrip ? 'grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200' : 'grid-cols-2 lg:grid-cols-4'}`}>
            {items.map((item, idx) => (
              <div key={idx} className="p-4 text-center space-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight" style={{ color: primaryColor }}>
                  {item.value?.toLocaleString('id-ID')}
                </p>
                <p className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // 5. LATEST NEWS
  if (widgetCode === 'latest_news') {
    return <LatestNewsWidget title={config.title} limit={config.limit || 6} primaryColor={primaryColor} />;
  }

  // 6. GALLERY GRID
  if (widgetCode === 'gallery_grid') {
    return <GalleryGridWidget title={config.title} limit={config.limit || 6} primaryColor={primaryColor} />;
  }

  // 7. LECTURER LIST
  if (widgetCode === 'lecturer_list') {
    return <LecturersWidget title={config.title} limit={config.limit || 6} primaryColor={primaryColor} />;
  }

  // 8. CTA BANNER
  if (widgetCode === 'cta_banner') {
    return (
      <section className="py-16 px-4 sm:px-6">
        <div
          className="max-w-7xl mx-auto rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden text-center"
          style={{
            backgroundColor: config.backgroundColor || primaryColor,
            backgroundImage: config.backgroundImageUrl ? `url(${config.backgroundImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {config.backgroundImageUrl && <div className="absolute inset-0 bg-black/50" />}
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold">{config.title || 'Mari Bergabung Bersama Kami'}</h2>
            <p className="text-sm sm:text-base text-slate-100 leading-relaxed">
              {config.body || 'Pendaftaran Mahasiswa Baru telah dibuka. Raih masa depan gemilang bersama program studi kami.'}
            </p>
            {config.buttonLabel && (
              <div className="pt-3">
                <a
                  href={config.buttonUrl || '/'}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-md transition-all"
                >
                  <span>{config.buttonLabel}</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // 9. CONTACT INFORMATION
  if (widgetCode === 'contact_information') {
    return (
      <section className="py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl font-bold text-slate-900">{config.title || 'Hubungi Kami'}</h2>
            <p className="text-xs text-slate-500 mt-1">Layanan informasi dan administrasi program studi</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-2">
              <MapPinIcon className="w-6 h-6 mx-auto text-emerald-700" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Alamat Kampus</p>
              <p className="text-xs text-slate-700 leading-relaxed">{tenant?.contact?.address || 'Jl. K.H. Wahid Hasyim No. 129, Medan'}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-2">
              <PhoneIcon className="w-6 h-6 mx-auto text-emerald-700" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Telepon / WhatsApp</p>
              <p className="text-xs text-slate-700">{tenant?.contact?.phone || '(061) 451-2345'}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-2">
              <EnvelopeIcon className="w-6 h-6 mx-auto text-emerald-700" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Surel Resmi</p>
              <p className="text-xs text-slate-700">{tenant?.contact?.email || `${tenant?.slug || 'prodi'}@unusu.ac.id`}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return null;
};

// Sub-komponen Widget Berita
const LatestNewsWidget: React.FC<{ title?: string; limit: number; primaryColor: string }> = ({
  title,
  limit,
  primaryColor,
}) => {
  const postsQuery = useQuery({
    queryKey: ['public', 'posts', 'widget', limit],
    queryFn: () => postApi.publicList({ perPage: limit }).then((res) => res.data),
  });

  const posts = postsQuery.data?.items ?? [];

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-slate-100 gap-4">
          <div>
            <span
              className="inline-block py-1 px-3.5 rounded-full text-xs font-black tracking-widest uppercase mb-2"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              Warta &amp; Informasi
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {title || 'Berita & Kegiatan Terbaru'}
            </h2>
          </div>
          <Link
            to="/berita"
            className="inline-flex items-center gap-2 text-xs font-bold transition-all hover:gap-3"
            style={{ color: primaryColor }}
          >
            <span>Lihat Semua Berita</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
            Belum ada warta berita yang dipublikasikan.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {posts.map((post) => (
              <article
                key={post.id}
                className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <img
                    src={post.thumbnailUrl || '/gedung-unusu.jpg'}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {post.category && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white uppercase tracking-wider">
                      {post.category.name}
                    </span>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('id-ID') : '-'}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <EyeIcon className="w-3.5 h-3.5" />
                        {post.viewCount || 0}x
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-emerald-800 transition-colors line-clamp-2 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {post.excerpt || 'Baca selengkapnya mengenai pengumuman dan berita resmi program studi.'}
                    </p>
                  </div>
                  <Link
                    to={`/berita/${post.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-bold pt-2 border-t border-slate-100"
                    style={{ color: primaryColor }}
                  >
                    <span>Baca Selengkapnya</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// Sub-komponen Widget Galeri
const GalleryGridWidget: React.FC<{ title?: string; limit: number; primaryColor: string }> = ({
  title,
  limit,
  primaryColor,
}) => {
  const galleriesQuery = useQuery({
    queryKey: ['public', 'galleries', 'widget', limit],
    queryFn: () => galleryApi.public().then((res) => (res.data.galleries ?? []).slice(0, limit)),
  });

  const galleries = galleriesQuery.data ?? [];

  return (
    <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-slate-200 gap-4">
          <div>
            <span
              className="inline-block py-1 px-3.5 rounded-full text-xs font-black tracking-widest uppercase mb-2"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              Dokumentasi Kegiatan
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {title || 'Galeri Foto & Aktivitas'}
            </h2>
          </div>
          <Link
            to="/galeri"
            className="inline-flex items-center gap-2 text-xs font-bold transition-all hover:gap-3"
            style={{ color: primaryColor }}
          >
            <span>Lihat Semua Foto</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {galleries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
            Belum ada dokumentasi galeri kegiatan.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {galleries.map((gal) => (
              <div
                key={gal.id}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-200 shadow-2xs hover:shadow-lg transition-all"
              >
                <img
                  src={gal.coverUrl || '/gedung-unusu.jpg'}
                  alt={gal.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
                  <p className="text-xs font-bold line-clamp-1">{gal.title}</p>
                  <p className="text-[10px] text-amber-300">{gal.itemCount || 0} Foto Dokumentasi</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// Sub-komponen Widget Dosen
const LecturersWidget: React.FC<{ title?: string; limit: number; primaryColor: string }> = ({
  title,
  limit,
  primaryColor,
}) => {
  const lecturersQuery = useQuery({
    queryKey: ['public', 'lecturers', 'widget', limit],
    queryFn: () => lecturerApi.public().then((res) => (res.data.lecturers ?? []).slice(0, limit)),
  });

  const lecturers = lecturersQuery.data ?? [];

  return (
    <section className="py-16 sm:py-20 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-slate-100 gap-4">
          <div>
            <span
              className="inline-block py-1 px-3.5 rounded-full text-xs font-black tracking-widest uppercase mb-2"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              Tenaga Pendidik
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {title || 'Dosen & Tenaga Pengajar'}
            </h2>
          </div>
          <Link
            to="/dosen"
            className="inline-flex items-center gap-2 text-xs font-bold transition-all hover:gap-3"
            style={{ color: primaryColor }}
          >
            <span>Semua Dosen</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {lecturers.map((doc) => (
            <div key={doc.id} className="text-center space-y-3 p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-md transition-shadow">
              <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-emerald-500 bg-slate-100">
                <img
                  src={doc.photoUrl || '/avatar-placeholder.png'}
                  alt={doc.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm text-slate-900">{doc.name}</p>
                <p className="text-[11px] text-slate-500">{doc.functionalTitle || doc.degree || 'Dosen Tetap'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WidgetRenderer;
