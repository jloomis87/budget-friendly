import React from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, 
  Box, IconButton, FormControl, InputLabel, Paper
} from '@mui/material';
import { DeleteIcon } from '../../utils/materialIcons';
import type { MobileEditDialogProps } from './types';
import type { EditingRow } from './types';

export function MobileEditDialog({
  open,
  category,
  editingRow,
  onClose,
  onSave,
  onDelete,
  handleEditingChange,
  generateDayOptions,
  getOrdinalSuffix,
  tableColor,
  isDark
}: MobileEditDialogProps) {
  // Function to handle date change from the native date input
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value && handleEditingChange) {
      // Create a date that preserves the local date exactly as selected
      const [year, month, day] = e.target.value.split('-').map(Number);
      const date = new Date(year, month - 1, day);  // month is 0-based in Date constructor
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      handleEditingChange('date', dateString);
    }
  };

  // Function to get the current date string for the date input
  const getCurrentDate = () => {
    if (!editingRow?.date) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    
    // If the date is just a day number, convert it to a full date
    if (!isNaN(Number(editingRow.date))) {
      const now = new Date();
      const date = new Date(now.getFullYear(), now.getMonth(), Number(editingRow.date));
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    // If it's already a full date string, parse and format it consistently
    if (editingRow.date.includes('-')) {
      return editingRow.date;  // Already in YYYY-MM-DD format
    }
    
    // For any other format, parse and reformat
    const date = new Date(editingRow.date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

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
        Edit {category} Transaction
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
              value={editingRow?.description || ''}
              onChange={(e) => handleEditingChange('description', e.target.value)}
              variant="outlined"
              fullWidth
              placeholder="Transaction description"
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
              value={editingRow?.amount || ''}
              onChange={(e) => handleEditingChange('amount', e.target.value.replace(/[^0-9.]/g, ''))}
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
              Date
            </InputLabel>
            <TextField
              type="date"
              value={getCurrentDate()}
              onChange={handleDateChange}
              variant="outlined"
              fullWidth
              InputProps={{
                sx: {
                  bgcolor: 'background.paper',
                  '& input': {
                    color: isDark ? 'rgba(255, 255, 255, 0.87)' : 'inherit',
                    '&::-webkit-calendar-picker-indicator': {
                      filter: isDark ? 'invert(1)' : 'none'
                    }
                  }
                }
              }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'background.paper' }}>
        <Button 
          onClick={onDelete}
          variant="contained"
          color="error"
          sx={{ 
            bgcolor: 'rgba(211, 47, 47, 0.1)',
            color: 'error.main',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            height: 36,
            '&:hover': {
              bgcolor: 'rgba(211, 47, 47, 0.2)',
            }
          }}
        >
          Delete
        </Button>
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
          onClick={onSave} 
          variant="contained"
          sx={{ 
            fontWeight: 'bold',
            textTransform: 'uppercase',
            height: 36
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
} 