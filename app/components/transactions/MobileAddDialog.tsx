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
  getOrdinalSuffix,
  tableColor,
  isDark
}: MobileAddDialogProps) {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        backgroundColor: tableColor,
        color: isDark ? '#fff' : 'inherit',
        fontWeight: 'bold',
        py: 2,
        px: 3
      }}>
        New {category} Expense
      </DialogTitle>
      <DialogContent sx={{ p: 2, mt: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box>
            <InputLabel 
              sx={{
                color: 'text.secondary',
                mb: 1,
                fontSize: '0.875rem'
              }}
            >
              Description
            </InputLabel>
            <TextField
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              variant="outlined"
              fullWidth
              placeholder="e.g., Groceries"
              InputProps={{
                sx: {
                  bgcolor: 'background.paper'
                }
              }}
            />
          </Box>
          
          <Box>
            <InputLabel 
              sx={{
                color: 'text.secondary',
                mb: 1,
                fontSize: '0.875rem'
              }}
            >
              Amount
            </InputLabel>
            <TextField
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              variant="outlined"
              fullWidth
              placeholder="0.00"
              InputProps={{
                startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>,
                sx: {
                  bgcolor: 'background.paper'
                }
              }}
            />
          </Box>
          
          <Box>
            <InputLabel 
              sx={{
                color: 'text.secondary',
                mb: 1,
                fontSize: '0.875rem'
              }}
            >
              Day of Month
            </InputLabel>
            <Select
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              fullWidth
              sx={{
                bgcolor: 'background.paper'
              }}
            >
              {generateDayOptions().map(day => (
                <MenuItem key={day} value={day.toString()}>
                  {getOrdinalSuffix(day)}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'background.paper' }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button 
          onClick={onClose} 
          sx={{ 
            color: 'text.secondary',
            mr: 1,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            height: 36
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={onAdd} 
          variant="contained"
          disabled={!newDescription.trim() || !newAmount.trim()}
          sx={{ 
            fontWeight: 'bold',
            textTransform: 'uppercase',
            height: 36,
            '&.Mui-disabled': {
              opacity: 0.5,
            }
          }}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
} 