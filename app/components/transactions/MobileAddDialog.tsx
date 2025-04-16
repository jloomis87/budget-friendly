import React, { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, 
  Box, FormControl, InputLabel, InputAdornment, IconButton, Typography, Paper, Popover, Tooltip
} from '@mui/material';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import type { MobileAddDialogProps } from './types';

// A subset of commonly used emoji options for transactions - same as in MobileEditDialog
const emojiOptions = [
  // Finance and Money
  '💰', '💵', '💸', '💳', '🏦', '💹', '📈', '📉', '💎', '👛', '💼', '🧾', '💲',
  // Shopping and Retail
  '🛒', '🛍️', '👕', '👗', '👟', '👠', '👜', '🧥', '🕶️', '💄', '⌚', '💍', '🎒',
  // Food and Dining
  '🍕', '🍔', '🍟', '🌮', '🌯', '🥗', '🍣', '🍱', '🍜', '🍲', '🍝', '🥪', '☕', '🍷',
  // Home and Living
  '🏠', '🏡', '🪑', '🛋️', '🛏️', '🚪', '🪟', '🧹', '🧼', '🧺', '🛁', '🚿',
  // Transportation
  '🚗', '🚙', '🚕', '🛻', '🚓', '🚌', '🚎', '✈️', '🚂', '🚆', '🚇', '🚉', '🚲', '🛵',
  // Entertainment and Leisure
  '🎬', '🎮', '🎯', '🎨', '🎭', '🎫', '🎵', '🎸', '🎹', '🎺', '🎻', '🎧', '🎪',
  // Health and Medical
  '💊', '💉', '🩹', '🩺', '🔬', '🧪', '🦷', '🏥',
  // Education
  '📚', '📝', '✏️', '🖋️', '🖊️', '📏', '📐', '📓', '📔', '🎓', '📋', '📌',
  // Technology
  '💻', '⌨️', '🖥️', '🖱️', '💿', '📱', '📲', '📡',
  // Pets and Animals
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯',
];

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
  tableColor,
  isDark,
  icon,
  setIcon
}: MobileAddDialogProps) {
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmojis, setFilteredEmojis] = useState<string[]>([]);

  // Function to handle date change from the native date input
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setNewDate(e.target.value);
    }
  };

  // Function to get the current date string for the date input
  const getCurrentDate = () => {
    if (!newDate) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    return newDate;
  };

  // Open emoji picker
  const handleOpenEmojiPicker = (event: React.MouseEvent<HTMLElement>) => {
    setEmojiPickerAnchor(event.currentTarget);
  };

  // Close emoji picker
  const handleCloseEmojiPicker = () => {
    setEmojiPickerAnchor(null);
    setSearchQuery('');
    setFilteredEmojis([]);
  };

  // Select emoji
  const handleSelectEmoji = (emoji: string) => {
    if (setIcon) {
      setIcon(emoji);
    }
    handleCloseEmojiPicker();
  };

  // Remove icon
  const handleRemoveIcon = () => {
    if (setIcon) {
      setIcon('');
    }
  };

  // Filter emojis based on search query
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (!query) {
      setFilteredEmojis([]);
      return;
    }
    
    const results = emojiOptions.filter(emoji => {
      const keywords = getEmojiDescription(emoji).toLowerCase();
      return keywords.includes(query);
    });
    
    setFilteredEmojis(results);
  };

  // Get emoji description for tooltip
  const getEmojiDescription = (emoji: string): string => {
    const emojiDescriptions: Record<string, string> = {
      '💰': 'Money Bag', '💵': 'Dollar Bill', '💸': 'Money with Wings', '💳': 'Credit Card',
      '🏦': 'Bank', '💹': 'Chart Increasing', '📈': 'Chart Increasing', '📉': 'Chart Decreasing',
      '💎': 'Gem Stone', '👛': 'Purse', '💼': 'Briefcase', '🧾': 'Receipt', '💲': 'Dollar Sign',
      '🛒': 'Shopping Cart', '🛍️': 'Shopping Bags', '👕': 'T-Shirt', '👗': 'Dress',
      '👟': 'Running Shoe', '👠': 'High-Heeled Shoe', '👜': 'Handbag', '🧥': 'Coat',
      '🕶️': 'Sunglasses', '💄': 'Lipstick', '⌚': 'Watch', '💍': 'Ring', '🎒': 'Backpack',
      '🍕': 'Pizza', '🍔': 'Hamburger', '🍟': 'French Fries', '🌮': 'Taco',
      '🌯': 'Burrito', '🥗': 'Green Salad', '🍣': 'Sushi', '🍱': 'Bento Box',
      '🍜': 'Steaming Bowl', '🍲': 'Pot of Food', '🍝': 'Spaghetti', '🥪': 'Sandwich',
      '☕': 'Hot Beverage', '🍷': 'Wine Glass',
      '🏠': 'House', '🏡': 'House with Garden', '🪑': 'Chair', '🛋️': 'Couch and Lamp',
      '🛏️': 'Bed', '🚪': 'Door', '🪟': 'Window', '🧹': 'Broom',
      '🧼': 'Soap', '🧺': 'Basket', '🛁': 'Bathtub', '🚿': 'Shower',
      '🚗': 'Automobile', '🚙': 'SUV', '🚕': 'Taxi', '🛻': 'Pickup Truck',
      '🚓': 'Police Car', '🚌': 'Bus', '🚎': 'Trolleybus', '✈️': 'Airplane',
      '🚂': 'Locomotive', '🚆': 'Train', '🚇': 'Metro', '🚉': 'Station',
      '🚲': 'Bicycle', '🛵': 'Motor Scooter',
      '🎬': 'Clapper Board', '🎮': 'Video Game', '🎯': 'Direct Hit', '🎨': 'Artist Palette',
      '🎭': 'Performing Arts', '🎫': 'Ticket', '🎵': 'Musical Note', '🎸': 'Guitar',
      '🎹': 'Piano', '🎺': 'Trumpet', '🎻': 'Violin', '🎧': 'Headphones', '🎪': 'Circus Tent',
      '💊': 'Pill', '💉': 'Syringe', '🩹': 'Adhesive Bandage', '🩺': 'Stethoscope',
      '🔬': 'Microscope', '🧪': 'Test Tube', '🦷': 'Tooth', '🏥': 'Hospital',
      '📚': 'Books', '📝': 'Memo', '✏️': 'Pencil', '🖋️': 'Fountain Pen',
      '🖊️': 'Pen', '📏': 'Straight Ruler', '📐': 'Triangular Ruler', '📓': 'Notebook',
      '📔': 'Notebook with Decorative Cover', '🎓': 'Graduation Cap', '📋': 'Clipboard', '📌': 'Pushpin',
      '💻': 'Laptop', '⌨️': 'Keyboard', '🖥️': 'Desktop Computer', '🖱️': 'Computer Mouse',
      '💿': 'Optical Disc', '📱': 'Mobile Phone', '📲': 'Mobile Phone with Arrow', '📡': 'Satellite Antenna',
      '🐶': 'Dog Face', '🐱': 'Cat Face', '🐭': 'Mouse Face', '🐹': 'Hamster Face',
      '🐰': 'Rabbit Face', '🦊': 'Fox Face', '🐻': 'Bear Face', '🐼': 'Panda Face',
      '🐨': 'Koala', '🦁': 'Lion Face', '🐯': 'Tiger Face'
    };
    
    return emojiDescriptions[emoji] || emoji;
  };

  // Modified onAdd function to pass the selected icon to the parent
  const handleAddWithIcon = () => {
    // Pass the selected icon to the onAdd function
    onAdd();
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
        color: '#fff',
        pb: 3
      }}>
        New {category} Expense
      </DialogTitle>
      <DialogContent sx={{ 
        pt: 10, 
        mt: 2,
        '.MuiDialogTitle-root + &': {
          pt: '5px'
        }
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Icon Selection */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Button
              variant="outlined"
              onClick={handleOpenEmojiPicker}
              startIcon={icon ? (
                <Box component="span" sx={{ fontSize: '1.2rem' }}>{icon}</Box>
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
              {icon ? 'Change Icon' : 'Add Icon'}
            </Button>
            
            {icon && (
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
            label="Description"
            fullWidth
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            variant="outlined"
            placeholder="e.g., Groceries"
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
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : undefined,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
                }
              }
            }}
          />
          
          <TextField
            label="Amount"
            fullWidth
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            variant="outlined"
            placeholder="0.00"
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              sx: {
                color: isDark ? '#fff' : undefined,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : undefined,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : undefined,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
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
            fullWidth
            value={getCurrentDate()}
            onChange={handleDateChange}
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
                },
                '& input::-webkit-calendar-picker-indicator': {
                  filter: isDark ? 'invert(1) brightness(2) saturate(0)' : 'none',
                  opacity: isDark ? '0.8' : '1',
                  cursor: 'pointer'
                }
              }
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ 
        p: 3, 
        bgcolor: isDark ? 'rgba(20, 20, 20, 0.9)' : '#f5f5f5',
        borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
      }}>
        <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
          <Button 
            onClick={onClose} 
            sx={{ 
              color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : undefined,
              '&:hover': {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : undefined,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : undefined,
              }
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddWithIcon} 
            variant="contained" 
            sx={{ 
              px: 3,
              bgcolor: tableColor,
              '&:hover': {
                bgcolor: tableColor,
                filter: 'brightness(0.9)'
              }
            }}
            disabled={!newDescription.trim() || !newAmount.trim()}
          >
            Add
          </Button>
        </Box>
      </DialogActions>

      {/* Emoji Picker Popover */}
      <Popover
        open={Boolean(emojiPickerAnchor)}
        anchorEl={emojiPickerAnchor}
        onClose={handleCloseEmojiPicker}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
      >
        <Box sx={{ 
          p: 2, 
          width: 350, 
          maxHeight: 400, 
          overflow: 'auto',
          bgcolor: isDark ? 'rgba(25, 25, 25, 0.95)' : '#fff',
          color: isDark ? '#fff' : 'inherit'
        }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
            Select an icon
          </Typography>
          
          <TextField
            placeholder="Search icons..."
            value={searchQuery}
            onChange={handleSearchChange}
            variant="outlined"
            size="small"
            fullWidth
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              sx: {
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : undefined,
                color: isDark ? '#fff' : undefined,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : undefined,
                },
              }
            }}
          />
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(8, 1fr)', 
            gap: 0.5 
          }}>
            {(searchQuery ? filteredEmojis : emojiOptions).map((emoji) => (
              <Tooltip key={emoji} title={getEmojiDescription(emoji)} arrow>
                <Paper
                  elevation={1}
                  sx={{
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.3rem',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f5f5f5',
                    color: isDark ? '#fff' : 'inherit',
                    '&:hover': {
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#e0e0e0',
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.2s'
                  }}
                  onClick={() => handleSelectEmoji(emoji)}
                >
                  {emoji}
                </Paper>
              </Tooltip>
            ))}
          </Box>
          
          {searchQuery && filteredEmojis.length === 0 && (
            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
              No icons found matching "{searchQuery}"
            </Typography>
          )}
        </Box>
      </Popover>
    </Dialog>
  );
} 