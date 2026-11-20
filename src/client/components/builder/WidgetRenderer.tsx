import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDaysIcon,
  EyeIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import {
  postApi,
  galleryApi,
  lecturerApi,
  curriculumApi,
  facilityApi,
  dokumenProdiApi,
  profileApi,
} from '../../services/contentApi';
import { useTenant } from '../../hooks/useSite';
import { GambarTentang } from '../ui/GambarTentang';
import { pickCurrentCurriculum } from '../../../shared/utils/curriculum';
import { CustomLayoutWidget } from './CustomLayoutWidget';
import type { CustomRow } from '../../../shared/schemas/builder';

interface WidgetInstanceProps {
  widgetCode: string;
  config: Record<string, unknown>;
  variantCode?: string | null;
}

interface HeroSlideConfig {
  imageUrl: string;
  alt?: string;
  linkUrl?: string;
}

interface StatItemConfig {
  label: string;
  value: number;
  icon?: string;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export const WidgetRenderer: React.FC<WidgetInstanceProps> = ({ widgetCode, config }) => {
  const { tenant } = useTenant();
  const primaryColor = tenant?.theme?.primaryColor || '#1e3a8a';
  const accentColor = tenant?.theme?.accentColor || '#d97706';

  // 1. HERO SLIDER
  if (widgetCode === 'hero_slider') {
    const slides: HeroSlideConfig[] =
      Array.isArray(config.slides) && config.slides.length > 0
        ? (config.slides as HeroSlideConfig[])
        : [];
    // Tanpa slide, komponen hero bawaan akan menampilkan gambar cadangan —
    // di beranda yang sudah punya hero Bank Widget itu menjadi banner ganda.
    if (slides.length === 0) return null;
    return (
      <HeroSliderWidget
        slides={slides}
        autoplayMs={asNumber(config.autoplayMs, 5000)}
        showDots={config.showDots !== false}
      />
    );
  }

  // 2. ABOUT PRODI
  if (widgetCode === 'about_prodi') {
    return (
      <AboutProdiWidget
        primaryColor={primaryColor}
        tenantName={tenant?.name}
        alignment={asString(config.alignment)}
        fallbackImage={asString(config.imageUrl)}
      />
    );
  }

  // 3. VISION & MISSION
  if (widgetCode === 'vision_mission') {
    const fallbackMissions = Array.isArray(config.missions)
      ? config.missions.filter((m): m is string => typeof m === 'string')
      : [];
    return (
      <VisionMissionWidget
        primaryColor={primaryColor}
        fallbackVision={asString(config.vision)}
        fallbackMissions={fallbackMissions}
      />
    );
  }

  // 4. STATISTICS
  if (widgetCode === 'statistics') {
    const items: StatItemConfig[] = Array.isArray(config.items) ? (config.items as StatItemConfig[]) : [];
    const isStrip = config.layout === 'strip';

    return (
      <section className="py-16 bg-editorial-paper border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div
            className={`grid gap-6 ${
              isStrip
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white rounded-3xl border border-slate-200 p-4 shadow-xs'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            }`}
          >
            {items.map((item, idx) => (
              <div
                key={idx}
                className={
                  isStrip
                    ? 'p-6 text-center space-y-2'
                    : 'rounded-2xl border border-slate-200 bg-white p-7 text-center space-y-2 shadow-xs hover:shadow-md transition-shadow'
                }
              >
                <p
                  className="text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight"
                  style={{ color: primaryColor }}
                >
                  {typeof item.value === 'number' ? item.value.toLocaleString('id-ID') : item.value}
                </p>
                <p className="text-[15px] font-extrabold text-slate-900 uppercase tracking-wide">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // 5. LATEST NEWS
  if (widgetCode === 'latest_news') {
    return (
      <LatestNewsWidget
        title={asString(config.title)}
        limit={asNumber(config.limit, 6)}
        primaryColor={primaryColor}
      />
    );
  }

  // 6. GALLERY GRID
  if (widgetCode === 'gallery_grid') {
    return (
      <GalleryGridWidget
        title={asString(config.title)}
        limit={asNumber(config.limit, 6)}
        primaryColor={primaryColor}
      />
    );
  }

  // 7. LECTURER LIST
  if (widgetCode === 'lecturer_list') {
    return (
      <LecturersWidget
        title={asString(config.title)}
        limit={asNumber(config.limit, 6)}
        primaryColor={primaryColor}
        accentColor={accentColor}
      />
    );
  }

  // 8. FACILITY GRID
  if (widgetCode === 'facility_grid') {
    return (
      <FacilityGridWidget
        title={asString(config.title)}
        limit={asNumber(config.limit, 6)}
        primaryColor={primaryColor}
      />
    );
  }

  // 9. DOCUMENT LIST
  if (widgetCode === 'document_list') {
    return (
      <DocumentListWidget
        title={asString(config.title)}
        limit={asNumber(config.limit, 6)}
        primaryColor={primaryColor}
      />
    );
  }

  // 10. CURRICULUM OVERVIEW
  if (widgetCode === 'curriculum_overview') {
    return <CurriculumOverviewWidget title={asString(config.title)} primaryColor={primaryColor} />;
  }

  // 11. CTA BANNER
  if (widgetCode === 'cta_banner') {
    const bgImage = asString(config.backgroundImageUrl) || '/assets/visual/campus-cta-backdrop.png';
    const buttonLabel = asString(config.buttonLabel);
    const buttonUrl = asString(config.buttonUrl, '/');
    const bgColor = asString(config.backgroundColor, primaryColor);

    return (
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-[#FCFDFA]">
        <div
          className="max-w-7xl mx-auto rounded-3xl p-8 sm:p-14 lg:p-16 text-white shadow-xl relative overflow-hidden text-center"
          style={{
            backgroundColor: bgColor,
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay kontras tinggi agar teks putih selalu tajam */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${bgColor}e6 0%, #0f172ad9 100%)`,
            }}
          />
          <div className="relative z-10 max-w-3xl mx-auto space-y-5">
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold leading-tight text-white">
              {asString(config.title) || 'Mari Bergabung Bersama Kami'}
            </h2>
            <p className="text-base sm:text-lg text-slate-100 leading-relaxed font-medium">
              {asString(config.body) ||
                'Pendaftaran Mahasiswa Baru telah dibuka. Raih masa depan gemilang bersama program studi kami.'}
            </p>
            {buttonLabel && (
              <div className="pt-4">
                <a
                  href={buttonUrl}
                  className="inline-flex min-h-[54px] items-center gap-2.5 px-8 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[16px] shadow-lg transition-all hover:scale-[1.02] active:scale-[0.99]"
                >
                  <span>{buttonLabel}</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // 11B. BANK WIDGET KUSTOM (CUSTOM LAYOUT)
  if (widgetCode === 'custom_layout') {
    const rows = Array.isArray(config.rows) ? (config.rows as CustomRow[]) : [];
    return (
      <CustomLayoutWidget
        rows={rows}
        primaryColor={primaryColor}
        accentColor={accentColor}
        renderEmbeddedWidget={(embeddedCode, embeddedConfig) => (
          <WidgetRenderer widgetCode={embeddedCode} config={embeddedConfig} />
        )}
      />
    );
  }

  // 12. CONTACT INFORMATION
  if (widgetCode === 'contact_information') {
    const address = tenant?.contact?.address || 'Jl. H.A. Manaf Lubis No.2, Gaperta Ujung, Helvetia, Medan';
    const phone = tenant?.contact?.phone || '(061) 451-2345';
    const email = tenant?.contact?.email || `${tenant?.slug || 'prodi'}@unusu.ac.id`;

    return (
      <section className="py-16 sm:py-20 bg-editorial-paper border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span
              className="inline-block py-1.5 px-4 rounded-full text-[13px] font-extrabold tracking-widest uppercase mb-3"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              Sekretariat &amp; Layanan
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950">
              {asString(config.title) || 'Hubungi Kami'}
            </h2>
            <p className="text-[16px] text-slate-800 mt-2 font-medium">
              Layanan informasi akademik dan administrasi program studi.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs text-center space-y-3">
              <div
                className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
              >
                <MapPinIcon className="w-7 h-7" />
              </div>
              <p className="text-[13px] font-extrabold uppercase tracking-wider text-slate-700">
                Alamat Kampus
              </p>
              <p className="text-[16px] font-semibold text-slate-950 leading-relaxed">{address}</p>
            </div>
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs text-center space-y-3">
              <div
                className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
              >
                <PhoneIcon className="w-7 h-7" />
              </div>
              <p className="text-[13px] font-extrabold uppercase tracking-wider text-slate-700">
                Telepon / WhatsApp
              </p>
              <a
                href={`tel:${phone.replace(/[^+\d]/g, '')}`}
                className="block text-[17px] font-extrabold text-slate-950 hover:underline"
              >
                {phone}
              </a>
            </div>
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs text-center space-y-3">
              <div
                className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
              >
                <EnvelopeIcon className="w-7 h-7" />
              </div>
              <p className="text-[13px] font-extrabold uppercase tracking-wider text-slate-700">
                Surel Resmi
              </p>
              <a
                href={`mailto:${email}`}
                className="block text-[16px] font-extrabold text-slate-950 hover:underline break-all"
              >
                {email}
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return null;
};

const HeroSliderWidget: React.FC<{
  slides: HeroSlideConfig[];
  autoplayMs: number;
  showDots: boolean;
}> = ({ slides, autoplayMs, showDots }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % slides.length);
    }, autoplayMs);
    return () => clearInterval(t);
  }, [slides.length, autoplayMs]);

  useEffect(() => {
    if (activeIdx >= slides.length) setActiveIdx(0);
  }, [activeIdx, slides.length]);

  const activeSlide = slides[activeIdx] || slides[0];
  const prev = () => setActiveIdx((idx) => (idx - 1 + slides.length) % slides.length);
  const next = () => setActiveIdx((idx) => (idx + 1) % slides.length);

  return (
    <section className="relative w-full overflow-hidden bg-slate-900 select-none">
      <div className="relative w-full aspect-[21/9] min-h-[320px] sm:min-h-[440px] lg:min-h-[520px] xl:min-h-[560px]">
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

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Slide sebelumnya"
              className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/60 bg-slate-950/65 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-slate-950/90 sm:left-6 sm:h-14 sm:w-14"
            >
              <ChevronLeftIcon className="h-7 w-7 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Slide berikutnya"
              className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/60 bg-slate-950/65 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-slate-950/90 sm:right-6 sm:h-14 sm:w-14"
            >
              <ChevronRightIcon className="h-7 w-7 stroke-[2.5]" />
            </button>
          </>
        )}

        {showDots && slides.length > 1 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2.5 rounded-full bg-slate-950/55 px-4 py-2 backdrop-blur-sm">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`h-3 rounded-full transition-all duration-300 ${
                  activeIdx === idx ? 'w-10 bg-[#fbbf24] shadow-sm' : 'w-3 bg-white/75 hover:bg-white'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// Sub-komponen Widget Profil Program Studi (About Prodi)
const AboutProdiWidget: React.FC<{
  primaryColor: string;
  tenantName?: string;
  alignment?: string;
  fallbackImage: string;
}> = ({ primaryColor, tenantName, alignment, fallbackImage }) => {
  const { tenant } = useTenant();
  const isImageRight = alignment === 'right';

  const profileQuery = useQuery({
    queryKey: ['public', 'profile', tenant?.id ?? null],
    queryFn: () => profileApi.public().then((res) => res.data),
  });

  const stored = profileQuery.data?.profile as Record<string, unknown> | null;
  const overview = typeof stored?.overview === 'string' ? stored.overview.trim() : '';
  const heroImageUrl = typeof stored?.heroImageUrl === 'string' ? stored.heroImageUrl.trim() : '';
  const imageUrl = heroImageUrl || fallbackImage || '/tentang-custom.png';

  return (
    <section className="relative overflow-hidden bg-editorial-paper py-16 lg:py-24">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Teks Uraian */}
          <div className={`space-y-6 ${isImageRight ? 'lg:col-span-7 lg:order-1' : 'lg:col-span-7 lg:order-2'}`}>
            <div className="space-y-3">
              <span
                className="inline-block py-1.5 px-4 rounded-full text-[13px] font-extrabold tracking-widest uppercase shadow-2xs"
                style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              >
                Profil Program Studi
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-slate-950 leading-[1.15]">
                {tenantName || tenant?.name || 'Program Studi UNUSU'}
              </h2>
            </div>

            {overview ? (
              <div
                className="prose prose-slate prose-lg max-w-none text-[16px] sm:text-[17px] text-slate-800 leading-[1.8] space-y-4"
                dangerouslySetInnerHTML={{ __html: overview }}
              />
            ) : (
              <p className="text-[16px] sm:text-[17px] text-slate-800 leading-[1.8] font-medium">
                Program studi berfokus pada pendidikan berkualitas tinggi yang menggabungkan keunggulan akademik,
                nilai-nilai Islam Ahlussunnah wal Jama&apos;ah, dan kesiapan berkarier di era transformasi global.
              </p>
            )}

            <div className="pt-2">
              <Link
                to="/profil"
                className="inline-flex min-h-[52px] items-center gap-2.5 px-7 py-3 rounded-xl font-extrabold text-[15px] text-white transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                style={{ backgroundColor: primaryColor }}
              >
                <span>Lihat Profil Lengkap</span>
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div className={`relative ${isImageRight ? 'lg:col-span-5 lg:order-2' : 'lg:col-span-5 lg:order-1'}`}>
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-lg">
              <GambarTentang
                src={imageUrl}
                alt={`Gambar profil ${tenantName || tenant?.name || 'Program Studi'}`}
                className="h-80 w-full object-cover object-center sm:h-96 lg:h-full lg:min-h-[460px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Sub-komponen Widget Komitmen Akademik & Visi Misi
const VisionMissionWidget: React.FC<{
  primaryColor: string;
  fallbackVision: string;
  fallbackMissions: string[];
}> = ({ primaryColor, fallbackVision, fallbackMissions }) => {
  const { tenant } = useTenant();
  const accentColor = tenant?.theme?.accentColor || '#fbbf24';

  const profileQuery = useQuery({
    queryKey: ['public', 'profile', tenant?.id ?? null],
    queryFn: () => profileApi.public().then((res) => res.data),
  });

  const stored = profileQuery.data?.visionMission as Record<string, unknown> | null;
  const storedVision = typeof stored?.vision === 'string' ? stored.vision.trim() : '';
  const rawMissions = typeof stored?.missions === 'string' ? stored.missions.trim() : '';
  let storedMissions: string[] = [];
  if (rawMissions.startsWith('[')) {
    try {
      const parsed = JSON.parse(rawMissions);
      if (Array.isArray(parsed)) {
        storedMissions = parsed
          .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
          .map((item) => item.replace(/^[-•*\d.)\s]+/, '').trim())
          .filter(Boolean);
      }
    } catch {
      // Bukan JSON valid — pakai pemecahan per baris.
    }
  }
  if (storedMissions.length === 0 && rawMissions) {
    storedMissions = rawMissions
      .split('\n')
      .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
      .filter(Boolean);
  }

  const vision = storedVision || fallbackVision;
  const missions = storedMissions.length > 0 ? storedMissions : fallbackMissions;

  return (
    <section className="py-16 sm:py-22 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span
            className="inline-block py-1.5 px-4 rounded-full text-[13px] font-extrabold tracking-widest uppercase mb-3"
            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
          >
            Visi &amp; Misi Program Studi
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Komitmen Akademik &amp; Visi Misi
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch">
          {/* Visi */}
          <article className="lg:col-span-5 flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
            <div
              className="h-1.5 w-full"
              style={{
                backgroundImage: `linear-gradient(90deg, ${primaryColor} 0%, ${primaryColor}cc 68%, ${accentColor} 100%)`,
              }}
            />
            <div
              className="relative flex flex-1 flex-col p-7 sm:p-9"
              style={{
                backgroundImage: `linear-gradient(180deg, ${primaryColor}08 0%, #ffffff 48%)`,
              }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none select-none absolute right-6 top-2 font-heading text-[96px] font-black leading-none"
                style={{ color: `${primaryColor}12` }}
              >
                &ldquo;
              </span>

              <div className="relative">
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-widest"
                  style={{
                    backgroundColor: `${primaryColor}10`,
                    borderColor: `${primaryColor}24`,
                    color: primaryColor,
                  }}
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                  <span>Visi Utama</span>
                </span>

                <div
                  className="mt-5 text-xl sm:text-[23px] font-extrabold leading-[1.58] tracking-tight text-slate-950"
                  dangerouslySetInnerHTML={{
                    __html:
                      vision ||
                      'Menjadi program studi unggul dalam pengembangan ilmu dan teknologi berkarakter nilai luhur.',
                  }}
                />
              </div>

              <div className="mt-auto pt-7">
                <div className="flex items-center gap-2.5 text-[12.5px] font-semibold text-slate-500">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span>Komitmen Mutu &amp; Tridharma Perguruan Tinggi</span>
                </div>
              </div>
            </div>

            <Link
              to="/visi-misi"
              className="group flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-7 py-4 text-[13px] font-bold transition-colors hover:bg-slate-50 sm:px-9"
              style={{ color: primaryColor }}
            >
              <span>Selengkapnya Visi &amp; Misi</span>
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </article>

          {/* Misi */}
          <article className="lg:col-span-7 flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/75 px-7 py-4 sm:px-8">
              <span className="text-[12.5px] font-extrabold uppercase tracking-widest text-slate-800">
                Misi Kami
              </span>
              {missions.length > 0 ? (
                <span
                  className="rounded-full border px-3 py-0.5 text-[11.5px] font-bold tabular-nums"
                  style={{
                    backgroundColor: `${primaryColor}0d`,
                    borderColor: `${primaryColor}24`,
                    color: primaryColor,
                  }}
                >
                  {missions.length} Poin
                </span>
              ) : null}
            </div>

            <div className="flex-1 divide-y divide-slate-100">
              {missions.length > 0 ? (
                missions.map((mission, idx) => (
                  <div key={idx} className="flex items-start gap-4 px-7 py-4 sm:px-8">
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[12px] font-extrabold tabular-nums"
                      style={{
                        backgroundColor: `${primaryColor}12`,
                        color: primaryColor,
                      }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className="text-[15px] text-slate-700 leading-relaxed font-medium">{mission}</p>
                  </div>
                ))
              ) : (
                <p className="px-7 py-8 text-[15px] text-slate-500 italic sm:px-8">
                  Misi program studi sedang diselaraskan.
                </p>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
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
    <section className="py-16 sm:py-22 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-5 border-b border-slate-200 gap-4">
          <div>
            <span
              className="inline-block py-1.5 px-4 rounded-full text-[13px] font-extrabold tracking-widest uppercase mb-3"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              Warta &amp; Informasi
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              {title || 'Berita & Kegiatan Terbaru'}
            </h2>
          </div>
          <Link
            to="/berita"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 text-[15px] font-extrabold transition-all hover:border-slate-500"
            style={{ color: primaryColor }}
          >
            <span>Lihat Semua Berita</span>
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-[16px] text-slate-700">
            Belum ada warta berita yang dipublikasikan.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {posts.map((post) => (
              <article
                key={post.id}
                className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <img
                    src={post.thumbnailUrl || '/gedung-unusu.jpg'}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {post.category && (
                    <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-lg bg-slate-950/80 text-[12px] font-extrabold text-white uppercase tracking-wider">
                      {post.category.name}
                    </span>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-[13px] font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <CalendarDaysIcon className="w-4 h-4 text-slate-600" />
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('id-ID') : '-'}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1.5">
                        <EyeIcon className="w-4 h-4 text-slate-600" />
                        {post.views || 0}x
                      </span>
                    </div>
                    <h3 className="text-[18px] font-extrabold text-slate-950 group-hover:text-emerald-800 transition-colors line-clamp-2 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-[15px] text-slate-800 line-clamp-3 leading-relaxed">
                      {post.excerpt || 'Baca selengkapnya mengenai pengumuman dan berita resmi program studi.'}
                    </p>
                  </div>
                  <Link
                    to={`/berita/${post.slug}`}
                    className="inline-flex min-h-[44px] items-center gap-2 text-[15px] font-extrabold pt-3 border-t border-slate-100 hover:underline"
                    style={{ color: primaryColor }}
                  >
                    <span>Baca Selengkapnya</span>
                    <ArrowRightIcon className="w-4 h-4" />
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
    <section className="py-16 sm:py-22 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-5 border-b border-slate-200 gap-4">
          <div>
            <span
              className="inline-block py-1.5 px-4 rounded-full text-[13px] font-extrabold tracking-widest uppercase mb-3"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              Dokumentasi Kegiatan
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              {title || 'Galeri Foto & Aktivitas'}
            </h2>
          </div>
          <Link
            to="/galeri"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 text-[15px] font-extrabold transition-all hover:border-slate-500"
            style={{ color: primaryColor }}
          >
            <span>Lihat Semua Foto</span>
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
        </div>

        {galleries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-[16px] text-slate-700 bg-white">
            Belum ada dokumentasi galeri kegiatan.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
            {galleries.map((gal) => (
              <Link
                key={gal.id}
                to="/galeri"
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-200 shadow-xs hover:shadow-xl transition-all"
              >
                <img
                  src={gal.coverImageUrl || '/gedung-unusu.jpg'}
                  alt={gal.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent flex flex-col justify-end p-5 text-white">
                  <p className="text-[16px] font-extrabold leading-snug line-clamp-2">{gal.title}</p>
                  <p className="mt-1 text-[13px] font-bold text-amber-300">
                    {gal._count?.items ?? gal.items?.length ?? 0} Foto Dokumentasi
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// Sub-komponen Widget Dosen
const LecturersWidget: React.FC<{
  title?: string;
  limit: number;
  primaryColor: string;
  accentColor: string;
}> = ({ title, limit, primaryColor, accentColor }) => {
  const lecturersQuery = useQuery({
    queryKey: ['public', 'lecturers', 'widget', limit],
    queryFn: () => lecturerApi.public().then((res) => (res.data.lecturers ?? []).slice(0, limit)),
  });

  const lecturers = lecturersQuery.data ?? [];

  // Sesuaikan jumlah kolom agar tidak menyisakan ruang kosong saat jumlah dosen sedikit
  const gridColsClass =
    lecturers.length === 1
      ? 'grid-cols-1 max-w-md mx-auto'
      : lecturers.length === 2
        ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto'
        : lecturers.length === 3
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <section className="relative py-16 sm:py-22 bg-editorial-paper border-t border-slate-200 overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-5 border-b border-slate-200/90 gap-4">
          <div>
            <span
              className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full text-[12px] font-extrabold tracking-widest uppercase mb-3 border"
              style={{
                backgroundColor: `${primaryColor}12`,
                color: primaryColor,
                borderColor: `${primaryColor}24`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              Tenaga Pendidik
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              {title || 'Dosen & Tenaga Pengajar'}
            </h2>
          </div>
          <Link
            to="/dosen"
            className="group/cta inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-300 bg-white/95 px-5 text-[15px] font-extrabold shadow-xs transition-all hover:shadow-md hover:border-slate-400"
            style={{ color: primaryColor }}
          >
            <span>Semua Dosen</span>
            <ArrowRightIcon className="w-4 h-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
          </Link>
        </div>

        {lecturersQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs animate-pulse"
              >
                <div className="aspect-[4/4.3] w-full bg-slate-200" />
                <div className="px-5 py-5 space-y-2.5">
                  <div className="h-4 w-44 rounded bg-slate-200" />
                  <div className="h-3 w-28 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : lecturers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-[16px] text-slate-700 bg-white/90">
            Belum ada data dosen yang ditambahkan.
          </div>
        ) : (
          <div className={`grid ${gridColsClass} gap-6 lg:gap-7`}>
            {lecturers.map((doc) => {
              const inisial = (doc.name || 'D')
                .replace(/^(Dr\.|Prof\.|Drs\.|Ir\.|H\.|Hj\.)\s+/i, '')
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0]?.toUpperCase())
                .join('');

              const identifier = doc.id || doc.nidn;
              const detailHref = identifier ? `/dosen/${identifier}` : '/dosen';
              const roleLabel = doc.academicRank || doc.education || 'Dosen Tetap';

              return (
                <Link
                  key={doc.id}
                  to={detailHref}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ outlineColor: primaryColor }}
                >
                  {/* Foto potret penuh agar sosok dosen tampil menonjol */}
                  <div className="relative aspect-[4/4.3] w-full overflow-hidden bg-slate-100">
                    {doc.photoUrl ? (
                      <img
                        src={doc.photoUrl}
                        alt={`Foto ${doc.name}`}
                        loading="lazy"
                        className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div
                      className={`relative h-full w-full flex flex-col items-center justify-center text-white ${
                        doc.photoUrl ? 'hidden' : ''
                      }`}
                      style={{ backgroundColor: primaryColor }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-[0.18]"
                        style={{
                          backgroundImage: `radial-gradient(${accentColor} 1px, transparent 1px)`,
                          backgroundSize: '20px 20px',
                        }}
                        aria-hidden="true"
                      />
                      <span className="relative z-10 text-5xl font-extrabold tracking-wider">
                        {inisial || 'DS'}
                      </span>
                      <span className="relative z-10 mt-2 text-[11px] font-bold uppercase tracking-widest text-white/75">
                        Tenaga Pendidik
                      </span>
                    </div>

                    {/* Gradasi tipis di bawah foto untuk kontras label jabatan */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/55 via-slate-950/15 to-transparent"
                    />
                    <span
                      className="absolute bottom-3.5 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[11.5px] font-extrabold shadow-xs backdrop-blur-sm"
                      style={{ color: primaryColor }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: accentColor }}
                      />
                      <span>{roleLabel}</span>
                    </span>
                  </div>

                  {/* Identitas dosen dengan tinggi sejajar antar kartu */}
                  <div className="flex flex-1 flex-col px-5 pt-4 pb-5 text-left">
                    <h3 className="min-h-[2.75rem] font-extrabold text-[16px] text-slate-950 leading-snug line-clamp-2 transition-colors group-hover:text-slate-800">
                      {doc.name}
                    </h3>

                    <p className="mt-1.5 min-h-[18px] text-[12.5px] font-mono font-semibold tracking-tight text-slate-500">
                      {doc.nidn ? `NIDN ${doc.nidn}` : '\u00A0'}
                    </p>

                    {doc.expertise ? (
                      <p className="mt-2 text-[13px] text-slate-600 line-clamp-1">
                        {doc.expertise}
                      </p>
                    ) : null}
                  </div>

                  {/* Footer aksi halus menuju detail profil dosen */}
                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/75 px-5 py-3 text-[13px] font-bold transition-colors group-hover:bg-slate-50">
                    <span style={{ color: primaryColor }}>Lihat Profil</span>
                    <ArrowRightIcon
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                      style={{ color: primaryColor }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

// Sub-komponen Widget Sarana & Prasarana
const FacilityGridWidget: React.FC<{ title?: string; limit: number; primaryColor: string }> = ({
  title,
  limit,
  primaryColor,
}) => {
  const facilitiesQuery = useQuery({
    queryKey: ['public', 'facilities', 'widget', limit],
    queryFn: () => facilityApi.public().then((res) => (res.data.facilities ?? []).slice(0, limit)),
  });

  const facilities = facilitiesQuery.data ?? [];

  return (
    <section className="py-16 sm:py-22 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-5 border-b border-slate-200 gap-4">
          <div>
            <span
              className="inline-block py-1.5 px-4 rounded-full text-[13px] font-extrabold tracking-widest uppercase mb-3"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              Fasilitas Kampus
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              {title || 'Sarana & Prasarana Pembelajaran'}
            </h2>
          </div>
          <Link
            to="/sarpras"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 text-[15px] font-extrabold transition-all hover:border-slate-500"
            style={{ color: primaryColor }}
          >
            <span>Semua Fasilitas</span>
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
        </div>

        {facilities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-[16px] text-slate-700">
            Belum ada data fasilitas yang ditambahkan.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map((fac) => (
              <div
                key={fac.id}
                className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <img
                    src={fac.imageUrl || '/logo-unusu.jpg'}
                    alt={fac.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {fac.category && (
                    <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-lg bg-slate-950/80 text-[12px] font-extrabold text-white uppercase tracking-wider">
                      {fac.category}
                    </span>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3 className="font-extrabold text-[18px] text-slate-950 group-hover:text-emerald-800 transition-colors">
                      {fac.name}
                    </h3>
                    {fac.location ? (
                      <p className="text-[14px] font-semibold text-slate-700 mt-1">{fac.location}</p>
                    ) : null}
                    {fac.description ? (
                      <p className="text-[15px] text-slate-800 line-clamp-3 mt-2.5 leading-relaxed">
                        {fac.description}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    to={`/sarpras/${fac.id}`}
                    className="inline-flex items-center gap-1.5 pt-3 text-[14px] font-bold transition-colors hover:underline"
                    style={{ color: primaryColor }}
                  >
                    <span>Lihat rincian</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// Sub-komponen Widget Dokumen Publik
const DocumentListWidget: React.FC<{ title?: string; limit: number; primaryColor: string }> = ({
  title,
  limit,
  primaryColor,
}) => {
  const dokumenQuery = useQuery({
    queryKey: ['public', 'dokumen-prodi', 'widget'],
    queryFn: () => dokumenProdiApi.publicList().then((res) => res.data.items),
    retry: 1,
  });

  const terbit = (dokumenQuery.data ?? []).slice(0, limit);

  return (
    <section className="py-16 sm:py-22 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-5 border-b border-slate-200 gap-4">
          <div>
            <span
              className="inline-block py-1.5 px-4 rounded-full text-[13px] font-extrabold tracking-widest uppercase mb-3"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              Unduhan &amp; Pedoman
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              {title || 'Dokumen & Pedoman Akademik'}
            </h2>
          </div>
          <Link
            to="/dokumen"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 text-[15px] font-extrabold transition-all hover:border-slate-500"
            style={{ color: primaryColor }}
          >
            <span>Semua Dokumen</span>
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
        </div>

        {terbit.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {terbit.map((d) => (
              <li key={d.id}>
                <Link
                  to="/dokumen"
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-400 hover:shadow-md"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${primaryColor}14`, color: primaryColor }}
                    >
                      <DocumentTextIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[16px] font-extrabold text-slate-950 group-hover:underline">
                        {d.judul}
                      </p>
                      <p className="mt-1 text-[14px] font-medium text-slate-700">
                        {[d.kategori, d.tahun, d.nomor].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 shrink-0 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-[16px] text-slate-700">Belum ada dokumen yang dipublikasikan.</p>
          </div>
        )}
      </div>
    </section>
  );
};

// Sub-komponen Widget Kurikulum
const CurriculumOverviewWidget: React.FC<{ title?: string; primaryColor: string }> = ({
  title,
  primaryColor,
}) => {
  const curriculumQuery = useQuery({
    queryKey: ['public', 'curriculum', 'widget'],
    queryFn: () => curriculumApi.public().then((res) => res.data),
  });

  const summary = curriculumQuery.data?.summary;
  const activeCurriculum = pickCurrentCurriculum(curriculumQuery.data?.curriculums ?? []);

  return (
    <section className="py-16 sm:py-22 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-5 border-b border-slate-200 gap-4">
          <div>
            <span
              className="inline-block py-1.5 px-4 rounded-full text-[13px] font-extrabold tracking-widest uppercase mb-3"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              Struktur Pembelajaran
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              {title || 'Kurikulum & Capaian Pembelajaran'}
            </h2>
          </div>
          <Link
            to="/kurikulum"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 text-[15px] font-extrabold transition-all hover:border-slate-500"
            style={{ color: primaryColor }}
          >
            <span>Struktur Kurikulum Lengkap</span>
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
        </div>

        {/* Kartu Metrik Kurikulum */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-extrabold text-slate-700 uppercase tracking-wider">
                Total Beban
              </span>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tabular-nums tracking-tight text-slate-950">
                {summary?.totalCredits ?? 144}
              </span>
              <span className="text-[15px] font-bold text-slate-700">SKS</span>
            </div>
            <p className="text-[14px] text-slate-700 mt-2 font-medium">Beban kelulusan akademik</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-extrabold text-slate-700 uppercase tracking-wider">
                Masa Studi
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tabular-nums tracking-tight text-slate-950">
                {summary?.totalSemesters ?? 8}
              </span>
              <span className="text-[15px] font-bold text-slate-700">Semester</span>
            </div>
            <p className="text-[14px] text-slate-700 mt-2 font-medium">Paket kurikulum standar</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-extrabold text-slate-700 uppercase tracking-wider">
                Mata Kuliah
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tabular-nums tracking-tight text-slate-950">
                {summary?.totalCourses ?? 48}
              </span>
              <span className="text-[15px] font-bold text-slate-700">MK Inti</span>
            </div>
            <p className="text-[14px] text-slate-700 mt-2 font-medium">Distribusi materi komprehensif</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-extrabold text-slate-700 uppercase tracking-wider">
                Dokumen RPS
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tabular-nums tracking-tight text-slate-950">
                {summary?.totalRps ?? 48}
              </span>
              <span className="text-[15px] font-bold text-slate-700">Tersedia</span>
            </div>
            <p className="text-[14px] text-slate-700 mt-2 font-medium">Rencana pembelajaran semester</p>
          </div>
        </div>

        {/* Banner Kurikulum Berlaku */}
        {activeCurriculum && (
          <div className="relative overflow-hidden p-6 sm:p-8 rounded-2xl border border-emerald-900/15 bg-editorial-paper flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-xs">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <span className="text-[14px] font-extrabold text-emerald-950 uppercase tracking-wider">
                  Kurikulum Berlaku: {activeCurriculum.name} (Tahun {activeCurriculum.year})
                </span>
              </div>
              <p className="text-[15px] text-slate-800 max-w-3xl leading-relaxed font-medium">
                {activeCurriculum.description ||
                  'Disusun mengacu pada Kerangka Kualifikasi Nasional Indonesia (KKNI) dan Standar Nasional Pendidikan Tinggi berbasis Outcome-Based Education (OBE).'}
              </p>
            </div>
            <Link
              to="/kurikulum"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 px-6 py-3 rounded-xl text-[15px] font-extrabold text-white shrink-0 shadow-md transition-all hover:opacity-95"
              style={{ backgroundColor: primaryColor }}
            >
              <span>Buka Kurikulum</span>
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default WidgetRenderer;
