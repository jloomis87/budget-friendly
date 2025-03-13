import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Define the palette mode type
type PaletteMode = 'light' | 'dark';

// Define the context type
interface ThemeContextType {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

// Create the context with default values
const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
});

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Theme provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use localStorage to persist theme preference
  const [storedMode, setStoredMode] = useLocalStorage<PaletteMode>(
    'theme-mode',
    'theme-mode-legacy',
    'light'
  );
  
  // State to track current theme mode
  const [mode, setMode] = useState<PaletteMode>(storedMode);

  // Function to toggle between light and dark mode
  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Update localStorage when mode changes
  useEffect(() => {
    setStoredMode(mode);
  }, [mode, setStoredMode]);

  // Create the theme based on current mode
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // Light mode palette
                primary: {
                  main: '#2563eb',
                  light: '#3b82f6',
                  dark: '#1d4ed8',
                },
                secondary: {
                  main: '#8b5cf6',
                  light: '#a78bfa',
                  dark: '#7c3aed',
                },
                background: {
                  default: '#f5f7fa',
                  paper: '#ffffff',
                },
                divider: 'rgba(0, 0, 0, 0.12)',
              }
            : {
                // Dark mode palette
                primary: {
                  main: '#3b82f6',
                  light: '#60a5fa',
                  dark: '#2563eb',
                },
                secondary: {
                  main: '#a78bfa',
                  light: '#c4b5fd',
                  dark: '#8b5cf6',
                },
                background: {
                  default: '#111827',
                  paper: '#1f2937',
                },
                divider: 'rgba(255, 255, 255, 0.12)',
                text: {
                  primary: '#f3f4f6',
                  secondary: '#d1d5db',
                },
              }),
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow: mode === 'dark' 
                  ? '0 4px 20px 0 rgba(0, 0, 0, 0.5)' 
                  : '0 4px 20px 0 rgba(0, 0, 0, 0.08)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}; 