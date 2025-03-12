import React from 'react';
import { Card, CardContent, Grid, Typography, Box } from '@mui/material';
import type { MobileTransactionCardProps } from './types';

export function MobileTransactionCard({
  transaction,
  isDark,
  handleOpenMobileEdit,
  index,
  formatDateForDisplay
}: MobileTransactionCardProps) {
  return (
    <Card 
      sx={{ 
        mb: '5px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
        borderRadius: 2,
        mx: '5px',
        position: 'relative',
      }}
      onClick={() => handleOpenMobileEdit(transaction, index)}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Grid container spacing={1}>
          <Grid item xs={8}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, color: isDark ? '#fff' : 'text.primary' }}>
              {transaction.description}
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
              {formatDateForDisplay(transaction.date)}
            </Typography>
          </Grid>
          <Grid item xs={4} sx={{ textAlign: 'right' }}>
            <Typography variant="subtitle1" sx={{ 
              color: isDark ? '#fff' : 'text.primary' 
            }}>
              ${Math.abs(transaction.amount).toFixed(2)}
            </Typography>
          </Grid>
        </Grid>
        
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute',
            bottom: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
            fontSize: '0.7rem',
            width: 'auto',
            textAlign: 'center',
            pointerEvents: 'none'
          }}
        >
          (click to edit)
        </Typography>
      </CardContent>
    </Card>
  );
} 