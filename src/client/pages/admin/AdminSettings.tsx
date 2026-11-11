import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpTrayIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { Field } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { mediaApi, settingsApi, type Theme, type WebsiteSetting } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';

/** Format berkas gambar yang diterima seluruh unggahan gambar di panel admin. */
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingSeoImage, setUploadingSeoImage] = useState(false);

  const handleFileUpload = async (
    file: File,
    onSuccess: (url: string) => void,
    setLoading: (val: boolean) => void
  ) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Pilih file gambar valid (JPG, PNG, WebP, atau ICO).');
      return;
    }
    setLoading(true);
    try {
      const res = await mediaApi.upload(file);
      onSuccess(res.data.asset.url);
      toast.success('Gambar berhasil diunggah.');
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

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
      title="Identitas, Tema & SEO"
      description={studyProgram ? `${studyProgram.name} • ${studyProgram.faculty.name}` : 'Kelola identitas profil prodi, tema warna visual, dan optimasi SEO mesin pencari.'}
    >
      {settingsQuery.isLoading ? (
        <LoadingState label="Memuat pengaturan" rows={3} />
      ) : settingsQuery.isError ? (
        <ErrorState message={toApiError(settingsQuery.error).message} onRetry={() => void settingsQuery.refetch()} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 border-b border-[#CBD5E1]">
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
                <Field label="Logo Website" htmlFor="logo-upload" hint="Logo resmi program studi / universitas. Format PNG/SVG transparan direkomendasikan.">
                  <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white shadow-2xs">
                      {identity.logoUrl ? (
                        <>
                          <img
                            src={identity.logoUrl}
                            alt="Logo Website"
                            className="h-full w-full object-contain p-1"
                          />
                          <button
                            type="button"
                            onClick={() => setIdentity({ ...identity, logoUrl: null })}
                            className="absolute top-1 right-1 rounded-full bg-rose-600 p-0.5 text-white shadow-xs hover:bg-rose-700"
                            title="Hapus logo"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <PhotoIcon className="h-7 w-7 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50">
                        <ArrowUpTrayIcon className="h-4 w-4 text-slate-500" />
                        <span>{uploadingLogo ? 'Mengunggah...' : 'Pilih Berkas Logo'}</span>
                        <input
                          id="logo-upload"
                          type="file"
                          accept={IMAGE_ACCEPT}
                          disabled={uploadingLogo}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleFileUpload(file, (url) => setIdentity({ ...identity, logoUrl: url }), setUploadingLogo);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {identity.logoUrl || 'Belum ada logo terunggah'}
                      </p>
                    </div>
                  </div>
                </Field>

                <Field label="Favicon Browser" htmlFor="favicon-upload" hint="Ikon tab browser (disarankan format PNG/ICO ukuran 32x32 atau 64x64).">
                  <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white shadow-2xs">
                      {identity.faviconUrl ? (
                        <>
                          <img
                            src={identity.faviconUrl}
                            alt="Favicon"
                            className="h-full w-full object-contain p-2"
                          />
                          <button
                            type="button"
                            onClick={() => setIdentity({ ...identity, faviconUrl: null })}
                            className="absolute top-1 right-1 rounded-full bg-rose-600 p-0.5 text-white shadow-xs hover:bg-rose-700"
                            title="Hapus favicon"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <PhotoIcon className="h-7 w-7 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50">
                        <ArrowUpTrayIcon className="h-4 w-4 text-slate-500" />
                        <span>{uploadingFavicon ? 'Mengunggah...' : 'Pilih Berkas Favicon'}</span>
                        <input
                          id="favicon-upload"
                          type="file"
                          accept={IMAGE_ACCEPT}
                          disabled={uploadingFavicon}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleFileUpload(file, (url) => setIdentity({ ...identity, faviconUrl: url }), setUploadingFavicon);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {identity.faviconUrl || 'Belum ada favicon terunggah'}
                      </p>
                    </div>
                  </div>
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

              <Field label="Gambar SEO / Social Share Image" htmlFor="seo-image-upload" hint="Gambar thumbnail saat tautan website prodi dibagikan ke WhatsApp, Facebook, LinkedIn, dll.">
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="relative flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white shadow-2xs">
                    {identity.seoImageUrl ? (
                      <>
                        <img
                          src={identity.seoImageUrl}
                          alt="SEO Open Graph Preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setIdentity({ ...identity, seoImageUrl: null })}
                          className="absolute top-1 right-1 rounded-full bg-rose-600 p-1 text-white shadow-xs hover:bg-rose-700"
                          title="Hapus gambar SEO"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <PhotoIcon className="h-8 w-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50">
                      <ArrowUpTrayIcon className="h-4 w-4 text-slate-500" />
                      <span>{uploadingSeoImage ? 'Mengunggah...' : 'Pilih Berkas Gambar SEO'}</span>
                      <input
                        id="seo-image-upload"
                        type="file"
                        accept={IMAGE_ACCEPT}
                        disabled={uploadingSeoImage}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleFileUpload(file, (url) => setIdentity({ ...identity, seoImageUrl: url }), setUploadingSeoImage);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      {identity.seoImageUrl || 'Belum ada gambar SEO terunggah (ukuran rasio 1200x630 direkomendasikan)'}
                    </p>
                  </div>
                </div>
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
