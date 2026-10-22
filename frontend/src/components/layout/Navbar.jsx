import React from 'react';
import { Menu, LogOut, Shield, Database } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span>Synthetic Financial Data Sandbox</span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Role badge */}
        <div className="flex items-center gap-2">
          <span className="hidden md:inline text-xs text-slate-400">Signed in as:</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Shield className="w-3 h-3" />
            {user?.role?.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="h-5 w-[1px] bg-slate-800" />

        <button
          onClick={logout}
          title="Sign out"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
