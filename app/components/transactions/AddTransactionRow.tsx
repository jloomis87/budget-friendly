import React from 'react';
import { 
  TableRow, TableCell, TextField, Box, IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem 
} from '@mui/material';
import { SaveIcon, CloseIcon } from '../../utils/materialIcons';
import type { AddTransactionRowProps } from './types';

export function AddTransactionRow({
  isDark,
  isAdding,
  newDescription,
  newAmount,
  newDate,
  setNewDescription,
  setNewAmount,
  setNewDate,
  handleAddTransaction,
  setIsAdding,
  generateDayOptions,
  getOrdinalSuffix
}: AddTransactionRowProps) {
  return (
    <TableRow sx={{
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
    }}>
      <TableCell></TableCell>
      <TableCell>
        <TextField
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Description"
          variant="standard"
          size="small"
          fullWidth
          sx={{
            '& input': {
              color: isDark ? '#fff' : 'inherit',
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newDescription && newAmount) {
              e.preventDefault();
              handleAddTransaction();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setIsAdding(false);
            }
          }}
        />
      </TableCell>
      <TableCell align="center">
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <FormControl variant="standard" sx={{ width: '80px', margin: '0 auto' }}>
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
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <TextField
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0.00"
            variant="standard"
            size="small"
            sx={{
              '& input': {
                color: isDark ? '#fff' : 'inherit',
                textAlign: 'right',
                width: `${Math.max(70, (newAmount?.length || 1) * 8 + 10)}px`,
                transition: 'width 0.1s'
              }
            }}
            InputProps={{
              startAdornment: <span style={{ 
                marginRight: 4,
                color: isDark ? '#fff' : 'inherit',
              }}>$</span>,
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newDescription && newAmount) {
                e.preventDefault();
                handleAddTransaction();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsAdding(false);
              }
            }}
          />
        </Box>
      </TableCell>
      <TableCell sx={{ 
        padding: '8px 4px',
        textAlign: 'center',
        borderLeft: isAdding ? `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` : 'none',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
          <Tooltip title="Save">
            <IconButton 
              size="small" 
              onClick={handleAddTransaction}
              sx={{ 
                color: '#4caf50',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(0, 0, 0, 0.15)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                padding: '4px',
                '&:hover': {
                  color: '#2e7d32',
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(76, 175, 80, 0.5)',
                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
                },
              }}
            >
              <SaveIcon 
                fontSize="small" 
                sx={{ 
                  fontSize: '1.2rem',
                  filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))'
                }}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cancel">
            <IconButton 
              size="small" 
              onClick={() => setIsAdding(false)}
              sx={{ 
                color: '#f44336',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(0, 0, 0, 0.15)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                padding: '4px',
                '&:hover': {
                  color: '#d32f2f',
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(244, 67, 54, 0.5)',
                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
                },
              }}
            >
              <CloseIcon 
                fontSize="small" 
                sx={{ 
                  fontSize: '1.2rem',
                  filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))'
                }}
              />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
} 