import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', alert = false }) => {
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/25',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/25',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/25',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/25',
  };

  const cardBorder = alert
    ? 'border-rose-500/40 bg-rose-500/5 shadow-rose-500/5'
    : 'border-slate-700/80 bg-slate-900 hover:border-slate-600';

  return (
    <div className={`p-5 rounded-2xl border ${cardBorder} shadow-lg backdrop-blur flex flex-col justify-between transition-all duration-200`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${colorMap[color] || colorMap.blue}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold tracking-tight text-white">
          {value !== undefined && value !== null ? value.toLocaleString() : '0'}
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
};
