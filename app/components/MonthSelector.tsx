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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
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

  // For mobile view, use a minimized version
  if (isMobile) {
    return (
      <Box>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 1
        }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontWeight: 600,
              color: 'text.primary'
            }}
          >
            {selectedMonths.length === MONTHS.length 
              ? 'All Months' 
              : selectedMonths.length === 1 
                ? selectedMonths[0] 
                : `${selectedMonths.length} Months Selected`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              size="small"
              onClick={handleSelectAll}
              sx={{
                textTransform: 'none',
                fontSize: '0.75rem',
                py: 0.5,
                minWidth: 'auto'
              }}
            >
              All
            </Button>
            <Button 
              size="small"
              onClick={handleDeselectAll}
              sx={{
                textTransform: 'none',
                fontSize: '0.75rem',
                py: 0.5,
                minWidth: 'auto'
              }}
            >
              Current
            </Button>
          </Box>
        </Box>
        
        <Box 
          sx={{ 
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5,
            mb: 1
          }}
        >
          {MONTHS.map((month) => (
            <Chip
              key={month}
              label={month.substring(0, 3)}
              size="small"
              clickable
              color={selectedMonths.includes(month) ? "primary" : "default"}
              variant={selectedMonths.includes(month) ? "filled" : "outlined"}
              onClick={() => {
                const newSelection = selectedMonths.includes(month)
                  ? selectedMonths.filter(m => m !== month)
                  : [...selectedMonths, month];
                onChange(newSelection);
              }}
              sx={{
                fontWeight: selectedMonths.includes(month) ? 600 : 400,
                transition: 'all 0.2s',
                fontSize: '0.75rem'
              }}
            />
          ))}
        </Box>
      </Box>
    );
  }

  // Desktop view with grid of toggle buttons
  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 1
      }}>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 600,
            color: 'text.primary'
          }}
        >
          {selectedMonths.length === MONTHS.length 
            ? 'All Months Selected' 
            : selectedMonths.length === 1 
              ? `Month: ${selectedMonths[0]}` 
              : `${selectedMonths.length} Months Selected`}
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
            Current Month
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