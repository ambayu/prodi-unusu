import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/AdminLayout';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { Field } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { settingsApi, type Theme, type WebsiteSetting } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';

const TABS = [
  { key: 'identity', label: 'Identitas Website', permission: 'website.view' },
  { key: 'theme', label: 'Tema & Warna', permission: 'theme.view' },
  { key: 'seo', label: 'SEO', permission: 'seo.view' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/**
 * Pengaturan website: identitas, tema, dan SEO.
 *
 * Setiap tab disimpan terpisah sehingga perubahan tema tidak menyentuh
 * identitas, sesuai pemisahan tanggung jawab permission.
 */
export const AdminSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has, canAny } = usePermission();

  const [tab, setTab] = useState<TabKey>('identity');
  const [identity, setIdentity] = useState<Partial<WebsiteSetting>>({});
  const [theme, setTheme] = useState<Partial<Theme>>({});

  const settingsQuery = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => settingsApi.get().then((res) => res.data),
  });

  useEffect(() => {
    if (settingsQuery.data?.setting) setIdentity(settingsQuery.data.setting);
    if (settingsQuery.data?.theme) setTheme(settingsQuery.data.theme);
  }, [settingsQuery.data]);

  const saveIdentity = useMutation({
    mutationFn: () => settingsApi.update(identity),
    onSuccess: () => {
      toast.success('Identitas website berhasil disimpan.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      void queryClient.invalidateQueries({ queryKey: ['public', 'site'] });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const saveTheme = useMutation({
    mutationFn: () => settingsApi.updateTheme(theme),
    onSuccess: () => {
      toast.success('Tema website berhasil disimpan.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      void queryClient.invalidateQueries({ queryKey: ['public', 'site'] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const visibleTabs = TABS.filter((item) => canAny([item.permission]));
  const studyProgram = settingsQuery.data?.studyProgram;

  return (
    <AdminLayout
      title="Pengaturan Website"
      description={studyProgram ? `${studyProgram.name} • ${studyProgram.faculty.name}` : undefined}
    >
      {settingsQuery.isLoading ? (
        <LoadingState label="Memuat pengaturan" rows={3} />
      ) : settingsQuery.isError ? (
        <ErrorState message={toApiError(settingsQuery.error).message} onRetry={() => void settingsQuery.refetch()} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 border-b border-slate-200">
            {visibleTabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                  tab === item.key
                    ? 'border-[#1e3a8a] text-[#1e3a8a]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'identity' ? (
            <div className="card space-y-4">
              <Field label="Judul website" htmlFor="site-title" required>
                <input
                  id="site-title"
                  className="field-input"
                  value={identity.siteTitle ?? ''}
                  onChange={(event) => setIdentity({ ...identity, siteTitle: event.target.value })}
                />
              </Field>

              <Field label="Tagline" htmlFor="site-tagline">
                <input
                  id="site-tagline"
                  className="field-input"
                  value={identity.siteTagline ?? ''}
                  onChange={(event) => setIdentity({ ...identity, siteTagline: event.target.value })}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nama universitas" htmlFor="univ-name">
                  <input
                    id="univ-name"
                    className="field-input"
                    value={identity.univName ?? ''}
                    onChange={(event) => setIdentity({ ...identity, univName: event.target.value })}
                  />
                </Field>
                <Field label="Nama fakultas" htmlFor="faculty-name">
                  <input
                    id="faculty-name"
                    className="field-input"
                    value={identity.facultyName ?? ''}
                    onChange={(event) => setIdentity({ ...identity, facultyName: event.target.value })}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="URL logo" htmlFor="logo-url" hint="Contoh /logo-unusu.jpg">
                  <input
                    id="logo-url"
                    className="field-input"
                    value={identity.logoUrl ?? ''}
                    onChange={(event) => setIdentity({ ...identity, logoUrl: event.target.value })}
                  />
                </Field>
                <Field label="URL favicon" htmlFor="favicon-url">
                  <input
                    id="favicon-url"
                    className="field-input"
                    value={identity.faviconUrl ?? ''}
                    onChange={(event) => setIdentity({ ...identity, faviconUrl: event.target.value })}
                  />
                </Field>
              </div>

              <Field label="Teks hak cipta" htmlFor="copyright">
                <input
                  id="copyright"
                  className="field-input"
                  value={identity.copyrightText ?? ''}
                  onChange={(event) => setIdentity({ ...identity, copyrightText: event.target.value })}
                />
              </Field>

              {studyProgram?.domains.length ? (
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Domain terhubung</p>
                  <ul className="mt-1.5 space-y-1">
                    {studyProgram.domains.map((domain) => (
                      <li key={domain.id} className="flex items-center gap-2 font-mono text-[11px] text-slate-700">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            domain.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {domain.hostname}
                        {domain.isPrimary ? (
                          <span className="rounded bg-blue-50 px-1 text-[9px] font-bold text-[#1e3a8a]">utama</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {has('website.update') ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => saveIdentity.mutate()}
                    disabled={saveIdentity.isPending}
                    className="btn-primary"
                  >
                    {saveIdentity.isPending ? 'Menyimpan...' : 'Simpan Identitas'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === 'theme' ? (
            <div className="card space-y-4">
              <p className="text-[11px] leading-relaxed text-slate-500">
                Tema hanya berlaku untuk program studi ini. Mengubah tema di sini tidak memengaruhi website
                prodi lain maupun website utama universitas.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ['primaryColor', 'Warna utama'],
                    ['secondaryColor', 'Warna sekunder'],
                    ['accentColor', 'Warna aksen'],
                    ['backgroundColor', 'Latar'],
                    ['foregroundColor', 'Teks'],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label} htmlFor={`theme-${key}`}>
                    <div className="flex items-center gap-2">
                      <input
                        id={`theme-${key}`}
                        type="color"
                        className="h-9 w-12 cursor-pointer rounded border border-slate-300"
                        value={theme[key] ?? '#1e3a8a'}
                        onChange={(event) => setTheme({ ...theme, [key]: event.target.value })}
                      />
                      <input
                        className="field-input flex-1 font-mono"
                        value={theme[key] ?? ''}
                        onChange={(event) => setTheme({ ...theme, [key]: event.target.value })}
                      />
                    </div>
                  </Field>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Font judul" htmlFor="font-heading">
                  <input
                    id="font-heading"
                    className="field-input"
                    value={theme.fontHeading ?? ''}
                    onChange={(event) => setTheme({ ...theme, fontHeading: event.target.value })}
                  />
                </Field>
                <Field label="Font isi" htmlFor="font-body">
                  <input
                    id="font-body"
                    className="field-input"
                    value={theme.fontBody ?? ''}
                    onChange={(event) => setTheme({ ...theme, fontBody: event.target.value })}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Sudut lengkung" htmlFor="theme-radius">
                  <select
                    id="theme-radius"
                    className="field-input"
                    value={theme.radius ?? '0.75rem'}
                    onChange={(event) => setTheme({ ...theme, radius: event.target.value })}
                  >
                    <option value="0">Tanpa lengkung</option>
                    <option value="0.25rem">Kecil</option>
                    <option value="0.5rem">Sedang</option>
                    <option value="0.75rem">Besar</option>
                    <option value="1rem">Sangat besar</option>
                  </select>
                </Field>
                <Field label="Gaya tombol" htmlFor="theme-button">
                  <select
                    id="theme-button"
                    className="field-input"
                    value={theme.buttonStyle ?? 'solid'}
                    onChange={(event) => setTheme({ ...theme, buttonStyle: event.target.value })}
                  >
                    <option value="solid">Solid</option>
                    <option value="outline">Outline</option>
                    <option value="soft">Soft</option>
                  </select>
                </Field>
                <Field label="Lebar konten" htmlFor="theme-width">
                  <select
                    id="theme-width"
                    className="field-input"
                    value={theme.containerWidth ?? '1280px'}
                    onChange={(event) => setTheme({ ...theme, containerWidth: event.target.value })}
                  >
                    <option value="1140px">1140px</option>
                    <option value="1200px">1200px</option>
                    <option value="1280px">1280px</option>
                    <option value="1440px">1440px</option>
                  </select>
                </Field>
              </div>

              <div
                className="rounded-xl border border-slate-200 p-4"
                style={{ backgroundColor: theme.backgroundColor ?? '#ffffff' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Pratinjau warna</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-lg px-3 py-2 text-xs font-bold text-white"
                    style={{
                      backgroundColor: theme.primaryColor ?? '#1e3a8a',
                      borderRadius: theme.radius ?? '0.75rem',
                    }}
                  >
                    Tombol Utama
                  </span>
                  <span
                    className="rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                    style={{
                      backgroundColor: theme.accentColor ?? '#fbbf24',
                      borderRadius: theme.radius ?? '0.75rem',
                    }}
                  >
                    Aksen
                  </span>
                  <span className="text-xs" style={{ color: theme.foregroundColor ?? '#111827' }}>
                    Contoh teks isi website
                  </span>
                </div>
              </div>

              {has('theme.update') ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => saveTheme.mutate()}
                    disabled={saveTheme.isPending}
                    className="btn-primary"
                  >
                    {saveTheme.isPending ? 'Menyimpan...' : 'Simpan Tema'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === 'seo' ? (
            <div className="card space-y-4">
              <Field
                label="Judul SEO"
                htmlFor="seo-title"
                hint="Tampil sebagai judul tab browser dan hasil pencarian. Idealnya di bawah 60 karakter."
              >
                <input
                  id="seo-title"
                  className="field-input"
                  value={identity.seoTitle ?? ''}
                  onChange={(event) => setIdentity({ ...identity, seoTitle: event.target.value })}
                />
              </Field>

              <Field
                label="Deskripsi SEO"
                htmlFor="seo-description"
                hint="Ringkasan yang tampil pada hasil pencarian. Idealnya 120 sampai 160 karakter."
              >
                <textarea
                  id="seo-description"
                  className="field-textarea"
                  value={identity.seoDescription ?? ''}
                  onChange={(event) => setIdentity({ ...identity, seoDescription: event.target.value })}
                />
              </Field>

              <Field label="Kata kunci" htmlFor="seo-keywords" hint="Pisahkan dengan koma.">
                <input
                  id="seo-keywords"
                  className="field-input"
                  value={identity.seoKeywords ?? ''}
                  onChange={(event) => setIdentity({ ...identity, seoKeywords: event.target.value })}
                />
              </Field>

              <Field label="Gambar SEO" htmlFor="seo-image" hint="URL gambar untuk pratinjau saat tautan dibagikan.">
                <input
                  id="seo-image"
                  className="field-input"
                  value={identity.seoImageUrl ?? ''}
                  onChange={(event) => setIdentity({ ...identity, seoImageUrl: event.target.value })}
                />
              </Field>

              {has('seo.update') ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => saveIdentity.mutate()}
                    disabled={saveIdentity.isPending}
                    className="btn-primary"
                  >
                    {saveIdentity.isPending ? 'Menyimpan...' : 'Simpan SEO'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </AdminLayout>
  );
};

export default AdminSettings;
