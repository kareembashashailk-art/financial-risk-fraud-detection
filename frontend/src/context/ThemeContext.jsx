import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
};

export const THEME_OPTIONS = [
  {
    id: THEMES.DARK,
    name: 'Dark',
    shortName: 'Dark',
    tagline: 'Midnight obsidian & electric blue',
    icon: '🌙',
    previewBg: '#0B0F19',
    previewCard: '#1E293B',
    previewAccent: '#3B82F6',
    previewBorder: '#334155',
  },
  {
    id: THEMES.LIGHT,
    name: 'Normal',
    shortName: 'Normal',
    tagline: 'Clean daylight financial slate',
    icon: '☀️',
    previewBg: '#F8FAFC',
    previewCard: '#FFFFFF',
    previewAccent: '#2563EB',
    previewBorder: '#E2E8F0',
  },
];

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('risk_guard_theme');
      if (saved === THEMES.DARK || saved === THEMES.LIGHT) {
        return saved;
      }
    } catch {
      // fallback
    }
    return THEMES.DARK;
  });

  const setTheme = (newTheme) => {
    if (newTheme === THEMES.DARK || newTheme === THEMES.LIGHT) {
      setThemeState(newTheme);
      try {
        localStorage.setItem('risk_guard_theme', newTheme);
      } catch {
        // ignore
      }
    }
  };

  const toggleTheme = () => {
    setThemeState((current) => {
      const next = current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
      try {
        localStorage.setItem('risk_guard_theme', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.className = `theme-${theme}`;

    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.content = theme === THEMES.DARK ? '#0B0F19' : '#F8FAFC';
  }, [theme]);

  const currentThemeMeta = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        themes: THEME_OPTIONS,
        currentThemeMeta,
        isDark: theme === THEMES.DARK,
        isLight: theme === THEMES.LIGHT,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
