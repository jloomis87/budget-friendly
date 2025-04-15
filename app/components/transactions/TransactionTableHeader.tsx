import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton, TextField, Tooltip, Paper, Popover, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Slider } from '@mui/material';
import { CategoryColorPicker } from '../CategoryColorPicker';
import { TransactionSort } from './TransactionSort';
import type { TransactionTableHeaderProps } from './types';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import PercentIcon from '@mui/icons-material/Percent';
import { useCategories } from '../../contexts/CategoryContext';

// Common emoji options for categories
const emojiOptions = [
  // Finance and Money
  '💰', '💵', '💸', '💳', '🏦', '💹', '📈', '📉', '💎', '👛', '💼', '🧾', '💲', '💱', '🪙',
  '📊', '🧮', '💴', '💶', '💷', '🏧', '💡', '📋', '📇', '📬', '📭', '📄', '✉️', '📨', '📩',
  '💌', '💻', '📱', '⌚', '🖥️', '📟', '📠', '🏷️', '🔖', '📑', '☑️', '✅', '✓', '⭐', '🌟',
  // Shopping and Retail
  '🛒', '🛍️', '👕', '👗', '👟', '👠', '👜', '🧥', '🕶️', '👑', '💄', '⌚', '💍', '🎒',
  '👔', '👖', '🧣', '🧤', '👒', '🎩', '🧢', '👞', '🥾', '🥿', '👢', '👚', '👘', '👙', '👝',
  '🦺', '💼', '👓', '🥽', '🧦', '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🪀', '🎮', '🎲',
  '🎯', '🎺', '🎸', '🪕', '🎻', '🥁', '🎹', '🪗', '🎨', '📱', '🧸', '📻', '🔌', '🧴', '🧼',
  // Food and Dining
  '🍕', '🍔', '🍟', '🌮', '🌯', '🥗', '🍣', '🍱', '🍜', '🍲', '🍛', '🍝', '🥪', '🥙', '🥩',
  '🍖', '🍗', '🥓', '🧀', '🥚', '🍞', '🥐', '🥨', '🥯', '🥞', '🧇', '🍳', '🥘', '🍿', '🧂',
  '☕', '🍵', '🧋', '🥤', '🧃', '🥛', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥡',
  // Home and Living
  '🏠', '🏡', '🧹', '🧼', '🧺', '🛁', '🚿', '🪠', '🧯', '🛋️', '🪑', '🛏️', '🚪', '🪟', '🪴',
  '🪞', '🧸', '🔧', '🪛', '🪚', '🧰', '💡', '🔌', '🧲', '🧻', '🪥', '🧴',
  // Transportation
  '🚗', '🚙', '🚕', '🛻', '🏎️', '🚌', '🚎', '🚓', '🚑', '🚒', '🚐', '🛺', '🚲', '🛵', '🏍️',
  '✈️', '🚁', '🚀', '🚂', '🚆', '🚇', '🚊', '🚉', '🚤', '⛴️', '🚢', '🚞', '🚋', '🚝', '🚈',
  // Entertainment and Leisure
  '🎬', '🎮', '🎯', '🎲', '🎨', '🎭', '🎪', '🎟️', '🎫', '🎼', '🎵', '🎸', '🎹', '🎺', '🎻',
  '🎷', '🎧', '📺', '📱', '📷', '🎥', '💻', '🎁', '🎊', '🎉', '🏟️', '🏀', '⚽', '🏈', '⚾',
  '🎾', '🎱', '🏉', '🏐', '🏓', '🎣', '🎳', '🥌', '⛸️', '🛷', '🎿',
  // Health and Medical
  '💊', '💉', '🩹', '🩺', '🔬', '🧪', '🦷', '🧠', '👓', '🧬', '🏥', '⚕️', '🩸', '🩻', '🫀',
  // Education
  '📚', '📝', '📎', '✏️', '✒️', '🖋️', '🖊️', '🖌️', '🖍️', '📏', '📐', '📓', '📔', '📒', '📕',
  '📗', '📘', '📙', '🎓', '🔍', '🔎', '📄', '📑', '📊', '📋', '📌', '📍', '🧮', '📆', '📅',
  // Technology
  '💻', '⌨️', '🖥️', '🖱️', '💿', '💾', '📀', '🧮', '🔋', '🔌', '📱', '📲', '☎️', '📞', '📟',
  '📠', '⏱️', '⏲️', '⏰', '🕰️', '📡', '🔦', '🪫', '💡', '🔍', '🔎', '📡',
  // Utilities and Services
  '📦', '📫', '📪', '📬', '📭', '📮', '🗒️', '🗓️', '🔖', '🏷️', '📧', '📨', '📩', '📤', '📥',
  '📁', '📂', '🗂️', '📰', '🗞️', '📑', '🔒', '🔓', '🔏', '🔐', '🔑', '🗝️', '🔨', '🪓', '⛏️',
  // Travel and Places
  '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🌅', '🌄', '🌠', '🏙️', '🌆', '🌇',
  '🌉', '🏘️', '🏰', '🏯', '🏛️', '⛪', '🕌', '🕍', '⛩️', '🕋', '🛕', '🏛️', '🛬', '🛫', '🚏',
  // Nature and Weather
  '🌲', '🌳', '🌴', '🌵', '🌱', '🌿', '☘️', '🍀', '🍃', '🍂', '🌾', '🌷', '🌹', '🌺', '🌸',
  '🌼', '🌻', '🌞', '🌝', '🌚', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌙', '🌛',
  '🌜', '⭐', '🌟', '💫', '✨', '☄️', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️',
  // People and Activities
  '👪', '👶', '👧', '👦', '👩', '👨', '👩‍🍼', '👨‍🍼', '👩‍🎓', '👨‍🎓', '👩‍⚕️', '👨‍⚕️', '👩‍🔧', '👨‍🔧',
  '👩‍🚒', '👨‍🚒', '👩‍🏫', '👨‍🏫', '👩‍💻', '👨‍💻', '👩‍🚀', '👨‍🚀', '👩‍⚖️', '👨‍⚖️', '👰', '🤵',
  '🧑‍🤝‍🧑', '🧗', '🏊', '🚴', '🧘', '🏋️', '🏄', '🏌️', '🧖', '🤾',
  // Animals and Pets
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐮', '🐷', '🐸', '🐵',
  '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐟', '🐠',
  // Miscellaneous / Special categories
  '❤️', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💌', '💯', '✅', '❎', '🏆', '🥇', '🥈',
  '🥉', '🧿', '🔮', '🧸', '🎵', '🎶', '🎺'
];

export const TransactionTableHeader: React.FC<TransactionTableHeaderProps> = ({
  category,
  totalAmount,
  hasCustomColor,
  hasCustomDarkColor,
  isDark,
  tableColors,
  sortOption,
  onSortChange,
  totalBudget,
  categoryData
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(category);
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [percentageDialogOpen, setPercentageDialogOpen] = useState(false);
  const [editedPercentage, setEditedPercentage] = useState(0);
  const [percentageError, setPercentageError] = useState<string | null>(null);
  const [categoryPercentages, setCategoryPercentages] = useState<Record<string, number>>({});
  const { updateCategory, getCategoryByName, categories, deleteCategory } = useCategories();
  
  // Find the category to get its icon and check if it's a default category
  const categoryInfo = categories.find(c => c.name === category);
  const [selectedIcon, setSelectedIcon] = useState(categoryInfo?.icon || '📊');
  const isDefaultCategory = categoryInfo?.isDefault || false;
  const percentage = categoryData?.percentage || categoryInfo?.percentage || 0;
  const isIncome = categoryData?.isIncome || categoryInfo?.isIncome || category === 'Income';

  // Update states when the percentage changes externally
  useEffect(() => {
    setEditedPercentage(percentage);
  }, [percentage]);

  // Get the current allocation percentage based on total amount and total budget
  const getCurrentAllocationPercentage = useCallback((amount: number) => {
    // Use the provided totalBudget if available, otherwise fall back to a fixed value
    const totalSpending = totalBudget || 10000; // Fallback value
    
    if (totalSpending <= 0) return 0;
    
    const allocationPercentage = Math.round((amount / totalSpending) * 100);
    return allocationPercentage;
  }, [totalBudget]);

  // Determine color based on how close current allocation is to target
  const getCurrentAllocationColor = useCallback((amount: number, targetPercentage: number) => {
    const currentPercentage = getCurrentAllocationPercentage(amount);
    
    // If target is 0, any spending is over budget
    if (targetPercentage === 0 && currentPercentage > 0) {
      return 'error.main';
    }
    
    // Calculate difference between current and target
    const difference = Math.abs(currentPercentage - targetPercentage);
    
    // Color based on difference
    if (difference <= 5) return 'success.main'; // Within 5% of target
    if (difference <= 15) return 'warning.main'; // Within 15% of target
    return 'error.main'; // More than 15% off target
  }, [getCurrentAllocationPercentage, editedPercentage]);

  // Initialize category percentages when dialog opens
  const handlePercentageDialogOpen = () => {
    // Reset current editing percentage
    setEditedPercentage(percentage);
    setPercentageError(null);
    
    // Initialize all category percentages
    const percentages: Record<string, number> = {};
    categories
      .filter(cat => !cat.isIncome)
      .forEach(cat => {
        percentages[cat.id] = cat.percentage || 0;
      });
    
    // Set the current category's percentage to the edited value
    if (categoryInfo) {
      percentages[categoryInfo.id] = percentage;
    }
    
    setCategoryPercentages(percentages);
    setPercentageDialogOpen(true);
  };

  const handlePercentageDialogClose = () => {
    setPercentageDialogOpen(false);
    setPercentageError(null);
  };

  // Update a specific category's percentage
  const handleCategoryPercentageChange = (categoryId: string, newValue: number) => {
    // Update the specific category
    setCategoryPercentages(prev => ({
      ...prev,
      [categoryId]: newValue
    }));
    
    // If this is the current category, also update editedPercentage
    if (categoryInfo && categoryId === categoryInfo.id) {
      setEditedPercentage(newValue);
    }
    
    // Check if total exceeds 100%
    const total = Object.values({
      ...categoryPercentages,
      [categoryId]: newValue
    }).reduce((sum, value) => sum + value, 0);
    
    if (total > 100) {
      setPercentageError(`Total allocation exceeds 100% by ${total - 100}%`);
    } else {
      setPercentageError(null);
    }
  };

  // Save all category percentages
  const handleSavePercentage = async () => {
    try {
      // Calculate total percentage
      const totalPercentage = Object.values(categoryPercentages).reduce((sum, val) => sum + val, 0);
      
      // Check if total exceeds 100%
      if (totalPercentage > 100) {
        setPercentageError(`Total allocation exceeds 100% by ${totalPercentage - 100}%`);
        return;
      }
      
      // Save all category percentages
      const savePromises = categories
        .filter(cat => !cat.isIncome && categoryPercentages[cat.id] !== undefined)
        .map(cat => {
          // Only update if the percentage has changed
          if (cat.percentage !== categoryPercentages[cat.id]) {
            return updateCategory(cat.id, {
              percentage: categoryPercentages[cat.id]
            });
          }
          return Promise.resolve();
        });
      
      await Promise.all(savePromises);
      
      // Force refresh of the current percentage value for this component
      // This will ensure the current allocation color updates immediately
      if (categoryInfo) {
        const updatedCategory = getCategoryByName(category);
        if (updatedCategory) {
          // Force a re-render by updating state to refresh current allocation color
          setEditedPercentage(categoryPercentages[categoryInfo.id] || 0);
        }
      }
      
      setPercentageDialogOpen(false);
      setPercentageError(null);
    } catch (error) {
      console.error('Error updating category percentages:', error);
    }
  };

  const handleEditClick = () => {
    setEditedName(category);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (editedName.trim() === '') {
      return; // Don't save empty names
    }

    const foundCategory = getCategoryByName(category);
    if (foundCategory) {
      try {
        // Only update name now, since icon updates are handled separately
        if (editedName !== category) {
          await updateCategory(foundCategory.id, {
            name: editedName.trim()
          });
        }
        
        setIsEditing(false);
      } catch (error) {
        console.error('Error updating category:', error);
      }
    } else {
      setIsEditing(false);
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
    
    // If we're not in edit mode, save the change immediately
    if (!isEditing) {
      handleDirectIconUpdate(emoji);
    }
    
    setEmojiPickerAnchor(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (categoryInfo && !categoryInfo.isDefault) {
      try {
        await deleteCategory(categoryInfo.id);
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

  // Add a new function to handle direct icon updates
  const handleDirectIconUpdate = async (newIcon?: string) => {
    if (!categoryInfo) return;
    
    try {
      // Use passed icon or the one from state
      const iconToUse = newIcon || selectedIcon;
      
      // Only update if the icon has changed
      if (iconToUse !== categoryInfo.icon) {
        await updateCategory(categoryInfo.id, {
          icon: iconToUse
        });
        console.log('Icon updated successfully to:', iconToUse);
      }
    } catch (error) {
      console.error('Error updating category icon:', error);
    }
  };

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
          <Box sx={{ fontSize: '1.3rem', mr: 1.5, display: 'flex', alignItems: 'center' }}>
            {categoryInfo?.icon || '📊'}
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
          <Box 
            sx={{ 
              fontSize: '1.3rem', 
              mr: 1.5, 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '50%',
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: hasCustomDarkColor ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.07)',
                transform: 'scale(1.05)'
              },
              '&:active': {
                transform: 'scale(0.97)'
              }
            }}
            onClick={(e) => {
              setSelectedIcon(categoryInfo?.icon || '📊');
              setEditedName(category);
              setEmojiPickerAnchor(e.currentTarget);
            }}
          >
            <Tooltip title="Click to change icon">
              <Box component="span">
                {categoryInfo?.icon || '📊'}
              </Box>
            </Tooltip>
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
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
              <Tooltip title="Edit category name and icon">
                <IconButton 
                  onClick={handleEditClick} 
                  size="small"
                  sx={{ 
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
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            backgroundColor: 'rgba(33, 33, 33, 0.9)',
            color: '#ffffff',
            p: 1.5,
            px: 2,
            borderRadius: 2,
            boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(4px)',
            flexGrow: {
              xs: 1,
              sm: 0
            }
          }}
        >
          {/* For non-Income categories, show allocation information */}
          {!isIncome ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, borderRight: '1px solid rgba(255,255,255,0.3)', pr: 2 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontWeight: 'medium',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Box component="span" sx={{ mr: 0.75 }}>Target Allocation:</Box>
                  <Tooltip title="Edit target allocation">
                    <Box 
                      component="span" 
                      onClick={handlePercentageDialogOpen}
                      sx={{ 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '4px',
                        px: 1,
                        py: 0.25,
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.25)',
                          color: '#ffffff',
                          transform: 'scale(1.03)',
                        },
                        '&:active': {
                          transform: 'scale(0.98)',
                        }
                      }}
                    >
                      {percentage}% <PercentIcon sx={{ ml: 0.5, fontSize: '1rem', opacity: 0.8 }} />
                    </Box>
                  </Tooltip>
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, borderRight: '1px solid rgba(255,255,255,0.3)', pr: 2 }}>
                <Tooltip title="Actual spending percentage based on current transactions">
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: 'medium',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Box component="span" sx={{ mr: 0.75 }}>Current Allocation:</Box>
                    <Box 
                      component="span" 
                      sx={{ 
                        fontWeight: 'bold',
                        // Keep the color system for allocations but make it more visible
                        color: getCurrentAllocationColor(Math.abs(totalAmount), percentage),
                        filter: 'brightness(1.2)'
                      }}
                    >
                      {getCurrentAllocationPercentage(Math.abs(totalAmount))}%
                    </Box>
                  </Typography>
                </Tooltip>
              </Box>
            </>
          ) : null}
          
          {/* For all categories, show the total */}
          <Typography 
            component="span" 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 600, 
              color: '#ffffff',
              fontSize: '0.95rem'
            }}
          >
            Total: ${Math.abs(totalAmount).toFixed(2)}
          </Typography>
        </Box>
        
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
        onClose={() => {
          setEmojiPickerAnchor(null);
          // We no longer need this since we handle updates in handleSelectEmoji
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ 
          p: 1.5, 
          pl: 2, 
          pr: 2, 
          width: 750, 
          maxHeight: 500, 
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Select an icon for {editedName || category}
          </Typography>
          
          {/* Finance and Money section */}
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, mb: 0.75, color: 'text.secondary', fontWeight: 'medium' }}>
            Finance & Money
          </Typography>
          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(28px, 28px))',
              gap: 0.5,
              mx: 'auto',
              maxWidth: '100%',
              justifyContent: 'start'
            }}
          >
            {emojiOptions.slice(0, 45).map((emoji) => (
              <Paper
                key={emoji}
                elevation={selectedIcon === emoji ? 3 : 1}
                sx={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 1,
                  fontSize: '0.95rem',
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
          
          {/* Shopping and Retail section */}
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, mb: 0.75, color: 'text.secondary', fontWeight: 'medium' }}>
            Shopping & Retail
          </Typography>
          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(28px, 28px))',
              gap: 0.5,
              mx: 'auto',
              maxWidth: '100%',
              justifyContent: 'start'
            }}
          >
            {emojiOptions.slice(45, 104).map((emoji) => (
              <Paper
                key={emoji}
                elevation={selectedIcon === emoji ? 3 : 1}
                sx={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 1,
                  fontSize: '0.95rem',
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
          
          {/* Food and Dining section */}
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, mb: 0.75, color: 'text.secondary', fontWeight: 'medium' }}>
            Food & Dining
          </Typography>
          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(28px, 28px))',
              gap: 0.5,
              mx: 'auto',
              maxWidth: '100%',
              justifyContent: 'start'
            }}
          >
            {emojiOptions.slice(104, 154).map((emoji) => (
              <Paper
                key={emoji}
                elevation={selectedIcon === emoji ? 3 : 1}
                sx={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 1,
                  fontSize: '0.95rem',
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
          
          {/* Home and Living section */}
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, mb: 0.75, color: 'text.secondary', fontWeight: 'medium' }}>
            Home & Living
          </Typography>
          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(28px, 28px))',
              gap: 0.5,
              mx: 'auto',
              maxWidth: '100%',
              justifyContent: 'start'
            }}
          >
            {emojiOptions.slice(154, 181).map((emoji) => (
              <Paper
                key={emoji}
                elevation={selectedIcon === emoji ? 3 : 1}
                sx={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 1,
                  fontSize: '0.95rem',
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
          
          {/* Transportation section */}
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, mb: 0.75, color: 'text.secondary', fontWeight: 'medium' }}>
            Transportation
          </Typography>
          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(28px, 28px))',
              gap: 0.5,
              mx: 'auto',
              maxWidth: '100%',
              justifyContent: 'start'
            }}
          >
            {emojiOptions.slice(181, 211).map((emoji) => (
              <Paper
                key={emoji}
                elevation={selectedIcon === emoji ? 3 : 1}
                sx={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 1,
                  fontSize: '0.95rem',
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
          
          {/* Entertainment section */}
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, mb: 0.75, color: 'text.secondary', fontWeight: 'medium' }}>
            Entertainment & Leisure
          </Typography>
          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(28px, 28px))',
              gap: 0.5,
              mx: 'auto',
              maxWidth: '100%',
              justifyContent: 'start'
            }}
          >
            {emojiOptions.slice(211, 261).map((emoji) => (
              <Paper
                key={emoji}
                elevation={selectedIcon === emoji ? 3 : 1}
                sx={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 1,
                  fontSize: '0.95rem',
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
          
          {/* Other sections - combined grid for remaining categories */}
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, mb: 0.75, color: 'text.secondary', fontWeight: 'medium' }}>
            Other Categories
          </Typography>
          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(28px, 28px))',
              gap: 0.5,
              mx: 'auto',
              maxWidth: '100%',
              justifyContent: 'start'
            }}
          >
            {emojiOptions.slice(261).map((emoji) => (
              <Paper
                key={emoji}
                elevation={selectedIcon === emoji ? 3 : 1}
                sx={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 1,
                  fontSize: '0.95rem',
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

      {/* Percentage Edit Dialog */}
      <Dialog open={percentageDialogOpen} onClose={handlePercentageDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>Edit Target Allocations</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Set budget allocation percentages for all categories. Current category: <strong>{category}</strong>
            </Typography>
            
            {percentageError && (
              <Typography color="error" variant="body2" sx={{ mt: 1, mb: 2 }}>
                {percentageError}
              </Typography>
            )}
            
            <Box sx={{ 
              mt: 3, 
              display: 'flex',
              flexDirection: 'column',
              gap: 3
            }}>
              {categories
                .filter(cat => !cat.isIncome)
                .map(cat => {
                  const value = categoryPercentages[cat.id] || 0;
                  const isCurrent = cat.name === category;
                  
                  return (
                    <Box 
                      key={cat.id}
                      sx={{ 
                        p: 2, 
                        borderRadius: 1,
                        bgcolor: isCurrent ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                        border: isCurrent ? '1px solid rgba(25, 118, 210, 0.2)' : 'none'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ 
                          width: 24, 
                          height: 24, 
                          borderRadius: '50%', 
                          bgcolor: cat.color,
                          mr: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {cat.icon}
                        </Box>
                        <Typography variant="subtitle1" fontWeight={isCurrent ? 'bold' : 'normal'}>
                          {cat.name} {isCurrent && '(current)'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Slider
                          value={value}
                          onChange={(_, newValue) => handleCategoryPercentageChange(cat.id, newValue as number)}
                          aria-labelledby={`percentage-slider-${cat.id}`}
                          valueLabelDisplay="auto"
                          step={1}
                          min={0}
                          max={100}
                          sx={{ flexGrow: 1 }}
                        />
                        <TextField
                          value={value}
                          onChange={(e) => {
                            const newValue = Number(e.target.value);
                            if (!isNaN(newValue) && newValue >= 0 && newValue <= 100) {
                              handleCategoryPercentageChange(cat.id, newValue);
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
                    </Box>
                  );
                })}
            </Box>
            
            <Box sx={{ mt: 4, p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Allocation Summary</strong>
              </Typography>
              {(() => {
                // Calculate and display current allocations
                const totalPercentage = Object.values(categoryPercentages).reduce((sum, val) => sum + val, 0);
                
                // Determine status color
                let statusColor = 'success.main';
                if (totalPercentage > 100) {
                  statusColor = 'error.main';
                } else if (totalPercentage < 100) {
                  statusColor = 'warning.main';
                }
                
                return (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, pt: 1 }}>
                      <Typography variant="body1" fontWeight="bold">
                        Total:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" color={statusColor}>
                        {totalPercentage}% {totalPercentage === 100 ? '✓' : ''}
                        {totalPercentage > 100 ? ' (Over budget)' : ''}
                        {totalPercentage < 100 ? ` (${100 - totalPercentage}% unallocated)` : ''}
                      </Typography>
                    </Box>
                  </>
                );
              })()}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePercentageDialogClose}>Cancel</Button>
          <Button 
            onClick={handleSavePercentage} 
            variant="contained"
            disabled={!!percentageError}
          >
            Save All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 