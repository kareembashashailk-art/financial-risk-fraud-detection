import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ReceiptText,
  AlertTriangle,
  Sliders,
  UploadCloud,
  Users,
  ShieldCheck,
  History,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, isSuperAdmin, canReviewAlerts } = useAuth();

  const navItems = [
    { to: '/', label: 'Risk Dashboard', icon: LayoutDashboard },
    { to: '/transactions', label: 'Transactions', icon: ReceiptText },
    { to: '/alerts', label: 'Suspicious Alerts', icon: AlertTriangle },
    { to: '/rules', label: 'Detection Rules', icon: Sliders },
    { to: '/import', label: 'CSV Import', icon: UploadCloud },
  ];

  if (canReviewAlerts || isSuperAdmin) {
    navItems.push({ to: '/audit-logs', label: 'Audit Logs', icon: History });
  }

  if (isSuperAdmin) {
    navItems.push({ to: '/users', label: 'User Accounts', icon: Users });
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-950/40">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white leading-none">RISK GUARD</div>
            <div className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-1">
              Fraud Detection Engine
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Main Monitoring
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card at bottom */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-blue-400">
              {user?.username?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user?.full_name || user?.username}</div>
              <div className="text-[11px] text-slate-400 capitalize truncate">
                {user?.role?.replace('_', ' ') || 'User'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
