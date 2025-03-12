import React from 'react';
import { TableRow, TableCell, Typography } from '@mui/material';
import type { TotalRowProps } from './types';

export function TotalRow({ category, totalAmount, isDark }: TotalRowProps) {
  return (
    <TableRow sx={{
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
      fontWeight: 'bold',
    }}>
      <TableCell></TableCell>
      <TableCell 
        sx={{
          fontWeight: 'bold',
          color: isDark ? '#fff' : 'inherit',
          fontSize: '0.95rem',
          fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        Total {category}
      </TableCell>
      <TableCell></TableCell>
      <TableCell 
        sx={{
          fontWeight: 'bold',
          color: isDark ? '#fff' : 'inherit',
          fontSize: '0.95rem',
          padding: '8px 8px',
          textAlign: 'right',
        }}
      >
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(totalAmount)}
      </TableCell>
      <TableCell></TableCell>
    </TableRow>
  );
} 