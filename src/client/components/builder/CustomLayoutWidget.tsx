import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  PhotoIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline';
import type {
  CustomBlock,
  CustomRow,
  CustomRowBackground,
  CustomRowLayout,
} from '../../../shared/schemas/builder';

export interface CustomLayoutWidgetProps {
  rows: CustomRow[];
  primaryColor: string;
  accentColor: string;
  /** Mode pratinjau di Bank Widget: klik blok memilihnya tanpa berpindah halaman. */
  interactive?: boolean;
  forceMobile?: boolean;
  selectedBlockId?: string | null;
  onSelectBlock?: (rowId: string, colIndex: number, blockId: string) => void;
}

/** Mengekstrak ID video YouTube (11 karakter aman) dari berbagai format URL YouTube. */
export function extractYouTubeId(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    let candidate = '';
    if (host === 'youtu.be') {
      candidate = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (parsed.pathname === '/watch') {
        candidate = parsed.searchParams.get('v') ?? '';
      } else if (
        parsed.pathname.startsWith('/embed/') ||
        parsed.pathname.startsWith('/shorts/') ||
        parsed.pathname.startsWith('/live/')
      ) {
        candidate = parsed.pathname.split('/')[2] ?? '';
      }
    }
    return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function gridClassForRow(layout: CustomRowLayout, forceMobile: boolean): string {
  if (forceMobile) return 'grid-cols-1';
  switch (layout) {
    case '1-col':
      return 'grid-cols-1';
    case '2-col':
      return 'grid-cols-1 md:grid-cols-2';
    case '2-col-left':
      return 'grid-cols-1 md:grid-cols-12';
    case '2-col-right':
      return 'grid-cols-1 md:grid-cols-12';
    case '3-col':
      return 'grid-cols-1 md:grid-cols-3';
  }
}

function columnSpanClass(layout: CustomRowLayout, colIndex: number, forceMobile: boolean): string {
  if (forceMobile) return '';
  if (layout === '2-col-left') return colIndex === 0 ? 'md:col-span-8' : 'md:col-span-4';
  if (layout === '2-col-right') return colIndex === 0 ? 'md:col-span-4' : 'md:col-span-8';
  return '';
}

function rowBackgroundStyle(
  background: CustomRowBackground,
  primaryColor: string,
): { className: string; style?: React.CSSProperties } {
  if (background === 'soft') {
    return { className: 'bg-slate-50 border-y border-slate-200/80' };
  }
  if (background === 'tinted') {
    return {
      className: 'border-y border-slate-200/70',
      style: {
        backgroundImage: `linear-gradient(135deg, ${primaryColor}0d 0%, #ffffff 55%, ${primaryColor}08 100%)`,
      },
    };
  }
  return { className: 'bg-white' };
}

function aspectClassForImage(ratio: 'auto' | '16:9' | '4:3' | '1:1'): string {
  switch (ratio) {
    case '16:9':
      return 'aspect-video';
    case '4:3':
      return 'aspect-[4/3]';
    case '1:1':
      return 'aspect-square';
    default:
      return '';
  }
}

const BlockView: React.FC<{
  block: CustomBlock;
  primaryColor: string;
  accentColor: string;
  interactive: boolean;
}> = ({ block, primaryColor, accentColor, interactive }) => {
  if (block.type === 'text') {
    const centered = block.align === 'center';
    const paragraphs = block.body
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);

    return (
      <div className={centered ? 'mx-auto max-w-2xl text-center' : 'text-left'}>
        {block.eyebrow ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest"
            style={{
              backgroundColor: `${primaryColor}10`,
              borderColor: `${primaryColor}24`,
              color: primaryColor,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
            {block.eyebrow}
          </span>
        ) : null}

        {block.title ? (
          <h3 className="mt-3 font-heading text-2xl font-extrabold leading-snug tracking-tight text-slate-950 sm:text-[28px]">
            {block.title}
          </h3>
        ) : null}

        {paragraphs.length > 0 ? (
          <div className="mt-3.5 space-y-3 text-[15px] leading-relaxed text-slate-600">
            {paragraphs.map((text, idx) => (
              <p key={idx} className="whitespace-pre-line">
                {text}
              </p>
            ))}
          </div>
        ) : !block.title && !block.eyebrow ? (
          <p className="text-sm italic text-slate-400">Isi judul atau paragraf pada panel kiri...</p>
        ) : null}
      </div>
    );
  }

  if (block.type === 'image') {
    const ratioClass = aspectClassForImage(block.ratio);
    return (
      <figure className="space-y-2">
        <div
          className={`relative overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100 shadow-xs ${ratioClass}`}
        >
          {block.imageUrl ? (
            <img
              src={block.imageUrl}
              alt={block.alt || block.caption || 'Ilustrasi'}
              loading="lazy"
              className={`w-full ${ratioClass ? 'h-full object-cover' : 'h-auto object-cover'}`}
            />
          ) : (
            <div className="flex min-h-[190px] flex-col items-center justify-center gap-2 p-6 text-slate-400">
              <PhotoIcon className="h-10 w-10 text-slate-300" />
              <span className="text-xs font-semibold">Belum ada gambar dipilih</span>
            </div>
          )}
        </div>
        {block.caption ? (
          <figcaption className="text-xs font-medium text-slate-500">{block.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (block.type === 'button') {
    const isPrimary = block.style === 'primary';
    const isExternal = /^https?:\/\//i.test(block.url);
    const label = block.label.trim() || 'Pelajari Selengkapnya';
    const href = block.url.trim() || '/';
    const classes =
      'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-150 shadow-xs';
    const style: React.CSSProperties = isPrimary
      ? { backgroundColor: primaryColor, color: '#ffffff' }
      : {
          backgroundColor: '#ffffff',
          color: primaryColor,
          border: `1.5px solid ${primaryColor}`,
        };

    const content = (
      <>
        <span>{label}</span>
        <ArrowRightIcon className="h-4 w-4" />
      </>
    );

    return (
      <div className={block.align === 'center' ? 'flex justify-center' : 'flex justify-start'}>
        {interactive ? (
          <span className={classes} style={style}>
            {content}
          </span>
        ) : isExternal ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`${classes} hover:opacity-90`}
            style={style}
          >
            {content}
          </a>
        ) : (
          <Link to={href} className={`${classes} hover:opacity-90`} style={style}>
            {content}
          </Link>
        )}
      </div>
    );
  }

  if (block.type === 'list') {
    const items = block.items.map((item) => item.trim()).filter(Boolean);
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
        {block.title ? (
          <h4 className="mb-3.5 text-base font-extrabold tracking-tight text-slate-900">
            {block.title}
          </h4>
        ) : null}
        {items.length === 0 ? (
          <p className="text-xs italic text-slate-400">Tambahkan daftar poin di panel kiri...</p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
                {block.style === 'number' ? (
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-extrabold tabular-nums"
                    style={{ backgroundColor: `${primaryColor}14`, color: primaryColor }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                ) : (
                  <CheckCircleIcon
                    className="mt-0.5 h-5 w-5 shrink-0"
                    style={{ color: primaryColor }}
                  />
                )}
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (block.type === 'stat') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{
            backgroundImage: `linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%)`,
          }}
        />
        <p
          className="font-heading text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl"
          style={{ color: primaryColor }}
        >
          {block.value || '—'}
        </p>
        <p className="mt-2 text-base font-bold text-slate-900">{block.label || 'Judul Sorotan'}</p>
        {block.description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{block.description}</p>
        ) : null}
      </div>
    );
  }

  // Video YouTube
  const videoId = extractYouTubeId(block.url);
  return (
    <figure className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-900 shadow-xs">
        {videoId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title={block.caption || 'Video YouTube'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className={`h-full w-full border-0 ${interactive ? 'pointer-events-none' : ''}`}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-slate-300">
            <PlayCircleIcon className="h-11 w-11 text-slate-400" />
            <span className="text-xs font-semibold">
              {block.url ? 'Tautan YouTube tidak dikenali' : 'Tempel tautan video YouTube'}
            </span>
          </div>
        )}
      </div>
      {block.caption ? (
        <figcaption className="text-xs font-medium text-slate-500">{block.caption}</figcaption>
      ) : null}
    </figure>
  );
};

export const CustomLayoutWidget: React.FC<CustomLayoutWidgetProps> = ({
  rows,
  primaryColor,
  accentColor,
  interactive = false,
  forceMobile = false,
  selectedBlockId = null,
  onSelectBlock,
}) => {
  if (rows.length === 0) {
    if (!interactive) return null;
    return (
      <div className="p-10 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8">
          <p className="text-sm font-bold text-slate-700">Kanvas Widget Masih Kosong</p>
          <p className="mt-1 text-xs text-slate-500">
            Tambahkan baris di panel sebelah kiri untuk mulai menyusun kolom dan konten.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {rows.map((row) => {
        const bg = rowBackgroundStyle(row.background, primaryColor);
        const gridClass = gridClassForRow(row.layout, forceMobile);

        return (
          <section key={row.id} className={`${bg.className} py-10 sm:py-14`} style={bg.style}>
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className={`grid ${gridClass} items-center gap-7 lg:gap-9`}>
                {row.columns.map((blocks, colIndex) => {
                  const spanClass = columnSpanClass(row.layout, colIndex, forceMobile);
                  return (
                    <div key={`${row.id}-col-${colIndex}`} className={`space-y-5 ${spanClass}`}>
                      {blocks.length === 0 && interactive ? (
                        <div className="rounded-xl border border-dashed border-slate-300/90 bg-white/60 px-4 py-8 text-center text-xs font-medium text-slate-400">
                          Kolom {colIndex + 1} belum berisi blok
                        </div>
                      ) : (
                        blocks.map((block) => {
                          const isSelected = interactive && selectedBlockId === block.id;
                          if (!interactive) {
                            return (
                              <BlockView
                                key={block.id}
                                block={block}
                                primaryColor={primaryColor}
                                accentColor={accentColor}
                                interactive={false}
                              />
                            );
                          }

                          return (
                            <div
                              key={block.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => onSelectBlock?.(row.id, colIndex, block.id)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  onSelectBlock?.(row.id, colIndex, block.id);
                                }
                              }}
                              className={`group relative cursor-pointer rounded-2xl p-1.5 transition-all ${
                                isSelected
                                  ? 'ring-2 ring-[#1e3a8a] ring-offset-2 bg-blue-50/30'
                                  : 'hover:ring-2 hover:ring-[#1e3a8a]/35 hover:ring-offset-1'
                              }`}
                            >
                              {isSelected ? (
                                <span className="pointer-events-none absolute -top-2.5 right-3 z-10 rounded-full bg-[#1e3a8a] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                  Sedang diedit
                                </span>
                              ) : null}
                              <BlockView
                                block={block}
                                primaryColor={primaryColor}
                                accentColor={accentColor}
                                interactive
                              />
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
};
