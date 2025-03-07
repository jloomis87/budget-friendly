import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { EditOutlinedIcon, SaveIcon, CloseIcon } from '../utils/materialIcons';

export function BudgetAppTest() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4">Icon Test</Typography>
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <IconButton>
          <EditOutlinedIcon />
        </IconButton>
        <IconButton>
          <SaveIcon />
        </IconButton>
        <IconButton>
          <CloseIcon />
        </IconButton>
      </Box>
    </Box>
  );
} 