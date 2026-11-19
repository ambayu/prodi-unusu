import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, MagnifyingGlassIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface SearchableOption {
  value: string;
  label: string;
  /** Teks tambahan yang ikut dicari tetapi tidak ditampilkan (mis. NIDN). */
  keywords?: string;
  /** Keterangan kecil di kanan opsi (mis. "3 SKS" atau NIDN). */
  meta?: string;
  /** Baris keterangan sekunder di bawah label utama di dalam daftar dropdown. */
  description?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  /** Teks saat tidak ada opsi yang cocok dengan pencarian. */
  noResultLabel?: string;
  /** Izinkan tombol hapus pilihan (X). Bawaan true. */
  clearable?: boolean;
  /** Tampilkan kotak pencarian di dalam dropdown. Bawaan true. */
  searchable?: boolean;
  /** Ikon opsional di sebelah kiri teks tombol pemicu. */
  icon?: React.ReactNode;
  /** Ukuran tombol pemicu. Bawaan 'md'. */
  size?: 'sm' | 'md';
  /** Lebar minimum panel dropdown dalam piksel agar teks opsi tidak terpotong. */
  dropdownMinWidth?: number;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

interface DropdownRect {
  top: number;
  left: number;
  width: number;
  placement: 'bottom' | 'top';
}

/**
 * Dropdown pencarian bergaya Select2 dengan portal agar tidak terpotong oleh
 * container `overflow-hidden` maupun `FormModal`.
 */
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Pilih...',
  searchPlaceholder = 'Ketik untuk mencari...',
  emptyLabel,
  disabled = false,
  noResultLabel = 'Tidak ada opsi yang cocok.',
  clearable = true,
  searchable = true,
  icon,
  size = 'md',
  dropdownMinWidth,
  className = '',
  id,
  'aria-label': ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [rect, setRect] = useState<DropdownRect | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(keyword) ||
        (option.description ?? '').toLowerCase().includes(keyword) ||
        (option.meta ?? '').toLowerCase().includes(keyword) ||
        (option.keywords ?? '').toLowerCase().includes(keyword),
    );
  }, [options, query]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const minW = dropdownMinWidth ?? 0;
    const width = Math.max(box.width, minW);
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const estimatedHeight = 290;
    const spaceBelow = viewportH - box.bottom - 12;
    const spaceAbove = box.top - 12;
    const placement: 'bottom' | 'top' =
      spaceBelow < estimatedHeight && spaceAbove > spaceBelow ? 'top' : 'bottom';

    const left = Math.max(12, Math.min(box.left, viewportW - width - 12));
    const top = placement === 'bottom' ? box.bottom + 6 : box.top - 6;
    setRect({ top, left, width, placement });
  }, [dropdownMinWidth]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const onKeyCapture = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const onScrollOrResize = (event: Event) => {
      if (
        event.type === 'scroll' &&
        dropdownRef.current &&
        event.target instanceof Node &&
        dropdownRef.current.contains(event.target)
      ) {
        return;
      }
      updatePosition();
    };

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyCapture, true);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyCapture, true);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const selectedIdx = options.findIndex((opt) => opt.value === value && !opt.disabled);
    setHighlight(selectedIdx >= 0 ? selectedIdx : 0);
    if (searchable) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, options, value, searchable]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const commit = (option: SearchableOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const moveHighlight = (delta: 1 | -1) => {
    if (filtered.length === 0) return;
    setHighlight((prev) => {
      let next = prev;
      for (let i = 0; i < filtered.length; i += 1) {
        next = Math.max(0, Math.min(filtered.length - 1, next + delta));
        if (!filtered[next]?.disabled) return next;
        if (next === 0 || next === filtered.length - 1) break;
      }
      return prev;
    });
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      moveHighlight(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      moveHighlight(-1);
      return;
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault();
      const option = filtered[highlight];
      if (option) commit(option);
    }
  };

  const sizeClasses =
    size === 'sm'
      ? 'min-h-[38px] px-3 py-1.5 text-xs'
      : 'min-h-[42px] px-3.5 py-2 text-sm';

  const dropdownContent =
    open && rect ? (
      <div
        ref={dropdownRef}
        style={{
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          transform: rect.placement === 'top' ? 'translateY(-100%)' : undefined,
        }}
        className="z-[120] overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-[0_18px_40px_-12px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/5"
      >
        {searchable ? (
          <div className="border-b border-slate-100 bg-slate-50/80 p-2">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/15"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHighlight(0);
                }}
                onKeyDown={onKeyDown}
                aria-label="Cari opsi"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setHighlight(0);
                    inputRef.current?.focus();
                  }}
                  aria-label="Hapus kata pencarian"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          ref={listRef}
          role="listbox"
          className="select2-scroll max-h-60 overflow-y-auto p-1.5"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-5 text-center text-xs text-slate-400">
              {noResultLabel}
            </div>
          ) : (
            filtered.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlight;
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
                  className={`group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                    option.disabled
                      ? 'cursor-not-allowed text-slate-400'
                      : isSelected
                        ? 'bg-[#eff6ff] text-[#1e3a8a]'
                        : isHighlighted
                          ? 'bg-slate-100/90 text-slate-900'
                          : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {isSelected ? (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#1e3a8a]" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate ${
                        isSelected ? 'font-bold text-[#1e3a8a]' : 'font-medium text-slate-800'
                      }`}
                    >
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {option.meta ? (
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                        isSelected
                          ? 'bg-[#1e3a8a]/10 text-[#1e3a8a]'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/70'
                      }`}
                    >
                      {option.meta}
                    </span>
                  ) : null}
                  {isSelected ? (
                    <CheckIcon className="h-4 w-4 shrink-0 text-[#1e3a8a]" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    ) : null;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex w-full items-center justify-between gap-2 rounded-[10px] border bg-white text-left shadow-2xs transition-all disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${sizeClasses} ${
          open
            ? 'border-[#1e3a8a] ring-[3px] ring-[#1e3a8a]/12'
            : 'border-[#CBD5E1] hover:border-slate-400/90 focus:border-[#1e3a8a] focus:outline-none focus:ring-[3px] focus:ring-[#1e3a8a]/12'
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {icon ? <span className="shrink-0 text-[#1e3a8a]">{icon}</span> : null}
          <span
            className={`min-w-0 flex-1 truncate ${
              selected ? 'font-semibold text-slate-900' : 'font-normal text-slate-400'
            }`}
          >
            {selected ? selected.label : emptyLabel ?? placeholder}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {clearable && selected && !disabled ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Kosongkan pilihan"
              onClick={(event) => {
                event.stopPropagation();
                onChange('');
              }}
              className="rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <ChevronDownIcon
            className={`h-4 w-4 text-slate-400 transition-transform duration-150 ${
              open ? 'rotate-180 text-[#1e3a8a]' : ''
            }`}
          />
        </span>
      </button>

      {dropdownContent && typeof document !== 'undefined'
        ? createPortal(dropdownContent, document.body)
        : null}
    </div>
  );
};

export default SearchableSelect;
