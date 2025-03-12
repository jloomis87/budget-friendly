import React, { useState } from 'react';
import { Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText } from '@mui/material';

interface BudgetActionsProps {
  onReset: () => Promise<void>;
  title?: string;
}

export function BudgetActions({ onReset, title = "Your Budget Plan" }: BudgetActionsProps) {
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

  const handleOpenConfirmDialog = () => {
    setOpenConfirmDialog(true);
  };

  const handleCloseConfirmDialog = () => {
    setOpenConfirmDialog(false);
  };

  const handleConfirmReset = async () => {
    try {
      await onReset();
      handleCloseConfirmDialog();
    } catch (error) {
      console.error('Error resetting budget:', error);
      // Dialog will stay open if there's an error
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Button 
          variant="outlined" 
          color="error" 
          size="small"
          onClick={handleOpenConfirmDialog}
        >
          Reset Budget
        </Button>
      </Box>

      <Dialog
        open={openConfirmDialog}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Reset Your Budget?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This action will delete all your transaction data and cannot be undone. Are you sure you want to reset your budget?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmReset} color="error" variant="contained" autoFocus>
            Reset Budget
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 