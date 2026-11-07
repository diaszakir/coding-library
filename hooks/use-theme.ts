'use client';
import { useEffect, useState } from 'react';
const KEY = 'devlibrary.theme.v1';
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const read = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(KEY); } catch { /* Session-only preference. */ }
      const value = saved === 'dark' || saved === 'light' ? saved : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setTheme(value);
      document.documentElement.dataset.theme = value;
    };
    read();
    const sync = (event: StorageEvent) => { if (event.key === KEY) read(); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const toggleTheme = () => {
    const value = theme === 'dark' ? 'light' : 'dark';
    setTheme(value);
    document.documentElement.dataset.theme = value;
    try { localStorage.setItem(KEY, value); } catch { /* Keep the current session usable. */ }
  };
  return { theme, toggleTheme };
}
