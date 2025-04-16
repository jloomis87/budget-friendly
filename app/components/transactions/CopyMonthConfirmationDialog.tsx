import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

interface CopyMonthConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sourceMonth: string;
  targetMonth: string;
  category: string;
  transactionCount: number;
  onTargetMonthChange?: React.Dispatch<React.SetStateAction<string>>;
}

export function CopyMonthConfirmationDialog({
  open,
  onClose,
  onConfirm,
  sourceMonth,
  targetMonth,
  category,
  transactionCount,
  onTargetMonthChange,
}: CopyMonthConfirmationDialogProps) {
  // Ensure category is a string before using toLowerCase
  const categoryName = category ? (typeof category === 'string' ? category : String(category)) : 'transactions';
  
  // Define all months
  const allMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Copy {sourceMonth} {categoryName} to {targetMonth}?</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          Copy all {transactionCount} {categoryName.toLowerCase()} from {sourceMonth} to:
        </Typography>
        
        {onTargetMonthChange && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="target-month-label">Target Month</InputLabel>
            <Select
              labelId="target-month-label"
              value={targetMonth}
              label="Target Month"
              onChange={(e) => onTargetMonthChange(e.target.value)}
            >
              {allMonths.filter(month => month !== sourceMonth).map((month) => (
                <MenuItem key={month} value={month}>{month}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        
        <Typography>
          The day of each transaction will remain the same, but the month will be updated to {targetMonth}.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="primary" variant="contained">
          Copy Transactions
        </Button>
      </DialogActions>
    </Dialog>
  );
} 