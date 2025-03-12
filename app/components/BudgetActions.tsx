import React from 'react';
import { Box, Button, Typography } from '@mui/material';

interface BudgetActionsProps {
  onReset: () => void;
  title?: string;
}

export function BudgetActions({ onReset, title = "Your Budget Plan" }: BudgetActionsProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Button 
        variant="outlined" 
        color="error" 
        size="small"
        onClick={onReset}
      >
        Reset Budget
      </Button>
    </Box>
  );
} 