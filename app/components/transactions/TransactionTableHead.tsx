import React from 'react';
import { TableHead, TableRow, TableCell } from '@mui/material';

interface TransactionTableHeadProps {
  isDark: boolean;
  isAnyRowEditing: boolean;
}

export function TransactionTableHead({ isDark, isAnyRowEditing }: TransactionTableHeadProps) {
  return (
    <TableHead>
      <TableRow sx={{
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.04)',
      }}>
        <TableCell sx={{ 
          width: '5%', 
          color: isDark ? '#fff' : 'inherit',
          padding: '8px 4px 8px 8px',
        }}></TableCell>
        <TableCell sx={{ 
          width: '30%',
          fontWeight: 700,
          color: isDark ? '#fff' : 'inherit',
          fontSize: '1rem',
          fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          letterSpacing: '0.01em',
          paddingLeft: '8px', // Consistent left padding
        }}>Description</TableCell>
        <TableCell align="center" sx={{ 
          width: '30%',
          fontWeight: 700,
          color: isDark ? '#fff' : 'inherit',
          fontSize: '1rem',
          padding: '8px 8px',
          fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          letterSpacing: '0.01em',
          textAlign: 'center',
        }}>Due Day</TableCell>
        <TableCell sx={{ 
          width: '28%',
          fontWeight: 700,
          color: isDark ? '#fff' : 'inherit',
          fontSize: '1rem',
          padding: '8px 8px',
          fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          letterSpacing: '0.01em',
          textAlign: 'right',
        }}>Amount</TableCell>
        <TableCell sx={{ 
          width: '7%',
          fontWeight: 700,
          color: isAnyRowEditing ? (isDark ? '#fff' : 'inherit') : (isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.04)'),
          fontSize: '1rem',
          fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          letterSpacing: '0.01em',
          padding: '8px 4px',
          textAlign: 'center',
          borderLeft: isAnyRowEditing ? `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` : 'none',
        }}>{isAnyRowEditing ? 'Actions' : ''}</TableCell>
      </TableRow>
    </TableHead>
  );
} 