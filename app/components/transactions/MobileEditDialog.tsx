import React from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, 
  Box, IconButton, FormControl, InputLabel, Select, MenuItem
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
  getOrdinalSuffix
}: MobileEditDialogProps) {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle sx={{ pb: 1 }}>
        Edit {category} Transaction
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Description"
            value={editingRow?.description || ''}
            onChange={(e) => handleEditingChange('description', e.target.value)}
            variant="outlined"
            fullWidth
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
              value={editingRow?.date || '1'}
              onChange={(e) => handleEditingChange('date', e.target.value)}
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
            value={editingRow?.amount || ''}
            onChange={(e) => handleEditingChange('amount', e.target.value.replace(/[^0-9.]/g, ''))}
            variant="outlined"
            fullWidth
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
          onClick={onSave} 
          variant="contained"
          sx={{ borderRadius: 2, px: 3 }}
        >
          Save
        </Button>
        <Box sx={{ flex: 1 }} />
        <IconButton 
          onClick={onDelete}
          color="error"
          size="small"
        >
          <DeleteIcon />
        </IconButton>
      </DialogActions>
    </Dialog>
  );
} 