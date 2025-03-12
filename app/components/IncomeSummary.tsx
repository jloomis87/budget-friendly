import React from 'react';
import { Box, Typography } from '@mui/material';

interface IncomeSummaryProps {
  totalIncome: number;
}

export function IncomeSummary({ totalIncome }: IncomeSummaryProps) {
  if (totalIncome <= 0) {
    return null;
  }
  
  return (
    <Box 
      sx={{ 
        mb: 4, 
        textAlign: 'center',
        p: 2,
        borderRadius: 2,
        bgcolor: 'success.light',
        color: 'success.contrastText',
        mx: { xs: 1, sm: 2 }, // Add horizontal margin
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', // Add subtle shadow
      }}
    >
      <Typography 
        variant="h5" 
        sx={{ 
          fontWeight: 'bold',
        }}
      >
        INCOME: {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(totalIncome)}
      </Typography>
    </Box>
  );
} 