import React from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, 
  Box, IconButton, FormControl, InputLabel, Select, MenuItem, Paper
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
            InputProps={{
              notched: false,
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
              value={editingRow?.date || '1'}
              onChange={(e) => handleEditingChange('date', e.target.value)}
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
            value={editingRow?.amount || ''}
            onChange={(e) => handleEditingChange('amount', e.target.value.replace(/[^0-9.]/g, ''))}
            variant="outlined"
            fullWidth
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
          sx={{
            backgroundColor: 'white',
          }}
        >
          <DeleteIcon />
        </IconButton>
      </DialogActions>
    </Dialog>
  );
} 