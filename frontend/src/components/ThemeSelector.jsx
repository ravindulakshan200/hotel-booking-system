/**
 * components/ThemeSelector.jsx
 * Theme Selector widget.
 * Supports light, dark, and system themes with full transition effects.
 */

import React, { useState, useEffect } from 'react';

const ThemeSelector = () => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'system';
  });

  useEffect(() => {
    const handleThemeChange = () => {
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else if (theme === 'light') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        // System preference
        const isDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
        if (isDark) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
    };

    localStorage.setItem('theme', theme);
    handleThemeChange();

    // Listen for system theme changes if set to system
    if (theme === 'system' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e) => {
        if (e.matches) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const cycleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  return (
    <button
      onClick={cycleTheme}
      className="btn btn-outline-primary d-flex align-items-center justify-content-center p-2 rounded-circle"
      style={{ width: '40px', height: '40px', borderWidth: '1px' }}
      title={`Theme: ${theme.toUpperCase()}`}
      id="theme-selector-btn"
    >
      {theme === 'light' && <i className="bi bi-sun-fill text-warning fs-5"></i>}
      {theme === 'dark' && <i className="bi bi-moon-stars-fill text-info fs-5"></i>}
      {theme === 'system' && <i className="bi bi-display fs-5"></i>}
    </button>
  );
};

export default ThemeSelector;
