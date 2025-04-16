import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Paper,
  Popover,
  Tooltip
} from '@mui/material';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import CloseIcon from '@mui/icons-material/Close';
import { DeleteIcon } from '../../utils/materialIcons';
import type { EditingRow } from './types';
import { isColorDark } from '../../utils/colorUtils';
import { EmojiPicker } from '../../components/EmojiPicker';

interface MobileEditDialogProps {
  open: boolean;
  category: string;
  editingRow: EditingRow | null;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  handleEditingChange: (field: keyof EditingRow, value: string) => void;
  generateDayOptions: () => { value: string; label: string }[];
  getOrdinalSuffix: (day: number) => string;
  tableColor: string;
  isDark: boolean;
}

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
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState<null | HTMLElement>(null);

  // Open emoji picker
  const handleOpenEmojiPicker = (event: React.MouseEvent<HTMLElement>) => {
    setEmojiPickerAnchor(event.currentTarget);
  };

  // Close emoji picker
  const handleCloseEmojiPicker = () => {
    setEmojiPickerAnchor(null);
  };

  // Select emoji
  const handleSelectEmoji = (emoji: string) => {
    if (editingRow) {
      handleEditingChange('icon', emoji);
    }
    handleCloseEmojiPicker();
  };

  // Remove icon
  const handleRemoveIcon = () => {
    if (editingRow) {
      handleEditingChange('icon', '');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'background.paper',
          color: isDark ? '#fff' : 'inherit',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: tableColor,
        color: isColorDark(tableColor) ? '#fff' : 'rgba(0, 0, 0, 0.87)',
        fontWeight: 'bold',
        pb: 3
      }}>
        Edit {category}
      </DialogTitle>
      <DialogContent sx={{ pt: 6, mt: 2 }}>
        {editingRow && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Button
                variant="outlined"
                onClick={handleOpenEmojiPicker}
                startIcon={editingRow.icon ? (
                  <Box component="span" sx={{ fontSize: '1.2rem' }}>{editingRow.icon}</Box>
                ) : (
                  <EmojiEmotionsIcon />
                )}
                sx={{
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                  color: isDark ? '#fff' : 'inherit',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                  }
                }}
              >
                {editingRow.icon ? 'Change Icon' : 'Add Icon'}
              </Button>
              
              {editingRow.icon && (
                <IconButton 
                  size="small" 
                  onClick={handleRemoveIcon}
                  sx={{ 
                    color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                    '&:hover': {
                      color: isDark ? '#fff' : '#000',
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
                    }
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            <TextField
              label={`${category} Description`}
              value={editingRow.description}
              onChange={(e) => handleEditingChange('description', e.target.value)}
              fullWidth
              variant="outlined"
              InputLabelProps={{
                sx: {
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                }
              }}
              InputProps={{
                sx: {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : undefined,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : undefined,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : undefined,
                  }
                }
              }}
            />
            
            <TextField
              label="Amount"
              value={editingRow.amount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d.]/g, '');
                handleEditingChange('amount', value);
              }}
              fullWidth
              variant="outlined"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                sx: {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : undefined,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : undefined,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : undefined,
                  }
                }
              }}
              InputLabelProps={{
                sx: {
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                }
              }}
            />
            
            <TextField
              label="Date"
              type="date"
              value={editingRow.date}
              onChange={(e) => handleEditingChange('date', e.target.value)}
              fullWidth
              variant="outlined"
              InputLabelProps={{
                shrink: true,
                sx: {
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined
                }
              }}
              InputProps={{
                sx: {
                  color: isDark ? '#fff' : undefined,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : undefined,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : undefined,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : undefined,
                  }
                }
              }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          onClick={onDelete}
          color="error"
          sx={{ 
            bgcolor: 'rgba(211, 47, 47, 0.1)',
            color: 'error.main',
            '&:hover': {
              bgcolor: 'rgba(211, 47, 47, 0.2)',
            }
          }}
        >
          <DeleteIcon sx={{ mr: 0.5 }} fontSize="small" /> Delete
        </Button>
        <Box>
          <Button 
            onClick={onClose} 
            sx={{ 
              mr: 1,
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)',
              '&:hover': {
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={onSave} 
            variant="contained"
            sx={{ 
              bgcolor: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.dark',
              }
            }}
          >
            Save
          </Button>
        </Box>
      </DialogActions>

      {/* Emoji Picker Component */}
      <EmojiPicker
        anchorEl={emojiPickerAnchor}
        onClose={handleCloseEmojiPicker}
        onSelect={handleSelectEmoji}
        isDark={isDark}
      />
    </Dialog>
  );
} 