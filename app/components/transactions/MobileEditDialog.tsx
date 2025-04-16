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
import SearchIcon from '@mui/icons-material/Search';
import { DeleteIcon } from '../../utils/materialIcons';
import type { EditingRow } from './types';
import { isColorDark } from '../../utils/colorUtils';

// A subset of commonly used emoji options for transactions
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmojis, setFilteredEmojis] = useState<string[]>([]);

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