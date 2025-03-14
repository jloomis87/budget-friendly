import React, { useState } from 'react';
import { 
  Box, 
  ToggleButtonGroup, 
  ToggleButton, 
  Typography, 
  Paper,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Button
} from '@mui/material';

// Define the months
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface MonthSelectorProps {
  selectedMonths: string[];
  onChange: (months: string[]) => void;
}

export function MonthSelector({ selectedMonths, onChange }: MonthSelectorProps) {
  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newMonths: string[],
  ) => {
    onChange(newMonths);
  };

  // Handle select all months
  const handleSelectAll = () => {
    onChange(MONTHS);
  };

  // Handle deselect all months (keep only current month)
  const handleDeselectAll = () => {
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    onChange([currentMonth]);
  };

  // For mobile view, use a Select component instead
 
  // Desktop view with ToggleButtonGroup
  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2 
      }}>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 600,
            color: 'text.primary'
          }}
        >
          Select Month(s)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            size="small"
            onClick={handleSelectAll}
            sx={{
              textTransform: 'none',
              fontSize: '0.875rem'
            }}
          >
            Select All
          </Button>
          <Button 
            size="small"
            onClick={handleDeselectAll}
            sx={{
              textTransform: 'none',
              fontSize: '0.875rem'
            }}
          >
            Deselect All
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={1}>
        {MONTHS.map((month) => (
          <Grid item md={1} xs={3} sm={2} key={month}>
            <ToggleButton 
              value={month}
              selected={selectedMonths.includes(month)}
              onChange={() => {
                const newSelection = selectedMonths.includes(month)
                  ? selectedMonths.filter(m => m !== month)
                  : [...selectedMonths, month];
                onChange(newSelection);
              }}
              aria-label={month}
              sx={{
                width: '100%',
                py: 1,
                px: 1,
                borderRadius: '8px !important',
                border: '1px solid',
                borderColor: theme => selectedMonths.includes(month) 
                  ? 'primary.main' 
                  : 'divider',
                backgroundColor: theme => selectedMonths.includes(month)
                  ? 'primary.main'
                  : 'background.paper',
                color: theme => selectedMonths.includes(month)
                  ? 'primary.contrastText'
                  : 'text.secondary',
                '&:hover': {
                  backgroundColor: theme => selectedMonths.includes(month)
                    ? 'primary.dark'
                    : 'action.hover',
                  borderColor: theme => selectedMonths.includes(month)
                    ? 'primary.dark'
                    : 'primary.light',
                },
                transition: 'all 0.2s ease-in-out',
                fontWeight: selectedMonths.includes(month) ? 600 : 400,
                fontSize: '0.875rem',
                textTransform: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  }
                }
              }}
            >
              {month.substring(0, 3)}
            </ToggleButton>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
} 