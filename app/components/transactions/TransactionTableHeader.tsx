import React from 'react';
import { Box, Typography } from '@mui/material';
import { CategoryColorPicker } from '../CategoryColorPicker';
import type { TransactionTableHeaderProps } from './types';

export const TransactionTableHeader: React.FC<TransactionTableHeaderProps> = ({
  category,
  totalAmount,
  hasCustomColor,
  hasCustomDarkColor,
  isDark,
  tableColors
}) => {
  return (
    <Box sx={{ 
      p: 2, 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid',
      borderColor: 'rgba(0, 0, 0, 0.1)'
    }}>
      <Typography 
        variant="h6" 
        sx={{ 
          fontWeight: 'bold',
          color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.87)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.87)' : (isDark ? '#fff' : 'inherit')),
          fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          letterSpacing: '0.01em',
        }}
      >
        {category}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography 
          component="span" 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 500, 
            color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.7)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.7)' : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)')),
            fontSize: '0.9rem'
          }}
        >
          (Total: ${Math.abs(totalAmount).toFixed(2)})
        </Typography>
        <CategoryColorPicker category={category} />
      </Box>
    </Box>
  );
}; 