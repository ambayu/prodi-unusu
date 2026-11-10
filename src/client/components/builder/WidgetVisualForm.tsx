import React, { useState } from 'react';
import {
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { mediaApi } from '../../services/adminApi';
import { toApiError } from '../../services/api';
import { useToast } from '../ui/Toast';
import { RichTextEditor } from '../ui/RichTextEditor';

interface WidgetVisualFormProps {
  widgetCode: string;
  config: Record<string, any>;
  onChange: (updated: Record<string, any>) => void;
}

export const WidgetVisualForm: React.FC<WidgetVisualFormProps> = ({
  widgetCode,
  config,
  onChange,
}) => {
  const toast = useToast();
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const handleUploadImage = async (file: File, callback: (url: string) => void, fieldKey: string) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Pilih file gambar valid (JPG, PNG, atau WebP).');
      return;
    }
    setUploadingField(fieldKey);
    try {
      const res = await mediaApi.upload(file);
      callback(res.data.asset.url);
      toast.success('Gambar berhasil diunggah.');
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setUploadingField(null);
    }
  };

  // 1. Tipe: About Prodi (Tentang Prodi)
  if (widgetCode === 'about_prodi') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Eyebrow / Sub-judul Kecil</label>
            <input
              type="text"
              className="field-input"
              placeholder="Contoh: Mengenal Program Studi"
              value={config.eyebrow || ''}
              onChange={(e) => onChange({ ...config, eyebrow: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Posisi Gambar</label>
            <select
              className="field-input"
              value={config.alignment || 'left'}
              onChange={(e) => onChange({ ...config, alignment: e.target.value })}
            >
              <option value="left">Kiri (Gambar di Kiri, Teks di Kanan)</option>
              <option value="right">Kanan (Teks di Kiri, Gambar di Kanan)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="field-label">Judul Utama</label>
          <input
            type="text"
            className="field-input"
            placeholder="Contoh: Mengembangkan Talenta Digital Berkualitas Global"
            value={config.title || ''}
            onChange={(e) => onChange({ ...config, title: e.target.value })}
          />
        </div>

        {/* Upload Foto Ilustrasi Profil */}
        <div>
          <label className="field-label">Foto / Gambar Ilustrasi Profil</label>
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="relative flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white shadow-2xs">
              {config.imageUrl ? (
                <>
                  <img
                    src={config.imageUrl}
                    alt="Preview Profil"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ ...config, imageUrl: '' })}
                    className="absolute top-1 right-1 rounded-full bg-rose-600 p-1 text-white shadow-xs hover:bg-rose-700"
                    title="Hapus foto"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <PhotoIcon className="h-8 w-8 text-slate-300" />
              )}
            </div>

            <div className="flex-1 space-y-1.5">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50">
                <ArrowUpTrayIcon className="h-4 w-4 text-slate-500" />
                <span>{uploadingField === 'about-img' ? 'Mengunggah...' : 'Pilih & Unggah Berkas'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingField === 'about-img'}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUploadImage(file, (url) => onChange({ ...config, imageUrl: url }), 'about-img');
                  }}
                />
              </label>
              <p className="text-[11px] text-slate-500">
                {config.imageUrl ? (
                  <span className="font-mono text-[10px] text-slate-400 break-all">{config.imageUrl}</span>
                ) : (
                  'Format gambar JPG, PNG, atau WebP. Maksimal 5 MB.'
                )}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="field-label">Isi Narasi / Uraian Profil</label>
          <RichTextEditor
            value={config.body || ''}
            onChange={(val) => onChange({ ...config, body: val })}
            placeholder="Tuliskan uraian tentang keunggulan, sejarah singkat, dan profil prodi..."
            minHeight="220px"
          />
        </div>
      </div>
    );
  }

  // 2. Tipe: Hero Slider (Banner Beranda)
  if (widgetCode === 'hero_slider') {
    const slides: Array<{ imageUrl: string; alt?: string; linkUrl?: string }> = Array.isArray(config.slides) ? config.slides : [];

    const updateSlide = (idx: number, patch: Partial<(typeof slides)[0]>) => {
      const next = [...slides];
      next[idx] = { ...next[idx], ...patch };
      onChange({ ...config, slides: next });
    };

    const addSlide = () => {
      onChange({
        ...config,
        slides: [...slides, { imageUrl: '', alt: 'Banner Prodi UNUSU', linkUrl: '' }],
      });
    };

    const removeSlide = (idx: number) => {
      onChange({ ...config, slides: slides.filter((_, i) => i !== idx) });
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Durasi Putar Otomatis (Autoplay)</label>
            <select
              className="field-input"
              value={config.autoplayMs || 6000}
              onChange={(e) => onChange({ ...config, autoplayMs: Number(e.target.value) })}
            >
              <option value={3000}>3 Detik (Cepat)</option>
              <option value={5000}>5 Detik (Sedang)</option>
              <option value={6000}>6 Detik (Rekomendasi Standar)</option>
              <option value={8000}>8 Detik (Lambat)</option>
            </select>
          </div>
          <div>
            <label className="field-label">Indikator Titik (Dots)</label>
            <select
              className="field-input"
              value={config.showDots === false ? 'false' : 'true'}
              onChange={(e) => onChange({ ...config, showDots: e.target.value === 'true' })}
            >
              <option value="true">Tampilkan Titik Navigasi</option>
              <option value="false">Sembunyikan</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="field-label mb-0">Daftar Slide Banner ({slides.length})</label>
            <button
              type="button"
              onClick={addSlide}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <PlusIcon className="h-3.5 w-3.5" /> Tambah Slide
            </button>
          </div>

          {slides.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
              Belum ada slide banner. Klik "Tambah Slide" untuk menambahkan slide pertama.
            </div>
          ) : (
            <div className="space-y-3">
              {slides.map((slide, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Slide #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeSlide(index)}
                      className="text-xs text-rose-600 hover:underline inline-flex items-center gap-1"
                    >
                      <TrashIcon className="h-3.5 w-3.5" /> Hapus
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 block mb-1">Unggah Berkas Gambar Banner</span>
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
                          {slide.imageUrl ? (
                            <img src={slide.imageUrl} alt={slide.alt || 'Banner'} className="h-full w-full object-cover" />
                          ) : (
                            <PhotoIcon className="h-6 w-6 text-slate-300" />
                          )}
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50">
                          <PhotoIcon className="h-4 w-4 text-slate-500" />
                          <span>{uploadingField === `slide-${index}` ? 'Mengunggah...' : 'Pilih Gambar'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingField === `slide-${index}`}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleUploadImage(file, (url) => updateSlide(index, { imageUrl: url }), `slide-${index}`);
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-600">Keterangan / Teks Alternatif (Alt)</span>
                      <input
                        type="text"
                        className="field-input mt-1"
                        placeholder="Contoh: Penerimaan Mahasiswa Baru"
                        value={slide.alt || ''}
                        onChange={(e) => updateSlide(index, { alt: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-600">Tautan Saat Diklik (Opsional)</span>
                    <input
                      type="text"
                      className="field-input mt-1 text-xs"
                      placeholder="Contoh: https://pmb.unusu.ac.id atau /berita/pmb"
                      value={slide.linkUrl || ''}
                      onChange={(e) => updateSlide(index, { linkUrl: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Tipe: Vision & Mission (Visi & Misi)
  if (widgetCode === 'vision_mission') {
    const missions: string[] = Array.isArray(config.missions) ? config.missions : [];

    const updateMission = (idx: number, val: string) => {
      const next = [...missions];
      next[idx] = val;
      onChange({ ...config, missions: next });
    };

    const addMission = () => {
      onChange({ ...config, missions: [...missions, ''] });
    };

    const removeMission = (idx: number) => {
      onChange({ ...config, missions: missions.filter((_, i) => i !== idx) });
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="field-label">Visi Program Studi</label>
          <RichTextEditor
            value={config.vision || ''}
            onChange={(val) => onChange({ ...config, vision: val })}
            placeholder="Tuliskan rumusan visi program studi..."
            minHeight="140px"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="field-label mb-0">Misi Program Studi ({missions.length} Butir)</label>
            <button
              type="button"
              onClick={addMission}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <PlusIcon className="h-3.5 w-3.5" /> Tambah Misi
            </button>
          </div>

          {missions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500">
              Belum ada butir misi. Tambahkan satu per satu agar tertata rapi.
            </div>
          ) : (
            <div className="space-y-2">
              {missions.map((misi, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[11px] font-bold text-emerald-900">
                    {index + 1}
                  </span>
                  <textarea
                    rows={2}
                    className="field-textarea text-xs flex-1"
                    placeholder={`Tuliskan butir misi ke-${index + 1}...`}
                    value={misi}
                    onChange={(e) => updateMission(index, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeMission(index)}
                    className="mt-2 text-rose-600 hover:text-rose-800 p-1"
                    title="Hapus butir"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. Tipe: Statistics (Statistik & Angka)
  if (widgetCode === 'statistics') {
    const items: Array<{ label: string; value: number; icon?: string }> = Array.isArray(config.items) ? config.items : [];

    const updateItem = (idx: number, patch: Partial<(typeof items)[0]>) => {
      const next = [...items];
      next[idx] = { ...next[idx], ...patch };
      onChange({ ...config, items: next });
    };

    const addItem = () => {
      onChange({
        ...config,
        items: [...items, { label: 'Item Baru', value: 0, icon: 'academic-cap' }],
      });
    };

    const removeItem = (idx: number) => {
      onChange({ ...config, items: items.filter((_, i) => i !== idx) });
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="field-label">Tata Letak (Layout)</label>
          <select
            className="field-input"
            value={config.layout || 'four-columns'}
            onChange={(e) => onChange({ ...config, layout: e.target.value })}
          >
            <option value="four-columns">Grid 4 Kolom Kotak</option>
            <option value="strip">Pita Horizontal (Strip Memanjang)</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="field-label mb-0">Indikator Angka ({items.length})</label>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <PlusIcon className="h-3.5 w-3.5" /> Tambah Indikator
            </button>
          </div>

          <div className="space-y-2.5">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex-1">
                  <span className="text-[10px] font-semibold text-slate-500">Label / Keterangan</span>
                  <input
                    type="text"
                    className="field-input mt-0.5 text-xs"
                    placeholder="Contoh: Mahasiswa Aktif"
                    value={item.label || ''}
                    onChange={(e) => updateItem(idx, { label: e.target.value })}
                  />
                </div>
                <div className="w-28">
                  <span className="text-[10px] font-semibold text-slate-500">Jumlah / Nilai</span>
                  <input
                    type="number"
                    min={0}
                    className="field-input mt-0.5 text-xs tabular-nums"
                    value={item.value ?? 0}
                    onChange={(e) => updateItem(idx, { value: Number(e.target.value) })}
                  />
                </div>
                <div className="w-32">
                  <span className="text-[10px] font-semibold text-slate-500">Ikon</span>
                  <select
                    className="field-input mt-0.5 text-xs"
                    value={item.icon || 'academic-cap'}
                    onChange={(e) => updateItem(idx, { icon: e.target.value })}
                  >
                    <option value="academic-cap">Topi Sarjana</option>
                    <option value="users">Grup Orang</option>
                    <option value="building-office">Gedung / Lab</option>
                    <option value="trophy">Piala / Prestasi</option>
                    <option value="book-open">Buku / Jurnal</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="mt-4 text-rose-600 hover:text-rose-800"
                  title="Hapus"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 5. Tipe: Call to Action (CTA Banner)
  if (widgetCode === 'cta_banner') {
    return (
      <div className="space-y-4">
        <div>
          <label className="field-label">Judul Banner Aksi</label>
          <input
            type="text"
            className="field-input"
            placeholder="Contoh: Siap Bergabung Bersama Kami?"
            value={config.title || ''}
            onChange={(e) => onChange({ ...config, title: e.target.value })}
          />
        </div>

        <div>
          <label className="field-label">Uraian / Ajakan</label>
          <textarea
            rows={3}
            className="field-textarea"
            placeholder="Tuliskan pesan ajakan pendaftaran atau informasi kemitraan..."
            value={config.body || ''}
            onChange={(e) => onChange({ ...config, body: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Teks Tombol Aksi</label>
            <input
              type="text"
              className="field-input"
              placeholder="Contoh: Daftar PMB Online"
              value={config.buttonLabel || ''}
              onChange={(e) => onChange({ ...config, buttonLabel: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Tautan Tombol Aksi (URL)</label>
            <input
              type="text"
              className="field-input"
              placeholder="https://pmb.unusu.ac.id atau /kontak"
              value={config.buttonUrl || ''}
              onChange={(e) => onChange({ ...config, buttonUrl: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="field-label">Gambar Latar Belakang (Opsional)</label>
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white shadow-2xs">
              {config.backgroundImageUrl ? (
                <>
                  <img
                    src={config.backgroundImageUrl}
                    alt="Background CTA"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ ...config, backgroundImageUrl: '' })}
                    className="absolute top-1 right-1 rounded-full bg-rose-600 p-1 text-white shadow-xs hover:bg-rose-700"
                    title="Hapus gambar"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <PhotoIcon className="h-6 w-6 text-slate-300" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50">
                <ArrowUpTrayIcon className="h-4 w-4 text-slate-500" />
                <span>{uploadingField === 'cta-bg' ? 'Mengunggah...' : 'Unggah Gambar Latar'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingField === 'cta-bg'}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUploadImage(file, (url) => onChange({ ...config, backgroundImageUrl: url }), 'cta-bg');
                  }}
                />
              </label>
              <p className="text-[11px] text-slate-500">
                {config.backgroundImageUrl ? (
                  <span className="font-mono text-[10px] text-slate-400 break-all">{config.backgroundImageUrl}</span>
                ) : (
                  'Format gambar JPG, PNG, atau WebP untuk latar belakang banner.'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. Tipe Data List Widget: Berita Terbaru, Dosen, Dokumen, Galeri, Fasilitas, Kurikulum
  if (
    [
      'latest_news',
      'lecturer_list',
      'curriculum_overview',
      'document_list',
      'facility_grid',
      'gallery_grid',
    ].includes(widgetCode)
  ) {
    const moduleMap: Record<string, { label: string; route: string }> = {
      latest_news: { label: 'Modul Berita & Warta', route: '/admin/berita' },
      lecturer_list: { label: 'Modul Tenaga Pendidik / Dosen', route: '/admin/dosen' },
      curriculum_overview: { label: 'Modul Struktur Kurikulum', route: '/admin/kurikulum' },
      document_list: { label: 'Modul Dokumen & Unduhan', route: '/admin/dokumen' },
      facility_grid: { label: 'Modul Sarana & Prasarana', route: '/admin/sarpras' },
      gallery_grid: { label: 'Modul Galeri Dokumentasi', route: '/admin/galeri' },
    };
    const mod = moduleMap[widgetCode] || { label: 'Modul Konten', route: '/admin' };

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed space-y-1.5">
            <p>
              Widget ini otomatis menarik data secara dinamis dari database <strong>{mod.label}</strong>. Anda cukup mengatur judul seksi dan batas jumlah tampilan di bawah.
            </p>
            <p className="text-[11px] text-blue-700">
              Ingin menambah atau mengedit isi datanya? Buka menu admin:{' '}
              <a
                href={mod.route}
                target="_blank"
                rel="noreferrer"
                className="font-bold underline text-[#1e3a8a] hover:text-blue-900"
              >
                {mod.label} &rarr;
              </a>
            </p>
          </div>
        </div>

        <div>
          <label className="field-label">Judul Seksi Tampilan</label>
          <input
            type="text"
            className="field-input"
            placeholder="Contoh: Berita & Pengumuman Terbaru"
            value={config.title || ''}
            onChange={(e) => onChange({ ...config, title: e.target.value })}
          />
        </div>

        {widgetCode !== 'curriculum_overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Jumlah Maksimal Data</label>
              <input
                type="number"
                min={1}
                max={24}
                className="field-input tabular-nums"
                value={config.limit || 6}
                onChange={(e) => onChange({ ...config, limit: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="field-label">Gaya Varian Tampilan (Opsional)</label>
              <input
                type="text"
                className="field-input"
                placeholder="Contoh: grid atau list"
                value={config.variant || ''}
                onChange={(e) => onChange({ ...config, variant: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // 7. Tipe: Kontak (Contact Information)
  if (widgetCode === 'contact_information') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
          <InformationCircleIcon className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed space-y-1.5">
            <p>
              Data alamat kampus, nomor telepon, surel, dan jam operasional diambil secara otomatis dari <strong>Pengaturan Profil Institusi & Kontak Prodi</strong>.
            </p>
            <p className="text-[11px] text-emerald-800">
              Ubah data kontak resmi di:{' '}
              <a
                href="/admin/kontak"
                target="_blank"
                rel="noreferrer"
                className="font-bold underline text-emerald-900 hover:text-emerald-950"
              >
                Menu Admin Kontak & Lokasi &rarr;
              </a>
            </p>
          </div>
        </div>

        <div>
          <label className="field-label">Judul Seksi Kontak</label>
          <input
            type="text"
            className="field-input"
            placeholder="Contoh: Hubungi Kami"
            value={config.title || 'Hubungi Kami'}
            onChange={(e) => onChange({ ...config, title: e.target.value })}
          />
        </div>
      </div>
    );
  }

  // Fallback jika ada widget khusus lain: Tampilkan editor JSON terproteksi
  return (
    <div>
      <div className="mb-2 text-xs text-slate-500">
        Konfigurasi khusus untuk widget ini:
      </div>
      <textarea
        className="field-input font-mono text-xs min-h-[200px]"
        value={JSON.stringify(config, null, 2)}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            // Biarkan user menyelesaikan ketikan
          }
        }}
      />
    </div>
  );
};

export default WidgetVisualForm;
