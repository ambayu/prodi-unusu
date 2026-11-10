import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, toApiError } from '../../services/api';
import { WidgetRenderer } from '../../components/builder/WidgetRenderer';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { HomeIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useTenant } from '../../hooks/useSite';

interface RenderedWidget {
  id: number;
  widgetCode: string;
  widgetName: string;
  variantCode?: string | null;
  sortOrder: number;
  config: Record<string, any>;
}

interface RenderedSection {
  id: number;
  sectionKey: string;
  title: string | null;
  sortOrder: number;
  widgets: RenderedWidget[];
}

interface RenderedPage {
  id: number;
  slug: string;
  title: string;
  layout: string;
  seoTitle?: string;
  seoDescription?: string;
  sections: RenderedSection[];
}

export const DynamicCustomPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { tenant } = useTenant();

  const pageQuery = useQuery({
    queryKey: ['public', 'custom-page', slug],
    queryFn: () =>
      api.get<{ page: RenderedPage }>(`/public/pages/${slug}`).then((res) => res.data.page),
    enabled: Boolean(slug),
  });

  if (pageQuery.isLoading) {
    return (
      <div className="py-24 max-w-7xl mx-auto px-4">
        <LoadingState label="Memuat konten halaman..." />
      </div>
    );
  }

  if (pageQuery.isError || !pageQuery.data) {
    return (
      <div className="py-24 max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Halaman Tidak Ditemukan</h1>
        <p className="text-sm text-slate-600 mb-6">
          Halaman yang Anda tuju belum diterbitkan atau tautan telah berpindah.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-md hover:bg-emerald-800 transition-colors"
        >
          <HomeIcon className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>
    );
  }

  const page = pageQuery.data;
  const sections = (page.sections ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="font-sans bg-white pb-16">
      {/* Page Header Banner */}
      <div className="bg-slate-900 text-white py-12 px-4 sm:px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 space-y-3">
          <nav className="flex items-center gap-2 text-xs text-slate-300 font-medium">
            <Link to="/" className="hover:text-amber-400 transition-colors">
              Beranda
            </Link>
            <ChevronRightIcon className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-white font-bold">{page.title}</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">{page.title}</h1>
        </div>
      </div>

      {/* Render All Sections & Widgets */}
      <div className="w-full">
        {sections.length === 0 ? (
          <div className="max-w-4xl mx-auto py-16 px-4 text-center text-xs text-slate-400">
            Halaman ini belum memiliki widget section aktif di Page Builder.
          </div>
        ) : (
          sections.map((section) => {
            const sortedWidgets = (section.widgets ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
            return (
              <div key={section.id} id={`section-${section.sectionKey}`} className="w-full">
                {sortedWidgets.map((widget) => (
                  <WidgetRenderer
                    key={widget.id}
                    widgetCode={widget.widgetCode}
                    config={widget.config || {}}
                    variantCode={widget.variantCode}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DynamicCustomPage;
