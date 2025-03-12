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
        style: {
          backgroundColor: tableColor,
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        color: isDark ? '#fff' : 'inherit'
      }}>
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
            InputProps={{
              notched: false,
            }}
            InputLabelProps={{
              shrink: true,
              sx: {
                position: 'relative',
                transform: 'none',
                marginBottom: '8px', 
                color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                fontWeight: 500,
                fontSize: '0.9rem',
                '&.Mui-focused': {
                  color: isDark ? '#fff' : 'primary.main',
                }
              }
            }}
            sx={{ 
              "& .MuiOutlinedInput-root": { 
                backgroundColor: 'white',
                borderRadius: '4px',
                overflow: 'hidden',
                "&.Mui-focused": {
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: 'primary.main',
                    borderWidth: 2,
                  }
                }
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: 'rgba(0, 0, 0, 0.23)'
              },
              "& .MuiFormLabel-root": {
                position: 'relative',
                transform: 'none',
                marginBottom: '8px',
              },
              "& .MuiInputLabel-animated": {
                transition: 'none',
              },
              "& .MuiFormLabel-filled + .MuiInputBase-root": {
                marginTop: '0',
              },
              "& .MuiFormHelperText-root": {
                marginTop: 1,
                color: 'rgba(0, 0, 0, 0.6)',
              }
            }}
          />
          
          <FormControl fullWidth variant="outlined" sx={{ 
            "& .MuiOutlinedInput-root": { 
              backgroundColor: 'white',
              borderRadius: '4px',
              overflow: 'hidden',
              "&.Mui-focused": {
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: 'primary.main',
                  borderWidth: 2,
                }
              }
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: 'rgba(0, 0, 0, 0.23)'
            },
            maxWidth: '150px'
          }}>
            <InputLabel 
              sx={{
                position: 'relative',
                transform: 'none',
                marginBottom: '8px', 
                color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                fontWeight: 500,
                fontSize: '0.9rem',
                '&.Mui-focused': {
                  color: isDark ? '#fff' : 'primary.main',
                }
              }}
            >
              Due Day
            </InputLabel>
            <Select
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              label="Due Day"
              notched={false}
              sx={{
                mt: 1
              }}
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
              startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>,
              notched: false,
            }}
            InputLabelProps={{
              shrink: true,
              sx: {
                position: 'relative',
                transform: 'none',
                marginBottom: '8px', 
                color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
                fontWeight: 500,
                fontSize: '0.9rem',
                '&.Mui-focused': {
                  color: isDark ? '#fff' : 'primary.main',
                }
              }
            }}
            sx={{ 
              "& .MuiOutlinedInput-root": { 
                backgroundColor: 'white',
                borderRadius: '4px',
                overflow: 'hidden',
                "&.Mui-focused": {
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: 'primary.main',
                    borderWidth: 2,
                  }
                }
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: 'rgba(0, 0, 0, 0.23)'
              },
              "& .MuiFormLabel-root": {
                position: 'relative',
                transform: 'none',
                marginBottom: '8px',
              },
              "& .MuiInputLabel-animated": {
                transition: 'none',
              },
              "& .MuiFormLabel-filled + .MuiInputBase-root": {
                marginTop: '0',
              },
              "& .MuiFormHelperText-root": {
                marginTop: 1,
                color: 'rgba(0, 0, 0, 0.6)',
              }
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          sx={{ 
            borderRadius: 2, 
            px: 3,
            color: isDark ? '#fff' : undefined,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : undefined,
          }}
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