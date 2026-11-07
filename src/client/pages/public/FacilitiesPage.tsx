import React from 'react';
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
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                {facility.imageUrl ? (
                  <img
                    src={facility.imageUrl}
                    alt={`Foto ${facility.name}`}
                    loading="lazy"
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-slate-100">
                    <BuildingOfficeIcon className="h-12 w-12 text-slate-300" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-bold text-slate-900">{facility.name}</h2>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        facility.status === 'aktif'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {facility.status}
                    </span>
                  </div>

                  <p className="mt-0.5 text-[11px] font-semibold text-[#1e3a8a]">{facility.category}</p>

                  {facility.location ? (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
                      <MapPinIcon className="h-3.5 w-3.5" />
                      {facility.location}
                    </p>
                  ) : null}

                  {facility.description ? (
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{facility.description}</p>
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

export default FacilitiesPage;

