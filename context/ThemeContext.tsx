import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkThemeColors, LightThemeColors, ThemeColors, getThemeColors } from '../constants/Colors';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'victory-app-theme';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  colors: DarkThemeColors,
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    let cancelled = false;
    const loadSavedTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!cancelled && (saved === 'light' || saved === 'dark')) {
          setThemeState(saved);
        }
      } catch {
        // Fallback to default dark
      }
    };
    void loadSavedTheme();
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const isDark = theme === 'dark';
  const colors = useMemo(() => getThemeColors(theme), [theme]);

  // Sync background on web to avoid white/dark flickering on bounce or borders
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        document.documentElement.style.backgroundColor = colors.background;
        if (document.body) {
          document.body.style.backgroundColor = colors.background;
          document.body.style.color = colors.text;
        }
      } catch {
        // ignore in non-browser envs
      }
    }
  }, [colors]);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      colors,
      setTheme,
      toggleTheme,
    }),
    [theme, isDark, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
