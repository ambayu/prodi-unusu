import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownTrayIcon, FolderOpenIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { documentApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/** Memformat ukuran berkas. */
function formatSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Halaman publik bank dokumen. */
export const DocumentsPage: React.FC = () => {
  const { tenant } = useTenant();
  useSeo({ tenant, title: 'Dokumen', description: 'Repository dokumen akademik dan SOP program studi.' });

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');

  const documentsQuery = useQuery({
    queryKey: ['public', 'documents'],
    queryFn: () => documentApi.public().then((res) => res.data.documents),
  });

  const categories = useMemo(() => {
    const unique = new Set((documentsQuery.data ?? []).map((document) => document.category));
    return Array.from(unique).sort();
  }, [documentsQuery.data]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (documentsQuery.data ?? []).filter((document) => {
      const matchCategory = category === 'all' || document.category === category;
      const matchKeyword =
        keyword === '' ||
        document.title.toLowerCase().includes(keyword) ||
        (document.code ?? '').toLowerCase().includes(keyword) ||
        (document.description ?? '').toLowerCase().includes(keyword);
      return matchCategory && matchKeyword;
    });
  }, [documentsQuery.data, search, category]);

  return (
    <>
      <PageHeader
        eyebrow="Repository"
        title="Dokumen Program Studi"
        description="Pedoman akademik, prosedur operasional, surat keputusan, dan dokumen pendukung lainnya."
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {documentsQuery.isLoading ? (
          <LoadingState label="Memuat dokumen" rows={4} />
        ) : documentsQuery.isError ? (
          <ErrorState
            message={toApiError(documentsQuery.error).message}
            onRetry={() => void documentsQuery.refetch()}
          />
        ) : (documentsQuery.data ?? []).length === 0 ? (
          <EmptyState
            title="Belum ada dokumen publik"
            description="Program studi belum mengunggah dokumen yang dapat diakses publik."
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari judul atau kode dokumen"
                  aria-label="Cari dokumen"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Saring kategori dokumen"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Semua kategori</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <ul className="mt-5 space-y-3">
              {filtered.length === 0 ? (
                <li>
                  <EmptyState
                    title="Tidak ada hasil"
                    description="Tidak ada dokumen yang cocok dengan pencarian Anda."
                  />
                </li>
              ) : (
                filtered.map((document) => (
                  <li
                    key={document.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8eefb] text-[#1e3a8a]">
                        <FolderOpenIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">{document.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {document.category} â€¢ {document.year}
                          {document.code ? ` â€¢ ${document.code}` : ''} â€¢ {formatSize(document.fileSize)}
                        </p>
                        {document.description ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                            {document.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <a
                      href={document.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#1e3a8a] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#172f6e]"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      Unduh
                    </a>
                  </li>
                ))
              )}
            </ul>

            <p className="mt-3 text-[11px] text-slate-500">
              Menampilkan {filtered.length} dari {documentsQuery.data?.length ?? 0} dokumen.
            </p>
          </>
        )}
      </section>
    </>
  );
};

export default DocumentsPage;

