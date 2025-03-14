import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

interface CopyMonthConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sourceMonth: string;
  targetMonth: string;
  category: string;
  transactionCount: number;
}

export function CopyMonthConfirmationDialog({
  open,
  onClose,
  onConfirm,
  sourceMonth,
  targetMonth,
  category,
  transactionCount,
}: CopyMonthConfirmationDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Copy {sourceMonth} {category} to {targetMonth}?</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to copy all {transactionCount} {category.toLowerCase()} 
          from {sourceMonth} to {targetMonth}? The day of each transaction will remain 
          the same, but the month will be updated to {targetMonth}.
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