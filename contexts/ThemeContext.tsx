import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, getTheme, setTheme as saveTheme, defaultThemes } from '../services/fileStorage';

interface ThemeContextType {
  theme: Theme;
  themes: Theme[];
  setTheme: (theme: Theme) => Promise<void>;
  applyTheme: (themeName: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(defaultThemes[0]);
  const [themes] = useState<Theme[]>(defaultThemes);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await getTheme();
      setThemeState(savedTheme);
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      await saveTheme(newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const applyTheme = async (themeName: string) => {
    const selectedTheme = themes.find(t => t.name === themeName);
    if (selectedTheme) {
      await setTheme(selectedTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themes, setTheme, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};


