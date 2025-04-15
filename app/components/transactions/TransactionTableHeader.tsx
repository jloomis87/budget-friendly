import React, { useState } from 'react';
import { Box, Typography, IconButton, TextField, Tooltip, Paper, Popover, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import { CategoryColorPicker } from '../CategoryColorPicker';
import { TransactionSort } from './TransactionSort';
import type { TransactionTableHeaderProps } from './types';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import { useCategories } from '../../contexts/CategoryContext';

// Common emoji options for categories
const emojiOptions = [
  '📊', '💰', '🏠', '🛍️', '🍔', '✈️', '🚗', '🏥', '📚', '🎮', '🎬', '🎵', '👕', '💼', 
  '💻', '📱', '🧾', '🧹', '🎓', '🏋️', '🎭', '🚌', '🌍', '🎁', '🏦', '🥗', '👶', '🐶', 
  '🎪', '⚽', '🎨', '📷', '💄', '🔧', '📞', '🛒', '🍕', '☕', '🍹', '🥦'
];

export const TransactionTableHeader: React.FC<TransactionTableHeaderProps> = ({
  category,
  totalAmount,
  hasCustomColor,
  hasCustomDarkColor,
  isDark,
  tableColors,
  sortOption,
  onSortChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(category);
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { updateCategory, getCategoryByName, categories, deleteCategory } = useCategories();
  
  // Find the category to get its icon and check if it's a default category
  const categoryData = categories.find(c => c.name === category);
  const [selectedIcon, setSelectedIcon] = useState(categoryData?.icon || '📊');
  const isDefaultCategory = categoryData?.isDefault || false;

  const handleEditClick = () => {
    setEditedName(category);
    setIsEditing(true);
    // Ensure we have the latest icon when editing starts
    if (categoryData?.icon) {
      setSelectedIcon(categoryData.icon);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEmojiPickerAnchor(null);
  };

  const handleSaveEdit = async () => {
    if (editedName.trim() === '') {
      return; // Don't save empty names
    }

    const foundCategory = getCategoryByName(category);
    if (foundCategory) {
      try {
        // Create update object and only include properties that have changed
        const updates: Record<string, string> = {};
        
        if (editedName !== category) {
          updates.name = editedName.trim();
        }
        
        if (selectedIcon !== foundCategory.icon) {
          updates.icon = selectedIcon;
        }
        
        // Only update if we have changes to make
        if (Object.keys(updates).length > 0) {
          await updateCategory(foundCategory.id, updates);
        }
        
        setIsEditing(false);
        setEmojiPickerAnchor(null);
      } catch (error) {
        console.error('Error updating category:', error);
        // Could add error handling UI here
      }
    } else {
      setIsEditing(false);
      setEmojiPickerAnchor(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleOpenEmojiPicker = (event: React.MouseEvent<HTMLElement>) => {
    setEmojiPickerAnchor(event.currentTarget);
  };

  const handleCloseEmojiPicker = () => {
    setEmojiPickerAnchor(null);
  };

  const handleSelectEmoji = (emoji: string) => {
    setSelectedIcon(emoji);
    setEmojiPickerAnchor(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (categoryData && !categoryData.isDefault) {
      try {
        await deleteCategory(categoryData.id);
        // The component will unmount as part of the parent re-render
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
    setDeleteDialogOpen(false);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  // Don't allow editing the default Income category
  const isIncome = category === 'Income';

  return (
    <Box sx={{ 
      p: 2, 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid',
      borderColor: 'rgba(0, 0, 0, 0.1)'
    }}>
      {isEditing ? (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mr: 1, 
            cursor: 'pointer',
            bgcolor: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            p: 0.7,
            borderRadius: 1,
            '&:hover': {
              bgcolor: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
            }
          }} 
            onClick={handleOpenEmojiPicker}
          >
            <Box sx={{ fontSize: '1.2rem', mr: 0.5 }}>
              {selectedIcon}
            </Box>
            <EmojiEmotionsIcon fontSize="small" sx={{ 
              color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.5)',
            }} />
          </Box>
          <TextField
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            size="small"
            sx={{ 
              width: '200px',
              input: { 
                fontWeight: 'bold',
                color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.87)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.87)' : (isDark ? '#fff' : 'inherit')),
              }
            }}
          />
          <Tooltip title="Save">
            <IconButton 
              onClick={handleSaveEdit} 
              size="small" 
              color="primary"
              sx={{ ml: 1 }}
            >
              <CheckIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cancel">
            <IconButton 
              onClick={handleCancelEdit} 
              size="small"
              sx={{ ml: 0.5 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ fontSize: '1.3rem', mr: 1.5, display: 'flex', alignItems: 'center' }}>
            {categoryData?.icon || '📊'}
          </Box>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 'bold',
              color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.87)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.87)' : (isDark ? '#fff' : 'inherit')),
              fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              letterSpacing: '0.01em',
            }}
          >
            {category}
          </Typography>
          {!isIncome && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="Edit category name and icon">
                <IconButton 
                  onClick={handleEditClick} 
                  size="small"
                  sx={{ 
                    ml: 1,
                    color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.6)' : (isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'),
                    '&:hover': {
                      color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.9)' : (isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'),
                    }
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              {!isDefaultCategory && (
                <Tooltip title="Delete category">
                  <IconButton 
                    onClick={handleDeleteClick} 
                    size="small"
                    sx={{ 
                      ml: 0.5,
                      color: hasCustomDarkColor ? 'rgba(255, 80, 80, 0.7)' : 'rgba(211, 47, 47, 0.7)',
                      '&:hover': {
                        color: hasCustomDarkColor ? 'rgba(255, 80, 80, 0.9)' : 'rgba(211, 47, 47, 0.9)',
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography 
          component="span" 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 500, 
            color: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.7)' : (category === 'Income' ? 'rgba(0, 0, 0, 0.7)' : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)')),
            fontSize: '0.9rem'
          }}
        >
          (Total: ${Math.abs(totalAmount).toFixed(2)})
        </Typography>
        <TransactionSort
          sortOption={sortOption}
          onSortChange={onSortChange}
          hasCustomDarkColor={hasCustomDarkColor}
          isDark={isDark}
          category={category}
        />
        <CategoryColorPicker category={category} />
      </Box>

      {/* Emoji Picker Popover */}
      <Popover
        open={Boolean(emojiPickerAnchor)}
        anchorEl={emojiPickerAnchor}
        onClose={handleCloseEmojiPicker}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2, width: 300, maxHeight: 400, overflow: 'auto' }}>
          <Typography variant="subtitle2" gutterBottom>
            Select an icon for {editedName || category}
          </Typography>
          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: 1,
              mt: 1
            }}
          >
            {emojiOptions.map((emoji) => (
              <Paper
                key={emoji}
                elevation={selectedIcon === emoji ? 3 : 1}
                sx={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 1,
                  fontSize: '1.2rem',
                  bgcolor: selectedIcon === emoji ? `rgba(33, 150, 243, 0.1)` : 'background.paper',
                  border: selectedIcon === emoji ? `2px solid #2196f3` : '1px solid #eee',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                  }
                }}
                onClick={() => handleSelectEmoji(emoji)}
              >
                {emoji}
              </Paper>
            ))}
          </Box>
        </Box>
      </Popover>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-category-dialog-title"
      >
        <DialogTitle id="delete-category-dialog-title">
          Delete {category} Category?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the "{category}" category? This will permanently remove this category
            and may affect transactions associated with it. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            sx={{ 
              bgcolor: 'error.main',
              '&:hover': {
                bgcolor: 'error.dark',
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 