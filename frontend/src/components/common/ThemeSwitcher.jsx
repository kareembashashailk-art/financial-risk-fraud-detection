import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme, THEMES } from '../../context/ThemeContext';

export const ThemeSwitcher = ({ variant = 'navbar' }) => {
  const { theme, setTheme, toggleTheme, isDark } = useTheme();

  // Variant: 'sidebar' (segmented button toggle between Dark and Normal)
  if (variant === 'sidebar') {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Appearance
          </span>
          <span className="text-[10px] font-medium text-slate-400 capitalize">
            {isDark ? 'Dark Mode' : 'Normal Light'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950/60 border border-slate-800">
          <button
            onClick={() => setTheme(THEMES.DARK)}
            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              theme === THEMES.DARK
                ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>
          <button
            onClick={() => setTheme(THEMES.LIGHT)}
            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              theme === THEMES.LIGHT
                ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Normal</span>
          </button>
        </div>
      </div>
    );
  }

  // Default: 'navbar' (1-click quick toggle button)
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to Normal (Light) mode' : 'Switch to Dark mode'}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-all shadow-sm"
    >
      {isDark ? (
        <>
          <Moon className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline font-medium">Dark</span>
        </>
      ) : (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline font-medium">Normal</span>
        </>
      )}
    </button>
  );
};
