import React, { useState } from 'react';
import { IconButton, Popover, Box, Typography, Button } from '@mui/material';
import { HexColorPicker } from 'react-colorful';
import { PaletteIcon } from '../utils/materialIcons';
import { useTableColors } from '../hooks/useTableColors';
import { isColorDark } from '../utils/colorUtils';

interface CategoryColorPickerProps {
  category: string;
}

export function CategoryColorPicker({ category }: CategoryColorPickerProps) {
  const [colorPickerAnchor, setColorPickerAnchor] = useState<null | HTMLElement>(null);
  const [tableColors, setTableColors] = useTableColors();

  // Handle opening the color picker
  const handleOpenColorPicker = (event: React.MouseEvent<HTMLElement>) => {
    setColorPickerAnchor(event.currentTarget);
  };
  
  // Handle closing the color picker
  const handleCloseColorPicker = () => {
    setColorPickerAnchor(null);
  };
  
  // Handle color selection
  const handleColorSelect = (color: string) => {
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
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {tableColors[category]}
            </Typography>
            <Button size="small" variant="outlined" onClick={handleCloseColorPicker}>
              Done
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
} 