import React from 'react';
import { Box, Typography } from '@mui/material';

interface BudgetActionsProps {
  title?: string;
}

export function BudgetActions({ title = "Your Budget Plan" }: BudgetActionsProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
    </Box>
  );
} 