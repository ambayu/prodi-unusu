import React from 'react';
import { MainNavbar } from '../components/MainNavbar';
import { MainFooter } from '../components/MainFooter';

export const MainWebsiteLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-emerald-700 selection:text-white">
      <MainNavbar />
      <main className="flex-1">
        {children}
      </main>
      <MainFooter />
    </div>
  );
};
