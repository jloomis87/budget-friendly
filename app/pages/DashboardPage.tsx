import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Dashboard } from '../components/Dashboard';
import { AppLayout } from '../components/layout/AppLayout';

export function DashboardPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  return (
    <AppLayout>
      <Box sx={{ 
        p: { xs: 2, sm: 3 },
        backgroundColor: isDark ? '#121212' : '#f5f5f5',
        minHeight: 'calc(100vh - 64px)'
      }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            mb: 3,
            color: isDark ? '#fff' : '#333',
            textAlign: { xs: 'center', sm: 'left' }
          }}
        >
          Dashboard
        </Typography>
        
        <Dashboard />
      </Box>
    </AppLayout>
  );
} 