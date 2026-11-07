import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDaysIcon, EyeIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { postApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/** Halaman publik berita dan pengumuman. */
export const PostsPage: React.FC = () => {
  const { tenant } = useTenant();
  useSeo({ tenant, title: 'Berita', description: 'Berita, pengumuman, dan prestasi terbaru program studi.' });

  const postsQuery = useQuery({
    queryKey: ['public', 'posts'],
    queryFn: () => postApi.publicList({ perPage: 12 }).then((res) => res.data),
  });

  return (
    <>
      <PageHeader
        eyebrow="Publikasi"
        title="Berita & Pengumuman"
        description="Kegiatan, prestasi, dan informasi terbaru dari program studi."
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {postsQuery.isLoading ? (
          <LoadingState label="Memuat berita" rows={3} />
        ) : postsQuery.isError ? (
          <ErrorState message={toApiError(postsQuery.error).message} onRetry={() => void postsQuery.refetch()} />
        ) : (postsQuery.data?.items ?? []).length === 0 ? (
          <EmptyState
            title="Belum ada berita terbit"
            description="Program studi belum menerbitkan berita atau pengumuman."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(postsQuery.data?.items ?? []).map((post) => (
              <article
                key={post.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                {post.thumbnailUrl ? (
                  <img
                    src={post.thumbnailUrl}
                    alt={`Ilustrasi berita ${post.title}`}
                    loading="lazy"
                    className="h-44 w-full object-cover"
                  />
                ) : null}

                <div className="flex flex-1 flex-col p-5">
                  {post.category ? (
                    <span className="self-start rounded bg-[#e8eefb] px-1.5 py-0.5 text-[10px] font-bold text-[#1e3a8a]">
                      {post.category.name}
                    </span>
                  ) : null}

                  <h2 className="mt-2 text-sm font-bold leading-snug text-slate-900">{post.title}</h2>

                  {post.excerpt ? (
                    <p className="mt-1.5 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-600">{post.excerpt}</p>
                  ) : null}

                  <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-500">
                    {post.publishedAt ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDaysIcon className="h-3.5 w-3.5" />
                        {new Date(post.publishedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1">
                      <EyeIcon className="h-3.5 w-3.5" />
                      {post.views}
                    </span>
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

export default PostsPage;

