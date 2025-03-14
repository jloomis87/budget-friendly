import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography
} from '@mui/material';
import { isColorDark } from '../../utils/colorUtils';

interface CopyMonthDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (targetMonth: string) => void;
  currentMonth: string;
  category: string;
  tableColor: string;
  isDark: boolean;
}

export function CopyMonthDialog({
  open,
  onClose,
  onConfirm,
  currentMonth,
  category,
  tableColor,
  isDark
}: CopyMonthDialogProps) {
  const [selectedMonth, setSelectedMonth] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setSelectedMonth('');
    }
  }, [open]);

  const months = React.useMemo(() => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const options = [];
    // Add months for current year
    for (let i = 0; i < 12; i++) {
      const monthStr = `${monthNames[i]} ${currentYear}`;
      if (monthStr !== currentMonth) {
        options.push(monthStr);
      }
    }
    // Add months for next year
    for (let i = 0; i < 12; i++) {
      options.push(`${monthNames[i]} ${currentYear + 1}`);
    }
    return options;
  }, [currentMonth]);

  const handleConfirm = () => {
    if (selectedMonth) {
      onConfirm(selectedMonth);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'background.paper',
          color: isDark ? '#fff' : 'inherit',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: tableColor,
        color: isColorDark(tableColor) ? '#fff' : 'rgba(0, 0, 0, 0.87)',
        fontWeight: 'bold',
        pb: 3
      }}>
        Copy {category} to Another Month
      </DialogTitle>
      <DialogContent sx={{ pt: 4, pb: 2 }}>
        <Typography variant="body1" sx={{ mb: 3, color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary' }}>
          Select the target month to copy {category.toLowerCase()} from {currentMonth} to:
        </Typography>
        <FormControl fullWidth>
          <InputLabel id="month-select-label" sx={{ 
            color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
          }}>
            Target Month
          </InputLabel>
          <Select
            labelId="month-select-label"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            label="Target Month"
            sx={{
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : undefined,
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : undefined,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : undefined,
              },
              '& .MuiSelect-icon': {
                color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
              }
            }}
          >
            {months.map((month) => (
              <MenuItem key={month} value={month}>
                {month}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={onClose}
          sx={{ 
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
            '&:hover': {
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
            },
            mr: 1
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedMonth}
          sx={{ 
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
            }
          }}
        >
          Copy
        </Button>
      </DialogActions>
    </Dialog>
  );
} 