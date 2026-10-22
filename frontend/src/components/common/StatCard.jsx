import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', alert = false }) => {
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  const cardBorder = alert ? 'border-rose-500/40 bg-slate-800/80' : 'border-slate-800 bg-slate-800/40';

  return (
    <div className={`p-5 rounded-xl border ${cardBorder} shadow-lg backdrop-blur flex flex-col justify-between hover:border-slate-700 transition-colors`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${colorMap[color] || colorMap.blue}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold tracking-tight text-white">
          {value !== undefined && value !== null ? value.toLocaleString() : '0'}
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};
