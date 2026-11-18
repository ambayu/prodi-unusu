import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDaysIcon,
  EyeIcon,
  TagIcon,
  ArrowLeftIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { postApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

export const PostDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { tenant } = useTenant();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['public', 'post', slug],
    queryFn: () => postApi.publicDetail(slug!).then((res) => res.data.post),
    enabled: Boolean(slug),
  });

  const post = data;

  useSeo({
    tenant,
    title: post ? post.title : 'Detail Berita',
    description: post?.excerpt || 'Detail berita dan pengumuman resmi.',
    image: post?.thumbnailUrl || undefined,
  });

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        text: post?.excerpt || undefined,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Tautan berita berhasil disalin ke clipboard!');
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={post?.category?.name || 'Kabar & Berita'}
        title={post?.title || 'Detail Berita'}
        description={
          post?.publishedAt
            ? `Diterbitkan pada ${new Date(post.publishedAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}`
            : 'Informasi dan dokumentasi kegiatan sivitas akademika.'
        }
      />

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/berita"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Kembali ke Daftar Berita
          </Link>

          {post && (
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-xs transition hover:bg-slate-50 hover:text-slate-900"
            >
              <ShareIcon className="h-3.5 w-3.5" />
              Bagikan
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-xs">
            <LoadingState label="Memuat konten berita..." rows={5} />
          </div>
        ) : isError || !post ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-xs">
            <ErrorState
              message={toApiError(error).message || 'Berita tidak ditemukan'}
              onRetry={() => void refetch()}
            />
          </div>
        ) : (
          <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
            {post.thumbnailUrl && (
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                <img
                  src={post.thumbnailUrl}
                  alt={post.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="p-6 sm:p-10">
              <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-6 text-xs text-slate-500">
                {post.category && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-800">
                    <TagIcon className="h-3.5 w-3.5" />
                    {post.category.name}
                  </span>
                )}
                {post.publishedAt && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDaysIcon className="h-3.5 w-3.5" />
                    {new Date(post.publishedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <EyeIcon className="h-3.5 w-3.5" />
                  {post.views} pembaca
                </span>
              </div>

              {post.excerpt && (
                <p className="mt-6 text-base font-medium italic leading-relaxed text-slate-600 sm:text-lg">
                  "{post.excerpt}"
                </p>
              )}

              <div
                className="prose prose-slate prose-emerald mt-6 max-w-none text-slate-800 leading-relaxed sm:text-base [&>p]:mb-4 [&>h2]:mt-8 [&>h2]:mb-3 [&>h2]:text-xl [&>h2]:font-bold [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>
          </article>
        )}
      </section>
    </>
  );
};

export default PostDetailPage;
