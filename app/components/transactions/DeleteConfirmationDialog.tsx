import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box
} from '@mui/material';
import type { Transaction } from '../../services/fileParser';
import { useCurrency } from '../../contexts/CurrencyContext';

interface DeleteConfirmationDialogProps {
  open: boolean;
  transactionToDelete: { transaction: Transaction; index: number } | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationDialog({
  open,
  transactionToDelete,
  onClose,
  onConfirm
}: DeleteConfirmationDialogProps) {
  const isDark = true; // TODO: Get from theme context
  const { formatCurrency } = useCurrency();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'background.paper',
          color: isDark ? '#fff' : 'inherit',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 'bold' }}>
        Confirm Delete
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography>
          Are you sure you want to delete this {transactionToDelete?.transaction.category.toLowerCase()}?
        </Typography>
        {transactionToDelete && (
          <Box sx={{ mt: 2, bgcolor: 'rgba(0,0,0,0.05)', p: 2, borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {transactionToDelete.transaction.description}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {formatCurrency(Math.abs(transactionToDelete.transaction.amount))}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={onClose} 
          color="primary" 
          sx={{ 
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
            '&:hover': {
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
            }
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={onConfirm} 
          color="error" 
          variant="contained"
          sx={{ 
            bgcolor: 'error.main', 
            color: '#fff',
            '&:hover': {
              bgcolor: 'error.dark',
            } 
          }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
} 