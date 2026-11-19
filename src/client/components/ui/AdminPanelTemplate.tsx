import React from 'react';

interface AdminPanelTemplateProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * AdminPanelTemplate: Container panel utama standar ONE UNUSU
 * Membungkus seluruh konten halaman dalam satu unified white panel card
 * dengan header bar bertekstur arsitektural halus, border #CBD5E1, dan radius [16px].
 */
export const AdminPanelTemplate: React.FC<AdminPanelTemplateProps> = ({
  title,
  description,
  badge,
  actions,
  children,
  className = '',
  bodyClassName = 'p-4 sm:p-5',
}) => {
  return (
    <div
      className={`w-full min-w-0 rounded-[16px] border border-[#CBD5E1] bg-white shadow-[0_2px_10px_-4px_rgba(15,23,42,0.06)] ${className}`}
    >
      {/* Panel Header */}
      <div className="relative overflow-hidden rounded-t-[15px] border-b border-slate-200/90 bg-white">
        <div
          aria-hidden="true"
          className="h-[3px] w-full bg-gradient-to-r from-[#1e3a8a] via-[#2563eb] to-[#d97706]/50"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none bg-cover bg-right bg-no-repeat opacity-90"
          style={{ backgroundImage: "url('/assets/admin-header-texture.png')" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/15"
        />

        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                {title}
              </h1>
              {badge ? <div>{badge}</div> : null}
            </div>
            {description ? (
              <p className="mt-1 max-w-3xl text-[13px] font-medium leading-relaxed text-slate-600 sm:text-sm">
                {description}
              </p>
            ) : null}
          </div>

          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              {actions}
            </div>
          ) : null}
        </div>
      </div>

      {/* Panel Body */}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
};
