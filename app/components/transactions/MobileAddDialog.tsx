import React from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, 
  Box, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import type { MobileAddDialogProps } from './types';

export function MobileAddDialog({
  open,
  category,
  newDescription,
  newAmount,
  newDate,
  setNewDescription,
  setNewAmount,
  setNewDate,
  onClose,
  onAdd,
  generateDayOptions,
  getOrdinalSuffix
}: MobileAddDialogProps) {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle sx={{ pb: 1 }}>
        New {category} Expense
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            variant="outlined"
            fullWidth
            placeholder="e.g., Groceries"
            inputProps={{ style: { fontSize: '1.1rem' } }}
            sx={{ 
              "& .MuiOutlinedInput-root": { 
                backgroundColor: 'white' 
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: 'rgba(0, 0, 0, 0.23)'
              },
              "& .MuiInputLabel-outlined": {
                backgroundColor: 'white',
                paddingLeft: '5px',
                paddingRight: '5px'
              }
            }}
          />
          
          <FormControl fullWidth variant="outlined" sx={{ 
            "& .MuiOutlinedInput-root": { 
              backgroundColor: 'white' 
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: 'rgba(0, 0, 0, 0.23)'
            },
            "& .MuiInputLabel-outlined": {
              backgroundColor: 'white',
              paddingLeft: '5px',
              paddingRight: '5px'
            },
            maxWidth: '150px'
          }}>
            <InputLabel>Due Day</InputLabel>
            <Select
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              label="Due Day"
            >
              {generateDayOptions().map(day => (
                <MenuItem key={day} value={day.toString()}>
                  {getOrdinalSuffix(day)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            label="Amount"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            variant="outlined"
            fullWidth
            placeholder="0.00"
            inputProps={{ style: { fontSize: '1.1rem' } }}
            InputProps={{
              startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>
            }}
            sx={{ 
              "& .MuiOutlinedInput-root": { 
                backgroundColor: 'white' 
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: 'rgba(0, 0, 0, 0.23)'
              },
              "& .MuiInputLabel-outlined": {
                backgroundColor: 'white',
                paddingLeft: '5px',
                paddingRight: '5px'
              }
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          sx={{ borderRadius: 2, px: 3 }}
        >
          Cancel
        </Button>
        <Button 
          onClick={onAdd} 
          variant="contained"
          sx={{ borderRadius: 2, px: 3 }}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
} 