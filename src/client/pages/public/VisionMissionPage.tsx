import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { GambarTentang } from '../../components/ui/GambarTentang';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { profileApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/**
 * Gambar pendukung bawaan halaman visi & misi.
 *
 * Sama dengan halaman profil: memakai gambar gedung portal `/tentang` agar
 * seluruh halaman fakultas/prodi memiliki identitas visual yang seragam.
 */
const DEFAULT_VISION_IMAGE = '/tentang-custom.png';

/**
 * Mengubah isi kolom `missions` menjadi daftar butir misi.
 *
 * Data tersimpan dalam dua bentuk berbeda, tergantung cara pengisiannya:
 *  - teks biasa dengan satu butir per baris (hasil editor lama);
 *  - JSON array string, mis. `["Butir pertama.","Butir kedua."]`.
 *
 * Bentuk kedua dulu tidak dikenali sehingga yang tampil di halaman publik
 * adalah deretan tanda kutip dan koma mentah. Sekarang kedua bentuk dibaca
 * dengan hasil yang sama.
 */
function uraikanMisi(missions: string): string[] {
  if (!missions.trim()) return [];

  const teks = missions.trim();

  // Bentuk JSON array.
  if (teks.startsWith('[')) {
    try {
      const parsed = JSON.parse(teks);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
          .map((item) => item.replace(/^[-•*\d.)\s]+/, '').trim())
          .filter(Boolean);
      }
    } catch {
      // Bukan JSON yang sah: jatuh ke pemecahan per baris di bawah.
    }
  }

  // Bentuk teks biasa, satu butir per baris.
  return teks
    .split('\n')
    .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean);
}

/** Halaman publik visi dan misi. */
export const VisionMissionPage: React.FC = () => {
  const { tenant } = useTenant();
  const isFaculty = tenant?.tenantType === 'faculty';
  const unitLabel = isFaculty ? 'Fakultas' : 'Program Studi';
  const accent = tenant?.theme?.accentColor ?? '#fbbf24';

  useSeo({
    tenant,
    title: 'Visi dan Misi',
    description: `Visi, misi, dan sasaran strategis ${unitLabel.toLowerCase()}.`,
  });

  const profileQuery = useQuery({
    queryKey: ['public', 'profile'],
    queryFn: () => profileApi.public().then((res) => res.data),
  });

  const profileRaw = profileQuery.data?.profile as Record<string, unknown> | null;
  const visionMission = profileQuery.data?.visionMission as Record<string, unknown> | null;

  const vision = typeof visionMission?.vision === 'string' ? visionMission.vision : '';
  const missions = typeof visionMission?.missions === 'string' ? visionMission.missions : '';
  const objectives = typeof visionMission?.objectives === 'string' ? visionMission.objectives : '';
  const goals = typeof visionMission?.strategicGoals === 'string' ? visionMission.strategicGoals : '';

  const missionList = uraikanMisi(missions);

  const hasContent = vision || missionList.length > 0 || objectives || goals;

  const heroGambar =
    (typeof profileRaw?.heroImageUrl === 'string' && profileRaw.heroImageUrl.trim()) ||
    DEFAULT_VISION_IMAGE;

  return (
    <>
      <PageHeader
        eyebrow="Informasi"
        title="Visi & Misi"
        description={`Arah pengembangan dan komitmen ${unitLabel.toLowerCase()} dalam penyelenggaraan Tridharma Perguruan Tinggi.`}
      />

      {/*
        Section pembungkus sengaja TANPA `max-w-7xl`: foto pendukung harus
        menyentuh tepi layar. Batas lebar hanya diterapkan pada teks di
        dalamnya, supaya uraian tetap nyaman dibaca.
      */}
      <section className="py-0">
        {profileQuery.isLoading ? (
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <LoadingState label="Memuat visi dan misi" rows={2} />
          </div>
        ) : profileQuery.isError ? (
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <ErrorState
              message={toApiError(profileQuery.error).message}
              onRetry={() => void profileQuery.refetch()}
            />
          </div>
        ) : !hasContent ? (
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <EmptyState
              title="Visi dan misi belum tersedia"
              description={`${unitLabel} belum mengisi konten visi dan misi.`}
            />
          </div>
        ) : (
          /*
           * Tata letak dua kolom: gambar di samping kiri, uraian visi-misi di
           * kanan.
           *
           * Gambar sengaja TIDAK dibungkus card: tanpa `rounded`, tanpa border,
           * dan kolomnya menyentuh tepi layar — hanya sisi kanannya yang diberi
           * batas agar tetap terpisah dari teks. Di layar kecil gambar tampil
           * lebih dahulu, juga tanpa bingkai.
           */
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
            <aside className="lg:col-span-6 xl:col-span-5">
              <figure className="relative overflow-hidden bg-slate-100 lg:sticky lg:top-24">
                <GambarTentang
                  src={heroGambar}
                  alt={`Foto pendukung ${unitLabel.toLowerCase()}`}
                  className="h-[280px] w-full object-cover object-center sm:h-[360px] lg:h-[560px] lg:rounded-r-3xl"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-6 py-5 text-[11px] font-semibold text-white">
                  {tenant?.name ?? unitLabel} &bull; Universitas Nahdlatul Ulama Sumatera Utara
                </figcaption>
              </figure>
            </aside>

            <div className="space-y-6 px-4 pb-14 sm:px-6 lg:col-span-6 lg:pr-8 xl:col-span-7">
              {vision ? (
                <div className="rounded-2xl p-8" style={{ backgroundColor: accent }}>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-900/70">Visi</p>
                  <p className="mt-3 text-base font-semibold leading-relaxed text-slate-950 sm:text-lg">
                    {vision}
                  </p>
                </div>
              ) : null}

              {missionList.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Misi</p>
                  <ol className="mt-4 space-y-3">
                    {missionList.map((mission, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: accent }} />
                        <span className="text-sm leading-relaxed text-slate-700">{mission}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {objectives ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tujuan</p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {objectives}
                  </p>
                </div>
              ) : null}

              {goals ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Sasaran Strategis
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{goals}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default VisionMissionPage;
