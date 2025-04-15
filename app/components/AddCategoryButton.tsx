import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { HexColorPicker } from 'react-colorful';
import { useCategories } from '../contexts/CategoryContext';

const emojiOptions = [
  '📊', '💰', '🏠', '🛍️', '🍔', '✈️', '🚗', '🏥', '📚', '🎮', '🎬', '🎵', '👕', '💼', '💻', '📱', '🧾', '🧹'
];

export const AddCategoryButton: React.FC = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#2196f3');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📊');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addCategory } = useCategories();

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    try {
      await addCategory({
        name: newCategoryName.trim(),
        color: newCategoryColor,
        icon: newCategoryIcon,
        isDefault: false,
      });
      setOpenDialog(false);
      resetForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add category');
    }
  };

  const resetForm = () => {
    setNewCategoryName('');
    setNewCategoryColor('#2196f3');
    setNewCategoryIcon('📊');
    setError(null);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
    resetForm();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          sx={{
            py: 2,
            px: 4,
            borderRadius: 2,
            borderStyle: 'dashed',
            borderWidth: 2,
            fontSize: '1rem',
            textTransform: 'none',
            '&:hover': {
              borderStyle: 'dashed',
              borderWidth: 2,
            }
          }}
        >
          Add New Category
        </Button>
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            sx={{ mb: 3 }}
          />
          
          <Typography variant="subtitle1" gutterBottom>
            Category Color
          </Typography>
          
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              mb: 3 
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: newCategoryColor,
                border: '1px solid #ccc',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => setShowColorPicker(!showColorPicker)}
            />
            <Typography 
              variant="body2" 
              sx={{ ml: 2, fontFamily: 'monospace' }}
            >
              {newCategoryColor}
            </Typography>
          </Box>
          
          {showColorPicker && (
            <Box sx={{ mb: 3 }}>
              <HexColorPicker 
                color={newCategoryColor} 
                onChange={setNewCategoryColor} 
                style={{ width: '100%', marginBottom: '16px' }}
              />
            </Box>
          )}
          
          <Typography variant="subtitle1" gutterBottom>
            Category Icon
          </Typography>
          
          <Box 
            sx={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: 1,
              mb: 2
            }}
          >
            {emojiOptions.map((emoji) => (
              <Paper
                key={emoji}
                elevation={newCategoryIcon === emoji ? 3 : 1}
                sx={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 1,
                  bgcolor: newCategoryIcon === emoji ? `${newCategoryColor}30` : 'background.paper',
                  border: newCategoryIcon === emoji ? `2px solid ${newCategoryColor}` : '1px solid #eee',
                  fontSize: '1.25rem',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.1)',
                  }
                }}
                onClick={() => setNewCategoryIcon(emoji)}
              >
                {emoji}
              </Paper>
            ))}
          </Box>
          
          <Typography variant="caption" color="text.secondary">
            Selected icon: {newCategoryIcon}
          </Typography>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleAddCategory} variant="contained" color="primary">
            Add Category
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}; 