import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/ui/PageHeader';
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

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {profileQuery.isLoading ? (
          <LoadingState label="Memuat profil" rows={3} />
        ) : profileQuery.isError ? (
          <ErrorState
            message={toApiError(profileQuery.error).message}
            onRetry={() => void profileQuery.refetch()}
          />
        ) : filled.length === 0 ? (
          <EmptyState
            title="Profil belum tersedia"
            description={`${unitLabel} belum mengisi konten profil. Silakan periksa kembali nanti.`}
          />
        ) : (
          /*
           * Tata letak dua kolom: gambar di kiri, seluruh uraian di kanan.
           * Di layar kecil kolom menumpuk dengan gambar lebih dulu agar pembaca
           * langsung melihat konteks visualnya.
           */
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
            <aside className="lg:col-span-5">
              <figure className="overflow-hidden rounded-2xl bg-slate-100 lg:sticky lg:top-28">
                <img
                  src={heroGambar}
                  alt={`Foto pendukung ${unitLabel.toLowerCase()}`}
                  className="h-72 w-full object-cover object-center sm:h-96 lg:h-[520px]"
                  loading="lazy"
                />
                <figcaption className="bg-slate-50 px-4 py-3 text-[11px] font-semibold text-slate-500">
                  {tenant?.name ?? unitLabel} &bull; Universitas Nahdlatul Ulama Sumatera Utara
                </figcaption>
              </figure>
            </aside>

            <div className="space-y-8 lg:col-span-7">
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
