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
 * dengan header bar terstruktur, border #CBD5E1, dan radius [16px].
 */
export const AdminPanelTemplate: React.FC<AdminPanelTemplateProps> = ({
  title,
  description,
  badge,
  actions,
  children,
  className = '',
  bodyClassName = 'p-6 sm:p-8',
}) => {
  return (
    <div
      className={`w-full min-w-0 bg-white border border-[#CBD5E1] rounded-[16px] shadow-xs overflow-hidden ${className}`}
    >
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 border-b border-[#CBD5E1] bg-white">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {/* Panel Body */}
      <div className={bodyClassName}>
        {children}
      </div>
    </div>
  );
};
