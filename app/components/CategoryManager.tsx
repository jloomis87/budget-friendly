import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Card,
  CardContent,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { HexColorPicker } from 'react-colorful';
import { useCategories } from '../contexts/CategoryContext';
import type { Category } from '../contexts/CategoryContext';

const CategoryManager: React.FC = () => {
  const { 
    categories, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    isLoading, 
    error 
  } = useCategories();

  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#1976d2');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📊');
  const [newCategoryPercentage, setNewCategoryPercentage] = useState(0);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Validate category percentages
  const validatePercentages = useCallback(() => {
    // Skip validation if editing an income category
    if (editingCategory?.isIncome) return true;

    // Get all non-income categories
    const nonIncomeCategories = categories.filter(cat => !cat.isIncome);
    
    // Calculate the total of all other categories except the one being edited
    let totalPercentage = 0;
    if (editingCategory) {
      // If editing, exclude the current category from the calculation
      nonIncomeCategories.forEach(cat => {
        if (cat.id !== editingCategory.id && cat.percentage !== undefined) {
          totalPercentage += cat.percentage;
        }
      });
      // Add the new percentage being set
      totalPercentage += newCategoryPercentage;
    } else {
      // If adding a new category, include all existing categories
      nonIncomeCategories.forEach(cat => {
        if (cat.percentage !== undefined) {
          totalPercentage += cat.percentage;
        }
      });
      // Add the new category percentage
      totalPercentage += newCategoryPercentage;
    }

    // Check if the total exceeds 100%
    if (totalPercentage > 100) {
      setNotification({ 
        message: 'Total category allocations cannot exceed 100%', 
        type: 'error' 
      });
      return false;
    }

    return true;
  }, [categories, editingCategory, newCategoryPercentage]);

  // Handle adding a new category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setNotification({ message: 'Category name cannot be empty', type: 'error' });
      return;
    }

    // Validate percentages if not an income category
    if (!validatePercentages()) {
      return;
    }

    try {
      await addCategory({
        name: newCategoryName.trim(),
        color: newCategoryColor,
        icon: newCategoryIcon,
        isDefault: false,
        percentage: newCategoryPercentage,
      });
      setNotification({ message: 'Category added successfully', type: 'success' });
      handleCloseDialog();
    } catch (error) {
      setNotification({ 
        message: error instanceof Error ? error.message : 'Failed to add category', 
        type: 'error' 
      });
    }
  };

  // Handle updating a category
  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    if (!newCategoryName.trim()) {
      setNotification({ message: 'Category name cannot be empty', type: 'error' });
      return;
    }

    // Validate percentages if not an income category
    if (!editingCategory.isIncome && !validatePercentages()) {
      return;
    }

    try {
      await updateCategory(editingCategory.id, {
        name: newCategoryName.trim(),
        color: newCategoryColor,
        icon: newCategoryIcon,
        percentage: newCategoryPercentage,
      });
      setNotification({ message: 'Category updated successfully', type: 'success' });
      handleCloseDialog();
    } catch (error) {
      setNotification({ 
        message: error instanceof Error ? error.message : 'Failed to update category', 
        type: 'error' 
      });
    }
  };

  // Handle deleting a category
  const handleDeleteCategory = async (category: Category) => {
    if (category.isDefault) {
      setNotification({ message: 'Cannot delete default categories', type: 'error' });
      return;
    }

    try {
      await deleteCategory(category.id);
      setNotification({ message: 'Category deleted successfully', type: 'success' });
    } catch (error) {
      setNotification({ 
        message: error instanceof Error ? error.message : 'Failed to delete category', 
        type: 'error' 
      });
    }
  };

  // Open dialog for adding a new category
  const handleOpenNewCategoryDialog = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryColor('#1976d2');
    setNewCategoryIcon('📊');
    setNewCategoryPercentage(0);
    setOpenDialog(true);
  };

  // Open dialog for editing a category
  const handleOpenEditDialog = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryColor(category.color);
    setNewCategoryIcon(category.icon);
    setNewCategoryPercentage(category.percentage || 0);
    setOpenDialog(true);
  };

  // Close the dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
    setShowColorPicker(false);
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification(null);
  };

  // Toggle color picker
  const handleToggleColorPicker = () => {
    setShowColorPicker(!showColorPicker);
  };

  // Get list of common emojis for categories
  const commonEmojis = [
    '📊', '💰', '🏠', '🛍️', '🍔', '✈️', '🚗', '🏥', '📚', '🎮', '🎬', '🎵', '👕', '💼', '💻', '📱', '🧾', '🧹'
  ];

  return (
    <Box sx={{ mb: 4, mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Manage Categories</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleOpenNewCategoryDialog}
          disabled={isLoading}
        >
          Add Category
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <List>
          {categories.map((category) => (
            <Card key={category.id} sx={{ mb: 2, position: 'relative' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: category.color,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {category.icon}
                  </Box>
                  <Typography variant="h6">
                    {category.name} {category.isDefault && <Typography component="span" variant="caption">(Default)</Typography>}
                  </Typography>
                  {category.percentage !== undefined && !category.isIncome && (
                    <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                      {category.percentage}% of budget
                    </Typography>
                  )}
                  <Box sx={{ ml: 'auto' }}>
                    <Tooltip title="Edit Category">
                      <IconButton onClick={() => handleOpenEditDialog(category)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    {!category.isDefault && (
                      <Tooltip title="Delete Category">
                        <IconButton onClick={() => handleDeleteCategory(category)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </List>
      )}

      {/* Add/Edit Category Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? `Edit ${editingCategory.name}` : 'Add New Category'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }}>
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
                  mr: 2,
                  cursor: 'pointer',
                  border: '2px solid #ccc',
                }}
                onClick={handleToggleColorPicker}
              />
              <TextField 
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                size="small"
                sx={{ width: 150 }}
              />
            </Box>

            {showColorPicker && (
              <Box sx={{ mb: 3 }}>
                <HexColorPicker 
                  color={newCategoryColor} 
                  onChange={setNewCategoryColor} 
                  style={{ width: '100%' }}
                />
              </Box>
            )}

            <Typography variant="subtitle1" gutterBottom>
              Category Icon
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {commonEmojis.map((emoji) => (
                <Box
                  key={emoji}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: emoji === newCategoryIcon ? '2px solid #1976d2' : '1px solid #ccc',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.05)',
                    },
                  }}
                  onClick={() => setNewCategoryIcon(emoji)}
                >
                  {emoji}
                </Box>
              ))}
            </Box>
            
            <TextField
              margin="dense"
              label="Custom Icon (emoji)"
              value={newCategoryIcon}
              onChange={(e) => setNewCategoryIcon(e.target.value)}
              size="small"
              sx={{ mb: 3 }}
            />
            
            {/* Only show percentage field for non-income categories */}
            {(!editingCategory || !editingCategory.isIncome) && (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  Budget Allocation Percentage
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ width: '100%', mr: 2 }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newCategoryPercentage}
                      onChange={(e) => setNewCategoryPercentage(Number(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </Box>
                  <TextField
                    value={newCategoryPercentage}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 100) {
                        setNewCategoryPercentage(value);
                      }
                    }}
                    type="number"
                    size="small"
                    InputProps={{
                      inputProps: { min: 0, max: 100 },
                      endAdornment: <Typography variant="body2">%</Typography>
                    }}
                    sx={{ width: 100 }}
                  />
                </Box>
                
                {/* Total allocation indicator */}
                {(() => {
                  // Calculate total allocation
                  let totalAllocation = 0;
                  const nonIncomeCategories = categories.filter(cat => !cat.isIncome);
                  
                  if (editingCategory) {
                    // If editing, exclude current category
                    nonIncomeCategories.forEach(cat => {
                      if (cat.id !== editingCategory.id && cat.percentage !== undefined) {
                        totalAllocation += cat.percentage;
                      }
                    });
                    totalAllocation += newCategoryPercentage;
                  } else {
                    // If adding new, include all existing
                    nonIncomeCategories.forEach(cat => {
                      if (cat.percentage !== undefined) {
                        totalAllocation += cat.percentage;
                      }
                    });
                    totalAllocation += newCategoryPercentage;
                  }
                  
                  // Determine status color
                  let statusColor = 'success.main';
                  if (totalAllocation > 100) {
                    statusColor = 'error.main';
                  } else if (totalAllocation < 100) {
                    statusColor = 'warning.main';
                  }
                  
                  return (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Total allocation:
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color={statusColor}>
                        {totalAllocation}% {totalAllocation === 100 ? '✓' : ''}
                        {totalAllocation > 100 ? ' (Exceeds 100%)' : ''}
                        {totalAllocation < 100 ? ` (${100 - totalAllocation}% unallocated)` : ''}
                      </Typography>
                    </Box>
                  );
                })()}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? (
              <CircularProgress size={24} />
            ) : (
              editingCategory ? 'Update' : 'Add'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar 
        open={!!notification} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notification && (
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.type}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
};

export default CategoryManager; 