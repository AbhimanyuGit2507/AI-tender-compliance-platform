import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeSetting, setThemeSetting] = useState(() => {
    try {
      return localStorage.getItem('bidkaro_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [fontSetting, setFontSetting] = useState(() => {
    try {
      return localStorage.getItem('bidkaro_font') || 'geist';
    } catch {
      return 'geist';
    }
  });

  const [resolvedTheme, setResolvedTheme] = useState('dark');

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-font', fontSetting);
    try {
      localStorage.setItem('bidkaro_font', fontSetting);
    } catch {
      // storage unavailable
    }
  }, [fontSetting]);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let active = themeSetting;
      if (themeSetting === 'auto') {
        active = mediaQuery.matches ? 'dark' : 'light';
      }
      setResolvedTheme(active);
      root.setAttribute('data-theme', active);
    };

    applyTheme();

    const listener = () => {
      if (themeSetting === 'auto') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', listener);
    try {
      localStorage.setItem('bidkaro_theme', themeSetting);
    } catch {
      // storage unavailable
    }

    return () => mediaQuery.removeEventListener('change', listener);
  }, [themeSetting]);

  return (
    <ThemeContext.Provider
      value={{
        theme: themeSetting,
        resolvedTheme,
        setTheme: setThemeSetting,
        font: fontSetting,
        setFont: setFontSetting,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
