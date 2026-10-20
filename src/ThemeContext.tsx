import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ThemeMode = 'classic' | 'glass';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'classic', toggleTheme: () => {} });

function loadTheme(): ThemeMode {
  // Always 'classic' — the approved Brevo-style redesign is the only design now, with no
  // toggle to reach the old 'glass' look. This ignores any 'screentime_theme' value a
  // browser saved from before the toggle was removed, so a visitor who previously switched
  // to glass doesn't keep landing on the old design forever with no way back.
  return 'classic';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(loadTheme);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'glass' ? 'classic' : 'glass';
      try { localStorage.setItem('screentime_theme', next); } catch {}
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
