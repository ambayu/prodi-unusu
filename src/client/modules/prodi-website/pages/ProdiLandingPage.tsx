import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, toApiError } from '../../../services/api';
import { WidgetRenderer } from '../../../components/builder/WidgetRenderer';
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States';

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
  isPublished: boolean;
  sections: RenderedSection[];
}

export const ProdiLandingPage: React.FC = () => {
  // Ambil halaman beranda dari page builder public API
  const pageQuery = useQuery({
    queryKey: ['public', 'page', 'beranda'],
    queryFn: () =>
      api.get<{ page: RenderedPage }>('/public/pages/beranda').then((res) => res.data.page),
    retry: 1,
  });

  if (pageQuery.isLoading) {
    return (
      <div className="py-24 max-w-7xl mx-auto px-4">
        <LoadingState label="Memuat beranda program studi..." />
      </div>
    );
  }

  // Jika halaman beranda belum ada section atau belum terbit, tampilkan fallback yang aman
  const page = pageQuery.data;
  const sections = (page?.sections ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (!page || sections.length === 0) {
    // Default fallback bila prodi baru belum menyusun seksi di Page Builder
    return (
      <div className="pb-16 font-sans bg-white">
        <WidgetRenderer
          widgetCode="hero_slider"
          config={{
            slides: [
              { imageUrl: '/heroslider-full.png', alt: 'Hero Banner UNUSU' },
              { imageUrl: '/hero-slide-generated.png', alt: 'Slide 2' },
            ],
            autoplayMs: 5000,
            showDots: true,
          }}
        />
        <WidgetRenderer
          widgetCode="about_prodi"
          config={{
            eyebrow: 'Mengenal Program Studi',
            title: 'Membangun Generasi Unggul dan Berkarakter Ahlussunnah wal Jamaah',
            alignment: 'left',
            imageUrl: '/rektorat-unusu.jpg',
            body: '<p>Program studi mengedepankan integrasi keilmuan mutakhir dengan integritas nilai moral Islam untuk mempersiapkan lulusan yang kompeten di tingkat nasional maupun internasional.</p>',
          }}
        />
        <WidgetRenderer
          widgetCode="latest_news"
          config={{ title: 'Berita & Warta Kampus', limit: 6 }}
        />
        <WidgetRenderer
          widgetCode="gallery_grid"
          config={{ title: 'Galeri Foto Kegiatan', limit: 6 }}
        />
      </div>
    );
  }

  // Render Section & Widget MURNI berdasarkan urutan di Page Builder!
  return (
    <div className="pb-12 font-sans bg-white">
      {sections.map((section) => {
        const sortedWidgets = (section.widgets ?? [])
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder);

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
      })}
    </div>
  );
};

export default ProdiLandingPage;
