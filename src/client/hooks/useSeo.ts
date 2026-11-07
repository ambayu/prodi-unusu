import { useEffect } from 'react';
import type { TenantContext } from '../../shared/types/index';

interface SeoOptions {
  tenant: TenantContext | null;
  title?: string;
  description?: string;
  path?: string;
}

/**
 * Menerapkan metadata SEO per domain.
 *
 * Setiap tenant memiliki judul dan deskripsi sendiri, sehingga hasil pencarian
 * dan pratinjau saat tautan dibagikan menampilkan identitas prodi yang benar
 * (docs/PRD.md bagian 14 SEO). Canonical memakai hostname yang sedang dibuka
 * agar setiap domain dihitung sebagai alamat resmi halamannya sendiri.
 */
export function useSeo({ tenant, title, description, path }: SeoOptions) {
  useEffect(() => {
    const siteTitle = tenant?.websiteSetting.seoTitle ?? tenant?.websiteSetting.siteTitle ?? 'Portal Prodi UNUSU';
    const fullTitle = title ? `${title} • ${siteTitle}` : siteTitle;
    const metaDescription =
      description ??
      tenant?.websiteSetting.seoDescription ??
      tenant?.description ??
      'Portal website program studi Universitas Nahdlatul Ulama Sumatera Utara.';

    document.title = fullTitle;

    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMeta('name', 'description', metaDescription);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', metaDescription);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', siteTitle);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', metaDescription);

    const origin = window.location.origin;
    setMeta('property', 'og:url', `${origin}${path ?? window.location.pathname}`);

    if (tenant?.websiteSetting.seoImageUrl) {
      setMeta('property', 'og:image', `${origin}${tenant.websiteSetting.seoImageUrl}`);
    }
    if (tenant?.websiteSetting.seoKeywords) {
      setMeta('name', 'keywords', tenant.websiteSetting.seoKeywords);
    }

    // Canonical per domain.
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${origin}${path ?? window.location.pathname}`;

    // Favicon mengikuti identitas tenant.
    if (tenant?.websiteSetting.faviconUrl) {
      let icon = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!icon) {
        icon = document.createElement('link');
        icon.rel = 'icon';
        document.head.appendChild(icon);
      }
      icon.href = tenant.websiteSetting.faviconUrl;
    }
  }, [tenant, title, description, path]);
}
