/**
 * DateRangePicker Component
 * 
 * This component provides an interface for selecting custom date ranges to filter
 * transaction data throughout the application. It can be used alongside or as an
 * alternative to the MonthSelector component.
 * 
 * Key Features:
 * - Predefined date range options (Today, This Week, This Month, Last Month, etc.)
 * - Custom date range selection using date pickers
 * - Visual indicator of the active date range
 * - Integration with Firebase for persisting user preferences
 * 
 * Usage:
 * The DateRangePicker can be used in the main BudgetApp component and its selections affect:
 * 1. TransactionTable displays - only showing transactions within the date range
 * 2. BudgetSummary calculations - only considering transactions within the date range
 * 3. Reports and visualizations - filtering data based on the selected time period
 */

import React, { useState } from 'react';
import { 
  Box, 
  Button,
  Divider,
  FormControl,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Popover,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  DateRange,
  Today,
  CalendarViewWeek,
  CalendarMonth,
  CalendarToday,
  KeyboardArrowDown,
  ChevronLeft,
  ChevronRight 
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';

// Define date range preset options
const DATE_RANGE_PRESETS = [
  {
    id: 'today',
    label: 'Today',
    icon: <Today fontSize="small" />,
    getRange: () => {
      const today = new Date();
      return { start: today, end: today };
    }
  },
  {
    id: 'thisWeek',
    label: 'This Week',
    icon: <CalendarViewWeek fontSize="small" />,
    getRange: () => {
      return { 
        start: startOfWeek(new Date(), { weekStartsOn: 1 }), 
        end: endOfWeek(new Date(), { weekStartsOn: 1 }) 
      };
    }
  },
  {
    id: 'thisMonth',
    label: 'This Month',
    icon: <CalendarMonth fontSize="small" />,
    getRange: () => {
      return { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
    }
  },
  {
    id: 'lastMonth',
    label: 'Last Month',
    icon: <CalendarToday fontSize="small" />,
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
  },
  {
    id: 'thisYear',
    label: 'This Year',
    icon: <DateRange fontSize="small" />,
    getRange: () => {
      return { start: startOfYear(new Date()), end: endOfYear(new Date()) };
    }
  },
  {
    id: 'last30Days',
    label: 'Last 30 Days',
    icon: <DateRange fontSize="small" />,
    getRange: () => {
      return { start: subDays(new Date(), 30), end: new Date() };
    }
  }
];

// Use the word 'type' to make a type-only export
export type DateRangeType = {
  start: Date;
  end: Date;
}

interface DateRangePickerProps {
  selectedDateRange: DateRangeType;
  onChange: (dateRange: DateRangeType) => void;
  selectedMonths?: string[]; // Optional prop for compatibility with existing month-based filtering
  onMonthsChange?: (months: string[]) => void; // Optional callback for updating months when date range changes
}

export function DateRangePicker({ 
  selectedDateRange, 
  onChange, 
  selectedMonths, 
  onMonthsChange 
}: DateRangePickerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [tempDateRange, setTempDateRange] = useState<DateRangeType>(selectedDateRange);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  
  // Helper to check if a date range matches a preset
  const detectActivePreset = (range: DateRangeType) => {
    for (const preset of DATE_RANGE_PRESETS) {
      const presetRange = preset.getRange();
      if (
        format(range.start, 'yyyy-MM-dd') === format(presetRange.start, 'yyyy-MM-dd') &&
        format(range.end, 'yyyy-MM-dd') === format(presetRange.end, 'yyyy-MM-dd')
      ) {
        return preset.id;
      }
    }
    return null;
  };

  // Update active preset when selected date range changes
  React.useEffect(() => {
    setActivePreset(detectActivePreset(selectedDateRange));
  }, [selectedDateRange]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setTempDateRange(selectedDateRange);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePresetSelect = (preset: typeof DATE_RANGE_PRESETS[0]) => {
    const newRange = preset.getRange();
    setTempDateRange(newRange);
    onChange(newRange);
    setActivePreset(preset.id);
    
    // If month change callback is provided, update selected months to match the date range
    if (onMonthsChange) {
      const monthsInRange = getMonthsInRange(newRange);
      onMonthsChange(monthsInRange);
    }
    
    handleClose();
  };

  const handleCustomRangeApply = () => {
    onChange(tempDateRange);
    setActivePreset(null);
    
    // If month change callback is provided, update selected months to match the date range
    if (onMonthsChange) {
      const monthsInRange = getMonthsInRange(tempDateRange);
      onMonthsChange(monthsInRange);
    }
    
    handleClose();
  };

  // Helper to get month names from a date range
  const getMonthsInRange = (range: DateRangeType): string[] => {
    const months = new Set<string>();
    let current = new Date(range.start);
    
    while (current <= range.end) {
      months.add(current.toLocaleString('default', { month: 'long' }));
      current.setMonth(current.getMonth() + 1);
    }
    
    return Array.from(months);
  };

  // Format the displayed date range
  const formatDateRange = () => {
    if (activePreset) {
      const preset = DATE_RANGE_PRESETS.find(p => p.id === activePreset);
      return preset ? preset.label : 'Custom Range';
    }
    
    return `${format(selectedDateRange.start, 'MMM d, yyyy')} - ${format(selectedDateRange.end, 'MMM d, yyyy')}`;
  };

  const open = Boolean(anchorEl);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Tooltip title="Filter transactions by date range" arrow placement="top">
        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            borderRadius: 2,
            width: { xs: '100%', sm: 'auto' },
            minWidth: { xs: '100%', sm: 280 },
            maxWidth: '100%'
          }}
        >
          <Box 
            onClick={handleClick}
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'action.hover',
                borderRadius: 1
              },
              p: 0.5
            }}
          >
            <DateRange color="primary" sx={{ mr: 1.5 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {formatDateRange()}
              </Typography>
            </Box>
            <KeyboardArrowDown color="action" />
          </Box>

          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            PaperProps={{
              sx: { 
                width: { xs: '90vw', sm: 350 },
                mt: 1,
                borderRadius: 2,
                overflow: 'hidden'
              }
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
              {/* Presets */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Preset Ranges
                </Typography>
                <List dense disablePadding>
                  {DATE_RANGE_PRESETS.map((preset) => (
                    <ListItem key={preset.id} disablePadding>
                      <ListItemButton 
                        onClick={() => handlePresetSelect(preset)}
                        selected={activePreset === preset.id}
                        sx={{ 
                          borderRadius: 1,
                          '&.Mui-selected': {
                            bgcolor: 'primary.light',
                            color: 'primary.main',
                            '&:hover': {
                              bgcolor: 'primary.light',
                            }
                          }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {preset.icon}
                        </ListItemIcon>
                        <ListItemText primary={preset.label} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>

              {/* Custom Range */}
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Custom Range
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <DatePicker
                    label="Start Date"
                    value={tempDateRange.start}
                    onChange={(newValue) => {
                      if (newValue) {
                        setTempDateRange(prev => ({ ...prev, start: newValue }));
                      }
                    }}
                    slotProps={{ 
                      textField: { 
                        size: 'small',
                        fullWidth: true,
                        sx: { flexGrow: 1 }
                      } 
                    }}
                  />
                  <DatePicker
                    label="End Date"
                    value={tempDateRange.end}
                    onChange={(newValue) => {
                      if (newValue) {
                        setTempDateRange(prev => ({ ...prev, end: newValue }));
                      }
                    }}
                    slotProps={{ 
                      textField: { 
                        size: 'small',
                        fullWidth: true,
                        sx: { flexGrow: 1 }
                      } 
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleCustomRangeApply}
                    disabled={!tempDateRange.start || !tempDateRange.end}
                    sx={{ textTransform: 'none' }}
                  >
                    Apply Range
                  </Button>
                </Box>
              </Box>
            </Box>
          </Popover>
        </Paper>
      </Tooltip>
    </LocalizationProvider>
  );
}

// Helper function to check if a transaction date is within the selected range
export function isTransactionInDateRange(transaction: { date: string }, dateRange: DateRangeType): boolean {
  try {
    const transactionDate = parseISO(transaction.date);
    return isWithinInterval(transactionDate, { 
      start: dateRange.start, 
      end: dateRange.end 
    });
  } catch (error) {
    console.error('Error checking if transaction is in date range:', error);
    return false;
  }
} 