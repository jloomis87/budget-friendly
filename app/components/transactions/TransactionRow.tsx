import React from 'react';
import { 
  TableRow, TableCell, TextField, FormControl, Select, MenuItem, Box, IconButton, Tooltip, Typography
} from '@mui/material';
import { 
  EditOutlinedIcon, SaveIcon, CloseIcon, DragIndicatorIcon, DeleteIcon 
} from '../../utils/materialIcons';
import type { TransactionRowProps } from './types';
import type { EditingRow } from './types';

export function TransactionRow({
  transaction,
  isEditing,
  editingRow,
  isDark,
  globalIndex,
  onEditingChange,
  onSaveEdit,
  onCancelEdit,
  onDeleteClick,
  onDragStart,
  generateDayOptions,
  getOrdinalSuffix,
  formatDateForDisplay,
  onClick
}: TransactionRowProps) {
  return (
    <TableRow 
      sx={{
        cursor: isEditing ? 'default' : 'pointer',
        backgroundColor: isEditing 
          ? 'rgba(0, 0, 0, 0.04)' 
          : (isDark 
            ? 'rgba(255, 255, 255, 0.08)' 
            : 'inherit'),
        '&:hover': {
          backgroundColor: isEditing 
            ? 'rgba(0, 0, 0, 0.04)' 
            : (isDark 
              ? 'rgba(255, 255, 255, 0.16)' 
              : 'rgba(0, 0, 0, 0.08)'),
        },
        color: isDark ? '#fff' : 'inherit',
      }}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, transaction, globalIndex)}
      onClick={onClick}
    >
      <TableCell sx={{ 
        padding: '8px 4px 8px 8px',
      }}>
        {isEditing ? (
          null // Empty cell when editing, delete moved to Actions column
        ) : (
          <DragIndicatorIcon 
            fontSize="small" 
            sx={{ 
              color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'action.disabled',
              cursor: 'grab',
            }} 
          />
        )}
      </TableCell>
      <TableCell sx={{ 
        fontWeight: 500,
        fontSize: '0.95rem',
      }}>
        {isEditing ? (
          <TextField
            value={editingRow?.description || ''}
            onChange={(e) => onEditingChange('description', e.target.value)}
            variant="standard"
            size="small"
            fullWidth
            sx={{
              '& input': {
                color: isDark ? '#fff' : 'inherit'
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSaveEdit(transaction);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onCancelEdit();
              }
            }}
          />
        ) : (
          <Typography sx={{ color: isDark ? '#fff' : 'inherit' }}>
            {transaction.description}
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ 
        fontWeight: 500,
        fontSize: '0.95rem',
        padding: '8px 8px',
        textAlign: 'center',
      }}>
        {isEditing ? (
          <FormControl variant="standard" sx={{ width: '80px', margin: '0 auto' }}>
            <Select
              value={editingRow?.date || '1'}
              onChange={(e) => onEditingChange('date', e.target.value)}
              sx={{
                textAlign: 'center',
                color: isDark ? '#fff' : 'inherit',
              }}
            >
              {generateDayOptions().map(day => (
                <MenuItem key={day} value={day.toString()}>
                  {getOrdinalSuffix(day)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Typography sx={{ color: isDark ? '#fff' : 'inherit', textAlign: 'center' }}>
            {formatDateForDisplay(transaction.date)}
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ 
        fontWeight: 500,
        fontSize: '0.95rem',
        padding: '8px 8px',
        textAlign: 'right',
      }}>
        {isEditing ? (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <TextField
              value={editingRow?.amount || ''}
              onChange={(e) => onEditingChange('amount', e.target.value.replace(/[^0-9.]/g, ''))}
              variant="standard"
              size="small"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSaveEdit(transaction);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancelEdit();
                }
              }}
              InputProps={{
                startAdornment: <span style={{ 
                  marginRight: 4,
                  color: isDark ? '#fff' : 'inherit',
                }}>$</span>,
                sx: {
                  color: isDark ? '#fff' : 'inherit',
                  fontSize: '0.95rem',
                  textAlign: 'right',
                  '& input': {
                    textAlign: 'right',
                    width: `${Math.max(70, (editingRow?.amount?.length || 1) * 8 + 10)}px`,
                    transition: 'width 0.1s'
                  }
                }
              }}
            />
          </Box>
        ) : (
          <Typography
            sx={{
              color: isDark ? '#fff' : 'inherit',
              fontWeight: 500,
              fontSize: '0.95rem',
              textAlign: 'right',
            }}
          >
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(transaction.amount)}
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ 
        padding: '8px 4px',
        textAlign: 'center',
        borderLeft: isEditing ? `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` : 'none',
      }}>
        {isEditing && (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            <Tooltip title="Save">
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveEdit(transaction);
                }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelEdit();
                }}
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
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClick(e, transaction, globalIndex);
                }}
                sx={{
                  color: 'rgba(0, 0, 0, 0.6)',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(0, 0, 0, 0.15)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                  padding: '4px',
                  '&:hover': {
                    color: '#f44336',
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(244, 67, 54, 0.5)',
                    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
                  },
                }}
              >
                <DeleteIcon 
                  fontSize="small" 
                  sx={{ 
                    fontSize: '1.2rem',
                    filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))'
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </TableCell>
    </TableRow>
  );
} 