import React from 'react';
import { Box, Typography } from '@mui/material';
import { CategoryColorPicker } from '../CategoryColorPicker';
import type { TableHeaderProps } from './types';

export function TableHeader({ category, totalAmount, isDark }: TableHeaderProps) {
  return (
    <Box sx={{ 
      p: 2, 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
      color: isDark ? '#fff' : 'inherit'
    }}>
      <Typography 
        variant="h6" 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          fontWeight: 'bold',
          color: isDark ? '#fff' : 'inherit',
          fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          letterSpacing: '0.01em',
        }}
      >
        {category} Expenses
        <Typography 
          variant="body2" 
          component="span" 
          sx={{ 
            ml: 1,
            color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'
          }}
        >
          (Total: {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(totalAmount)})
        </Typography>
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CategoryColorPicker category={category} />
      </Box>
    </Box>
  );
} 