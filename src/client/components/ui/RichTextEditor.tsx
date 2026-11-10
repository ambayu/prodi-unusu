import React, { useRef, useState, useEffect } from 'react';
import {
  ArrowUpTrayIcon,
  PhotoIcon,
  LinkIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { mediaApi } from '../../services/adminApi';
import { toApiError } from '../../services/api';
import { useToast } from './Toast';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

/**
 * RichTextEditor — Text Editor WYSIWYG profesional terintegrasi untuk berita & artikel prodi.
 * Menghasilkan markup HTML bersih, mendukung formatting lengkap (Heading, Bold, Italic,
 * Underline, Alignments, Lists, Blockquote, Links, dan Upload Gambar Langsung ke Server Media UNUSU).
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Tuliskan isi berita atau artikel lengkap di sini...',
  minHeight = '320px',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const toast = useToast();

  // Sinkronisasi isi awal ke contentEditable saat mount atau saat value berubah dari luar
  useEffect(() => {
    if (editorRef.current && !isSourceMode) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, isSourceMode]);

  const exec = (command: string, cmdValue: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, cmdValue);
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertLink = () => {
    const url = prompt('Masukkan tautan URL (contoh: https://unusu.ac.id):');
    if (url) {
      exec('createLink', url);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Pilih file gambar valid (JPG, PNG, atau WebP).');
      return;
    }

    setUploading(true);
    try {
      const res = await mediaApi.upload(file);
      const imageUrl = res.data.asset.url;
      exec('insertHTML', `<img src="${imageUrl}" alt="${file.name}" class="rounded-xl my-4 max-w-full h-auto shadow-sm" />`);
      toast.success('Gambar berhasil disisipkan ke isi berita.');
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-2xs focus-within:border-[#166534] focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
      {/* Toolbar Atas */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/80 px-3 py-2 text-slate-700">
        {/* Dropdown Format Heading */}
        <select
          onChange={(e) => {
            exec('formatBlock', e.target.value);
            e.target.value = '';
          }}
          defaultValue=""
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none hover:bg-slate-50 cursor-pointer"
          title="Format Paragraf & Judul"
        >
          <option value="" disabled>Format...</option>
          <option value="p">Paragraf Normal</option>
          <option value="h2">Heading 2 (Sub-bab)</option>
          <option value="h3">Heading 3 (Poin Penting)</option>
          <option value="h4">Heading 4</option>
          <option value="blockquote">Kutipan (Quote)</option>
        </select>

        <span className="h-4 w-px bg-slate-300 mx-1" />

        {/* Text Styles */}
        <button
          type="button"
          onClick={() => exec('bold')}
          className="rounded-md p-1.5 hover:bg-slate-200 font-bold text-xs w-7 h-7 flex items-center justify-center"
          title="Tebal (Bold)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => exec('italic')}
          className="rounded-md p-1.5 hover:bg-slate-200 italic text-xs w-7 h-7 flex items-center justify-center font-serif"
          title="Miring (Italic)"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => exec('underline')}
          className="rounded-md p-1.5 hover:bg-slate-200 underline text-xs w-7 h-7 flex items-center justify-center"
          title="Garis Bawah (Underline)"
        >
          U
        </button>

        <span className="h-4 w-px bg-slate-300 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => exec('insertUnorderedList')}
          className="rounded-md p-1.5 hover:bg-slate-200 text-xs flex items-center justify-center text-slate-700"
          title="Daftar Butir (Bullet List)"
        >
          <ListBulletIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => exec('insertOrderedList')}
          className="rounded-md p-1.5 hover:bg-slate-200 text-xs flex items-center justify-center font-bold px-1.5"
          title="Daftar Angka (Numbered List)"
        >
          1.
        </button>

        <span className="h-4 w-px bg-slate-300 mx-1" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => exec('justifyLeft')}
          className="rounded-md p-1.5 hover:bg-slate-200 text-[11px] font-bold"
          title="Rata Kiri"
        >
          Kiri
        </button>
        <button
          type="button"
          onClick={() => exec('justifyCenter')}
          className="rounded-md p-1.5 hover:bg-slate-200 text-[11px] font-bold"
          title="Rata Tengah"
        >
          Tengah
        </button>
        <button
          type="button"
          onClick={() => exec('justifyRight')}
          className="rounded-md p-1.5 hover:bg-slate-200 text-[11px] font-bold"
          title="Rata Kanan"
        >
          Kanan
        </button>

        <span className="h-4 w-px bg-slate-300 mx-1" />

        {/* Sisipkan Link */}
        <button
          type="button"
          onClick={insertLink}
          className="rounded-md p-1.5 hover:bg-slate-200 text-xs flex items-center justify-center"
          title="Sisipkan Tautan (Link)"
        >
          <LinkIcon className="h-4 w-4" />
        </button>

        {/* Upload & Sisipkan Gambar ke Isi */}
        <label
          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold transition-colors cursor-pointer ${
            uploading ? 'bg-amber-100 text-amber-800' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
          title="Unggah dan Sisipkan Gambar ke Isi Artikel"
        >
          <PhotoIcon className="h-3.5 w-3.5 text-slate-500" />
          <span>{uploading ? 'Mengunggah...' : 'Sisipkan Gambar'}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>

        {/* Tombol Mode HTML Source Code */}
        <button
          type="button"
          onClick={() => setIsSourceMode(!isSourceMode)}
          className={`ml-auto rounded-lg px-2 py-1 text-[11px] font-mono font-bold transition-colors ${
            isSourceMode ? 'bg-[#166534] text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
          title="Beralih antara Mode Visual dan Kode HTML"
        >
          {isSourceMode ? 'Mode Visual' : '<HTML>'}
        </button>
      </div>

      {/* Area Tulis Konten */}
      {isSourceMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-4 font-mono text-xs text-slate-800 focus:outline-none resize-y bg-slate-50 leading-relaxed"
          style={{ minHeight }}
          placeholder="Tuliskan kode HTML langsung..."
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          style={{ minHeight }}
          data-placeholder={placeholder}
          className="p-5 text-sm leading-relaxed text-slate-900 focus:outline-none prose max-w-none overflow-y-auto selection:bg-emerald-100"
        />
      )}
    </div>
  );
};
export default RichTextEditor;
