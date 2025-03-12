import React from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline, StyledEngineProvider } from '@mui/material';
import { blue, green, grey } from '@mui/material/colors';

// Create a theme instance
const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 1500,
      md: 1650,
      lg: 1900,
      xl: 2200,
    },
  },
  palette: {
    primary: {
      main: blue[500],
    },
    secondary: {
      main: green[500],
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // This will ensure MUI styles take precedence over Tailwind
        html: {
          backgroundColor: '#f5f7fa',
          height: '100%',
        },
        body: {
          margin: 0,
          padding: 0,
          fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
          backgroundColor: '#f5f7fa',
          height: '100%',
          minHeight: '100vh',
        },
        '#__next': {
          minHeight: '100vh',
          backgroundColor: '#f5f7fa',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <StyledEngineProvider injectFirst>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </StyledEngineProvider>
  );
} 