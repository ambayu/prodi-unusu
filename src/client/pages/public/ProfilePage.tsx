import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/ui/PageHeader';
import { GambarTentang } from '../../components/ui/GambarTentang';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { profileApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/**
 * Gambar pendukung bawaan halaman profil.
 *
 * Dipakai bila admin belum mengunggah `heroImageUrl`. Berkasnya sama dengan
 * gambar gedung pada portal `/tentang`, sehingga identitas visual antarhalaman
 * tetap seragam tanpa perlu menyiapkan berkas baru.
 */
const DEFAULT_PROFILE_IMAGE = '/tentang-custom.png';

/** Halaman publik profil program studi / fakultas. */
export const ProfilePage: React.FC = () => {
  const { tenant } = useTenant();
  const isFaculty = tenant?.tenantType === 'faculty';
  const unitLabel = isFaculty ? 'Fakultas' : 'Program Studi';
  const primary = tenant?.theme?.primaryColor ?? '#1e3a8a';
  const accent = tenant?.theme?.accentColor ?? '#fbbf24';

  useSeo({
    tenant,
    title: 'Profil',
    description: `Sejarah, tujuan, dan sasaran ${unitLabel.toLowerCase()}.`,
  });

  const profileQuery = useQuery({
    queryKey: ['public', 'profile'],
    queryFn: () => profileApi.public().then((res) => res.data),
  });

  const profile = profileQuery.data?.profile as Record<string, unknown> | null;

  const sections = [
    { key: 'overview', label: `Deskripsi ${unitLabel}` },
    { key: 'history', label: 'Sejarah' },
    { key: 'objectives', label: 'Tujuan' },
    { key: 'targets', label: 'Sasaran' },
    { key: 'organization', label: isFaculty ? 'Struktur Dekanat & Pimpinan' : 'Struktur Organisasi' },
  ] as const;

  const filled = sections.filter((section) => {
    const value = profile?.[section.key];
    return typeof value === 'string' && value.trim() !== '';
  });

  /**
   * Gambar pendamping. Selalu ada — entah unggahan admin atau gambar bawaan —
   * sehingga tata letak dua kolom tidak pernah melebar penuh tanpa gambar.
   */
  const heroGambar =
    (typeof profile?.heroImageUrl === 'string' && profile.heroImageUrl.trim()) || DEFAULT_PROFILE_IMAGE;

  return (
    <>
      <PageHeader
        eyebrow="Profil"
        title={`Tentang ${unitLabel}`}
        description={`Sejarah, deskripsi, tujuan, sasaran, dan struktur organisasi ${unitLabel.toLowerCase()}.`}
      />

      {/*
        Section pembungkus sengaja TANPA `max-w-7xl`: foto pendukung harus
        menyentuh tepi layar. Batas lebar hanya diterapkan pada teks di
        dalamnya, supaya uraian tetap nyaman dibaca.

        Jarak atas (`pt-10 sm:pt-14`) memberi napas antara banner judul dan
        foto/konten di bawahnya. Tanpa ini gambar langsung menempel ke banner
        sehingga halaman terasa sesak.
      */}
      <section className="py-10 sm:py-14">
        {profileQuery.isLoading ? (
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <LoadingState label="Memuat profil" rows={3} />
          </div>
        ) : profileQuery.isError ? (
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <ErrorState
              message={toApiError(profileQuery.error).message}
              onRetry={() => void profileQuery.refetch()}
            />
          </div>
        ) : filled.length === 0 ? (
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <EmptyState
              title="Profil belum tersedia"
              description={`${unitLabel} belum mengisi konten profil. Silakan periksa kembali nanti.`}
            />
          </div>
        ) : (
          /*
           * Tata letak:
           *  1. foto pendukung selebar layar, tanpa bingkai kartu;
           *  2. uraian profil di bawahnya, dibatasi lebar baca.
           */
          /*
           * Tata letak dua kolom: gambar di samping kiri, uraian profil di kanan.
           *
           * Gambar sengaja TIDAK dibungkus card: tanpa `rounded`, tanpa border,
           * dan kolomnya menyentuh tepi layar — hanya sisinya yang diberi sudut
           * agar tetap terpisah dari teks. Di layar kecil gambar tampil lebih
           * dahulu, juga tanpa bingkai.
           */
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch lg:gap-10">
            <aside className="px-4 pb-6 lg:col-span-6 xl:col-span-5 lg:relative lg:pb-0">
              <figure className="lg:absolute lg:inset-0">
                <GambarTentang
                  src={heroGambar}
                  alt={`Foto pendukung ${unitLabel.toLowerCase()}`}
                  className="mx-auto h-auto w-full max-w-md object-contain lg:h-full lg:max-w-none"
                />
              </figure>
            </aside>

            <div className="space-y-8 px-4 pb-14 sm:px-6 lg:col-span-6 lg:pr-8 xl:col-span-7">
              {filled.map((section) => (
                <article key={section.key}>
                  <h2
                    className="border-l-2 pl-3 text-lg font-extrabold tracking-tight text-slate-900"
                    style={{ borderColor: accent }}
                  >
                    {section.label}
                  </h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {profile?.[section.key] as string}
                  </p>
                </article>
              ))}

              {/* Penanda warna tema agar halaman tetap terasa milik tenant ini */}
              <div
                className="rounded-2xl px-5 py-4 text-xs font-semibold text-white"
                style={{ backgroundColor: primary }}
              >
                Ingin tahu arah pengembangan {unitLabel.toLowerCase()}? Lihat halaman Visi &amp; Misi.
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default ProfilePage;
