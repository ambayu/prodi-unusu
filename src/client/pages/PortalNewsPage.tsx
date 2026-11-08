import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  EyeIcon,
  NewspaperIcon,
} from '@heroicons/react/24/outline';
import { api, toApiError } from '../services/api';
import {
  formatTanggalIndonesia,
  type PortalNews,
  type PortalNewsResponse,
} from '../services/directory';
import { ErrorState, LoadingState } from '../components/ui/States';

/**
 * Arsip berita seluruh program studi.
 *
 * Berita memiliki slug yang hanya unik di dalam satu program studi, sehingga
 * detailnya selalu dibuka di domain prodi asal (tab baru). Halaman ini adalah
 * pintu masuk lintas prodi untuk portal.
 */

const PER_PAGE = 12;

const NewsCard: React.FC<{ item: PortalNews }> = ({ item }) => {
  const href = item.url;
  const Card: React.ElementType = href ? 'a' : 'div';
  const props = href
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <Card
      {...props}
      className="group flex min-h-[44px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100">
            <NewspaperIcon className="h-10 w-10 text-emerald-700/30" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-emerald-700 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
          {item.studyProgramCode}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-bold text-emerald-800">{item.studyProgramName}</p>
        <h3 className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-slate-900 transition-colors group-hover:text-emerald-800">
          {item.title}
        </h3>
        {item.excerpt && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{item.excerpt}</p>
        )}

        <div className="mt-auto flex items-center gap-3 pt-4 text-[11px] font-medium text-slate-400">
          <span className="inline-flex items-center gap-1">
            <CalendarDaysIcon className="h-3.5 w-3.5" />
            {formatTanggalIndonesia(item.publishedAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <EyeIcon className="h-3.5 w-3.5" />
            {item.views.toLocaleString('id-ID')}
          </span>
          {href && (
            <span className="ml-auto inline-flex items-center gap-1 font-bold text-emerald-700">
              Selengkapnya
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

export const PortalNewsPage: React.FC = () => {
  const [limit, setLimit] = useState(PER_PAGE);

  const newsQuery = useQuery({
    queryKey: ['public', 'news', limit],
    queryFn: () =>
      api.get<PortalNewsResponse>('/public/news', { params: { limit } }).then((res) => res.data),
  });

  const items = newsQuery.data?.items ?? [];
  const mayHaveMore = items.length >= limit && limit < 24;

  return (
    <div className="min-h-screen bg-[#F1F5F2]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
              KABAR KAMPUS
            </p>
            <h1 className="text-2xl font-extrabold text-slate-900">Berita Program Studi</h1>
            <p className="mt-1.5 max-w-2xl text-xs text-slate-500 sm:text-sm">
              Kumpulan berita, prestasi, dan pengumuman dari seluruh website program studi
              Universitas Nahdlatul Ulama Sumatera Utara.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-emerald-600 hover:text-emerald-800"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Beranda Portal
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {newsQuery.isLoading && <LoadingState label="Memuat berita program studi" />}

        {newsQuery.isError && <ErrorState message={toApiError(newsQuery.error).message} />}

        {newsQuery.isSuccess && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <NewspaperIcon className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">Belum ada berita terbit</p>
            <p className="mt-1 text-xs text-slate-500">
              Berita akan tampil setelah dipublikasikan dari panel website prodi.
            </p>
          </div>
        )}

        {newsQuery.isSuccess && items.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>

            {mayHaveMore && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => setLimit((value) => Math.min(value + PER_PAGE, 24))}
                  disabled={newsQuery.isFetching}
                  className="inline-flex min-h-[44px] items-center rounded-xl bg-emerald-700 px-6 text-sm font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
                >
                  {newsQuery.isFetching ? 'Memuat…' : 'Muat berita lainnya'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default PortalNewsPage;
