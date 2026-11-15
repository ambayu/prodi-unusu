import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface SearchableOption {
  value: string;
  label: string;
  /** Teks tambahan yang ikut dicari tetapi tidak ditampilkan (mis. NIDN). */
  keywords?: string;
  /** Keterangan kecil di kanan opsi (mis. "3 SKS"). */
  meta?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  /** Teks saat tidak ada opsi yang cocok dengan pencarian. */
  noResultLabel?: string;
  id?: string;
  'aria-label'?: string;
}

/**
 * Dropdown dengan pencarian (pola "select2").
 *
 * Dibangun tanpa library karena proyek ini tidak memakai `select2`,
 * `react-select`, maupun `headlessui`. Perilaku yang dijaga:
 *
 * - **Ketik untuk menyaring** berdasarkan `label` dan `keywords`.
 * - **Navigasi keyboard**: panah atas/bawah, Enter memilih, Escape menutup.
 * - **Klik di luar** menutup daftar.
 * - **Daftar dibatasi tinggi** agar tidak memanjang keluar layar.
 *
 * Dipakai untuk memilih mata kuliah pada formulir kurikulum, di mana daftar
 * berisi puluhan hingga ratusan baris sehingga `<select>` biasa menyulitkan.
 */
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Pilih...',
  searchPlaceholder = 'Cari...',
  emptyLabel,
  disabled = false,
  noResultLabel = 'Tidak ada hasil.',
  id,
  'aria-label': ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(keyword) ||
        (option.keywords ?? '').toLowerCase().includes(keyword),
    );
  }, [options, query]);

  // Klik di luar menutup daftar.
  useEffect(() => {
    if (!open) return;
    const handle = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Fokuskan kotak pencarian setiap kali daftar dibuka.
  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(0);
      // `requestAnimationFrame` agar input sudah ter-render saat difokuskan.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Jaga agar opsi yang disorot tetap terlihat saat dinavigasi dengan panah.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const commit = (option: SearchableOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((prev) => Math.min(prev + 1, filtered.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = filtered[highlight];
      if (option) commit(option);
    }
  };

  return (
    <div className={`relative ${open ? 'z-50' : 'z-0'}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="field-input flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
          {selected ? selected.label : emptyLabel ?? placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {selected && !disabled ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Kosongkan pilihan"
              onClick={(event) => {
                event.stopPropagation();
                onChange('');
              }}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-[12px] border border-[#CBD5E1] bg-white shadow-xl">
          <div className="relative border-b border-[#CBD5E1]/70 p-2">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              className="w-full rounded-[8px] border border-slate-200 py-1.5 pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKeyDown}
              aria-label="Cari opsi"
            />
          </div>

          <div ref={listRef} role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-[11px] italic text-slate-400">{noResultLabel}</p>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-index={index}
                    disabled={option.disabled}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => commit(option)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                      option.disabled
                        ? 'cursor-not-allowed text-slate-400'
                        : index === highlight
                          ? 'bg-slate-100'
                          : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <span className={isSelected ? 'font-bold text-[#1e3a8a]' : 'text-slate-800'}>
                        {option.label}
                      </span>
                    </span>
                    {option.meta ? (
                      <span className="shrink-0 text-[10px] text-slate-500">{option.meta}</span>
                    ) : null}
                    {isSelected ? <CheckIcon className="h-3.5 w-3.5 shrink-0 text-[#1e3a8a]" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SearchableSelect;
