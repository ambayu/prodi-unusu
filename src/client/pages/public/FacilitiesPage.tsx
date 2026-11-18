import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BuildingOfficeIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { facilityApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/** Halaman publik sarana dan prasarana. */
export const FacilitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  useSeo({ tenant, title: 'Sarana dan Prasarana', description: 'Laboratorium dan fasilitas pendukung pembelajaran program studi.' });

  const facilitiesQuery = useQuery({
    queryKey: ['public', 'facilities'],
    queryFn: () => facilityApi.public().then((res) => res.data.facilities),
  });

  return (
    <>
      <PageHeader
        eyebrow="Informasi"
        title="Sarana & Prasarana"
        description="Laboratorium, ruang kelas, dan fasilitas pendukung pembelajaran program studi."
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {facilitiesQuery.isLoading ? (
          <LoadingState label="Memuat fasilitas" rows={3} />
        ) : facilitiesQuery.isError ? (
          <ErrorState
            message={toApiError(facilitiesQuery.error).message}
            onRetry={() => void facilitiesQuery.refetch()}
          />
        ) : (facilitiesQuery.data ?? []).length === 0 ? (
          <EmptyState
            title="Belum ada data fasilitas"
            description="Program studi belum menambahkan informasi sarana dan prasarana."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(facilitiesQuery.data ?? []).map((facility) => (
              <article
                key={facility.id}
                onClick={() => navigate(`/sarana-prasarana/${facility.id}`)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl cursor-pointer"
              >
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  <img
                    src={facility.imageUrl || '/logo-unusu.jpg'}
                    alt={`Foto ${facility.name}`}
                    loading="lazy"
                    className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                      !facility.imageUrl ? 'opacity-40 grayscale object-contain p-6' : ''
                    }`}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.endsWith('/logo-unusu.jpg')) {
                        target.src = '/logo-unusu.jpg';
                        target.className = 'h-full w-full object-contain p-6 opacity-40 grayscale';
                      }
                    }}
                  />
                  {!facility.imageUrl ? (
                    <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-xs">
                      Default UNUSU
                    </span>
                  ) : null}

                  <span
                    className={`absolute top-3 right-3 shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-sm backdrop-blur-md ${
                      facility.status === 'aktif'
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-amber-500/90 text-white'
                    }`}
                  >
                    {facility.status}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">{facility.category}</p>
                  <h2 className="mt-1 text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition line-clamp-2">
                    {facility.name}
                  </h2>

                  {facility.location ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{facility.location}</span>
                    </p>
                  ) : null}

                  {facility.description ? (
                    <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
                      {facility.description}
                    </p>
                  ) : null}

                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100 text-xs font-bold text-blue-600 group-hover:underline">
                    <span>Lihat Rincian Fasilitas</span>
                    <span>&rarr;</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export default FacilitiesPage;

