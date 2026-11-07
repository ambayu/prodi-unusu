import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDaysIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { galleryApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/** Halaman publik galeri kegiatan. */
export const GalleriesPage: React.FC = () => {
  const { tenant } = useTenant();
  useSeo({ tenant, title: 'Galeri', description: 'Dokumentasi kegiatan program studi.' });

  const galleriesQuery = useQuery({
    queryKey: ['public', 'galleries'],
    queryFn: () => galleryApi.public().then((res) => res.data.galleries),
  });

  return (
    <>
      <PageHeader
        eyebrow="Multimedia"
        title="Galeri Kegiatan"
        description="Dokumentasi kegiatan akademik, kemahasiswaan, dan kerja sama program studi."
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {galleriesQuery.isLoading ? (
          <LoadingState label="Memuat galeri" rows={3} />
        ) : galleriesQuery.isError ? (
          <ErrorState
            message={toApiError(galleriesQuery.error).message}
            onRetry={() => void galleriesQuery.refetch()}
          />
        ) : (galleriesQuery.data ?? []).length === 0 ? (
          <EmptyState
            title="Belum ada album galeri"
            description="Program studi belum mempublikasikan album kegiatan."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(galleriesQuery.data ?? []).map((gallery) => (
              <article
                key={gallery.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                {gallery.coverImageUrl ? (
                  <img
                    src={gallery.coverImageUrl}
                    alt={`Sampul album ${gallery.title}`}
                    loading="lazy"
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-slate-100">
                    <PhotoIcon className="h-12 w-12 text-slate-300" />
                  </div>
                )}

                <div className="p-5">
                  <h2 className="text-sm font-bold text-slate-900">{gallery.title}</h2>

                  <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                    {gallery.category ? <span>{gallery.category}</span> : null}
                    {gallery.eventDate ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDaysIcon className="h-3.5 w-3.5" />
                        {new Date(gallery.eventDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                      </span>
                    ) : null}
                  </div>

                  {gallery.description ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                      {gallery.description}
                    </p>
                  ) : null}

                  {gallery.items && gallery.items.length > 0 ? (
                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                      {gallery.items.slice(0, 4).map((item) => (
                        <img
                          key={item.id}
                          src={item.mediaUrl}
                          alt={item.caption ?? gallery.title}
                          loading="lazy"
                          className="h-14 w-full rounded object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export default GalleriesPage;

