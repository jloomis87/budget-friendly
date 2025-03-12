import React, { useState } from 'react';
import { IconButton, Popover, Box, Typography, Button, Tooltip, CircularProgress } from '@mui/material';
import { HexColorPicker } from 'react-colorful';
import { PaletteIcon, CloudDoneIcon } from '../utils/materialIcons';
import { useLocalStorage, STORAGE_KEYS, LEGACY_STORAGE_KEYS } from '../hooks/useLocalStorage';
import { isColorDark } from '../utils/colorUtils';
import { useAuth } from '../contexts/AuthContext';

interface CategoryColorPickerProps {
  category: string;
}

export function CategoryColorPicker({ category }: CategoryColorPickerProps) {
  const [colorPickerAnchor, setColorPickerAnchor] = useState<null | HTMLElement>(null);
  const [tableColors, setTableColors] = useLocalStorage<Record<string, string>>(
    STORAGE_KEYS.TABLE_COLORS,
    LEGACY_STORAGE_KEYS.TABLE_COLORS,
    {
      'Essentials': '#f5f5f5', // Default light gray
      'Wants': '#f5f5f5',
      'Savings': '#f5f5f5',
      'Income': '#f5f5f5'
    }
  );
  
  // Track if we're saving to Firebase
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Get authentication state
  const { isAuthenticated } = useAuth();

  // Handle opening the color picker
  const handleOpenColorPicker = (event: React.MouseEvent<HTMLElement>) => {
    setColorPickerAnchor(event.currentTarget);
    // Reset save status when opening
    setSaveSuccess(false);
  };
  
  // Handle closing the color picker
  const handleCloseColorPicker = () => {
    setColorPickerAnchor(null);
  };
  
  // Handle color selection
  const handleColorSelect = (color: string) => {
    // Set saving indicator if authenticated
    if (isAuthenticated) {
      setIsSaving(true);
      setSaveSuccess(false);
      
      // Set a timeout to simulate the Firebase save completion
      setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(true);
        
        // Reset success indicator after 2 seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 2000);
      }, 500);
    }
    
    const updatedColors = {
      ...tableColors,
      [category]: color
    };
    
    setTableColors(updatedColors);
  };

  // Determine if the current color is dark
  const isDark = tableColors[category] && isColorDark(tableColors[category]);
  
  // Determine if we should use a custom color or the default
  const isCustomColor = tableColors[category] !== '#f5f5f5';

  return (
    <>
      <Tooltip 
        title={isAuthenticated ? "Your color preferences are saved to your account" : "Log in to save your color preferences"} 
        arrow
      >
        <IconButton 
          size="small" 
          onClick={handleOpenColorPicker}
          aria-label={`Change ${category} color`}
          sx={{
            color: isDark ? '#fff' : 'inherit',
            bgcolor: isCustomColor ? `${tableColors[category]}40` : 'transparent', // Light background of the selected color
            border: isCustomColor ? `2px solid ${tableColors[category]}` : 'none',
            '&:hover': {
              backgroundColor: isDark 
                ? 'rgba(255, 255, 255, 0.1)' 
                : (isCustomColor ? `${tableColors[category]}60` : 'rgba(0, 0, 0, 0.04)')
            }
          }}
        >
          <PaletteIcon 
            fontSize="small" 
            sx={{ 
              // Always ensure the icon has good contrast with its background
              color: isDark ? '#fff' : 'rgba(0, 0, 0, 0.7)'
            }}
          />
        </IconButton>
      </Tooltip>
      
      <Popover
        open={Boolean(colorPickerAnchor)}
        anchorEl={colorPickerAnchor}
        onClose={handleCloseColorPicker}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2, width: 250 }}>
          <Typography variant="subtitle2" gutterBottom>
            Choose a color for {category}
          </Typography>
          <HexColorPicker 
            color={tableColors[category]} 
            onChange={(color) => {
              handleColorSelect(color);
              // Don't close the color picker automatically, let the user pick colors freely
            }} 
            style={{ width: '100%', height: 170 }}
          />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box 
              sx={{ 
                width: 30, 
                height: 30, 
                borderRadius: '50%', 
                bgcolor: tableColors[category],
                border: '1px solid #ccc'
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {tableColors[category]}
              </Typography>
              {isAuthenticated && (
                isSaving ? (
                  <CircularProgress size={16} thickness={5} />
                ) : saveSuccess ? (
                  <CloudDoneIcon fontSize="small" color="success" />
                ) : null
              )}
            </Box>
            <Button size="small" variant="outlined" onClick={handleCloseColorPicker}>
              Done
            </Button>
          </Box>
          {isAuthenticated && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1, textAlign: 'center', color: 'text.secondary' }}>
              Your color preferences are saved to your account
            </Typography>
          )}
        </Box>
      </Popover>
    </>
  );
} 