import React from 'react';
import { Box, Typography } from '@mui/material';
import type { DragIndicatorProps } from './types';

export const DragIndicator: React.FC<DragIndicatorProps> = ({
  isDragging,
  isCopyMode,
  isIntraMonthDrag,
  dragSourceMonth
}) => {
  if (!isDragging) return null;
  
  return (
    <Box
      sx={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: isCopyMode ? 'rgba(76, 175, 80, 0.9)' : 'rgba(33, 150, 243, 0.9)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        fontSize: '14px',
        fontWeight: 'bold',
        transition: 'all 0.2s ease'
      }}
    >
      {isCopyMode ? (
        <>
          <span style={{ fontSize: '18px' }}>📋</span>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Copy Mode: Creating a copy in the target month
          </Typography>
        </>
      ) : isIntraMonthDrag ? (
        <>
          <span style={{ fontSize: '18px' }}>🔄</span>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Sort Mode: Reordering within {dragSourceMonth}
          </Typography>
        </>
      ) : (
        <>
          <span style={{ fontSize: '18px' }}>↕️</span>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Move Mode: Moving to the target month
          </Typography>
        </>
      )}
    </Box>
  );
}; 