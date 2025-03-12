import React from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button 
} from '@mui/material';
import type { DeleteConfirmationDialogProps } from './types';

export function DeleteConfirmationDialog({
  open,
  transactionToDelete,
  onClose,
  onConfirm
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="delete-transaction-dialog-title"
      aria-describedby="delete-transaction-dialog-description"
    >
      <DialogTitle id="delete-transaction-dialog-title">
        Confirm Deletion
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="delete-transaction-dialog-description">
          Are you sure you want to delete the transaction "{transactionToDelete?.transaction.description}"
          for {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(transactionToDelete?.transaction.amount || 0)}?
          This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" autoFocus>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
} 