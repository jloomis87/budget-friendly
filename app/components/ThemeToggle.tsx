import React from 'react';
import { IconButton, Tooltip, useTheme as useMuiTheme } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';

// Import icons for light/dark mode
const LightModeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);

const DarkModeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

export const ThemeToggle: React.FC = () => {
  const { mode, toggleColorMode } = useTheme();
  const muiTheme = useMuiTheme();
  
  return (
    <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
      <IconButton
        onClick={toggleColorMode}
        color="inherit"
        aria-label="toggle dark/light mode"
        sx={{
          bgcolor: mode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
          '&:hover': {
            bgcolor: mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
          },
          transition: 'background-color 0.3s',
          borderRadius: '50%',
          p: 1.5,
        }}
      >
        {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </Tooltip>
  );
}; 