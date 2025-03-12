import React from 'react';
import { TableRow, TableCell, Box, Typography } from '@mui/material';
import { AddIcon } from '../../utils/materialIcons';
import type { AddTransactionButtonProps } from './types';

export function AddTransactionButton({ isDark, transactions, setIsAdding }: AddTransactionButtonProps) {
  return (
    <TableRow 
      sx={{
        backgroundColor: 'transparent',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'transparent',
        },
      }}
      onClick={() => setIsAdding(true)}
    >
      <TableCell colSpan={5} align="center" sx={{ py: 2 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDark ? '#fff' : 'primary.main',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(25, 118, 210, 0.08)',
            borderRadius: '20px',
            px: 2.5,
            py: 1,
            transition: 'all 0.2s ease',
            border: `1px dashed ${isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(25, 118, 210, 0.5)'}`,
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(25, 118, 210, 0.15)',
              transform: 'translateY(-1px)',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            },
          }}
        >
          <AddIcon 
            fontSize="small" 
            sx={{ 
              mr: 0.8,
              animation: transactions.length === 0 ? 'pulse 1.5s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { opacity: 0.6 },
                '50%': { opacity: 1 },
                '100%': { opacity: 0.6 }
              }
            }} 
          />
          <Typography 
            sx={{ 
              fontWeight: 500,
              fontSize: '0.9rem',
              letterSpacing: '0.01em',
              color: isDark ? '#fff' : 'inherit',
            }}
          >
            + Add Expense
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );
} 